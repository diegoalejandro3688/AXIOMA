import { Injectable } from '@nestjs/common';
import { SeasonLeagueParticipationRepository } from '../gamification/season-league-participation.repository';
import { LeaderboardEntryRepository } from '../gamification/leaderboard-entry.repository';
import { LeaderboardDefinitionRepository } from '../gamification/leaderboard-definition.repository';
import { LeagueGroupRepository } from '../gamification/league-group.repository';
import { LeagueDefinitionRepository } from '../gamification/league-definition.repository';
import { LEADERBOARD_KEY } from '../gamification/leaderboard-calculation.service';

export interface CompetitiveContext {
  leagueName: string;
  rankPosition: number;
  metricValue: number;
  calculatedAt: Date;
  snapshotVersion: number;
}

/**
 * Bloque IV, Incremento 3, sub-incremento 3.b (ADR-0021 §5) -- resuelve
 * EXCLUSIVAMENTE el contexto competitivo (rango, puntaje, liga) de UNA
 * cuenta. Deliberadamente separado de `CompetitiveProfileIdentityService`
 * (3.a, precisión obligatoria del Product Owner): un llamador que solo
 * necesita identidad/presentabilidad (ej. una fila de ranking ya
 * calculada en 3.c, que YA trae su propio `rankPosition`/`metricValue`)
 * nunca debe pagar el costo de estas consultas adicionales sobre
 * `season_league_participation`/`leaderboard_entry`.
 *
 * `null` cuando la cuenta no tiene participación activa, o cuando aún no
 * existe una fila `leaderboard_entry` calculada para ella (recién unida,
 * antes del primer ciclo del scheduler de 15 min) -- NUNCA un error: la
 * ausencia de contexto competitivo no es motivo de 404 en ningún endpoint
 * de este incremento (ADR-0021 §2, precisión del Product Owner 2026-08-06).
 *
 * Sin `groupId`/`seasonLeagueParticipationId`/ningún identificador interno
 * en el resultado -- solo datos de producto ya autorizados por la lista
 * blanca (Data Model §16.25: "posición, liga").
 */
@Injectable()
export class CompetitiveContextService {
  constructor(
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly entryRepo: LeaderboardEntryRepository,
    private readonly leaderboardDefinitionRepo: LeaderboardDefinitionRepository,
    private readonly leagueGroupRepo: LeagueGroupRepository,
    private readonly leagueDefinitionRepo: LeagueDefinitionRepository,
  ) {}

  async resolveByAccountId(accountId: string): Promise<CompetitiveContext | null> {
    const participation = await this.participationRepo.findActiveByAccountId(accountId);
    if (!participation) return null;

    const leaderboardDefinition = await this.leaderboardDefinitionRepo.findActiveByKey(LEADERBOARD_KEY);
    if (!leaderboardDefinition) return null;

    const entry = await this.entryRepo.findBySeasonLeagueParticipationId(leaderboardDefinition.id, participation.leagueGroupId, participation.id);
    if (!entry) return null;

    const group = await this.leagueGroupRepo.findById(participation.leagueGroupId);
    if (!group) return null;
    const definition = await this.leagueDefinitionRepo.findById(group.leagueDefinitionId);
    if (!definition) return null;

    return {
      leagueName: definition.name,
      rankPosition: entry.rankPosition,
      metricValue: entry.metricValue,
      calculatedAt: entry.calculatedAt,
      snapshotVersion: entry.snapshotVersion,
    };
  }
}
