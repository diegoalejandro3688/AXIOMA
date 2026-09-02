# ESTUDIO V1 — FINAL CLOSURE REPORT

## Estado

**APPROVED / CLOSED.**

Los cuatro modos de Estudio quedan **APPROVED · IMPLEMENTED · QA VERIFIED · CLOSED**:

| Modo | Estado | Propósito |
|---|---|---|
| **Unidades** | CLOSED | recorrido estructurado del contenido por unidad |
| **Recursos** | CLOSED | acceso directo al catálogo de material académico, agrupado por unidad |
| **Práctica libre** | CLOSED | entrenamiento con preguntas aleatorias, sin alterar el recorrido académico |
| **Ensayos** | CLOSED | simulación PAES estructurada y cronometrada |

**ESTUDIO V1 — CLOSED.** No quedan bloques funcionales abiertos dentro de Estudio V1.

---

## A. Environment

| | |
|---|---|
| Repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| Branch | `ui-implementation-post-ui6` |
| HEAD al cierre | `195dafb21bb300478a264025049959c9d6b7d65b` `style(study): refine ensayos list and pre-start` |
| Base del arco | `77d8fc1819af3d34a68ed8b7e802d44c41973480` `style(home): add science continuation artwork` |
| Pila | pnpm monorepo · `apps/mobile` (Expo SDK ~54 / Expo Router / RN 0.81.5) · `apps/backend` (NestJS + Prisma) · `packages/contracts` (Zod) |

Cierre **solo documentación** — no altera producto. No push · No Railway · No emulator.

---

## B. Scope V1

Este cierre consolida el arco de **refinamiento visual + funcional de la superficie de modos de Estudio** sobre la base ya cerrada de los Bloques I–V (`BLOCK-I..V-CLOSURE-REPORT.md`, tags `block-1..5-*-complete`) y `STUDY-CONTENT-MOBILE-REACHABILITY-CLOSURE-REPORT.md`:

- selector de materia (Estudio → lista de materias) — sin cambios;
- selector de modalidad (Estudio → Materia → 4 tiles) — 4 modos habilitados;
- **Unidades** (iconografía por unidad, progreso agregado, navegación a Recursos);
- **Recursos** (modo independiente: catálogo completo por unidad);
- **Práctica libre** (modo nuevo: lane stateless de preguntas aleatorias);
- **Ensayos** (refinamiento visual de Lista + Pre-start; motor ya aprobado);
- los flujos de Recurso / Ejercicio existentes — sin cambios (contenido editorial no reabierto).

### Fuera de alcance / no reabierto
- Contenido editorial (recursos, preguntas, ensayos, passages).
- Home, Competir, Tutor IA, Perfil.
- Backend de Study/Progress/Exams salvo el mínimo aditivo de Práctica libre (P0).

---

## C. Modos finales

| Modo | Cierre específico | Commits clave |
|---|---|---|
| **Unidades** | `STUDY-V1-UNITS-RESOURCES-CLOSURE-REPORT.md` | `faf59f3` (A0 refactor motivos) · `e75bc02` (A1 17 motivos propios) |
| **Recursos** (identidad en lista de unidad) | `STUDY-V1-UNITS-RESOURCES-CLOSURE-REPORT.md` | `0ae5ed4` (B: `UnitMotif` en el header de la lista de recursos) |
| **Recursos** (modo independiente) | `STUDY-V1-UNITS-RESOURCES-CLOSURE-REPORT.md` | `062021d` (R: `recursos.tsx` `SectionList`, `lib/study/resource-catalog.ts`) |
| — cierre U+R — | | `6c226ab` `docs(study): close units and resources v1` |
| **Práctica libre** | `STUDY-V1-FREE-PRACTICE-CLOSURE-REPORT.md` | `19cd894` (P0: API stateless `/education/subjects/:id/practice-questions/{sample,answer}`) · `f7bc643` (P1: `practica-libre.tsx` runner continuo) |
| — cierre PL — | | `2ca7851` `docs(study): close free practice v1` |
| **Ensayos** | `STUDY-V1-ENSAYOS-CLOSURE-REPORT.md` | `195dafb` (E: refinamiento visual de Lista + Pre-start) |

