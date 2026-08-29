# ADR 0024 — Fundación del dominio EXAMS / Ensayos V1 (ENSAYOS-F1)

- **Estado**: **APROBADA (2026-08-28)** — decisiones de producto/arquitectura de ENSAYOS-F1 congeladas en el handoff "ZETRYND — ENSAYOS-F1", implementadas en este incremento.
- **Fecha**: 2026-08-28
- **Fase de aplicación**: Ensayos V1 — primer incremento (`ENSAYOS-F1`, "Fundación del dominio"). Precede a `ENSAYOS-M1-A` (source), `ENSAYOS-M1-B` (import DB), `ENSAYOS-M1-C` (mobile), `ENSAYOS-M1-D` (E2E).
- **Responsable de aprobación**: Product Owner (usuario).
- **Nivel de decisión** (Master Context §11.9): **Nivel 2 — dominio nuevo con fronteras transversales duras** (aislamiento frente a Study/gamificación, reutilización de la infraestructura editorial de preguntas).
- **Documentos fuente**: handoff "ZETRYND — ENSAYOS V1" (scope congelado, blueprint M1/M2); handoff "ZETRYND — ENSAYOS-M1-PRE" (reconnaissance técnico, APPROVED); handoff "ZETRYND — ENSAYOS-F1" (§3 decisiones congeladas, §6 semántica objetivo, §25 estrategia de test). ADRs relacionados: `0012-education-foundation.md` (identidad de pregunta reutilizada), `0014-progress-foundation.md` (`accountId` sin FK, inmutabilidad por trigger), `0016-gamificacion-fundacion.md` (aislamiento), `0002-renderizador-matematico.md` (bloques `formula`), `0010-almacenamiento-de-contenido.md` (URL firmada de imágenes).

## Contexto y problema

El reconnaissance técnico (`ENSAYOS-M1-PRE`) estableció que **no existía ningún dominio de Ensayos**: ni modelo, ni endpoints, ni temporizador, ni scoring; `content/ensayo/` vacío; en mobile solo un tile "Ensayo" deshabilitado. El precedente más cercano de "sesión repetible con corrección server-side" era `QuickQuestionSession`/`QuickQuestionAttempt`, pero sin tiempo, sin orden fijo, sin resultado.

El blueprint editorial exige que un Ensayo M1 tenga 65 preguntas en **orden fijo**, **2 h 20 min** de duración, exactamente 4 alternativas y 1 correcta por pregunta, resultado y revisión. Nada de eso tiene dónde vivir en el esquema actual (ni source ni DB): `QuestionVersion` no persiste `difficulty`, `order` ni `primarySkill`.

## Decisión

```
DOMINIO EXAMS / ENSAYOS V1 — AXIOMA
Módulo backend:  apps/backend/src/exams  (ExamsModule, top-level en app.module)
Contratos:       packages/contracts/src/exams.ts
Tablas:          exam, exam_question, exam_attempt, exam_attempt_answer
Migración:       20260828120000_exams_foundation
Gate:            verify:exam-foundation-gate  (axioma_gates_dev)
```

### 1. Ensayos es un dominio SEPARADO de Study (`ENSAYOS != STUDY BANK`)

Reutiliza **solo** la infraestructura editorial de preguntas: `Question` / `QuestionVersion` / `AnswerOption` (identidad + versión publicada + pauta). NUNCA:

- usa `StudentResponse` (banco Study, `@@unique([accountId, questionVersionId])` global e inmutable — impediría reintentos);
- escribe `CurriculumTopicProgress` (avanzaría/―completaría temas de Study);
- otorga XP / LP;
- toca racha / meta diaria / desafíos Study/Competir;
- emite `student_response_recorded` / `curriculum_topic_completed` / `quick_question_answered` ni ningún otro evento de gamificación;
- publica al Outbox (`ExamsModule` **no importa** `OutboxModule`, a propósito).

La corrección (`isCorrect`) se resuelve server-side leyendo `AnswerOption.isCorrect` vía `AnswerOptionRepository` de EDUCATION — mismo mecanismo que Pregunta rápida, nunca el de PROGRESS. El gate `verify:exam-foundation-gate` demuestra que un ciclo completo de intento produce **0 filas** en `student_response` / `curriculum_topic_progress` / `validated_gamification_activity` / `xp_ledger_entry` / `league_point_ledger_entry` y **0 eventos** de gamificación.

