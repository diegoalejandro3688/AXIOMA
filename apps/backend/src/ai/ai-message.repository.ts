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

  findByOperationId(operationId: string, tx?: Prisma.TransactionClient): Promise<AiMessage | null> {
    const client = tx ?? this.prisma;
    return client.aiMessage.findUnique({ where: { operationId } });
  }

  listByConversationId(conversationId: string): Promise<AiMessage[]> {
    return this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { sequence: 'asc' },
    });
  }

  /** `sequence` == número de filas ya existentes en la conversación -- primera fila es 0, mismo criterio 0-based que `displayOrder` en otras partes del proyecto. */
  async nextSequence(conversationId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma;
    const count = await client.aiMessage.count({ where: { conversationId } });
    return count;
  }

  countByConversationIdAndRole(conversationId: string, role: AiMessageRole, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma;
    return client.aiMessage.count({ where: { conversationId, role } });
  }

  create(data: Prisma.AiMessageUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<AiMessage> {
    const client = tx ?? this.prisma;
    return client.aiMessage.create({ data });
  }

  findById(id: string): Promise<AiMessage | null> {
    return this.prisma.aiMessage.findUnique({ where: { id } });
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

  /**
   * Incremento 7 -- borrado real de TODOS los mensajes de una conversación
   * (borrado manual, purga por retención, o cierre de cuenta). `ai_message`
   * solo tiene trigger de inmutabilidad en UPDATE (`enforce_ai_message_immutable`,
   * Incremento 1) -- nunca bloqueó DELETE, a diferencia de `ai_usage_ledger`.
   * El llamador es responsable de haber desvinculado ya cualquier
   * `AiUsageLedgerEntry`/`AiResponseReport` dependiente ANTES de llamar esto
   * (ver `AiRetentionService`) -- las FK de esas tablas hacia `ai_message`
   * son `Restrict`, deliberadamente, como red de seguridad.
   */
  async deleteByConversationId(conversationId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.aiMessage.deleteMany({ where: { conversationId } });
  }

  /** Mismo criterio que `deleteByConversationId`, para el cierre de cuenta (todas las conversaciones de una cuenta a la vez, en una sola consulta vía relación). */
  async deleteByAccountId(accountId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.aiMessage.deleteMany({ where: { conversation: { accountId } } });
  }
}
