import {
  createAiConversationResponseSchema,
  listAiConversationsResponseSchema,
  aiConversationDetailResponseSchema,
  sendAiMessageResponseSchema,
  reportAiMessageResponseSchema,
  aiMeStatusResponseSchema,
  type AiAssistanceMode,
  type AiResponseReportType,
  type CreateAiConversationResponse,
  type ListAiConversationsResponse,
  type AiConversationDetailResponse,
  type SendAiMessageResponse,
  type ReportAiMessageResponse,
  type AiMeStatusResponse,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrappers tipados sobre el Tutor IA (LEF Bloque VI, Incrementos 1-7, ya
 * cerrados) -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §21-§27. Todos operan
 * sobre `request.accountId` (AuthGuard); este cliente NUNCA envía un
 * accountId, ni un username, ni ningún identificador de cuenta.
 *
 * Los esquemas se IMPORTAN de `@axioma/contracts` -- nunca se redeclara ni se
 * duplica a mano ninguna forma de `ai.ts` en mobile (mismo criterio que
 * `lib/api/quick-question.ts`/`lib/api/advanced-profile.ts`).
 *
 * ONLINE-ONLY -- el Tutor IA nunca compone con la cola offline de ADR-0011:
 * una consulta encolada consumiría cupo y turnos contra un estado (cuota del
 * día, límite de turnos) que puede haber cambiado, y el estudiante no vería
 * la respuesta en el momento en que la operación finalmente saliera. Este
 * archivo -- y toda la lógica de `lib/ai/*` -- NUNCA importa `lib/offline/*`.
 */
const BASE = '/ai/me/conversations';
const STATUS_PATH = '/ai/me/status';

/**
 * Estado de cuenta del Tutor (cuota diaria + disclaimer) SIN necesitar una
 * conversación -- ver `aiMeStatusResponseSchema` en `@axioma/contracts`.
 * Existe exclusivamente para el caso "historial vacío": antes, ambos valores
 * solo llegaban dentro de la respuesta de una conversación, y una cuenta
 * nueva no tenía ninguna. Es una LECTURA pura: no crea conversación, no
 * consume cuota, no invoca al proveedor.
 *
 * Si falla, el llamador muestra un estado de error/carga honesto -- NUNCA un
 * valor de cuota ni un texto de disclaimer inventado en el cliente.
 */
export function getAiStatus(): Promise<ApiResult<AiMeStatusResponse>> {
  return apiRequest('GET', STATUS_PATH, { schema: aiMeStatusResponseSchema });
}

/**
 * Contexto académico desde Estudio (Incremento 4, punto de entrada 2): SOLO
 * un identificador mínimo/autorizado. El cliente jamás fabrica materia,
 * respuesta correcta, explicación ni progreso -- el backend los resuelve
 * desde sus fuentes canónicas (`AiAcademicContextBuilder`), y el contrato
 * (`.strict()`) rechaza cualquier campo adicional.
 */
export interface CreateAiConversationInput {
  contextQuestionVersionId?: string;
  contextCurriculumTopicId?: string;
}

export function createAiConversation(input: CreateAiConversationInput = {}): Promise<ApiResult<CreateAiConversationResponse>> {
  const body: Record<string, string> = {};
  if (input.contextQuestionVersionId) body.contextQuestionVersionId = input.contextQuestionVersionId;
  if (input.contextCurriculumTopicId) body.contextCurriculumTopicId = input.contextCurriculumTopicId;
  return apiRequest('POST', BASE, { body, schema: createAiConversationResponseSchema });
}

export function listAiConversations(): Promise<ApiResult<ListAiConversationsResponse>> {
  return apiRequest('GET', BASE, { schema: listAiConversationsResponseSchema });
}

export function getAiConversation(conversationId: string): Promise<ApiResult<AiConversationDetailResponse>> {
  return apiRequest('GET', `${BASE}/${conversationId}`, { schema: aiConversationDetailResponseSchema });
}

/**
 * `operationId` es responsabilidad del llamador -- ver
 * `lib/ai/send-outcome.ts` (`resolveSendOperationId`) para el criterio exacto
 * de reutilización (reintento de la MISMA operación lógica) frente a
 * generación de uno nuevo (operación nueva).
 *
 * `requestedMode` AUSENTE (undefined) se omite del cuerpo -- nunca se envía
 * un modo por defecto desde el cliente; el backend aplica su propia
 * progresión conservadora (`ai-pedagogy.ts`), que nunca es `WORKED_SOLUTION`.
 */
export function sendAiMessage(
  conversationId: string,
  input: { content: string; operationId: string; requestedMode?: AiAssistanceMode | null },
): Promise<ApiResult<SendAiMessageResponse>> {
  const body: Record<string, unknown> = { content: input.content, operationId: input.operationId };
  if (input.requestedMode) body.requestedMode = input.requestedMode;
  return apiRequest('POST', `${BASE}/${conversationId}/messages`, { body, schema: sendAiMessageResponseSchema });
}

/** Incremento 7 -- borrado manual real (204, sin papelera). El llamador reconcilia recargando la lista, nunca eliminando la fila localmente por su cuenta. */
export function deleteAiConversation(conversationId: string): Promise<ApiResult<void>> {
  return apiRequest('DELETE', `${BASE}/${conversationId}`);
}

/** Incremento 6 (PRD AI-015) -- solo mensajes ASSISTANT son reportables; el backend rechaza (400) reportar un mensaje USER. */
export function reportAiMessage(
  conversationId: string,
  messageId: string,
  input: { reportType: AiResponseReportType; description?: string },
): Promise<ApiResult<ReportAiMessageResponse>> {
  const body: Record<string, unknown> = { reportType: input.reportType };
  if (input.description) body.description = input.description;
  return apiRequest('POST', `${BASE}/${conversationId}/messages/${messageId}/report`, { body, schema: reportAiMessageResponseSchema });
}
