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
}
