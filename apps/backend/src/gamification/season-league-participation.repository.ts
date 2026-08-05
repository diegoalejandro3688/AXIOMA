import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { SeasonLeagueParticipation } from '../generated/prisma/client';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `season_league_participation` -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.1/§9.3. `@@unique([accountId,
 * gameSeasonId])` -- una cuenta nunca tiene dos participaciones en la misma
 * temporada. `createIdempotent` verifica existencia ANTES de crear (mismo
 * criterio que `AccountChallengeRepository.createIdempotent`, corregido en
 * Bloque III 4.b) -- seguro porque el llamador ya mantiene el advisory lock
 * (namespace 21) durante toda la operación, serializando cualquier acceso
 * concurrente a la misma cuenta+temporada.
 */
@Injectable()
export class SeasonLeagueParticipationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIdempotent(
    tx: Prisma.TransactionClient,
    input: {
      gameSeasonId: string;
      accountId: string;
      leagueDefinitionId: string;
      leagueGroupId: string;
      joinedAt: Date;
    },
  ): Promise<{ participation: SeasonLeagueParticipation; created: boolean }> {
    const existing = await tx.seasonLeagueParticipation.findUnique({
      where: { accountId_gameSeasonId: { accountId: input.accountId, gameSeasonId: input.gameSeasonId } },
    });
    if (existing) return { participation: existing, created: false };

    const participation = await tx.seasonLeagueParticipation.create({ data: input });
    return { participation, created: true };
  }

  findByAccountAndSeason(accountId: string, gameSeasonId: string, tx?: Prisma.TransactionClient): Promise<SeasonLeagueParticipation | null> {
    const client: Client = tx ?? this.prisma;
    return client.seasonLeagueParticipation.findUnique({
      where: { accountId_gameSeasonId: { accountId, gameSeasonId } },
    });
  }

  /** A lo sumo una fila ACTIVE por cuenta -- las temporadas nunca se solapan (invariante de game_season). */
  findActiveByAccountId(accountId: string, tx?: Prisma.TransactionClient): Promise<SeasonLeagueParticipation | null> {
    const client: Client = tx ?? this.prisma;
    return client.seasonLeagueParticipation.findFirst({ where: { accountId, participationStatus: 'ACTIVE' } });
  }

  /** Usado por `LeaguePointGrantService` para acotar qué actividades pueden llegar a otorgar LP (§9.4). */
  async findAllActiveAccountIds(): Promise<string[]> {
    const rows = await this.prisma.seasonLeagueParticipation.findMany({
      where: { participationStatus: 'ACTIVE' },
      select: { accountId: true },
    });
    return rows.map((r) => r.accountId);
  }

  /**
   * Última participación de la cuenta en cualquier temporada anterior --
   * usada por §9.2 para decidir el tier de entrada de un estudiante
   * recurrente (mantiene el tier de su última participación, salvo que un
   * ascenso/descenso ya lo haya cambiado -- decisión de Incremento 2).
   */
  findMostRecentByAccountId(accountId: string, tx?: Prisma.TransactionClient): Promise<SeasonLeagueParticipation | null> {
    const client: Client = tx ?? this.prisma;
    return client.seasonLeagueParticipation.findFirst({
      where: { accountId },
      orderBy: { joinedAt: 'desc' },
    });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<SeasonLeagueParticipation | null> {
    return (tx ?? this.prisma).seasonLeagueParticipation.findUnique({ where: { id } });
  }

  incrementLeaguePoints(tx: Prisma.TransactionClient, id: string, delta: number): Promise<SeasonLeagueParticipation> {
    return tx.seasonLeagueParticipation.update({ where: { id }, data: { leaguePoints: { increment: delta } } });
  }

  /** Cierre de temporada (§9.6) -- toda participación ACTIVE de esa temporada pasa a SEASON_ENDED. */
  async endAllForSeason(tx: Prisma.TransactionClient, gameSeasonId: string, finalizedAt: Date): Promise<number> {
    const result = await tx.seasonLeagueParticipation.updateMany({
      where: { gameSeasonId, participationStatus: 'ACTIVE' },
      data: { participationStatus: 'SEASON_ENDED', finalizedAt },
    });
    return result.count;
  }
}
