# ESTUDIO V1 — ENSAYOS V1 — CLOSURE REPORT

## Estado

**APPROVED / CLOSED** — sub-bloque "Ensayos" de Estudio V1.

- **UNIDADES V1 — CLOSED**
- **RECURSOS V1 — CLOSED**
- **PRÁCTICA LIBRE V1 — CLOSED**
- **ENSAYOS V1 — CLOSED**

Con este cierre, **ESTUDIO V1 queda completo** — ver `STUDY-V1-CLOSURE-REPORT.md`.

---

## A. Environment

| | |
|---|---|
| Repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| Branch | `ui-implementation-post-ui6` |
| HEAD al cierre | `195dafb21bb300478a264025049959c9d6b7d65b` `style(study): refine ensayos list and pre-start` |
| Parent de HEAD | `2ca7851665307b69388d0cb780ff71291e7ae1fa` `docs(study): close free practice v1` |
| Pila | pnpm monorepo · `apps/mobile` (Expo SDK ~54 / RN 0.81.5) · dominio backend **EXAMS** (ADR-0024, separado de Study) · `packages/contracts` (Zod) |

Este cierre es **solo documentación** — no altera producto. No push · No tag · No Railway · No emulator.

---

## B. Scope closed

El flujo completo de Ensayos V1:

| Screen | Archivo | Estado a este cierre |
|---|---|---|
| Lista de ensayos | `app/(tabs)/estudio/ensayos/index.tsx` | **refinamiento visual final (incremento E)** |
| Pre-start / intro | `app/(tabs)/estudio/ensayos/[examId]/index.tsx` | **refinamiento visual final (incremento E)** |
| Runner (ejecución) | `.../[examId]/attempt/[attemptId].tsx` | ya aprobado (ENSAYOS-M1-C/D/D2) — **funcionalmente intacto** |
| Question navigator | `components/exams/exam-question-navigator.tsx` | ya aprobado — intacto |
| Timer | `components/exams/exam-countdown.tsx` + `lib/exams/timer.ts` | ya aprobado — intacto |
| Submit + Dialog de confirmación | dentro del runner | ya aprobado — intacto |
| Result (conteo global) | `.../[examId]/result/[attemptId].tsx` | ya aprobado (ADR-0024) — intacto |
| Review (pauta + explicación) | `.../[examId]/review/[attemptId].tsx` | ya aprobado — intacto |
| Passages (F2) | `components/exams/passage-card.tsx` / `passage-content-renderer.tsx` / `passage-table.tsx` | ya aprobado (ENSAYOS-F2) — intacto |

**Aclaración clave:** solo **Lista + Pre-start** recibieron trabajo en este arco final (incremento E). El motor (runner/navigator/timer/submit/result/review/passages) ya estaba aprobado en fases anteriores (ENSAYOS-F1/F2/M1-A..D2) y quedó **funcionalmente intacto** — el incremento E fue **VISUAL-ONLY**.

### Fuera de alcance
- Contenido editorial de los ensayos (`content/ensayo/**`), preguntas, passages.
- Cualquier mecánica nueva (historial, dificultad, filtros, pausa, checkpoints, ranking, XP/LP).

---

## C. Product contract (Ensayos V1 — frozen)

