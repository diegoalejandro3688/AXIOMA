import {
  quickQuestionSessionResponseSchema,
  quickQuestionNextResponseSchema,
  answerQuickQuestionResponseSchema,
  closeQuickQuestionResponseSchema,
  type QuickQuestionSessionResponse,
  type QuickQuestionNextResponse,
  type AnswerQuickQuestionResponse,
  type CloseQuickQuestionResponse,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrappers tipados sobre el Incremento 4 (Pregunta rápida, 4.a-4.c, ya
 * cerrado) -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.4. Todos operan
 * sobre `request.accountId` (AuthGuard), este cliente nunca envía un
 * accountId explícito.
 *
 * ONLINE-ONLY -- Pregunta rápida usa advisory locks por sesión en el
 * servidor (exclusión mutua entre `next`/`answer`/`close`, §13), sin
 * componer con la cola offline de ADR-0011 (encolar una respuesta
 * mientras la sesión pudo cerrarse o agotarse en el servidor produciría
 * un reintento diferido sobre un estado que ya no existe). Este archivo
 * -- y toda la lógica de `lib/quick-question/*` -- NUNCA importa
 * `lib/offline/*`.
 */
const BASE = '/gamification/me/quick-question/sessions';

export function openQuickQuestionSession(): Promise<ApiResult<QuickQuestionSessionResponse>> {
  return apiRequest('POST', BASE, { body: {}, schema: quickQuestionSessionResponseSchema });
}

export function nextQuickQuestion(sessionId: string): Promise<ApiResult<QuickQuestionNextResponse>> {
  return apiRequest('POST', `${BASE}/${sessionId}/next`, { body: {}, schema: quickQuestionNextResponseSchema });
}

/** `operationId` es responsabilidad del llamador -- ver `lib/quick-question/outcomes.ts` (`resolveAnswerOperationId`) para el criterio de reutilización ante reintento de red. */
export function answerQuickQuestion(sessionId: string, answerOptionId: string, operationId: string): Promise<ApiResult<AnswerQuickQuestionResponse>> {
  return apiRequest('POST', `${BASE}/${sessionId}/answers`, { body: { answerOptionId, operationId }, schema: answerQuickQuestionResponseSchema });
}

export function closeQuickQuestionSession(sessionId: string): Promise<ApiResult<CloseQuickQuestionResponse>> {
  return apiRequest('POST', `${BASE}/${sessionId}/close`, { body: {}, schema: closeQuickQuestionResponseSchema });
}
