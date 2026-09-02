# ESTUDIO V1 — PRÁCTICA LIBRE V1 — CLOSURE REPORT

## Estado

**APPROVED / CLOSED** — sub-bloque "Práctica libre" de Estudio V1.

- **UNIDADES V1 — CLOSED**
- **RECURSOS V1 — CLOSED**
- **PRÁCTICA LIBRE V1 — CLOSED**
- **ESTUDIO V1 (general) — OPEN / IN PROGRESS**

Único bloque funcional pendiente: **ENSAYOS / rediseño de Ensayos.**

---

## A. Environment

| | |
|---|---|
| Repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| Branch | `ui-implementation-post-ui6` |
| HEAD al cierre | `f7bc6431860cfdd0595da7d57b96ebfcb160d57b` `feat(study): add free practice mode` |
| Parent de HEAD | `19cd89494693aeae680520f387642c07c58bfb11` `feat(study): add stateless free practice api` |
| Antes | `6c226abaa5c449413c28f49a6e4f910e6d723336` `docs(study): close units and resources v1` |
| Pila | pnpm monorepo · `apps/mobile` (Expo SDK ~54 / RN 0.81.5) · `apps/backend` (NestJS + Prisma) · `packages/contracts` (Zod) |

Este cierre es **solo documentación** — no altera producto (ver §M).
No push · No tag · No Railway · No emulator · nunca `git add .`.

---

## B. Scope closed

1. **P0 — backend stateless free-practice API** (`19cd894`): 2 endpoints POST bajo `/education/subjects/:subjectId/practice-questions` (`sample` + `:questionVersionId/answer`), lectura pura + validación de corrección, cero escritura, cero modelo Prisma nuevo.
2. **P1 — mobile free-practice mode** (`f7bc643`): pantalla `[subjectId]/practica-libre.tsx` (runner continuo), helpers `lib/api/practice.ts`, tile habilitada + ruta + `Stack.Screen`, corrección de una assertion obsoleta en `verify-exam-mobile-flow-gate.ts`, nuevo `verify:free-practice-gate`.
3. **Integración + QA físico Samsung** — APPROVED (ver §H).

### Fuera de alcance (permanece OPEN)
- **Ensayos / rediseño de Ensayos.**
- Contenido editorial / preguntas / manifest / seed — sin cambios.
- Unidades, Recursos, visor de recurso, `topic/[topicId]/ejercicio.tsx` — cerrados y sin tocar.

---

## C. Product contract (frozen)

Práctica libre V1 es:

- **Práctica continua** — pregunta → respuesta → siguiente aleatoria → hasta que el usuario sale.
- **Stateless** — sin sesión persistida, sin modelo `FreePracticeSession`/`FreePracticeAttempt`, sin reanudación.
- Preguntas **aleatorias por materia** (la materia del selector de modalidad).
- **Sin** número fijo de preguntas · sin temporizador · sin LP · sin ranking · sin resultado final (score/porcentaje) · sin filtros · sin dificultad · sin selección de unidad · sin configuración · sin contador X/Y · sin barra de progreso.
- **Entrar → primera pregunta directamente** (sin pantalla "Comenzar", sin hero).
- Feedback correcto/incorrecto + explicación (`explanationContent`).
- **"Continuar" → siguiente pregunta.**
- **Sin repetición dentro de la ejecución** (el cliente lleva en memoria las `questionVersionId` vistas). Puede repetir entre ejecuciones distintas.
- Salir (X / back) termina la ejecución. Reentrar = ejecución nueva, selección nueva.

### Aislamiento de efectos secundarios (invariante central)

Responder en Práctica libre **NO** modifica ninguno de:

| Efecto | ¿Modificado por Práctica libre? |
|---|---|
| `student_response` | **NO** |
| `curriculum_topic_progress` (progreso de Recursos / Unidades) | **NO** |
| Home "Continuar estudiando" (`pick-continue-topic.ts`) | **NO** |
| XP (`RESPUESTA_VALIDADA`, `xp_ledger`) | **NO** |
| Desafíos (worker de progresión) | **NO** |
| League Points (LP) | **NO** |
| Outbox de plataforma (`student_response_recorded`, `curriculum_topic_completed`) | **NO** |
| Persistencia Prisma (tabla/modelo nuevo) | **NO** |

---

## D. Architecture

