import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { SubjectRepository } from '../education/subject.repository';
import { CurriculumTopicRepository } from '../education/curriculum-topic.repository';
import { CurriculumTopicProgressRepository } from '../progress/curriculum-topic-progress.repository';
import { ProgressionService } from './progression.service';
import type { TitleV1Metric } from './titles-v1-catalog';

/**
 * TITLES-V1 -- lectura PURA, sin escritura, de los 6 métricas de
 * elegibilidad de los 7 títulos congelados. Reutiliza EXACTAMENTE las
 * mismas definiciones canónicas ya establecidas en otras superficies
 * (recurso/unidad canónicos = mismo criterio que "Progreso por materia" de
 * Perfil y los avatares históricos; nunca una completitud aislada ni
 * TEMA_COMPLETADO como proxy de unidad completa).
 */
@Injectable()
export class TitleEligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subjectRepo: SubjectRepository,
    private readonly curriculumTopicRepo: CurriculumTopicRepository,
    private readonly curriculumTopicProgressRepo: CurriculumTopicProgressRepository,
    private readonly progressionService: ProgressionService,
  ) {}

  async evaluateMetric(accountId: string, metric: TitleV1Metric, threshold: number): Promise<boolean> {
    switch (metric) {
      case 'RESOURCES_COMPLETED':
        return (await this.countCanonicalResourcesCompleted(accountId)) >= threshold;
      case 'UNITS_COMPLETED':
        return (await this.countCanonicalUnitsCompleted(accountId)) >= threshold;
      case 'EXAMS_COMPLETED':
        return (await this.countCanonicalExamsCompleted(accountId)) >= threshold;
      case 'CHALLENGES_CLAIMED':
        return (await this.countDistinctChallengesClaimed(accountId)) >= threshold;
      case 'LEVEL_REACHED':
        return (await this.getCurrentLevelNumber(accountId)) >= threshold;
      case 'LEAGUE_TIER_REACHED':
        return this.hasReachedLeagueTierAtLeast(accountId, threshold);
    }
  }

  /** Constancia de Hierro -- MISMA definición exacta que PROFILE-01 ("Progreso por materia"): recurso canónico = hijo con learning_resource_version PUBLISHED. */
  async countCanonicalResourcesCompleted(accountId: string): Promise<number> {
    const rows = await this.curriculumTopicProgressRepo.findCanonicalResourceProgressByAccount(accountId);
    return rows.filter((r) => r.status === 'COMPLETED').length;
  }

  /** Erudito/Polímata -- unidad completa = TODOS sus recursos canónicos COMPLETED (nunca una completitud aislada). */
  async countCanonicalUnitsCompleted(accountId: string): Promise<number> {
    const subjects = await this.subjectRepo.findAllActive();
    let completed = 0;
    for (const subject of subjects) {
      const units = await this.curriculumTopicRepo.findCanonicalUnitRootsBySubjectId(subject.id);
      for (const unit of units) {
        const childIds = await this.curriculumTopicRepo.findCanonicalResourceChildIds(unit.id);
        if (childIds.length === 0) continue;
        const progressRows = await this.curriculumTopicProgressRepo.findManyByAccountAndTopicIds(accountId, childIds);
        const completedCount = progressRows.filter((row) => row.status === 'COMPLETED').length;
        if (completedCount >= childIds.length) completed++;
      }
    }
    return completed;
  }

  /** Simulador de Élite -- ensayo canónico completado al menos una vez (status COMPLETED real, nunca EXPIRED). */
  async countCanonicalExamsCompleted(accountId: string): Promise<number> {
    const rows = await this.prisma.examAttempt.groupBy({
      by: ['examId'],
      where: { accountId, status: 'COMPLETED', exam: { status: 'PUBLISHED' } },
    });
    return rows.length;
  }

  /** Desafiante -- desafíos DISTINTOS reclamados (CLAIMED), nunca solo completados. */
  async countDistinctChallengesClaimed(accountId: string): Promise<number> {
    const rows = await this.prisma.accountChallenge.groupBy({
      by: ['challengeDefinitionId'],
      where: { accountId, challengeStatus: 'CLAIMED' },
    });
    return rows.length;
  }

  /** Veterano -- nivel actual real (mismo cálculo que Perfil/HUD, `ProgressionService.getLevelProgress`). */
  async getCurrentLevelNumber(accountId: string): Promise<number> {
    const progress = await this.progressionService.getLevelProgress(accountId);
    return progress.currentLevel.levelNumber;
  }

  /**
   * Ascendente -- evidencia DURABLE de haber alcanzado Diamante o superior
   * al menos una vez: CUALQUIER `season_league_participation` histórica
   * (cualquier temporada, cualquier `participationStatus`) cuyo tier tenga
   * `tierOrder >= minTierOrder`. Nunca infiere desde el tier ACTUAL --
   * descender después no borra el logro, y el logro tampoco se fabrica si
   * nunca existió esa fila.
   */
  async hasReachedLeagueTierAtLeast(accountId: string, minTierOrder: number): Promise<boolean> {
    const count = await this.prisma.seasonLeagueParticipation.count({
      where: { accountId, leagueDefinition: { tierOrder: { gte: minTierOrder } } },
    });
    return count > 0;
  }
}
