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
