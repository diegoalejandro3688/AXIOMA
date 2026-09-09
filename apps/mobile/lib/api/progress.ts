import {
  topicProgressResponseSchema,
  topicProgressBatchResponseSchema,
  submitResponseResponseSchema,
  responseConflictBodySchema,
  resourceCompletionSchema,
  type TopicProgressResponse,
  type TopicProgressBatchResponse,
  type SubmitResponseResponse,
  type StudentResponseSummary,
  type ResourceCompletion,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrappers tipados sobre PROGRESS -- ver ADR-0014. PROGRESS sirve el estado
 * particular del estudiante; nunca se mezcla con `lib/api/education.ts`.
 */

export function getTopicProgress(topicId: string): Promise<ApiResult<TopicProgressResponse>> {
  return apiRequest('GET', `/progress/topics/${topicId}`, { schema: topicProgressResponseSchema });
}

/**
 * Progreso de MUCHOS temas en UNA sola solicitud -- reemplaza el fan-out
 * `Promise.all(topics.map(getTopicProgress))` que un cliente con muchos
 * temas raíz (ej. "Continuar estudiando" en Inicio) hacía antes, uno por
 * tema. Mismo contrato por tema que `getTopicProgress` (`TopicProgressResponse`),
 * ahora en un array -- ver `topicProgressBatchResponseSchema`.
 */
export function getTopicsProgressBatch(topicIds: string[]): Promise<ApiResult<TopicProgressBatchResponse>> {
  const query = [...new Set(topicIds)].join(',');
  return apiRequest('GET', `/progress/topics?topicIds=${encodeURIComponent(query)}`, {
    schema: topicProgressBatchResponseSchema,
  });
}

export interface SubmitResponseInput {
  questionVersionId: string;
  answerOptionId: string;
  operationId: string;
}

export type SubmitResponseOutcome =
  | { kind: 'ok'; data: SubmitResponseResponse }
  | { kind: 'conflict'; existingResponse: StudentResponseSummary }
  | { kind: 'network'; message: string }
  | { kind: 'error'; message: string; status: number; code?: string };

/**
 * A diferencia de `apiRequest` genérico, distingue el `409` de PROGRESS
 * (conflicto real, ADR-0014 punto 4) de cualquier otro error HTTP -- el
 * único caso donde el cuerpo de error trae un campo adicional
 * (`existingResponse`) que el llamador necesita leer.
 */
export async function submitResponse(topicId: string, input: SubmitResponseInput): Promise<SubmitResponseOutcome> {
  const result = await apiRequest('POST', `/progress/topics/${topicId}/responses`, { body: input });

  if (result.ok) {
    return { kind: 'ok', data: submitResponseResponseSchema.parse(result.data) };
  }
  // `!== 'http'` cubre `network` Y `schema` (RQ-06): sin respuesta HTTP interpretable, mismo estado ambiguo/recuperable.
  if (result.kind !== 'http') {
    return { kind: 'network', message: result.message };
  }
  if (result.status === 409) {
    const conflict = responseConflictBodySchema.parse(result.body);
    return { kind: 'conflict', existingResponse: conflict.existingResponse };
  }
  // `code` (envelope ADR-0007) se propaga para que el llamador pueda
  // distinguir `403 PREMIUM_REQUIRED` (C1.4: escritura de progreso sobre una
  // unidad Premium tras un downgrade) de cualquier otro 4xx.
  return { kind: 'error', message: result.message, status: result.status, code: result.code };
}

/** XP-V1B-2 -- lectura pura del estado de completitud del recurso del tema. `NOT_COMPLETED` NUNCA es un 404. */
/**
 * STABILIZATION-B6 (Finding I) -- SOLO lectura del estado de completitud del
 * recurso (para el indicador no interactivo "Recurso completado"). El
 * `POST .../resource-completion` legacy ya no se invoca desde el móvil: un
 * recurso se completa automáticamente al terminar su flujo de preguntas
 * (`submitResponse` en el servidor).
 */
export function getResourceCompletion(topicId: string): Promise<ApiResult<ResourceCompletion>> {
  return apiRequest('GET', `/progress/topics/${topicId}/resource-completion`, { schema: resourceCompletionSchema });
}
