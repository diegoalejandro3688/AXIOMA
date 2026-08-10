import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { PromotionOutcome, LeaderboardSnapshotEntry } from '../generated/prisma/client';

/**
 * Único punto de acceso a `leaderboard_snapshot_entry` -- ver
 * docs/adr/0020-ranking-materializacion.md §5. Fila hija INMUTABLE de
 * `leaderboard_snapshot` -- una por participación, creada UNA sola vez junto
 * a su padre, en la misma transacción. Solo expone `createMany`.
 */
export interface LeaderboardSnapshotEntryInput {
  leaderboardSnapshotId: string;
  seasonLeagueParticipationId: string;
  rankPosition: number;
  metricValue: number;
  tieBreakValue: Date;
  promotionOutcome: PromotionOutcome;
}

@Injectable()
export class LeaderboardSnapshotEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(tx: Prisma.TransactionClient, rows: LeaderboardSnapshotEntryInput[]): Promise<void> {
    if (rows.length === 0) return;
    await tx.leaderboardSnapshotEntry.createMany({ data: rows });
  }

  /**
   * LEF Bloque V, Incremento 4 ("Historial competitivo cross-temporada") --
   * lote, UNA sola consulta `WHERE season_league_participation_id IN
   * (...)`, filtrando a la instantánea VIGENTE de cada participación
   * (`leaderboardSnapshot: { supersededBy: null }` -- mismo criterio de
   * "vigente" que `LeaderboardSnapshotRepository.findCurrentFinalForGroup`).
   * Una corrección futura (fila con `supersedesSnapshotId`) automáticamente
   * reemplaza cuál fila devuelve esta consulta, sin cambiar este método --
   * nunca se lee una instantánea ya superada.
   */
  findCurrentByParticipationIds(participationIds: string[]): Promise<LeaderboardSnapshotEntry[]> {
    if (participationIds.length === 0) return Promise.resolve([]);
    return this.prisma.leaderboardSnapshotEntry.findMany({
      where: { seasonLeagueParticipationId: { in: participationIds }, leaderboardSnapshot: { supersededBy: null } },
    });
  }
}
