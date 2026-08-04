import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AchievementVersion, AchievementVersionApprovalStatus } from '../generated/prisma/client';
import { XpThresholdUnlockRuleSchema, serializeUnlockRule } from './achievement-unlock-rule';

/**
 * Único punto de acceso a `achievement_version` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md (Incremento 2, sub-incremento 2.a/2.b).
 * Deliberadamente SIN `update()`/`delete()`: cabecera de versión inmutable
 * una vez creada -- mismo criterio que `GamificationProgramVersion`
 * (Bloque I). Cambiar el umbral exige crear una versión nueva, nunca
 * editar `unlockRule` de una fila existente.
 *
 * `unlockRule` se valida con el mismo esquema Zod (`XpThresholdUnlockRuleSchema`,
 * 2.b) que usa el evaluador -- una sola fuente de verdad para la gramática.
 * Acepta el objeto de la regla (no un string) para que el llamador nunca
 * pueda pasar JSON con orden de claves distinto -- el repositorio serializa
 * a la forma canónica siempre.
 */
@Injectable()
export class AchievementVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    achievementDefinitionId: string;
    versionLabel: string;
    unlockRule: unknown;
    rewardBundleId?: string | null;
    iconAssetVersionId?: string | null;
    effectiveFrom?: Date | null;
    effectiveUntil?: Date | null;
    approvalStatus?: AchievementVersionApprovalStatus;
    approvedAt?: Date | null;
  }): Promise<AchievementVersion> {
    const rule = XpThresholdUnlockRuleSchema.parse(input.unlockRule);
    return this.prisma.achievementVersion.create({ data: { ...input, unlockRule: serializeUnlockRule(rule) } });
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
