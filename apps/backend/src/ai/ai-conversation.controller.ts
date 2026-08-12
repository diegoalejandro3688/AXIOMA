import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  createAiConversationRequestSchema,
  createAiConversationResponseSchema,
  listAiConversationsResponseSchema,
  aiConversationDetailResponseSchema,
  sendAiMessageRequestSchema,
  sendAiMessageResponseSchema,
  type CreateAiConversationResponse,
  type ListAiConversationsResponse,
  type AiConversationDetailResponse,
  type SendAiMessageResponse,
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
}
