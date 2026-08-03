# ADR 0017 — Entrega multi-consumidor del Outbox de plataforma

- **Estado**: Aprobada como decisión de arquitectura — pendiente de implementación y de gate de validación (ver "Validación"). No incluye código todavía. Bloquea la reanudación del Bloque I hasta completar su propia migración y gate.
- **Fecha**: 2026-08-03
- **Fase de aplicación**: Fase 2 — Learning Experience Foundation, previo a la reanudación del Bloque I. Enmienda parcial de infraestructura de plataforma introducida en Fase 0 (ADR-0006).
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — modifica infraestructura de plataforma ya validada y en uso por un dominio de M1 (ANALYTICS), con re-ejecución obligatoria de su gate.

## Contexto

Durante el reconocimiento previo al primer incremento del Bloque I (`docs/adr/0016-gamificacion-fundacion.md`) se comprobó, contra el código real (`prisma/schema.prisma`, `OutboxEventRepository`, `AnalyticsService`, `AnalyticsScheduler`), que el mecanismo de entrega del Outbox de plataforma **no admite múltiples consumidores** tal como ADR-0006 afirma en su prosa.

`OutboxEvent` (Prisma, línea 379) tiene un único campo `status` (`PENDING | PROCESSED | FAILED`), mutado globalmente:

- `OutboxEventRepository.findPending()` → `WHERE status = 'PENDING'`, sin distinción de consumidor.
- `OutboxEventRepository.markProcessed(id)` → `status = 'PROCESSED'`, global.
- `AnalyticsService.ingestPending()` es hoy el único llamador de ambos métodos.

ADR-0006 (línea 17) declara: *"cada uno leyendo la misma tabla con su propio cursor/criterio, sin que esto implique ningún cambio de esquema"*. Esa afirmación es incorrecta contra el esquema real — no existió una necesidad de corregirla hasta ahora porque ANALYTICS fue, hasta este bloque, el único consumidor real. ADR-0016 heredó esa misma afirmación al asumir que GAMIFICATION podía incorporarse como consumidor "sin infraestructura nueva". Este ADR corrige esa premisa antes de que el Bloque I continúe.

## Decisión

### Alternativas evaluadas

**1. Tabla de entrega por consumidor (`outbox_event_delivery`) — adoptada.**
Una fila por combinación evento×consumidor, con estado, intentos y error propios. Ver diseño completo abajo.

**2. Cursor por consumidor.**
Cada consumidor guarda solo la última posición procesada (`outbox_consumer_cursor`: `consumerName`, `lastProcessedId`) y consulta `WHERE id > cursor`. Más simple en esquema (una fila por consumidor, no por evento×consumidor), pero con tres riesgos reales para Axioma, tal como anticipó el Product Owner:
- **Bloqueo por evento fallido**: si el evento en la posición del cursor falla de forma persistente, el cursor no puede avanzar sin decidir explícitamente "saltarlo" — no hay un lugar natural para registrar ese evento individual como fallido sin, de nuevo, necesitar una tabla por evento.
- **Pérdida al avanzar el cursor**: cualquier implementación que avance el cursor de forma optimista (para no bloquear el resto del lote) pierde la trazabilidad de qué evento específico falló, salvo que se registre aparte — reintroduciendo, en la práctica, la necesidad de una tabla de entrega de todos modos.
- **Menor trazabilidad/auditabilidad**: no hay registro de `attempts`/`lastError` por evento, solo un puntero — insuficiente para el estándar de auditabilidad que M1 ya sostiene en ANALYTICS (`attempts`, `lastError` por fila).
Se descarta como alternativa principal por estas tres razones, no por ser inválida en abstracto — es un patrón razonable en otros contextos, pero peor ajustado a los principios de auditabilidad ya vigentes en este proyecto.

