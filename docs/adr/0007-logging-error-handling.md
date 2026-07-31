# ADR 0007 — Logging y manejo de errores

- **Estado**: Aprobada, con los ajustes obligatorios del usuario ya incorporados — gate completo verificado (19+34+34 comprobaciones heredadas de ADR-0004/0005/0006 re-ejecutadas sin regresiones + 43 comprobaciones nuevas de OBSERVABILITY), en local (Postgres de desarrollo) y replicado como lo haría CI (Postgres efímero vacío, 5 migraciones sin cambios, 4 instancias del backend en puertos separados).
- **Fecha**: 2026-08-01
- **Fase de aplicación**: Fase 0 — Foundation, Paso 7
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — transversal (toca todos los dominios existentes al reemplazar el logger global y agregar un filtro global de excepciones), aunque de bajo riesgo/reversible.

## Contexto

La Implementation Matrix v1.1 incluye "logging, manejo de errores" en Fase 0, sin un paso previo dedicado. Al revisar el código existente para diseñar este paso se encontró un defecto real, no solo una carencia estética: [`AuthController.createSession`](../../apps/backend/src/auth/auth.controller.ts) validaba el body con `createSessionRequestSchema.parse(body)` directo — si el body era inválido, Zod lanza `ZodError`, que no es una `HttpException` de Nest, y sin filtro global eso resultaba en un **500 genérico** para un simple error de input del cliente. Master Context 5.23/8.22/9.15 piden logs estructurados, identificadores de correlación (incluyendo para "trabajo asíncrono", no solo requests HTTP) y que los logs nunca contengan credenciales/tokens/secretos. Este ADR cierra ambos gaps a la vez.

## Decisión

### Logger propio, sin nueva dependencia

`StructuredLogger implements LoggerService` (`platform/observability/structured-logger.service.ts`), registrado vía `app.useLogger()` en `main.ts`. Nest propaga esta instancia a **todo** `new Logger(Contexto)` existente (Auth, Privacy, Analytics, internals de Nest) sin tocar esos archivos — documentado explícitamente por Nest: `useLogger()` reemplaza el logger usado detrás de escena por la clase `Logger`. Se descartó agregar Pino/Winston: no hay volumen de logs hoy que justifique una dependencia nueva: decisión reafirmada por el usuario al aprobar el alcance.

Cada línea es un objeto JSON independiente: `{timestamp, level, context, message, appVersion, requestId?, stack?, meta?}`. `LOG_LEVEL` (env var, default `log`) controla verbosidad con el orden `verbose < debug < log < warn < error < fatal`.

### `appVersion`: cadena de fallback explícita

`resolveAppVersion()` (`platform/observability/app-version.ts`): `APP_VERSION` del entorno → versión de `package.json` (leído en runtime desde `process.cwd()`, misma convención ya usada por scripts/CI) → `'unknown'`. En CI/producción se fija al mismo valor que `PRODUCER_VERSION` (ADR-0006).

### `correlationId`: un concepto, dos orígenes

Vía `AsyncLocalStorage` (`platform/observability/correlation-id.store.ts`). En HTTP coincide con `X-Request-Id`; en trabajos programados (barrido de Privacy, relay de Analytics) representa el identificador propio de **esa ejecución**, generado internamente — nunca reutilizado entre corridas ni tomado ciegamente del cliente.

**Nunca se confía en `X-Request-Id` sin validar**: `sanitizeIncomingRequestId()` exige `^[A-Za-z0-9._-]{1,128}$` — un valor demasiado largo, con espacios, con caracteres fuera del charset, o vacío, se descarta silenciosamente y se genera un `crypto.randomUUID()` en su lugar. El middleware (`correlation-id.middleware.ts`, registrado con `app.use()` antes que cualquier guard/filtro) fija el header `X-Request-Id` de la respuesta con el valor final (recibido válido o generado) y corre el resto del request dentro de ese contexto — así el mismo id llega al header, al envelope de error y al log, siempre.

**Cada ejecución de un job (barrido de Privacy, relay de Analytics) crea su propio contexto ALS, nuevo y distinto** — tanto si lo dispara el cron (`PrivacyScheduler`, `AnalyticsScheduler`) como si lo dispara el endpoint manual (`POST /privacy/_internal/sweep`, `POST /analytics/_internal/relay`, ADR-0005/0006). Se decidió generar el id del job en **ambos** puntos de entrada (no solo en el cron): un barrido/relay es conceptualmente su propio trabajo, distinto de la request HTTP que eventualmente lo dispara manualmente — esto también es lo que hace verificable con evidencia real (gate punto 9) que dos ejecuciones consecutivas, incluso disparadas con el mismo `X-Request-Id` externo fijo, producen `correlationId` de job distintos entre sí y distintos del id externo.

