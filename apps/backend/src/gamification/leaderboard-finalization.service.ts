import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma, PromotionOutcome, LeagueDefinition } from '../generated/prisma/client';
import { LeagueGroupRepository } from './league-group.repository';
import { LeagueDefinitionRepository } from './league-definition.repository';
import { LeaderboardCalculationService, TIE_BREAK_RULE_VERSION, RANKING_METRIC_VERSION, type RankedParticipant } from './leaderboard-calculation.service';
import { LeaderboardSnapshotRepository } from './leaderboard-snapshot.repository';
import { LeaderboardSnapshotEntryRepository } from './leaderboard-snapshot-entry.repository';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';
import { computeZoneCounts, resolveCompetitiveZone, MINIMUM_PARTICIPANTS_FOR_PROMOTION, type CompetitiveZone } from './promotion-grammar';

/**
 * Namespace de advisory lock DISTINTO a los ya en uso (19 ADR-0019, 20
 * Bloque III 4.c, 21 Incremento 1 inscripción) -- serializa la finalización
 * de UN grupo concreto, evitando que dos pasadas concurrentes del scheduler
 * (ej. un reintento superpuesto) calculen y escriban dos instantáneas
 * finales para el mismo grupo. Ver docs/adr/0020-ranking-materializacion.md
 * §7, Gate 19 (cierre idempotente).
 */
const LEADERBOARD_FINALIZATION_LOCK_NAMESPACE = 22;

/** COMPETITIVE V1 -- la gramática de zonas (percentajes, mínimo de participantes, bordes de tier) vive en `promotion-grammar.ts`, compartida con la zona EN VIVO del ranking. */
const ZONE_TO_OUTCOME: Record<CompetitiveZone, PromotionOutcome> = {
  PROMOTION: 'PROMOTED',
  RETENTION: 'RETAINED',
  DEMOTION: 'DEMOTED',
};