```
MOBILE
  Estudio → Materia → Práctica libre
    useEffect (montaje) -> samplePracticeQuestion(subjectId, seen=[])
    responder            -> answerPracticeQuestion(subjectId, questionVersionId, answerOptionId)  -> { isCorrect }
    "Continuar"          -> samplePracticeQuestion(subjectId, [...seen])
  seen = useRef<Set<questionVersionId>>  (SOLO en memoria; se reinicia al salir)

BACKEND (stateless)
  POST /education/subjects/:subjectId/practice-questions/sample
    body { excludeQuestionVersionIds: string[] (default [], dedup, max 2000) }
    -> EducationService.samplePracticeQuestion
    -> QuestionVersionRepository.findRandomPracticeQuestionForSubject(subjectId, dedup(exclude))
         SELECT qv.id FROM question_version qv
           JOIN curriculum_topic resource ON resource.id = qv.curriculum_topic_id
           JOIN question q ON q.id = qv.question_id
          WHERE qv.editorial_status = 'PUBLISHED'
            AND q.status = 'ACTIVE'
            AND resource.parent_id IS NOT NULL
            AND resource.subject_id = $subjectId
            AND EXISTS (SELECT 1 FROM learning_resource_version lrv
                        WHERE lrv.curriculum_topic_id = resource.id AND lrv.editorial_status = 'PUBLISHED')
            AND qv.id != ALL($exclude)
          ORDER BY random() LIMIT 1
    -> { question: QuestionResponse | null }   (null = pool agotado; NUNCA 404)

  POST /education/subjects/:subjectId/practice-questions/:questionVersionId/answer
    body { answerOptionId }
    -> EducationService.answerPracticeQuestion
       - findEligiblePracticeQuestionById(qvId, subjectId)  (mismo predicado canónico) -> null => 404
       - AnswerOptionRepository.findById(optionId); option.questionVersionId !== qvId => 400
    -> { questionVersionId, answerOptionId, isCorrect }   (server-authoritative, CERO escritura)
```

**No persistencia.** La lista `seen` vive solo en memoria del cliente; el backend no guarda nada de la práctica.

---

## E. Contracts

`packages/contracts/src/education.ts`, bloque "Práctica libre (STATELESS)":

| Símbolo | Forma |
|---|---|
| `MAX_PRACTICE_EXCLUDE_IDS` | `2000` (cota holgada sobre el catálogo — máx. ~330 preguntas/materia) |
| `practiceQuestionSampleRequestSchema` | `{ excludeQuestionVersionIds: z.array(entityId).max(2000).default([]) }` |
| `practiceQuestionSampleResponseSchema` | `{ question: questionResponseSchema.nullable() }` |
| `practiceQuestionAnswerRequestSchema` | `{ answerOptionId: entityId }` |
| `practiceQuestionAnswerResponseSchema` | `{ questionVersionId, answerOptionId, isCorrect: z.boolean() }` — sin `topicStatus` |

**Reutilizados:** `entityId`, `questionResponseSchema` / `QuestionResponse` (sin `isCorrect`).
**No modificados:** contratos de `StudentResponse`, `Progress`, `Quick Question`, `Exam`. **No** se añadió `mode` a `StudentResponse`.

---

## F. Canonical question pool

El pool elegible = **exactamente el mismo criterio "canónico" de Study / PROFILE-01**:

- `question_version.editorial_status = 'PUBLISHED'`;
- `question.status = 'ACTIVE'` (pregunta retirada nunca se sirve);
- su `curriculum_topic` es un **Recurso canónico**: `parent_id IS NOT NULL` (nunca unidad raíz ni topic raíz legacy del seed) con ≥1 `learning_resource_version` PUBLISHED;
- pertenece a la **materia de la ruta** (`subject_id`);
- no está en `excludeQuestionVersionIds`.

**Quedan fuera por construcción:** otras materias, topics legacy del seed (`M1.NUMEROS.PORCENTAJES`, `C1.BIOLOGIA.CELULA`, `L1.LECTURA.INFERENCIA`, `H1.CHILE.SIGLO20.ISI` y sus hijos sin lección publicada), fixtures/zztest (sus recursos no tienen `learning_resource_version` PUBLISHED), versiones no publicadas, preguntas retiradas. El pool global de Pregunta rápida (`findRandomEligible`, sin filtro de materia) **no** se comparte.

Volumen elegible por materia (catálogo V1): M1 ≈ 160 · M2 ≈ 80 · Lenguaje ≈ 140 · Ciencias ≈ 330 · Historia ≈ 270.

---

## G. Side-effect isolation — verificado por código

