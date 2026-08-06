import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { LeaderboardDefinition } from '../generated/prisma/client';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `leaderboard_definition` -- ver
 * docs/adr/0020-ranking-materializacion.md. Plantilla de ranking, inmutable
 * por fila. En V1 existe una única fila activa (`LEADERBOARD_KEY =
 * 'league-ranking-v1'`, ver `leaderboard-calculation.service.ts`), mismo
 * criterio que `PROGRAM_KEY = 'xp-core'` (Bloque I): sin soporte
 * multi-programa hasta que exista un segundo tipo de ranking real.
 */
@Injectable()
export class LeaderboardDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    leaderboardKey: string;
    leaderboardType: string;
    rankingMetric: string;
    scopeRule: string;
    visibilityRule?: string | null;
    tieBreakRule: string;
    updateFrequency: string;
  }): Promise<LeaderboardDefinition> {
    return this.prisma.leaderboardDefinition.create({ data: input });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<LeaderboardDefinition | null> {
    const client: Client = tx ?? this.prisma;
    return client.leaderboardDefinition.findUnique({ where: { id } });
  }

  findActiveByKey(leaderboardKey: string, tx?: Prisma.TransactionClient): Promise<LeaderboardDefinition | null> {
    const client: Client = tx ?? this.prisma;
    return client.leaderboardDefinition.findFirst({ where: { leaderboardKey, status: 'ACTIVE' } });
  }
}
