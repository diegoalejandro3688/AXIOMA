import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { LeaguePointLedgerEntry, LeaguePointLedgerEntryType } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `league_point_ledger_entry` -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.5. Ledger INDEPENDIENTE de
 * `xp_ledger_entry` (§9.7) -- inmutable tras crearse (trigger
 * `enforce_league_point_ledger_entry_immutable`), sin DELETE (trigger
 * `enforce_league_point_ledger_entry_no_delete`). Idempotencia vincula
 * actividad Y participación: `idempotencyKey =
 * "league-grant:{participationId}:{validatedActivityId}"` (precisión
 * obligatoria del Product Owner, §9.5) -- ambas referencias se conservan
 * además como columnas propias, no solo codificadas en la clave.
 *
 * Mismo patrón de manejo de P2002 que `XpLedgerEntryRepository.createIdempotent`:
 * fuera de una transacción explícita, re-consulta; dentro de una
 * transacción explícita, relanza tal cual (la transacción ya quedó abortada
 * en Postgres -- el llamador debe resolver la idempotencia fuera de ella).
 */
@Injectable()
export class LeaguePointLedgerEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIdempotent(
    input: {
      accountId: string;
      seasonLeagueParticipationId: string;
      validatedActivityId?: string | null;
      leaguePointRuleId?: string | null;
      entryType: LeaguePointLedgerEntryType;
      pointAmount: number;
      ruleVersion?: string | null;
      idempotencyKey: string;
      occurredAt: Date;
      reversesEntryId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ entry: LeaguePointLedgerEntry; created: boolean }> {
    const client: Client = tx ?? this.prisma;
    try {
      const entry = await client.leaguePointLedgerEntry.create({ data: input });
      return { entry, created: true };
    } catch (error) {
      const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
      if (isUniqueViolation && !tx) {
        const existing = await client.leaguePointLedgerEntry.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) return { entry: existing, created: false };
      }
      throw error;
    }
  }

  findById(id: string): Promise<LeaguePointLedgerEntry | null> {
    return this.prisma.leaguePointLedgerEntry.findUnique({ where: { id } });
  }

  findByIdempotencyKey(idempotencyKey: string): Promise<LeaguePointLedgerEntry | null> {
    return this.prisma.leaguePointLedgerEntry.findUnique({ where: { idempotencyKey } });
  }

  findByParticipationId(seasonLeagueParticipationId: string): Promise<LeaguePointLedgerEntry[]> {
    return this.prisma.leaguePointLedgerEntry.findMany({
      where: { seasonLeagueParticipationId },
      orderBy: { recordedAt: 'asc' },
    });
  }

  /**
   * Suma de OTORGAMIENTO ya concedidos hoy para una regla concreta, DENTRO
   * de la participación -- base del tope diario. Debe ejecutarse dentro de
   * la transacción SERIALIZABLE del otorgamiento, mismo criterio que
   * `XpLedgerEntryRepository.sumGrantedTodayForRule` -- por eso exige `tx`
   * explícito, sin valor por defecto.
   */
  async sumGrantedTodayForRule(
    tx: Prisma.TransactionClient,
    seasonLeagueParticipationId: string,
    leaguePointRuleId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<number> {
    const result = await tx.leaguePointLedgerEntry.aggregate({
      where: {
        seasonLeagueParticipationId,
        leaguePointRuleId,
        entryType: 'OTORGAMIENTO',
        occurredAt: { gte: dayStart, lt: dayEnd },
      },
      _sum: { pointAmount: true },
    });
    return result._sum.pointAmount ?? 0;
  }
}
