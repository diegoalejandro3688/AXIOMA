import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { GamificationProgramVersion, GamificationProgramVersionApprovalStatus } from '../generated/prisma/client';

/**
 * Único punto de acceso a `gamification_program_version` -- ver
 * docs/adr/0016-gamificacion-fundacion.md.
 *
 * Corrección de secuenciación (2026-08-05, ver ADR-0016 "Corrección:
 * selección de regla aplicable"): `findApprovedEffectiveAt` (elegía la
 * versión más reciente del PROGRAMA, sin considerar si contenía la regla
 * del `activityType` evaluado) se retiró -- `XpGrantService` ahora
 * resuelve la regla aplicable directamente vía
 * `XpRuleRepository.findApplicableRule`, sin un paso intermedio de
 * "elegir la versión primero".
 */
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
}
