# ADR 0005 — Privacy Foundation

- **Estado**: Aprobada, con cuatro ajustes obligatorios del usuario ya incorporados (ver "Ajustes post-revisión") — gate completo verificado (53 comprobaciones: 19 del gate de AUTH re-ejecutado sin regresiones + 34 del gate de PRIVACY, incluyendo la nueva prueba de fallo parcial/reintento), en local (Postgres de desarrollo) y replicado como lo haría CI (Postgres efímero vacío, dos instancias del backend en puertos separados).
- **Fecha**: 2026-07-31
- **Fase de aplicación**: Fase 0 — Foundation, Paso 5
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — transversal, difícil de revertir.

## Contexto

ADR-0004 dejó explícitamente diferido a Privacy Foundation: el job asíncrono que a los 30 días ejecuta el cierre definitivo de una cuenta en `DELETION_PENDING`, el flujo de recuperación dentro de ese plazo, y la expiración de datos temporales. Este ADR cierra ese Decision Gate con el mismo criterio de alcance mínimo usado en ADR-0003: construir solo lo que ya existe de verdad (el dominio AUTH), dejando el mecanismo listo para reutilizarse cuando existan más dominios con datos personales.

## Decisión

### Capas: PRIVACY coordina, AUTH ejecuta sobre sus propios datos

`PrivacyService` **nunca** toca las tablas `account`/`auth_identity`/`auth_session` directamente — todas las validaciones y mutaciones sobre esos datos pasan por métodos públicos de `AuthService` (`requestAccountDeletion`, `reactivateAccount`, `finalizeAccountClosure`, `cleanupExpiredSessions`), cada uno responsable de validar sus propios invariantes (ej. `reactivateAccount` rechaza si la cuenta no está en `DELETION_PENDING`, sin que `PrivacyService` necesite conocer los estados de `Account`). `PrivacyService` posee su propia tabla (`PrivacyRequest`) y sus propias reglas de elegibilidad (plazo, estado de la solicitud).

Este ADR corrige una ubicación temporal: el endpoint de solicitud de eliminación vivía en `AuthController` (`POST /auth/account/deletion`, ADR-0004) porque PRIVACY no existía todavía. Se **movió** a `PrivacyController` (`POST /privacy/account-deletion`) — PRIVACY es quien coordina la eliminación, no AUTH.

### Entidad `PrivacyRequest`

Subconjunto mínimo de `privacy_request` (Data Model): `id`, `accountId`, `status` (`PENDING | PROCESSING | COMPLETED | CANCELLED`), `requestedAt`, `scheduledFor`, `processingStartedAt`, `completedAt`, `cancelledAt`. **Sin FK a `account`** — deliberado: mantiene a PRIVACY desacoplado de AUTH incluso a nivel de esquema, la integridad se garantiza en la capa de aplicación.

No se agrega `privacy_request_task` (una tarea por dominio afectado) del Data Model completo: con un solo dominio afectado hoy (AUTH), sería una capa vacía. Se agrega cuando un segundo dominio necesite coordinarse.

**Estado `PROCESSING`**: se agregó durante la implementación para dar contenido real a "cuyo borrado definitivo ya haya comenzado". El barrido marca `PROCESSING` *antes* de ejecutar el cierre en Firebase, cerrando la ventana de carrera donde una recuperación podría solaparse con un cierre ya en marcha.

**`processingStartedAt`**: se fija la *primera* vez que una solicitud entra a `PROCESSING` y **no se sobrescribe en reintentos** — así "cuánto lleva atascada" se mide desde el intento original, no desde el último reintento fallido (ver "Recuperación ante fallos parciales" más abajo).

### Cierre definitivo (barrido programado)

`PrivacyService.runAccountDeletionSweep()`: procesa dos conjuntos de solicitudes —

1. `PENDING` con `scheduledFor` vencido (el caso normal, a los 30 días).
2. `PROCESSING` con `processingStartedAt` de más de 1 hora (solicitudes **atascadas**: un intento anterior se cayó a mitad de camino).

Para cada una, marca/conserva `PROCESSING` y llama a `AuthService.finalizeAccountClosure()`. **Solo si ese método completa sin lanzar excepción** se marca `COMPLETED` y se cierra la cuenta (`CLOSED` + `closedAt`). Si falla, la excepción se captura, se cuenta como `failed`, y la solicitud **queda en `PROCESSING`** para el próximo barrido — nunca se pierde, nunca se marca `COMPLETED` a medias.

