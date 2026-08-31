import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  openQuickQuestionSessionBodySchema,
  quickQuestionSessionResponseSchema,
  nextQuickQuestionBodySchema,
  quickQuestionNextResponseSchema,
  answerQuickQuestionBodySchema,
  answerQuickQuestionResponseSchema,
  timeoutQuickQuestionBodySchema,
  timeoutQuickQuestionResponseSchema,
  closeQuickQuestionBodySchema,
  closeQuickQuestionResponseSchema,
  resourceContentBlocksSchema,
  explanationContentSchema,
  answerOptionContentSchema,
  type QuickQuestionSessionResponse,
  type QuickQuestionNextResponse,
  type AnswerQuickQuestionResponse,
  type TimeoutQuickQuestionResponse,
  type CloseQuickQuestionResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { ObjectStorageService } from '../platform/object-storage/object-storage.service';
import { QuickQuestionService } from './quick-question.service';

/** Mismo TTL que `EducationService` -- URL de lectura de corta duración, nunca persistida (ADR-0010). */
const IMAGE_SIGNED_URL_TTL_SECONDS = 300;

/**
 * Endpoints de autoservicio de Pregunta rápida (Bloque IV, Incremento 4,
 * sub-incremento 4.c) -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.4.
 * `request.accountId` (AuthGuard), nunca un id recibido del cliente -- mismo
 * criterio que el resto de `/gamification/me/*`. Cada excepción de dominio
 * lanzada por `QuickQuestionService` (`NotFoundException`/`ConflictException`/
 * `BadRequestException`) se traduce a su código HTTP por el filtro global
 * existente -- sin mapeo manual aquí.
 *
 * `200` uniforme en las cuatro rutas (precisión obligatoria del Product
 * Owner) -- creación/reutilización de sesión, presentación de pregunta o
 * `NO_QUESTIONS_AVAILABLE`, respuesta o replay, cierre o cierre idempotente
 * son todos éxito HTTP, nunca `201`: lo que importa es el estado resultante,
 * no si esta llamada en particular lo produjo.
 *
 * Resuelve bloques `image` (`objectKey` -> URL firmada) igual que
 * `EducationService.resolveBlocks` -- Pregunta rápida reutiliza contenido de
 * EDUCATION que puede incluir imágenes; sin esta resolución, `objectKey`
 * interno se filtraría o la respuesta fallaría la validación de esquema.
 */
@Controller('gamification/me/quick-question/sessions')
@UseGuards(AuthGuard)
export class QuickQuestionController {
  constructor(
    private readonly quickQuestionService: QuickQuestionService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async open(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<QuickQuestionSessionResponse> {
    parseRequestBody(openQuickQuestionSessionBodySchema, body);
    const { session } = await this.quickQuestionService.openSession(request.accountId);
    return quickQuestionSessionResponseSchema.parse({ sessionId: session.id, status: 'ACTIVE' });
  }

  @Post(':sessionId/next')
  @HttpCode(HttpStatus.OK)
  async next(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
  ): Promise<QuickQuestionNextResponse> {
    parseRequestBody(nextQuickQuestionBodySchema, body);
    const outcome = await this.quickQuestionService.next(request.accountId, sessionId);

    if (outcome.outcome === 'NO_QUESTIONS_AVAILABLE') {
      return quickQuestionNextResponseSchema.parse({ outcome: 'NO_QUESTIONS_AVAILABLE' });
    }

    const storedStem = resourceContentBlocksSchema.parse(outcome.questionVersion.stemContent);
    return quickQuestionNextResponseSchema.parse({
      outcome: 'QUESTION_PRESENTED',
      // SIN questionVersionId -- precisión obligatoria del Product Owner:
      // el cliente nunca lo necesita, la pregunta pendiente ya está ligada
      // server-side a la sesión.
      stemContent: await this.resolveBlocks(storedStem),
      // SIN isCorrect en ninguna alternativa -- misma exclusión
      // incondicional que EDUCATION (answerOptionContentSchema no lo declara).
      answerOptions: outcome.questionVersion.answerOptions.map((option) => ({
        id: option.id,
        content: answerOptionContentSchema.parse(option.content),
        displayOrder: option.displayOrder,
      })),
      // Incremento 9 -- deadline autoritativa (`presentedAt + 45 s`). NUNCA
      // la clave de respuesta.
      deadlineAt: outcome.deadlineAt.toISOString(),
    });
  }

  @Post(':sessionId/answers')
  @HttpCode(HttpStatus.OK)
  async answer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
  ): Promise<AnswerQuickQuestionResponse> {
    const input = parseRequestBody(answerQuickQuestionBodySchema, body);
    const result = await this.quickQuestionService.answer(request.accountId, sessionId, input.answerOptionId, input.operationId);

    if (result.outcome === 'TIMED_OUT') {
      return answerQuickQuestionResponseSchema.parse({
        outcome: 'TIMED_OUT',
        correctAnswerOptionId: result.correctAnswerOptionId,
      });
    }

    const explanationContent = result.explanationContent
      ? await this.resolveBlocks(explanationContentSchema.parse(result.explanationContent))
      : null;

    return answerQuickQuestionResponseSchema.parse({
      outcome: 'ANSWERED',
      isCorrect: result.attempt.isCorrect,
      correctAnswerOptionId: result.correctAnswerOptionId,
      explanationContent,
    });
  }

  /**
   * Incremento 9 -- resolución AUTORITATIVA del timeout de la pregunta
   * pendiente. El móvil lo llama cuando su temporizador visual llega a 0.
   * `200` uniforme. NO crea intento, NO emite `quick_question_answered`
   * (**0 LP**). Seguro ante reintento.
   */
  @Post(':sessionId/timeout')
  @HttpCode(HttpStatus.OK)
  async timeout(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
  ): Promise<TimeoutQuickQuestionResponse> {
    parseRequestBody(timeoutQuickQuestionBodySchema, body);
    const result = await this.quickQuestionService.timeout(request.accountId, sessionId);

    if (result.outcome === 'TIMED_OUT') {
      return timeoutQuickQuestionResponseSchema.parse({ outcome: 'TIMED_OUT', correctAnswerOptionId: result.correctAnswerOptionId });
    }
    if (result.outcome === 'NOT_EXPIRED') {
      return timeoutQuickQuestionResponseSchema.parse({ outcome: 'NOT_EXPIRED', deadlineAt: result.deadlineAt.toISOString() });
    }
    return timeoutQuickQuestionResponseSchema.parse({ outcome: 'NO_PENDING_QUESTION' });
  }

  @Post(':sessionId/close')
  @HttpCode(HttpStatus.OK)
  async close(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
  ): Promise<CloseQuickQuestionResponse> {
    parseRequestBody(closeQuickQuestionBodySchema, body);
    const session = await this.quickQuestionService.close(request.accountId, sessionId);
    return closeQuickQuestionResponseSchema.parse({ sessionId: session.id, status: 'CLOSED' });
  }

  /**
   * Bloque por bloque: todo pasa igual salvo `image`, cuyo `objectKey`
   * (interno) se resuelve aquí a `url` (firmada, pública) -- ver ADR-0013.
   * Compartido entre `stemContent` (resourceContentBlockSchema, admite
   * `heading`) y `explanationContent` (explanationContentBlockSchema, sin
   * `heading`) -- ambos reutilizan el mismo `imageBlockSchema`, la
   * validación final ocurre en el `.parse()` del schema de respuesta
   * específico de cada llamador (mismo criterio que `EducationService`).
   */
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
