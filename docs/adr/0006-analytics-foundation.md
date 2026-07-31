# ADR 0006 — Analytics Foundation

- **Estado**: Aprobada, con cuatro ajustes obligatorios del usuario ya incorporados (ver "Ajustes de aprobación") — gate completo verificado (53 comprobaciones heredadas de ADR-0004/0005 re-ejecutadas sin regresiones + 34 comprobaciones nuevas de ANALYTICS), en local (Postgres de desarrollo) con tres instancias del backend en puertos separados, igual que replica CI.
- **Fecha**: 2026-07-31
- **Fase de aplicación**: Fase 0 — Foundation, Paso 6
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — transversal, difícil de revertir (activa el patrón Outbox para todo el sistema).

## Contexto

La Implementation Matrix v1.1 incluye "Analytics Foundation (eventos, telemetría básica, dashboard inicial)" en Fase 0. El Bloque 19 del Data Model describe el aparato completo del dominio ANALYTICS (`analytics_event_definition`, `analytics_event_schema`, `analytics_actor` con rotación, cohortes, embudos, experimentos) — pero, como ya quedó resuelto en la revisión del Data Model (memoria de proyecto, 2026-07-29), ese bloque describe la estructura lógica completa del producto, no lo que corresponde construir en Fase 0. Este ADR cierra el gap con el mismo criterio de alcance mínimo que ADR-0003/0004/0005: construir solo sobre hechos que **ya existen** hoy (AUTH, PRIVACY), dejando el resto para cuando existan los dominios que realmente los necesiten (Progress, Recommendation, Gamification, Estudio — Fase 1+).

## Decisión

### Principio rector: ANALYTICS consume, nunca produce

Ajuste de aprobación del usuario, reforzado explícitamente en este ADR: **ANALYTICS no produce eventos de dominio — los consume**, ya publicados por otros dominios. El Outbox (`outbox_event`) es infraestructura de **plataforma compartida**, no propiedad de ANALYTICS: vive en `platform/outbox/`, no en `analytics/`. Cualquier dominio puede publicar (hoy AUTH y PRIVACY); el diseño admite explícitamente consumidores futuros además de ANALYTICS —Gamification, Progress, Recommendation, Notification— cada uno leyendo la misma tabla con su propio cursor/criterio, sin que esto implique ningún cambio de esquema. Esta separación es también la razón por la que `AuthService`/`PrivacyService` dependen de `OutboxService` (plataforma) y no de nada dentro de `analytics/` — Master Context 6.21 prohíbe que AUTH dependa de Analytics, y esta arquitectura lo respeta por construcción, no por disciplina.

`InternalOpsGuard` se movió de `privacy/` a `platform/internal-ops/` en este paso, por el mismo motivo: ya no es exclusivo de un dominio, ambos (`PrivacyController`, `AnalyticsController`) lo reutilizan sin duplicar la clase. Sin cambio de comportamiento respecto a ADR-0005.

### Patrón Outbox, activado por primera vez (Decision Gate de stack, 2026-07-29)

- `OutboxService.publish(eventKey, schemaVersion, sourceDomain, aggregateId, payload)` — infraestructura compartida en `platform/outbox/`.
- `AnalyticsRelayWorker` (cron cada 1 minuto, `@nestjs/schedule` — mismo mecanismo que `PrivacyScheduler`) lee filas `PENDING` de `outbox_event`, valida el payload, inserta `analytics_event`, marca `PROCESSED`. También invocable manualmente vía `POST /analytics/_internal/relay` (mismo criterio que `POST /privacy/_internal/sweep`: no depender solo del reloj, útil para operar y para CI).
- Un fallo en una fila del lote **nunca detiene el resto**: cada `OutboxEvent` se procesa de forma independiente dentro del `for` del relay; una excepción se captura, la fila se marca `FAILED` con `attempts++` y `lastError`, y el lote continúa (verificado con prueba dedicada, ver gate punto 3).

### Publicación best-effort — decisión explícita, con su límite documentado (ajuste de aprobación 1)

`AuthService`/`PrivacyService` llaman a `OutboxService.publish(...)` **después** de que su operación principal ya confirmó (fuera de su transacción), envuelto en try/catch dentro del propio `OutboxService` — un fallo al publicar nunca se propaga al llamador. Esto es deliberado, no un descuido: implementar outbox transaccional estricto (mismo commit que el cambio de estado) habría requerido refactorizar las transacciones ya aprobadas de AUTH/PRIVACY (ADR-0004/0005).

