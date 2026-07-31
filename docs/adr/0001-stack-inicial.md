# ADR 0001 — Stack inicial de AXIOMA (Fase 0)

- **Estado**: Aprobada
- **Fecha**: 2026-07-29
- **Fase de aplicación**: Fase 0 — Foundation
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — transversal, difícil de revertir

## Contexto

El Master Context (Bloque 12.9) exige cerrar un conjunto de Decision Gates de fundación
(framework principal, arquitectura del repositorio, motor de BD, object storage,
representación de fórmulas matemáticas, estrategia de búsqueda, outbox transaccional,
clasificación de datos/cifrado, ambientes/CI/secretos) antes de comenzar la Fase 1 —
Fundaciones técnicas. Ninguno de estos gates estaba definido en la documentación
fuente (PRD, Data Model, App Map, User Flows), por lo que corresponde analizarlos y
decidirlos explícitamente (regla de las tres preguntas del usuario, 2026-07-29).

## Decisión

### Repositorio
- **Monorepo** con `pnpm` workspaces: `apps/mobile`, `apps/backend`, `packages/contracts`.
- Repositorio git **aislado dentro de `AXIOMA/app`**, independiente del repositorio git
  preexistente en el directorio de usuario (que no debe usarse para código de producto).

### Cliente móvil
- **React Native + Expo** (SDK 54 — ver adenda 2026-07-30 más abajo; originalmente SDK 57), managed workflow.
- **Expo Router** como sistema principal de rutas (usa React Navigation internamente).
- **expo-sqlite** + capa de repositorio propia para persistencia local/offline (no
  WatermelonDB por ahora — reevaluar si la complejidad de sincronización crece).
- Formato canónico de fórmulas matemáticas: **LaTeX**. El renderizador concreto
  (KaTeX vía WebView, librería nativa, o pre-renderizado a SVG en el servidor) queda
  **sujeto a un spike técnico** (ver "Próximos pasos").

### Backend
- **NestJS** sobre Node.js + TypeScript. El sistema de módulos de Nest mapea a los 12
  dominios canónicos del Master Context.
- **Regla estricta**: ningún módulo escribe directamente en las tablas internas de otro
  dominio — el acceso cruzado entre dominios ocurre solo a través de la capa de servicio
  pública de cada módulo.
- **PostgreSQL** como motor de base de datos y **autoridad de integridad**, incluso con
  ORM de por medio: las invariantes que Prisma no pueda representar adecuadamente se
  implementan mediante migraciones SQL personalizadas y revisadas manualmente.
- **Prisma ORM + Prisma Migrate** para acceso a datos y migraciones. La versión mayor de
  Prisma queda fijada desde el inicio (sin drift silencioso de versión mayor).
- **Object storage**: S3-compatible (inclinación hacia Cloudflare R2 por costo).
- **Búsqueda**: full-text search nativo de Postgres (sin motor de búsqueda dedicado en
  Fase 0-1 — evita sobre-ingeniería para un catálogo pequeño).
- **Outbox transaccional**: tabla `outbox_event` en Postgres + worker de procesamiento
  (sin infraestructura de colas de mensajes todavía).
- **Cifrado**: TLS obligatorio en tránsito; cifrado en reposo delegado al proveedor de
  Postgres administrado; sin cifrado por columna en Fase 0 salvo tokens/sesiones.

### Contratos compartidos
- **Zod**, en un paquete dedicado (`packages/contracts`) — nunca se exponen los modelos
  internos de base de datos directamente al cliente.

### CI/CD
- **GitHub Actions**, 3 ambientes (dev/staging/prod), secretos únicamente en el gestor
  de secretos de CI/cloud, nunca en el repositorio.

## Alternativas consideradas

- **Microservicios** en vez de monolito modular — descartado: exige coordinación e
  infraestructura que un equipo de 2 personas no puede sostener; el Master Context
  (11.10) ya pide monolito modular explícitamente.
- **WatermelonDB** para persistencia local — descartado por ahora: más potente para
  sincronización reactiva compleja, pero más pesado de mantener; se reevalúa si
  `expo-sqlite` no alcanza.
- **Elasticsearch/Algolia** para búsqueda — descartado para Fase 0-1: el catálogo M1 es
  demasiado pequeño para justificarlo (Principio de necesidad, Data Model 1.7).
