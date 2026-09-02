# ESTUDIO V1 — UNIDADES + RESOURCES — CLOSURE REPORT

## Estado

**APPROVED / CLOSED** — sub-bloque "Unidades + Recursos" de Estudio V1.

- **UNIDADES V1 — CLOSED**
- **RECURSOS V1 — CLOSED**
- **ESTUDIO V1 (general) — OPEN / IN PROGRESS**

Este documento cierra formalmente el trabajo visual y de arquitectura de
navegación de las pantallas de **Unidades** y **Recursos** de Estudio, tras QA
físico en Samsung aprobado por el usuario. No cierra Estudio V1 completo.

---

## A. Environment

| | |
|---|---|
| Repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| Branch | `ui-implementation-post-ui6` |
| HEAD al cierre | `062021d5f50bf801c4d3c2e32a688c61bd9aafad` `feat(study): add resources catalog mode` |
| Parent de HEAD | `0ae5ed40821632d5055ee6dd0751ef7e52af3684` `style(study): add unit identity to resource list` |
| Base del bloque | `77d8fc1819af3d34a68ed8b7e802d44c41973480` `style(home): add science continuation artwork` |
| Pila | pnpm monorepo · `apps/mobile` (Expo SDK ~54 / Expo Router / RN 0.81.5) · `apps/backend` (NestJS + Prisma) · `packages/contracts` (Zod) |
| No push · No tag · No Railway · No emulator · nunca `git add .` | |

Este cierre es **solo documentación**: no altera producto (ver §M).

---

## B. Scope closed — qué constituye "Unidades + Recursos" V1

### Cerrado

1. **Iconografía de Unidades** — cada una de las 17 unidades canónicas del
   catálogo V1 tiene un motivo SVG propio, resuelto por `CurriculumTopic.code`
   canónico, con `generic` solo como degradación segura para códigos
   futuros/desconocidos.
2. **Recursos dentro de una Unidad** (`unidad/[unitId].tsx`) — pase visual:
   header con la identidad de la unidad (`UnitMotif`) heredada por el `code`
   canónico de un Recurso ya cargado. El resto de la pantalla (cards,
   numeración, estados, navegación) quedó verificada como referencia y sin
   cambios.
3. **Modo Recursos independiente** (`Estudio → Materia → Recursos`) — la tile
   "Recursos" del selector de modalidad, antes deshabilitada, ahora abre una
   pantalla `SectionList` con el catálogo completo de la materia agrupado por
   unidad, cada sección con su `UnitMotif`, numeración `01/02/03…` que reinicia
   por unidad, y las mismas Resource cards.

### Fuera de alcance (permanecen OPEN)

- **Práctica libre** — tile `enabled: false`, sin ruta. Intacta.
- **Ensayos / rediseño de Ensayos** — sin cambios.
- **Preguntas / ejercicios** — sin cambios.
- **Visor de recurso** (`topic/[topicId]/recurso.tsx`) — sin cambios.
- **Contenido editorial interno / manifest / seed** — sin cambios.
- **Pantalla principal de Estudio / selector de materias** — sin cambios.

---

## C. Product lock — decisiones finales (frozen)

### C.1 Identidad de Unidad

- La identidad de una Unidad para efectos visuales es **`CurriculumTopic.code`**
  (ej. `M1.NUMEROS`, `CIENCIAS.BIOLOGIA`). **Nunca** `topic.name`, índice ni
  nombre de materia.
- El motivo se resuelve con `resolveUnitMotif(code)`:
  1. normaliza a mayúsculas;
  2. match **exacto** contra el mapa explícito `UNIT_CODE_MOTIF` (17 claves);
  3. si no hay match y el code tiene sub-segmentos, recorta el último segmento
     y reintenta (**herencia por prefijo canónico**: un Recurso
     `M1.NUMEROS.PORCENTAJES` hereda el motivo de su Unidad `M1.NUMEROS`);
  4. sin match a ningún nivel → `generic`.
- **No** hay matching por palabra suelta: `X.NUMEROS` (materia inventada) → `generic`.

### C.2 Los 17 motivos (frozen)

