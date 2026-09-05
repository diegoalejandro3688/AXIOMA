import { Injectable } from '@nestjs/common';
import { GameSeasonRepository } from './game-season.repository';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';
import { LeagueGroupRepository } from './league-group.repository';

export type QuickLpIneligibleReason = 'NO_ACTIVE_SEASON' | 'NO_ACTIVE_PARTICIPATION';

export type QuickLpEligibility =
  | { eligible: true; reason: null }
  | { eligible: false; reason: QuickLpIneligibleReason };

/**
 * STABILIZATION-B7 -- ÚNICA definición de "esta cuenta puede recibir League
 * Points AHORA". La comparten:
 *
 *   - `QuickQuestionService.answer`  -> decide si el móvil puede mostrar
 *     "+2 LP pendiente" tras un acierto (nunca antes lo consultaba: sumaba
 *     pendiente sólo por ser correcta -- ese era el bug de B1/B5A).
 *   - `LeaguePointGrantService`      -> mismo criterio de pre-chequeo que su
 *     relectura autoritativa dentro de la transacción SERIALIZABLE.
 *
 * Elegible sii TODO lo siguiente:
 *   - existe una temporada canónica VIGENTE (`game_season` status ACTIVE con
 *     `now` dentro de `[startsAt, endsAt)`), y
 *   - la cuenta tiene una participación `ACTIVE` en ESA temporada, y
 *   - su `league_group` está OPEN o FULL (nunca LOCKED/FINALIZED).
 *
 * Lectura pura -- ninguna escritura. No decide correctness (eso lo hace
 * `QuickQuestionService` / `LeaguePointGrantService` con `attempt.isCorrect`);
 * responde sólo la pregunta "hay dónde otorgar LP".
 */
@Injectable()
export class QuickLpEligibilityService {
  constructor(
    private readonly seasonRepo: GameSeasonRepository,
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly leagueGroupRepo: LeagueGroupRepository,
  ) {}

  async resolve(accountId: string, now: Date = new Date()): Promise<QuickLpEligibility> {
    const season = await this.seasonRepo.findCurrent(now);
    if (!season) return { eligible: false, reason: 'NO_ACTIVE_SEASON' };

    const participation = await this.participationRepo.findCurrentByAccountId(accountId, now);
    if (!participation) return { eligible: false, reason: 'NO_ACTIVE_PARTICIPATION' };

    const group = await this.leagueGroupRepo.findById(participation.leagueGroupId);
    if (!group || (group.status !== 'OPEN' && group.status !== 'FULL')) {
      return { eligible: false, reason: 'NO_ACTIVE_PARTICIPATION' };
    }

    return { eligible: true, reason: null };
  }
}
