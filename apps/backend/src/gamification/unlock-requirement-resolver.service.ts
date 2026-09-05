import { Injectable } from '@nestjs/common';
import { RewardBundleRepository } from './reward-bundle.repository';
import { LevelDefinitionRepository } from './level-definition.repository';
import { AchievementVersionRepository } from './achievement-version.repository';
import { ChallengeDefinitionRepository } from './challenge-definition.repository';
import { TitleDefinitionRepository } from './title-definition.repository';
import { CurriculumTopicRepository } from '../education/curriculum-topic.repository';
import { CosmeticItemRepository } from './cosmetic-item.repository';
import { SubjectRepository } from '../education/subject.repository';
import { parseUnlockRule } from './achievement-unlock-rule';
import { TITLES_V1, type TitleV1Metric } from './titles-v1-catalog';
import { HISTORIC_AVATAR_SUBJECT_MAP } from './cosmetics-v1-catalog';
import type { RewardComponentType } from '../generated/prisma/client';

export type UnlockRequirementView =
  | { source: 'LEVEL'; levelNumber: number; minimumLifetimeXp: number }
  | { source: 'ACHIEVEMENT'; achievementKey: string; achievementName: string; unlockRule: { schemaVersion: 'v1'; type: 'XP_THRESHOLD'; value: number } }
  | { source: 'CHALLENGE'; challengeKey: string; challengeName: string; challengeType: 'DAILY' | 'WEEKLY'; completionRule: string }
  | { source: 'STUDY_UNIT'; unitCode: string; unitName: string; requirementCopy: string }
  | { source: 'STUDY_SUBJECT'; subjectCode: string; subjectName: string; requirementCopy: string }
  | { source: 'TITLE_THRESHOLD'; metric: TitleV1Metric; threshold: number; requirementCopy: string };

/**
 * LEF Bloque V, Incremento 6 ("Personalización con elementos bloqueados y
 * requisito de desbloqueo visible") -- ver docs/adr/LEF-BLOCK-V-DEFINITION.md
 * §14. Deriva el requisito de obtención de un TITLE/COSMETIC EXCLUSIVAMENTE
 * de datos ya persistidos y canónicos -- nunca inventa ni aproxima un
 * requisito. Un artículo sin ningún origen canónico conocido devuelve `[]`
 * (requisito desconocido, honesto), nunca un valor fabricado.
 *
 * Rutas canónicas de requisito que este servicio entiende:
 *   1. `reward_bundle_item -> reward_bundle -> level_definition`      (LEVEL)
 *   2. `reward_bundle_item -> reward_bundle -> achievement_version`   (ACHIEVEMENT)
 *   3. `reward_bundle_item -> reward_bundle -> challenge_definition`  (CHALLENGE)
 *   4. `reward_bundle_item -> reward_bundle -> curriculum_topic.reward_bundle_id`
 *      (STUDY_UNIT -- capacidad GENERAL; ningún cosmético V1 la usa hoy)
 *   5. `TitleDefinition.titleKey` en `TITLES_V1` (`titles-v1-catalog.ts`)
 *      (TITLE_THRESHOLD -- Títulos V1, STABILIZATION-B3, que NO usan
 *      `RewardBundle`: la propiedad vive directa en `account_title`)
 *   6. `cosmetic_item.itemKey` en `HISTORIC_AVATAR_SUBJECT_MAP`
 *      (STUDY_SUBJECT -- avatares históricos V1, STABILIZATION-B6A, maestría
 *      de materia; tampoco pasa por `RewardBundle` para el requisito)
 *
 * Lectura pura, sin escritura, sin reinterpretar `RewardEvaluationWorker`
 * ni ninguna regla de entrega -- solo lee la MISMA cadena relacional que
 * el worker ya usa para decidir qué entregar, nunca decide elegibilidad ni
 * evalúa progreso.
 */
@Injectable()
export class UnlockRequirementResolverService {
  constructor(
    private readonly rewardBundleRepo: RewardBundleRepository,
    private readonly levelDefinitionRepo: LevelDefinitionRepository,
    private readonly achievementVersionRepo: AchievementVersionRepository,
    private readonly challengeDefinitionRepo: ChallengeDefinitionRepository,
    private readonly curriculumTopicRepo: CurriculumTopicRepository,
    private readonly titleDefinitionRepo: TitleDefinitionRepository,
    private readonly cosmeticItemRepo: CosmeticItemRepository,
    private readonly subjectRepo: SubjectRepository,
  ) {}

