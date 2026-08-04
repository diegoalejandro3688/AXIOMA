import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { XpLedgerEntry, XpLedgerEntryType, XpLedgerActorType } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `xp_ledger_entry` -- ver
 * docs/adr/0016-gamificacion-fundacion.md. Libro mayor INMUTABLE (trigger
 * `enforce_xp_ledger_entry_immutable`) -- este repositorio nunca expone un
 * `update`. "Reversible" = entrada compensatoria nueva únicamente, con
 * integridad de reverso reforzada en base de datos (mismo original,
 * OTORGAMIENTO, misma cuenta, monto negativo exacto -- trigger
 * `enforce_xp_ledger_entry_reversal_integrity`, ver migración
 * `xp_grant_integrity`).
 *
 * Todos los métodos aceptan un cliente Prisma opcional (`tx`) para poder
 * ejecutarse dentro de la transacción SERIALIZABLE del servicio de
 * otorgamiento -- por defecto usan `this.prisma` (mismo comportamiento que
 * el incremento anterior cuando se omite).
 */
@Injectable()
export class XpLedgerEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotencia ante reintento: un segundo `create` con el mismo
   * `idempotencyKey` -> P2002, capturado explícitamente, devuelve la fila
   * ya creada -- mismo patrón que UserService.initializeProfile (ADR-0008).
   * `created` distingue explícitamente creación real de preexistencia --
   * el llamador solo debe incrementar xp_balance cuando `created === true`.
   *
   * Fuera de una transacción explícita (`tx` omitido): captura el P2002 y
   * vuelve a consultar con el mismo cliente -- seguro, porque cada llamada
   * sin `tx` es su propia transacción implícita independiente.
   *
   * DENTRO de una transacción explícita (`tx` presente): un P2002 dentro de
   * `$transaction` deja el resto de esa transacción ABORTADA a nivel de
   * Postgres (25P02) -- cualquier consulta posterior con el mismo `tx`
   * fallaría también. Por eso aquí el error se RELANZA tal cual, sin
   * intentar re-consultar -- el llamador (XpGrantService) debe manejar la
   * idempotencia FUERA de la transacción, con una consulta nueva.
   */
  async createIdempotent(
    input: {
      accountId: string;
      validatedActivityId?: string | null;
      xpRuleId?: string | null;
      entryType: XpLedgerEntryType;
      xpAmount: number;
      baseXpAmount?: number | null;
      multiplierReference?: string | null;
      ruleVersion?: string | null;
      reasonCode?: string | null;
      idempotencyKey: string;
      occurredAt: Date;
      reversesEntryId?: string | null;
      createdByActorType?: XpLedgerActorType;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ entry: XpLedgerEntry; created: boolean }> {
    const client: Client = tx ?? this.prisma;
    try {
      const entry = await client.xpLedgerEntry.create({ data: input });
      return { entry, created: true };
    } catch (error) {
      const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
      if (isUniqueViolation && !tx) {
        const existing = await client.xpLedgerEntry.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) return { entry: existing, created: false };
      }
      throw error;
    }
  }

  findById(id: string): Promise<XpLedgerEntry | null> {
    return this.prisma.xpLedgerEntry.findUnique({ where: { id } });
  }

  findByIdempotencyKey(idempotencyKey: string): Promise<XpLedgerEntry | null> {
    return this.prisma.xpLedgerEntry.findUnique({ where: { idempotencyKey } });
  }

  findByReversesEntryId(reversesEntryId: string): Promise<XpLedgerEntry | null> {
    return this.prisma.xpLedgerEntry.findUnique({ where: { reversesEntryId } });
  }

  findByAccountId(accountId: string): Promise<XpLedgerEntry[]> {
    return this.prisma.xpLedgerEntry.findMany({ where: { accountId }, orderBy: { recordedAt: 'asc' } });
  }

  /**
   * Historial paginado para el incremento "Progresión visible" (Bloque II)
   * -- descendente (más reciente primero), cursor por `recordedAt` (nunca
   * por offset numérico, para no desalinearse si se insertan filas entre
   * páginas). Es una lectura directa del ledger, no una proyección --
   * satisface por construcción el Decision Gate de reconstructibilidad del
   * historial.
   */
  findByAccountIdPaginated(accountId: string, options: { limit: number; beforeRecordedAt?: Date }): Promise<XpLedgerEntry[]> {
    return this.prisma.xpLedgerEntry.findMany({
      where: {
        accountId,
        ...(options.beforeRecordedAt ? { recordedAt: { lt: options.beforeRecordedAt } } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: options.limit,
    });
  }

  /**
   * Recalcula el XP neto de una cuenta directamente desde el ledger --
   * NUNCA desde xp_balance. Esta es la capacidad estructural que garantiza
   * que xp_balance sea una proyección reconstruible y no una segunda
   * fuente de verdad.
   */
  async sumNetXpForAccount(accountId: string): Promise<number> {
    const result = await this.prisma.xpLedgerEntry.aggregate({
      where: { accountId },
      _sum: { xpAmount: true },
    });
    return result._sum.xpAmount ?? 0;
  }

  /**
   * Suma de OTORGAMIENTO ya concedidos hoy, para una regla concreta --
   * base del control de daily_cap. Filtra estrictamente `entryType:
   * OTORGAMIENTO`: un REVERSO nunca participa aquí, por lo que revertir un
   * otorgamiento NO libera cupo del día (política ya aprobada). Debe
   * ejecutarse DENTRO de la transacción SERIALIZABLE del otorgamiento --
   * por eso exige `tx` explícito, sin valor por defecto.
   */
  async sumGrantedTodayForRule(tx: Prisma.TransactionClient, accountId: string, xpRuleId: string, dayStart: Date, dayEnd: Date): Promise<number> {
    const result = await tx.xpLedgerEntry.aggregate({
      where: {
        accountId,
        xpRuleId,
        entryType: 'OTORGAMIENTO',
        occurredAt: { gte: dayStart, lt: dayEnd },
      },
      _sum: { xpAmount: true },
    });
    return result._sum.xpAmount ?? 0;
  }

  /**
   * Bloque III, sub-incremento 1.b (`RewardEvaluationWorker`, ADR-0019 §1)
   * -- lectura pura, no modifica nada. Orden COMPUESTO (`recordedAt`, `id`),
   * nunca solo `recordedAt`: evita omitir entradas que comparten
   * `recordedAt` exacto (precisión obligatoria del Product Owner).
   * `cursor = null` significa "esta cuenta nunca se procesó con éxito" --
   * cualquier entrada existente cuenta como pendiente.
   */
  hasEntryAfter(accountId: string, cursor: { recordedAt: Date; entryId: string } | null, tx?: Prisma.TransactionClient): Promise<XpLedgerEntry | null> {
    const client: Client = tx ?? this.prisma;
    if (!cursor) {
      return client.xpLedgerEntry.findFirst({ where: { accountId } });
    }
    return client.xpLedgerEntry.findFirst({
      where: {
        accountId,
        OR: [{ recordedAt: { gt: cursor.recordedAt } }, { recordedAt: cursor.recordedAt, id: { gt: cursor.entryId } }],
      },
    });
  }

  /**
   * Mismo criterio de orden compuesto que `hasEntryAfter` -- devuelve TODAS
   * las entradas pendientes de la cuenta, ordenadas (`recordedAt` asc,
   * `id` asc), para que el llamador procese el lote completo y avance el
   * cursor a la posición exacta de la ÚLTIMA fila realmente procesada
   * (nunca a "lo último que exista ahora").
   */
  findPendingSince(accountId: string, cursor: { recordedAt: Date; entryId: string } | null, tx?: Prisma.TransactionClient): Promise<XpLedgerEntry[]> {
    const client: Client = tx ?? this.prisma;
    if (!cursor) {
      return client.xpLedgerEntry.findMany({ where: { accountId }, orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }] });
    }
    return client.xpLedgerEntry.findMany({
      where: {
        accountId,
        OR: [{ recordedAt: { gt: cursor.recordedAt } }, { recordedAt: cursor.recordedAt, id: { gt: cursor.entryId } }],
      },
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
    });
  }
}
