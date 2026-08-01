# ADR 0008 — Gestión de usuarios (perfil básico)

- **Estado**: Aprobada, con los siete ajustes obligatorios del usuario ya incorporados — gate completo verificado (19+34+38+44 comprobaciones heredadas de ADR-0004/0005/0006/0007 re-ejecutadas sin regresiones + 40 comprobaciones nuevas de USER — conteos corregidos en Architecture Review 1.0, 2026-08-01, para coincidir con la ejecución real del gate), en local (Postgres de desarrollo) y replicado como lo haría CI (Postgres efímero vacío, 6 migraciones, 5 instancias del backend en puertos separados).
- **Fecha**: 2026-08-01
- **Fase de aplicación**: Fase 0 — Foundation, Paso 8
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — introduce el dominio USER y modifica el barrido de PRIVACY ya aprobado (ADR-0005).

## Contexto

La Implementation Matrix v1.1 incluye "gestión de usuarios" en Fase 0. El Data Model (Bloque 6) separa tres conceptos: `account` (AUTH, ya construido en ADR-0004), `student_profile` (USER, perfil privado — este paso) y `public_profile` (USER, identidad pública/username, rankings — Fase 4, fuera de alcance). Este paso construye únicamente lo primero, con el alcance estrictamente mínimo pedido por el usuario: sin XP/gamificación, sin perfil público, sin carga de imágenes (pendiente Decision Gate S3/R2), sin `profileStatus` propio.

## Decisión

### Entidad mínima, sin FK a Account

`UserProfile`: `id`, `accountId` (único, sin relación de esquema — mismo criterio que `PrivacyRequest`, ADR-0005), `displayName`, `timezone`, timestamps. Sin `profileStatus`: los tres endpoints son siempre de autoservicio (`request.accountId` resuelto por `AuthGuard`, nunca un id del cliente), y una cuenta `DELETION_PENDING`/`CLOSED` ya no puede autenticarse (sesiones revocadas e identidad deshabilitada desde `requestAccountDeletion`, ADR-0004) — duplicar ese estado en USER habría sido redundante y con riesgo de desincronización.

### Inicialización explícita, semántica de POST explícita (ajuste 3)

`POST /user/profile`: **201** en la primera creación, **200** si el perfil ya existía (nunca lo modifica — para eso está `PATCH`). AUTH no crea el perfil (no hay dependencia Auth→User en Master Context); el cliente móvil secuencia login → inicialización durante el onboarding.

### Creación concurrente segura (ajuste 2)

`UserService.initializeProfile()`: verifica existencia, y si no hay fila, intenta `create()`. Si dos requests concurrentes llegan a este punto a la vez, la restricción única de `account_id` en Postgres deja pasar solo un `INSERT`; el otro recibe `Prisma.PrismaClientKnownRequestError` código `P2002`, se captura explícitamente, y se re-consulta el perfil recién creado por el "ganador" — **nunca un 500**. Verificado con dos `POST` disparados en paralelo (`Promise.all`) contra una cuenta nueva: exactamente un 201 y un 200, una sola fila en `user_profile`.

### Eliminación completa al cierre definitivo, no anonimización (ajuste 1)

Cambio respecto a la propuesta inicial de este ADR: `anonymizeProfile()` se sustituyó por `UserService.deleteProfileForAccountClosure(accountId)` — elimina la fila por completo (`deleteMany`, nunca lanza si no existe). Justificación del usuario: para este perfil mínimo (solo `displayName`/`timezone`) no hay ninguna necesidad de conservar el registro una vez cerrada la cuenta; anonimizar habría sido complejidad sin propósito.

Se invoca desde `PrivacyService.runAccountDeletionSweep()`, dentro del mismo bloque `try`, inmediatamente después de `authService.finalizeAccountClosure()` y antes de `markCompleted()` — si fallara, la solicitud queda `PROCESSING` para reintento, exactamente igual que un fallo de `finalizeAccountClosure` hoy (ADR-0005). Esto requirió que `PrivacyModule` importe `UserModule` (nueva dependencia sobre código ya aprobado, marcada explícitamente para aprobación del usuario en la propuesta).

### Validación de `displayName`: límites, contenido y Unicode (ajuste 4)

Longitud 2–40 (medida sobre la forma ya normalizada), sin espacios al inicio/final, sin caracteres de control (rango U+0000–U+001F, U+007F, y los separadores de línea/párrafo U+2028/U+2029 — detectados por `charCodeAt`, no por regex, para evitar cualquier ambigüedad de codificación). **Normalización a NFC antes de validar y de guardar**: el esquema Zod aplica `.transform(v => v.normalize('NFC'))` como primer paso, de modo que lo que se valida es exactamente lo que se persiste, sin importar si el cliente envió la forma compuesta (NFC) o descompuesta (NFD) — verificado enviando explícitamente una forma NFD construida en runtime (`'Niño Núñez'.normalize('NFD')`) y confirmando que lo persistido es la forma NFC. Deliberadamente **sin** moderación de contenido/groserías — Data Model 6.6 ubica esa regla en `public_profile.username`, no en `display_name` privado, y explícitamente difiere "la política exacta de moderación" a una especificación operativa posterior.

