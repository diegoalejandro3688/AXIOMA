import { z } from 'zod';
import { entityId, isoDateTime } from './common';

/**
 * Contratos del dominio PROGRESS -- Bloque III, Vertical Slice M1. Ver
 * docs/adr/0014-progress-foundation.md.
 *
 * PROGRESS sirve el estado particular del estudiante; EDUCATION sirve
 * contenido. Ningún esquema de aquí viaja hacia/desde un endpoint de
 * `/education/*`, y viceversa (ver ADR-0014, punto 3).
 */

export const topicProgressStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);
export type TopicProgressStatus = z.infer<typeof topicProgressStatusSchema>;

// --- GET /progress/topics/:topicId ---

export const studentResponseSummarySchema = z.object({
  questionVersionId: entityId,
  answerOptionId: entityId,
  isCorrect: z.boolean(),
  respondedAt: isoDateTime,
});
export type StudentResponseSummary = z.infer<typeof studentResponseSummarySchema>;

export const topicProgressResponseSchema = z.object({
  curriculumTopicId: entityId,
  status: topicProgressStatusSchema,
  startedAt: isoDateTime.nullable(),
  lastActivityAt: isoDateTime.nullable(),
  completedAt: isoDateTime.nullable(),
  responses: z.array(studentResponseSummarySchema),
});
export type TopicProgressResponse = z.infer<typeof topicProgressResponseSchema>;

// --- POST /progress/topics/:topicId/responses ---

/**
 * Deliberadamente NO declara `isCorrect`, `respondedAt` ni estado de la
 * unidad -- el servidor los calcula siempre (ver ADR-0014, punto 7.6).
 * `operationId` es la clave de idempotencia de transporte (= id de la
 * operación en la cola offline del cliente, ADR-0011).
 */
export const submitResponseRequestSchema = z.object({
  questionVersionId: entityId,
  answerOptionId: entityId,
  operationId: entityId,
});
export type SubmitResponseRequest = z.infer<typeof submitResponseRequestSchema>;

export const submitResponseResponseSchema = z.object({
  questionVersionId: entityId,
  answerOptionId: entityId,
  isCorrect: z.boolean(),
  respondedAt: isoDateTime,
  topicStatus: z.enum(['IN_PROGRESS', 'COMPLETED']),
});
export type SubmitResponseResponse = z.infer<typeof submitResponseResponseSchema>;

/**
 * Cuerpo del 409 -- la alternativa enviada difiere de la ya registrada.
 * Incluye la respuesta existente para que el cliente reconcilie su estado
 * local sin una segunda petición (ver ADR-0014, punto 4).
 */
export const responseConflictBodySchema = z.object({
  error: z.object({
    code: z.literal('RESPONSE_CONFLICT'),
    message: z.string(),
  }),
  existingResponse: studentResponseSummarySchema,
});
export type ResponseConflictBody = z.infer<typeof responseConflictBodySchema>;

// --- GET /progress/me/summary -- LEF Bloque V, Incremento 3 ("Resumen académico privado", docs/adr/LEF-BLOCK-V-DEFINITION.md §11) ---

/**
 * Progreso de UNA materia -- `topicsStarted`/`topicsCompleted` son conteos
 * reales de `curriculum_topic_progress` (nunca estimados); `totalTopics` es
 * el tamaño real del catálogo para esa materia, independiente de si la
 * cuenta ya empezó algo. Toda materia ACTIVA aparece siempre, incluso con
 * 0/0 -- comportamiento determinista para una cuenta nueva (LEF-BLOCK-V-DEFINITION.md,
 * invariante "comportamiento determinista para cuentas nuevas/sin actividad").
 */
export const subjectProgressSummarySchema = z.object({
  subjectKey: z.string(),
  subjectName: z.string(),
  topicsStarted: z.number().int().nonnegative(),
  topicsCompleted: z.number().int().nonnegative(),
  totalTopics: z.number().int().nonnegative(),
});
export type SubjectProgressSummary = z.infer<typeof subjectProgressSummarySchema>;

/**
 * Resumen académico PRIVADO -- endpoint de autoservicio exclusivamente
 * (`GET /progress/me/summary`), NUNCA expuesto en una superficie pública ni
 * cross-cuenta. Deriva EXCLUSIVAMENTE de `student_response`/
 * `curriculum_topic_progress`/catálogo de `curriculum_topic`/`subject` ya
 * existentes -- sin nueva persistencia, sin métrica estimada.
 *
 * `accuracyPercentage: null` cuando `totalQuestionsAnswered === 0` --
 * `0` significaría "0% de precisión" (dato real pero engañoso sin
 * contexto); `null` representa explícitamente "sin datos todavía",
 * distinción exigida por LEF-BLOCK-V-DEFINITION.md ("ausencia de datos
 * debe representarse explícitamente, no como 0 si 0 significaría otra
 * cosa"). Mismo criterio para `lastActivityAt`.
 *
 * Deliberadamente SIN `studyTimeMinutes` ni `essaysCompleted` -- ninguna de
 * las dos métricas tiene una fuente de datos real y confiable en el
 * esquema actual (sin tracking de duración, sin persistencia de
 * ensayos/simulacros) -- documentado como gap de producto, nunca fabricado
 * (ver informe de cierre del Incremento 3).
 */
export const academicSummaryResponseSchema = z.object({
  totalQuestionsAnswered: z.number().int().nonnegative(),
  totalCorrectAnswers: z.number().int().nonnegative(),
  accuracyPercentage: z.number().min(0).max(100).nullable(),
  lastActivityAt: isoDateTime.nullable(),
  progressBySubject: z.array(subjectProgressSummarySchema),
});
export type AcademicSummaryResponse = z.infer<typeof academicSummaryResponseSchema>;
