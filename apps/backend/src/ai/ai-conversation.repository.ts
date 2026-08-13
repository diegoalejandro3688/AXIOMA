import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AiConversation, Prisma } from '../generated/prisma/client';

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

  /** `context` (Incremento 4) -- referencia YA validada por `AiAcademicContextBuilder`, fijada ÚNICAMENTE aquí, en la creación; ningún otro método de este repositorio la actualiza. */
  create(accountId: string, context: { contextQuestionVersionId: string | null; contextCurriculumTopicId: string | null } = { contextQuestionVersionId: null, contextCurriculumTopicId: null }): Promise<AiConversation> {
    return this.prisma.aiConversation.create({ data: { accountId, ...context } });
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

  /**
   * Incremento 7 -- conversaciones elegibles para purga por retención: 90
   * días desde la ÚLTIMA ACTIVIDAD CANÓNICA (`lastMessageAt`), o desde
   * `createdAt` si nunca tuvo un turno completado (`lastMessageAt` sigue
   * `null` -- ver docstring de `AiConversationService.completeAssistantReply`,
   * `touchLastMessageAt` solo se llama tras una respuesta ASSISTANT
   * exitosa). Frontera UTC pura por duración (`now - 90 días`), NUNCA
   * dependiente del timezone del estudiante -- mismo criterio ya usado por
   * `utcDayRange`/cuota diaria. Acotado por `limit` (batch), orden
   * determinista (más antiguas primero) para que el barrido progrese de
   * forma estable entre ejecuciones sucesivas.
   */
  findExpiredForPurge(cutoff: Date, limit: number): Promise<AiConversation[]> {
    return this.prisma.aiConversation.findMany({
      where: {
        OR: [{ lastMessageAt: { lt: cutoff } }, { lastMessageAt: null, createdAt: { lt: cutoff } }],
      },
      take: limit,
      orderBy: [{ lastMessageAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Incremento 7 -- borrado real (sin trigger de inmutabilidad en `ai_conversation`). El llamador es responsable de haber eliminado ya todo contenido dependiente (mensajes/reportes/claims) y desvinculado el ledger -- ver `AiRetentionService`. */
  async deleteById(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.aiConversation.deleteMany({ where: { id } });
  }

  /** Mismo criterio que `deleteById`, para el cierre de cuenta (todas las conversaciones de una cuenta a la vez). */
  async deleteByAccountId(accountId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.aiConversation.deleteMany({ where: { accountId } });
  }
}