Los closure reports específicos contienen el detalle completo; este documento es **consolidado**, no una copia.

---

## D. Implementation history (cadena real verificada en git log)

```
77d8fc1  style(home): add science continuation artwork              (base)
faf59f3  refactor(study): centralize unit motif mapping             (A0)
e75bc02  style(study): add unit-specific motifs                     (A1)
0ae5ed4  style(study): add unit identity to resource list          (B)
062021d  feat(study): add resources catalog mode                   (R)
6c226ab  docs(study): close units and resources v1                 (closure U+R)
19cd894  feat(study): add stateless free practice api              (P0)
f7bc643  feat(study): add free practice mode                       (P1)
2ca7851  docs(study): close free practice v1                       (closure PL)
195dafb  style(study): refine ensayos list and pre-start           (E)
<este>   docs(study): close ensayos and study v1                   (closure Ensayos + global)
```

---

## E. Arquitectura global

### Rutas (todas registradas en `app/(tabs)/estudio/_layout.tsx`, accesibles)
```
estudio/index                              lista de materias
[subjectId]/index                          selector de modalidad (4 tiles)
[subjectId]/unidades                       Unidades
[subjectId]/unidad/[unitId]                Recursos de una unidad
[subjectId]/recursos                       Recursos (modo independiente)
[subjectId]/practica-libre                 Práctica libre
topic/[topicId]/recurso                    visor de recurso        (headerShown: false)
topic/[topicId]/ejercicio                  ejercicio               (headerShown: false)
ensayos/index                              lista de ensayos
ensayos/[examId]/index                     pre-start
ensayos/[examId]/attempt/[attemptId]       runner                  (headerShown: false)
ensayos/[examId]/result/[attemptId]        resultado               (headerShown: false)
ensayos/[examId]/review/[attemptId]        revisión                (headerShown: false)
```

### Modelo de datos / requests por modo
| Modo | Patrón | Coste |
|---|---|---|
| **Unidades** | `1 listRootTopics + N listChildTopics + 1 getTopicsProgressBatch` | 5–6 req/materia |
| **Recursos** (modo independiente) | `1 listRootTopics + N listChildTopics + 1 getTopicsProgressBatch` (via `assembleResourceCatalog`) | 5–6 req/materia |
| **Práctica libre** | `1 × POST .../sample` + `1 × POST .../answer` por pregunta; stateless; sin fan-out de pool | 2 req/pregunta |
| **Ensayos** | dominio `/exams`; `startExamAttempt` (crea/reanuda); attempt server-authoritative | por interacción |

Todos bajo el límite global 300/60s por IP (subido de 100→300 en el hotfix Estudio 429, ya cerrado).

### Fronteras de progreso (siguen en código — ver §F)
- **Unidades / Recursos** → participan en el **lane académico** (`student_response` → `curriculum_topic_progress`, XP `RESPUESTA_VALIDADA`, +1 LP, alimentan desafíos y "Continuar estudiando" de Inicio).
- **Práctica libre** → **NO toca el lane académico**: sin `student_response`, sin `TopicProgress`, sin XP/LP, sin desafíos, sin efecto en Home, sin persistencia Prisma. Endpoints de lectura pura + validación de corrección.
- **Ensayos** → **dominio propio EXAMS** (`ExamAttempt`); NO usa `TopicProgress` para representar el intento; sin XP/LP/gamificación de Study.

---

## F. Separación semántica de modos (parte del cierre)

| Modo | Qué es | Qué NO es |
|---|---|---|
| **Unidades** | navegación estructurada por contenido curricular (unidad → recursos → ejercicio) | no es "todo el material de golpe" |
| **Recursos** | acceso directo al catálogo académico completo de la materia, agrupado por unidad | no es un recorrido guiado; no reordena ni re-agrupa |
| **Práctica libre** | entrenamiento con preguntas aleatorias de la materia, indefinido, sin sesión persistida | no altera el recorrido académico, no otorga XP/LP, no "consume" recursos |
| **Ensayos** | simulación/evaluación PAES: cronometrada, orden fijo, submit explícito, resultado global + revisión | no es práctica libre; no es estudio con feedback inmediato; no otorga XP/LP |

