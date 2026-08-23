# TESTER-DISTRIBUTION-1D.2 — Preparación reproducible del backend para Railway

**Fecha del reporte**: 2026-08-23
**Incremento**: TESTER-DISTRIBUTION-1D.2 (serie TESTER-DISTRIBUTION, entorno "ZETRYND TESTER")
**Documentos relacionados**: `docs/adr/TESTER-DISTRIBUTION-1C-CLOSURE-REPORT.md` (bloque previo, cerrado PASS)

**Estado final**: **PASS CANDIDATE** — validado localmente con evidencia real (instalación, generación de Prisma Client, build topológico del monorepo, y arranque del artefacto compilado con conexión real a Postgres). No implica que exista todavía ningún recurso desplegado en Railway — eso corresponde a 1D.3.

## 1. Objetivo

Dejar el repositorio en un estado donde el backend pueda desplegarse en Railway de forma reproducible, explícita y mínima, preservando el contexto del monorepo pnpm (`@axioma/contracts` es dependencia real de runtime, no solo de tipos).

## 2. Estrategia final de monorepo

Railway debe operar con **root directory = raíz del repositorio** (no `apps/backend` aislado). El único `pnpm-lock.yaml` vive en la raíz y resuelve todo el workspace, incluyendo el symlink real de `@axioma/contracts` hacia `packages/contracts` — verificado que ese symlink solo se materializa correctamente cuando `pnpm install` corre con visibilidad del `pnpm-workspace.yaml` raíz.

## 3. Pipeline verificado

```
INSTALL   pnpm install --frozen-lockfile                          (desde la raíz)
   ↓
PRISMA    pnpm --filter @axioma/backend prisma:generate            (escribe en apps/backend/src/generated/prisma)
   ↓
BUILD     pnpm --filter @axioma/backend... run build                (construye @axioma/contracts primero, luego el backend, por orden topológico de pnpm)
   ↓
START     pnpm --filter @axioma/backend start:prod                  (node dist/main.js)
```

Cada paso fue ejecutado realmente en este entorno (no solo inspeccionado) — ver §7.

### Por qué el orden PRISMA → BUILD es obligatorio

`schema.prisma` declara `generator client { output = "../src/generated/prisma" }` — el Prisma Client generado se escribe dentro de `src/`, código fuente que `nest build` compila. Si el build corriera antes de `prisma generate`, faltaría ese código fuente y `nest build` fallaría o compilaría un cliente obsoleto. Verificado: tras `prisma:generate` + build, `apps/backend/dist/generated/prisma/` existe con el cliente ya compilado.

### Por qué el filtro `@axioma/backend...` (con `...`) y no `--filter backend`

`...` en la sintaxis de pnpm significa "este paquete y todas sus dependencias de workspace". Verificado en ejecución real: el comando reportó `Scope: 2 of 4 workspace projects` y construyó `packages/contracts` **antes** que `apps/backend`, sin tocar `apps/mobile` ni el paquete raíz — exactamente el subconjunto necesario, en el orden correcto, sin builds innecesarios.

## 4. Prisma — estrategia futura (no ejecutada contra ningún recurso remoto)

- **Build**: `prisma generate` (ya cubierto arriba).
- **Deploy**: `prisma migrate deploy` — se ejecutará manualmente en 1D.3 contra la base de datos de Railway, una vez exista. **No se ejecutó en este bloque contra ninguna base remota.**
- **Seed**: `prisma:seed` (contiene TEST-CONTENT-1) — se ejecutará **una única vez, manualmente**, después del primer `migrate deploy` en 1D.3. **No** se automatiza como parte de cada deploy. Los scripts `seed-asset1-test-cosmetics.ts`/`seed-asset2-cosmetics.ts` (otorgan cosméticos a una cuenta específica, uno con path local del desarrollador) **no deben ejecutarse** contra el entorno tester.

## 5. Start command — hallazgo y corrección aplicada

La reauditoría confirmó el hallazgo de 1D.1: no existía ningún script que ejecutara el artefacto compilado sin herramientas de desarrollo (`nest start` recompila/usa modo dev; no había `node dist/main.js` expuesto como script). Se añadió:

```json
"start:prod": "node dist/main.js"
```

