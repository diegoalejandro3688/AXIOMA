import { z } from 'zod';
import { entityId, isoDateTime } from './common';
import { resourceContentBlocksResponseSchema, explanationContentResponseSchema, answerOptionPublicResponseSchema } from './education';

/**
 * Contratos HTTP del dominio EXAMS / Ensayos V1 (ENSAYOS-F1) -- ver
 * docs/adr/0024-ensayos-foundation.md.
 *
 * Ensayos es un dominio SEPARADO de Study (`ENSAYOS != STUDY BANK`): reutiliza
 * la infraestructura editorial de preguntas (`Question`/`QuestionVersion`/
 * `AnswerOption`) pero NUNCA `StudentResponse`/`CurriculumTopicProgress`, no
 * otorga XP/LP, no toca racha/meta diaria/desafíos y no emite ningún evento
 * de gamificación existente.
 *
 * Todas las rutas de intento operan sobre `request.accountId` (AuthGuard),
 * nunca un id recibido del cliente -- mismo criterio que `/gamification/me/*`.
 * Cada cuerpo de solicitud es `.strict()`, incluidos los vacíos: cualquier
 * propiedad inesperada (p. ej. un intento de enviar `isCorrect` o
 * `questionVersionId` donde no corresponde) falla la validación en vez de
 * ignorarse.
 *
 * `200` uniforme en todas las rutas (mismo criterio que Pregunta rápida):
 * iniciar/reanudar un intento, guardar/cambiar una selección, entregar
 * (incluida la entrega idempotente) son todos éxito HTTP -- lo que importa es
 * el estado resultante, no si esta llamada en particular lo produjo.
 */

export const examStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'RETIRED']);
export type ExamStatus = z.infer<typeof examStatusSchema>;

export const examAttemptStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED']);
export type ExamAttemptStatus = z.infer<typeof examAttemptStatusSchema>;

// --- GET /exams -- listado de ensayos disponibles (solo PUBLISHED) ---

export const examListItemSchema = z.object({
  id: entityId,
  examKey: z.string(),
  title: z.string(),
  subjectId: entityId,
  /** Duración total del ensayo, en segundos (server-authoritative). El cliente deriva el countdown, nunca al revés. */
  durationSeconds: z.number().int().positive(),
  questionCount: z.number().int().nonnegative(),
});
export type ExamListItem = z.infer<typeof examListItemSchema>;

export const examListResponseSchema = z.object({
  exams: z.array(examListItemSchema),
});
export type ExamListResponse = z.infer<typeof examListResponseSchema>;

// --- GET /exams/:examId -- detalle (sin preguntas) ---

export const examDetailResponseSchema = examListItemSchema;
export type ExamDetailResponse = z.infer<typeof examDetailResponseSchema>;

// --- POST /exams/:examId/attempts -- iniciar (o reanudar) un intento ---

export const startExamAttemptBodySchema = z.object({}).strict();
export type StartExamAttemptBody = z.infer<typeof startExamAttemptBodySchema>;

/**
 * `expiresAt` es el instante de expiración PERSISTIDO al iniciar
 * (`startedAt + durationSeconds`) -- un cambio posterior a la duración del
 * `Exam` nunca mueve la expiración de un intento ya en curso. Cerrar/reabrir
 * la app no reinicia el reloj (no hay pausa en V1).
 */
export const examAttemptStateResponseSchema = z.object({
  attemptId: entityId,
  examId: entityId,
  status: examAttemptStatusSchema,
  startedAt: isoDateTime,
  expiresAt: isoDateTime,
  completedAt: isoDateTime.nullable(),
  /** Server-authoritative: instante de la respuesta, para que el cliente calibre su countdown sin confiar en su propio reloj. */
  serverTime: isoDateTime,
});
export type ExamAttemptStateResponse = z.infer<typeof examAttemptStateResponseSchema>;

// --- GET /exams/me/attempts/:attemptId/questions -- entrega ordenada, SIN pauta ---

/**
 * Entrega de preguntas de un intento ACTIVE. Orden fijo por
 * `ExamQuestion.displayOrder` (sin shuffle, sin pool aleatorio en V1). NUNCA
 * incluye `isCorrect`, alternativa correcta ni `explanationContent` -- eso es
 * exclusivo de `/review`, disponible solo tras COMPLETED/EXPIRED. Enforcement
 * de backend, no de UI.
 */
