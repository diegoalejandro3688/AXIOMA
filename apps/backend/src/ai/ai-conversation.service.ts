import { ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AiConversationRepository } from './ai-conversation.repository';
import { AiMessageRepository } from './ai-message.repository';
import { AiEntitlementService } from './ai-entitlement.service';
import { AI_PROVIDER, AiProviderTechnicalError, type AiProvider } from './ai-provider';
import { Prisma } from '../generated/prisma/client';
import type { AiConversation, AiMessage } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Mismo mensaje/código uniforme para "no existe" y "existe pero no es tuya"
 * -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §21 ("cuenta B... no puede
 * inferir existencia"), mismo criterio ya usado en ADR-0021/todo el
 * proyecto para recursos privados ajenos.
 */
const CONVERSATION_NOT_FOUND_MESSAGE = 'Esta conversación no existe o no está disponible.';

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
}

export interface AiConversationSummaryView {
  conversation: AiConversation;
  turnCount: number;
  maxTurns: number;
}

export interface AiConversationDetailView extends AiConversationSummaryView {
  messages: AiMessage[];
}

export interface SendAiMessageView {
  userMessage: AiMessage;
  assistantMessage: AiMessage;
  turnCount: number;
  maxTurns: number;
}

/**
 * LEF Bloque VI, Incremento 1 ("Fundación conversacional") -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §21. Dominio mínimo de
 * conversación/mensajería, SIN proveedor real, SIN cuota diaria, SIN
 * contexto académico, SIN comportamiento pedagógico, SIN seguridad de
 * actividades protegidas -- todo eso pertenece a incrementos posteriores.
 *
 * Semántica de atomicidad (decisión documentada explícitamente, ver reporte
 * de cierre del incremento): el mensaje USER se persiste de inmediato y de
 * forma durable, ANTES de invocar al proveedor -- un fallo del proveedor
 * NUNCA hace desaparecer el mensaje del estudiante. Si el proveedor falla,
 * la operación queda en un estado reintentable (USER persistido, ASSISTANT
 * ausente); un reintento con el MISMO `operationId` reutiliza el mensaje
 * USER ya existente y reintenta ÚNICAMENTE el paso de generación -- nunca
 * duplica el mensaje del estudiante. Esta semántica generaliza
 * correctamente al proveedor REAL del Incremento 2 (con latencia de red de
 * hasta 8s) -- envolver la llamada al proveedor dentro de la misma
 * transacción que el `INSERT` habría mantenido una transacción de Postgres
 * abierta por ese tiempo, un anti-patrón real de agotamiento del pool de
 * conexiones; se evita deliberadamente desde este incremento.
 */
