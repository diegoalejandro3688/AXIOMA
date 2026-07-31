# ADR 0003 — PostgreSQL y Prisma Foundation

- **Estado**: **Aprobada formalmente** — gate completo ejecutado y verificado contra PostgreSQL real (2026-07-31): `docker compose up`, `prisma migrate dev --name init`, seed con idempotencia confirmada, `/health/live` y `/health/ready`, y pipeline de CI replicado paso a paso contra una base efímera vacía. Ver "Validación".
- **Fecha**: 2026-07-31
- **Fase de aplicación**: Fase 0 — Foundation, Paso 3
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — transversal, difícil de revertir

## Contexto

ADR 0001 dejó fijado "PostgreSQL como motor de base de datos y autoridad de
integridad" y "Prisma ORM + Prisma Migrate, con la versión mayor fijada desde el
inicio", pero sin construir la tubería real. Este ADR cierra ese Decision Gate con
una base de persistencia mínima y verificable — explícitamente sin autenticación,
sin progreso/dominio, y sin la taxonomía PAES completa (solo el andamiaje mínimo).

## Decisión

### Versión de Prisma

**Prisma 7.9.1, fijado en versión exacta** (no rango) para `prisma`, `@prisma/client`
y `@prisma/adapter-pg` en `apps/backend/package.json`. Prisma 7 cambió su arquitectura
de forma importante respecto a versiones anteriores:

- El datasource `url` ya **no** se declara en `schema.prisma` — la URL de conexión
  vive en `prisma.config.ts` (para el CLI de Migrate) y se pasa explícitamente al
  constructor de `PrismaClient` vía un **driver adapter**.
- Los driver adapters son ahora obligatorios, no opcionales: usamos
  `@prisma/adapter-pg` (envuelve el driver `pg` estándar de Node.js para Postgres).
- El generador cambia de `prisma-client-js` a `provider = "prisma-client"`, con un
  `output` explícito — en nuestro caso `src/generated/prisma`, dentro de `src/` para
  no violar el `rootDir` de TypeScript del backend (si el output queda fuera de
  `src/`, `tsc` falla con `TS6059`; ya lo verificamos empíricamente).
- `prisma migrate dev` / `db push` ya no ejecutan `prisma generate` automáticamente
  — hay que correrlo explícitamente (scripts `prisma:generate` en `package.json`).

### Ambientes

- **Local**: PostgreSQL vía Docker Compose (`docker-compose.yml` en la raíz del
  monorepo) — imagen `postgres:17-alpine`, con `healthcheck` (`pg_isready`) y
  volumen nombrado (`axioma_postgres_data`) para no perder datos entre reinicios
  del contenedor.
- **Staging/producción**: su propia `DATABASE_URL`, inyectada por el gestor de
  secretos del entorno correspondiente — nunca en el repositorio. `.env.example`
  documenta el formato esperado; `.env` real queda ignorado por git.
- Se evaluó una instalación nativa de PostgreSQL en Windows como alternativa más
  simple (sin Docker/WSL2), pero el usuario prefirió mantener Docker Compose por
  paridad con el entorno de CI/producción — decisión explícita, no la default
  técnica más simple.

### Esquema inicial mínimo

Una sola entidad real de producto: **`CurriculumTopic`** (dominio EDUCATION) —
`id` (UUID), `code` (único), `name`, `order`, `parentId` (auto-referencia
opcional para el árbol de temas). Deliberadamente NO incluye preguntas, recursos,
evidencia, progreso, ni el catálogo PAES completo — es solo el andamiaje mínimo
del árbol de temas curriculares, suficiente para probar la tubería de principio a
fin.

### Patrón de acceso a datos (ajustado por el usuario, 2026-07-31)

`PrismaService` es **infraestructura compartida** (`@Global()` en Nest, un único
`PrismaClient` para todo el proceso), pero el acceso a los datos de cada dominio
ocurre a través de **repositorios propios por agregado o responsabilidad** — no
necesariamente un único repositorio por dominio completo. Para EDUCATION en este
paso, eso es `CurriculumTopicRepository`, dueño exclusivo de la tabla
`curriculum_topic`. Cuando EDUCATION crezca (preguntas, recursos, etc.), cada
agregado nuevo tendrá su propio repositorio, no uno monolítico por dominio.

Esto ajusta (no contradice) la regla de ADR-0001 ("ningún módulo escribe
directamente en las tablas internas de otro dominio") — la unidad de aislamiento
es el agregado, no el dominio completo.

### Health checks: `/health/live` y `/health/ready`

Reemplaza el `/health` único de ADR-0001/Fase 0 Paso 1. **Ninguno de los dos
escribe datos ni genera efectos secundarios**:

- **`GET /health/live`**: el proceso responde. Sin dependencias externas. Siempre
  `200` si Nest está corriendo — ni siquiera importa `PrismaService`.
- **`GET /health/ready`**: además confirma que puede atender tráfico real —
  ejecuta `SELECT 1` vía Prisma (`$queryRaw`, consulta de solo lectura, sin
  escritura). Devuelve `200` con `status: "ok"` si Postgres responde, `503` con
  `status: "unhealthy"` si no. Verificado empíricamente (ver "Validación"): con
  Postgres apagado, `/health/live` sigue en `200` y la app no se cae; `/health/ready`
  responde `503` correctamente.

### Seeds

Script idempotente (`prisma/seed.ts`, corrido vía `tsx`): usa `upsert` por `code`
(único) para la unidad ya aprobada de la Vertical M1 — "Porcentajes y
proporcionalidad" (eje Números) y sus 3 subtemas (cálculo de porcentaje, variación
porcentual, proporcionalidad directa e inversa). Correr el script N veces produce
el mismo estado final (4 filas), nunca duplica.

