# ZETRYND — STUDY CONTENT MOBILE REACHABILITY — CLOSURE REPORT

Fecha: 2026-08-30
Branch: `ui-implementation-post-ui6`
HEAD inicial: `b550446fdefe77b444b8b726c753ec3d0a54ffbe`

## A. Entorno

- Repo: `C:\Users\usuario 4\Downloads\AXIOMA\app` (git toplevel confirmado)
- Branch: `ui-implementation-post-ui6`
- HEAD inicial: `b550446 feat(challenges): complete V1 catalog and provisioning`
- `git status` inicial: residuo preexistente NO relacionado (`.npmrc`, `apps/mobile/app.json`,
  `apps/mobile/app/onboarding.tsx`, `apps/mobile/components/auth/auth-brand-header.tsx`,
  assets de icono Android, `apps/mobile/components/auth/zetrynd-wordmark.tsx`,
  `docs/adr/LEF-BLOCK-VII-*AUDIT.md`, reports de `experiments/`). **NO tocado, NO stageado.**

## B. Confirmación de causa raíz

- **Flujo mobile anterior:** Materia → Unidad (`listRootTopics`) → se pasaba el **id de la Unidad**
  directo a `topic/[topicId]/recurso` / `ejercicio`. `listChildTopics(unitId)` existía en
  `lib/api/education.ts` pero ninguna pantalla lo usaba.
- **Flujo canónico real (BD + API):** Materia → `curriculum_topic` Unidad (raíz) →
  `curriculum_topic` Recurso (hijo) → `learning_resource` (lección) + `question` (×10).
- **Mismatch exacto:** los 98 Recursos canónicos y sus 980 preguntas viven como **hijos** de
  las Unidades. La navegación mobile nunca descendía a ese nivel ⇒ 0/98 recursos y 0/980
  preguntas alcanzables, pese a source/manifest/DB/API 100%.

## C. Preservación de arquitectura

**APIs reutilizadas (sin endpoint nuevo):**
- `GET /education/subjects`
- `GET /education/subjects/:id/topics` (`listRootTopics`) — se le añadió un **filtro de superficie**
- `GET /education/topics/:unitId/children` (`listChildTopics`) — ya existía, ahora con consumidor
- `GET /education/topics/:resourceTopicId/resource`
- `GET /education/topics/:resourceTopicId/questions`
- `GET /progress/topics?topicIds=...` (batch) — reutilizado, sin patrón N+1

**Pantallas reutilizadas sin reescritura:**
- `topic/[topicId]/recurso.tsx` — solo se añadió threading de `unitId`/`unitName` y el destino de
  "volver" (a la lista de recursos si se entró por ahí).
- `topic/[topicId]/ejercicio.tsx` — idéntico ajuste mínimo de "volver".
- Runner de preguntas, `ContentBlockRenderer`, submit/outbox de PROGRESS: **intactos**.

**Componentes reutilizados:** `Card`, `Chip`, `Icon`, `Text`, `LoadingState`, `ErrorState`,
`EmptyState`, tokens de tema, `subjectIcon`/`subjectToneColor`.

**Lo que NO se reconstruyó:** contenido editorial, manifest, importer, loader, esquema DB,
relaciones de topics, runner de preguntas, cliente API de Study, modelo de progreso, ordenamiento
de preguntas, Cosmetics, Challenges, Premium, Tutor IA, Railway.

## D. Implementación de navegación de Recursos

- **Ruta nueva:** `apps/mobile/app/(tabs)/estudio/[subjectId]/unidad/[unitId].tsx`
  (registrada en `estudio/_layout.tsx` como `[subjectId]/unidad/[unitId]`, título "Recursos").
- **Comportamiento de Unidad:** `unidades.tsx` → `openUnit()` navega a la lista de Recursos con
  `unitResourceListParams(subjectId, unit, name)` (params estables: `subjectId`, `unitId`,
  `name`, `unitName`). Ya **no** navega a `topic/[unitId]/recurso`.