`AuthService.finalizeAccountClosure()` es retry-safe por construcción: itera las identidades y solo actúa sobre las que *aún* no tienen `unlinkedAt` — una identidad ya procesada en un intento anterior se salta en el reintento. `FirebaseIdentityProvider.deleteUser()` además trata el error `auth/user-not-found` como éxito (no como fallo): si Firebase ya borró al usuario en un intento previo pero la escritura en Postgres fue la que falló después, el reintento no debe romperse por encontrar al usuario ya ausente.

### Expiración de datos temporales: solo lo que existe de verdad

`PrivacyService.runSessionCleanupSweep()` elimina `AuthSession` vencidas — la única categoría de dato temporal que existe hoy en el sistema. Las demás categorías ya aprobadas en la política de retención (notificaciones 90 días, chats IA 180 días, ranking 12 meses, reportes 2 años) **no** tienen mecanismo todavía porque esos dominios no existen — construir limpieza para tablas que no existen habría violado el Principio de necesidad.

### Programación

`@nestjs/schedule` (versión exacta `6.1.3`), `@Cron(CronExpression.EVERY_DAY_AT_3AM)` para ambos barridos en `PrivacyScheduler`. Cada barrido también es invocable manualmente vía `POST /privacy/_internal/sweep` — no depende únicamente del reloj, útil para operar y para pruebas/CI.

## Ajustes post-revisión (obligatorios, usuario, 2026-07-31)

### 1. Recuperación: CLI, no endpoint HTTP

**Cambio de diseño respecto a la primera versión de este ADR.** La primera versión exponía `POST /privacy/_internal/account-recovery` protegido por `InternalOpsGuard` (clave estática compartida). El usuario determinó que una clave estática aislada no es suficiente ni siquiera como infraestructura temporal, y que prefiere que la recuperación viva como una herramienta invocable directamente por el equipo, no como superficie HTTP.

**Se retiró ese endpoint.** La recuperación ahora se invoca vía `src/cli/recover-account.ts`:

```
node dist/cli/recover-account.js <accountId>
```

Usa `NestFactory.createApplicationContext(AppModule)` (contexto de Nest sin servidor HTTP) para obtener `PrivacyService` con inyección de dependencias real, llama a `cancelDeletion(accountId)`, y reporta éxito o el motivo exacto del rechazo. Se ejecuta con `node` sobre el build compilado (`dist/`), no con `tsx` — ver la sección "Hallazgo técnico" del ADR-0004 sobre por qué `tsx`/esbuild rompe la inyección de dependencias de Nest; el CLI vive dentro de `src/` precisamente para que `nest build` lo compile igual que el resto de la aplicación.

El endpoint `POST /privacy/_internal/sweep` (disparo manual de los barridos) **se mantiene**, porque es idempotente/de bajo riesgo (solo adelanta trabajo que de todas formas ocurriría por cron) y no fue objeto del mismo señalamiento. Queda documentado explícitamente en el código y aquí: **`INTERNAL_OPS_KEY` es infraestructura temporal de Fase 0, no una solución de producción** — antes de cualquier despliegue con tráfico real hace falta reemplazarla por autenticación real de operador (cuenta administrativa propia) o retirar también ese endpoint y dejar solo el cron.

### 2. Recuperación real ante fallos parciales (verificado con una prueba que simula la falla)

El usuario pidió confirmar, mediante prueba, que el cierre definitivo es recuperable si algo falla a mitad de camino entre Firebase y Postgres. Se implementó y se verificó con un caso de prueba dedicado (`verify-privacy-gate.ts`, caso 12) que:

1. Crea una cuenta cuya `AuthIdentity` está configurada (vía `StubIdentityProvider`, con un flag de prueba `simulateDeleteFailures`) para que su primer `deleteUser()` falle.
2. Fuerza la solicitud a estar vencida y dispara el barrido → `deleteUser()` lanza, `finalizeAccountClosure()` propaga la excepción, el barrido la captura → **verificado**: la solicitud queda en `PROCESSING` (no se pierde), `processingStartedAt` quedó registrado, la cuenta **no** pasa a `CLOSED`, la identidad **no** queda `unlinkedAt`.
3. Se fuerza (fixture SQL) que `processingStartedAt` parezca de hace más de 1 hora, simulando que quedó atascada.
4. Se dispara el barrido de nuevo → `findStuckProcessing()` la recoge → el segundo `deleteUser()` ya no falla (el flag de simulación se agotó) → **verificado**: la cuenta pasa a `CLOSED`, la solicitud a `COMPLETED`.

