import {
  practiceQuestionSampleResponseSchema,
  practiceQuestionAnswerResponseSchema,
  type PracticeQuestionSampleResponse,
  type PracticeQuestionAnswerResponse,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * ESTUDIO / PRÁCTICA LIBRE V1 -- wrappers del lane STATELESS de práctica.
 *
 * Lane SEPARADO del académico: responder aquí NO crea `student_response`, NO
 * toca `TopicProgress` / progreso de Recursos-Unidades / "Continuar
 * estudiando" de Inicio, NO otorga XP/LP, NO avanza desafíos. Por eso este
 * archivo NUNCA importa `lib/progress/*` ni `lib/offline/*` (sin cola offline:
 * un envío diferido sobre un pool que ya no es la ejecución actual no tiene
 * sentido). Online-only, igual criterio que `lib/api/quick-question.ts`.
 *
 * `sample` es POST (no GET) porque `excludeQuestionVersionIds` crece a
 * cientos durante una ejecución continua y no cabe en la URL -- sigue siendo
 * lectura pura sin side effects en el backend.
 */

export function samplePracticeQuestion(
  subjectId: string,
  excludeQuestionVersionIds: string[],
): Promise<ApiResult<PracticeQuestionSampleResponse>> {
  return apiRequest('POST', `/education/subjects/${subjectId}/practice-questions/sample`, {
    body: { excludeQuestionVersionIds },
    schema: practiceQuestionSampleResponseSchema,
  });
}

export function answerPracticeQuestion(
  subjectId: string,
  questionVersionId: string,
  answerOptionId: string,
): Promise<ApiResult<PracticeQuestionAnswerResponse>> {
  return apiRequest('POST', `/education/subjects/${subjectId}/practice-questions/${questionVersionId}/answer`, {
    body: { answerOptionId },
    schema: practiceQuestionAnswerResponseSchema,
  });
}