**3. Consumidor único intermediario — descartada por acoplamiento.**
Un solo `OutboxRelay` de plataforma que lee `outbox_event` una vez y distribuye en proceso a manejadores registrados de cada dominio (ANALYTICS, GAMIFICATION, ...). Descartada: obliga a que un componente de `platform/` conozca la lista completa de dominios consumidores y su lógica de despacho, exactamente el tipo de acoplamiento transversal que Master Context §4.20-4.21 prohíbe en espíritu (ningún dominio operacional debe depender de la orquestación de otro para funcionar). Además, degrada la garantía pedida de "fallo de un consumidor sin afectar al otro": aunque se aislaran los manejadores con try/catch, seguiría existiendo un único proceso/cron coordinador cuya caída detiene la entrega a *todos* los consumidores a la vez, en vez de que cada uno tenga su propio ciclo de vida independiente (como ya ocurre hoy entre `AnalyticsScheduler` y el futuro `GamificationScheduler`).

**4. Mantener el esquema actual — alternativa nula, se demuestra que falla.**
Escenario de prueba: `AnalyticsScheduler` y un futuro `GamificationScheduler` corren ambos cada minuto (`@Cron(CronExpression.EVERY_MINUTE)`). Se publica un evento `student_response_recorded.v1`. Cualquiera de los dos crons que dispare primero ejecuta `findPending()` (ve la fila `PENDING`), la procesa, y llama `markProcessed(id)` (`status = 'PROCESSED'`). El otro cron, al dispararse (mismo minuto o el siguiente), ejecuta el mismo `findPending()` — la fila ya no aparece, porque el filtro es `status = 'PENDING'` sin distinción de quién la marcó. **El segundo consumidor no pierde el evento de forma ocasional: lo pierde siempre, de forma estructural**, salvo que gane la carrera. Con dos consumidores activos y ambos con cron de igual frecuencia, el resultado esperado es que uno de los dos deje de recibir prácticamamente todos los eventos. Queda demostrado que la alternativa nula no es viable — no es una cuestión de probabilidad baja, es un defecto determinístico de diseño.

### Diseño adoptado: `outbox_event_delivery`

```
outbox_event_delivery
  id               UUID
  outbox_event_id  UUID  -- FK a outbox_event.id
  consumer_name    TEXT  -- 'ANALYTICS' | 'GAMIFICATION' | futuros
  status           ENUM  -- PROCESSED | FAILED  (sin valor PENDING persistido)
  attempts         INT   DEFAULT 0
  last_error       TEXT?
  processed_at     TIMESTAMP?
  created_at       TIMESTAMP DEFAULT now()

  @@unique(outbox_event_id, consumer_name)
```

**"Pendiente" es la ausencia de fila**, no un estado persistido — mismo criterio conceptual que `CurriculumTopicProgress` ya usa en ADR-0014 (*"NOT_STARTED = ausencia de fila"*), reutilizado aquí en vez de inventar una convención nueva. Cada relay consulta:

> eventos de `outbox_event` para los que **no existe** fila en `outbox_event_delivery` con su `consumerName`, **o** existe con `status = FAILED` y `attempts < maxAttempts`.

**Productor desacoplado de consumidores**: `OutboxService.publish()` no cambia — sigue sin conocer qué dominios consumirán el evento. Cada relay crea su propia fila de entrega al concluir su intento (éxito → `PROCESSED`; fallo → `FAILED`, `attempts++`, `lastError`) — nunca al empezar. Esto preserva el principio ya vigente (*"ANALYTICS no produce eventos, los consume"*) y lo extiende sin acoplar el lado de publicación a un registro de consumidores.

**Deduplicación**: el `@@unique(outbox_event_id, consumer_name)` es la garantía real, a nivel de base de datos — no una convención de aplicación. Un intento concurrente de crear una segunda fila para el mismo par falla con `P2002`, capturado explícitamente y tratado como éxito idempotente (mismo patrón ya establecido en `UserService.initializeProfile`, ADR-0008, y en `ProgressService`, ADR-0014 — se reutiliza, no se inventa uno nuevo).

**Límite de reintentos**: `maxAttempts` configurable (`ConfigService`, valor por defecto razonable, p. ej. 10) — superado el límite, el evento deja de reintentarse automáticamente para ese consumidor y queda visible como `FAILED` para intervención manual vía el mismo patrón de endpoint interno ya existente (`POST /_internal/relay`).

### `OutboxEvent.status` — decisión formal: se deprecia, no se elimina en este ADR

