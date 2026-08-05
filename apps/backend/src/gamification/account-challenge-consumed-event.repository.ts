import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Único punto de acceso a `account_challenge_consumed_event` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md §4.16(e) (Incremento 4, sub-incremento
 * 4.b). Deduplicación por evento, independiente del `daily_cap`: `UNIQUE
 * (accountChallengeId, xpLedgerEntryId)` ES la clave idempotente.
 *
 * `tryConsume` es la ÚNICA vía de escritura -- debe ejecutarse con el MISMO
 * `tx` que el resto del paso (lectura de `daily_cap`, `upsertContribution`,
 * incremento de `progressValue`, §4.16(d)). Devuelve `false` si el evento
 * YA estaba consumido para ese `account_challenge` (P2002) -- el llamador
 * debe cortar ahí, sin tocar `daily_cap` ni progreso.
 */
@Injectable()
export class AccountChallengeConsumedEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async tryConsume(tx: Prisma.TransactionClient, accountChallengeId: string, xpLedgerEntryId: string): Promise<boolean> {
    try {
      await tx.accountChallengeConsumedEvent.create({ data: { accountChallengeId, xpLedgerEntryId } });
      return true;
    } catch (error) {
      const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
      if (isUniqueViolation) return false;
      throw error;
    }
  }

  findByAccountChallengeAndEntry(accountChallengeId: string, xpLedgerEntryId: string) {
    return this.prisma.accountChallengeConsumedEvent.findUnique({
      where: { accountChallengeId_xpLedgerEntryId: { accountChallengeId, xpLedgerEntryId } },
    });
  }
}
