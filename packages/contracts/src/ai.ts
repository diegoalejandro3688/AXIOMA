import { z } from 'zod';
import { entityId, isoDateTime } from './common';

/**
 * Contratos del Tutor IA -- LEF Bloque VI, Incremento 1 ("Fundación
 * conversacional"), ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §21. Todos los
 * endpoints operan sobre `request.accountId` (AuthGuard), nunca un id
 * recibido del cliente -- mismo criterio que el resto de `/*\/me/*` del
 * proyecto. Whitelisting explícito: nunca se expone `accountId`, ningún
 * detalle interno del proveedor, ni `operationId` (concepto de transporte
 * del cliente, no algo que el cliente necesite leer de vuelta).
 *
 * Fuera de alcance todavía (ver definición del bloque): contexto académico,
 * comportamiento pedagógico progresivo, seguridad de actividades protegidas
 * -- ninguno de esos conceptos aparece en estos contratos. La cuota diaria
 * (`dailyQuota`) SÍ es parte del contrato desde el Incremento 3.
 */

export const aiMessageRoleSchema = z.enum(['USER', 'ASSISTANT']);
export type AiMessageRole = z.infer<typeof aiMessageRoleSchema>;

export const aiMessageResponseSchema = z.object({
  id: entityId,
  role: aiMessageRoleSchema,
  content: z.string(),
  sequence: z.number().int().nonnegative(),
  createdAt: isoDateTime,
});
export type AiMessageResponse = z.infer<typeof aiMessageResponseSchema>;

/**
 * Cuota diaria de consultas (Incremento 3, día calendario UTC) -- el
 * cliente NUNCA decide localmente cuántas consultas quedan, siempre lee este
 * valor ya resuelto por el servidor. `consumed`/`remaining` reflejan el
 * ledger append-only (`ai_usage_ledger`); `resetAt` es el inicio del
 * siguiente día UTC. Nunca incluye coste ni tokens -- esos son detalles
 * internos, no información que el cliente necesite.
 */
export const aiDailyQuotaResponseSchema = z.object({
  limit: z.number().int().positive(),
  consumed: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  resetAt: isoDateTime,
});
export type AiDailyQuotaResponse = z.infer<typeof aiDailyQuotaResponseSchema>;

/**
 * `turnCount`/`maxTurns` ya reflejan la decisión B del bloque (6 Free / 15
 * Premium) -- el cliente NUNCA decide localmente si quedan turnos, siempre
 * lee este valor ya resuelto por el servidor. `dailyQuota` es independiente
 * de `turnCount`/`maxTurns` -- uno es por conversación, el otro por cuenta y
 * por día (Incremento 3).
 */
export const aiConversationSummaryResponseSchema = z.object({
  conversationId: entityId,
  createdAt: isoDateTime,
  lastMessageAt: isoDateTime.nullable(),
  turnCount: z.number().int().nonnegative(),
  maxTurns: z.number().int().positive(),
  dailyQuota: aiDailyQuotaResponseSchema,
});
export type AiConversationSummaryResponse = z.infer<typeof aiConversationSummaryResponseSchema>;

// --- POST /ai/me/conversations ---

export const createAiConversationRequestSchema = z.object({}).strict();
export type CreateAiConversationRequest = z.infer<typeof createAiConversationRequestSchema>;

export const createAiConversationResponseSchema = aiConversationSummaryResponseSchema;
export type CreateAiConversationResponse = z.infer<typeof createAiConversationResponseSchema>;

// --- GET /ai/me/conversations ---

export const listAiConversationsResponseSchema = z.object({
  conversations: z.array(aiConversationSummaryResponseSchema),
});
export type ListAiConversationsResponse = z.infer<typeof listAiConversationsResponseSchema>;

// --- GET /ai/me/conversations/:conversationId ---

export const aiConversationDetailResponseSchema = aiConversationSummaryResponseSchema.extend({
  messages: z.array(aiMessageResponseSchema),
});
export type AiConversationDetailResponse = z.infer<typeof aiConversationDetailResponseSchema>;

// --- POST /ai/me/conversations/:conversationId/messages ---

/**
 * `operationId` -- idempotencia de transporte de la OPERACIÓN completa
 * (mensaje + respuesta), mismo patrón exacto que
 * `submitResponseRequestSchema` (PROGRESS, ADR-0014) y
 * `answerQuickQuestionBodySchema` (Bloque IV). `content` acotado a 4000
 * caracteres -- límite técnico de entrada razonable para este incremento,
 * nunca el límite de tokens/coste real del proveedor (eso es Incremento 3).
 */
export const sendAiMessageRequestSchema = z
  .object({
    content: z.string().trim().min(1).max(4000),
    operationId: entityId,
  })
  .strict();
export type SendAiMessageRequest = z.infer<typeof sendAiMessageRequestSchema>;

export const sendAiMessageResponseSchema = z.object({
  userMessage: aiMessageResponseSchema,
  assistantMessage: aiMessageResponseSchema,
  turnCount: z.number().int().nonnegative(),
  maxTurns: z.number().int().positive(),
  dailyQuota: aiDailyQuotaResponseSchema,
});
export type SendAiMessageResponse = z.infer<typeof sendAiMessageResponseSchema>;
