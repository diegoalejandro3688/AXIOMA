import { z } from 'zod';
import {
  subjectResponseSchema,
  curriculumTopicResponseSchema,
  learningResourceResponseSchema,
  questionResponseSchema,
  type SubjectResponse,
  type CurriculumTopicResponse,
  type LearningResourceResponse,
  type QuestionResponse,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/** Wrappers tipados sobre EDUCATION (ADR-0012/ADR-0013) -- respuesta validada con Zod también en el cliente. */

export function listSubjects(): Promise<ApiResult<SubjectResponse[]>> {
  return apiRequest('GET', '/education/subjects', { schema: z.array(subjectResponseSchema) });
}

export function listRootTopics(subjectId: string): Promise<ApiResult<CurriculumTopicResponse[]>> {
  return apiRequest('GET', `/education/subjects/${subjectId}/topics`, { schema: z.array(curriculumTopicResponseSchema) });
}

export function listChildTopics(topicId: string): Promise<ApiResult<CurriculumTopicResponse[]>> {
  return apiRequest('GET', `/education/topics/${topicId}/children`, { schema: z.array(curriculumTopicResponseSchema) });
}

export function getPublishedResource(topicId: string): Promise<ApiResult<LearningResourceResponse>> {
  return apiRequest('GET', `/education/topics/${topicId}/resource`, { schema: learningResourceResponseSchema });
}

export function listPublishedQuestions(topicId: string): Promise<ApiResult<QuestionResponse[]>> {
  return apiRequest('GET', `/education/topics/${topicId}/questions`, { schema: z.array(questionResponseSchema) });
}