| # | unitCode | Nombre visible | Motif kind |
|---|---|---|---|
| 1 | `M1.NUMEROS` | Números | `percentage` |
| 2 | `M1.ALGEBRA_FUNCIONES` | Álgebra y funciones | `algebra` |
| 3 | `M1.GEOMETRIA` | Geometría | `geometry` |
| 4 | `M1.PROBABILIDAD_ESTADISTICA` | Probabilidad y estadística | `data` |
| 5 | `M2.NUMEROS` | Números | `realNumbers` |
| 6 | `M2.ALGEBRA_FUNCIONES` | Álgebra y funciones | `functionTransform` |
| 7 | `M2.GEOMETRIA` | Geometría | `vectorGeometry` |
| 8 | `M2.PROBABILIDAD_ESTADISTICA` | Probabilidad y estadística | `distribution` |
| 9 | `LENGUAJE.LOCALIZAR` | Localizar | `locate` |
| 10 | `LENGUAJE.INTERPRETAR` | Interpretar | `interpret` |
| 11 | `LENGUAJE.EVALUAR` | Evaluar | `evaluate` |
| 12 | `CIENCIAS.BIOLOGIA` | Biología | `cell` |
| 13 | `CIENCIAS.FISICA` | Física | `wave` |
| 14 | `CIENCIAS.QUIMICA` | Química | `molecule` |
| 15 | `HISTORIA.MUNDO_AMERICA_CHILE` | Historia: Mundo, América y Chile | `globe` |
| 16 | `HISTORIA.FORMACION_CIUDADANA` | Formación ciudadana | `citizenship` |
| 17 | `HISTORIA.SISTEMA_ECONOMICO` | Sistema económico | `exchange` |

- **M1** (`percentage`/`algebra`/`geometry`/`data`) — geometría SVG **byte-for-byte**
  la aprobada antes de este bloque; no se tocó.
- **M2** tiene 4 motivos propios (mismo color azul que M1; se diferencia por forma,
  no por color).
- Los 17 motivos son **únicos** y **ninguno** resuelve a `generic`.

### C.3 Lenguaje visual (frozen)

- SVG vectorial, `viewBox` 24×24, trazo fino (1.5–1.75), `fill="none"`,
  `stroke={color}` heredado por prop, caps/joins redondeados donde aplica.
- `generic` = círculo + línea horizontal (fallback).
- Tile de Unidad en lista: 44×44, `radii.medium`, `backgroundColor` = tono de materia.
- Tile de motivo en header (`unidad/[unitId]` y secciones del modo Recursos):
  36×36, `radii.small`, `UnitMotif size 22`.

### C.4 Color por materia (frozen — sin cambios en este bloque)

`subjectIcon(name).tone` → `subjectToneColor` / `subjectToneBackground`
(tokens semánticos existentes, light/dark ya definidos):

| Materia | tono | token |
|---|---|---|
| Matemática M1 / M2 | `accent` (azul) | `accent.strong` / `accent.subtleBg` |
| Lenguaje | `violet` | `academic.violet.text` / `.background` |
| Ciencias | `success` (verde) | `state.success.text` / `.background` |
| Historia | `warning` (ámbar) | `state.warning.text` / `.background` |

M1 y M2 comparten el azul **por diseño de este bloque** (la diferenciación
cromática M1/M2 quedó explícitamente fuera de alcance — ver §G).

### C.5 Numeración de Recursos (frozen)

- `String(index + 1).padStart(2, '0')` → `01`, `02`, `03`…
- **`index` es la posición dentro de la lista/sección**, no `item.order` crudo
  (así M2 se muestra `01–04` aunque su `order` canónico interno sea 5–8).
- En el modo Recursos independiente, `index` es el índice **dentro de la
  sección** de `SectionList` → cada unidad reinicia en `01`.

### C.6 Estados de progreso (frozen — lógica sin cambios, ADR-0014)

- `NOT_STARTED` → "Sin comenzar" / `Chip` variante `neutral`
- `IN_PROGRESS` → "En progreso" / `Chip` variante `accent` (`Chip` no tiene "info")
- `COMPLETED` → "Completado" / `Chip` variante `success`
- (Lista de Unidades: "Completada" fem., por agregación de unidad.)
- Sin porcentaje, sin barra de progreso, sin XP, sin checkbox.

### C.7 Modo Recursos independiente (frozen)

- **Route:** `/(tabs)/estudio/[subjectId]/recursos` (archivo plano, hermano de
  `unidades.tsx`).
- **Primitiva:** `SectionList` (`stickySectionHeadersEnabled={false}`). Nunca
  `FlatList` anidado ni `VirtualizedList` dentro de `ScrollView`.