Los campos `status`, `attempts`, `lastError`, `processedAt` de `OutboxEvent` **permanecen en el esquema sin cambios estructurales** durante y después de esta migración. Dejan de ser escritos por cualquier consumidor (ANALYTICS los deja de mutar como parte de este mismo ADR) y se marcan `@deprecated` en el schema de Prisma con nota explícita apuntando a `outbox_event_delivery` como reemplazo. No se eliminan ahora porque:
- Eliminarlos en la misma migración que introduce el nuevo mecanismo mezclaría dos cambios de riesgo distinto (aditivo vs. destructivo) en un solo paso, contra el principio de cambios mínimos y verificables ya aplicado en toda la serie de ADR.
- Conservan valor forense mientras dura la transición (permiten comparar el comportamiento antiguo y nuevo si algo falla durante el gate de migración).

Su eliminación queda registrada como **deuda técnica diferida** (Kickoff §4.6), con propietario (el propio dominio de plataforma, `platform/outbox/`) y condición de resolución: una vez que `outbox_event_delivery` lleve al menos un ciclo completo de bloque (Bloque I cerrado y validado) sin incidencias, se abrirá una migración de limpieza dedicada — no antes, y no como parte de este ADR.

### Migración compatible: ANALYTICS primero, GAMIFICATION después

**Paso 1 — Adaptar ANALYTICS (bloqueante, antes de reanudar el Bloque I)**:
1. Migración Prisma: crear `outbox_event_delivery` (aditiva, no toca `outbox_event`).
2. Refactor de `AnalyticsService`/`AnalyticsScheduler`: `findPending()`/`markProcessed()`/`markFailed()` de `OutboxEventRepository` dejan de usarse desde ANALYTICS; se reemplazan por el nuevo patrón de consulta contra `outbox_event_delivery` con `consumerName = 'ANALYTICS'`.
3. Re-ejecución completa del gate de ANALYTICS (38 comprobaciones, ADR-0006) — **sin regresiones** es condición de avance, no una validación opcional.
4. Re-ejecución del gate consolidado (219 comprobaciones, Architecture Review 1.0) para confirmar que ningún otro dominio de M1 se vio afectado.

**Paso 2 — Incorporar GAMIFICATION (retoma el Bloque I)**:
5. `GamificationRelayWorker` implementado desde el inicio contra `outbox_event_delivery` con `consumerName = 'GAMIFICATION'` — nunca llega a conocer el mecanismo antiguo.
6. Gate `GAMIFICATION-CORE` (Bloque I) incluye desde su primera versión los ocho Decision Gates de este ADR (ver abajo) como parte de su propia validación, no como algo aparte.

No se toca el código de PROGRESS en ningún paso de esta migración — `ProgressService` sigue llamando a `OutboxService.publish()` exactamente como quedó fijado en ADR-0016, ajeno por completo a cómo se entregan los eventos después.

## Decision Gates de este ADR

| Gate | Qué valida |
|---|---|
| **Entrega independiente** | Un evento procesado por ANALYTICS permanece elegible ("sin fila de entrega") para GAMIFICATION y viceversa — verificado publicando un evento, corriendo solo un relay, y confirmando que el otro consumidor sigue viéndolo pendiente |
| **Fallo aislado por consumidor** | Un fallo forzado en el procesamiento de GAMIFICATION para un evento (p. ej., payload inválido) deja su fila en `FAILED` sin impedir que ANALYTICS procese el mismo evento con éxito |
| **Reintentos independientes** | El contador `attempts` y `lastError` de una fila `(evento, ANALYTICS)` evoluciona sin afectar la fila `(evento, GAMIFICATION)` del mismo evento |
| **Deduplicación `(outboxEventId, consumerName)`** | Dos intentos concurrentes de crear la fila de entrega para el mismo par fallan por restricción única a nivel de base de datos; el perdedor de la carrera trata el `P2002` como éxito idempotente, sin duplicar procesamiento |
| **Concurrencia** | Dos invocaciones simultáneas del mismo relay (cron + disparo manual `POST /_internal/relay` al mismo tiempo) no procesan dos veces el mismo evento para el mismo consumidor |
| **Migración sin regresiones sobre ANALYTICS** | Gate de ANALYTICS (38 comprobaciones) y gate consolidado (219 comprobaciones) en verde tras el Paso 1, antes de tocar código de GAMIFICATION |
| **Retención segura** | Ningún código introducido en este ADR borra filas de `outbox_event` ni de `outbox_event_delivery`; la política de retención/limpieza queda explícitamente diferida y documentada, no implementada por omisión |
| **Aislamiento de PROGRESS** | Con ambos relays (ANALYTICS y GAMIFICATION) deliberadamente detenidos o fallando, el envío de respuestas de PROGRESS (`POST /progress/responses`) sigue completándose con éxito — repite la prueba que ya cubría ADR-0006 para un solo consumidor, ahora con dos presentes |

