import { z } from 'zod';
import { entityId } from './common';
import { resourceContentBlocksResponseSchema, explanationContentResponseSchema, answerOptionPublicResponseSchema } from './education';

/**
 * Contratos HTTP de Pregunta rápida (Bloque IV, Incremento 4, sub-incremento
 * 4.c) -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.4. Todos operan sobre
 * `request.accountId` (AuthGuard), nunca un id recibido del cliente -- mismo
 * criterio que el resto de `/gamification/me/*`.
 *
 * Cada cuerpo de solicitud es `.strict()`, incluidos los vacíos -- cualquier
 * propiedad inesperada (incluido un intento de enviar `questionVersionId`)
 * falla la validación en vez de ser ignorada silenciosamente. Precisión
 * obligatoria del Product Owner (2026-08-06): `200` uniforme para creación/
 * reutilización de sesión, respuestas (incluido el replay) y cierre
 * (incluido el idempotente) -- nunca `201`, el estado de la sesión y del
 * intento importa más que si esta llamada en particular fue la que lo creó.
 */

// --- POST /gamification/me/quick-question/sessions ---

export const openQuickQuestionSessionBodySchema = z.object({}).strict();
export type OpenQuickQuestionSessionBody = z.infer<typeof openQuickQuestionSessionBodySchema>;

export const quickQuestionSessionResponseSchema = z.object({
  sessionId: entityId,
  status: z.literal('ACTIVE'),
});
export type QuickQuestionSessionResponse = z.infer<typeof quickQuestionSessionResponseSchema>;

// --- POST /gamification/me/quick-question/sessions/:sessionId/next ---

export const nextQuickQuestionBodySchema = z.object({}).strict();
export type NextQuickQuestionBody = z.infer<typeof nextQuickQuestionBodySchema>;

/**
 * Precisión obligatoria del Product Owner (2026-08-06): SIN `questionVersionId`
 * en la respuesta -- el cliente nunca lo necesita, la pregunta pendiente ya
 * está ligada server-side a la sesión (`/answers` la resuelve internamente).
 * `answerOptions` reutiliza `answerOptionPublicResponseSchema` de EDUCATION
 * (mismo contrato que `GET /education/.../questions`) -- SIN `isCorrect` en
 * ninguna alternativa, misma exclusión incondicional que EDUCATION.
 */
export const quickQuestionNextResponseSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('QUESTION_PRESENTED'),
    stemContent: resourceContentBlocksResponseSchema,
    answerOptions: z.array(answerOptionPublicResponseSchema).min(1),
  }),
  z.object({
    outcome: z.literal('NO_QUESTIONS_AVAILABLE'),
  }),
]);
export type QuickQuestionNextResponse = z.infer<typeof quickQuestionNextResponseSchema>;

// --- POST /gamification/me/quick-question/sessions/:sessionId/answers ---

/**
 * Deliberadamente SIN `questionVersionId` -- el servidor resuelve la
 * pregunta pendiente desde `session.currentQuestionVersionId`, nunca desde
 * el cliente (§13.2). `operationId` es la clave de idempotencia de
 * transporte, mismo criterio que `submitResponseRequestSchema` (PROGRESS).
 */
export const answerQuickQuestionBodySchema = z
  .object({
    answerOptionId: entityId,
    operationId: entityId,
  })
  .strict();
export type AnswerQuickQuestionBody = z.infer<typeof answerQuickQuestionBodySchema>;

/**
 * `explanationContent` nullable -- defensivo: el esquema de EDUCATION exige
 * al menos un bloque hoy, pero esta respuesta no debe asumirlo para
 * siempre. `isCorrect` resuelto exclusivamente por el servidor.
 */
export const answerQuickQuestionResponseSchema = z.object({
  isCorrect: z.boolean(),
  explanationContent: explanationContentResponseSchema.nullable(),
});
export type AnswerQuickQuestionResponse = z.infer<typeof answerQuickQuestionResponseSchema>;

// --- POST /gamification/me/quick-question/sessions/:sessionId/close ---

export const closeQuickQuestionBodySchema = z.object({}).strict();
export type CloseQuickQuestionBody = z.infer<typeof closeQuickQuestionBodySchema>;

export const closeQuickQuestionResponseSchema = z.object({
  sessionId: entityId,
  status: z.literal('CLOSED'),
});
export type CloseQuickQuestionResponse = z.infer<typeof closeQuickQuestionResponseSchema>;
