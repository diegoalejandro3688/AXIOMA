# ADR 0004 — Identity & Authentication Foundation

- **Estado**: **Aprobada formalmente** (2026-07-31) — gate completo verificado (19/19 comprobaciones — corregido de "24/24" en Architecture Review 1.0, 2026-08-01: el número original no coincidía con el conteo real de verificaciones del script ni con lo citado en los ADR posteriores) contra el backend real, en local (Postgres de desarrollo) y replicado como lo haría CI (Postgres efímero vacío). La única validación pendiente (integración con un proyecto Firebase real) es una comprobación de configuración, no un cambio de arquitectura ni de implementación — no bloquea el cierre de este paso ni la continuación de la Fase 0. Ver "Validación" para el detalle.
- **Fecha**: 2026-07-31
- **Fase de aplicación**: Fase 0 — Foundation, Paso 4
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2/3 — resuelve OQ-020 (Decision Gate explícito del PRD) y fija arquitectura transversal difícil de revertir.

## Contexto

El PRD (AUTH-001, prioridad MUST) exige explícitamente: *"Axioma deberá utilizar inicialmente un proveedor de identidad administrado o mecanismos de autenticación ampliamente probados. No deberá construir un sistema completo de credenciales propio para V1."* La selección exacta del proveedor quedaba abierta en **OQ-020** ("¿Qué métodos de autenticación habrá?"), marcada como *Decision Gate antes de desarrollar producción*.

El Data Model (Bloque 5) ya modela el dominio AUTH con siete entidades (`account`, `auth_identity`, `auth_session`, `client_installation`, `auth_challenge`, `account_restriction`, `security_event`). Esta fundación implementa un subconjunto mínimo de tres, consistente con el patrón ya usado en ADR-0003 (Data Model = estructura lógica completa, no implica que todo se construya de inmediato).

## Decisión

### OQ-020 — Proveedor de identidad: Firebase Authentication

Firebase Authentication resuelve AUTH-001/002 como proveedor administrado. Firebase se limita a: credenciales, verificación de correo, recuperación de acceso, sesiones propias del proveedor y proveedores sociales futuros (Google, Apple). **Firebase nunca es base de datos de producto** — PostgreSQL sigue siendo la única autoridad sobre perfil, progreso, privacidad, roles y suscripción (ninguno de los cuales se implementa todavía en este paso).

**Gate validado con correo y contraseña únicamente.** Google y Apple quedan preparados arquitectónicamente (el diseño no distingue métodos — ver más abajo) pero fuera del alcance de esta validación.

### La interfaz `IdentityProvider`

```ts
interface IdentityProvider {
  verifyToken(token: string): Promise<VerifiedIdentity>;
  disableUser(providerSubject: string): Promise<void>; // reversible
  enableUser(providerSubject: string): Promise<void>;
  deleteUser(providerSubject: string): Promise<void>;   // irreversible
}
```

`FirebaseIdentityProvider` (`src/auth/identity-provider/firebase-identity.provider.ts`) es la **única** clase de todo el dominio AUTH que importa `firebase-admin`. `AuthService` depende del token de inyección `IDENTITY_PROVIDER`, nunca de una clase concreta — sustituir Firebase en el futuro significa escribir una nueva implementación de esta interfaz, no tocar `AuthService`, `AuthController`, `AuthGuard`, ni ningún repositorio.

Las claves administrativas (`FIREBASE_SERVICE_ACCOUNT_JSON`) viven solo en variables de entorno del backend — nunca en el repo, nunca llegan al cliente.

### Entidades (subconjunto mínimo del Data Model, Bloque 5)

- **`Account`** — `id`, `status` (`PENDING | ACTIVE | DELETION_PENDING | CLOSED`), `sessionVersion`, `deletionRequestedAt`, `closedAt`, timestamps. `PENDING` = correo no verificado (acceso limitado); `ACTIVE` = correo verificado. `RESTRICTED`/`RECOVERY_REQUIRED` del Data Model completo quedan fuera — pertenecen a `account_restriction`/`auth_challenge`, no construidos en este paso.
- **`AuthIdentity`** — vínculo con el UID de Firebase (`providerCode='firebase'`, `providerSubject`), `emailNormalized`, `emailVerifiedAt`, `unlinkedAt`. Único índice `(providerCode, providerSubject)`.
- **`AuthSession`** — sesión propia y revocable, independiente de la validez técnica del `idToken`. `sessionVersion` propio, copiado de `Account.sessionVersion` al crearse.

Repositorio por agregado (`AccountRepository`, `AuthIdentityRepository`, `AuthSessionRepository`) — regla ya fijada en ADR-0003, cada uno único punto de acceso a su tabla.

