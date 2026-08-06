import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { LeaderboardSnapshot } from '../generated/prisma/client';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `leaderboard_snapshot` -- ver
 * docs/adr/0020-ranking-materializacion.md §5. INMUTABLE por diseño: este
 * repositorio solo expone `create` -- ninguna corrección se hace vía
 * `update`, siempre una fila nueva con `supersedesSnapshotId` (reforzado
 * además por trigger de bloqueo total, defensa en profundidad).
 *
 * "Vigente" se determina por AUSENCIA de otra fila cuyo
 * `supersedesSnapshotId` la referencie -- nunca por una columna de estado
 * mutable.
 */
@Injectable()
export class LeaderboardSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: Prisma.TransactionClient,
    input: {
      leagueGroupId: string;
      gameSeasonId: string;
      leagueDefinitionId: string;
      leaderboardDefinitionId: string;
      snapshotAt: Date;
      tieBreakRuleVersion: string;
      promotionRuleVersion: string;
      demotionRuleVersion: string;
      rankingMetricVersion: string;
      participantCount: number;
      contentHash: string;
      supersedesSnapshotId?: string | null;
      correctionReason?: string | null;
    },
  ): Promise<LeaderboardSnapshot> {
    return tx.leaderboardSnapshot.create({ data: input });
  }

  /** La instantánea `FINAL` vigente de un grupo -- la que ninguna otra fila supera, o `null` si el grupo nunca cerró. */
  async findCurrentFinalForGroup(leagueGroupId: string, tx?: Prisma.TransactionClient): Promise<LeaderboardSnapshot | null> {
    const client: Client = tx ?? this.prisma;
    return client.leaderboardSnapshot.findFirst({
      where: { leagueGroupId, snapshotType: 'FINAL', supersededBy: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<LeaderboardSnapshot | null> {
    const client: Client = tx ?? this.prisma;
    return client.leaderboardSnapshot.findUnique({ where: { id } });
  }
}
