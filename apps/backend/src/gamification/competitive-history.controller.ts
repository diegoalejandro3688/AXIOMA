import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { competitiveHistoryResponseSchema, type CompetitiveHistoryResponse } from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { CompetitiveHistoryService, type SeasonHistoryEntryView } from './competitive-history.service';

function toResponse(entries: SeasonHistoryEntryView[]): CompetitiveHistoryResponse {
  return competitiveHistoryResponseSchema.parse({
    seasons: entries.map((e) => ({
      seasonKey: e.seasonKey,
      seasonName: e.seasonName,
      seasonStartsAt: e.seasonStartsAt.toISOString(),
      seasonEndsAt: e.seasonEndsAt.toISOString(),
      leagueKey: e.leagueKey,
      leagueName: e.leagueName,
      finalRank: e.finalRank,
      metricValue: e.metricValue,
      outcome: e.outcome,
      finalizedAt: e.finalizedAt.toISOString(),
    })),
  });
}

/**
 * LEF Bloque V, Incremento 4 (docs/adr/LEF-BLOCK-V-DEFINITION.md §12) --
 * historial competitivo cross-temporada, EXCLUSIVAMENTE privado
 * (`request.accountId`, nunca un id/username recibido del cliente). Ruta
 * separada de `LeagueParticipationController` a propósito -- superficie
 * distinta (historial vs. estado de inscripción actual), mismo criterio de
 * "un controller por familia de endpoints" ya usado en este módulo.
 *
 * Vive en GamificationModule (no en UserModule) porque toda la data que
 * consume (`season_league_participation`, `leaderboard_snapshot_entry`,
 * `game_season`, `league_definition`) ya es propiedad de GAMIFICATION y no
 * necesita ningún dato de USER (`public_profile`) -- a diferencia de los
 * Incrementos 1-3, que sí presentaban identidad pública.
 */
@Controller('gamification/me/league/history')
@UseGuards(AuthGuard)
export class CompetitiveHistoryController {
  constructor(private readonly historyService: CompetitiveHistoryService) {}

  @Get()
  async getHistory(@Req() request: AuthenticatedRequest): Promise<CompetitiveHistoryResponse> {
    const entries = await this.historyService.getHistory(request.accountId);
    return toResponse(entries);
  }
}
