import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { XpBalance } from '../generated/prisma/client';

/**
 * Único punto de acceso a `xp_balance` -- ver
 * docs/adr/0016-gamificacion-fundacion.md. Proyección materializada, NUNCA
 * fuente de verdad: `upsertIncrement` solo suma sobre lo que el ledger ya
 * confirmó (llamado dentro de la misma transacción que crea el
 * `xp_ledger_entry`); `setExact` es exclusivo de `reconcile()`, para
 * corregir una desalineación real recalculando desde el ledger -- nunca
 * para un otorgamiento normal.
 */
@Injectable()
export class XpBalanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: { accountId: string; lifetimeXp?: number; lastLedgerEntryId?: string | null }): Promise<XpBalance> {
    return this.prisma.xpBalance.create({ data: input });
  }

  findById(id: string): Promise<XpBalance | null> {
    return this.prisma.xpBalance.findUnique({ where: { id } });
  }

  findByAccountId(accountId: string): Promise<XpBalance | null> {
    return this.prisma.xpBalance.findUnique({ where: { accountId } });
  }

  /**
   * Incremento atómico -- SIEMPRE dentro de la transacción SERIALIZABLE del
   * otorgamiento/reverso que produjo `lastLedgerEntryId`, nunca aislado.
   */
  upsertIncrement(
    tx: Prisma.TransactionClient,
    input: { accountId: string; deltaXp: number; lastLedgerEntryId: string },
  ): Promise<XpBalance> {
    return tx.xpBalance.upsert({
      where: { accountId: input.accountId },
      create: {
        accountId: input.accountId,
        lifetimeXp: input.deltaXp,
        balanceVersion: 1,
        lastLedgerEntryId: input.lastLedgerEntryId,
      },
      update: {
        lifetimeXp: { increment: input.deltaXp },
        balanceVersion: { increment: 1 },
        lastLedgerEntryId: input.lastLedgerEntryId,
        calculatedAt: new Date(),
      },
    });
  }

  /**
   * Corrección exacta -- solo desde XpGrantService.reconcileBalance(), tras
   * recalcular la suma real desde xp_ledger_entry. No es un incremento:
   * fija el valor correcto directamente.
   */
  setExact(accountId: string, lifetimeXp: number, lastLedgerEntryId: string | null): Promise<XpBalance> {
    return this.prisma.xpBalance.upsert({
      where: { accountId },
      create: { accountId, lifetimeXp, balanceVersion: 1, lastLedgerEntryId },
      update: { lifetimeXp, balanceVersion: { increment: 1 }, lastLedgerEntryId, calculatedAt: new Date() },
    });
  }
}
