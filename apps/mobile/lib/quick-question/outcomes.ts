import type { QuickQuestionNextResponse, AnswerQuickQuestionResponse, TimeoutQuickQuestionResponse } from '@axioma/contracts';
// Import SOLO de tipo -- se elide en compilación, así este módulo NUNCA
// arrastra en tiempo de ejecución `../api/client.ts`. Gateable con `tsx`
// puro, mismo criterio que `lib/challenges/claim-outcome.ts`.
import type { ApiResult } from '../api/client';

export type QuestionPresented = Extract<QuickQuestionNextResponse, { outcome: 'QUESTION_PRESENTED' }>;

/**
 * Mapeo puro de la respuesta de `/next` -- usado TANTO para la carga
 * inicial/"Siguiente pregunta" COMO para la reconciliación tras un `409`
 * de `/answers` (precisión obligatoria del Product Owner, §3): los
 * mismos tres resultados de dominio en ambos casos.
 * - `question_presented`: puede ser una pregunta GENUINAMENTE nueva o la
 *   pendiente de una sesión reutilizada (precisión #1) -- la UI la
 *   renderiza igual en ambos casos, sin distinguir.
 * - `no_questions`: outcome de dominio (`NO_QUESTIONS_AVAILABLE`), nunca error.
 * - `session_closed`: `409` real del servidor -- la sesión ya no está
 *   ACTIVE. Estado TERMINAL -- nunca se abre otra sesión automáticamente.
 */
export type NextOutcomeView =
  | { kind: 'question_presented'; question: QuestionPresented }
  | { kind: 'no_questions' }
  | { kind: 'session_closed' }
  | { kind: 'network'; message: string }
  | { kind: 'error'; message: string };

export function mapNextResult(result: ApiResult<QuickQuestionNextResponse>): NextOutcomeView {
  if (result.ok) {
    return result.data.outcome === 'QUESTION_PRESENTED' ? { kind: 'question_presented', question: result.data } : { kind: 'no_questions' };
  }
  if (result.kind === 'network') return { kind: 'network', message: result.message };
  if (result.status === 409) return { kind: 'session_closed' };
  return { kind: 'error', message: result.message };
}

/**
 * Mapeo puro de la respuesta de `/answers`. `conflict` (409) es SIEMPRE
 * una respuesta DEFINITIVA del servidor (sesión cerrada o sin pregunta
 * pendiente) -- nunca ambigua, nunca se reintenta con el mismo
 * `operationId`; el llamador debe reconciliar con `mapNextResult` sobre
 * un `/next` nuevo. `network` SÍ es ambiguo -- el llamador debe conservar
 * el `operationId` para un reintento (ver `resolveAnswerOperationId`).
 */
export type AnswerOutcomeView =
  | { kind: 'ok'; data: AnswerQuickQuestionResponse }
  | { kind: 'invalid_option'; message: string }
  | { kind: 'conflict' }
  | { kind: 'network'; message: string }
  | { kind: 'error'; message: string };

export function mapAnswerResult(result: ApiResult<AnswerQuickQuestionResponse>): AnswerOutcomeView {
  if (result.ok) return { kind: 'ok', data: result.data };
  if (result.kind === 'network') return { kind: 'network', message: result.message };
  if (result.status === 400) return { kind: 'invalid_option', message: result.message };
  if (result.status === 409) return { kind: 'conflict' };
  return { kind: 'error', message: result.message };
}

/**
 * Mapeo puro de `/timeout` (Incremento 9 -- resolución AUTORITATIVA del
 * timeout). El servidor es la única autoridad temporal:
 *  - `timed_out`: la ventana expiró de verdad -> revelar `correctAnswerOptionId`.
 *  - `not_expired`: el reloj local iba adelantado -> re-sincronizar con `deadlineAt`.
 *  - `no_pending`: nada pendiente (replay estable, ya resuelto).
 *  - `session_closed` (409): sesión ya cerrada, estado terminal.
 *  - `network`: ambiguo, el llamador puede reintentar (seguro).
 */
export type TimeoutOutcomeView =
  | { kind: 'timed_out'; correctAnswerOptionId: string }
  | { kind: 'not_expired'; deadlineAt: string }
  | { kind: 'no_pending' }
  | { kind: 'session_closed' }
  | { kind: 'network'; message: string }
  | { kind: 'error'; message: string };

export function mapTimeoutResult(result: ApiResult<TimeoutQuickQuestionResponse>): TimeoutOutcomeView {
  if (result.ok) {
    if (result.data.outcome === 'TIMED_OUT') return { kind: 'timed_out', correctAnswerOptionId: result.data.correctAnswerOptionId };
    if (result.data.outcome === 'NOT_EXPIRED') return { kind: 'not_expired', deadlineAt: result.data.deadlineAt };
    return { kind: 'no_pending' };
  }
  if (result.kind === 'network') return { kind: 'network', message: result.message };
  if (result.status === 409) return { kind: 'session_closed' };
  return { kind: 'error', message: result.message };
}

export type PendingAnswerAttempt = { answerOptionId: string; operationId: string };

/**
 * Decide qué `operationId` usar para un envío -- precisión obligatoria
 * del Product Owner (§2): un intento NUEVO (alternativa distinta a la
 * última solicitud pendiente, o sin solicitud pendiente) genera un
 * `operationId` nuevo (vía `generateNew`); un reintento de red AMBIGUO
 * de la MISMA respuesta (mismo `answerOptionId` que la solicitud
 * pendiente) reutiliza EXACTAMENTE el mismo `operationId` -- generar uno
 * nuevo en ese caso arriesgaría que el servidor interprete el reintento
 * como un segundo intento legítimo tras un envío que en realidad sí tuvo
 * éxito (ambigüedad de red, no de negocio).
 */
export function resolveAnswerOperationId(pending: PendingAnswerAttempt | null, answerOptionId: string, generateNew: () => string): string {
  if (pending && pending.answerOptionId === answerOptionId) return pending.operationId;
  return generateNew();
}
