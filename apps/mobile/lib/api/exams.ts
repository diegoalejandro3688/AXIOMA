import {
  examListResponseSchema,
  examDetailResponseSchema,
  examAttemptStateResponseSchema,
  examAttemptQuestionsResponseSchema,
  upsertExamAttemptAnswerResponseSchema,
  examAttemptResultResponseSchema,
  examAttemptReviewResponseSchema,
  type ExamListResponse,
  type ExamDetailResponse,
  type ExamAttemptStateResponse,
  type ExamAttemptQuestionsResponse,
  type UpsertExamAttemptAnswerResponse,
  type ExamAttemptResultResponse,
  type ExamAttemptReviewResponse,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrappers tipados sobre el dominio EXAMS / Ensayos (ADR-0024) -- respuesta
 * validada con Zod también en el cliente. Todos operan sobre
 * `request.accountId` (AuthGuard); este cliente NUNCA envía un accountId.
 *
 * ONLINE-ONLY (ENSAYOS-M1-C): NO importa `lib/offline/*`. El reloj del ensayo
 * es server-authoritative y sigue corriendo aunque la app esté en background
 * -- encolar una respuesta para "más tarde" produciría un reintento sobre un
 * intento que pudo expirar. Si falla la red, se reintenta en vivo.
 */
const BASE = '/exams';

export function listExams(): Promise<ApiResult<ExamListResponse>> {
  return apiRequest('GET', BASE, { schema: examListResponseSchema });
}

export function getExam(examId: string): Promise<ApiResult<ExamDetailResponse>> {
  return apiRequest('GET', `${BASE}/${examId}`, { schema: examDetailResponseSchema });
}

/** Inicia o REANUDA el intento ACTIVE de este ensayo -- la decisión es del backend. */
export function startExamAttempt(examId: string): Promise<ApiResult<ExamAttemptStateResponse>> {
  return apiRequest('POST', `${BASE}/${examId}/attempts`, { body: {}, schema: examAttemptStateResponseSchema });
}

export function getExamAttempt(attemptId: string): Promise<ApiResult<ExamAttemptStateResponse>> {
  return apiRequest('GET', `${BASE}/me/attempts/${attemptId}`, { schema: examAttemptStateResponseSchema });
}

export function getExamAttemptQuestions(attemptId: string): Promise<ApiResult<ExamAttemptQuestionsResponse>> {
  return apiRequest('GET', `${BASE}/me/attempts/${attemptId}/questions`, { schema: examAttemptQuestionsResponseSchema });
}

/** Crea o CAMBIA la selección de una pregunta. `operationId` -- clave de idempotencia de transporte (lo genera el llamador por interacción). */
export function answerExamQuestion(
  attemptId: string,
  input: { questionVersionId: string; answerOptionId: string; operationId: string },
): Promise<ApiResult<UpsertExamAttemptAnswerResponse>> {
  return apiRequest('PUT', `${BASE}/me/attempts/${attemptId}/answers`, {
    body: input,
    schema: upsertExamAttemptAnswerResponseSchema,
  });
}

export function submitExamAttempt(attemptId: string): Promise<ApiResult<ExamAttemptResultResponse>> {
  return apiRequest('POST', `${BASE}/me/attempts/${attemptId}/submit`, { body: {}, schema: examAttemptResultResponseSchema });
}

export function getExamResult(attemptId: string): Promise<ApiResult<ExamAttemptResultResponse>> {
  return apiRequest('GET', `${BASE}/me/attempts/${attemptId}/result`, { schema: examAttemptResultResponseSchema });
}

export function getExamReview(attemptId: string): Promise<ApiResult<ExamAttemptReviewResponse>> {
  return apiRequest('GET', `${BASE}/me/attempts/${attemptId}/review`, { schema: examAttemptReviewResponseSchema });
}
