import { Injectable } from '@nestjs/common';
import { RewardBundleRepository } from './reward-bundle.repository';
import { LevelDefinitionRepository } from './level-definition.repository';
import { AchievementVersionRepository } from './achievement-version.repository';
import { ChallengeDefinitionRepository } from './challenge-definition.repository';
import { parseUnlockRule } from './achievement-unlock-rule';
import type { RewardComponentType } from '../generated/prisma/client';

export type UnlockRequirementView =
  | { source: 'LEVEL'; levelNumber: number; minimumLifetimeXp: number }
  | { source: 'ACHIEVEMENT'; achievementKey: string; achievementName: string; unlockRule: { schemaVersion: 'v1'; type: 'XP_THRESHOLD'; value: number } }
  | { source: 'CHALLENGE'; challengeKey: string; challengeName: string; challengeType: 'DAILY' | 'WEEKLY'; completionRule: string };

/**
 * LEF Bloque V, Incremento 6 ("Personalización con elementos bloqueados y
 * requisito de desbloqueo visible") -- ver docs/adr/LEF-BLOCK-V-DEFINITION.md
 * §14. Deriva el requisito de obtención de un TITLE/COSMETIC EXCLUSIVAMENTE
 * de datos ya persistidos y canónicos (`reward_bundle_item` -> `reward_bundle`
 * -> {`level_definition`|`achievement_version`|`challenge_definition`}) --
 * nunca inventa ni aproxima un requisito. Un artículo sin ningún
 * `reward_bundle_item` que lo referencie devuelve `[]` (requisito
 * desconocido, honesto), nunca un valor fabricado.
 *
 * Lectura pura, sin escritura, sin reinterpretar `RewardEvaluationWorker`
 * ni ninguna regla de entrega -- este servicio solo lee la MISMA cadena
 * relacional que el worker ya usa para decidir qué entregar, nunca decide
 * elegibilidad ni evalúa progreso.
 */
@Injectable()
export class UnlockRequirementResolverService {
  constructor(
    private readonly rewardBundleRepo: RewardBundleRepository,
    private readonly levelDefinitionRepo: LevelDefinitionRepository,
    private readonly achievementVersionRepo: AchievementVersionRepository,
    private readonly challengeDefinitionRepo: ChallengeDefinitionRepository,
  ) {}

  /**
   * Resolución por lote -- número de consultas FIJO (4), independiente de
   * cuántos `referenceIds` se resuelvan: 1 para `reward_bundle_item`, 3
   * para los tres tipos de origen posibles, todas `WHERE ... IN (...)`.
   */
  async resolveMany(componentType: RewardComponentType, referenceIds: string[]): Promise<Map<string, UnlockRequirementView[]>> {
    const result = new Map<string, UnlockRequirementView[]>();
    for (const id of referenceIds) result.set(id, []);
    if (referenceIds.length === 0) return result;

    const bundleLinks = await this.rewardBundleRepo.findByComponentReferenceIds(componentType, referenceIds);
    if (bundleLinks.length === 0) return result;

    const bundleIds = [...new Set(bundleLinks.map((l) => l.rewardBundleId))];
    const [levels, achievementVersions, challenges] = await Promise.all([
      this.levelDefinitionRepo.findManyByRewardBundleIds(bundleIds),
      this.achievementVersionRepo.findManyApprovedByRewardBundleIds(bundleIds),
      this.challengeDefinitionRepo.findManyByRewardBundleIds(bundleIds),
    ]);

    const requirementsByBundleId = new Map<string, UnlockRequirementView[]>();
    for (const bundleId of bundleIds) requirementsByBundleId.set(bundleId, []);

    for (const level of levels) {
      if (!level.rewardBundleId) continue;
      requirementsByBundleId.get(level.rewardBundleId)?.push({ source: 'LEVEL', levelNumber: level.levelNumber, minimumLifetimeXp: level.minimumLifetimeXp });
    }
    for (const version of achievementVersions) {
      if (!version.rewardBundleId) continue;
      // `parseUnlockRule` es la MISMA función que usa el evaluador real (RewardEvaluationWorker) -- nunca se reinterpreta la gramática aquí.
      const rule = parseUnlockRule(version.unlockRule);
      requirementsByBundleId.get(version.rewardBundleId)?.push({
        source: 'ACHIEVEMENT',
        achievementKey: version.achievementDefinition.achievementKey,
        achievementName: version.achievementDefinition.name,
        unlockRule: rule,
      });
    }
    for (const challenge of challenges) {
      if (!challenge.rewardBundleId) continue;
      requirementsByBundleId.get(challenge.rewardBundleId)?.push({
        source: 'CHALLENGE',
        challengeKey: challenge.challengeKey,
        challengeName: challenge.name,
        challengeType: challenge.challengeType,
        completionRule: challenge.completionRule,
      });
    }

    for (const link of bundleLinks) {
      const requirements = requirementsByBundleId.get(link.rewardBundleId) ?? [];
      result.get(link.referenceId)?.push(...requirements);
    }

    return result;
  }
}