---

## G. Selector de modalidad — estado final

`app/(tabs)/estudio/[subjectId]/index.tsx`:

| Tile | `enabled` | Ruta |
|---|---|---|
| `unidades` | **true** | `/(tabs)/estudio/[subjectId]/unidades` |
| `recursos` | **true** | `/(tabs)/estudio/[subjectId]/recursos` |
| `practica-libre` | **true** | `/(tabs)/estudio/[subjectId]/practica-libre` |
| `ensayo` | **true** | `/(tabs)/estudio/ensayos` |

**No queda ningún "Próximamente"** entre estas cuatro modalidades — el texto "Próximamente" solo se renderiza `if (!tile.enabled)` y ninguna de las cuatro está deshabilitada. (Un docstring del archivo aún describe el estado antiguo — deuda de comentario no bloqueante, §I.2.)

---

## H. QA físico global

Todo verificado en Samsung físico (device **R5CW71R7MTP**), aprobado por el usuario:

| Modo | QA físico |
|---|---|
| **Unidades** | Samsung — **APPROVED** (17 motivos correctos a tamaño real, colores por materia, navegación/progreso) |
| **Recursos** (lista de unidad + modo independiente) | Samsung — **APPROVED** |
| **Práctica libre** | Samsung — **APPROVED** (el error inicial `Cannot POST .../sample` fue un backend antiguo en ejecución — environment/startup issue, no un defecto; resuelto con `start:dev`) |
| **Ensayos** | Samsung — **APPROVED** (Lista + Pre-start refinados; M1 y Competencia Lectora verificados; títulos largos wrapean; tonos correctos; motor intacto) |

---

## I. Gates finales

Ejecutados en HEAD `195dafb`:

| Gate | Ámbito | Resultado |
|---|---|---|
| `@axioma/mobile` `tsc --noEmit` | tipos + typed routes | ✅ |
| `@axioma/mobile` `lint` | `eslint app lib components` | ✅ |
| `verify:exam-mobile-flow-gate` (191) | flujo mobile de Ensayos | ✅ |
| `verify:study-navigation-gate` (18) | navegación Unidad→Recurso, agregación | ✅ |
| `verify:free-practice-gate` (56) | runner de Práctica libre + lane aislado | ✅ |
| `verify:unidades-batch-gate` (11) | batch de progreso de Unidades | ✅ |
| `verify:recursos-catalog-gate` (29) | `assembleResourceCatalog` 1+N+1 | ✅ |
| `verify:unit-motif-gate` (60) | contrato de los 17 motivos | ✅ |
| `verify:continue-target-batch-gate` (34) | continuación multi-materia | ✅ |
| `verify:api-client-gate` (11) | mapeo de errores/429 del cliente | ✅ |
| `verify:challenges-gate` (65) | regresión de desafíos (Home) | ✅ |
| `@axioma/contracts` build / `tsc` / `lint` | contratos | ✅ |
| `@axioma/backend` `tsc -p tsconfig.json` / `lint` | backend | ✅ |
| `verify:free-practice-api-gate` (backend, pure) | lane stateless de Práctica libre | ✅ |
| `verify:ensayo-source-gate` (backend, pure) | contenido de Ensayos | ✅ |
| `git diff --check` | whitespace | ✅ |

**Gates DB no ejecutados** (`verify:education-gate`, `verify:progress-gate`, `verify:exam-foundation-gate`, `verify:exam-passages-gate`, `verify:quick-question-*`, `verify:gamification-*`): corren vía `run-gate.ts` contra servidor + Postgres, no disponible localmente; prohibido levantar infra externa. Cubiertos por: gates puros equivalentes, `git status` limpio en los dominios no tocados, `findRandomEligible` (Quick Question) byte-idéntico (0 deleciones), y evidencia de los cierres previos.

---

## J. Closure invariants (frozen — no redefinir silenciosamente)

