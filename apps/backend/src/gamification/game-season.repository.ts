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

  /** PF2-B -- resolución por `seasonKey` (`@unique`). */
  findByKey(seasonKey: string, tx?: Prisma.TransactionClient): Promise<GameSeason | null> {
    const client: Client = tx ?? this.prisma;
    return client.gameSeason.findUnique({ where: { seasonKey } });
  }

  /**
   * PF2-B -- la temporada PREDECESORA contigua: aquella cuyo `endsAt`
   * coincide EXACTAMENTE con `startsAt` (la frontera compartida). `null` si
   * no hay predecesora (primera temporada, o un hueco). Determinista: por
   * construcción canónica las ventanas no se solapan, así que a lo sumo una.
   */
  findByExactEndsAt(startsAt: Date, tx?: Prisma.TransactionClient): Promise<GameSeason | null> {
    const client: Client = tx ?? this.prisma;
    return client.gameSeason.findFirst({ where: { endsAt: startsAt }, orderBy: { startsAt: 'desc' } });
  }

  /**
   * PF2-B -- TODA temporada cuya ventana `[startsAt, endsAt)` se solapa con
   * `[start, end)`. Solapamiento de rangos semiabiertos: `existing.startsAt <
   * end AND existing.endsAt > start`. Usado por `SeasonProvisioningService`
   * para detectar una temporada legacy / no-canónica que ocupa (parte de)
   * una franja canónica deseada -- NUNCA se modifica esa fila, se aborta la
   * provisión de esa franja.
   */
  findIntersectingWindow(start: Date, end: Date, tx?: Prisma.TransactionClient): Promise<GameSeason[]> {
    const client: Client = tx ?? this.prisma;
    return client.gameSeason.findMany({
      where: { startsAt: { lt: end }, endsAt: { gt: start } },
      orderBy: { startsAt: 'asc' },
    });
  }

  /**
   * PF2-B -- creación IDEMPOTENTE de una temporada SCHEDULED por su
   * `seasonKey` canónico determinístico. Concurrencia-segura sin lock: el
   * índice único `game_season_season_key_key` serializa; una carrera hace
   * que el perdedor reciba P2002, se relee la fila existente y se devuelve
   * `{ created: false }` SÓLO si su ventana coincide EXACTAMENTE con la
   * esperada. Ventana distinta bajo la misma clave -> `windowMismatch`
   * (conflicto duro, el llamador aborta -- nunca se muta la fila existente).
   *
   * Multi-instancia: dos backends creando la misma franja convergen a UNA
   * fila. No hay estado en memoria, no hay "soy líder".
   */
  async createScheduledIfAbsent(
    input: {
      seasonKey: string;
      name: string;
      description?: string | null;
      startsAt: Date;
      endsAt: Date;
      rankingRuleVersion?: string | null;
      rewardPolicyVersion?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ season: GameSeason; created: boolean } | { windowMismatch: GameSeason }> {
    const client: Client = tx ?? this.prisma;
    const existing = await client.gameSeason.findUnique({ where: { seasonKey: input.seasonKey } });
    if (existing) {
      if (existing.startsAt.getTime() !== input.startsAt.getTime() || existing.endsAt.getTime() !== input.endsAt.getTime()) {
        return { windowMismatch: existing };
      }
      return { season: existing, created: false };
    }
    try {
      const season = await client.gameSeason.create({
        data: {
          seasonKey: input.seasonKey,
          name: input.name,
          description: input.description ?? null,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          rankingRuleVersion: input.rankingRuleVersion ?? null,
          rewardPolicyVersion: input.rewardPolicyVersion ?? null,
        },
      });
      return { season, created: true };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      // Carrera: otra instancia/tx creó la fila entre el findUnique y el create.
      const raced = await client.gameSeason.findUnique({ where: { seasonKey: input.seasonKey } });
      if (!raced) throw error;
      if (raced.startsAt.getTime() !== input.startsAt.getTime() || raced.endsAt.getTime() !== input.endsAt.getTime()) {
        return { windowMismatch: raced };
      }
      return { season: raced, created: false };
    }
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