### Flujo de creación y vinculación (implementado en `AuthService.createSession`)

1. Cliente se autentica con el SDK de Firebase (fuera del backend), obtiene `idToken`.
2. `POST /auth/session` con ese `idToken` — único endpoint que puede crear o vincular. `AuthGuard` nunca crea nada, solo autoriza.
3. `identityProvider.verifyToken(idToken)` — único punto de contacto con Firebase en toda la operación.
4. Si ya existe `AuthIdentity` para ese `providerSubject` (mismo UID de Firebase) → se reutiliza la cuenta; si el correo pasó a verificado, `Account` transiciona de `PENDING` a `ACTIVE`.
5. Si el UID es nuevo: **regla obligatoria del usuario, sin excepción** — se rechaza con `409` genérico si el email normalizado ya está vinculado a otra cuenta, **incluso con ambos correos verificados**. Axioma nunca fusiona dos UID de Firebase distintos automáticamente; la vinculación de métodos bajo un mismo UID es responsabilidad de Firebase (vía un flujo explícito del lado del cliente), no de Axioma. El mensaje de error no revela si la cuenta existe (Data Model, principio 82).
6. Si no hay conflicto, se crea `Account` (`ACTIVE` o `PENDING` según `emailVerified`) + `AuthIdentity`.
7. Se crea una `AuthSession` nueva, `sessionVersion = Account.sessionVersion` actual.

### Validación de sesión (ajuste obligatorio del usuario sobre la propuesta original)

`POST /auth/session` devuelve un **`sessionId` opaco** (el `id` de la fila `AuthSession`). Toda request protegida debe enviar **ambos**: `Authorization: Bearer <idToken>` y el header `X-Session-Id`. `AuthGuard` (`src/auth/auth.guard.ts`) valida la fila específica de esa `sessionId`:

1. Verifica el `idToken` → obtiene `providerSubject` → `AuthIdentity` → `accountId`.
2. Busca la `AuthSession` por `sessionId`.
3. **Propiedad**: `session.accountId` debe coincidir con la cuenta derivada del token (rechaza `sessionId` de otra cuenta, aunque el token sea válido).
4. **Revocación**: `session.revokedAt` debe ser nulo.
5. **Expiración**: `session.expiresAt` no debe haber pasado.
6. **`sessionVersion`**: debe coincidir con `Account.sessionVersion` actual (permite invalidación global).

No basta con "cualquier sesión activa de la cuenta" — se valida esa sesión, punto por punto. Verificado con casos de ataque simulados (sessionId de otra cuenta, sessionId inexistente, sesión expirada vía fixture directa en Postgres).

### Eliminación coordinada

**Síncrona (implementada en este paso, `AuthService.requestAccountDeletion`)**:
1. `Account.status → DELETION_PENDING`, `deletionRequestedAt = now()`.
2. `Account.sessionVersion` incrementado → invalida toda sesión activa de golpe.
3. Se revocan explícitamente todas las `AuthSession` de la cuenta (defensa en profundidad, redundante con el punto 2 pero barato y auditable).
4. `identityProvider.disableUser()` para **todas** las `AuthIdentity` activas de la cuenta (no solo la usada para pedir la eliminación) — requisito explícito del usuario.

**Diferido a Privacy Foundation (Implementation Matrix v1.1, Fase 2)**: el job asíncrono que a los 30 días (política de retención ya aprobada) ejecuta `identityProvider.deleteUser()` definitivo, marca `AuthIdentity.unlinkedAt`, cierra la cuenta (`CLOSED`), y anonimiza/elimina datos en Postgres. El flujo de recuperación dentro de los 30 días (`enableUser()` + `Account.status` vuelve a `ACTIVE`) también queda diferido — los métodos ya existen en `IdentityProvider`, ese trabajo futuro solo los invoca.

### Rate limiting

`@nestjs/throttler`, límite global de 100 req/min, y límite específico de 10 req/min en `POST /auth/session` (`@Throttle`). Verificado: la petición #11 en una ráfaga devuelve `429`.

## Hallazgo técnico durante la implementación

Al escribir el script de verificación del gate, `NestFactory.create()` ejecutado vía `tsx` falló con `Cannot read properties of undefined (reading 'getOrThrow')` en la inyección de `ConfigService` dentro de `PrismaService`. Causa: `tsx` usa esbuild para transpilar TypeScript, y esbuild **no emite** los metadatos de decoradores (`emitDecoratorMetadata`) que la inyección de dependencias de NestJS necesita para inferir tipos de parámetros de constructor por reflexión. Esto es una limitación conocida de esbuild, no un bug del código.

