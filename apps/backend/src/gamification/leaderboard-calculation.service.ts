import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { LeaderboardDefinition, SeasonLeagueParticipation } from '../generated/prisma/client';
import { LeaderboardDefinitionRepository } from './leaderboard-definition.repository';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';
import { LeaguePointLedgerEntryRepository } from './league-point-ledger-entry.repository';
import { LeaderboardEntryRepository } from './leaderboard-entry.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** Único ranking conocido en V1 -- mismo criterio que `PROGRAM_KEY = 'xp-core'` (Bloque I). */
export const LEADERBOARD_KEY = 'league-ranking-v1';
/** Grammar de desempate vigente (ADR-0020 §3) -- versión congelada en cada `leaderboard_snapshot` al cierre. */
export const TIE_BREAK_RULE_VERSION = 'v1-time-then-activity-count';
/** Fórmula de `metricValue` vigente -- versión congelada en cada `leaderboard_snapshot` al cierre. */
export const RANKING_METRIC_VERSION = 'sum-league-points-v1';

export interface RankedParticipant {
  seasonLeagueParticipationId: string;
  accountId: string;
  metricValue: number;
  tieBreakValue: Date;
  activityCount: number;
  rankPosition: number;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
}

/**
 * Calcula y persiste el ranking de UN grupo -- ver
 * docs/adr/0020-ranking-materializacion.md §1/§3/§6. Puro y reconstruible:
 * la ÚNICA entrada es `league_point_ledger_entry`/`season_league_participation`
 * de ese grupo -- nunca `public_profile` (ADR-0020 §1/§2, corrección
 * obligatoria del Product Owner: la visibilidad de perfil NUNCA excluye ni
 * altera el cálculo). `publicProfileId` de `leaderboard_entry` se deja
 * deliberadamente `null` en este incremento -- resolverlo exigiría que
 * GAMIFICATION llamara a un repositorio de USER, creando una dependencia
 * circular de módulos (UserModule ya importa GamificationModule para
 * `TitleEquipmentService`/`CosmeticEquipmentService`); se resuelve en el
 * Incremento 3, que unirá por `accountId` en su propia capa de presentación.
 */
@Injectable()
export class LeaderboardCalculationService {
  constructor(
    private readonly leaderboardDefinitionRepo: LeaderboardDefinitionRepository,
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly ledgerRepo: LeaguePointLedgerEntryRepository,
    private readonly entryRepo: LeaderboardEntryRepository,
  ) {}

  /** Find-or-create idempotente -- mismo patrón que `createIdempotent` del resto del dominio. */
  async ensureLeaderboardDefinition(): Promise<LeaderboardDefinition> {
    const existing = await this.leaderboardDefinitionRepo.findActiveByKey(LEADERBOARD_KEY);
    if (existing) return existing;
    try {
      return await this.leaderboardDefinitionRepo.create({
        leaderboardKey: LEADERBOARD_KEY,
        leaderboardType: 'LEAGUE',
        rankingMetric: 'league_points',
        scopeRule: 'group',
        tieBreakRule: TIE_BREAK_RULE_VERSION,
        updateFrequency: '15m',
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        const raced = await this.leaderboardDefinitionRepo.findActiveByKey(LEADERBOARD_KEY);
        if (raced) return raced;
      }
      throw error;
    }
  }

  /**
   * Orden de desempate (ADR-0020 §3/§4): `metricValue` DESC, `tieBreakValue`
   * ASC (quien lo alcanzó primero), `activityCount` DESC (más actividades
   * sostenidas), `accountId` ASC (última instancia, garantiza orden total
   * estricto -- nunca hay empates sin resolver).
   */
  async computeRanking(participations: SeasonLeagueParticipation[], tx?: Prisma.TransactionClient): Promise<RankedParticipant[]> {
    if (participations.length === 0) return [];

    const ids = participations.map((p) => p.id);
    const entries = await this.ledgerRepo.findAllByParticipationIds(ids, tx);

    const byParticipation = new Map<string, typeof entries>();
    for (const entry of entries) {
      const list = byParticipation.get(entry.seasonLeagueParticipationId) ?? [];
      list.push(entry);
      byParticipation.set(entry.seasonLeagueParticipationId, list);
    }

    const unranked = participations.map((p) => {
      // Ya viene ordenado (occurredAt ASC, id ASC) por la consulta -- el
      // último elemento es, por definición, el "momento de alcanzar el
      // puntaje" actual (ADR-0020 §3), incluyendo reversos correctamente.
      const list = byParticipation.get(p.id) ?? [];
      const metricValue = list.reduce((sum, e) => sum + e.pointAmount, 0);
      const last = list.length > 0 ? list[list.length - 1] : undefined;
      const tieBreakValue = last ? last.occurredAt : p.joinedAt;
      const activityCount = list.filter((e) => e.entryType === 'OTORGAMIENTO').length;
      return { seasonLeagueParticipationId: p.id, accountId: p.accountId, metricValue, tieBreakValue, activityCount };
    });

    unranked.sort((a, b) => {
      if (b.metricValue !== a.metricValue) return b.metricValue - a.metricValue;
      const tieBreakDiff = a.tieBreakValue.getTime() - b.tieBreakValue.getTime();
      if (tieBreakDiff !== 0) return tieBreakDiff;
      if (b.activityCount !== a.activityCount) return b.activityCount - a.activityCount;
      return a.accountId < b.accountId ? -1 : a.accountId > b.accountId ? 1 : 0;
    });

    return unranked.map((u, index) => ({ ...u, rankPosition: index + 1 }));
  }

  /** Recalcula y persiste `leaderboard_entry` para un grupo; actualiza `currentRank` (proyección) de cada participación. */
  async recalculateGroup(
    tx: Prisma.TransactionClient,
    leaderboardDefinitionId: string,
    gameSeasonId: string,
    groupId: string,
  ): Promise<RankedParticipant[]> {
    const participations = await this.participationRepo.findAllByGroupId(groupId, tx);
    const ranked = await this.computeRanking(participations, tx);

    await this.entryRepo.replaceAllForGroup(
      tx,
      groupId,
      ranked.map((r) => ({
        leaderboardDefinitionId,
        gameSeasonId,
        groupId,
        seasonLeagueParticipationId: r.seasonLeagueParticipationId,
        publicProfileId: null,
        rankPosition: r.rankPosition,
        metricValue: r.metricValue,
        tieBreakValue: r.tieBreakValue,
      })),
    );

    for (const r of ranked) {
      await this.participationRepo.updateCurrentRank(tx, r.seasonLeagueParticipationId, r.rankPosition);
    }

    return ranked;
  }
}