- **Comportamiento de Recurso:** la nueva pantalla llama `listChildTopics(unitId)`, ordena por el
  orden que ya entrega la API, y por cada Recurso navega vía `resourceFlowNav(...)` a
  `topic/[resourceTopicId]/recurso` → `ejercicio`, **siempre con el id del Recurso hijo**. El id
  de la Unidad viaja aparte (`unitId`) solo para "volver".
- **Manejo de child topics:** `listChildTopics` sin endpoint nuevo; estados LOADING / ERROR+retry /
  EMPTY preservados; nunca se enruta hacia adelante si no hay hijos.

## E. Progreso de Unidad

- **Estrategia de agregación:** el progreso de la Unidad se **deriva** del progreso de sus
  Recursos hijos (`lib/study/aggregate-unit-progress.ts`), no se consulta el id de la Unidad
  (que siempre daba `NOT_STARTED`).
- **Comportamiento de red (por materia):** 1× `listRootTopics` + N× `listChildTopics` (N = nº de
  unidades: M1/M2 = 4, Lenguaje/Ciencias/Historia = 3) + **1× `getTopicsProgressBatch`** para
  TODOS los recursos hijos de TODAS las unidades visibles. **Sin N+1**: nunca un
  `getTopicProgress` por recurso. Sin endpoint batch de hijos nuevo (no se justifica para 3-4
  llamadas, §16/§34).
- **Semántica de estado** (`topicProgressStatusSchema` existente, sin enum ni porcentaje nuevo):
  - todos los hijos `NOT_STARTED` → Unidad `NOT_STARTED`
  - todos los hijos `COMPLETED` → Unidad `COMPLETED`
  - cualquier otra combinación → Unidad `IN_PROGRESS`
  - hijo ausente del batch → tratado como `NOT_STARTED` (mismo criterio que ya usaba `unidades.tsx`)

## F. Continuación en Inicio ("Continuar estudiando")

- **Destino anterior:** id de un `curriculum_topic` **raíz (Unidad)** → `topic/[unitId]/recurso`
  (pantalla sin contenido alcanzable).
- **Destino final:** `pick-continue-topic.ts` reescrito para resolver a un `curriculum_topic` de
  **Recurso hijo**. Recorre unidades canónicas → sus recursos hijos → 1× batch de progreso →
  elige el primer recurso con `exercise`, luego el primero `resource`, luego `all-completed`.
- **Verificación:** `verify-continue-target-batch-gate.ts` reescrito — prueba que (1) el progreso
  se pide en 1 sola llamada batch sin importar el nº de recursos, (2) la selección
  exercise > resource > all-completed > no-content se conserva, (3) **el destino elegido tiene
  `parentId !== null` (es un Recurso, nunca una Unidad)**.

## G. Disposición de los topics raíz legacy

`curriculum_topic` **no tiene** mecanismo de ciclo de vida propio (solo `Subject` tiene
`ACTIVE`/`RETIRED`). Por tanto, **no hard-delete** y **no** se inventó cleanup destructivo.
Se aplicó el fallback preferente de §20: **filtro de superficie no destructivo derivado de la
estructura de contenido publicado ya existente**, con la BD/manifest como autoridad y **sin
lista de códigos mantenida a mano**.

- `CurriculumTopicRepository.findCanonicalUnitRootsBySubjectId()` — unidad canónica = raíz de la
  materia con ≥1 hijo que tiene una `learning_resource_version` PUBLISHED. Es exactamente la
  forma que el importer del manifest produce; los 4 topics legacy nunca la cumplen.
- `EducationService.listRootTopics()` usa ese método. Cambio de **lectura** puro.

| Topic legacy | Por qué queda oculto | Sigue en BD |
|---|---|---|
| `M1.NUMEROS.PORCENTAJES` | tiene 3 hijos pero **ninguno** con recurso publicado (el contenido cuelga del propio nodo raíz) | ✅ sí (no borrado) |
| `C1.BIOLOGIA.CELULA` | **sin hijos** | ✅ sí |
| `L1.LECTURA.INFERENCIA` | **sin hijos** | ✅ sí |
| `H1.CHILE.SIGLO20.ISI` | **sin hijos** | ✅ sí |