**Se acepta la pérdida ocasional de un evento puntual únicamente porque ANALYTICS no es, ni debe llegar a ser, un sistema de verdad operacional.** Master Context 6.16 lo dice explícitamente: *"Si Analytics falla, el flujo principal continuará y el evento podrá reintentarse."* La operación de negocio (registrar cuenta, solicitar eliminación, etc.) **nunca puede fallar por un problema de telemetría** — esa garantía está en el código (`OutboxService.publish` atrapa y loggea, nunca relanza) y se declara aquí como principio, no solo como efecto colateral de la implementación. Hueco conocido: una caída del proceso exactamente entre el commit principal y el insert del outbox pierde ese evento puntual, sin reintento posible. Se revisita solo si algún dominio productor futuro necesitara entrega garantizada — ese día, ese dominio (no ANALYTICS) tendría que mover la publicación dentro de su propia transacción.

### Pseudonimización mínima: `analyticsActorRef`, no `analytics_actor` completo

`analyticsActorRef = HMAC-SHA256(accountId, ANALYTICS_ACTOR_SECRET)` — determinístico (mismo `accountId` → mismo ref, permite contar cuentas únicas sin guardar el id crudo), unidireccional (no reversible sin el secreto), sin tabla ni ciclo de vida propio. Satisface la política de retención ya aprobada ("Datos analíticos: no vincular permanentemente al usuario") sin construir el `analytics_actor` completo del Data Model (rotación, `linkage_status`) antes de que exista una necesidad real de cohortes/experimentos (Fase 3+). Si `ANALYTICS_ACTOR_SECRET` no está configurada, el evento se ingiere igual pero sin actor pseudónimo — nunca con el `accountId` crudo como *fallback*.

### Catálogo de eventos Fase 0: solo los 5 hechos reales que el código ya produce

`account_registered`, `account_verified`, `account_deletion_requested`, `account_deletion_completed`, `account_recovered` — todos con `schemaVersion = "v1"`. Fuera: `session_started/ended`, `resource_opened`, `assessment_*`, uso de recomendación/IA (3.6.13) — presuponen Estudio/Progress/AI, que no existen todavía.

### Payload mínimo: principio explícito, no solo práctica de este paso (ajuste de aprobación 3)

**Los payloads de eventos analíticos contienen únicamente la información estrictamente necesaria para el análisis declarado — nunca un DTO completo, nunca PII.** Se establece aquí como principio de diseño para todo evento futuro que cualquier dominio publique al Outbox, no solo para los 5 de este paso. La aplicación concreta hoy: cada payload es `{ accountId }` (`z.object({ accountId: entityId }).strict()` en `packages/contracts/src/analytics.ts`) — `.strict()` hace que cualquier propiedad no declarada (email, nombre, lo que sea) falle la validación del relay en vez de colarse silenciosamente. Verificado con prueba dedicada (gate punto 4): un payload con `email` queda `FAILED`, nunca llega a `analytics_event`.

### `producerVersion`: trazabilidad entre versiones (ajuste de aprobación 2)

Se agregó `producerVersion` (columna en `OutboxEvent` y en `AnalyticsEvent`) — el valor de la variable de entorno `PRODUCER_VERSION`, propagado automáticamente por `OutboxService.publish`. Costo mínimo (una columna nullable, una lectura de `ConfigService`) por trazabilidad real entre despliegues: en CI/producción se fija al SHA corto del commit o al semver del release; en desarrollo local, `PRODUCER_VERSION=dev`. No se implementó un mecanismo de build-info más elaborado (inyección en build time, etc.) — sería especular sobre necesidades que hoy no existen.

### "Dashboard inicial" = endpoint JSON interno, no UI

`GET /analytics/_internal/summary` (protegido por `InternalOpsGuard`, igual que el relay) devuelve conteos por `eventKey` sobre una ventana configurable (`?sinceHours=`, default 7 días). El dominio Administration (dueño natural de una UI de panel) no existe todavía — una UI visual real queda fuera de alcance de este paso.

## Alternativas descartadas

