import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AiMessage, AiMessageRole, Prisma } from '../generated/prisma/client';

/**
 * Único punto de acceso a `ai_message` -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §21. Los mensajes son inmutables tras
 * crearse (trigger `enforce_ai_message_immutable`, migración
 * `20260811222754_ai_conversation_foundation`) -- este repositorio nunca
 * expone un método de actualización, mismo criterio que
 * `StudentResponseRepository` (PROGRESS).
 */
@Injectable()
export class AiMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOperationId(operationId: string): Promise<AiMessage | null> {
    return this.prisma.aiMessage.findUnique({ where: { operationId } });
  }

  listByConversationId(conversationId: string): Promise<AiMessage[]> {
    return this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { sequence: 'asc' },
    });
  }

  /** `sequence` == número de filas ya existentes en la conversación -- primera fila es 0, mismo criterio 0-based que `displayOrder` en otras partes del proyecto. */
  async nextSequence(conversationId: string): Promise<number> {
    const count = await this.prisma.aiMessage.count({ where: { conversationId } });
    return count;
  }

  countByConversationIdAndRole(conversationId: string, role: AiMessageRole): Promise<number> {
    return this.prisma.aiMessage.count({ where: { conversationId, role } });
  }

  create(data: Prisma.AiMessageUncheckedCreateInput): Promise<AiMessage> {
    return this.prisma.aiMessage.create({ data });
  }

  findLastByConversationId(conversationId: string): Promise<AiMessage | null> {
    return this.prisma.aiMessage.findFirst({
      where: { conversationId },
      orderBy: { sequence: 'desc' },
    });
  }

  findBySequence(conversationId: string, sequence: number): Promise<AiMessage | null> {
    return this.prisma.aiMessage.findUnique({ where: { conversationId_sequence: { conversationId, sequence } } });
  }
}