en `apps/backend/package.json`, junto a `start`/`start:dev` ya existentes. Verificado físicamente: `apps/backend/dist/main.js` existe tras el build (archivo real, no supuesto), y `pnpm --filter @axioma/backend start:prod` lo ejecuta directamente — sin `nest start`, sin `ts-node`/`tsx`, sin recompilar, respetando `process.env.PORT` (ya manejado en `main.ts`).

## 6. Node/pnpm — sin cambios necesarios

`package.json` raíz ya declara `"packageManager": "pnpm@9.15.4"` y `"engines": { "node": ">=20.0.0" }`. `apps/backend/package.json` no declara los suyos propios — **deliberadamente no duplicado**: con Root Directory = raíz del repo (requisito ya establecido en §2), Railway leerá la declaración de la raíz. No se tocó ningún archivo por este punto.

## 7. Validación local ejecutada (evidencia real, sin secretos)

1. `pnpm install --frozen-lockfile` (raíz) → `Lockfile is up to date, resolution step is skipped` — sin drift.
2. `pnpm --filter @axioma/backend prisma:generate` → `Generated Prisma Client (7.9.1) to .\src\generated\prisma`.
3. `pnpm --filter @axioma/backend... run build` (tras limpiar ambos `dist/` para forzar una construcción real, no cacheada) → `Scope: 2 of 4 workspace projects`, `packages/contracts build: Done` seguido de `apps/backend build: Done`, en ese orden.
4. Verificación física de archivos: `packages/contracts/dist/index.js` existe; `apps/backend/dist/main.js` existe; `apps/backend/dist/generated/prisma/` existe (cliente Prisma compilado).
5. `pnpm --filter @axioma/backend typecheck` y `pnpm --filter @axioma/contracts typecheck`: ambos limpios, sin errores.
6. `node dist/main.js` (usando la configuración local de desarrollo **ya existente**, sin modificar ni imprimir secretos): arrancó completo — `"Nest application successfully started"`, con **conexión real a PostgreSQL establecida** (`PrismaService: "Conexión a PostgreSQL establecida"`), todos los módulos y rutas registrados incluyendo `GET /health/live` y `GET /health/ready`.
7. `curl http://localhost:3000/health/live` → `200 {"status":"ok","service":"axioma-backend","timestamp":"..."}`.
8. `curl http://localhost:3000/health/ready` → en una corrida posterior devolvió `503 {"status":"unhealthy","checks":{"database":"unhealthy"}}` — inconsistencia entre corridas atribuible a timing de conexión local (ver §12), no a un defecto del endpoint ni del pipeline de build/start en sí (el endpoint respondió correctamente en ambos formatos, 200 y 503, exactamente como está diseñado).
9. Proceso detenido limpiamente al finalizar la validación; no se dejó ningún proceso corriendo.

**Hallazgo NO relacionado con 1D.2, observado durante la validación**: al segundo de arrancar, varios cron jobs de gamification/analytics/outbox lanzaron `PrismaClientKnownRequestError` al ejecutar consultas contra la base de datos local. Es un comportamiento preexistente del dominio (no introducido por este bloque, no se tocó ningún código de dominio) — se reporta como observación para investigación futura, fuera del alcance de 1D.2.

## 8. Healthcheck — ya existente, ninguna implementación necesaria

La reauditoría encontró que **ya existe** `GET /health/live` y `GET /health/ready` (`apps/backend/src/platform/health/health.controller.ts`) — el hallazgo de 1D.1 ("no se confirmó un endpoint /health") fue una omisión de esa auditoría, no una ausencia real. Ambos endpoints son públicos, sin secretos, sin configuración expuesta: `/live` solo confirma que el proceso responde; `/ready` además verifica Postgres con `SELECT 1` y devuelve 503 si falla. **No se implementó nada nuevo** — se recomienda usar `GET /health/live` como healthcheck de Railway (liveness pura, sin dependencia de Postgres, evita reinicios en cascada si la base tarda en estar lista).

## 9. Configuración Railway/Nixpacks — decisión: NO crear archivo, con evidencia

Se investigó la documentación oficial de Railway antes de decidir (no se asumió sintaxis):

