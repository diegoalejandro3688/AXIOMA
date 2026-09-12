import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { SeasonLeagueParticipation, GameSeason, LeagueDefinition } from '../generated/prisma/client';
import { SEASON_KEY_PREFIX } from './competitive-v1-config';

/**
 * PF2-C.3A -- prefijo del `seasonKey` de TODA temporada competitiva canónica
 * (`comp-v1-...`). Único identificador POSITIVO de "historial competitivo
 * legítimo": excluye por construcción cualquier temporada de otro dominio
 * (`lpg-season-*` de gates de participación, fixtures de test, etc.) sin
 * enumerar prefijos ajenos ni filtrar sólo por `status`. Ver
 * `competitive-v1-config.ts` (`SEASON_KEY_PREFIX`).
 */
const CANONICAL_COMPETITIVE_SEASON_KEY_PREFIX = `${SEASON_KEY_PREFIX}-`;

/** PF2-C.3A -- estados de resultado CONGELADO de una temporada ya finalizada. */
const TERMINAL_PARTICIPATION_STATUSES = ['PROMOTED', 'DEMOTED', 'RETAINED'] as const;

export type FinalizedParticipationWithContext = SeasonLeagueParticipation & { gameSeason: GameSeason; leagueDefinition: LeagueDefinition };

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

  /**
   * STABILIZATION-B7 -- participación VIGENTE de la cuenta: `ACTIVE` Y
   * perteneciente a la temporada canónica vigente ahora (`game_season`
   * ACTIVE con `now` dentro de su ventana). Reemplaza al antiguo
   * `findActiveByAccountId`, que devolvía una participación cuyo *estado*
   * seguía `ACTIVE` aunque su *temporada* estuviese FINALIZED -- la causa
   * raíz de que el Ranking mostrara una participación histórica como
   * "actual" (B5A). Una consulta, determinista (<=1 temporada vigente,
   * `@@unique([accountId, gameSeasonId])`).
   */
  findCurrentByAccountId(accountId: string, now: Date, tx?: Prisma.TransactionClient): Promise<SeasonLeagueParticipation | null> {
    const client: Client = tx ?? this.prisma;
    return client.seasonLeagueParticipation.findFirst({
      where: {
        accountId,
        participationStatus: 'ACTIVE',
        gameSeason: { status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gt: now } },
      },
    });
  }

  /** Usado por `LeaguePointGrantService` para acotar qué actividades pueden llegar a otorgar LP (§9.4). */
  async findAllActiveAccountIds(): Promise<string[]> {
    // WEB-0D.1C-B1 -- `accountId` es nullable a nivel de esquema (soporte
    // de pseudonimización histórica futura); `not: null` es correcto hoy
    // (sin efecto observable, B1 no pseudonimiza nada) y después (una
    // participación ACTIVE nunca debería estar desidentificada, pero el
    // filtro es una defensa explícita, no solo un ajuste de tipos).
    const rows = await this.prisma.seasonLeagueParticipation.findMany({
      where: { participationStatus: 'ACTIVE', accountId: { not: null } },
      select: { accountId: true },
    });
    return rows.map((r) => r.accountId as string);
  }

  /**
   * HISTORIAL genérico -- última participación de la cuenta en CUALQUIER
   * temporada, por recencia de `joinedAt`, SIN filtro de dominio ni de
   * estado.
   *
   * STABILIZATION-B7 -- NUNCA para "la participación actual" de una
   * superficie de lectura (usar `findCurrentByAccountId`).
   *
   * PF2-C.3A -- YA NO es la fuente de tier de `resolveTargetTier`. El
   * defecto de la frontera natural (2026-09-07): una participación
   * `RETAINED` de una temporada `lpg-season-*` de gate (ARCHIVED, `joinedAt`
   * posterior) ensombreció al predecesor canónico `comp-v1-2026-08-31`
   * (`PROMOTED`), y la cuenta se auto-inscribió un tier por debajo del que le
   * correspondía. `joinedAt` es la decisión del usuario de CUÁNDO entró, no
   * la cronología de la COMPETICIÓN. El auto-rollover ahora se ata al
   * `previousSeasonId` exacto (`findTerminalForAccountInSeason`) y el
   * join manual al historial competitivo legítimo por cronología de temporada
   * (`findMostRecentCompetitiveTerminalBefore`). Se conserva este método
   * para gates que aún asertan sobre él.
   */
  findMostRecentByAccountId(accountId: string, tx?: Prisma.TransactionClient): Promise<SeasonLeagueParticipation | null> {
    const client: Client = tx ?? this.prisma;
    return client.seasonLeagueParticipation.findFirst({
      where: { accountId },
      orderBy: { joinedAt: 'desc' },
    });
  }

  /**
   * PF2-C.3A (AUTO-ROLLOVER) -- la participación de resultado TERMINAL de la
   * cuenta en UNA temporada EXACTA (`gameSeasonId`). Fuente única y explícita
   * del tier de entrada durante el rollover automático N-1 -> N: el
   * orquestador ya conoce `previousSeasonId`, así que NO se infiere de
   * "historial más reciente" (que puede estar ensombrecido por residuo de
   * gate). Devuelve `null` si la cuenta no tiene participación en esa
   * temporada o si su participación aún NO es terminal
   * (`ACTIVE`/`SEASON_ENDED`) -- el llamador NUNCA cae a un fallback global,
   * marca la cuenta como fallida (§11). `@@unique([accountId, gameSeasonId])`
   * garantiza <= 1 fila.
   */
  findTerminalForAccountInSeason(
    accountId: string,
    gameSeasonId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SeasonLeagueParticipation | null> {
    const client: Client = tx ?? this.prisma;
    return client.seasonLeagueParticipation.findFirst({
      where: {
        accountId,
        gameSeasonId,
        participationStatus: { in: [...TERMINAL_PARTICIPATION_STATUSES] },
      },
    });
  }

  /**
   * PF2-C.3A (JOIN MANUAL) -- la participación de resultado TERMINAL más
   * reciente de la cuenta en su HISTORIAL COMPETITIVO LEGÍTIMO
   * (`seasonKey` con prefijo `comp-v1-`) ESTRICTAMENTE ANTERIOR a la
   * temporada activa. Para el estudiante que se salta una semana y vuelve a
   * inscribirse manualmente: su progresión se deriva de la última temporada
   * competitiva real en la que compitió, no del `joinedAt` global.
   *
   * Orden = CRONOLOGÍA DE LA TEMPORADA, no de la participación:
   *   `gameSeason.endsAt DESC`  (la competición que terminó más tarde)
   *   -> `gameSeason.startsAt DESC` -> `id DESC`  (desempate determinista)
   * `endsAt` es canónico incluso cuando `startsAt` retiene un valor
   * histórico no canónico (PF2-C Estrategia A) -- NO se exige `startsAt`
   * byte-exacto (§7).
   *
   * "Anterior a la activa" = `startsAt <= activeSeason.startsAt` Y
   * `id != activeSeason.id` -- excluye la propia temporada activa y toda
   * SCHEDULED futura, y tolera el modelo de ventanas solapadas de algunos
   * gates. El filtro de estado terminal ya excluye implícitamente cualquier
   * fila `ACTIVE`/`SEASON_ENDED` (temporada en curso o sin instantánea).
   *
   * `null` -> el llamador aplica el tier base de jugador nuevo. Residuo
   * `lpg-season-*` / fixtures de otro dominio NUNCA aparecen aquí.
   */
  findMostRecentCompetitiveTerminalBefore(
    accountId: string,
    activeSeason: { id: string; startsAt: Date },
    tx?: Prisma.TransactionClient,
  ): Promise<SeasonLeagueParticipation | null> {
    const client: Client = tx ?? this.prisma;
    return client.seasonLeagueParticipation.findFirst({
      where: {
        accountId,
        participationStatus: { in: [...TERMINAL_PARTICIPATION_STATUSES] },
        gameSeason: {
          id: { not: activeSeason.id },
          seasonKey: { startsWith: CANONICAL_COMPETITIVE_SEASON_KEY_PREFIX },
          startsAt: { lte: activeSeason.startsAt },
        },
      },
      orderBy: [
        { gameSeason: { endsAt: 'desc' } },
        { gameSeason: { startsAt: 'desc' } },
        { id: 'desc' },
      ],
    });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<SeasonLeagueParticipation | null> {
    return (tx ?? this.prisma).seasonLeagueParticipation.findUnique({ where: { id } });
  }

  /**
   * Bloque IV, Incremento 3, sub-incremento 3.c -- lote, UNA sola consulta
   * `WHERE id IN (...)`, para resolver `accountId` de un conjunto de
   * `seasonLeagueParticipationId` (una página de `leaderboard_entry`) sin
   * una consulta por fila (mismo principio anti-N+1 que 3.a).
   */
  findManyByIds(ids: string[], tx?: Prisma.TransactionClient): Promise<SeasonLeagueParticipation[]> {
    if (ids.length === 0) return Promise.resolve([]);
    const client: Client = tx ?? this.prisma;
    return client.seasonLeagueParticipation.findMany({ where: { id: { in: ids } } });
  }

  /**
   * Bloque IV, Incremento 2 -- TODAS las participaciones de un grupo, sin
   * excepción (ADR-0020 §1/§2: la identidad autoritativa del cálculo es
   * `season_league_participation`, nunca `public_profile` -- ningún filtro
   * de visibilidad se aplica aquí ni en ningún punto de este repositorio).
   */
  /**
   * WEB-0D.1C-B4 §19 -- `accountId: { not: null }` explícito: consulta
   * OPERACIONAL/VIVA (alimenta el ranking/cálculo de cierre), nunca debe
   * incluir una fila ya pseudonimizada por B4. Defensa en profundidad --
   * por invariante actual, `finalizeGroup` solo llama a esto sobre grupos
   * todavía `LOCKED` (nunca `FINALIZED`), y B4 solo pseudonimiza
   * participaciones YA terminales (`PROMOTED`/`DEMOTED`/`RETAINED`, que
   * solo existen en grupos YA `FINALIZED`) -- las dos condiciones nunca se
   * solapan hoy, pero este filtro cierra la clase exacta de punto ciego que
   * motivó el hardening de `findPendingGrant` (ver ese comentario), sin
   * excluir ninguna fila real bajo el invariante actual.
   */
  findAllByGroupId(groupId: string, tx?: Prisma.TransactionClient): Promise<SeasonLeagueParticipation[]> {
    const client: Client = tx ?? this.prisma;
    return client.seasonLeagueParticipation.findMany({ where: { leagueGroupId: groupId, accountId: { not: null } } });
  }

  /** Bloque IV, Incremento 2 -- `currentRank` es una proyección actualizada en cada pasada periódica (Data Model §16.20). */
  updateCurrentRank(tx: Prisma.TransactionClient, id: string, currentRank: number): Promise<SeasonLeagueParticipation> {
    return tx.seasonLeagueParticipation.update({ where: { id }, data: { currentRank } });
  }

  updateOutcome(
    tx: Prisma.TransactionClient,
    id: string,
    input: { participationStatus: 'PROMOTED' | 'DEMOTED' | 'RETAINED'; finalRank: number; finalizedAt: Date },
  ): Promise<SeasonLeagueParticipation> {
    return tx.seasonLeagueParticipation.update({
      where: { id },
      data: { participationStatus: input.participationStatus, finalRank: input.finalRank, currentRank: input.finalRank, finalizedAt: input.finalizedAt },
    });
  }

  incrementLeaguePoints(tx: Prisma.TransactionClient, id: string, delta: number): Promise<SeasonLeagueParticipation> {
    return tx.seasonLeagueParticipation.update({ where: { id }, data: { leaguePoints: { increment: delta } } });
  }

  /**
   * LEF Bloque V, Incremento 4 ("Historial competitivo cross-temporada" --
   * ver docs/adr/LEF-BLOCK-V-DEFINITION.md §12) -- SOLO participaciones ya
   * FINALIZADAS (`PROMOTED`/`DEMOTED`/`RETAINED`, resultado congelado por
   * `LeaderboardFinalizationService`). Deliberadamente EXCLUYE `ACTIVE`
   * (temporada en curso, no es "historial" todavía) y `SEASON_ENDED`
   * (temporada terminada pero el grupo aún no cerró -- estado transitorio,
   * sin instantánea todavía; incluirlo exigiría mostrar un resultado no
   * definitivo, lo que este incremento no hace). Orden estable y
   * determinista: temporada más reciente primero, por `gameSeason.startsAt`.
   */
  findFinalizedByAccountId(accountId: string): Promise<FinalizedParticipationWithContext[]> {
    return this.prisma.seasonLeagueParticipation.findMany({
      where: { accountId, participationStatus: { in: ['PROMOTED', 'DEMOTED', 'RETAINED'] } },
      include: { gameSeason: true, leagueDefinition: true },
      orderBy: { gameSeason: { startsAt: 'desc' } },
    });
  }

  /** Cierre de temporada (§9.6) -- toda participación ACTIVE de esa temporada pasa a SEASON_ENDED. */
  async endAllForSeason(tx: Prisma.TransactionClient, gameSeasonId: string, finalizedAt: Date): Promise<number> {
    const result = await tx.seasonLeagueParticipation.updateMany({
      where: { gameSeasonId, participationStatus: 'ACTIVE' },
      data: { participationStatus: 'SEASON_ENDED', finalizedAt },
    });
    return result.count;
  }

  /**
   * PF2-B -- ¿le quedan a esta temporada participaciones SEASON_ENDED sin
   * resultado final (PROMOTED/DEMOTED/RETAINED)? La orquestación NO activa la
   * sucesora hasta que esto sea 0.
   */
  countPendingOutcomeForSeason(gameSeasonId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return (tx ?? this.prisma).seasonLeagueParticipation.count({
      where: { gameSeasonId, participationStatus: 'SEASON_ENDED' },
    });
  }

  /**
   * PF2-B (auto-rollover) -- página determinista de `accountId` DISTINTOS con
   * una participación de resultado TERMINAL (PROMOTED/DEMOTED/RETAINED) en
   * `gameSeasonId` (la temporada inmediatamente anterior). Cursor por
   * `accountId` ascendente. Nunca carga toda la población en memoria.
   */
  async findTerminalAccountIdsForSeason(
    gameSeasonId: string,
    opts: { take: number; afterAccountId?: string },
  ): Promise<string[]> {
    // WEB-0D.1C-B1 -- ver findAllActiveAccountIds arriba: `accountId: { not:
    // null }` es una defensa explícita, sin efecto observable en B1. Va en
    // `AND` (no en el mismo objeto que el filtro `gt` del cursor) -- un
    // segundo spread sobre la misma clave `accountId` la reemplazaría en
    // vez de combinarla.
    const rows = await this.prisma.seasonLeagueParticipation.findMany({
      where: {
        gameSeasonId,
        participationStatus: { in: ['PROMOTED', 'DEMOTED', 'RETAINED'] },
        AND: [{ accountId: { not: null } }, ...(opts.afterAccountId ? [{ accountId: { gt: opts.afterAccountId } }] : [])],
      },
      select: { accountId: true },
      orderBy: { accountId: 'asc' },
      take: opts.take,
    });
    return rows.map((r) => r.accountId as string);
  }

  /**
   * WEB-0D.1C-B4-R1 -- candidatos DURABLES para el reconciliador de
   * privacidad de participaciones terminales: cuenta CLOSED, participación
   * terminal (PROMOTED/DEMOTED/RETAINED), `accountId` todavía crudo,
   * `gamificationActorRef` todavía NULL. Filtrado ÍNTEGRAMENTE en la base
   * de datos (nunca `SELECT *` + filtro en memoria) -- `SeasonLeagueParticipation`
   * no tiene FK a `account` (mismo criterio que el resto de este dominio),
   * así que el JOIN se hace en SQL crudo, igual que
   * `ValidatedGamificationActivityRepository.findPendingGrant`.
   *
   * Devuelve `accountId`s DISTINCT (nunca filas individuales) -- el
   * llamador reutiliza `pseudonymizeTerminalSeasonParticipations`
   * (ya existente desde B4) por cuenta, que ya pseudonimiza TODAS las
   * participaciones terminales de esa cuenta en una sola transacción.
   * Orden determinista por `accountId` -- una vez pseudonimizada una
   * cuenta, `gamificationActorRef` deja de ser NULL y esa cuenta
   * desaparece por completo de esta consulta en la siguiente corrida
   * (progreso determinista sin cursor/offset, ver B4-R1 §18).
   */
  async findAccountIdsWithTerminalPendingPrivacy(limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ account_id: string }[]>`
      SELECT DISTINCT slp.account_id
      FROM season_league_participation slp
      JOIN account a ON a.id = slp.account_id
      WHERE a.status = 'CLOSED'
        AND slp.participation_status IN ('PROMOTED', 'DEMOTED', 'RETAINED')
        AND slp.account_id IS NOT NULL
        AND slp.gamification_actor_ref IS NULL
      ORDER BY slp.account_id ASC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.account_id);
  }
}