- **Section model:** `{ unit: CurriculumTopicResponse; resources: CurriculumTopicResponse[] }`.
  Unidades **sin** recursos se **omiten**. Materia sin recursos → `EmptyState` global.
- **Section header:** tile 36×36 + `UnitMotif` por `unit.code` + nombre de unidad
  (`titleMedium`) + conteo `resourceCountLabel(n)` (`"1 recurso"` / `"N recursos"`).
- **Sin** icono individual por recurso, sin buscador, sin filtros, sin favoritos,
  sin sorting manual, sin tabs, sin carruseles, sin "recientes", sin CTA
  "Continuar".
- **Tile:** `enabled: true`, "Próximamente" removido **solo** de Recursos.
  Práctica libre sigue `enabled: false`. Ensayo sin cambios.

---

## D. Implementation history (Git — documentado, no reescrito)

| Increment | Hash | Mensaje | Contenido |
|---|---|---|---|
| **A0** | `faf59f30f7337615e0d7837d5b2ddc44109f92a5` | `refactor(study): centralize unit motif mapping` | Extrae `UnitMotif` / mapa / `resolveUnitMotif` de `unidades.tsx` a `lib/academic/unit-motif-map.ts` (puro) + `unit-motif.tsx` (SVG). Nuevo gate `verify:unit-motif-gate`. **ZERO visual change.** |
| **A1** | `e75bc0297d26c547b2eb220c108dab003ca44d1f` | `style(study): add unit-specific motifs` | Mapa explícito `UNIT_CODE_MOTIF` (17 claves) + herencia por prefijo. 13 SVG nuevos (M2×4, Lenguaje×3, Ciencias×3, Historia×3). M1 byte-for-byte. Gate reescrito para el contrato A1. |
| **B** | `0ae5ed40821632d5055ee6dd0751ef7e52af3684` | `style(study): add unit identity to resource list` | Header de `unidad/[unitId].tsx` con `UnitMotif` heredado por `resolveUnitMotif(resources[0].code)`. Cero requests nuevas. Cards/numeración/estados sin cambios. |
| **R** | `062021d5f50bf801c4d3c2e32a688c61bd9aafad` | `feat(study): add resources catalog mode` | Nueva pantalla `recursos.tsx` (`SectionList`) + `lib/study/resource-catalog.ts` (`assembleResourceCatalog`, puro) + `verify:recursos-catalog-gate`. Tile habilitada + ruta registrada. Resource card copiada de B (no extraída). |

Cadena verificada: `77d8fc1` → `faf59f3` (A0) → `e75bc02` (A1) → `0ae5ed4` (B) → `062021d` (R).

---

## E. Contracts / data model

**Sin cambios.** Ni Prisma, ni `packages/contracts`, ni ningún endpoint nuevo.

- `CurriculumTopicResponse = { id, code, name, order, parentId, subjectId }` — ya existente; se usa `.code`.
- `TopicProgressResponse` — ya existente.
- `MAX_TOPIC_PROGRESS_BATCH_IDS = 300` (`packages/contracts/src/progress.ts`) — sin tocar.

### Arquitectura de carga del modo Recursos (`assembleResourceCatalog`)

```
1 × GET /education/subjects/:subjectId/topics        (listRootTopics)
N × GET /education/topics/:unitId/children           (listChildTopics, N = unidades)
1 × GET /progress/topics?topicIds=<csv>              (getTopicsProgressBatch, omitida si 0 recursos)
```

- Total: **1 + N + 1**. Coste por materia actual: M1/M2 = 6 · Lenguaje/Ciencias/Historia = 5.
- **No** hay N+1 de progreso (nunca `GET /progress/topics/:id` singular). Verificado por gate.
- Progress batch: máx. ~33 ids (Ciencias) ≪ 300.
- Orden de unidades y de recursos = el del backend (`orderBy: { order: 'asc' }`). No se reordena en cliente.
- Recurso ausente del batch → sin entrada en el mapa → call-site usa `?? 'NOT_STARTED'`.
- Fallo de `listRootTopics` / de **cualquier** `listChildTopics` / del batch → `{ ok: false }` → `ErrorState` de pantalla completa (sin resiliencia por sección — consistencia con `unidades.tsx`).

### Navegación al recurso (idéntica en `unidad/[unitId]` y `recursos`)

