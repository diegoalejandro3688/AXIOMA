import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { GameSeason } from '../generated/prisma/client';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `game_season` -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.6. Fila inmutable salvo `status`
 * (transición forward-only, trigger `enforce_game_season_status_transition`)
 * y `finalizedAt`. Invariante "a lo sumo una temporada ACTIVE a la vez"
 * reforzada por índice único parcial en base de datos -- este repositorio no
 * la revalida, confía en el constraint.
 */
@Injectable()
export class GameSeasonRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    seasonKey: string;
    name: string;
    description?: string | null;
    startsAt: Date;
    endsAt: Date;
    rankingRuleVersion?: string | null;
    rewardPolicyVersion?: string | null;
  }): Promise<GameSeason> {
    return this.prisma.gameSeason.create({ data: input });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<GameSeason | null> {
    const client: Client = tx ?? this.prisma;
    return client.gameSeason.findUnique({ where: { id } });
  }

  /**
   * A lo sumo una fila -- el índice único parcial `game_season_single_active`
   * garantiza que nunca hay más de una ACTIVE. Uso restringido a las lógicas
   * de ciclo de vida (scheduler de activación/transición, cálculo de
   * leaderboard) que razonan sobre "la temporada ACTIVE" como estado del
   * sistema, no como "la temporada vigente para mostrar/consultar" -- para
   * eso usar `findCurrent`.
   */
  findActive(tx?: Prisma.TransactionClient): Promise<GameSeason | null> {
    const client: Client = tx ?? this.prisma;
    return client.gameSeason.findFirst({ where: { status: 'ACTIVE' } });
  }

  /**
   * STABILIZATION-B7 -- resolución CANÓNICA de "la temporada de liga
   * vigente ahora", ÚNICA fuente para toda superficie de lectura/API (Hub,
   * Ranking, elegibilidad de LP). Requiere las TRES condiciones, nunca solo
   * `status = ACTIVE`:
   *   - status = ACTIVE
   *   - startsAt <= now
   *   - endsAt   >  now
   * Determinista: el índice único parcial `game_season_single_active`
   * garantiza <= 1 fila ACTIVE; el `orderBy` es defensa en profundidad por
   * si ese invariante fuese violado por contaminación (una temporada
   * ACTIVE fuera de ventana nunca se devuelve como vigente).
   */
  findCurrent(now: Date, tx?: Prisma.TransactionClient): Promise<GameSeason | null> {
    const client: Client = tx ?? this.prisma;
    return client.gameSeason.findFirst({
      where: { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { startsAt: 'desc' },
    });
  }

  /**
   * STABILIZATION-B7 -- diagnóstico de invariante: todas las filas ACTIVE
   * cuya ventana contiene `now`. En operación normal es 0 o 1; > 1 indica
   * contaminación (p.ej. un gate que escribió sobre `axioma_dev`).
   */
  findAllCurrent(now: Date, tx?: Prisma.TransactionClient): Promise<GameSeason[]> {
    const client: Client = tx ?? this.prisma;
    return client.gameSeason.findMany({
      where: { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gt: now } },
      orderBy: { startsAt: 'desc' },
    });
  }

  findScheduledReadyToActivate(now: Date): Promise<GameSeason[]> {
    return this.prisma.gameSeason.findMany({
      where: { status: 'SCHEDULED', startsAt: { lte: now } },
      orderBy: { startsAt: 'asc' },
    });
  }

  findActiveExpired(now: Date): Promise<GameSeason[]> {
    return this.prisma.gameSeason.findMany({
      where: { status: 'ACTIVE', endsAt: { lte: now } },
    });
  }

  activate(tx: Prisma.TransactionClient, id: string): Promise<GameSeason> {
    return tx.gameSeason.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  finalize(tx: Prisma.TransactionClient, id: string, finalizedAt: Date): Promise<GameSeason> {
    return tx.gameSeason.update({ where: { id }, data: { status: 'FINALIZED', finalizedAt } });
  }
}
