import { Injectable } from '@nestjs/common';
import { SeasonLeagueParticipationRepository } from '../gamification/season-league-participation.repository';
import { LeaderboardEntryRepository } from '../gamification/leaderboard-entry.repository';
import { LeaderboardDefinitionRepository } from '../gamification/leaderboard-definition.repository';
import { LeagueGroupRepository } from '../gamification/league-group.repository';
import { LeagueDefinitionRepository } from '../gamification/league-definition.repository';
import { LEADERBOARD_KEY } from '../gamification/leaderboard-calculation.service';
import { computeZoneCounts, resolveCompetitiveZone, type CompetitiveZone } from '../gamification/promotion-grammar';

export interface CompetitiveContext {
  leagueName: string;
  /**
   * COMPETITIVE V1 (rediseño visual, Incremento 2) -- `tierOrder` del tier
   * actual (1..7), dato de producto de `league_definition`. Para el escudo
   * real de la liga en la tarjeta de posición del ranking.
   */
  leagueTier: number;
  rankPosition: number;
  metricValue: number;
  /**
   * COMPETITIVE V1 (rediseño visual, Incremento 2) -- zona EN VIVO de la
   * PROPIA posición, con la MISMA gramática (`promotion-grammar.ts`) que las
   * filas del ranking (`CompetitiveLeaderboardService.buildZoneResolver`) y
   * el cierre de grupo. El móvil la representa, nunca la calcula.
   */
  competitiveZone: CompetitiveZone;
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

    // COMPETITIVE V1 (rediseño visual, Incremento 2) -- zona EN VIVO de la
    // propia posición. Réplica EXACTA de `CompetitiveLeaderboardService.buildZoneResolver`:
    // conteo LIVE del grupo (no la cantidad de `leaderboard_entry`), reglas
    // `top/bottom-percent` del tier, bordes de tier más alto/bajo. Ante
    // cualquier hueco de integridad referencial cae a 'RETENTION' -- este
    // campo es de presentación, nunca debe hacer 500.
    const [participantCount, highestTier, lowestTier] = await Promise.all([
      this.leagueGroupRepo.countParticipantsForGroup(participation.leagueGroupId),
      this.leagueDefinitionRepo.findHighestActiveTier(),
      this.leagueDefinitionRepo.findLowestActiveTier(),
    ]);
    const { promoteCount, demoteCount } = computeZoneCounts({
      participantCount,
      promotionRule: definition.promotionRule,
      demotionRule: definition.demotionRule,
    });
    const competitiveZone = resolveCompetitiveZone({
      rankPosition: entry.rankPosition,
      participantCount,
      promoteCount,
      demoteCount,
      isHighestTier: highestTier?.id === definition.id,
      isLowestTier: lowestTier?.id === definition.id,
    });

    return {
      leagueName: definition.name,
      leagueTier: definition.tierOrder,
      rankPosition: entry.rankPosition,
      metricValue: entry.metricValue,
      competitiveZone,
      calculatedAt: entry.calculatedAt,
      snapshotVersion: entry.snapshotVersion,
    };
  }
}