### Filtro global de excepciones: normalización sin fugas

`AllExceptionsFilter` (`@Catch()`, sin dominio específico) en `platform/observability/http-exception.filter.ts`. Formato único:

```json
{ "error": { "code": "CONFLICT", "message": "...", "requestId": "...", "timestamp": "..." } }
```

`normalizeHttpExceptionBody()` maneja los tres shapes posibles de `exception.getResponse()` (string, objeto, array) **sin spread ciego** — solo extrae `code` (si la excepción lo declaró explícitamente, como `parseRequestBody`) o lo deriva del texto del status HTTP (`node:http` `STATUS_CODES`, ej. "Too Many Requests" → `TOO_MANY_REQUESTS`), `message`, e `issues` (solo `{path, message}`, nunca campos arbitrarios). Ningún campo interno no reconocido llega al cliente.

**4xx se loguea como `warn` (sin stack); 5xx como `error` (con el mensaje y el stack REALES del error, no el genérico que ve el cliente)**. Esta distinción importa: para un error no reconocido, el cliente recibe `"Error interno."` genérico, pero el servidor loguea el mensaje y stack verdaderos — así se puede responder "qué falló, dónde" (Master Context 8.22) sin exponerlo. Verificado con un endpoint de diagnóstico dedicado (ver más abajo) que primero confirmó, con evidencia real, que el diseño inicial perdía el mensaje real en el log (solo registraba el genérico) — se corrigió antes de cerrar este ADR.

### Validación de input: el defecto se corrige en el punto exacto, no genéricamente

`parseRequestBody(schema, body)` (`platform/validation/parse-request-body.ts`): `schema.safeParse()` + `BadRequestException({code: 'VALIDATION_ERROR', message, issues})` si falla — **sin eco de los valores crudos inválidos** (un idToken parcial/malformado nunca se refleja en la respuesta). Reemplaza el `.parse()` de `AuthController.createSession` (único lugar que hoy parsea un body de request).

Los `.parse()` de esquemas de **respuesta** (`createSessionResponseSchema.parse(result)`, etc.) se dejan intactos: si esos fallan, es un bug del propio backend, y debe terminar en 500 genérico igual que cualquier error no reconocido — nunca disfrazarse de "error de input del cliente". Esta distinción se resuelve por la UBICACIÓN del `safeParse` (frontera de entrada vs. frontera de salida), no por inspeccionar el tipo de error en el filtro.

### Sanitización central por clave, no redacción de texto libre

`sanitizeForLog()`/`safeStringify()` (`platform/observability/sanitize.ts`): redacta por **nombre de clave normalizado** (minúsculas, sin separadores) contra una lista conocida — `authorization`, `cookie`, `idToken`, `accessToken`, `refreshToken`, `password`, `internalOpsKey`, `analyticsActorSecret` — sin importar el nivel de anidamiento ni el estilo de nombre (`X-Internal-Ops-Key`, `internal_ops_key`, `internalOpsKey` normalizan igual). Explícitamente **no** se implementa redacción de PII en mensajes de texto libre (ej. un email escrito a mano dentro de un `logger.log('...')`) — depende de la disciplina del desarrollador, igual que hoy; una necesidad real de eso se atiende cuando aparezca.

**Serialización defensiva**: `sanitizeForLog()` normaliza `Error` (`{name, message, stack}`), `BigInt` (a string), referencias circulares (marcador `'[Circular]'` vía `WeakSet`), funciones y símbolos — nunca lanza. `safeStringify()` tiene un `catch` final que garantiza una línea JSON mínima incluso si algo inesperado escapara a la sanitización.

### Endpoint de diagnóstico: verificar con evidencia real, no solo en el papel

`platform/observability/diagnostics.controller.ts` — dos endpoints (`POST /platform/_internal/diagnostics/throw`, `POST /platform/_internal/diagnostics/log-tricky`), protegidos por `InternalOpsGuard` **y** rechazados explícitamente si `NODE_ENV=production` (mismo criterio que `AUTH_IDENTITY_PROVIDER=stub`, ADR-0004) — nunca alcanzables con tráfico real. Sin esto, "el filtro distingue 4xx/5xx" y "la serialización nunca rompe con Error/BigInt/circular" habrían quedado sin verificación real, solo argumentadas en el diseño.