- **Outbox transaccional estricto (mismo commit que el cambio de estado)** — descartado para este paso: exigiría refactorizar las transacciones ya aprobadas de AUTH/PRIVACY; el propio Master Context autoriza tolerar la pérdida ocasional en ANALYTICS.
- **`analytics_actor` completo (rotación, `linkage_status`, tabla propia)** — descartado: especularía sobre necesidades de cohortes/experimentos que no existen antes de Fase 3.
- **Tablas `analytics_event_definition`/`analytics_event_schema` en BD** — descartadas: con 5 eventos conocidos, un registro en código (Zod, `packages/contracts`) cubre la misma necesidad sin la complejidad de un registro versionado en base de datos.
- **UI visual de dashboard** — descartada: pertenece al dominio Administration, que no existe todavía.
- **`InternalOpsGuard` duplicado en `analytics/`** — descartado a favor de moverlo a `platform/internal-ops/`, ya que dos dominios lo necesitan hoy.
- **Endpoint de ingesta HTTP desde el cliente móvil** — descartado: no hay pantallas/flujos reales todavía (Fase 1); solo hay eventos de servidor (AUTH/PRIVACY) hoy.

## Consecuencias

- Cualquier dominio nuevo que publique eventos analíticos en el futuro debe seguir el mismo principio de payload mínimo (`.strict()`, sin PII) y el mismo patrón best-effort (publicar después de confirmar, nunca dentro de una transacción que ANALYTICS pueda romper).
- `AuthService` y `PrivacyService` ahora dependen de `OutboxService` (plataforma) — no de ANALYTICS — para publicar hechos. Un dominio futuro que SÍ necesite entrega garantizada de sus eventos (no solo ANALYTICS como consumidor) tendría que mover la publicación dentro de su propia transacción; eso es una decisión de ESE dominio, no un cambio a este ADR.
- `ANALYTICS_ACTOR_SECRET` y `PRODUCER_VERSION` se suman a las variables de entorno por ambiente (ver `.env.example`) — igual que `INTERNAL_OPS_KEY`, generar valores propios por ambiente, nunca reutilizar entre dev/staging/prod.
- El endpoint `GET /analytics/_internal/summary` y `POST /analytics/_internal/relay` comparten la misma limitación ya documentada en ADR-0005 sobre `InternalOpsGuard`: clave estática compartida, infraestructura temporal de Fase 0, reemplazar antes de cualquier despliegue con tráfico real.

## Validación (53 heredadas sin regresiones + 34 nuevas de ANALYTICS)

Ejecutado con tres instancias del backend en puertos separados (mismo motivo que ADR-0005: el rate limiting de `/auth/session` es por proceso), contra Postgres de desarrollo.

- Gate de AUTH (19 comprobaciones, ADR-0004) re-ejecutado: sin regresiones.
- Gate de PRIVACY (34 comprobaciones, ADR-0005) re-ejecutado: sin regresiones.
- Gate de ANALYTICS (34 comprobaciones nuevas), incluyendo:
  - Los 5 eventos reales (registro, verificación, solicitud/recuperación/cierre de eliminación) dejan exactamente una fila `PENDING` en `outbox_event` con el `eventKey` correcto.
  - El relay ingiere `PENDING` → `analytics_event`, marca `PROCESSED`; correrlo dos veces no duplica filas.
  - Una fila con `eventKey` desconocido queda `FAILED` (con `attempts`/`lastError`) sin impedir que otra fila válida del mismo lote se procese.
  - Un payload con una propiedad no declarada (`email`) es rechazado por el esquema Zod antes de llegar a `analytics_event`.
  - `analyticsActorRef` es determinístico, coincide con `HMAC-SHA256(accountId, secreto)`, y nunca es el `accountId` crudo.
  - Un "crash" simulado (registro en `analytics_event` ya existente antes de marcar el outbox `PROCESSED`) no duplica el evento ni bloquea el relay.
  - `GET /analytics/_internal/summary` exige `X-Internal-Ops-Key` (401 sin ella); con ella, conteos correctos por `eventKey`.
- `pnpm -r run typecheck/lint`, build de los 3 paquetes, en verde.

**Pendiente no bloqueante**: como en ADR-0004/0005, validación end-to-end con proyecto Firebase real queda fuera de este paso (cambio de configuración, no de arquitectura).
