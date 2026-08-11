import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AiConversation } from '../generated/prisma/client';

/**
 * Único punto de acceso a `ai_conversation` -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §21. Toda consulta que devuelve una
 * conversación de una cuenta específica exige `accountId` en el `WHERE`,
 * nunca solo el `id` -- así una conversación ajena nunca es alcanzable ni
 * siquiera por error de omisión (mismo criterio "endpoint `me`, nunca
 * cross-cuenta" ya aplicado en todo el proyecto).
 */
@Injectable()
export class AiConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(accountId: string): Promise<AiConversation> {
    return this.prisma.aiConversation.create({ data: { accountId } });
  }

  findByIdForAccount(id: string, accountId: string): Promise<AiConversation | null> {
    return this.prisma.aiConversation.findFirst({ where: { id, accountId } });
  }

  listByAccountId(accountId: string): Promise<AiConversation[]> {
    return this.prisma.aiConversation.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  touchLastMessageAt(id: string, at: Date): Promise<AiConversation> {
    return this.prisma.aiConversation.update({ where: { id }, data: { lastMessageAt: at } });
  }
}
