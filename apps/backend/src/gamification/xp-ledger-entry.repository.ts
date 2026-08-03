import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { XpLedgerEntry, XpLedgerEntryType, XpLedgerActorType } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Único punto de acceso a `xp_ledger_entry` -- ver
 * docs/adr/0016-gamificacion-fundacion.md. Libro mayor INMUTABLE (trigger
 * `enforce_xp_ledger_entry_immutable`) -- este repositorio nunca expone un
 * `update`. "Reversible" = entrada compensatoria nueva únicamente.
 *
 * Sin cálculo de XP en este incremento: `create`/`createIdempotent` son
 * plumbing estructural (idempotencia de escritura), no deciden el
 * `xpAmount` de ningún hecho real -- eso pertenece al incremento que
 * conecte PROGRESS -> GAMIFICATION.
 */
@Injectable()
export class XpLedgerEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotencia ante reintento: un segundo `create` con el mismo
   * `idempotencyKey` -> P2002, capturado explícitamente, devuelve la fila
   * ya creada -- mismo patrón que UserService.initializeProfile (ADR-0008).
   */
  async createIdempotent(input: {
    accountId: string;
    validatedActivityId?: string | null;
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
  }): Promise<XpLedgerEntry> {
    try {
      return await this.prisma.xpLedgerEntry.create({ data: input });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
        const existing = await this.findByIdempotencyKey(input.idempotencyKey);
        if (existing) return existing;
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

  findByAccountId(accountId: string): Promise<XpLedgerEntry[]> {
    return this.prisma.xpLedgerEntry.findMany({ where: { accountId }, orderBy: { recordedAt: 'asc' } });
  }

  /**
   * Recalcula el XP neto de una cuenta directamente desde el ledger --
   * NUNCA desde xp_balance. Esta es la capacidad estructural que garantiza
   * que xp_balance sea una proyección reconstruible y no una segunda
   * fuente de verdad (ver brief del incremento). Ningún llamador de este
   * incremento la invoca para escribir xp_balance todavía.
   */
  async sumNetXpForAccount(accountId: string): Promise<number> {
    const result = await this.prisma.xpLedgerEntry.aggregate({
      where: { accountId },
      _sum: { xpAmount: true },
    });
    return result._sum.xpAmount ?? 0;
  }
}
