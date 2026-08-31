import { z } from 'zod';
import { entityId, isoDateTime } from './common';
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
    /**
     * COMPETITIVE V1 (Incremento 9) -- instante AUTORITATIVO en que expira la
     * ventana de 45 s de esta pregunta (`currentPresentedAt + 45 s`,
     * calculado con el reloj del SERVIDOR). Aditivo. El móvil deriva de
     * aquí el tiempo restante real -- incluso al volver de segundo plano el
     * temporizador NO se reinicia. Una pregunta pendiente representada por
     * `/next` conserva SU `deadlineAt` original (no se concede otra
     * ventana). NUNCA revela la alternativa correcta.
     */
    deadlineAt: isoDateTime,
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
 * Unión discriminada por `outcome` (COMPETITIVE V1, Incremento 9):
 *
 *  - `ANSWERED` -- la respuesta llegó DENTRO de la ventana de 45 s y se
 *    procesó normalmente. `isCorrect` + `correctAnswerOptionId` +
 *    `explanationContent` (nullable -- EDUCATION exige un bloque hoy pero
 *    esta respuesta no lo asume). La clave (`correctAnswerOptionId`) SOLO
 *    aparece aquí, nunca en `/next`. Economía LP sin cambios en este
 *    incremento (sigue `QUICK_QUESTION_ANSWERED +2` por respuesta enviada;
 *    Incremento 10 lo condiciona a acierto).
 *
 *  - `TIMED_OUT` -- la respuesta llegó DESPUÉS de la deadline autoritativa
 *    del servidor: NO se acepta como respuesta (no crea intento, no emite
 *    `quick_question_answered`, **0 LP**), se resuelve como timeout. Un
 *    cliente viejo o modificado no puede responder tarde y obtener
 *    recompensa. Devuelve `correctAnswerOptionId` para que el móvil revele
 *    la correcta.
 */
export const answerQuickQuestionResponseSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('ANSWERED'),
    isCorrect: z.boolean(),
    correctAnswerOptionId: entityId,
    explanationContent: explanationContentResponseSchema.nullable(),
  }),
  z.object({
    outcome: z.literal('TIMED_OUT'),
    correctAnswerOptionId: entityId,
  }),
]);
export type AnswerQuickQuestionResponse = z.infer<typeof answerQuickQuestionResponseSchema>;

// --- POST /gamification/me/quick-question/sessions/:sessionId/timeout ---

export const timeoutQuickQuestionBodySchema = z.object({}).strict();
export type TimeoutQuickQuestionBody = z.infer<typeof timeoutQuickQuestionBodySchema>;

/**
 * COMPETITIVE V1, Incremento 9 -- resolución AUTORITATIVA del timeout de la
 * pregunta pendiente. El móvil lo llama cuando su temporizador visual
 * (derivado de `deadlineAt`) llega a 0. `200` uniforme, mismo criterio que
 * el resto del módulo.
 *
 *  - `TIMED_OUT` -- la ventana expiró: la pregunta queda CONSUMIDA (no
 *    vuelve como pendiente), **0 LP**, sin intento ni evento de reward.
 *    Devuelve `correctAnswerOptionId` para revelar la correcta. Seguro ante
 *    reintento (el segundo intento cae en `NO_PENDING_QUESTION`).
 *  - `NOT_EXPIRED` -- todavía dentro de la ventana: no se consume nada;
 *    devuelve la `deadlineAt` autoritativa para que el móvil re-sincronice.
 *  - `NO_PENDING_QUESTION` -- no hay pregunta pendiente (ya respondida, ya
 *    expirada y consumida, o sesión sin pregunta) -- replay estable, nunca
 *    un 500.
 */
export const timeoutQuickQuestionResponseSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('TIMED_OUT'),
    correctAnswerOptionId: entityId,
  }),
  z.object({
    outcome: z.literal('NOT_EXPIRED'),
    deadlineAt: isoDateTime,
  }),
  z.object({
    outcome: z.literal('NO_PENDING_QUESTION'),
  }),
]);
export type TimeoutQuickQuestionResponse = z.infer<typeof timeoutQuickQuestionResponseSchema>;

// --- POST /gamification/me/quick-question/sessions/:sessionId/close ---

export const closeQuickQuestionBodySchema = z.object({}).strict();
export type CloseQuickQuestionBody = z.infer<typeof closeQuickQuestionBodySchema>;

export const closeQuickQuestionResponseSchema = z.object({
  sessionId: entityId,
  status: z.literal('CLOSED'),
});
export type CloseQuickQuestionResponse = z.infer<typeof closeQuickQuestionResponseSchema>;