### 2. Namespace editorial separado, catálogo Study intacto

Las futuras preguntas de Ensayos usarán un namespace propio (`ENSAYO.M1.*`) y **no** formarán parte del `CONTENT_MANIFEST` de Study. El catálogo Study permanece **98 Learning Resources / 980 Questions**. `ENSAYOS-F1` NO carga ninguna pregunta: `content/ensayo/` sigue sin contenido productivo; el loader de Study (`content/load.ts`) no toca `content/ensayo/`.

### 3. Metadata editorial: NO se contamina `QuestionVersion`

`order`, `difficulty`, `axis`, `primarySkill`, duración del ensayo **no** se agregan a `QuestionVersion`. Lo que ENSAYOS-F1 sí introduce como runtime schema legítimo:

- **`Exam.durationSeconds`** — duración total del ensayo.
- **`ExamQuestion.displayOrder`** — el orden de presentación vive AQUÍ, no en la pregunta. `@@unique([examId, displayOrder])` y `@@unique([examId, questionVersionId])` garantizan una posición por pregunta y sin duplicados.

`difficulty` / `primarySkill` por pregunta y el **desglose de puntaje por eje** quedan `DEFERRED TO ENSAYOS-M1-A METADATA` — la arquitectura aún no puede clasificar cada pregunta por eje sin metadata dedicada. El scoring **global** sí es obligatorio y está implementado.

### 4. Timer server-authoritative, sin pausa

`ExamAttempt.expiresAt` se **persiste al iniciar** (`startedAt + durationSeconds`), no se deriva en cada lectura: un cambio posterior a `Exam.durationSeconds` nunca mueve la expiración de un intento en curso, y cerrar/reabrir la app no reinicia el reloj. **No hay pausa** (sin `pausedAt` / resume token / acumulador).

Expiración por **transición perezosa**: cualquier lectura/mutación que encuentre `now >= expiresAt` en un intento `ACTIVE` lo transiciona a `EXPIRED` antes de continuar. Sin cron, sin job de fondo. Respaldo de base de datos: el trigger `enforce_exam_attempt_answer_frozen_after_close` rechaza toda respuesta pasada la expiración aunque la transición perezosa no haya corrido.

### 5. Ciclo de vida forward-only

```
ACTIVE ──(submit explícito)──▶ COMPLETED
   │
   └────(now >= expiresAt)────▶ EXPIRED
```

Nunca hacia atrás, nunca `COMPLETED <-> EXPIRED`. Reforzado por el trigger `enforce_exam_attempt_status_transition` (mismo criterio que `enforce_quick_question_session_status_transition`).

### 6. Intentos repetibles; un solo ACTIVE por (cuenta, ensayo)

NO existe `@@unique([accountId, examId])` global — un usuario rinde el mismo ensayo N veces. El índice único **parcial** `exam_attempt_one_active_per_account_exam` (`WHERE status = 'ACTIVE'`, mismo patrón que `quick_question_session_one_active_per_account`) permite a lo sumo un intento `ACTIVE` por `(cuenta, ensayo)`. `startAttempt` es idempotente bajo advisory lock (namespace 24): si ya hay uno `ACTIVE` no expirado lo **reanuda**; si expiró lo marca `EXPIRED` y crea uno nuevo.

### 7. Respuestas: crear o cambiar mientras ACTIVE; inmutables tras el cierre

Una sola fila por `(attemptId, questionVersionId)` (`@@unique`). Cambiar de alternativa antes de entregar = **UPDATE** de esa misma fila (`upsert` controlado en `ExamAttemptAnswerRepository`). `operationId` es idempotencia de transporte (mismo patrón que `StudentResponse.operationId`): un reintento con el MISMO id devuelve el estado vigente sin re-escribir; un id distinto sobre la misma pregunta es un cambio deliberado. Tras `COMPLETED`/`EXPIRED` las respuestas son **inmutables** — el trigger `enforce_exam_attempt_answer_frozen_after_close` bloquea INSERT/UPDATE (DELETE no se bloquea: es retención de datos, no mutación; no hay cascade destructivo hacia estas filas).

### 8. Scoring V1: solo conteo global, SIN puntaje PAES

`score(attempt)` server-side, nunca confía en conteos del cliente:

```
totalQuestions  = |exam_question del ensayo|
answered        = |exam_attempt_answer del intento|
correct         = |exam_attempt_answer con is_correct = true|
incorrect       = answered - correct
unanswered      = totalQuestions - answered
accuracyPercentage = round( correct / totalQuestions * 100 , 1 )    (null si totalQuestions = 0)
```