- **Simulacro completo** por materia. 5 ensayos publicados, 1 por materia (`ENSAYO.M1` / `ENSAYO.M2` / `ENSAYO.LECTORA` / `ENSAYO.HISTORIA` / `ENSAYO.CIENCIAS.BIOLOGIA`).
- **Duración server-authoritative** (`durationSeconds` del `Exam`; `expiresAt` persistido al iniciar = `startedAt + durationSeconds`).
- **Sin pausa** — el reloj sigue corriendo aunque se cierre la app; cerrar/reabrir no lo reinicia. `AppState → active` fuerza un tick. `ExamCountdown` calibra el reloj local contra `serverTime`, nunca es autoridad.
- **Orden de preguntas fijo** por `ExamQuestion.displayOrder` (sin shuffle, sin pool aleatorio).
- **Navegación libre** — "Anterior"/"Siguiente" + `ExamQuestionNavigator` (grid 1..N; estados `current`/`answered`/`unanswered`, nunca correct/incorrect mientras ACTIVE).
- **Cambio de respuesta permitido** antes de entregar (`PUT .../answers` crea o cambia la selección; `pendingOptionId` bloquea doble-tap).
- **Intento persistente y reanudable** — `startExamAttempt` crea **o reanuda** (decisión del backend); cache local (`attempt-cache`) distingue "Comenzar" de "Continuar", validada contra el backend; mirar la intro nunca crea un intento.
- **Submit explícito** — botón "Entregar ensayo" → `Dialog` de confirmación (con aviso de sin-responder: "Las N sin responder contarán como incorrectas"). 409 = entrega idempotente (también éxito).
- **Resultado global** — `correct / totalQuestions correctas`, `% de aciertos` (`accuracyPercentage` = `correct / totalQuestions`, las sin responder penalizan), breakdown (Correctas / Incorrectas / Sin responder / Total). NUNCA puntaje PAES, escala 100-1000, percentil, comparación nacional.
- **Revisión posterior** — solo tras `COMPLETED`/`EXPIRED` (409 si `ACTIVE`). Recién aquí se revelan `correctAnswerOptionId`, `isCorrect`, `explanationContent`.
- **Passages soportados** (ENSAYOS-F2) — textos compartidos viajan UNA vez (`passages[]`), cada pregunta lleva solo `passageId`. `[]` en M1/M2. Colapsables por `passageId` (solo presentación). Bloque `table` exclusivo de passages.
- **Dominio EXAMS separado** (ADR-0024) — NUNCA `StudentResponse` / `CurriculumTopicProgress`; no XP/LP; no racha/meta diaria/desafíos; no emite eventos de gamificación. Las rutas de intento operan sobre `request.accountId` (AuthGuard), nunca un id del cliente.

No se introdujeron decisiones nuevas en este cierre.

---

## D. Visual refinement (incremento E — before → after)

### Lista de ensayos
| | before | after |
|---|---|---|
| header | "Ensayos" + "Simulacros completos para medir tu preparación." | **sin cambios** |
| card | `<Card interactive>[ cuerpo: título + "N preguntas · duración" ][ chevron ]` — plana, sin identidad | `<Card interactive>[ tile 44×44 (tono de materia) + Icon `study-mode-essay` ][ cuerpo: título + "N preguntas · duración" + **materia** ][ chevron ]` |
| identidad de materia | ninguna | `subjectIcon(name)` + `subjectToneColor`/`subjectToneBackground` — **mismos helpers que Unidades/Recursos**, sin colores locales, sin `UnitMotif` (un ensayo completo no es una unidad curricular) |

### Pre-start
| | before | after |
|---|---|---|
| estructura | `heading2` título → `outlined factCard` (3 líneas `bodySmall` apiladas) → párrafo suelto "simulación completa…" → `subtle noteCard` (2 frases grises) | **eyebrow de materia** (tinte discreto) → `heading2` título → **card de 2 métricas** (Preguntas · Duración, `Divider` vertical) → **"Antes de comenzar"** → **3 reglas escaneables** (`RuleRow` local: `clock` / `study-mode-units` / `check`) |
| copy | 3 frases con redundancia | condensado; **la regla del tiempo permanece explícita** ("El tiempo no se pausa" + "Sigue corriendo aunque cierres la app."). Párrafo "simulación completa" eliminado (duplicaba las reglas). |
| CTA | `Button primary` full-width, fuera del ScrollView, label dinámico, `loading={starting}` | **idéntico** — `handleStart`/`handleResume`/navegación/attempt-cache byte-idénticos |

Todo con tokens (`spacing.*`, `radii.*`, `subjectTone*`, `Divider`). Cero `#hex`/`rgba()`. Componente `RuleRow` **local** (2 pantallas no justifican uno global).

---

## E. Architecture