### CI

Nuevo job `db-migrations` en `.github/workflows/ci.yml`, independiente del job
`build`: levanta Postgres como servicio de GitHub Actions, corre
`prisma migrate deploy` contra una base vacía, corre el seed dos veces seguidas, y
falla el build si el conteo final de filas no es exactamente 4 (prueba real de
idempotencia, no solo "no lanzó excepción"). De paso se corrigió el trigger del
workflow, que apuntaba a una rama `main` inexistente en este repo (la rama real es
`master`).

## Alternativas consideradas

- **PostgreSQL nativo en Windows (sin Docker)** — más simple, sin necesitar
  WSL2/Docker Desktop. Se ofreció como opción; el usuario prefirió mantener Docker
  Compose por consistencia con CI/producción. Documentado por si se reconsidera.
- **Un único repositorio por dominio completo** (como se planteó originalmente en
  la propuesta de alcance) — descartado por el usuario: un repositorio por
  agregado escala mejor cuando un dominio crece a múltiples entidades no
  relacionadas entre sí (ej. EDUCATION eventualmente tendrá preguntas, recursos,
  exámenes, cada uno con su propio ciclo de vida).
- **`HealthCheckPing` como tabla de prueba dedicada** — descartado por el usuario:
  el health check no debe escribir. `SELECT 1` cumple el mismo propósito sin
  efectos secundarios.

## Consecuencias

- Cualquier entidad nueva de EDUCATION (preguntas, recursos, exámenes) necesita su
  propio repositorio, no debe añadirse como método suelto en
  `CurriculumTopicRepository`.
- El cliente de Prisma generado (`src/generated/prisma`) es un artefacto de build
  — está en `.gitignore`, se regenera con `pnpm run prisma:generate` (nunca se
  commitea).
- Toda migración futura sigue el patrón `prisma migrate dev --name <descripcion>`
  en local, commiteada como archivo versionado, y `prisma migrate deploy` en CI/
  producción — nunca edición manual de esquema en una base viva.

## Validación

**Verificado sin conexión a base de datos (no la requieren):**
- `npx prisma validate` → schema válido.
- `npx prisma generate` → cliente generado correctamente en `src/generated/prisma`.
- `pnpm -r run typecheck`, `pnpm -r run lint` → sin errores en los 4 paquetes.
- `pnpm --filter @axioma/backend run build` → sin errores.
- Backend arranca (`node dist/main.js`) sin Postgres corriendo, sin crashear.
- `GET /health/live` → `200` incluso sin Postgres disponible.
- `GET /health/ready` → `503` con `checks.database: "unhealthy"` cuando Postgres
  no responde — comportamiento correcto, verificado en este entorno (sandbox sin
  Docker instalado todavía).

**Verificado contra PostgreSQL real, 2026-07-31 (Docker Desktop/WSL2 ya operativos):**
- `docker compose up -d` → `axioma-postgres-dev` con healthcheck `healthy`.
- `prisma migrate dev --name init` generó y aplicó la migración real
  (`prisma/migrations/20260731194021_init/migration.sql`) — tablas y columnas en
  snake_case, FK auto-referencial `ON DELETE RESTRICT`, índice único en `code`,
  tal como se esperaba del schema.
- Seed corrido dos veces: ambas pasadas reportan 4 filas; confirmado también por
  consulta directa (`psql`) que la unidad y sus 3 subtemas quedaron correctamente
  enlazados por `parent_id`.
- `GET /health/live` → `200` y `GET /health/ready` → `200` con
  `checks.database: "ok"`, Postgres arriba.
- Pipeline de CI (`.github/workflows/ci.yml`) replicado paso a paso de forma local
  contra un contenedor Postgres **efímero y vacío** (sin remoto de GitHub
  configurado todavía para disparar Actions real): `pnpm install --frozen-lockfile`,
  build de `contracts`, typecheck, lint, build de `backend` (job `build`), y
  `prisma generate` → `migrate deploy` sobre base vacía → seed dos veces →
  verificación de conteo (job `db-migrations`) — ambos jobs en verde.
- Tras toda la validación, el backend real (`node dist/main.js`) sigue respondiendo
  correctamente contra el Postgres de desarrollo.

**Corrección encontrada durante esta validación**: el paso de verificación de
idempotencia en CI usaba `node -e` con `require()` directo sobre el cliente de
Prisma generado — pero el generador `prisma-client` de Prisma 7 emite archivos
`.ts` fuente (no `.js` compilado), así que `node` plano no puede cargarlo. Se
reemplazó por un script dedicado (`apps/backend/scripts/verify-curriculum-topic-count.ts`)
ejecutado vía `tsx` (igual que el seed), y se verificó que corrige el problema.
Este es exactamente el tipo de error que el gate completo contra infraestructura
real existe para atrapar antes de aprobar.

Todos los puntos del gate acordado quedaron en verde. ADR cerrado de forma
definitiva.
