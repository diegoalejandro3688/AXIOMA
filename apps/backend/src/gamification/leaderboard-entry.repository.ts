import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { LeaderboardEntry } from '../generated/prisma/client';

type Client = PrismaService | Prisma.TransactionClient;

export interface LeaderboardEntryInput {
  leaderboardDefinitionId: string;
  gameSeasonId: string;
  groupId: string;
  seasonLeagueParticipationId: string;
  publicProfileId: string | null;
  rankPosition: number;
  metricValue: number;
  tieBreakValue: Date;
}

/**
 * Único punto de acceso a `leaderboard_entry` -- ver
 * docs/adr/0020-ranking-materializacion.md §6. Proyección/CACHÉ, no un hecho
 * histórico -- se reemplaza por completo en cada pasada, nunca se actualiza
 * fila por fila.
 *
 * `replaceAllForGroup` hace DELETE + INSERT dentro de la MISMA transacción
 * del llamador, deliberadamente en vez de un `UPSERT` por fila: si dos
 * participaciones intercambian posiciones entre una pasada y la siguiente
 * (ej. la que era rank 1 pasa a rank 2 y viceversa), un `UPSERT` incremental
 * violaría transitoriamente el `@@unique(leaderboardDefinitionId, groupId,
 * rankPosition)` (ambas filas competirían por la posición del otro antes de
 * que la segunda se corrija). Borrar todo el grupo y volver a insertar en una
 * sola operación evita el problema por construcción -- nunca hay dos filas
 * del mismo grupo vivas a la vez con conflicto de posición.
 */
@Injectable()
export class LeaderboardEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Versión de la última pasada para este grupo, o 0 si nunca se calculó -- el llamador usa `+1`. */
  async findCurrentSnapshotVersion(tx: Prisma.TransactionClient, groupId: string): Promise<number> {
    const result = await tx.leaderboardEntry.aggregate({
      where: { groupId },
      _max: { snapshotVersion: true },
    });
    return result._max.snapshotVersion ?? 0;
  }

  async replaceAllForGroup(tx: Prisma.TransactionClient, groupId: string, rows: LeaderboardEntryInput[]): Promise<void> {
    await tx.leaderboardEntry.deleteMany({ where: { groupId } });
    if (rows.length === 0) return;
    const snapshotVersion = (await this.findCurrentSnapshotVersion(tx, groupId)) + 1;
    const calculatedAt = new Date();
    await tx.leaderboardEntry.createMany({
      data: rows.map((row) => ({ ...row, calculatedAt, snapshotVersion })),
    });
  }

  findAllByGroupId(groupId: string, tx?: Prisma.TransactionClient): Promise<LeaderboardEntry[]> {
    const client: Client = tx ?? this.prisma;
    return client.leaderboardEntry.findMany({ where: { groupId }, orderBy: { rankPosition: 'asc' } });
  }

  /** Recuperación directa por clave -- "mi posición" en O(1), sin depender de paginación (ADR-0020 §6/Gate 13). */
  findBySeasonLeagueParticipationId(
    leaderboardDefinitionId: string,
    groupId: string,
    seasonLeagueParticipationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<LeaderboardEntry | null> {
    const client: Client = tx ?? this.prisma;
    return client.leaderboardEntry.findUnique({
      where: { leaderboardDefinitionId_groupId_seasonLeagueParticipationId: { leaderboardDefinitionId, groupId, seasonLeagueParticipationId } },
    });
  }

  /**
   * Paginación estable por cursor `(rankPosition, id)`, nunca offset --
   * mismo criterio que el historial paginado de XP (Bloque I)
   * (ADR-0020 §6).
   */
  findByGroupPaginated(groupId: string, options: { limit: number; afterRankPosition?: number; afterId?: string }): Promise<LeaderboardEntry[]> {
    return this.prisma.leaderboardEntry.findMany({
      where: {
        groupId,
        ...(options.afterRankPosition !== undefined && options.afterId !== undefined
          ? {
              OR: [
                { rankPosition: { gt: options.afterRankPosition } },
                { rankPosition: options.afterRankPosition, id: { gt: options.afterId } },
              ],
            }
          : {}),
      },
      orderBy: [{ rankPosition: 'asc' }, { id: 'asc' }],
      take: options.limit,
    });
  }

  /**
   * Bloque IV, Incremento 3, sub-incremento 3.c -- misma paginación
   * estable, pero cursor de UN solo campo (`rankPosition`), nunca
   * `leaderboardEntry.id` -- ese id es exactamente uno de los
   * identificadores internos que ADR-0021 prohíbe exponer en el cursor
   * HTTP opaco (`leaderboardCursor.ts`). Válido porque `rankPosition` ya
   * es una secuencia total estricta `1..G` sin repeticiones DENTRO de un
   * grupo -- garantizado por `@@unique([leaderboardDefinitionId, groupId,
   * rankPosition])` (ADR-0020 §4, punto 6) y por el desempate hasta
   * `accountId` como última instancia (ADR-0020 §3) -- nunca hace falta un
   * segundo campo de desempate para esta consulta.
   */
  findByGroupPaginatedByRank(groupId: string, options: { limit: number; afterRankPosition?: number }): Promise<LeaderboardEntry[]> {
    return this.prisma.leaderboardEntry.findMany({
      where: {
        groupId,
        ...(options.afterRankPosition !== undefined ? { rankPosition: { gt: options.afterRankPosition } } : {}),
      },
      orderBy: { rankPosition: 'asc' },
      take: options.limit,
    });
  }
}
