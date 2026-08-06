import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { PromotionOutcome } from '../generated/prisma/client';

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
  async createMany(tx: Prisma.TransactionClient, rows: LeaderboardSnapshotEntryInput[]): Promise<void> {
    if (rows.length === 0) return;
    await tx.leaderboardSnapshotEntry.createMany({ data: rows });
  }
}
