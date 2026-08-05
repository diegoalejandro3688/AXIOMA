import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { LeagueGroup } from '../generated/prisma/client';

/**
 * Único punto de acceso a `league_group` -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.3. INSTANCIA real y acotada de un
 * tier para una temporada -- materializada perezosamente bajo el advisory
 * lock (namespace 21) que mantiene `LeagueEnrollmentService` durante toda la
 * inscripción. Todos los métodos de escritura EXIGEN `tx` (deben ejecutarse
 * dentro de esa misma transacción bloqueada) -- mismo criterio que
 * `AccountChallengeDailyProgressRepository.upsertContribution`.
 */
@Injectable()
export class LeagueGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Primer grupo OPEN de (temporada, tier) -- bajo el lock, OPEN implica cupo disponible por construcción. */
  findOpenGroup(tx: Prisma.TransactionClient, gameSeasonId: string, leagueDefinitionId: string): Promise<LeagueGroup | null> {
    return tx.leagueGroup.findFirst({
      where: { gameSeasonId, leagueDefinitionId, status: 'OPEN' },
      orderBy: { groupNumber: 'asc' },
    });
  }

  async nextGroupNumber(tx: Prisma.TransactionClient, gameSeasonId: string, leagueDefinitionId: string): Promise<number> {
    const last = await tx.leagueGroup.findFirst({
      where: { gameSeasonId, leagueDefinitionId },
      orderBy: { groupNumber: 'desc' },
    });
    return (last?.groupNumber ?? 0) + 1;
  }

  create(
    tx: Prisma.TransactionClient,
    input: {
      gameSeasonId: string;
      leagueDefinitionId: string;
      groupNumber: number;
      capacity: number;
      assignmentPolicyVersion: string;
    },
  ): Promise<LeagueGroup> {
    return tx.leagueGroup.create({ data: input });
  }

  countParticipants(tx: Prisma.TransactionClient, leagueGroupId: string): Promise<number> {
    return tx.seasonLeagueParticipation.count({ where: { leagueGroupId } });
  }

  markFull(tx: Prisma.TransactionClient, id: string): Promise<LeagueGroup> {
    return tx.leagueGroup.update({ where: { id }, data: { status: 'FULL' } });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<LeagueGroup | null> {
    return (tx ?? this.prisma).leagueGroup.findUnique({ where: { id } });
  }

  /** Cierre de temporada (§9.6) -- todo grupo OPEN/FULL de esa temporada pasa a LOCKED. */
  async lockAllForSeason(tx: Prisma.TransactionClient, gameSeasonId: string, lockedAt: Date): Promise<number> {
    const result = await tx.leagueGroup.updateMany({
      where: { gameSeasonId, status: { in: ['OPEN', 'FULL'] } },
      data: { status: 'LOCKED', lockedAt },
    });
    return result.count;
  }
}
