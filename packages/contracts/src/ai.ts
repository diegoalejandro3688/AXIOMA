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
 * Fuera de alcance todavía (ver definición del bloque): comportamiento
 * pedagógico progresivo, seguridad de actividades protegidas -- ninguno de
 * esos conceptos aparece en estos contratos. La cuota diaria (`dailyQuota`)
 * es parte del contrato desde el Incremento 3; el contexto académico
 * (`academicContext`, `contextQuestionVersionId`/`contextCurriculumTopicId`)
 * desde el Incremento 4.
 */

export const aiMessageRoleSchema = z.enum(['USER', 'ASSISTANT']);
export type AiMessageRole = z.infer<typeof aiMessageRoleSchema>;

/**
 * Modos de asistencia progresivos (Incremento 5, decisión E) -- subconjunto
 * explícito de "15.11 Modos de respuesta educativa" (Data Model canónico),
 * ver `apps/backend/src/ai/ai-pedagogy.ts` para el mapeo exacto y la
 * justificación de por qué solo estos cuatro. `WORKED_SOLUTION` (solución
 * completa) solo se honra cuando el estudiante lo solicita EXPLÍCITAMENTE
 * aquí -- nunca por defecto (invariante estructural, no solo de prompt).
 */
export const aiAssistanceModeSchema = z.enum(['HINT_FIRST', 'CONCEPTUAL_EXPLANATION', 'GUIDED_STEPS', 'WORKED_SOLUTION']);
export type AiAssistanceMode = z.infer<typeof aiAssistanceModeSchema>;

