import { Body, Controller, NotFoundException, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  adminResolveExamRequestSchema,
  adminExamResponseSchema,
  adminLinkExamQuestionRequestSchema,
  adminExamQuestionLinkResponseSchema,
  adminPublishExamRequestSchema,
  adminPublishExamResponseSchema,
  adminResolveExamPassageRequestSchema,
  adminExamPassageResponseSchema,
  type AdminExamResponse,
  type AdminExamQuestionLinkResponse,
  type AdminPublishExamResponse,
  type AdminExamPassageResponse,
} from '@axioma/contracts';
import { AdminAuthGuard } from '../administration/admin-auth.guard';
import { AdminRoleGuard } from '../administration/admin-role.guard';
import { RequireAdminRole } from '../administration/require-admin-role.decorator';
import { SubjectRepository } from '../education/subject.repository';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { ExamService } from './exam.service';

/**
 * API administrativa de DEFINICIÓN de ensayos -- ENSAYOS-M1-B (ADR-0024).
 *
 * Fachada HTTP mínima sobre `ExamService` (F1 la designó como el único write
 * path del importer de ENSAYOS-M1-B y del gate). Mismo patrón exacto que
 * `EditorialController`: `AdminAuthGuard` + `AdminRoleGuard`, nunca `AuthGuard`
 * de estudiante; el controller solo traduce entrada/salida, la lógica (y la
 * idempotencia) viven en `ExamService`.
 *
 * NO hay concepto de CMS-018 / auto-aprobación aquí: definir un ensayo (crear
 * la fila, vincular preguntas ya publicadas, publicar la disponibilidad) no es
 * autoría de contenido académico -- ese contenido ya pasó su propio ciclo
 * editorial como `Question`/`QuestionVersion`. Crear/vincular admite AUTHOR o
 * PUBLISHER; publicar la disponibilidad exige PUBLISHER.
 */
@Controller('administration/exams')
@UseGuards(AdminAuthGuard, AdminRoleGuard)
export class ExamAdminController {
  constructor(
    private readonly examService: ExamService,
    private readonly subjectRepo: SubjectRepository,
  ) {}

  /** Resolver-o-crear un ensayo por `examKey` (idempotente). `subjectKey` debe existir. */
  @Post()
  @RequireAdminRole('AUTHOR', 'PUBLISHER')
  async resolveExam(@Body() body: unknown): Promise<AdminExamResponse> {
    const input = parseRequestBody(adminResolveExamRequestSchema, body);
    const subject = await this.subjectRepo.findByKey(input.subjectKey);
    if (!subject) throw new NotFoundException(`No existe ningún Subject con subjectKey "${input.subjectKey}".`);

    const { exam, created } = await this.examService.resolveOrCreateExam({
      examKey: input.examKey,
      title: input.title,
      subjectId: subject.id,
      durationSeconds: input.durationSeconds,
    });
    return adminExamResponseSchema.parse({
      id: exam.id,
      examKey: exam.examKey,
      title: exam.title,
      subjectId: exam.subjectId,
      durationSeconds: exam.durationSeconds,
      status: exam.status,
      created,
    });
  }

  /** Vincular una `QuestionVersion` publicada al ensayo en una posición fija (idempotente). */
  @Post(':examId/questions')
  @RequireAdminRole('AUTHOR', 'PUBLISHER')
  async linkQuestion(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Body() body: unknown,
  ): Promise<AdminExamQuestionLinkResponse> {
    const input = parseRequestBody(adminLinkExamQuestionRequestSchema, body);
    const { link, created } = await this.examService.linkQuestionIdempotent({
      examId,
      questionVersionId: input.questionVersionId,
      displayOrder: input.displayOrder,
      passageId: input.passageId ?? null,
    });
    return adminExamQuestionLinkResponseSchema.parse({
      id: link.id,
      examId: link.examId,
      questionVersionId: link.questionVersionId,
      displayOrder: link.displayOrder,
      passageId: link.passageId ?? null,
      created,
    });
  }

  /**
   * ENSAYOS-F2 -- resolver-o-crear un texto/estímulo compartido del ensayo
   * (idempotente por `examId + passageKey`). Mismo `passageKey` con contenido
   * canónico idéntico -> NO-OP con el mismo `id`; contenido en conflicto -> 409
   * (nunca sobrescritura). Sobre un ensayo PUBLISHED lo rechaza el trigger.
   */
  @Post(':examId/passages')
  @RequireAdminRole('AUTHOR', 'PUBLISHER')
  async resolveExamPassage(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Body() body: unknown,
  ): Promise<AdminExamPassageResponse> {
    const input = parseRequestBody(adminResolveExamPassageRequestSchema, body);
    const { passage, created } = await this.examService.resolveOrCreatePassage({
      examId,
      passageKey: input.passageKey,
      displayOrder: input.displayOrder,
      title: input.title,
      content: input.content,
    });
    return adminExamPassageResponseSchema.parse({
      id: passage.id,
      examId: passage.examId,
      passageKey: passage.passageKey,
      displayOrder: passage.displayOrder,
      created,
    });
  }

  /** Publicar la disponibilidad del ensayo -- `DRAFT -> PUBLISHED` (idempotente). */
  @Post(':examId/publish')
  @RequireAdminRole('PUBLISHER')
  async publishExam(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Body() body: unknown,
  ): Promise<AdminPublishExamResponse> {
    parseRequestBody(adminPublishExamRequestSchema, body);
    const { exam, alreadyPublished } = await this.examService.ensureExamPublished(examId);
    return adminPublishExamResponseSchema.parse({
      id: exam.id,
      examKey: exam.examKey,
      status: exam.status,
      alreadyPublished,
    });
  }
}