## Consecuencias

- Cualquier dominio consumidor futuro del Outbox (Recommendation, Notification, AI) sigue el mismo patrón: su propio `consumerName`, sin tocar `OutboxService` ni el esquema de `outbox_event`.
- `AnalyticsService` cambia de implementación pero no de contrato observable — su gate propio es la prueba de que su comportamiento externo no varía.
- Queda abierta, como deuda diferida y no bloqueante, la eliminación futura de los campos deprecados de `OutboxEvent` y el diseño de una política de retención/archivado una vez exista un registro formal de consumidores conocidos.
- El Bloque I no puede declarar su gate `GAMIFICATION-CORE` en PASS sin que, antes, el Paso 1 de este ADR (adaptación de ANALYTICS) esté cerrado con su propio gate en verde.

## Enmiendas registradas en otros documentos

- **ADR-0006**: nota de enmienda añadida (ver el propio documento) — la afirmación *"sin que esto implique ningún cambio de esquema"* queda corregida por este ADR; el resto de ADR-0006 permanece vigente sin cambios.
- **ADR-0016**: nota de enmienda añadida (ver el propio documento) — la sección "Mecanismo elegido" queda condicionada a la finalización del Paso 1 de este ADR antes de iniciar implementación.

## Validación

### Paso 1 — Adaptación de ANALYTICS: COMPLETADO (2026-08-03)

**Implementación realizada**:
- Migración Prisma `20260803194122_outbox_event_delivery_adr0017` (aditiva): tabla `outbox_event_delivery`, enum `outbox_delivery_status` (`PROCESSED | FAILED`), `@@unique(outboxEventId, consumerName)`, FK a `outbox_event` con `onDelete: Cascade`. `OutboxEvent.status`/`attempts`/`lastError`/`processedAt` permanecen sin cambio de esquema, marcados `@deprecated` en `schema.prisma`.
- `OutboxEventDeliveryRepository` (nuevo, `platform/outbox/`): `findPendingFor(consumerName, limit, maxAttempts)` (ausencia de fila, o `FAILED` con reintentos disponibles) y `recordOutcome(...)` (create -> P2002 -> update con `attempts: increment`, mismo patrón que `UserService.initializeProfile`/`ProgressService`).
- `OutboxEventRepository`: retirados `findPending`/`markProcessed`/`markFailed` (dead code tras la migración; sin otros llamadores, verificado por búsqueda en todo `src/`). Conserva solo `create`.
- `AnalyticsService`/`AnalyticsScheduler`: migrados a `OutboxEventDeliveryRepository` con `consumerName = 'ANALYTICS'`, `MAX_DELIVERY_ATTEMPTS = 10`. Contrato observable sin cambios (mismo `{ processed, failed }`, mismos endpoints).
- `verify-analytics-gate.ts`: todas las aserciones sobre `OutboxEvent.status`/`attempts`/`lastError` reemplazadas por aserciones equivalentes sobre `outbox_event_delivery`. Se añadieron 3 verificaciones nuevas específicas de ADR-0017 (secciones 3b/3c): reintentos independientes por consumidor (un consumidor de prueba `GAMIFICATION_GATE_PROBE` con su propia fila `FAILED` no interfiere con el `attempts` de ANALYTICS sobre el mismo evento) y deduplicación `(outboxEventId, consumerName)` forzando una violación de restricción única directamente contra Postgres (código `23505`).

**Calidad**: `pnpm -r run typecheck` — PASS. `pnpm -r run lint` — PASS. `pnpm -r run build` (3 paquetes) — PASS.

