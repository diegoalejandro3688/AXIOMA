import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import {
  answerOptionContentSchema,
  examListResponseSchema,
  examDetailResponseSchema,
  startExamAttemptBodySchema,
  examAttemptStateResponseSchema,
  examAttemptQuestionsResponseSchema,
  upsertExamAttemptAnswerBodySchema,
  upsertExamAttemptAnswerResponseSchema,
  submitExamAttemptBodySchema,
  examAttemptResultResponseSchema,
  examAttemptReviewResponseSchema,
  explanationContentResponseSchema,
  resourceContentBlocksResponseSchema,
  type ExamListResponse,
  type ExamDetailResponse,
  type ExamAttemptStateResponse,
  type ExamAttemptQuestionsResponse,
  type UpsertExamAttemptAnswerResponse,
  type ExamAttemptResultResponse,
  type ExamAttemptReviewResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { ObjectStorageService } from '../platform/object-storage/object-storage.service';
import { ExamService, type ExamAttemptQuestionView } from './exam.service';

/** Mismo TTL de URL firmada que `EducationService`/`QuickQuestionController` -- lectura de corta duración, nunca persistida (ADR-0010). */
const IMAGE_SIGNED_URL_TTL_SECONDS = 300;

/**
 * Endpoints del dominio EXAMS / Ensayos V1 (ENSAYOS-F1, ADR-0024).
 *
 * Catálogo (`GET /exams`, `GET /exams/:examId`) y ciclo de intento
 * (`/exams/me/attempts/*`) -- todos bajo `AuthGuard`, todos sobre
 * `request.accountId`, nunca un id del cliente. Cada excepción de dominio
 * (`NotFoundException`/`ConflictException`/`BadRequestException`) la traduce a
 * HTTP el filtro global existente. `200` uniforme (nunca `201`): lo que
 * importa es el estado resultante.
 *
 * SEGURIDAD DE PAUTA (§review security): antes de COMPLETED/EXPIRED, ninguna
 * respuesta expone `isCorrect`, la alternativa correcta ni la explicación --
 * `GET .../questions` entrega solo enunciado, alternativas y la selección
 * propia. Recién `GET .../review` (bloqueado con 409 mientras el intento siga
 * ACTIVE) revela la pauta. Enforcement de backend, no de UI.
 */
@Controller('exams')
@UseGuards(AuthGuard)
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  @Get()
  async list(@Req() _request: AuthenticatedRequest): Promise<ExamListResponse> {
    const items = await this.examService.listPublishedExams();
    return examListResponseSchema.parse({
      exams: items.map(({ exam, questionCount }) => ({
        id: exam.id,
        examKey: exam.examKey,
        title: exam.title,
        subjectId: exam.subjectId,
        durationSeconds: exam.durationSeconds,
        questionCount,
      })),
    });
  }

  @Get(':examId')
  async detail(@Param('examId') examId: string): Promise<ExamDetailResponse> {
    const { exam, questionCount } = await this.examService.getPublishedExam(examId);
    return examDetailResponseSchema.parse({
      id: exam.id,
      examKey: exam.examKey,
      title: exam.title,
      subjectId: exam.subjectId,
      durationSeconds: exam.durationSeconds,
      questionCount,
    });
  }

  @Post(':examId/attempts')
  @HttpCode(HttpStatus.OK)
  async start(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body() body: unknown,
  ): Promise<ExamAttemptStateResponse> {
    parseRequestBody(startExamAttemptBodySchema, body);
    const attempt = await this.examService.startAttempt(request.accountId, examId);
    return this.toStateResponse(attempt);
  }

  @Get('me/attempts/:attemptId')
  async attemptState(
    @Req() request: AuthenticatedRequest,
    @Param('attemptId') attemptId: string,
  ): Promise<ExamAttemptStateResponse> {
    const attempt = await this.examService.getAttemptState(request.accountId, attemptId);
    return this.toStateResponse(attempt);
  }

  private toStateResponse(attempt: Awaited<ReturnType<ExamService['startAttempt']>>): ExamAttemptStateResponse {
    return examAttemptStateResponseSchema.parse({
      attemptId: attempt.id,
      examId: attempt.examId,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
      completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
      serverTime: new Date().toISOString(),
    });
  }

  @Get('me/attempts/:attemptId/questions')
  async questions(
    @Req() request: AuthenticatedRequest,
    @Param('attemptId') attemptId: string,
  ): Promise<ExamAttemptQuestionsResponse> {
    const { attempt, questions } = await this.examService.getAttemptQuestions(request.accountId, attemptId);
    return examAttemptQuestionsResponseSchema.parse({
      attemptId: attempt.id,
      status: attempt.status,
      expiresAt: attempt.expiresAt.toISOString(),
      serverTime: new Date().toISOString(),
      questions: await Promise.all(questions.map((q) => this.toQuestionResponse(q))),
    });
  }

  @Put('me/attempts/:attemptId/answers')
  @HttpCode(HttpStatus.OK)
  async upsertAnswer(
    @Req() request: AuthenticatedRequest,
    @Param('attemptId') attemptId: string,
    @Body() body: unknown,
  ): Promise<UpsertExamAttemptAnswerResponse> {
    const input = parseRequestBody(upsertExamAttemptAnswerBodySchema, body);
    const result = await this.examService.upsertAnswer(
      request.accountId,
      attemptId,
      input.questionVersionId,
      input.answerOptionId,
      input.operationId,
    );
    return upsertExamAttemptAnswerResponseSchema.parse(result);
  }

  @Post('me/attempts/:attemptId/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Req() request: AuthenticatedRequest,
    @Param('attemptId') attemptId: string,
    @Body() body: unknown,
  ): Promise<ExamAttemptResultResponse> {
    parseRequestBody(submitExamAttemptBodySchema, body);
    const { attempt, score } = await this.examService.submitAttempt(request.accountId, attemptId);
    return this.resultResponse(attempt, score);
  }

  @Get('me/attempts/:attemptId/result')
  async result(@Req() request: AuthenticatedRequest, @Param('attemptId') attemptId: string): Promise<ExamAttemptResultResponse> {
    const { attempt, score } = await this.examService.getResult(request.accountId, attemptId);
    return this.resultResponse(attempt, score);
  }

  @Get('me/attempts/:attemptId/review')
  async review(@Req() request: AuthenticatedRequest, @Param('attemptId') attemptId: string): Promise<ExamAttemptReviewResponse> {
    const { attempt, score, questions } = await this.examService.getReview(request.accountId, attemptId);
    return examAttemptReviewResponseSchema.parse({
      attemptId: attempt.id,
      examId: attempt.examId,
      status: attempt.status,
      score,
      questions: await Promise.all(
        questions.map(async (q) => ({
          ...(await this.toQuestionResponse(q)),
          correctAnswerOptionId: q.correctAnswerOptionId,
          isCorrect: q.isCorrect,
          explanationContent: q.explanationContent
            ? await this.resolveBlocks(explanationContentResponseSchema.parse(q.explanationContent))
            : null,
        })),
      ),
    });
  }

  private resultResponse(
    attempt: Awaited<ReturnType<ExamService['submitAttempt']>>['attempt'],
    score: Awaited<ReturnType<ExamService['submitAttempt']>>['score'],
  ): ExamAttemptResultResponse {
    return examAttemptResultResponseSchema.parse({
      attemptId: attempt.id,
      examId: attempt.examId,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
      completedAt: attempt.completedAt ? attempt.completedAt.toISOString() : null,
      score,
    });
  }

  private async toQuestionResponse(q: ExamAttemptQuestionView) {
    return {
      questionVersionId: q.questionVersionId,
      displayOrder: q.displayOrder,
      stemContent: await this.resolveBlocks(resourceContentBlocksResponseSchema.parse(q.stemContent)),
      answerOptions: q.answerOptions.map((option) => ({
        id: option.id,
        content: answerOptionContentSchema.parse(option.content),
        displayOrder: option.displayOrder,
      })),
      selectedAnswerOptionId: q.selectedAnswerOptionId,
    };
  }

  /** Resuelve bloques `image` (`objectKey` -> URL firmada), idéntico a `QuickQuestionController.resolveBlocks`. */
  private async resolveBlocks(blocks: Array<{ type: string } & Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
    return Promise.all(
      blocks.map(async (block) => {
        if (block.type !== 'image') return block;
        const url = await this.objectStorage.getSignedReadUrl(block.objectKey as string, IMAGE_SIGNED_URL_TTL_SECONDS);
        return { type: 'image', order: block.order, url, altText: block.altText };
      }),
    );
  }
}
