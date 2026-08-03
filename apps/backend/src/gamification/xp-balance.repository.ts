import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { XpBalance } from '../generated/prisma/client';

/**
 * Único punto de acceso a `xp_balance` -- ver
 * docs/adr/0016-gamificacion-fundacion.md. Proyección materializada: este
 * incremento solo expone create/find, sin lógica de cálculo. La garantía de
 * reconstructibilidad vive en XpLedgerEntryRepository.sumNetXpForAccount,
 * no aquí -- ver brief del incremento.
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
}