**Denominador = `correct / totalQuestions`** (NO `correct / answered`): decisión de producto explícita — en una simulación las preguntas sin responder deben penalizar el resultado global. NO se implementa puntaje PAES, conversión raw→scaled, percentiles, ranking, rewards, XP ni LP — **no existe una tabla oficial de transformación PAES en el producto**; documentado como gap, nunca fabricado.

### 9. Seguridad de pauta: enforcement de backend

Antes de `COMPLETED`/`EXPIRED`, ninguna respuesta expone `isCorrect`, la alternativa correcta ni `explanationContent`:

- `GET /exams/me/attempts/:id/questions` — enunciado, alternativas ordenadas (`answerOptionPublicResponseSchema`, sin `isCorrect`), y la selección propia. Solo mientras `ACTIVE` (409 si ya finalizó → usar revisión).
- `GET /exams/me/attempts/:id/review` — **409 mientras `ACTIVE`**. Tras `COMPLETED`/`EXPIRED` revela `correctAnswerOptionId`, `isCorrect` y `explanationContent`.

Orden fijo por `ExamQuestion.displayOrder`. Sin shuffle, sin pool aleatorio en V1.

### 10. API

| Método | Ruta | Propósito |
| --- | --- | --- |
| `GET` | `/exams` | Ensayos disponibles (solo `PUBLISHED`) + `questionCount` |
| `GET` | `/exams/:examId` | Detalle (404 uniforme si no publicado/inexistente) |
| `POST` | `/exams/:examId/attempts` | Iniciar o reanudar un intento (200, nunca 201) |
| `GET` | `/exams/me/attempts/:attemptId` | Estado del intento (+ transición perezosa) |
| `GET` | `/exams/me/attempts/:attemptId/questions` | Entrega ordenada, SIN pauta |
| `PUT` | `/exams/me/attempts/:attemptId/answers` | Crear o cambiar una selección |
| `POST` | `/exams/me/attempts/:attemptId/submit` | Finalización explícita (idempotente) |
| `GET` | `/exams/me/attempts/:attemptId/result` | Resultado (score) |
| `GET` | `/exams/me/attempts/:attemptId/review` | Revisión completa (solo tras cierre) |

Todas bajo `AuthGuard`, todas sobre `request.accountId` — nunca un id del body. Cuerpos `.strict()` (incluidos los vacíos). Usuario A no puede leer/responder/entregar/revisar un intento de B (404 uniforme). La escritura de definición de ensayo (crear `Exam`, vincular `ExamQuestion`, publicar) **no se expone por HTTP en F1** — `ExamService` la ofrece como camino único para el importer de `ENSAYOS-M1-B` y el gate.

## Alcance de este ADR (lo que deliberadamente NO decide)

- NO carga las 65 preguntas M1 ni ninguna de M2/Lectora/Historia/Ciencias.
- NO construye UI mobile (el tile sigue deshabilitado). NO crea rutas de mobile.
- NO implementa puntaje PAES / conversión raw→scaled / percentiles / adaptativo / shuffle / generación aleatoria / pausa / rankings / logros / gating premium / notificaciones.
- NO toca Railway.
- NO decide la forma del árbol `ENSAYO.M1.*` de `CurriculumTopic` (eso es `ENSAYOS-M1-A`).

## Consecuencias

- El dominio queda listo para que `ENSAYOS-M1-A` cargue el source APPROVED y `ENSAYOS-M1-B` lo importe/vincule vía `ExamService`.
- El desglose por eje del resultado necesitará la metadata de `ENSAYOS-M1-A`; hasta entonces el resultado es solo global.
- `verify:exam-foundation-gate` cubre: definición + vínculos ordenados (orden/pregunta duplicados rechazados; versión no publicada rechazada), inicio (ACTIVE, timestamps, expiración, no-duplicación), respuesta (crear/cambiar/replay, validaciones, cross-account), timer (respuesta antes/después de expirar, transición a EXPIRED, inmutabilidad), submit (ACTIVE→COMPLETED, idempotente, EXPIRED no se convierte en COMPLETED), score (fixture exacto 5 preguntas → 2/3 correctas → 40%), seguridad de revisión (sin fuga antes del cierre; pauta+explicación después), repetibilidad, y **aislamiento total** frente a Study/gamificación.