@Injectable()
export class AiConversationService {
  constructor(
    private readonly conversationRepo: AiConversationRepository,
    private readonly messageRepo: AiMessageRepository,
    private readonly entitlementService: AiEntitlementService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  async createConversation(accountId: string): Promise<AiConversationSummaryView> {
    const conversation = await this.conversationRepo.create(accountId);
    const maxTurns = await this.entitlementService.getMaxTurns(accountId);
    return { conversation, turnCount: 0, maxTurns };
  }

  async listConversations(accountId: string): Promise<AiConversationSummaryView[]> {
    const conversations = await this.conversationRepo.listByAccountId(accountId);
    const maxTurns = await this.entitlementService.getMaxTurns(accountId);
    return Promise.all(
      conversations.map(async (conversation) => ({
        conversation,
        turnCount: await this.messageRepo.countByConversationIdAndRole(conversation.id, 'ASSISTANT'),
        maxTurns,
      })),
    );
  }

  async getConversation(accountId: string, conversationId: string): Promise<AiConversationDetailView> {
    const conversation = await this.conversationRepo.findByIdForAccount(conversationId, accountId);
    if (!conversation) throw new NotFoundException(CONVERSATION_NOT_FOUND_MESSAGE);

    const [messages, turnCount, maxTurns] = await Promise.all([
      this.messageRepo.listByConversationId(conversationId),
      this.messageRepo.countByConversationIdAndRole(conversationId, 'ASSISTANT'),
      this.entitlementService.getMaxTurns(accountId),
    ]);

    return { conversation, messages, turnCount, maxTurns };
  }

  async sendMessage(accountId: string, conversationId: string, input: { content: string; operationId: string }): Promise<SendAiMessageView> {
    // 404 uniforme -- misma verificación de propiedad que getConversation, nunca solo por id.
    const conversation = await this.conversationRepo.findByIdForAccount(conversationId, accountId);
    if (!conversation) throw new NotFoundException(CONVERSATION_NOT_FOUND_MESSAGE);

    // 1. Replay exacto por operationId -- idempotencia de transporte, mismo criterio que ProgressService.submitResponse (ADR-0014).
    const existingUserMessage = await this.messageRepo.findByOperationId(input.operationId);
    if (existingUserMessage) {
      if (existingUserMessage.conversationId !== conversationId) {
        // Mismo operationId reutilizado en otra conversación -- nunca se mezclan operaciones distintas bajo la misma clave de idempotencia.
        throw new ConflictException('Este operationId ya fue usado en otra conversación.');
      }
      return this.resolveExistingOperation(accountId, existingUserMessage);
    }

    // 2. Límite de turnos (decisión B) -- verificado ANTES de crear el mensaje USER nuevo.
    const [turnCount, maxTurns] = await Promise.all([
      this.messageRepo.countByConversationIdAndRole(conversationId, 'ASSISTANT'),
      this.entitlementService.getMaxTurns(accountId),
    ]);
    if (turnCount >= maxTurns) {
      throw new ConflictException('Se alcanzó el límite de turnos de esta conversación. Inicia una conversación nueva para continuar.');
    }

    // 3. Insertar el mensaje USER -- durable de inmediato, independiente del resultado del proveedor.
    const userMessage = await this.createUserMessageWithRetry(conversationId, input);

    return this.completeAssistantReply(accountId, userMessage);
  }

  /** Operación ya vista antes (mismo operationId) -- replay puro si ya está completa, o reintento del paso de generación si quedó parcial. */
  private async resolveExistingOperation(accountId: string, userMessage: AiMessage): Promise<SendAiMessageView> {
    const nextSequenceMessage = await this.messageRepo.findBySequence(userMessage.conversationId, userMessage.sequence + 1);
    if (nextSequenceMessage && nextSequenceMessage.role === 'ASSISTANT') {
      // Operación ya completada -- replay puro, el proveedor NUNCA se invoca de nuevo (invariante 11/12 del bloque).
      const [turnCount, maxTurns] = await Promise.all([
        this.messageRepo.countByConversationIdAndRole(userMessage.conversationId, 'ASSISTANT'),
        this.entitlementService.getMaxTurns(accountId),
      ]);
      return { userMessage, assistantMessage: nextSequenceMessage, turnCount, maxTurns };
    }
    // USER existe, ASSISTANT todavía no -- fallo parcial anterior; reintenta ÚNICAMENTE la generación, sin duplicar el mensaje USER.
    return this.completeAssistantReply(accountId, userMessage);
  }

  private async createUserMessageWithRetry(conversationId: string, input: { content: string; operationId: string }, attempt = 0): Promise<AiMessage> {
    const sequence = await this.messageRepo.nextSequence(conversationId);
    try {
      return await this.messageRepo.create({
        conversationId,
        role: 'USER',
        content: input.content,
        sequence,
        operationId: input.operationId,
      });
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) throw error;

      // Carrera real -- dos causas posibles, distinguidas por consulta directa (nunca se asume cuál fue):
      // (a) el MISMO operationId ganó en otra petición concurrente -- releer y tratar como replay.
      const winner = await this.messageRepo.findByOperationId(input.operationId);
      if (winner) return winner;
      // (b) colisión de secuencia por concurrencia real dentro de la misma conversación -- reintentar con la secuencia recalculada (acotado, evita bucle infinito ante un fallo persistente real).
      if (attempt >= 3) throw error;
      return this.createUserMessageWithRetry(conversationId, input, attempt + 1);
    }
  }

  private async completeAssistantReply(accountId: string, userMessage: AiMessage): Promise<SendAiMessageView> {
    const priorMessages = (await this.messageRepo.listByConversationId(userMessage.conversationId)).filter((m) => m.id !== userMessage.id);

    let reply: { content: string };
    try {
      reply = await this.provider.generateReply(
        priorMessages.map((m) => ({ role: m.role, content: m.content })),
        userMessage.content,
      );
    } catch (error) {
      if (error instanceof AiProviderTechnicalError) {
        // Degradación controlada (invariante 14) -- el mensaje USER YA está persistido y sigue estándolo; el estudiante puede reintentar con el mismo operationId sin duplicar nada.
        throw new ServiceUnavailableException('El Tutor IA no está disponible en este momento. Puedes reintentar.');
      }
      throw error;
    }

    const assistantSequence = await this.messageRepo.nextSequence(userMessage.conversationId);
    const assistantMessage = await this.messageRepo.create({
      conversationId: userMessage.conversationId,
      role: 'ASSISTANT',
      content: reply.content,
      sequence: assistantSequence,
    });

    const now = new Date();
    await this.conversationRepo.touchLastMessageAt(userMessage.conversationId, now);

    const [turnCount, maxTurns] = await Promise.all([
      this.messageRepo.countByConversationIdAndRole(userMessage.conversationId, 'ASSISTANT'),
      this.entitlementService.getMaxTurns(accountId),
    ]);

    return { userMessage, assistantMessage, turnCount, maxTurns };
  }
}