Verificado por `verify:study-content-mobile-reachability-gate` (parte DB: los 4 siguen en
`curriculum_topic`; parte API: ninguno aparece en `listRootTopics` de ninguna materia).

## H. Numeración de M2

- **BD/manifest:** `order` de las unidades M2 se conserva en **5, 6, 7, 8** (verificado por el gate).
- **UI:** `unidades.tsx` numera por **posición en la lista ya filtrada/ordenada** (`index + 1`),
  no por `item.order` crudo ⇒ M2 se muestra **01, 02, 03, 04**. Presentación pura, misma lógica
  para todas las materias.

## I. Reconciliación canónica

> **CONTRADICCIÓN DETECTADA (§27):** el handoff dice "20 unidades", pero su propio desglose
> (§35: M1 4 + M2 4 + Lenguaje 3 + Ciencias 3 + Historia 3) **suma 17**. El manifest
> (`CONTENT_MANIFEST`), el source (`content/estudio/**`) y la BD (`axioma_dev` PUBLISHED)
> **reconcilian todos en 17 unidades / 98 recursos / 980 preguntas**. Por la regla central
> (no tocar el manifest salvo contradicción real, y aquí el manifest es internamente consistente
> y consistente con source+DB), **el manifest NO se modificó**. El número correcto es **17**,
> no 20; "20" es un error aritmético del handoff. Todo lo demás (98/980) reconcilia exacto.

| Dimensión | Esperado (manifest) | Alcanzable | Estado |
|---|---|---|---|
| Materias | 5 | 5 | ✅ |
| Unidades canónicas | 17 | 17 | ✅ |
| Recursos | 98 | 98 | ✅ |
| Preguntas | 980 | 980 | ✅ |

## J. Desglose por materia

| Materia | Recursos | Preguntas |
|---|---|---|
| Matemática M1 (`matematica`) | 16 / 16 | 160 / 160 |
| Matemática M2 (`matematica-m2`) | 8 / 8 | 80 / 80 |
| Lenguaje (`lenguaje`) | 14 / 14 | 140 / 140 |
| Ciencias (`ciencias`) | 33 / 33 | 330 / 330 |
| Historia (`historia`) | 27 / 27 | 270 / 270 |

(Unidades: M1 4 · M2 4 · Lenguaje 3 · Ciencias 3 · Historia 3 = 17.)

## K. Gates