```
entry = progress ? resolveContinuationEntry(progress) : 'resource'
  COMPLETED           → 'completed'
  responses.length==0 → 'resource'
  else                → 'exercise'
{ screen, params } = resourceFlowNav(subjectId, resource, entry, name, { id: unit.id, name: unit.name })
  entry === 'resource' → screen 'recurso'   ; else → screen 'ejercicio'
router.push({ pathname: '…/topic/[topicId]/(recurso|ejercicio)', params })
```

**Invariante conservada:** `params.topicId === resource.id` (nunca el id de la Unidad) — cubierta por `verify:study-navigation-gate`.

---

## F. Gate evidence (auditoría final del cierre)

Ejecutados desde `apps/mobile`, HEAD `062021d`:

| Gate | Resultado |
|---|---|
| `pnpm --filter @axioma/mobile exec tsc --noEmit` | ✅ limpio |
| `pnpm --filter @axioma/mobile lint` | ✅ limpio |
| `verify:unit-motif-gate` | ✅ pasaron (contrato A1: 17 codes exactos, ninguno `generic`, M1 congelado, M2≠M1, per-materia distintos, 17 únicos, unknown→generic, case-insensitive, herencia por prefijo, sin matching ambiguo) |
| `verify:recursos-catalog-gate` | ✅ pasaron (patrón `1+N+1` sin `/progress/topics/:id` singular, ids en un batch, agrupación, numeración por sección, progreso presente/ausente→NOT_STARTED, materia sin recursos→0 secciones, fallos propagados, singular/plural) |
| `verify:study-navigation-gate` | ✅ pasaron (invariante `topicId = resource.id`, agregación de progreso de unidad) |
| `verify:unidades-batch-gate` | ✅ pasaron (batch de progreso de Unidades, sin N+1) |
| `verify:continue-target-batch-gate` | ✅ pasaron (continuación multi-materia — comparte helpers de Estudio) |
| `git diff --check` | ✅ limpio |

No existe gate-orquestador de cierre en el repo (mismo criterio que
`COMPETIR-V1-CLOSURE-REPORT.md` §K); no se crea uno aquí. Los dos gates nuevos de
este bloque (`verify:unit-motif-gate`, `verify:recursos-catalog-gate`) cubren los
contratos productivos introducidos.

---

## G. Riesgos / deuda técnica NO bloqueante (documentada, no corregida aquí)

| # | Deuda | Nota |
|---|---|---|
| G.1 | **`subjectIcon(name)` resuelve por nombre visible de materia** | Deuda pre-existente compartida por toda la superficie de Estudio. Mitigada por casos explícitos + `default` seguro (azul). Migrar a `subjectKey` es un cambio transversal fuera del alcance de este bloque. |
| G.2 | **Duplicación pequeña del "Resource row" + helpers de estado** | La Card `[indexTile][body][chevron]` y `topicStatusLabel`/`statusChipVariant` ("Completado") existen en `unidad/[unitId].tsx` **y** en `recursos.tsx`. Se aceptó deliberadamente para no reabrir `unidad/[unitId].tsx` (ya con QA físico). Consolidación futura: extraer `components/study/StudyResourceRow` + `lib/study/topic-status.ts` cuando convenga tocar ambas. |
| G.3 | **M1 y M2 comparten el color azul** | Decisión de diseño de este bloque: la diferenciación M1/M2 es **por motivo**, no por color. Una diferenciación cromática es un incremento opcional futuro (A2), no un defecto. |
| G.4 | **`.expo/types/router.d.ts` (gitignored) puede quedar obsoleto** | Lo genera Metro; una ruta nueva requiere regenerarlo (`CI=1 npx expo start` breve) antes de que `tsc` la valide. No afecta al producto ni al repo. Se hizo durante R. |

Ninguna de estas es un blocker.

---

## H. QA físico

**Samsung físico (device R5CW71R7MTP) — APPROVED** por el usuario.

- **Unidades:** los 17 motivos correctos a tamaño real (M1×4, M2×4, Lenguaje×3,
  Ciencias×3, Historia×3); colores correctos por materia; navegación y progreso
  correctos. → **UNIDADES V1 — APPROVED.**
- **Recursos dentro de Unidad:** header de unidad con motivo correcto; resource
  cards correctas; numeración `01/02/03`; título/estado/chevron correctos;
  navegación correcta. → **INCREMENTO B — APPROVED.**
