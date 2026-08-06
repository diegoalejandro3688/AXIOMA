import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { LeagueDefinition } from '../generated/prisma/client';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `league_definition` -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.1. Plantilla de TIER, inmutable por
 * fila (mismo criterio que ChallengeDefinition/TitleDefinition) -- sin
 * `update()` más allá de retiro.
 */
@Injectable()
export class LeagueDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    leagueKey: string;
    name: string;
    tierOrder: number;
    minimumEntryRule?: string | null;
    promotionRule?: string | null;
    demotionRule?: string | null;
    participantGroupSize: number;
    rewardBundleId?: string | null;
  }): Promise<LeagueDefinition> {
    return this.prisma.leagueDefinition.create({ data: input });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<LeagueDefinition | null> {
    const client: Client = tx ?? this.prisma;
    return client.leagueDefinition.findUnique({ where: { id } });
  }

  /**
   * Tier de entrada para todo estudiante que participa por primera vez
   * (§9.2, política de asignación inicial fijada por el Product Owner) --
   * el `tierOrder` mínimo entre los tiers ACTIVE. Nunca se asigna por XP,
   * nivel, ni ninguna otra señal académica o de progreso.
   */
  findLowestActiveTier(tx?: Prisma.TransactionClient): Promise<LeagueDefinition | null> {
    const client: Client = tx ?? this.prisma;
    return client.leagueDefinition.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { tierOrder: 'asc' },
    });
  }

  /**
   * Bloque IV, Incremento 2 (ADR-0020 §4, "tiers extremos") -- el `tierOrder`
   * máximo entre los tiers ACTIVE. Un candidato a `PROMOTED` en este tier se
   * resuelve como `RETAINED` (no existe un tier superior al que ascender).
   */
  findHighestActiveTier(tx?: Prisma.TransactionClient): Promise<LeagueDefinition | null> {
    const client: Client = tx ?? this.prisma;
    return client.leagueDefinition.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { tierOrder: 'desc' },
    });
  }
}