**Gate de ANALYTICS** (`pnpm run verify:analytics-gate`, ejecutado dentro del gate consolidado): **PASS**, todas las verificaciones en verde, incluyendo:
- Entrega idempotente: doble ejecución del relay no duplica `analytics_event` ni re-marca una entrega ya `PROCESSED`.
- Reintentos independientes por consumidor: `attempts` de `(evento, ANALYTICS)` avanza sin afectar `attempts` de `(evento, GAMIFICATION_GATE_PROBE)` sobre el mismo evento.
- Deduplicación a nivel de base de datos: una segunda fila `(outboxEventId, consumerName)` idéntica es rechazada por la restricción única (`23505`), no por lógica de aplicación.
- `OutboxEvent.status` verificado explícitamente como ya no mutado por ningún consumidor: permanece en `PENDING` (valor de inserción) mientras `outbox_event_delivery` refleja el estado real de consumo — condición de avance fijada por el Product Owner, cumplida.

**Gate consolidado de M1** (`pnpm run verify:block-v-gate`): **PASS**, 16/16 pasos (typecheck, lint, build contracts, build backend, prisma generate, prisma migrate deploy, prisma seed, AUTH, PRIVACY, ANALYTICS, OBSERVABILITY, USER, OBJECT-STORAGE, seed de contenido, EDUCATION, PROGRESS, OFFLINE-OUTBOX) — sin regresiones sobre ningún dominio de M1.

**Incidencia encontrada durante la validación, causa raíz y resolución** (documentada por transparencia, no es un defecto del mecanismo): la primera ejecución del gate de ANALYTICS, contra la base de datos de desarrollo ya en uso durante esta sesión (627 filas acumuladas en `outbox_event` de corridas anteriores), produjo 15 fallos. Causa raíz confirmada por inspección directa de Postgres (no por hipótesis): bajo el nuevo criterio "pendiente = ausencia de fila de entrega", todo ese backlog histórico —que nunca tuvo filas de entrega, por no haber existido `outbox_event_delivery` hasta esta migración— pasó a ser "pendiente" a la vez; el relay (lotes de 100, FIFO por `createdAt`) procesó ese backlog antes de llegar a los eventos creados por el propio gate. **No es un defecto del mecanismo multi-consumidor**: una consulta directa a la base confirmó 542 filas de entrega `PROCESSED` ya creadas correctamente en ese momento. Resolución: reset autorizado explícitamente por el Product Owner de la base de datos de desarrollo local (`axioma_dev`, no productiva) a estado efímero (mismo estándar de validación que Architecture Review 1.0 ya exigía: "infraestructura efímera desde cero"). Tras el reset, gate de ANALYTICS y gate consolidado: PASS completo, sin ningún fallo.

### Paso 2 — Incorporación de GAMIFICATION: COMPLETADO (2026-08-03)

Autorizado y ejecutado en los tres incrementos del Bloque I (ver "Validación" de ADR-0016). `GamificationRelayWorker` (`GamificationService`) consumió `outbox_event_delivery` con `consumerName = 'GAMIFICATION'` desde su primera línea de código — nunca llegó a conocer `OutboxEventRepository.findPending()`/`markProcessed()`, tal como quedó fijado en la enmienda de ADR-0016.

Entrega independiente entre ambos consumidores verificada de punta a punta, no solo a nivel de infraestructura: `verify-gamification-integration-gate.ts` confirma que un evento procesado por ANALYTICS permanece pendiente para GAMIFICATION y viceversa, que un fallo de payload en GAMIFICATION no genera ninguna fila de entrega para ANALYTICS, y que ambos relays siguen respondiendo correctamente de forma simultánea. Los ocho Decision Gates de este ADR quedan así verificados también desde el lado de GAMIFICATION, no solo desde ANALYTICS.

**Gate consolidado del Bloque I** (`pnpm run verify:block-i-gate`): **PASS** — orquesta el gate consolidado de M1 completo (que incluye el gate de ANALYTICS de este ADR) más los tres gates propios de GAMIFICATION. Sin regresiones sobre el mecanismo multi-consumidor.

Con esto, ADR-0017 queda completamente implementado en ambos pasos de su plan de migración.