  /**
   * Resolución por lote -- número de consultas ACOTADO (<=6),
   * independiente de cuántos `referenceIds` se resuelvan: todas
   * `WHERE ... IN (...)`.
   */
  async resolveMany(componentType: RewardComponentType, referenceIds: string[]): Promise<Map<string, UnlockRequirementView[]>> {
    const result = new Map<string, UnlockRequirementView[]>();
    for (const id of referenceIds) result.set(id, []);
    if (referenceIds.length === 0) return result;

    // Ruta 5 -- TITLE_THRESHOLD (Títulos V1, sin RewardBundle). Debe
    // ejecutarse ANTES de la salida temprana por `bundleLinks` vacío: un
    // Título V1 no tiene ningún `reward_bundle_item` que lo referencie.
    if (componentType === 'TITLE') {
      const definitions = await this.titleDefinitionRepo.findManyByIds(referenceIds);
      for (const definition of definitions) {
        const entry = TITLES_V1.find((t) => t.titleKey === definition.titleKey);
        if (!entry) continue;
        result.get(definition.id)?.push({
          source: 'TITLE_THRESHOLD',
          metric: entry.metric,
          threshold: entry.threshold,
          requirementCopy: entry.lockedRequirementCopy,
        });
      }
    }

    // Ruta 6 -- STUDY_SUBJECT (avatares históricos V1 = maestría de materia,
    // STABILIZATION-B6A). Como TITLE_THRESHOLD, NO pasa por `reward_bundle`:
    // el requisito se deriva del `itemKey` canónico del cosmético y del
    // `HISTORIC_AVATAR_SUBJECT_MAP` congelado, resolviendo el nombre real de
    // la materia desde `subject` (nunca un string arbitrario ni cinco
    // constantes en el cliente). Debe ejecutarse ANTES de la salida temprana
    // por `bundleLinks` vacío: los 5 vínculos `curriculum_topic.reward_bundle_id`
    // se retiraron en B6A.
    if (componentType === 'COSMETIC') {
      const items = await this.cosmeticItemRepo.findManyByIds(referenceIds);
      const historic = items.filter((item) => item.itemKey in HISTORIC_AVATAR_SUBJECT_MAP);
      if (historic.length > 0) {
        const subjectKeys = [...new Set(historic.map((item) => HISTORIC_AVATAR_SUBJECT_MAP[item.itemKey]!))];
        const subjectByKey = new Map(
          (await Promise.all(subjectKeys.map((key) => this.subjectRepo.findByKey(key))))
            .filter((s): s is NonNullable<typeof s> => s != null)
            .map((s) => [s.subjectKey, s] as const),
        );
        for (const item of historic) {
          const subject = subjectByKey.get(HISTORIC_AVATAR_SUBJECT_MAP[item.itemKey]!);
          if (!subject) continue;
          result.get(item.id)?.push({
            source: 'STUDY_SUBJECT',
            subjectCode: subject.subjectKey,
            subjectName: subject.name,
            requirementCopy: `Completa ${subject.name}`,
          });
        }
      }
    }

    // Rutas 1-4 -- basadas en `reward_bundle_item -> reward_bundle`.
    const bundleLinks = await this.rewardBundleRepo.findByComponentReferenceIds(componentType, referenceIds);
    if (bundleLinks.length === 0) return result;

    const bundleIds = [...new Set(bundleLinks.map((l) => l.rewardBundleId))];
    const [levels, achievementVersions, challenges, unitTopics] = await Promise.all([
      this.levelDefinitionRepo.findManyByRewardBundleIds(bundleIds),
      this.achievementVersionRepo.findManyApprovedByRewardBundleIds(bundleIds),
      this.challengeDefinitionRepo.findManyByRewardBundleIds(bundleIds),
      this.curriculumTopicRepo.findManyByRewardBundleIds(bundleIds),
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
    for (const topic of unitTopics) {
      if (!topic.rewardBundleId) continue;
      // Copia derivada de forma determinista del nombre canónico de la
      // unidad -- nunca un string arbitrario ni cinco constantes en el
      // cliente (STABILIZATION-B6 §7).
      requirementsByBundleId.get(topic.rewardBundleId)?.push({
        source: 'STUDY_UNIT',
        unitCode: topic.code,
        unitName: topic.name,
        requirementCopy: `Completa la unidad ${topic.name}`,
      });
    }

    for (const link of bundleLinks) {
      const requirements = requirementsByBundleId.get(link.rewardBundleId) ?? [];
      result.get(link.referenceId)?.push(...requirements);
    }

    return result;
  }
}
