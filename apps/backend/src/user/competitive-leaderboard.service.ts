import { Injectable } from '@nestjs/common';
import { SeasonLeagueParticipationRepository } from '../gamification/season-league-participation.repository';
import { LeaderboardEntryRepository } from '../gamification/leaderboard-entry.repository';
import { LeaderboardDefinitionRepository } from '../gamification/leaderboard-definition.repository';
import { LeagueGroupRepository } from '../gamification/league-group.repository';
import { LeagueDefinitionRepository } from '../gamification/league-definition.repository';
import { LEADERBOARD_KEY } from '../gamification/leaderboard-calculation.service';
import { computeZoneCounts, resolveCompetitiveZone, type CompetitiveZone } from '../gamification/promotion-grammar';
import { CompetitiveProfileIdentityService, type CompetitiveProfileIdentity } from './competitive-profile-identity.service';
import { CompetitiveContextService, type CompetitiveContext } from './competitive-context.service';
import { encodeLeaderboardCursor, decodeLeaderboardCursor } from './leaderboard-cursor';

export const DEFAULT_LEADERBOARD_LIMIT = 20;
export const MAX_LEADERBOARD_LIMIT = 100;

export type LeaderboardRowView =
  | ({ presentable: true; isCurrentUser: boolean; rankPosition: number; metricValue: number; competitiveZone: CompetitiveZone } & Omit<CompetitiveProfileIdentity, 'accountId'>)
  | { presentable: false; isCurrentUser: boolean; rankPosition: number; metricValue: number; competitiveZone: CompetitiveZone };

export interface LeaderboardPageView {
  entries: LeaderboardRowView[];
  nextCursor: string | null;
  competitiveContext: CompetitiveContext | null;
}

function omitAccountId(identity: CompetitiveProfileIdentity): Omit<CompetitiveProfileIdentity, 'accountId'> {
  const { username, avatar, banner, equippedTitle, equippedCosmetics, levelNumber, publicAchievements, featuredAchievements } = identity;
  return { username, avatar, banner, equippedTitle, equippedCosmetics, levelNumber, publicAchievements, featuredAchievements };
}

/**
 * Bloque IV, Incremento 3, sub-incremento 3.c (ADR-0021 §1/§5, precisiones
 * obligatorias del Product Owner 2026-08-06) -- lista paginada del ranking
 * del GRUPO del solicitante. Sin `groupId` de entrada: se resuelve
 * server-side desde la participación activa de `request.accountId` --
 * ningún cliente puede navegar el ranking de un grupo ajeno por id.
 *
 * Reutiliza `CompetitiveProfileIdentityService` (3.a) para identidad/
 * presentabilidad por lote -- esta clase nunca vuelve a decidir eso por
 * su cuenta, solo ensambla la página y aplica la excepción de
 * autoconsulta (ver `resolvePage`).
 */
@Injectable()
export class CompetitiveLeaderboardService {
  constructor(
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly entryRepo: LeaderboardEntryRepository,
    private readonly leaderboardDefinitionRepo: LeaderboardDefinitionRepository,
    private readonly identityService: CompetitiveProfileIdentityService,
    private readonly contextService: CompetitiveContextService,
    // COMPETITIVE V1 -- añadidos al FINAL para no romper la instanciación
    // posicional de gates que ya construyen este servicio a mano.
    private readonly leagueGroupRepo: LeagueGroupRepository,
    private readonly leagueDefinitionRepo: LeagueDefinitionRepository,
  ) {}

  /**
   * COMPETITIVE V1 -- zona EN VIVO por `rankPosition`, autoridad del backend
   * (`promotion-grammar.ts`, MISMO helper que el cierre de grupo). Resuelve
   * el contexto del grupo una sola vez y devuelve una función pura por fila.
   * Ante cualquier hueco de integridad referencial (grupo/tier ausente) cae
   * a `RETENTION` -- este campo es de presentación, nunca debe hacer 500.
   */
  private async buildZoneResolver(leagueGroupId: string): Promise<(rankPosition: number) => CompetitiveZone> {
    const group = await this.leagueGroupRepo.findById(leagueGroupId);
    if (!group) return () => 'RETENTION';
    const [leagueDefinition, participantCount, highestTier, lowestTier] = await Promise.all([
      this.leagueDefinitionRepo.findById(group.leagueDefinitionId),
      this.leagueGroupRepo.countParticipantsForGroup(leagueGroupId),
      this.leagueDefinitionRepo.findHighestActiveTier(),
      this.leagueDefinitionRepo.findLowestActiveTier(),
    ]);
    if (!leagueDefinition) return () => 'RETENTION';
    const isHighestTier = highestTier?.id === leagueDefinition.id;
    const isLowestTier = lowestTier?.id === leagueDefinition.id;
    const { promoteCount, demoteCount } = computeZoneCounts({
      participantCount,
      promotionRule: leagueDefinition.promotionRule,
      demotionRule: leagueDefinition.demotionRule,
    });
    return (rankPosition: number) =>
      resolveCompetitiveZone({ rankPosition, participantCount, promoteCount, demoteCount, isHighestTier, isLowestTier });
  }