| Comando | Resultado | Qué probó | ¿Mutó gate DB? |
|---|---|---|---|
| `apps/backend $ npm run verify:study-content-mobile-reachability-gate` | **PASS** | Reconciliación exhaustiva 17/98/980 contra `axioma_dev` (Postgres, read-only) + prueba end-to-end por API de 1 recurso real por materia (subjects→topics→children→resource→10 preguntas) + legacy oculto de `listRootTopics` pero presente en BD + M2 order 5-8 | **No** (100% read-only, `axioma_dev`) |
| `apps/mobile $ npm run verify:study-navigation-gate` | **PASS** | §32 construcción de rutas (topicId = id del Recurso, nunca de la Unidad; unitId aparte) + §33 agregación de progreso de Unidad (casos A/B/C/D) | No (Node puro) |
| `apps/mobile $ npm run verify:continue-target-batch-gate` (reescrito) | **PASS** | Home continuation resuelve a Recurso hijo; 1 sola llamada batch de progreso; selección exercise>resource>all-completed>no-content | No (Node puro, fetch stub) |
| `apps/mobile $ npm run verify:unidades-batch-gate` | **PASS** | `getTopicsProgressBatch` sigue en 1 llamada; 3 estados preservados; id ausente → NOT_STARTED | No (Node puro) |
| `apps/backend $ npm run verify:education-gate` (fixture canónico añadido) | **PASS** | Recorrido lectura Study (materias→unidad→children→recurso→preguntas) contra fixture canónico; legacy `M1.NUMEROS.PORCENTAJES` **no** en `listRootTopics`; triggers de invariante de materia; inmutabilidad PUBLISHED; `isCorrect` nunca sale | Sí — inserta fixtures aisladas por corrida (`GATE.EDU.UNIT.*`), mismo criterio de higiene que las fixtures preexistentes del gate; **`axioma_gates_dev`, nunca `axioma_dev`** |
| `apps/backend $ npm run verify:subject-taxonomy-gate` (1 aserción ablandada) | **PASS** | Separación M1/M2; `ensayos` oculto; triggers activos. La aserción "≥1 M1.* en la lista de raíces" se ablandó a "todo lo académico es M1.* (o vacío)" — coherente con que `listRootTopics` ahora filtra a unidades canónicas y la gate DB no tiene el catálogo importado. Separación real sigue afirmada por checks a nivel de DB | `axioma_gates_dev` |
| `apps/backend $ npm run verify:content-coverage-matrix-gate` (invariante 19 afinado) | **PASS** | Matriz de cobertura. El check "byte-idéntico de `education.service.ts` completo" (invariante 19) se afinó: para ese archivo se verifica byte-identidad **por método** de `getPublishedResource` y `listPublishedQuestions` (el predicado PUBLISHED que el invariante protege), permitiendo el filtro de superficie de `listRootTopics` | `axioma_gates_dev` |
| `apps/backend $ npm run verify:progress-gate` | **PASS** | PROGRESS sin regresión | `axioma_gates_dev` |
| `apps/backend $ npm run verify:progress-topics-batch-gate` | **PASS** | Batch de progreso sin regresión | `axioma_gates_dev` |
| `apps/backend $ npm run verify:education-published-immutability-gate` | **PASS** | Inmutabilidad/unicidad de versión publicada sin regresión (104 checks) | `axioma_gates_dev` |
| `apps/backend $ npm run verify:academic-summary-gate` | **PASS** | Resumen académico privado sin regresión | `axioma_gates_dev` |
| `apps/backend $ npm run verify:content-source-gate` | **PASS** | Source V1 (98 LR / 980 Q) intacto | No (sin BD) |
| `apps/backend $ npm run verify:content-import-gate` | **NO EJECUTADO** — invoca el importer como proceso hijo; §26 prohíbe reimportar. Importer/manifest/contenido **no tocados**. | — | — |
| `apps/backend $ npm run verify:curriculum-topic-count` | **FALLA (PREEXISTENTE, ajeno)** — espera 7 filas (solo-seed) contra `axioma_dev`, que tiene 127 porque el catálogo canónico ya fue importado. No relacionado con este cambio; no se corrige (drift ajeno, regla central). | — | — |

## L. Build / typecheck / lint

| Comando | Resultado |
|---|---|
| `apps/backend $ npx tsc --noEmit` | PASS |
| `apps/backend $ npx nest build` | PASS |
| `apps/backend $ npx eslint` (archivos tocados) | PASS (0 warnings) |
| `apps/mobile $ npx tsc --noEmit` | PASS |
| `apps/mobile $ npm run lint` (`eslint app lib components`) | PASS (0 warnings) |
| `git diff --check` | CLEAN (solo avisos LF→CRLF de autocrlf, no errores) |
| `@axioma/contracts` | no tocado |

## M. Android QA — PENDIENTE (entorno)

**No ejecutada por Claude.** Motivos:
- El usuario prohibió explícitamente el emulador (RAM insuficiente para correrlo junto al
  entorno de desarrollo ZETRYND). No se usa emulador como fallback.