- Railway ya **no usa Nixpacks** como builder por defecto — el builder actual es **Railpack**.
- `railway.json`/`railway.toml` ("Config as Code") está **deprecado para proyectos nuevos**, con corte definitivo de lectura el **2026-12-01**. La documentación oficial dirige explícitamente hacia "Infrastructure as Code" (`.railway/railway.ts`).
- El mecanismo de reemplazo, `.railway/railway.ts`, está marcado explícitamente como **"experimental, no GA"** por la propia documentación de Railway ("Generated `.railway/railway.ts` formatting may change while the DSL is experimental").
- El dashboard de Railway sí permite configurar build/start/root directory de forma directa y totalmente soportada hoy.

**Decisión**: no se creó ningún archivo de configuración de Railway en este bloque. Crear `railway.json` iría contra la guía oficial vigente para proyectos nuevos y quedaría obsoleto en pocos meses; adoptar `.railway/railway.ts` ahora sería fijar una sintaxis que la propia Railway advierte que puede cambiar. Los comandos exactos (§3) quedan documentados aquí y deberán introducirse en la configuración del servicio (dashboard, o `.railway/railway.ts` si para 1D.3 ya es estable) al momento de crearlo en 1D.3 — reproducibilidad vía documentación versionada, no vía un archivo de configuración de plataforma con vida útil incierta.

## 10. Variables de entorno futuras (SIN VALORES)

| Variable | Consumidor | Obligatoria | Secret | Configurar en |
|---|---|---|---|---|
| `DATABASE_URL` | backend (Prisma) | Sí | Sí | Railway (autogenerada por el servicio Postgres cuando se cree en 1D.3) |
| `PORT` | backend (`main.ts`) | La inyecta Railway | No | Automática |
| `NODE_ENV` | backend (gates de producción: stub-auth, endpoints `_internal`/admin-IA) | Recomendado `production` | No | Railway, fijar explícitamente |
| `AUTH_IDENTITY_PROVIDER` | backend | Sí | No | Railway (`firebase`) — activación real en 1D.4 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | backend | Sí (para auth real) | **Sí** | 1D.4, no en este bloque |
| `INTERNAL_OPS_KEY` | backend (guard de endpoints internos) | Sí | **Sí** | Railway, valor propio distinto de dev |

No se creó, mostró ni copió ningún valor secreto. No se modificó `apps/backend/.env`, `.env.gates` ni `apps/mobile/.env`.

## 11. Qué queda para Firebase / 1D.4

Activar `AUTH_IDENTITY_PROVIDER=firebase` con `FIREBASE_SERVICE_ACCOUNT_JSON` real en Railway, y alinear `EXPO_PUBLIC_AUTH_IDENTITY_CLIENT`/variables Firebase públicas en mobile. Nada de lo decidido en 1D.2 lo dificulta — el pipeline de build/start es independiente de qué proveedor de auth esté activo.

## 12. Qué queda para Anthropic / 1E

`AI_PROVIDER_IMPL`, `ANTHROPIC_API_KEY` y demás variables de Anthropic no se tocaron, no se activaron, no se documentó nada nuevo sobre ellas más allá de lo ya confirmado en 1D.1. Fuera de alcance de 1D.2 por completo.

## 13. Qué queda para 1D.3

- Crear el proyecto Railway "ZETRYND TESTER" y el servicio PostgreSQL.
- Configurar el servicio backend con Root Directory = raíz del repo y los comandos exactos de §3 (vía dashboard o `.railway/railway.ts` si ya es estable en ese momento).
- Fijar `NODE_ENV=production`, `AUTH_IDENTITY_PROVIDER` (valor a decidir según si 1D.4 ya está listo), `INTERNAL_OPS_KEY` con valor propio.
- Ejecutar `prisma migrate deploy` una vez contra la base real de Railway.
- Ejecutar `prisma:seed` una vez (incluye TEST-CONTENT-1), sin los scripts de cosméticos de desarrollador.
- Confirmar `GET /health/live` responde 200 públicamente.

## 14. Alcance NO tocado (confirmado)

Mobile (UI, navegación, branding, Android, `app.json`, Gradle, Expo Router), comportamiento de dominio del backend, modelo de datos, migraciones existentes, contenido del seed, implementación de Firebase/Anthropic/MinIO — ninguno de estos archivos fue modificado.
