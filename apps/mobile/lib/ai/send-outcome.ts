import type { SendAiMessageResponse } from '@axioma/contracts';
// Import SOLO de tipo -- se elide en compilación, así este módulo NUNCA
// arrastra en tiempo de ejecución `../api/client.ts`. Gateable con `tsx`
// puro, mismo criterio que `lib/quick-question/outcomes.ts`.
import type { ApiResult } from '../api/client';

/**
 * Código público ESTABLE de "bloqueo de seguridad" del Tutor (LEF Bloque VI,
 * Incremento 6) -- ver `AI_SAFETY_BLOCKED_CODE` en
 * `apps/backend/src/ai/ai-conversation.service.ts`. Llega como
 * `422 { error: { code: 'AI_SAFETY_BLOCKED', ... } }`.
 */
export const AI_SAFETY_BLOCKED_CODE = 'AI_SAFETY_BLOCKED';

/**
 * Mensaje propio de Axioma para el estado seguro de producto. NUNCA se
 * presenta como "el servidor falló": el backend SÍ respondió, simplemente no
 * hay respuesta pedagógica utilizable. Nunca menciona proveedor, modelo, ni
 * ningún detalle del SDK -- esa información no llega siquiera al cliente.
 */
export const AI_SAFETY_BLOCKED_MESSAGE = 'El Tutor IA no puede responder a esta solicitud. Prueba a reformular tu mensaje.';

/** Fallo TÉCNICO temporal (503) -- explícitamente distinto de un bloqueo de seguridad. Reintentable con el MISMO operationId. */
export const AI_UNAVAILABLE_MESSAGE = 'El Tutor IA no está disponible en este momento. Puedes reintentar.';

/**
 * Resultado de un envío, tal y como la UI necesita distinguirlo. Ninguna
 * variante fabrica datos de dominio: `ok` transporta la respuesta canónica
 * del backend (mensajes reales, cuota real, turnos reales) y el resto son
 * estados de interfaz.
 *
 * - `safety_blocked` (422/AI_SAFETY_BLOCKED): estado seguro de PRODUCTO.
 * - `unavailable` (503): fallo técnico temporal, reintentable.
 * - `limit` (409): cupo diario o límite de turnos -- el mensaje ya viene
 *   redactado y decidido por el servidor, mobile nunca lo reescribe ni
 *   recalcula qué límite se alcanzó.
 * - `network`: sin respuesta del servidor -- AMBIGUO, el reintento debe
 *   reutilizar el mismo `operationId`.
 */
export type SendMessageOutcome =
  | { kind: 'ok'; data: SendAiMessageResponse }
  | { kind: 'safety_blocked'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'limit'; message: string }
  | { kind: 'not_found'; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'error'; message: string };

export function mapSendMessageResult(result: ApiResult<SendAiMessageResponse>): SendMessageOutcome {
  if (result.ok) return { kind: 'ok', data: result.data };
  if (result.kind === 'network') return { kind: 'network', message: result.message };
  if (result.status === 422 && result.code === AI_SAFETY_BLOCKED_CODE) {
    return { kind: 'safety_blocked', message: AI_SAFETY_BLOCKED_MESSAGE };
  }
  if (result.status === 503) return { kind: 'unavailable', message: AI_UNAVAILABLE_MESSAGE };
  if (result.status === 409) return { kind: 'limit', message: result.message };
  if (result.status === 404) return { kind: 'not_found', message: result.message };
  return { kind: 'error', message: result.message };
}

/** Solicitud todavía no confirmada por el servidor -- se conserva para poder reintentar EXACTAMENTE la misma operación lógica. */
export interface PendingSendAttempt {
  content: string;
  operationId: string;
}

/**
 * Decide qué `operationId` usar -- mismo criterio EXACTO que
 * `resolveAnswerOperationId` (Pregunta rápida, Bloque IV): un reintento de la
 * MISMA operación lógica (mismo contenido que la solicitud pendiente)
 * reutiliza el `operationId` pendiente, de modo que el backend lo reconozca
 * como replay/reintento y nunca lo cobre ni lo persista dos veces
 * (invariantes 11/12 del bloque). Una operación NUEVA (contenido distinto, o
 * sin nada pendiente) genera siempre un `operationId` nuevo.
 */
export function resolveSendOperationId(pending: PendingSendAttempt | null, content: string, generateNew: () => string): string {
  if (pending && pending.content === content) return pending.operationId;
  return generateNew();
}
