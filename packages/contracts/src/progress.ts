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

// --- GET /progress/topics?topicIds=... ---

/**
 * Cota de la solicitud batch -- EDUCATION no pagina `GET
 * /subjects/:id/topics`, así que un cliente que necesita el progreso de
 * TODOS los temas raíz de una materia (ej. "Continuar estudiando" en
 * Inicio) podía antes disparar un `GET /progress/topics/:id` POR CADA
 * tema (fan-out N+1, ver hallazgo de rate-limit). Este endpoint colapsa
 * eso en UNA sola solicitud; el máximo es una cota de API de propósito
 * general (protege cualquier catálogo sin acotar), no un filtro sobre el
 * contenido solicitado.
 *
 * 300, no 500: `topicIds` viaja en la query string (GET, no un body) --
 * verificado empíricamente que Node rechaza la solicitud con 431 (Request
 * Header Fields Too Large, `--max-http-header-size` por defecto 16 KiB)
 * a partir de ~450 UUIDs (~16.6 KB solo en el parámetro, antes de sumar
 * `authorization`/`x-session-id`/el resto de cabeceras); 400 UUIDs
 * (~14.8 KB) sí llegan al servidor. 300 dejas margen real sobre esa
 * frontera medida, no un número arbitrario.
 */
export const MAX_TOPIC_PROGRESS_BATCH_IDS = 300;

export const topicProgressBatchQuerySchema = z.object({
  topicIds: z.array(entityId).min(1).max(MAX_TOPIC_PROGRESS_BATCH_IDS),
});
export type TopicProgressBatchQuery = z.infer<typeof topicProgressBatchQuerySchema>;

/**
 * Mismo shape por tema que `GET /progress/topics/:topicId` (reutiliza
 * `topicProgressResponseSchema` sin cambios), en un array -- un elemento
 * por cada `topicId` solicitado que corresponde a un `curriculum_topic`
 * real. IDs que no existen se omiten en silencio (mismo criterio "best
 * effort sobre un lote ya acotado" que ya usa `getAcademicSummary`), nunca
 * un 404 parcial que rompa el resto del lote.
 */
export const topicProgressBatchResponseSchema = z.array(topicProgressResponseSchema);
export type TopicProgressBatchResponse = z.infer<typeof topicProgressBatchResponseSchema>;

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
 * Progreso de UNA materia, en RECURSOS CANÓNICOS (PROFILE-01). Un recurso
 * canónico es un `curriculum_topic` hijo con `learning_resource_version`
 * PUBLISHED -- misma definición que Study; excluye unidades raíz, topics
 * legacy y drift. `topicsStarted`/`topicsCompleted` son conteos reales de
 * `curriculum_topic_progress` sobre esos recursos (nunca estimados);
 * `totalTopics` es el número de recursos canónicos de la materia (catálogo
 * V1: 16/8/14/33/27), independiente de si la cuenta empezó algo. Toda
 * materia ACTIVA aparece siempre, incluso con 0/0 -- comportamiento
 * determinista para una cuenta nueva. (Los nombres `*Topics` se conservan
 * por compatibilidad de contrato -- un recurso canónico ES un topic.)
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

// --- GET/POST /progress/topics/:topicId/resource-completion (XP-V1B-2) ---

/**
 * Estado de completitud DERIVADO de `learning_resource_progress`
 * (presencia/ausencia de fila, nunca un tercer estado): `NOT_COMPLETED` es
 * la ausencia de fila, `COMPLETED` su presencia. `completedAt` es el
 * instante de la PRIMERA completitud -- inmutable, nunca cambia en llamadas
 * posteriores (ni por reabrir el recurso ni por una nueva versión editorial
 * del mismo recurso canónico).
 */
export const resourceCompletionSchema = z.object({
  status: z.enum(['NOT_COMPLETED', 'COMPLETED']),
  completedAt: isoDateTime.nullable(),
});
export type ResourceCompletion = z.infer<typeof resourceCompletionSchema>;

/**
 * `POST .../resource-completion` -- acción explícita "Completar recurso".
 * Idempotente, mismo criterio que el resto de PROGRESS: primera llamada real
 * -> `justCompleted = true`; cualquier llamada posterior sobre un recurso ya
 * completado -> 200 idempotente, `justCompleted = false`, `completedAt` SIN
 * cambiar -- nunca un 409 solo por ya estar completo.
 */
export const completeResourceResponseSchema = z.object({
  completion: resourceCompletionSchema,
  justCompleted: z.boolean(),
});
export type CompleteResourceResponse = z.infer<typeof completeResourceResponseSchema>;
