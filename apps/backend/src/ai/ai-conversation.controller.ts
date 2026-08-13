import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  createAiConversationRequestSchema,
  createAiConversationResponseSchema,
  listAiConversationsResponseSchema,
  aiConversationDetailResponseSchema,
  sendAiMessageRequestSchema,
  sendAiMessageResponseSchema,
  reportAiMessageRequestSchema,
  reportAiMessageResponseSchema,
  type CreateAiConversationResponse,
  type ListAiConversationsResponse,
  type AiConversationDetailResponse,
  type SendAiMessageResponse,
  type ReportAiMessageResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { AiConversationService, type AiConversationSummaryView, type AiConversationDetailView, type SendAiMessageView } from './ai-conversation.service';
import { AXIOMA_TUTOR_DISCLAIMER } from './ai-pedagogy';
import type { AiMessage } from '../generated/prisma/client';

/**
 * Endpoints del Tutor IA -- LEF Bloque VI, Incremento 1 ("Fundación
 * conversacional"), ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §7/§21.
 * `request.accountId` (AuthGuard) exclusivamente -- ningún endpoint acepta
 * ni acepta nunca un accountId/username ajeno, superficie 100% `me`.
 *
 * Whitelisting explícito en cada `toXResponse` -- nunca se expone
 * `accountId`, `operationId`, ni ningún detalle interno del proveedor.
 */
function toMessageResponse(message: AiMessage) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    sequence: message.sequence,
    createdAt: message.createdAt.toISOString(),
    requestedMode: message.requestedMode,
  };
}

function toDailyQuotaResponse(dailyQuota: AiConversationSummaryView['dailyQuota']) {
  return {
    limit: dailyQuota.limit,
    consumed: dailyQuota.consumed,
    remaining: dailyQuota.remaining,
    resetAt: dailyQuota.resetAt.toISOString(),
  };
}

function toSummaryResponse(view: AiConversationSummaryView) {
  return {
    conversationId: view.conversation.id,
    createdAt: view.conversation.createdAt.toISOString(),
    lastMessageAt: view.conversation.lastMessageAt?.toISOString() ?? null,
    turnCount: view.turnCount,
    maxTurns: view.maxTurns,
    dailyQuota: toDailyQuotaResponse(view.dailyQuota),
    academicContext: view.academicContext,
    // Incremento 5, decisión N -- valor constante del backend, nunca generado por el modelo (ver ai-pedagogy.ts).
    disclaimer: AXIOMA_TUTOR_DISCLAIMER,
  };
}

function toDetailResponse(view: AiConversationDetailView): AiConversationDetailResponse {
  return aiConversationDetailResponseSchema.parse({
    ...toSummaryResponse(view),
    messages: view.messages.map(toMessageResponse),
  });
}

function toSendMessageResponse(view: SendAiMessageView): SendAiMessageResponse {
  return sendAiMessageResponseSchema.parse({
    userMessage: toMessageResponse(view.userMessage),
    assistantMessage: toMessageResponse(view.assistantMessage),
    turnCount: view.turnCount,
    maxTurns: view.maxTurns,
    dailyQuota: toDailyQuotaResponse(view.dailyQuota),
    academicContext: view.academicContext,
  });
}

@Controller('ai/me/conversations')
@UseGuards(AuthGuard)
export class AiConversationController {
  constructor(private readonly aiConversationService: AiConversationService) {}

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<CreateAiConversationResponse> {
    const input = parseRequestBody(createAiConversationRequestSchema, body);
    const view = await this.aiConversationService.createConversation(request.accountId, {
      questionVersionId: input.contextQuestionVersionId,
      curriculumTopicId: input.contextCurriculumTopicId,
    });
    return createAiConversationResponseSchema.parse(toSummaryResponse(view));
  }

  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<ListAiConversationsResponse> {
    const views = await this.aiConversationService.listConversations(request.accountId);
    return listAiConversationsResponseSchema.parse({ conversations: views.map(toSummaryResponse) });
  }

  @Get(':conversationId')
  async getOne(@Req() request: AuthenticatedRequest, @Param('conversationId') conversationId: string): Promise<AiConversationDetailResponse> {
    const view = await this.aiConversationService.getConversation(request.accountId, conversationId);
    return toDetailResponse(view);
  }

  /**
   * Incremento 7 -- borrado manual, propio ("me"). Hard delete real (sin
   * papelera/restauración -- fuera de alcance) -- ver
   * `AiConversationService.deleteConversation`/`AiRetentionService` para el
   * orden exacto de eliminación. 404 uniforme si la conversación no existe o
   * no es de esta cuenta -- nunca revela si existe para otra cuenta.
   */
  @Delete(':conversationId')
  @HttpCode(204)
  async delete(@Req() request: AuthenticatedRequest, @Param('conversationId') conversationId: string): Promise<void> {
    await this.aiConversationService.deleteConversation(request.accountId, conversationId);
  }

  @Post(':conversationId/messages')
  async sendMessage(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ): Promise<SendAiMessageResponse> {
    const input = parseRequestBody(sendAiMessageRequestSchema, body);
    const view = await this.aiConversationService.sendMessage(request.accountId, conversationId, {
      content: input.content,
      operationId: input.operationId,
      requestedMode: input.requestedMode ?? null,
    });
    return toSendMessageResponse(view);
  }

  /**
   * Incremento 6 (PRD AI-015) -- reporte mínimo de una respuesta del Tutor.
   * Sin `operationId`/idempotencia de transporte -- a diferencia de
   * `sendMessage`, esta operación no tiene coste externo ni efecto
   * irreversible: un doble envío accidental crea, a lo sumo, un segundo
   * registro de reporte (mismo criterio de minimización que el resto de I6,
   * "mecanismo mínimo contractual", sin la complejidad de idempotencia que sí
   * exige una llamada real al proveedor).
   */
  @Post(':conversationId/messages/:messageId/report')
  async reportMessage(
    @Req() request: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() body: unknown,
  ): Promise<ReportAiMessageResponse> {
    const input = parseRequestBody(reportAiMessageRequestSchema, body);
    const report = await this.aiConversationService.reportMessage(request.accountId, conversationId, messageId, {
      reportType: input.reportType,
      description: input.description,
    });
    return reportAiMessageResponseSchema.parse({
      reportId: report.id,
      reportType: report.reportType,
      createdAt: report.createdAt.toISOString(),
    });
  }
}
