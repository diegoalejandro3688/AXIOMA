import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type {
  SubjectResponse,
  CurriculumTopicResponse,
  LearningResourceResponse,
  QuestionResponse,
} from '@axioma/contracts';
import { AuthGuard } from '../auth/auth.guard';
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
}