export const examAttemptQuestionSchema = z.object({
  questionVersionId: entityId,
  displayOrder: z.number().int().nonnegative(),
  stemContent: resourceContentBlocksResponseSchema,
  answerOptions: z.array(answerOptionPublicResponseSchema).min(1),
  /** Selección vigente del estudiante para esta pregunta en este intento -- `null` si aún no respondió. */
  selectedAnswerOptionId: entityId.nullable(),
});
export type ExamAttemptQuestion = z.infer<typeof examAttemptQuestionSchema>;

export const examAttemptQuestionsResponseSchema = z.object({
  attemptId: entityId,
  status: examAttemptStatusSchema,
  expiresAt: isoDateTime,
  serverTime: isoDateTime,
  questions: z.array(examAttemptQuestionSchema),
});
export type ExamAttemptQuestionsResponse = z.infer<typeof examAttemptQuestionsResponseSchema>;

// --- PUT /exams/me/attempts/:attemptId/answers -- crear o cambiar la selección de una pregunta ---

/**
 * Deliberadamente SIN `isCorrect` -- lo resuelve el servidor desde
 * `AnswerOption.isCorrect`, jamás el cliente. `operationId` es la clave de
 * idempotencia de transporte, mismo criterio que `submitResponseRequestSchema`
 * (PROGRESS) y `answerQuickQuestionBodySchema` (Pregunta rápida): un reintento
 * de red con el MISMO `operationId` es un no-op que devuelve el estado
 * vigente; un `operationId` distinto sobre la misma pregunta es un CAMBIO
 * deliberado de selección (permitido mientras el intento siga ACTIVE).
 */
export const upsertExamAttemptAnswerBodySchema = z
  .object({
    questionVersionId: entityId,
    answerOptionId: entityId,
    operationId: entityId,
  })
  .strict();
export type UpsertExamAttemptAnswerBody = z.infer<typeof upsertExamAttemptAnswerBodySchema>;

export const upsertExamAttemptAnswerResponseSchema = z.object({
  questionVersionId: entityId,
  selectedAnswerOptionId: entityId,
  /** Estado del intento tras guardar -- siempre ACTIVE en el camino feliz (un intento cerrado rechaza la mutación con 409). */
  attemptStatus: examAttemptStatusSchema,
});
export type UpsertExamAttemptAnswerResponse = z.infer<typeof upsertExamAttemptAnswerResponseSchema>;

// --- POST /exams/me/attempts/:attemptId/submit -- finalización explícita ---

export const submitExamAttemptBodySchema = z.object({}).strict();
export type SubmitExamAttemptBody = z.infer<typeof submitExamAttemptBodySchema>;

/**
 * Desglose de puntaje V1 -- SOLO conteo global. Sin puntaje PAES, sin
 * conversión raw->scaled, sin percentiles (no existe una tabla oficial de
 * transformación en el producto -- ver ADR-0024). El desglose por eje queda
 * `DEFERRED TO ENSAYOS-M1-A METADATA` (la arquitectura aún no puede
 * clasificar cada pregunta por eje de forma robusta sin metadata dedicada).
 *
 * Denominador de `accuracyPercentage`: `correct / totalQuestions` (NO
 * `correct / answered`). Decisión de producto explícita: en una simulación
 * las preguntas sin responder deben penalizar el resultado global.
 * `null` cuando `totalQuestions === 0` (ensayo sin preguntas -- imposible en
 * un ensayo publicado real, defensivo).
 */
export const examAttemptScoreSchema = z.object({
  totalQuestions: z.number().int().nonnegative(),
  answered: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative(),
  unanswered: z.number().int().nonnegative(),
  accuracyPercentage: z.number().min(0).max(100).nullable(),
});
export type ExamAttemptScore = z.infer<typeof examAttemptScoreSchema>;

export const examAttemptResultResponseSchema = z.object({
  attemptId: entityId,
  examId: entityId,
  status: examAttemptStatusSchema,
  startedAt: isoDateTime,
  expiresAt: isoDateTime,
  completedAt: isoDateTime.nullable(),
  score: examAttemptScoreSchema,
});
export type ExamAttemptResultResponse = z.infer<typeof examAttemptResultResponseSchema>;