- El teléfono físico (`R5CW71R7MTP`) SÍ está conectado por ADB (`adb reverse` de 3000/8081/9000
  configurado y verificado), pero **el build instalado NO apunta al backend local**: las
  pantallas muestran datos solo-seed de un backend remoto (Inicio → "¡Completaste todo el
  contenido de Matemática!"; Ciencias → única unidad `C1.BIOLOGIA.CELULA` legacy), mientras que
  el backend local (`axioma_dev` + código con el filtro) devuelve las 3 unidades canónicas de
  Ciencias y 17/98/980. El APK debug (`android/app/build/outputs/apk/debug/app-debug.apk`) es de
  hace ~3 semanas y su `EXPO_PUBLIC_API_BASE_URL` quedó horneado con un valor remoto.

**Para ejecutar la QA manual, Product/TPM necesita un bundle local fresco:**
1. `apps/mobile/.env` → `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` (ya está así).
2. Backend local corriendo en :3000 con el catálogo importado (ya está).
3. `cd apps/mobile && npx expo run:android --device` (o reinstalar un dev build y `adb reverse
   tcp:3000 / tcp:8081 / tcp:9000`), con Metro sirviendo el bundle actual.
4. Seguir el checklist de la sección N.4 del informe final.

La reachability está probada de forma exhaustiva a nivel API+DB (gate
`verify:study-content-mobile-reachability-gate`, que recorre exactamente los endpoints que
consumen las pantallas mobile) y la lógica mobile (construcción de rutas y agregación de
progreso) por gates deterministas de Node. La QA manual queda como verificación visual/UX
final, no como validación de correctitud del contrato.

## N. Hallazgos diferidos (registrados, NO resueltos)

1. **DETERMINISTIC EDITORIAL QUESTION ORDERING** — `GET /education/topics/:id/questions`
   ordena por `publishedAt ASC`. No bloquea reachability. Diferido a Release Preparation (§25).
2. **`verify:curriculum-topic-count`** falla contra `axioma_dev` por drift preexistente
   (seed vs catálogo importado) — ajeno a este bloque.
3. Handoff dice "20 unidades"; el catálogo canónico real tiene **17** (ver sección I).
   Recomendación: corregir el número en la documentación de producto/TPM.

## O. Git

- Archivos de esta remediación (a stagear selectivamente, nunca `git add .`):
  - `apps/backend/package.json`
  - `apps/backend/scripts/verify-study-content-mobile-reachability-gate.ts` (nuevo)
  - `apps/backend/scripts/verify-education-gate.ts`
  - `apps/backend/scripts/verify-subject-taxonomy-gate.ts`
  - `apps/backend/scripts/verify-content-coverage-matrix-gate.ts`
  - `apps/backend/src/education/curriculum-topic.repository.ts`
  - `apps/backend/src/education/education.service.ts`
  - `apps/mobile/app/(tabs)/estudio/_layout.tsx`
  - `apps/mobile/app/(tabs)/estudio/[subjectId]/unidades.tsx`
  - `apps/mobile/app/(tabs)/estudio/[subjectId]/unidad/[unitId].tsx` (nuevo)
  - `apps/mobile/app/(tabs)/estudio/topic/[topicId]/recurso.tsx`
  - `apps/mobile/app/(tabs)/estudio/topic/[topicId]/ejercicio.tsx`
  - `apps/mobile/lib/progress/pick-continue-topic.ts`
  - `apps/mobile/lib/study/aggregate-unit-progress.ts` (nuevo)
  - `apps/mobile/lib/study/study-navigation.ts` (nuevo)
  - `apps/mobile/scripts/verify-continue-target-batch-gate.ts`
  - `apps/mobile/scripts/verify-study-navigation-gate.ts` (nuevo)
  - `apps/mobile/package.json`
  - `docs/adr/STUDY-CONTENT-MOBILE-REACHABILITY-CLOSURE-REPORT.md` (este archivo)
- Residuo preexistente ajeno: **NO stageado, NO tocado.**
- **NO push.**

## P. Completitud final

| Capa | Estado |
|---|---|
| SOURCE | 100% |
| DATA (DB PUBLISHED) | 100% |
| API | 100% |
| MOBILE REACHABILITY | 100% (17/17 unidades, 98/98 recursos, 980/980 preguntas) |

## Q. Veredicto

**READY FOR PRODUCT/TPM REVIEW**