## Alternativas descartadas

- **Pino/Winston** — descartado por el usuario al aprobar el alcance: sin volumen de logs que justifique una dependencia nueva hoy.
- **Confiar en `X-Request-Id` del cliente sin validar** — descartado: un valor arbitrario (control chars, longitud sin límite) podría romper el formato de log o inyectar contenido no controlado; se valida longitud + charset antes de aceptarlo.
- **Loguear el mensaje genérico en vez del real para errores 5xx** — descartado tras revisión: perdería la única pista útil para depurar; el cliente sigue recibiendo el mensaje genérico, pero el servidor necesita el real.
- **Redacción de PII en texto libre por regex** — descartada para este paso: alcance distinto (sanitización por clave conocida, no escaneo de contenido); se evalúa si aparece necesidad real.
- **Reutilizar el `correlationId` de la request HTTP para el job de un sweep/relay disparado manualmente** — descartado: un job es conceptualmente distinto de la request que lo disparó; además, hacerlo así habría sido imposible de verificar con evidencia (gate punto 9) sin poder invocar el cron directamente desde los scripts de verificación (limitación ya documentada en ADR-0004: `tsx`/esbuild rompe la inyección de dependencias de Nest).

## Consecuencias

- Todo código nuevo que loguee metadata debe confiar en que `sanitizeForLog()` redacta claves sensibles conocidas — pero si un desarrollador escribe un mensaje de texto libre con un dato sensible embebido (no como clave estructurada), eso **no** se redacta hoy; sigue siendo responsabilidad del desarrollador, igual que antes de este ADR.
- Cualquier controller nuevo que reciba un body de cliente debe usar `parseRequestBody()`, no `.parse()` directo — de lo contrario, un input inválido volvería a producir un 500 en vez de un 400 claro.
- Los dos endpoints de diagnóstico deben seguir bloqueados en producción (`NODE_ENV=production`) — es infraestructura de verificación de Fase 0, no una capacidad operativa a futuro.
- `LOG_LEVEL` y `APP_VERSION` se suman a las variables de entorno por ambiente (ver `.env.example`).

## Validación (87 heredadas sin regresiones + 43 nuevas de OBSERVABILITY)

Ejecutado con cuatro instancias del backend en puertos separados, contra Postgres de desarrollo y replicando CI desde cero (Postgres efímero, 5 migraciones sin cambios respecto a ADR-0006, seed, build, 4 instancias en puertos separados).

- Gates de AUTH (19), PRIVACY (34) y ANALYTICS (34) re-ejecutados: sin regresiones.
- Gate de OBSERVABILITY (43 comprobaciones nuevas), incluyendo:
  - `X-Request-Id` inválido (demasiado largo, caracteres no permitidos) se ignora; se genera un UUID válido. `X-Request-Id` válido se respeta con eco exacto.
  - El mismo `requestId` aparece en el header de respuesta, el `error.requestId` del body y la línea de log correspondiente.
  - `error.*` nunca expone campos no declarados (verificado contra la lista blanca `code, message, requestId, timestamp, issues`).
  - Un input inválido a `/auth/session` → 400 con `code: VALIDATION_ERROR` e `issues` normalizados a `{path, message}` (antes de este paso: 500).
  - Un error no manejado → 500 genérico al cliente (sin mensaje real, sin stack), pero el log del servidor sí registra el mensaje real y el stack, en nivel `error`.
  - La excepción 401 del punto anterior se logueó en nivel `warn`, sin stack.
  - Una carga deliberadamente difícil (Error, BigInt, referencia circular) se loguea sin romper el proceso; cada campo se normaliza correctamente.
  - Ninguna de seis claves sensibles de prueba aparece en texto plano en el log; el marcador `[REDACTED]` sí aparece.
  - Dos ejecuciones consecutivas del barrido de Privacy y del relay de Analytics, disparadas con el mismo `X-Request-Id` externo fijo, producen `correlationId` de job distintos entre sí y distintos del id externo.
  - Cada línea del archivo de log completo es JSON válido de una sola línea, con `timestamp, level, context, message, appVersion`.
- `pnpm -r run typecheck/lint`, build de los 3 paquetes, en verde.

**Pendiente no bloqueante**: como en pasos anteriores, no aplica aquí (este paso no depende de Firebase).
