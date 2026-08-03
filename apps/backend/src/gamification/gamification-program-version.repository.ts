import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { GamificationProgramVersion, GamificationProgramVersionApprovalStatus } from '../generated/prisma/client';

/** Único punto de acceso a `gamification_program_version` -- ver docs/adr/0016-gamificacion-fundacion.md. */
@Injectable()
export class GamificationProgramVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    gamificationProgramId: string;
    versionLabel: string;
    ruleSetReference?: string | null;
    effectiveFrom?: Date | null;
    effectiveUntil?: Date | null;
    changeSummary?: string | null;
    approvalStatus?: GamificationProgramVersionApprovalStatus;
    approvedAt?: Date | null;
  }): Promise<GamificationProgramVersion> {
    return this.prisma.gamificationProgramVersion.create({ data: input });
  }

  findById(id: string): Promise<GamificationProgramVersion | null> {
    return this.prisma.gamificationProgramVersion.findUnique({ where: { id } });
  }

  findByProgramAndLabel(gamificationProgramId: string, versionLabel: string): Promise<GamificationProgramVersion | null> {
    return this.prisma.gamificationProgramVersion.findUnique({
      where: { gamificationProgramId_versionLabel: { gamificationProgramId, versionLabel } },
    });
  }

  /**
   * Única versión que puede otorgar XP: `approvalStatus = APPROVED`,
   * vigente en `at` (condición arquitectónica explícita -- ver
   * docs/adr/0016-gamificacion-fundacion.md). Desempate: `effectiveFrom`
   * más reciente, determinista.
   */
  findApprovedEffectiveAt(gamificationProgramId: string, at: Date): Promise<GamificationProgramVersion | null> {
    return this.prisma.gamificationProgramVersion.findFirst({
      where: {
        gamificationProgramId,
        approvalStatus: 'APPROVED',
        // effectiveFrom nulo = sin límite inferior (vigente desde siempre);
        // effectiveUntil nulo = sin límite superior (vigente indefinidamente).
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }] },
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }] },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
