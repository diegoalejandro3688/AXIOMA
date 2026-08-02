import {
  topicProgressResponseSchema,
  submitResponseResponseSchema,
  responseConflictBodySchema,
  type TopicProgressResponse,
  type SubmitResponseResponse,
  type StudentResponseSummary,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrappers tipados sobre PROGRESS -- ver ADR-0014. PROGRESS sirve el estado
 * particular del estudiante; nunca se mezcla con `lib/api/education.ts`.
 */

export function getTopicProgress(topicId: string): Promise<ApiResult<TopicProgressResponse>> {
  return apiRequest('GET', `/progress/topics/${topicId}`, { schema: topicProgressResponseSchema });
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
  | { kind: 'error'; message: string; status: number };

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
  if (result.kind === 'network') {
    return { kind: 'network', message: result.message };
  }
  if (result.status === 409) {
    const conflict = responseConflictBodySchema.parse(result.body);
    return { kind: 'conflict', existingResponse: conflict.existingResponse };
  }
  return { kind: 'error', message: result.message, status: result.status };
}