function computeContentHash(ranked: RankedParticipant[], outcomes: Map<string, PromotionOutcome>): string {
  // Serialización canónica ordenada por rankPosition -- nunca por orden de
  // inserción o de iteración de la base (ADR-0020 §5).
  const canonical = [...ranked]
    .sort((a, b) => a.rankPosition - b.rankPosition)
    .map((r) => `${r.seasonLeagueParticipationId}:${r.rankPosition}:${r.metricValue}:${r.tieBreakValue.toISOString()}:${outcomes.get(r.seasonLeagueParticipationId)}`)
    .join('|');
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Cierre de grupo (ADR-0020 §7): último recálculo, gramática de
 * ascenso/descenso (§4), instantánea inmutable (§5), transición de
 * `participationStatus`/`league_group.status`. Extiende la pipeline de
 * cierre de temporada de Incremento 1 sin reabrir `SeasonTransitionService`
 * -- consume el estado `LOCKED` que ese servicio ya produce.
 */
@Injectable()
export class LeaderboardFinalizationService {
  private readonly logger = new Logger(LeaderboardFinalizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly groupRepo: LeagueGroupRepository,
    private readonly leagueDefinitionRepo: LeagueDefinitionRepository,
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly calculationService: LeaderboardCalculationService,
    private readonly snapshotRepo: LeaderboardSnapshotRepository,
    private readonly snapshotEntryRepo: LeaderboardSnapshotEntryRepository,
  ) {}

  async finalizePendingGroups(): Promise<{ finalized: number; skipped: number; failed: number }> {
    const groups = await this.groupRepo.findLockedNotFinalized();

    let finalized = 0;
    let skipped = 0;
    let failed = 0;

    // Aislamiento de fallo por grupo (mismo criterio que RewardEvaluationWorker/
    // LeaderboardCalculationScheduler) -- un error en un grupo nunca bloquea a los demás.
    for (const group of groups) {
      try {
        const didFinalize = await this.finalizeGroup(group.id);
        if (didFinalize) finalized++;
        else skipped++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`No se pudo finalizar el grupo ${group.id}: ${message}`);
      }
    }

    return { finalized, skipped, failed };
  }

  /**
   * `pg_advisory_xact_lock` BLOQUEANTE por `groupId` -- mismo criterio que
   * `ChallengeService.claim`/`LeagueEnrollmentService.joinActiveSeason`.
   * Devuelve `false` (no-op idempotente) si el grupo ya no está `LOCKED`
   * (ya finalizado por una pasada anterior o todavía no cerrado) -- nunca
   * duplica una instantánea ni re-transiciona `participationStatus`.
   */
  async finalizeGroup(groupId: string): Promise<boolean> {
    const leaderboardDefinition = await this.calculationService.ensureLeaderboardDefinition();

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LEADERBOARD_FINALIZATION_LOCK_NAMESPACE}, hashtext(${groupId}))`;

        const group = await tx.leagueGroup.findUnique({ where: { id: groupId } });
        if (!group || group.status !== 'LOCKED') return false;

        const leagueDefinition = await this.leagueDefinitionRepo.findById(group.leagueDefinitionId, tx);
        if (!leagueDefinition) throw new Error(`league_definition ${group.leagueDefinitionId} no existe`);

        // Último recálculo con datos ya congelados -- el grupo dejó de
        // acumular puntos al pasar a LOCKED en Incremento 1.
        const ranked = await this.calculationService.recalculateGroup(tx, leaderboardDefinition.id, group.gameSeasonId, groupId);

        const outcomes = await this.decideOutcomes(tx, leagueDefinition, ranked);

        const snapshotAt = new Date();
        const contentHash = computeContentHash(ranked, outcomes);

        const snapshot = await this.snapshotRepo.create(tx, {
          leagueGroupId: groupId,
          gameSeasonId: group.gameSeasonId,
          leagueDefinitionId: leagueDefinition.id,
          leaderboardDefinitionId: leaderboardDefinition.id,
          snapshotAt,
          tieBreakRuleVersion: TIE_BREAK_RULE_VERSION,
          promotionRuleVersion: leagueDefinition.promotionRule ?? 'none',
          demotionRuleVersion: leagueDefinition.demotionRule ?? 'none',
          rankingMetricVersion: RANKING_METRIC_VERSION,
          participantCount: ranked.length,
          contentHash,
        });

        await this.snapshotEntryRepo.createMany(
          tx,
          ranked.map((r) => ({
            leaderboardSnapshotId: snapshot.id,
            seasonLeagueParticipationId: r.seasonLeagueParticipationId,
            rankPosition: r.rankPosition,
            metricValue: r.metricValue,
            tieBreakValue: r.tieBreakValue,
            promotionOutcome: outcomes.get(r.seasonLeagueParticipationId) as PromotionOutcome,
          })),
        );

        for (const r of ranked) {
          await this.participationRepo.updateOutcome(tx, r.seasonLeagueParticipationId, {
            participationStatus: outcomes.get(r.seasonLeagueParticipationId) as PromotionOutcome,
            finalRank: r.rankPosition,
            finalizedAt: snapshotAt,
          });
        }

        await this.groupRepo.updateStatus(tx, groupId, 'FINALIZED', snapshotAt);

        return true;
      },
      { timeout: 30_000, maxWait: 30_000 },
    );
  }

  /**
   * Gramática `top/bottom N%` completamente formalizada -- ADR-0020 §4.
   * `G` = cantidad REAL de participaciones (nunca la capacidad teórica).
   */
  private async decideOutcomes(
    tx: Prisma.TransactionClient,
    leagueDefinition: LeagueDefinition,
    ranked: RankedParticipant[],
  ): Promise<Map<string, PromotionOutcome>> {
    const outcomes = new Map<string, PromotionOutcome>();
    const G = ranked.length;

    if (G < MINIMUM_PARTICIPANTS_FOR_PROMOTION) {
      for (const r of ranked) outcomes.set(r.seasonLeagueParticipationId, 'RETAINED');
      return outcomes;
    }

    const { promoteCount, demoteCount } = computeZoneCounts({
      participantCount: G,
      promotionRule: leagueDefinition.promotionRule,
      demotionRule: leagueDefinition.demotionRule,
    });

    const highestTier = await this.leagueDefinitionRepo.findHighestActiveTier(tx);
    const lowestTier = await this.leagueDefinitionRepo.findLowestActiveTier(tx);
    const isHighestTier = highestTier?.id === leagueDefinition.id;
    const isLowestTier = lowestTier?.id === leagueDefinition.id;

    for (const r of ranked) {
      const zone = resolveCompetitiveZone({
        rankPosition: r.rankPosition,
        participantCount: G,
        promoteCount,
        demoteCount,
        isHighestTier,
        isLowestTier,
      });
      outcomes.set(r.seasonLeagueParticipationId, ZONE_TO_OUTCOME[zone]);
    }

    return outcomes;
  }
}
