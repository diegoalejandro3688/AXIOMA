import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  submitResponseRequestSchema,
  submitResponseResponseSchema,
  responseConflictBodySchema,
  type TopicProgressResponse,
  type SubmitResponseResponse,
  type ResponseConflictBody,
  type AcademicSummaryResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { ProgressService, ResponseConflictError } from './progress.service';

/**
 * Endpoints de PROGRESS (Bloque III, Vertical Slice M1) -- ver ADR-0014.
 * PROGRESS sirve el estado particular del estudiante; EDUCATION sirve
 * contenido -- controladores, rutas y respuestas deliberadamente separados,
 * nunca mezclados bajo `/education/*`.
 *
 * Todos los endpoints son de AUTOSERVICIO -- operan sobre
 * `request.accountId` (AuthGuard), nunca sobre un id recibido del cliente.
 */
@Controller('progress')
@UseGuards(AuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  /**
   * LEF Bloque V, Incremento 3 (docs/adr/LEF-BLOCK-V-DEFINITION.md §11) --
   * resumen académico PRIVADO, exclusivamente autoservicio
   * (`request.accountId`, nunca un id recibido del cliente) -- sin
   * superficie cross-cuenta, sin exposición pública. Determinista para una
   * cuenta nueva (200 con conteos en 0, `null` explícito donde no hay
   * datos) -- nunca un 404 por ausencia de actividad.
   */
  @Get('me/summary')
  getAcademicSummary(@Req() request: AuthenticatedRequest): Promise<AcademicSummaryResponse> {
    return this.progressService.getAcademicSummary(request.accountId);
  }

  @Get('topics/:topicId')
  getTopicProgress(
    @Req() request: AuthenticatedRequest,
    @Param('topicId') topicId: string,
  ): Promise<TopicProgressResponse> {
    return this.progressService.getTopicProgress(request.accountId, topicId);
  }

  @Post('topics/:topicId/responses')
  async submitResponse(
    @Req() request: AuthenticatedRequest,
    @Param('topicId') topicId: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SubmitResponseResponse | ResponseConflictBody> {
    const input = parseRequestBody(submitResponseRequestSchema, body);

    try {
      const { data, created } = await this.progressService.submitResponse(request.accountId, topicId, input);
      res.status(created ? 201 : 200);
      return submitResponseResponseSchema.parse(data);
    } catch (error) {
      if (error instanceof ResponseConflictError) {
        res.status(409);
        return responseConflictBodySchema.parse({
          error: { code: 'RESPONSE_CONFLICT', message: error.message },
          existingResponse: {
            questionVersionId: error.existingResponse.questionVersionId,
            answerOptionId: error.existingResponse.answerOptionId,
            isCorrect: error.existingResponse.isCorrect,
            respondedAt: error.existingResponse.respondedAt.toISOString(),
          },
        });
      }
      throw error;
    }
  }
}