```
routes (todas registradas en estudio/_layout.tsx):
  ensayos/index                              -> LISTA        (title "Ensayos")
  ensayos/[examId]/index                     -> PRE-START    (title "Ensayo")
  ensayos/[examId]/attempt/[attemptId]       -> RUNNER       (headerShown: false)
  ensayos/[examId]/result/[attemptId]        -> RESULT       (headerShown: false)
  ensayos/[examId]/review/[attemptId]        -> REVIEW       (headerShown: false)

API (lib/api/exams.ts, dominio /exams, online-only, sin lib/offline):
  GET  /exams                                          listExams
  GET  /exams/:examId                                  getExam        (= ExamListItem)
  POST /exams/:examId/attempts                         startExamAttempt (crea o reanuda)
  GET  /exams/me/attempts/:attemptId                   getExamAttempt
  GET  /exams/me/attempts/:attemptId/questions         getExamAttemptQuestions (orden fijo, sin pauta)
  PUT  /exams/me/attempts/:attemptId/answers           answerExamQuestion (crea o cambia; operationId idempotente)
  POST /exams/me/attempts/:attemptId/submit            submitExamAttempt
  GET  /exams/me/attempts/:attemptId/result            getExamResult
  GET  /exams/me/attempts/:attemptId/review            getExamReview (409 si ACTIVE)

contract (ExamListItem = ExamDetailResponse):
  { id, examKey, title, subjectId, durationSeconds, questionCount }
  -> NO subjectName/subjectKey; el nombre visible de materia llega como route param `name`.

timer: expiresAt + serverTime del backend -> calibración local -> onExpire (una vez) -> refetch.
score: examAttemptScore { totalQuestions, answered, correct, incorrect, unanswered, accuracyPercentage }.
```

**Cero requests nuevos** en el incremento E — mismos helpers, `name` ya era route param, `formatDuration` es pura.

---

## F. QA físico

**Samsung físico (device R5CW71R7MTP) — APPROVED** por el usuario tras el incremento E.

- **Lista:** header + subtítulo intactos; card refinada; tile 44×44; icono `study-mode-essay`; identidad/color de materia; título principal claro; metadata preguntas/duración; materia visible; chevron; jerarquía mejorada sin sobredecorar.
- **Pre-start:** eyebrow de materia; título; card de 2 métricas (preguntas/duración); "ANTES DE COMENZAR"; 3 reglas claras; regla crítica del tiempo explícita; CTA "Comenzar ensayo" bien jerarquizada.
- **QA visual adicional:** Matemática M1 y Competencia Lectora verificadas; el título largo de Competencia Lectora wrapea correctamente; tonos azul/violeta visualmente correctos; el layout no se rompe por títulos largos.

El motor (runner/timer/navigator/submit/result/review/passages) ya estaba aprobado físicamente en ENSAYOS-M1-C/D/D2 y no se tocó.

---

## G. Gate evidence

Ejecutados en HEAD `195dafb`:

| Gate | Resultado |
|---|---|
| `@axioma/mobile` `tsc --noEmit` / `lint` | ✅ limpio |
| `verify:exam-mobile-flow-gate` (191 checks) | ✅ — **sin modificar el gate** (§14 regresión-Study no incluye lista/pre-start de ensayos; §8 forbidden-list se sigue cumpliendo) |
| `verify:study-navigation-gate` | ✅ |
| `verify:free-practice-gate` | ✅ |
| `verify:unidades-batch-gate` / `verify:recursos-catalog-gate` / `verify:unit-motif-gate` / `verify:continue-target-batch-gate` / `verify:api-client-gate` / `verify:challenges-gate` | ✅ |
| `@axioma/contracts` build / `tsc` / `lint` | ✅ |
| `@axioma/backend` `tsc -p tsconfig.json` / `lint` | ✅ |
| `verify:free-practice-api-gate` (backend, pure `tsx`) | ✅ |
| `verify:ensayo-source-gate` (backend, pure `tsx`) | ✅ |
| `git diff --check` | ✅ limpio |

**NO ejecutados** (y por qué): `verify:exam-foundation-gate`, `verify:exam-passages-gate`, `verify:ensayo-import-gate` — corren vía `run-gate.ts` contra servidor Nest compilado + Postgres, no disponible localmente (prohibido Railway/infra externa). Cubiertos por: (a) el incremento E **no toca** backend/contracts/lib de Ensayos (`git status` limpio ahí); (b) `verify:exam-mobile-flow-gate` (mobile, pure) cubre timer, attempt-state, navegación, sin fuga de pauta, doble-tap, orden fijo; (c) `verify:ensayo-source-gate` (pure) valida el contenido.

---

## H. Non-blocking debt