1. **Los cuatro modos de Estudio están `enabled: true`.**
2. **No queda "Próximamente"** entre esas cuatro modalidades.
3. **Unidades y Recursos comparten el lane académico** (`student_response` → progreso → XP/LP → desafíos → "Continuar estudiando").
4. **Práctica libre NO altera el lane académico** (sin `student_response`, sin `TopicProgress`, sin XP/LP, sin desafíos, sin efecto en Home, sin persistencia Prisma).
5. **Ensayos usa un dominio propio (EXAMS)** — `ExamAttempt`, nunca `TopicProgress` para el intento; sin XP/LP/gamificación de Study.
6. **Home "Continuar estudiando" solo refleja actividad del lane académico** (`max(respondedAt)` global de recursos en curso) — ni Práctica libre ni Ensayos lo mueven.
7. **Identidad visual de materia** = `subjectIcon(name)` + `subjectToneColor`/`subjectToneBackground` (por nombre visible), reutilizada consistentemente en Unidades / Recursos / Ensayos. `UnitMotif` (17 motivos por `topic.code` canónico) solo para Unidades.
8. **Ninguna deuda bloqueante.**

---

## K. Non-blocking debt (consolidada — solo deuda real)

| # | Deuda | Origen | Nota |
|---|---|---|---|
| K.1 | `subjectIcon(name)` resuelve por **nombre visible** de materia, no por `subjectKey` | pre-existente (STUDY-2A) | mitigada por casos explícitos + `default` seguro; migración a `subjectKey` es transversal y fuera de alcance V1 |
| K.2 | Docstring obsoleto en `[subjectId]/index.tsx` (dice que Recursos/Práctica libre siguen "Próximamente") | R + P1 | **solo comentario**; los 4 tiles están `enabled: true`. Corregir en un futuro incremento. |
| K.3 | Duplicación menor: Resource row + `topicStatusLabel`/`statusChipVariant` copiados entre `unidad/[unitId].tsx` y `recursos.tsx` | R | aceptada deliberadamente para no reabrir zonas cerradas; consolidar en `StudyResourceRow` + `lib/study/topic-status.ts` a futuro |
| K.4 | M1 y M2 comparten el color azul (`accent`) | A1 (diseño) | diferenciación por **motivo**, no por color — decisión de diseño, no defecto (A2 opcional) |
| K.5 | Práctica libre sin analytics específico `FREE_PRACTICE` | P0/P1 (diseño) | la práctica es indistinguible de estudio a nivel de datos; distinguir requeriría evento/campo nuevo |
| K.6 | Práctica libre **online-only** (sin cola offline) | P1 (diseño) | mismo criterio que Quick Question — un envío diferido sobre un pool que ya no es la ejecución actual no tiene sentido |
| K.7 | Práctica libre: `seen` no persiste entre ejecuciones | P1 (diseño) | reentrar = ejecución nueva; puede repetir preguntas de ejecuciones previas |
| K.8 | `ORDER BY random()` en el sample de Práctica libre | P0 | suficiente para el catálogo V1 (~980 preguntas/materia máx. 330); revisable si el catálogo crece muchísimo |
| K.9 | `verify:exam-mobile-flow-gate` había quedado con una assertion obsoleta (`recursos` disabled) | detectada en la auditoría de Práctica libre | **ya corregida** en P1 ("stale assertion discovered during free-practice audit") |
| K.10 | Números de spacing crudos (múltiplos de 4) en algunos estilos de Estudio | histórico | cosmético; se migran a `spacing.*` de forma oportunista |

Ninguna es bloqueante.

---

## L. Deferred / Post-V1

Solo lo **explícitamente diferido**:

- **A2 (opcional):** diferenciación cromática M1 / M2 en Unidades y Recursos.
- **Consolidación:** extraer `components/study/StudyResourceRow` + `lib/study/topic-status.ts` (dedup K.3).
- **Migración `subjectKey`:** cambiar `subjectIcon(name)` a `subjectIcon(subjectKey)` en toda la superficie de Estudio (K.1).
- **Docstring fix** en `[subjectId]/index.tsx` (K.2).
- **Recursos por materia adicionales** cuando el catálogo editorial crezca (el código ya escala).