Esto confirma, con evidencia real (no solo diseño en el papel), que `PROCESSING` permite reintentos, que las solicitudes atascadas se detectan y se retoman, y que `CLOSED` nunca se marca hasta que las operaciones externas y la anonimización completan correctamente.

### 3. Terminología corregida: "seguro ante reintentos", no "idempotente"

La versión anterior de este ADR describía la recuperación como idempotente porque una segunda llamada no corrompe estado. El usuario señaló, correctamente, que eso es **seguridad ante reintentos**, no idempotencia en sentido estricto — idempotencia real exigiría que la segunda llamada devuelva el mismo resultado final *sin error*. Aquí la segunda llamada falla con un `409`/mensaje de error claro, no con un éxito silencioso repetido.

Se corrigió la terminología en el código (`privacy.service.ts`, comentario de `cancelDeletion`) y aquí: **la recuperación es segura ante reintentos (no corrompe estado, no reprocesa), pero no es idempotente en sentido estricto.** Se decidió mantener este comportamiento (fallar en vez de responder éxito silencioso en la repetición) porque para una herramienta operada por el equipo vía CLI, un error explícito en el segundo intento es más útil que un éxito ambiguo que no distingue "esta llamada recuperó la cuenta" de "esta llamada no hizo nada porque ya estaba recuperada". El barrido (`runAccountDeletionSweep`/`runSessionCleanupSweep`), en cambio, sí es idempotente en sentido estricto: correrlo sin candidatos pendientes devuelve `{processed: 0}`/`{deleted: 0}` sin error, siempre.

### 4. Advisory lock pendiente para múltiples réplicas

**Limitación conocida, documentada, no implementada en Fase 0** (el backend corre como instancia única): `@Cron` de `@nestjs/schedule` se ejecuta **por proceso**. Si el backend llegara a desplegarse con más de una réplica, cada una correría su propio cron de forma independiente, y dos réplicas podrían intentar procesar la misma `PrivacyRequest` simultáneamente — `findDue()`/`findStuckProcessing()` no tienen ninguna exclusión mutua entre procesos todavía.

**Antes de desplegar múltiples réplicas del backend**, este barrido necesita uno de:
- Un advisory lock de Postgres (`pg_try_advisory_lock`) que envuelva la ejecución completa del barrido, para que solo una réplica a la vez lo ejecute.
- Un patrón `SELECT ... FOR UPDATE SKIP LOCKED` al tomar las solicitudes candidatas, para que réplicas concurrentes se repartan el trabajo sin pisarse.
- Restringir el `@Cron` a una única réplica designada (ej. vía una variable de entorno tipo `IS_SCHEDULER_LEADER`, o delegar la programación a un servicio externo en vez de al proceso de la aplicación).

No se implementa ahora porque agregar coordinación distribuida para un despliegue de instancia única sería complejidad especulativa (Principio de necesidad) — pero es un requisito real, no opcional, antes de escalar horizontalmente.

## Hallazgo técnico durante la validación: colisión de rate limiting entre gates

Al ejecutar el gate de AUTH (ADR-0004) inmediatamente seguido del gate de PRIVACY contra el mismo proceso del servidor, varias verificaciones fallaron con datos `undefined`. Causa: el gate de AUTH agota deliberadamente el límite de `POST /auth/session` (10 req/min) en su última prueba; el contador del `ThrottlerModule` vive en memoria **por proceso**, así que el gate de PRIVACY heredaba ese límite ya agotado dentro de la misma ventana de 60 segundos.

No es un bug de la aplicación ni una razón para debilitar el límite de producción. **Solución**: cada gate corre contra una instancia nueva del backend (puerto propio), igual en este documento que en `.github/workflows/ci.yml`.

## Hallazgo técnico adicional: el CLI corre en un proceso separado del servidor