| # | Deuda | Nota |
|---|---|---|
| H.1 | `subjectIcon(name)` resuelve por nombre visible de materia | deuda pre-existente y transversal a Estudio; el incremento E la **reutiliza** (mismo patrón que Unidades/Recursos), no la amplía. |
| H.2 | Docstring obsoleto en `[subjectId]/index.tsx` (líneas 10-14): dice que "Recursos y Práctica libre siguen deshabilitados con 'Próximamente'" | **solo comentario** — los 4 tiles están `enabled: true` y el "Próximamente" (línea 113) nunca se renderiza. Comportamiento correcto. Corregir el comentario en un incremento futuro (no en este cierre documental). |
| H.3 | `study-mode-units` (Steps) como icono de la regla "Navega libremente" | aproximación consciente — no existe un icono de flechas/navegación en el registro; alternativa aceptada = sin icono. No se creó icono nuevo. |
| H.4 | La lista depende de `name` (route param) para el color de materia | hoy el único camino es el selector (siempre pasa `name`); fallback seguro (azul). Igual que Unidades/Recursos. |
| H.5 | Ensayos backend: números de duración crudos en algunos estilos de pre-start migrados a `spacing.*` de paso | limpieza cosmética menor, no un defecto. |

Ninguna es un blocker.

---

## I. Implementation history

| Increment | Hash | Mensaje |
|---|---|---|
| **E** (visual — lista + pre-start) | `195dafb21bb300478a264025049959c9d6b7d65b` | `style(study): refine ensayos list and pre-start` |

El motor de Ensayos se construyó en fases anteriores (ENSAYOS-F1 fundación, F2 passages, M1-A..D2 flujo mobile + fixes de layout/formulas/index) y sus cierres están en el historial del proyecto; este arco final solo aporta el commit `195dafb`.

---

## J. Closure invariants (frozen)

1. Dominio EXAMS separado de StudentResponse/CurriculumTopicProgress. Sin XP/LP/gamificación de Study.
2. Timer server-authoritative (`expiresAt` + `serverTime`), sin pausa, calibración local.
3. Orden de preguntas fijo por `displayOrder`, sin shuffle.
4. Navegación libre + cambio de respuesta antes de entregar.
5. Intento persistente/reanudable; mirar la intro no crea intento.
6. Submit explícito con `Dialog` de confirmación; 409 idempotente.
7. Result = conteo global (correct/total, %, breakdown); nunca puntaje PAES/percentil.
8. Review solo tras COMPLETED/EXPIRED; recién ahí se revela la pauta.
9. Lista + Pre-start heredan identidad de materia con `subjectIcon(name)` + `subjectTone*` (sin `UnitMotif`, sin colores locales).
10. La regla "El tiempo no se pausa / sigue corriendo aunque cierres la app" permanece explícita.

---

## K. Closure gate / tag — decisión

**Ningún gate-orquestador creado** (el repo no tiene ese patrón). **Ningún tag creado** — ver `STUDY-V1-CLOSURE-REPORT.md §S` (decisión de tag consolidada a nivel del cierre global de Estudio V1).

---

## L. Git

- **Archivos cambiados por este cierre:** `docs/adr/STUDY-V1-ENSAYOS-CLOSURE-REPORT.md` (nuevo) + `docs/adr/STUDY-V1-CLOSURE-REPORT.md` (nuevo, global). Nada más.
- **Un commit:** `docs(study): close ensayos and study v1`.
- **No push. No amend. No tag. No Railway. No emulator. Cero cambios de producto.**

---

## FINAL VERDICT

Ensayos V1 entrega el simulacro completo por materia sobre el dominio EXAMS (ADR-0024) — reloj server-authoritative sin pausa, orden fijo, navegación libre, intento reanudable, submit explícito, resultado global y revisión posterior con passages — totalmente aislado del recorrido académico (sin `StudentResponse`, sin progreso, sin XP/LP). El incremento E aportó el refinamiento visual **VISUAL-ONLY** de Lista + Pre-start (identidad de materia, jerarquía, métricas, reglas escaneables), sin tocar el motor ni el backend ni los contratos. QA físico Samsung aprobado. Suite de gates mobile/contracts/backend verde (los gates DB de Ensayos, no ejecutables local, cubiertos por evidencia previa + gates puros).

**ENSAYOS V1 — CLOSED.**
