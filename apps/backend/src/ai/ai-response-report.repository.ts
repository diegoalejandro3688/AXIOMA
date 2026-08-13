import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AiResponseReport, Prisma } from '../generated/prisma/client';

/**
 * Único punto de acceso a `ai_response_report` -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §26, Incremento 6 (PRD AI-015). Mismo
 * criterio de frontera única que `AiMessageRepository`/`AiUsageLedgerRepository`.
 */
@Injectable()
export class AiResponseReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AiResponseReportUncheckedCreateInput): Promise<AiResponseReport> {
    return this.prisma.aiResponseReport.create({ data });
  }

  /**
   * Incremento 7 (privacidad/retención) -- un reporte vive y muere con su
   * mensaje (decisión del Product Owner, 2026-08-12: "por defecto ligado a
   * la vida de su mensaje/conversación", sin plazo propio). Se borra ANTES
   * del mensaje ASSISTANT que referencia (`assistantMessage` FK `Restrict`).
   */
  async deleteByConversationId(conversationId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.aiResponseReport.deleteMany({ where: { assistantMessage: { conversationId } } });
  }

  /** Mismo criterio que `deleteByConversationId`, para el cierre de cuenta (todas las conversaciones de una cuenta a la vez, en una sola consulta). */
  async deleteByAccountId(accountId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.aiResponseReport.deleteMany({ where: { accountId } });
  }
}