  async resolvePage(accountId: string, options: { cursor?: string; limit?: number }): Promise<LeaderboardPageView> {
    const limit = Math.min(options.limit ?? DEFAULT_LEADERBOARD_LIMIT, MAX_LEADERBOARD_LIMIT);
    const afterRankPosition = options.cursor !== undefined ? decodeLeaderboardCursor(options.cursor) : undefined;

    const participation = await this.participationRepo.findActiveByAccountId(accountId);
    if (!participation) return { entries: [], nextCursor: null, competitiveContext: null };

    const leaderboardDefinition = await this.leaderboardDefinitionRepo.findActiveByKey(LEADERBOARD_KEY);
    if (!leaderboardDefinition) return { entries: [], nextCursor: null, competitiveContext: null };

    const [page, competitiveContext, zoneFor] = await Promise.all([
      this.entryRepo.findByGroupPaginatedByRank(participation.leagueGroupId, { limit, afterRankPosition }),
      this.contextService.resolveByAccountId(accountId),
      this.buildZoneResolver(participation.leagueGroupId),
    ]);
    if (page.length === 0) return { entries: [], nextCursor: null, competitiveContext };

    const participations = await this.participationRepo.findManyByIds(page.map((e) => e.seasonLeagueParticipationId));
    const accountIdByParticipationId = new Map(participations.map((p) => [p.id, p.accountId]));

    const rowAccountIds = page.map((e) => accountIdByParticipationId.get(e.seasonLeagueParticipationId)).filter((id): id is string => Boolean(id));
    const identities = await this.identityService.resolveManyByAccountIds(rowAccountIds);

    // Excepción de autoconsulta (precisión obligatoria del Product Owner):
    // si la fila propia cae en esta página y el lote la marcó no
    // presentable (perfil PRIVATE), se resuelve de nuevo SIN el filtro de
    // presentabilidad pública -- UNA sola consulta adicional dirigida,
    // nunca una por fila, y solo si realmente hace falta.
    let ownIdentity: CompetitiveProfileIdentity | null | undefined;
    const needsOwnOverride = rowAccountIds.includes(accountId) && identities.get(accountId)?.presentable !== true;
    if (needsOwnOverride) {
      ownIdentity = await this.identityService.assembleIdentityForOwnAccount(accountId);
    }

    const entries: LeaderboardRowView[] = page.map((entry) => {
      const rowAccountId = accountIdByParticipationId.get(entry.seasonLeagueParticipationId);
      const isCurrentUser = rowAccountId === accountId;
      const competitiveZone = zoneFor(entry.rankPosition);

      if (isCurrentUser && ownIdentity) {
        return { presentable: true, isCurrentUser: true, rankPosition: entry.rankPosition, metricValue: entry.metricValue, competitiveZone, ...omitAccountId(ownIdentity) };
      }

      const resolved = rowAccountId ? identities.get(rowAccountId) : undefined;
      if (resolved?.presentable) {
        return {
          presentable: true,
          isCurrentUser,
          rankPosition: entry.rankPosition,
          metricValue: entry.metricValue,
          competitiveZone,
          ...omitAccountId(resolved.identity),
        };
      }
      return { presentable: false, isCurrentUser, rankPosition: entry.rankPosition, metricValue: entry.metricValue, competitiveZone };
    });

    const nextCursor = page.length === limit ? encodeLeaderboardCursor(page[page.length - 1]!.rankPosition) : null;
    return { entries, nextCursor, competitiveContext };
  }
}