// --- GET /exams/me/attempts/:attemptId/review -- revisión, SOLO tras COMPLETED/EXPIRED ---

/**
 * Revisión completa: recién aquí se revelan la alternativa correcta,
 * `isCorrect` y `explanationContent`. Un intento ACTIVE pedido aquí recibe
 * 409 -- nunca una respuesta parcial.
 */
export const examAttemptReviewQuestionSchema = z.object({
  questionVersionId: entityId,
  displayOrder: z.number().int().nonnegative(),
  stemContent: resourceContentBlocksResponseSchema,
  answerOptions: z.array(answerOptionPublicResponseSchema).min(1),
  selectedAnswerOptionId: entityId.nullable(),
  correctAnswerOptionId: entityId,
  isCorrect: z.boolean(),
  explanationContent: explanationContentResponseSchema.nullable(),
});
export type ExamAttemptReviewQuestion = z.infer<typeof examAttemptReviewQuestionSchema>;

export const examAttemptReviewResponseSchema = z.object({
  attemptId: entityId,
  examId: entityId,
  status: examAttemptStatusSchema,
  score: examAttemptScoreSchema,
  questions: z.array(examAttemptReviewQuestionSchema),
});
export type ExamAttemptReviewResponse = z.infer<typeof examAttemptReviewResponseSchema>;

// ===========================================================================
// API ADMINISTRATIVA de definición de ensayos -- ENSAYOS-M1-B.
//
// Fachada HTTP mínima sobre `ExamService` (F1 la designó como el único write
// path del importer y el gate). Todas bajo `AdminAuthGuard` + `AdminRoleGuard`
// -- nunca `AuthGuard` de estudiante. Semántica IDEMPOTENTE por clave estable
// (`examKey`, `(examId, questionVersionId)`): `created` distingue CREATE de
// NO-OP; una contradicción estructural es 409, nunca una sobrescritura.
// ===========================================================================

export const adminResolveExamRequestSchema = z
  .object({
    examKey: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(300),
    /** `Subject.subjectKey` real al que se asocia el ensayo (p. ej. "matematica"). Debe existir. */
    subjectKey: z.string().trim().min(1).max(100),
    durationSeconds: z.number().int().positive(),
  })
  .strict();
export type AdminResolveExamRequest = z.infer<typeof adminResolveExamRequestSchema>;

export const adminExamResponseSchema = z.object({
  id: entityId,
  examKey: z.string(),
  title: z.string(),
  subjectId: entityId,
  durationSeconds: z.number().int().positive(),
  status: examStatusSchema,
  /** `true` si esta petición creó el Exam; `false` si ya existía idéntico (NO-OP). */
  created: z.boolean(),
});
export type AdminExamResponse = z.infer<typeof adminExamResponseSchema>;

export const adminLinkExamQuestionRequestSchema = z
  .object({
    questionVersionId: entityId,
    displayOrder: z.number().int().positive(),
  })
  .strict();
export type AdminLinkExamQuestionRequest = z.infer<typeof adminLinkExamQuestionRequestSchema>;

export const adminExamQuestionLinkResponseSchema = z.object({
  id: entityId,
  examId: entityId,
  questionVersionId: entityId,
  displayOrder: z.number().int().positive(),
  /** `true` si esta petición creó el vínculo; `false` si ya existía idéntico (NO-OP). */
  created: z.boolean(),
});
export type AdminExamQuestionLinkResponse = z.infer<typeof adminExamQuestionLinkResponseSchema>;

export const adminPublishExamRequestSchema = z.object({}).strict();
export type AdminPublishExamRequest = z.infer<typeof adminPublishExamRequestSchema>;

export const adminPublishExamResponseSchema = z.object({
  id: entityId,
  examKey: z.string(),
  status: examStatusSchema,
  /** `true` si el ensayo ya estaba PUBLISHED antes de esta petición (NO-OP). */
  alreadyPublished: z.boolean(),
});
export type AdminPublishExamResponse = z.infer<typeof adminPublishExamResponseSchema>;