- **React Navigation directo** (sin Expo Router) — descartado: Expo Router da
  file-based routing más simple para un equipo pequeño, usando React Navigation por
  debajo cuando se necesite acceso de bajo nivel.

## Consecuencias

- Todo módulo de NestJS debe declarar explícitamente su dominio propietario; cualquier
  necesidad de leer datos de otro dominio pasa por su servicio público, nunca por su
  repositorio Prisma directamente.
- Las migraciones deben revisarse siempre como diffs pequeños (11.18) — nunca edición
  manual de datos de producción.
- El renderizador matemático no está cerrado todavía: ninguna pantalla académica real
  debe depender de una elección de renderizador hasta que el spike (Fase 0, paso 2)
  concluya y se registre un ADR de seguimiento.

## Próximos pasos

1. Spike técnico del renderizador matemático en una pantalla de laboratorio aislada
   dentro de `apps/mobile` (criterios: accesibilidad, texto alternativo, escalado de
   fuente, modo oscuro, fórmulas inline y de bloque, sintaxis avanzada, nitidez,
   rendimiento en listas, funcionamiento offline, tamaño de bundle).
2. Registrar los resultados del spike y aprobar ADR 0002 con la solución elegida.
3. Continuar con el resto de la fundación técnica (Fase 0): autenticación, base de
   datos real vía Prisma, taxonomía académica inicial, gestión inicial de contenido,
   analítica esencial, logging/observabilidad, variables de entorno, Analytics
   Foundation y Privacy Foundation (ver Implementation Matrix v1.1).

## Validación

- `pnpm install`, `pnpm -r run typecheck`, `pnpm -r run lint`, y
  `pnpm --filter @axioma/backend run build` corren sin errores.
- Backend arrancado localmente responde `GET /health` con `200 OK`.
- `apps/mobile` empaqueta correctamente vía `expo export --platform android`
  (1226 módulos, sin errores) y resuelve `@axioma/contracts` como dependencia de
  workspace.

## Adenda 2026-07-30 — downgrade temporal a Expo SDK 54

**Contexto**: durante la validación en dispositivo físico del spike de renderizado
matemático (Fase 0, Paso 2), Expo Go (Play Store) rechazó el proyecto en SDK 57 con
"Project is incompatible with this version of Expo Go". Investigación: desde SDK 56,
Expo cambió su modelo de distribución de Expo Go debido a demoras de revisión en las
tiendas de apps — Expo Go para **SDK 54** es la versión que Expo garantiza mantener
disponible en Play Store; las builds de Expo Go para SDK 56/57 no tienen esa garantía
de disponibilidad inmediata en la tienda.

**Decisión**: bajar temporalmente `apps/mobile` a **Expo SDK 54** para poder completar
la validación en dispositivo real usando Expo Go sin fricción. La migración se hizo con
las herramientas oficiales de Expo (`npx expo install expo@^54.0.0` seguido de
`npx expo install --fix` para realinear todas las dependencias relacionadas —
`react-native` 0.81.5, `react` 19.1.0, `expo-router` 6.0.24, `react-native-svg`
15.12.1, `react-native-webview` 13.15.0, `expo-constants`/`expo-linking`/
`expo-status-bar`/`react-native-safe-area-context`/`react-native-screens` en sus
versiones correspondientes a SDK 54), no editando manualmente solo el número de
versión principal.

**Validación tras el downgrade**: `npx expo-doctor` → 18/18 checks pasan.
`pnpm -r run typecheck`, `pnpm -r run lint`, build de `contracts` y `backend`, y
`expo export --platform android` (mobile) corren todos sin errores. Backend
levantado localmente sigue respondiendo `GET /health` con `200 OK`.

**Esto es temporal, no una reversión de la decisión de stack**: SDK 54 se adopta
únicamente por compatibilidad práctica con Expo Go en Play Store durante esta etapa
de validación en dispositivo. La actualización a una SDK posterior (57 u otra más
nueva en su momento) se reevaluará cuando el proyecto migre de Expo Go a
**development builds** (`expo run:android` / EAS Build) — que es de todas formas la
ruta que Expo recomienda para un proyecto real, no solo para evitar este problema de
versión — o cuando termine la transición actual de Expo Go en las tiendas de apps.