export const aiMessageResponseSchema = z.object({
  id: entityId,
  role: aiMessageRoleSchema,
  content: z.string(),
  sequence: z.number().int().nonnegative(),
  createdAt: isoDateTime,
  /** Solo tiene significado en mensajes `role: 'USER'` -- `null` en mensajes ASSISTANT y en mensajes USER sin modo solicitado explícitamente. */
  requestedMode: aiAssistanceModeSchema.nullable(),
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
/**
 * Eco MÍNIMO y no sensible del contexto académico resuelto por el servidor
 * (Incremento 4) -- solo nombres públicos de materia/tema (ya expuestos hoy
 * por `GET /education/subjects`/`GET /education/topics/...`), NUNCA el
 * enunciado/alternativas/explicación de la pregunta (eso solo lo ve el
 * proveedor, vía `AiAcademicContext`, nunca la respuesta HTTP). `null` cuando
 * la conversación no tiene contexto asociado (punto de entrada 1, pestaña dedicada).
 */
export const aiAcademicContextSummarySchema = z
  .object({
    subjectName: z.string(),
    topicName: z.string(),
  })
  .nullable();
export type AiAcademicContextSummary = z.infer<typeof aiAcademicContextSummarySchema>;

/**
 * Disclaimer breve y visible (Incremento 5, decisión N) -- valor CONSTANTE
 * de configuración del backend, nunca texto generado por el modelo (ver
 * `apps/backend/src/ai/ai-pedagogy.ts`, `AXIOMA_TUTOR_DISCLAIMER`). Presente
 * en la superficie de conversación (create/list/get) -- deliberadamente
 * AUSENTE de `sendAiMessageResponseSchema` (decisión N: "sin repetición
 * invasiva por respuesta", nunca uno por cada mensaje).
 */
export const aiConversationSummaryResponseSchema = z.object({
  conversationId: entityId,
  createdAt: isoDateTime,
  lastMessageAt: isoDateTime.nullable(),
  turnCount: z.number().int().nonnegative(),
  maxTurns: z.number().int().positive(),
  dailyQuota: aiDailyQuotaResponseSchema,
  academicContext: aiAcademicContextSummarySchema,
  disclaimer: z.string(),
});
export type AiConversationSummaryResponse = z.infer<typeof aiConversationSummaryResponseSchema>;

// --- GET /ai/me/status ---

/**
 * Estado de cuenta del Tutor IA (Incremento 8, cierre del hueco detectado en
 * la verificación práctica) -- superficie MÍNIMA de solo lectura que permite
 * a un cliente mostrar cuota diaria y disclaimer SIN necesitar una
 * conversación previa. Antes de este endpoint, ambos valores solo viajaban
 * dentro de la respuesta de una conversación (create/list/get), de modo que
 * una cuenta sin conversaciones no podía mostrarlos sin fabricarlos
 * localmente -- exactamente lo que el contrato de I8 prohíbe.
 *
 * EXACTAMENTE dos campos, ambos ya contractuales y ya expuestos hoy por la
 * superficie de conversación: `dailyQuota` (por cuenta y día UTC) y
 * `disclaimer` (constante del backend). Deliberadamente NO incluye
 * `turnCount`/`maxTurns` (son POR CONVERSACIÓN, no por cuenta), ni tier/
 * plan/entitlement crudo, ni proveedor/modelo/tokens/coste -- mismo
 * whitelisting estricto que el resto de `ai.ts`.
 */
export const aiMeStatusResponseSchema = z.object({
  dailyQuota: aiDailyQuotaResponseSchema,
  disclaimer: z.string(),
});
export type AiMeStatusResponse = z.infer<typeof aiMeStatusResponseSchema>;

// --- POST /ai/me/conversations ---

/**
 * Punto de entrada 2 ("entrada contextual desde Estudio") -- el cliente
 * SOLO puede enviar un identificador mínimo/autorizado (`questionVersionId`
 * O `curriculumTopicId`, nunca ambos); el backend resuelve el contexto real
 * desde fuentes canónicas (`AiAcademicContextBuilder`). Whitelisting
 * estricto (`.strict()`): un intento de enviar `subject`/`correctAnswer`/
 * `studentProgress`/cualquier otro campo es rechazado por el propio
 * esquema, nunca silenciosamente ignorado con datos parciales confiables.
 * Ambos campos ausentes = punto de entrada 1 (pestaña dedicada, sin contexto).
 */
export const createAiConversationRequestSchema = z
  .object({
    contextQuestionVersionId: entityId.optional(),
    contextCurriculumTopicId: entityId.optional(),
  })
  .strict()
  .refine((data) => !(data.contextQuestionVersionId && data.contextCurriculumTopicId), {
    message: 'Especifica como máximo un contexto académico (pregunta O tema, nunca ambos).',
  });
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
/**
 * `requestedMode` (Incremento 5, opcional) -- modo de asistencia EXPLÍCITO
 * solicitado por el estudiante para este turno (ver `aiAssistanceModeSchema`).
 * Ausente = progresión conservadora por defecto (ver `ai-pedagogy.ts`,
 * `buildAssistanceInstructionBlock`) -- el cliente NUNCA está obligado a
 * enviarlo; su ausencia nunca implica `WORKED_SOLUTION`.
 */
export const sendAiMessageRequestSchema = z
  .object({
    content: z.string().trim().min(1).max(4000),
    operationId: entityId,
    requestedMode: aiAssistanceModeSchema.optional(),
  })
  .strict();
export type SendAiMessageRequest = z.infer<typeof sendAiMessageRequestSchema>;

export const sendAiMessageResponseSchema = z.object({
  userMessage: aiMessageResponseSchema,
  assistantMessage: aiMessageResponseSchema,
  turnCount: z.number().int().nonnegative(),
  maxTurns: z.number().int().positive(),
  dailyQuota: aiDailyQuotaResponseSchema,
  academicContext: aiAcademicContextSummarySchema,
});
export type SendAiMessageResponse = z.infer<typeof sendAiMessageResponseSchema>;

// --- POST /ai/me/conversations/:conversationId/messages/:messageId/report ---

/**
 * Incremento 6 (PRD AI-015, Data Model §15.28) -- subconjunto EXACTO de las
 * 5 categorías del PRD, sin taxonomía adicional. "Un reporte no modifica
 * automáticamente la respuesta" (PRD AI-015) -- este endpoint NUNCA altera
 * `AiMessage.content`, solo registra el reporte.
 */
export const aiResponseReportTypeSchema = z.enum(['INCORRECT', 'CONFUSING', 'TOO_LONG', 'OFF_TOPIC', 'INAPPROPRIATE']);
export type AiResponseReportType = z.infer<typeof aiResponseReportTypeSchema>;

export const reportAiMessageRequestSchema = z
  .object({
    reportType: aiResponseReportTypeSchema,
    description: z.string().trim().max(1000).optional(),
  })
  .strict();
export type ReportAiMessageRequest = z.infer<typeof reportAiMessageRequestSchema>;

/** Eco mínimo -- nunca expone `accountId`/`description` de vuelta (whitelisting, mismo criterio que el resto de `ai.ts`). */
export const reportAiMessageResponseSchema = z.object({
  reportId: entityId,
  reportType: aiResponseReportTypeSchema,
  createdAt: isoDateTime,
});
export type ReportAiMessageResponse = z.infer<typeof reportAiMessageResponseSchema>;