| Aspecto | Estado | Evidencia |
|---|---|---|
| `student_response` | **NO** | `verify:free-practice-api-gate` §A (scan de código sin comentarios); `EducationService` no inyecta `StudentResponseRepository` |
| `curriculum_topic_progress` | **NO** | idem; sin `recordActivityAndMaybeComplete` |
| Home continuation | **NO** | no se escribe `respondedAt` en ningún `student_response` |
| XP | **NO** | no se emite `student_response_recorded`; `EducationService` no toca `OutboxService` |
| Challenges | **NO** | sin evento de XP `OTORGAMIENTO` → el worker de progresión no ve nada |
| LP | **NO** | idem |
| Outbox publish | **NO** | ninguna llamada `.publish(` en las piezas nuevas |
| Prisma persistence | **NO** | `schema.prisma` sin cambios; `git diff` no incluye `prisma/` |
| **CERO writes** | ✓ | ambos endpoints solo `$queryRaw` SELECT + `findById`; `verify:free-practice-api-gate` §D asserta 0 llamadas de escritura en la orquestación |

---

## H. QA físico

**Samsung físico (device R5CW71R7MTP) — APPROVED** por el usuario.

- Práctica libre abre correctamente.
- Preguntas aleatorias cargan.
- Flujo respuesta → feedback → explicación → "Continuar" funciona.
- No se detectaron errores visuales ni funcionales.

### Incidente inicial (no defecto de producto)

En el primer intento apareció `Cannot POST /education/subjects/.../practice-questions/sample`. Causa: había un **proceso de backend antiguo levantado con un build anterior** que no contenía los endpoints de P0. Tras levantar el backend actual con `start:dev`, el endpoint quedó operativo y la feature funcionó correctamente.

**Clasificación: environment/startup issue — stale backend process/build.** Resuelto reiniciando el backend con el build actual. **No** es un defecto de Práctica libre. En despliegue real, P0 debe estar en el build servido antes de habilitar P1 (ambos ya están en la rama).

---

## I. Mobile UX

- **Entrada:** tile "Práctica libre" (`enabled: true`, copy "Practica con preguntas aleatorias de la materia.", icono `study-mode-practice` sin cambios) → `Cargando práctica…` breve → **primera pregunta directamente**.
- **Header:** `IconButton` close + `Text label` discreto con el nombre de la materia (uppercase). Sin contador.
- **Pregunta:** `StemContent` (heading3 si 1 párrafo; `ContentBlockRenderer` para el resto) + "Selecciona la alternativa correcta." + `AnswerOption` list.
- **Respuesta:** al seleccionar → `answerPracticeQuestion` → la alternativa elegida pasa a `correct`/`incorrect` (server-authoritative), se deshabilitan todas, aparece el bloque de feedback ("Correcto"/"Incorrecto" + explicación) + botón "Continuar".
- **Continuar:** nueva `sample` con `[...seen]`. Fallo → mantiene la pregunta + "Reintentar". `null` → pantalla **exhausted** ("Práctica completada" / "Has practicado todas las preguntas disponibles de esta materia." / "Salir").
- **Empty:** `sample` null en la primera carga → `EmptyState` ("Todavía no hay preguntas disponibles para esta materia.").
- **Error:** fallo de la primera `sample` → `ErrorState` con `onRetry`. Fallo de `answer` → inline, **no avanza**, se puede reintentar (sin cola offline).
- **NO muestra:** timer, LP, XP, score, porcentaje, X/Y fijo, result screen, barra de progreso segmentada.

---

## J. Lenguaje

Las preguntas de Lenguaje de Estudio son **autocontenidas**: el texto de comprensión va embebido en `stemContent` (`toBlocks([...textoA, { type:'paragraph', text:'<pregunta>' }])`), verificado en el contenido real. **No** dependen de `passage` / `passageId` / runner de Ensayos (esos conceptos no existen en Estudio — `grep passage` en `content/estudio/` y `contracts/education.ts` = 0). Práctica libre usa **el mismo renderer** (`ContentBlockRenderer`) para las 5 materias; no hay runner especial por materia.

---

## K. Request / performance model

Por pregunta: **1 × POST `sample` + 1 × POST `answer`**. Distribuidas en el tiempo (una interacción del usuario cada una), nunca un burst.

**No** hay fan-out cliente-side `1 listRootTopics + N listChildTopics + M listPublishedQuestions`. Ciencias **no** descarga sus ~330 preguntas al abrir — el backend elige una al azar. Esto evita el fan-out de ~37 requests iniciales que la auditoría había marcado como inaceptable. El coste entra en el límite global 300/60s por IP como cualquier `GET /education/*`.

---

## L. Stale gate fix