No se define roadmap nuevo.

---

## M. Master doc

No existe un documento maestro único de Estudio (el proyecto usa closure reports por bloque/sub-feature). Con este arco, la superficie de modos de Estudio queda documentada por **tres closure reports específicos** + **este consolidado global**. No se crea un cuarto documento redundante. `STUDY-CONTENT-MOBILE-REACHABILITY-CLOSURE-REPORT.md` (ajeno, ya cerrado) no se toca.

---

## N. QA / gates — no se cerró nada no verificado

Todo lo declarado CLOSED en este documento tiene: (a) commit(s) en el historial verificable de git, (b) QA físico Samsung aprobado por el usuario y documentado en el closure report específico, y (c) suite de gates puros verde en el estado final del repo. Los gates DB no ejecutables local están cubiertos por gates puros equivalentes + evidencia previa (§I). Ninguna afirmación de este documento es inventada.

---

## S. Tag — decisión

**No se crea tag.**

Convención observada en el repo:
- **Cierres de bloque / fase LLEVAN tag anotado:** `block-1..5-*-complete`, `lef-block-1..8-*-complete`, `lef-phase-2-complete`, `phase-0-complete`, y `profile-closure-complete` (cierre de la superficie completa de Perfil).
- **Cierres de sub-feature "V1" NO llevan tag:** `COMPETIR-V1`, `DESAFIOS-V1`, `COSMETICS-V1`, `STUDY-V1-UNITS-RESOURCES`, `STUDY-V1-FREE-PRACTICE` — **cinco closure reports, cero tags**. `COMPETIR-V1-CLOSURE-REPORT.md §L` lo razona explícitamente: es un refinamiento sobre una base ya etiquetada (`lef-block-4-competir-complete`).

**Estudio V1 (este arco)** es el sibling directo de `COMPETIR-V1`: un pase de refinamiento visual + un modo nuevo (Práctica libre) **sobre los Bloques I–V ya cerrados y etiquetados** (`block-1..5-*-complete`). Sigue la misma política que sus cinco cierres hermanos → **sin tag**. (`profile-closure-complete` es la excepción — cierre de una superficie que no tenía tag de bloque propio; no aplica aquí, ya que Estudio sí tiene `block-1..5`.)

Si en el futuro se decide etiquetar los cierres de superficie "V1" de forma retroactiva, el nombre coherente sería `study-v1-complete` sobre el commit de este cierre — pero **no se crea ahora**.

---

## T. Git

- **Archivos cambiados por este cierre:** `docs/adr/STUDY-V1-ENSAYOS-CLOSURE-REPORT.md` (nuevo) + `docs/adr/STUDY-V1-CLOSURE-REPORT.md` (nuevo). Nada más.
- **Un commit:** `docs(study): close ensayos and study v1`.
- **No push. No amend. No tag. No Railway. No emulator. Cero cambios de producto.**

---

## FINAL VERDICT

Estudio V1 entrega los **cuatro modos de estudio completos y diferenciados** — Unidades (recorrido estructurado), Recursos (catálogo académico), Práctica libre (entrenamiento aleatorio stateless) y Ensayos (simulación PAES cronometrada) — sobre la base ya cerrada de los Bloques I–V, con las fronteras de progreso intactas en código (Unidades/Recursos en el lane académico; Práctica libre y Ensayos aislados de él), sin backend nuevo salvo el mínimo aditivo stateless de Práctica libre, sin migración Prisma, sin romper contratos, sin tocar residue. Los cuatro modos están habilitados en el selector, sin "Próximamente" pendiente. QA físico Samsung aprobado para los cuatro. Suite de gates puros verde. Sin deuda bloqueante.

- **UNIDADES V1 — CLOSED.**
- **RECURSOS V1 — CLOSED.**
- **PRÁCTICA LIBRE V1 — CLOSED.**
- **ENSAYOS V1 — CLOSED.**
- **ESTUDIO V1 — CLOSED.**