### `timezone`: default de producto, no inferencia (ajuste 5)

`DEFAULT_USER_TIMEZONE = 'America/Santiago'` — documentado explícitamente como decisión de producto (Chile/PAES), no como resultado de detectar el dispositivo/locale del usuario. Validado contra `Intl.supportedValuesOf('timeZone')` (nativo de Node, sin dependencia nueva).

### Sin eventos analíticos propios todavía (ajuste 6)

No se agregan `user_profile_created`/`user_profile_updated` al catálogo de ANALYTICS (ADR-0006) — el cierre de cuenta ya lo cubre `account_deletion_completed` a nivel agregado, y no existe todavía una necesidad analítica real declarada para el ciclo de vida del perfil en sí. Se agregará cuando esa necesidad exista, no especulativamente.

## Alternativas descartadas

- **Anonimizar `displayName` en vez de eliminar la fila** — descartada por el usuario (ajuste 1): sin necesidad de conservar el registro para este perfil mínimo.
- **`profileStatus` propio en USER** — descartado: duplicaría `Account.status` con riesgo de desincronización; el autoservicio vía `AuthGuard` ya resuelve el caso de cuentas `DELETION_PENDING`/`CLOSED`.
- **Creación automática del perfil desde AUTH** — descartada: introduciría una dependencia Auth→User que Master Context no establece.
- **Moderación de contenido / filtro de groserías en `displayName`** — descartada para este paso (ajuste 4): corresponde a `public_profile.username`, con política aún no definida operativamente.
- **Eventos analíticos propios de USER** — descartados (ajuste 6): sin necesidad real declarada todavía.
- **`America/Santiago` como inferencia automática** — descartada (ajuste 5): es un default de producto explícito, documentado como tal.

## Consecuencias

- `PrivacyModule` ahora depende de `UserModule` además de `AuthModule` — cualquier dominio futuro con datos personales debe seguir el mismo patrón: exponer su propio método de cierre/eliminación, invocado por `PrivacyService` dentro del mismo `try` del barrido, antes de `markCompleted`.
- Si en el futuro se necesita un perfil público (`public_profile`, username, avatar) o gamificación sobre USER, esos son dominios/extensiones nuevas — no se construyen ampliando `UserProfile` retroactivamente sin una decisión explícita.
- Cualquier campo nuevo en `UserProfile` con datos personales debe evaluarse contra el mismo criterio de eliminación completa al cierre (no queda automáticamente cubierto si el campo requiriera retención distinta).

## Validación (135 heredadas sin regresiones + 40 nuevas de USER)

Ejecutado con cinco instancias del backend en puertos separados, contra Postgres de desarrollo y replicando CI desde cero (Postgres efímero, 6 migraciones, seed, build, 5 instancias en puertos separados).

- Gates de AUTH (19), PRIVACY (34), ANALYTICS (34) y OBSERVABILITY (43) re-ejecutados: sin regresiones.
- Gate de USER (40 comprobaciones nuevas), incluyendo (ajuste 7):
  - Creación concurrente (`Promise.all` con dos `POST` simultáneos): ningún 500, exactamente un 201 y un 200, una sola fila en `user_profile`.
  - Diferencia `201` (primera creación) vs `200` (perfil ya existente).
  - Un segundo `POST` con un `displayName` distinto NO modifica el perfil ya creado.
  - Soporte correcto de Unicode (tildes, ñ) y normalización a NFC verificada con una forma NFD construida en runtime.
  - Eliminación completa (no anonimización) de `UserProfile` verificada directo en Postgres tras el barrido de cierre definitivo.
  - Cerrar una cuenta sin perfil inicializado no falla (`deleteMany` sobre cero filas).
  - Repetir el barrido de cierre es seguro (perfiles ya ausentes, sin error).
  - Validación de límites/contenido de `displayName` (longitud, espacios extremos, caracteres de control) y de `timezone` (IANA) — cada caso inválido devuelve 400 `VALIDATION_ERROR`.
  - Aislamiento entre cuentas: cada cuenta solo puede ver/modificar su propio perfil (sin parámetro de id expuesto).
- `pnpm -r run typecheck/lint`, build de los 3 paquetes, en verde.

**Pendiente no bloqueante**: no aplica (este paso no depende de Firebase ni de infraestructura externa).