`apps/mobile/scripts/verify-exam-mobile-flow-gate.ts` §13 afirmaba **"los tiles 'recursos' y 'practica-libre' siguen deshabilitados"**. Esa assertion quedó obsoleta cuando el incremento R (Modo Recursos, ya CLOSED) habilitó `recursos`. P1 la reemplazó por **"los cuatro tiles de modalidad están enabled: true"**, con el comentario `// stale assertion discovered during free-practice audit`. El flujo de Ensayos (secciones 1–12, 14–16 del gate) no se tocó.

**Clasificación: stale test assertion — no bug de producto.**

---

## M. Git

- **Archivos cambiados por este cierre:** `docs/adr/STUDY-V1-FREE-PRACTICE-CLOSURE-REPORT.md` (nuevo — este archivo). Nada más.
- **Staged set:** solo este archivo. Sin `git add .`.
- **Protected residue:** intacto, sin stagear.
- **Un commit:** `docs(study): close free practice v1`.
- **No push. No amend. No tag. No Railway. No emulator. Cero cambios de producto.**

---

## N. Implementation history (Git — documentado, no reescrito)

| Increment | Hash | Mensaje |
|---|---|---|
| **P0** | `19cd89494693aeae680520f387642c07c58bfb11` | `feat(study): add stateless free practice api` |
| **P1** | `f7bc6431860cfdd0595da7d57b96ebfcb160d57b` | `feat(study): add free practice mode` |

Cadena verificada: `062021d` (R) → `6c226ab` (Units+Resources closure) → `19cd894` (P0) → `f7bc643` (P1).

### P0 — files
`packages/contracts/src/education.ts` (+38), `apps/backend/src/education/question-version.repository.ts` (+90/−0, aditivo: `findRandomPracticeQuestionForSubject` + `findEligiblePracticeQuestionById`; `findRandomEligible` byte-idéntico), `education.service.ts` (+67; inyecta `AnswerOptionRepository`), `education.controller.ts` (+48; 2 `@Post`), `package.json`, `apps/backend/scripts/verify-free-practice-api-gate.ts` (nuevo, pure `tsx`).

### P1 — files
`apps/mobile/app/(tabs)/estudio/[subjectId]/practica-libre.tsx` (nuevo), `apps/mobile/lib/api/practice.ts` (nuevo), `apps/mobile/scripts/verify-free-practice-gate.ts` (nuevo), `[subjectId]/index.tsx` (tile + `TILE_ROUTE`), `_layout.tsx` (+1 `Stack.Screen`), `package.json`, `verify-exam-mobile-flow-gate.ts` (stale assertion fix).

---

## O. Gate evidence (auditoría final del cierre)

Ejecutados en HEAD `f7bc643`:

| Gate | Resultado |
|---|---|
| `pnpm --filter @axioma/contracts build` / `tsc --noEmit` / `lint` | ✅ |
| `pnpm --filter @axioma/backend exec tsc --noEmit -p tsconfig.json` | ✅ limpio |
| `pnpm --filter @axioma/backend lint` | ✅ limpio |
| `verify:free-practice-api-gate` (P0, pure `tsx`) | ✅ pasaron |
| `pnpm --filter @axioma/mobile exec tsc --noEmit` | ✅ limpio |
| `pnpm --filter @axioma/mobile lint` | ✅ limpio |
| `verify:free-practice-gate` (P1, 56 checks) | ✅ pasaron |
| `verify:exam-mobile-flow-gate` (191 checks, assertion corregida) | ✅ pasaron |
| `verify:study-navigation-gate` | ✅ pasaron |
| `verify:unidades-batch-gate` | ✅ pasaron |
| `verify:recursos-catalog-gate` | ✅ pasaron |
| `verify:unit-motif-gate` | ✅ pasaron |
| `verify:continue-target-batch-gate` | ✅ pasaron |
| `verify:challenges-gate` | ✅ pasaron |
| `verify:api-client-gate` | ✅ pasaron |
| `git diff --check` | ✅ limpio |

### Gates NO ejecutados y por qué

`verify:education-gate`, `verify:quick-question-foundation-gate`, `verify:quick-question-engine-gate`, `verify:quick-question-http-gate`, `verify:progress-gate` — corren vía `scripts/run-gate.ts` contra un **servidor Nest compilado + Postgres**, no disponible localmente (y el prompt prohíbe levantar infra externa / Railway). Protección **estática** en su lugar:
- `findRandomEligible` (Quick Question) byte-idéntico — `verify:free-practice-api-gate` §C asserta 0 líneas eliminadas en `question-version.repository.ts` y que la firma sigue sin filtro de materia;
- `quick-question.service.ts` / `progress.*` / `gamification.*` — `git status` limpio (sin tocar);
- ningún import cruzado nuevo — backend `tsc` limpio;
- P1 no importa `lib/progress/*` ni `lib/offline/*` — `verify:free-practice-gate` §5.

