import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  practiceQuestionSampleRequestSchema,
  practiceQuestionAnswerRequestSchema,
  type SubjectResponse,
  type CurriculumTopicResponse,
  type LearningResourceResponse,
  type QuestionResponse,
  type PracticeQuestionSampleResponse,
  type PracticeQuestionAnswerResponse,
} from '@axioma/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { EducationService } from './education.service';

/**
 * Endpoints de lectura del dominio EDUCATION -- Bloque I, Vertical Slice M1.
 * Ver ADR-0012 y AXIOMA Phase 1 Kickoff §4.1 (recorrido principal: Estudio ->
 * materia -> unidad -> recurso -> preguntas). Solo lectura -- sin endpoints
 * de escritura/publicación en este bloque (plataforma editorial, fuera de
 * alcance de la Vertical Slice M1).
 *
 * Requiere sesión -- Estudio se accede después de iniciar sesión (Kickoff §4.1).
 */
@Controller('education')
@UseGuards(AuthGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get('subjects')
  listSubjects(): Promise<SubjectResponse[]> {
    return this.educationService.listSubjects();
  }

  @Get('subjects/:subjectId/topics')
  listRootTopics(@Param('subjectId') subjectId: string): Promise<CurriculumTopicResponse[]> {
    return this.educationService.listRootTopics(subjectId);
  }

  @Get('topics/:topicId/children')
  listChildTopics(@Param('topicId') topicId: string): Promise<CurriculumTopicResponse[]> {
    return this.educationService.listChildTopics(topicId);
  }

  @Get('topics/:topicId/resource')
  getPublishedResource(@Param('topicId') topicId: string): Promise<LearningResourceResponse> {
    return this.educationService.getPublishedResource(topicId);
  }

  @Get('topics/:topicId/questions')
  listPublishedQuestions(@Param('topicId') topicId: string): Promise<QuestionResponse[]> {
    return this.educationService.listPublishedQuestions(topicId);
  }

  /**
   * ESTUDIO / PRÁCTICA LIBRE V1 -- lane STATELESS de práctica. POST (no GET)
   * porque `excludeQuestionVersionIds` puede crecer a cientos durante una
   * ejecución continua y no cabe en la URL; sigue siendo lectura pura sin
   * side effects (no crea sesión ni escribe nada). Ver
   * `EducationService.samplePracticeQuestion`.
   */
  @Post('subjects/:subjectId/practice-questions/sample')
  samplePracticeQuestion(
    @Param('subjectId') subjectId: string,
    @Body() body: unknown,
  ): Promise<PracticeQuestionSampleResponse> {
    const input = parseRequestBody(practiceQuestionSampleRequestSchema, body);
    return this.educationService.samplePracticeQuestion(subjectId, input.excludeQuestionVersionIds ?? []);
  }

  /**
   * ESTUDIO / PRÁCTICA LIBRE V1 -- valida una respuesta de práctica libre.
   * CERO escritura: no `student_response`, no progreso, no XP/LP, no Outbox.
   * Ver `EducationService.answerPracticeQuestion`.
   */
  @Post('subjects/:subjectId/practice-questions/:questionVersionId/answer')
  answerPracticeQuestion(
    @Param('subjectId') subjectId: string,
    @Param('questionVersionId') questionVersionId: string,
    @Body() body: unknown,
  ): Promise<PracticeQuestionAnswerResponse> {
    const input = parseRequestBody(practiceQuestionAnswerRequestSchema, body);
    return this.educationService.answerPracticeQuestion(subjectId, questionVersionId, input.answerOptionId);
  }
}