- **Modo Recursos independiente:** tile habilitada; recursos agrupados por
  unidad; `UnitMotif` correcto por sección; numeración reinicia por sección;
  cards correctas; recursos/preguntas se muestran bien; navegación funciona;
  scroll correcto; sin errores visuales; **sin 429**. → **RECURSOS V1 — APPROVED.**

El modelo/versión exacta del dispositivo más allá del identificador no está
registrado de forma más precisa en el repo; se documenta lo confiable.

---

## I. Deferred / siguientes bloques

- **Práctica libre** — modo del selector de modalidad, hoy `enabled: false`. OPEN.
- **Ensayos / rediseño de Ensayos** — OPEN.
- **A2 (opcional):** diferenciación cromática M1/M2 en Unidades y Recursos.
- **Consolidación (opcional):** `StudyResourceRow` + `lib/study/topic-status.ts`.

---

## J. Closure invariants (frozen — no redefinir silenciosamente)

1. Identidad de Unidad = `CurriculumTopic.code`. Nunca `name`/índice/materia.
2. `resolveUnitMotif`: exacto → prefijo canónico → `generic`. Sin matching por palabra.
3. Los 17 unit codes V1 tienen motivo propio; ninguno → `generic`.
4. M1 (`percentage`/`algebra`/`geometry`/`data`) = SVG intacto, byte-for-byte.
5. Color por materia = `subjectIcon`/`subjectTone*` con tokens existentes. M1==M2 azul por diseño.
6. Modo Recursos carga con `1 + N + 1` requests. Nunca N+1 de progreso, nunca endpoint nuevo.
7. Numeración de Recursos = `index + 1` por lista/sección (reinicia por unidad).
8. Navegación al recurso = `resolveContinuationEntry` + `resourceFlowNav`; `topicId = resource.id`.
9. Estados de progreso = 3 (`NOT_STARTED`/`IN_PROGRESS`/`COMPLETED`) vía `Chip`. Sin %/barra/XP.
10. Práctica libre y Ensayos permanecen fuera; la tile "Recursos" es la única que este bloque habilita.

---

## K. Closure gate / orchestrator — decisión

**Ninguno creado.** El repo no tiene patrón de orquestador de cierre
(`verify:*-closure`), y los cierres hermanos (`COMPETIR-V1`, `DESAFIOS-V1`,
`COSMETICS-V1`) no introducen uno. Este bloque ya aporta `verify:unit-motif-gate`
y `verify:recursos-catalog-gate` para sus contratos productivos.

---

## L. Tag — decisión

**No se crea tag.** El repo etiqueta cierres a **nivel de bloque/fase**
(`lef-block-4-competir-complete`, `profile-closure-complete`,
`lef-phase-2-complete`) pero **no** los cierres de refinamiento de sub-feature
(no existe `desafios-v1-complete` ni `cosmetics-v1-complete` pese a sus closure
reports). Además, **Estudio V1 sigue OPEN** (Práctica libre + Ensayos
pendientes), por lo que un tag `*-complete` sería incorrecto. Se sigue el
procedimiento de `COMPETIR-V1-CLOSURE-REPORT.md` §L exactamente → sin tag.

---

## M. Git

- **Archivos cambiados por este cierre:** `docs/adr/STUDY-V1-UNITS-RESOURCES-CLOSURE-REPORT.md` (nuevo — este archivo). Nada más.
- **Staged set:** solo este archivo. Sin `git add .`.
- **Protected residue:** intacto, sin stagear.
- **Un commit:** `docs(study): close units and resources v1`.
- **No push. No amend. No tag. No Railway. No emulator. Cero cambios de producto.**

---

## FINAL VERDICT

El sub-bloque **Unidades + Recursos** de Estudio V1 entrega: la iconografía
completa y canónica de las 17 unidades del catálogo (A0 refactor + A1 motivos),
la identidad de unidad en la lista de Recursos de una unidad (B), y el modo
Recursos independiente como biblioteca del catálogo agrupada por unidad (R) —
todo sobre endpoints ya existentes, sin backend nuevo, sin migración Prisma, sin
romper contratos, sin tocar residue, y sin alterar Práctica libre ni Ensayos.
QA físico en Samsung aprobado para las tres partes. Suite de gates verde.

- **UNIDADES V1 — CLOSED.**
- **RECURSOS V1 — CLOSED.**
- **ESTUDIO V1 — OPEN** (pendiente: Práctica libre, Ensayos).