**Consecuencia de diseño**: el script de verificación (`scripts/verify-auth-gate.ts`) no arranca la app vía `NestFactory` — en su lugar, prueba contra el servidor real ya compilado y corriendo (`node dist/main.js`, el mismo camino que producción), usando solo HTTP y una conexión directa a Postgres (`pg`) para fixtures de prueba (ej. forzar una sesión expirada). `StubIdentityProvider.encode()` es un método estático sin dependencias de Nest, así que genera tokens de prueba sin necesitar DI. Este patrón queda documentado para cualquier script de verificación futuro en el proyecto.

## `StubIdentityProvider` — solo desarrollo/pruebas

`AUTH_IDENTITY_PROVIDER=stub` activa una implementación de `IdentityProvider` sin dependencia de un proyecto Firebase real, con tokens codificados de forma determinística (sin estado en memoria, para que scripts externos puedan generarlos). El módulo **rechaza explícitamente** `stub` cuando `NODE_ENV=production` (lanza un error al construir el proveedor). Usado en este ADR para validar todo el gate sin necesitar credenciales reales de Firebase, que el usuario todavía no ha provisto.

## Alternativas descartadas

- **Supabase Auth (GoTrue) autoalojado** — descartado por carga operativa prematura para un equipo de 2 personas (una pieza más de infraestructura que mantener).
- **Clerk** — descartado por mayor dependencia comercial y de plataforma (usuarios viven fuera de nuestro Postgres, requeriría sincronización vía webhooks).
- **Vinculación automática por coincidencia de email** (parte de la propuesta original) — descartada explícitamente por el usuario, incluso con ambos correos verificados. Reemplazada por rechazo genérico + flujo de vinculación explícito futuro.
- **Guard que acepta "cualquier sesión activa de la cuenta"** (parte de la propuesta original) — descartada explícitamente por el usuario. Reemplazada por validación de la sesión específica vía `sessionId` opaco.

## Consecuencias

- Cualquier endpoint de producto futuro que necesite autenticación usa `@UseGuards(AuthGuard)` y lee `request.accountId` — nunca confía en un `accountId` enviado por el cliente en el body/query.
- `Account.status === 'PENDING'` debe tratarse como "acceso limitado" en futuros endpoints de negocio (mecanismo de refuerzo, ej. un guard adicional `RequireActiveAccount`, queda para cuando exista al menos un endpoint real que lo necesite — no se construye especulativamente ahora).
- El job de limpieza a los 30 días (Privacy Foundation) debe reutilizar `IdentityProvider.deleteUser()`/`enableUser()` — no reinventar la integración con Firebase.
- Roles (cuando se construyan) deben decidirse siempre server-side, nunca confiando en un valor enviado por el cliente — principio ya fijado por el usuario, aplica a diseño futuro, no implementado todavía.

## Validación (gate completo, 19/19)

Ejecutado dos veces de forma independiente: contra Postgres de desarrollo persistente, y replicando el job de CI desde cero (Postgres efímero vacío, ambas migraciones, seed, build, arranque del backend compilado, gate de auth). Mismo resultado ambas veces.

- Creación de cuenta nueva con email verificado → `ACTIVE`; no verificado → `PENDING`.
- Mismo UID reutiliza la cuenta, no duplica.
- UID nuevo con email de otra cuenta → `409` genérico, sin fusionar, sin revelar existencia.
- `/auth/me` sin headers → `401`; con `sessionId` de otra cuenta → `401` (ownership); con `sessionId` inexistente → `401`; con sesión expirada (fixture directa en Postgres) → `401`.
- Logout revoca la sesión específica; incrementar `sessionVersion` invalida sesiones previas globalmente.
- Eliminación coordinada: `DELETION_PENDING`, todas las sesiones revocadas, todas las identidades deshabilitadas en el proveedor (verificado: ni siquiera puede crear sesión nueva después).
- Rate limiting: `429` tras exceder el límite de `/auth/session`.
- Ningún token/secreto aparece en los logs del servidor (verificado por grep sobre el log real).
- `pnpm -r run typecheck/lint`, build de los 4 paquetes, `expo export`, y CI (ambos jobs) en verde.

**Pendiente, no bloqueante para este ADR**: validación con un proyecto Firebase real (el usuario aún no ha provisto credenciales) — el diseño y el gate ya están completamente verificados con el stub; cuando exista el proyecto real, correr `AUTH_IDENTITY_PROVIDER=firebase` con un token genuino es un cambio de configuración, no de código.
