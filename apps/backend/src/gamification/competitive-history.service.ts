import { Injectable } from '@nestjs/common';
import { SeasonLeagueParticipationRepository, type FinalizedParticipationWithContext } from './season-league-participation.repository';
import { LeaderboardSnapshotEntryRepository } from './leaderboard-snapshot-entry.repository';

export interface SeasonHistoryEntryView {
  seasonKey: string;
  seasonName: string;
  seasonStartsAt: Date;
  seasonEndsAt: Date;
  leagueKey: string;
  leagueName: string;
  finalRank: number;
  metricValue: number;
  outcome: 'PROMOTED' | 'DEMOTED' | 'RETAINED';
  finalizedAt: Date;
}

/**
 * LEF Bloque V, Incremento 4 ("Historial competitivo cross-temporada") --
 * ver docs/adr/LEF-BLOCK-V-DEFINITION.md §12. Lectura pura sobre datos YA
 * persistidos por Bloque IV (`season_league_participation`,
 * `leaderboard_snapshot_entry`) -- sin escritura, sin recálculo, sin nueva
 * mecánica. Bloque IV permanece cerrado: este servicio LEE sus tablas, no
 * modifica ninguna regla de cálculo/ascenso-descenso.
 */
@Injectable()
export class CompetitiveHistoryService {
  constructor(
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly snapshotEntryRepo: LeaderboardSnapshotEntryRepository,
  ) {}

  async getHistory(accountId: string): Promise<SeasonHistoryEntryView[]> {
    const finalized = await this.participationRepo.findFinalizedByAccountId(accountId);
    if (finalized.length === 0) return [];

    const snapshotEntries = await this.snapshotEntryRepo.findCurrentByParticipationIds(finalized.map((p) => p.id));
    const snapshotByParticipationId = new Map(snapshotEntries.map((e) => [e.seasonLeagueParticipationId, e]));

    const views: SeasonHistoryEntryView[] = [];
    for (const participation of finalized) {
      // Por invariante de LeaderboardFinalizationService, toda participación
      // PROMOTED/DEMOTED/RETAINED tiene su leaderboard_snapshot_entry creado
      // en la MISMA transacción que fijó ese estado -- nunca debería faltar.
      // Si faltara (inconsistencia real de datos), esta fila se OMITE en vez
      // de fabricar un rankPosition/metricValue inventado -- nunca se
      // recalcula ni se aproxima.
      const snapshot = snapshotByParticipationId.get(participation.id);
      if (!snapshot) continue;
      views.push(this.toView(participation, snapshot.rankPosition, snapshot.metricValue));
    }
    return views;
  }

  private toView(participation: FinalizedParticipationWithContext, finalRank: number, metricValue: number): SeasonHistoryEntryView {
    return {
      seasonKey: participation.gameSeason.seasonKey,
      seasonName: participation.gameSeason.name,
      seasonStartsAt: participation.gameSeason.startsAt,
      seasonEndsAt: participation.gameSeason.endsAt,
      leagueKey: participation.leagueDefinition.leagueKey,
      leagueName: participation.leagueDefinition.name,
      finalRank,
      metricValue,
      outcome: participation.participationStatus as 'PROMOTED' | 'DEMOTED' | 'RETAINED',
      finalizedAt: participation.finalizedAt!,
    };
  }
}
