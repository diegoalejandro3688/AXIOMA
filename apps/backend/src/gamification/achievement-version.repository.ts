import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AchievementVersion, AchievementVersionApprovalStatus } from '../generated/prisma/client';

/**
 * Único punto de acceso a `achievement_version` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md (Incremento 2, sub-incremento 2.a).
 * Deliberadamente SIN `update()`/`delete()`: cabecera de versión inmutable
 * una vez creada -- mismo criterio que `GamificationProgramVersion`
 * (Bloque I). `unlockRule` es texto OPACO en este sub-incremento: sin
 * gramática ni interpretación (ver comentario en schema.prisma) -- este
 * repositorio no valida su contenido más allá de "no vacío" (ver
 * `create()`), la evaluación real es responsabilidad de 2.b.
 */
@Injectable()
export class AchievementVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    achievementDefinitionId: string;
    versionLabel: string;
    unlockRule: string;
    rewardBundleId?: string | null;
    iconAssetVersionId?: string | null;
    effectiveFrom?: Date | null;
    effectiveUntil?: Date | null;
    approvalStatus?: AchievementVersionApprovalStatus;
    approvedAt?: Date | null;
  }): Promise<AchievementVersion> {
    if (input.unlockRule.trim().length === 0) {
      throw new Error('unlockRule no puede estar vacío.');
    }
    return this.prisma.achievementVersion.create({ data: input });
  }

  findById(id: string): Promise<AchievementVersion | null> {
    return this.prisma.achievementVersion.findUnique({ where: { id } });
  }

  findByDefinitionAndLabel(achievementDefinitionId: string, versionLabel: string): Promise<AchievementVersion | null> {
    return this.prisma.achievementVersion.findUnique({
      where: { achievementDefinitionId_versionLabel: { achievementDefinitionId, versionLabel } },
    });
  }

  /**
   * Única versión que puede fijarse al empezar a trackear progreso:
   * `approvalStatus = APPROVED`, vigente en `at` -- mismo predicado y
   * mismo criterio de desempate (`effectiveFrom` más reciente,
   * determinista) que `GamificationProgramVersionRepository.findApprovedEffectiveAt`
   * (Bloque I), copiado aquí porque opera sobre una tabla distinta, no
   * porque el criterio cambie. Reutilizado por 2.b para fijar
   * `achievement_version_id` la primera vez que se crea `achievement_progress`
   * -- nunca vuelve a re-resolverse para una fila ya existente (ADR-0019 §4).
   */
  findApprovedEffectiveAt(achievementDefinitionId: string, at: Date): Promise<AchievementVersion | null> {
    return this.prisma.achievementVersion.findFirst({
      where: {
        achievementDefinitionId,
        approvalStatus: 'APPROVED',
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }] },
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }] },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