Al validar la recuperación vía CLI, la comprobación "tras recuperar, la cuenta puede volver a crear sesión" falló al principio — no por un error del mecanismo, sino porque el CLI (`NestFactory.createApplicationContext`) crea su propia instancia de `StubIdentityProvider`, con su propio estado en memoria, **distinta** de la instancia que vive dentro del proceso del servidor HTTP. `enableUser()` ejecutado por el CLI no puede afectar la memoria del servidor.

Con Firebase real esto no sería un problema (el estado "deshabilitado" vive en Firebase, infraestructura compartida entre cualquier proceso que la consulte). Es una limitación de aislamiento de procesos específica del *stub* de pruebas, no del diseño de recuperación en sí. La prueba se ajustó para verificar lo que sí es válido entre procesos (Postgres, infraestructura real y compartida): `Account.status`, `deletionRequestedAt`, `PrivacyRequest.status`. Que `cancelDeletion()` complete sin lanzar excepción ya es evidencia indirecta válida de que `enableUser()` se invocó correctamente para todas las identidades (de lo contrario, el método habría fallado).

## Alternativas descartadas

- **Endpoint HTTP de recuperación con clave estática** — descartado por el usuario (ver ajuste 1): no es suficiente para producción incluso como infraestructura temporal.
- **Recuperación por endpoint autenticado con `AuthGuard`** — técnicamente imposible: una identidad deshabilitada no puede producir un `idToken` válido nuevo.
- **`PrivacyRequest` con FK a `account`** — descartada para mantener el desacoplamiento de esquema entre dominios.
- **Barrido de notificaciones/chats IA/ranking ahora** — descartado: esos dominios no existen, hubiera sido código muerto.
- **Advisory lock implementado ya, sin necesitarlo** — descartado por ahora (instancia única); documentado como requisito futuro (ver ajuste 4), no construido especulativamente.

## Consecuencias

- Cualquier dominio nuevo con datos personales que necesite coordinarse con eliminación de cuenta debe exponer sus propios métodos de "deshabilitar"/"cerrar definitivamente" siguiendo el patrón de `AuthService`, invocados por `PrivacyService`, nunca tocando las tablas de ese dominio directamente.
- El CLI de recuperación debe reemplazarse por (o complementarse con) un flujo de autoservicio real (enlace/código por correo, ligado a `auth_challenge`, todavía diferido) antes de cualquier beta con usuarios reales.
- `INTERNAL_OPS_KEY` (que ahora solo protege el disparo manual del barrido, no la recuperación) debe generarse único por ambiente y rotar si se sospecha exposición.
- **Antes de escalar el backend a múltiples réplicas, es obligatorio implementar el advisory lock (o equivalente) del ajuste 4** — no es opcional, quedaría como deuda técnica silenciosa si se ignora.

## Validación (53/53 comprobaciones)

Ejecutado con cada gate contra su propia instancia del backend, dos veces: Postgres de desarrollo persistente, y replicando el job de CI desde cero (Postgres efímero vacío, 3 migraciones, seed, build, dos instancias del backend en puertos separados).

- Solicitud de eliminación crea `PrivacyRequest` (`scheduledFor` ≈ +30 días) y coordina AUTH (sesión revocada, identidad deshabilitada).
- Recuperación exitosa dentro de plazo vía CLI: restaura `ACTIVE`/`PENDING` según verificación de email, limpia `deletionRequestedAt`, cancela la solicitud.
- Recuperación rechazada (vía CLI, cada caso por separado): sin solicitud activa (repetición segura), plazo vencido, borrado ya en `PROCESSING`, cuenta ya `CLOSED`.
- **Fallo parcial simulado**: `deleteUser()` falla → cuenta NO se cierra, solicitud queda `PROCESSING`, identidad no queda `unlinked` → tras detectarse como atascada, el reintento del barrido completa correctamente.
- Barrido de sesiones vencidas elimina filas reales; ambos barridos son idempotentes en sentido estricto.
- El endpoint de barrido exige `X-Internal-Ops-Key`; sin ella, `401`. No existe ningún endpoint HTTP de recuperación.
- `pnpm -r run typecheck/lint`, build de los 4 paquetes, y CI (ambos jobs) en verde.

**Pendiente no bloqueante** (igual que ADR-0004): validación con proyecto Firebase real — cambio de configuración, no de arquitectura ni implementación.
