import { Injectable } from '@nestjs/common';
import { SeasonLeagueParticipationRepository } from '../gamification/season-league-participation.repository';
import { LeaderboardEntryRepository } from '../gamification/leaderboard-entry.repository';
import { LeaderboardDefinitionRepository } from '../gamification/leaderboard-definition.repository';
import { LEADERBOARD_KEY } from '../gamification/leaderboard-calculation.service';
import { CompetitiveProfileIdentityService, type CompetitiveProfileIdentity } from './competitive-profile-identity.service';
import { CompetitiveContextService, type CompetitiveContext } from './competitive-context.service';
import { encodeLeaderboardCursor, decodeLeaderboardCursor } from './leaderboard-cursor';

export const DEFAULT_LEADERBOARD_LIMIT = 20;
export const MAX_LEADERBOARD_LIMIT = 100;

export type LeaderboardRowView =
  | ({ presentable: true; isCurrentUser: boolean; rankPosition: number; metricValue: number } & Omit<CompetitiveProfileIdentity, 'accountId'>)
  | { presentable: false; isCurrentUser: boolean; rankPosition: number; metricValue: number };

export interface LeaderboardPageView {
  entries: LeaderboardRowView[];
  nextCursor: string | null;
  competitiveContext: CompetitiveContext | null;
}

function omitAccountId(identity: CompetitiveProfileIdentity): Omit<CompetitiveProfileIdentity, 'accountId'> {
  const { username, avatar, banner, equippedTitle, equippedCosmetics, levelNumber, publicAchievements } = identity;
  return { username, avatar, banner, equippedTitle, equippedCosmetics, levelNumber, publicAchievements };
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
  ) {}

  async resolvePage(accountId: string, options: { cursor?: string; limit?: number }): Promise<LeaderboardPageView> {
    const limit = Math.min(options.limit ?? DEFAULT_LEADERBOARD_LIMIT, MAX_LEADERBOARD_LIMIT);
    const afterRankPosition = options.cursor !== undefined ? decodeLeaderboardCursor(options.cursor) : undefined;

    const participation = await this.participationRepo.findActiveByAccountId(accountId);
    if (!participation) return { entries: [], nextCursor: null, competitiveContext: null };

    const leaderboardDefinition = await this.leaderboardDefinitionRepo.findActiveByKey(LEADERBOARD_KEY);
    if (!leaderboardDefinition) return { entries: [], nextCursor: null, competitiveContext: null };

    const [page, competitiveContext] = await Promise.all([
      this.entryRepo.findByGroupPaginatedByRank(participation.leagueGroupId, { limit, afterRankPosition }),
      this.contextService.resolveByAccountId(accountId),
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

      if (isCurrentUser && ownIdentity) {
        return { presentable: true, isCurrentUser: true, rankPosition: entry.rankPosition, metricValue: entry.metricValue, ...omitAccountId(ownIdentity) };
      }

      const resolved = rowAccountId ? identities.get(rowAccountId) : undefined;
      if (resolved?.presentable) {
        return {
          presentable: true,
          isCurrentUser,
          rankPosition: entry.rankPosition,
          metricValue: entry.metricValue,
          ...omitAccountId(resolved.identity),
        };
      }
      return { presentable: false, isCurrentUser, rankPosition: entry.rankPosition, metricValue: entry.metricValue };
    });

    const nextCursor = page.length === limit ? encodeLeaderboardCursor(page[page.length - 1]!.rankPosition) : null;
    return { entries, nextCursor, competitiveContext };
  }
}