No se corrió ninguna migración, seed ni import de contenido.

---

## P. Closure invariants (frozen — no redefinir silenciosamente)

1. Práctica libre = lane **stateless** separado del académico. Cero escritura en base de datos.
2. Responder en Práctica libre **no** toca `student_response` / `curriculum_topic_progress` / Home / XP / LP / desafíos / Outbox / Prisma.
3. Pool = subject-scoped + recurso canónico + `PUBLISHED` + `question.status ACTIVE`; legacy/fixtures/otra-materia/no-publicado excluidos.
4. Randomización server-side (`ORDER BY random()`). El cliente **no** elige al azar.
5. `sample` es POST (exclude en body); `question: null` = pool agotado (nunca 404).
6. La lista `seen` vive solo en memoria del cliente; se reinicia al salir. No hay reanudación.
7. `isCorrect` es server-authoritative — el cliente nunca lo infiere localmente.
8. Sin temporizador, LP, XP, ranking, score, resultado final, filtros, dificultad, selección de unidad, configuración.
9. `findRandomEligible` (Quick Question) y todo el lane de Progress permanecen intactos.
10. Práctica libre es la 4.ª y última tile de modalidad habilitada; Ensayos permanece fuera.

---

## Q. Non-blocking debt (documentada, no corregida aquí)

| # | Deuda | Nota |
|---|---|---|
| Q.1 | **Sin analytics específico `FREE_PRACTICE`** | Decisión de V1: la práctica es indistinguible de estudio a nivel de datos (coherente con "reforzar conocimientos"). Distinguir requeriría un evento/campo nuevo — fuera de alcance. |
| Q.2 | **Sin offline / outbox** — intencional | Un envío diferido sobre un pool que ya no es la ejecución actual no tiene sentido; mismo criterio que `lib/api/quick-question.ts`. |
| Q.3 | **`seen` no persiste entre ejecuciones** — por diseño | Reentrar = ejecución nueva; puede repetir preguntas de ejecuciones previas. Aceptado por producto. |
| Q.4 | **`ORDER BY random()`** | Suficiente para el catálogo V1 (~980 preguntas/materia máx. 330). Si el catálogo crece muchísimo, podría revisarse (tablesample / muestreo por rango). No es un problema hoy. |
| Q.5 | **`subjectIcon(name)` por nombre visible** | Deuda pre-existente y transversal a Estudio; Práctica libre no la amplía (usa el mismo patrón `{ subjectId, name }`). |

Ninguna es un blocker.

---

## R. Deferred

- **Ensayos / rediseño de Ensayos** — único bloque funcional pendiente de Estudio V1.

---

## S. Tag — decisión

**No se crea tag.** Se sigue exactamente la decisión de `STUDY-V1-UNITS-RESOURCES-CLOSURE-REPORT.md §L`: el repo etiqueta cierres a nivel bloque/fase (`lef-block-*-complete`, `profile-closure-complete`), **no** los cierres de refinamiento de sub-feature (no existe `desafios-v1-complete` ni `cosmetics-v1-complete`), y **Estudio V1 sigue OPEN** (Ensayos pendiente), por lo que un tag `*-complete` sería incorrecto.

---

## FINAL VERDICT

Práctica libre V1 entrega práctica continua stateless de preguntas aleatorias por materia, sobre un lane backend nuevo (2 endpoints POST de lectura pura) totalmente aislado del recorrido académico: cero `student_response`, cero progreso, cero XP/LP, cero desafíos, cero Outbox, cero modelo Prisma. El pool respeta el criterio canónico de Study (materia + recurso canónico publicado, legacy/fixtures excluidos). El coste por pregunta es 2 requests, sin el fan-out cliente-side que la auditoría había rechazado. Lenguaje funciona con el mismo renderer que el resto (preguntas autocontenidas). Quick Question y Progress quedan intactos (`findRandomEligible` byte-idéntico, `run-gate` DB-based no ejecutable local, protección estática documentada). El incidente inicial de QA fue un backend antiguo en ejecución, no un defecto. Suite de gates verde (excepto los DB-based, documentados). QA físico Samsung aprobado por el usuario.

- **UNIDADES V1 — CLOSED.**
- **RECURSOS V1 — CLOSED.**
- **PRÁCTICA LIBRE V1 — CLOSED.**
- **ESTUDIO V1 — OPEN** (pendiente: Ensayos).
