import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { AccountBlock } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** PS-0C.2 -- único punto de acceso a `account_block`. */
@Injectable()
export class AccountBlockRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotente: si ya existe la relación, devuelve `{ created: false }` con la fila previa. */
  async create(blockerAccountId: string, blockedAccountId: string): Promise<{ block: AccountBlock; created: boolean }> {
    try {
      const block = await this.prisma.accountBlock.create({ data: { blockerAccountId, blockedAccountId } });
      return { block, created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
        const existing = await this.prisma.accountBlock.findUnique({
          where: { blockerAccountId_blockedAccountId: { blockerAccountId, blockedAccountId } },
        });
        if (existing) return { block: existing, created: false };
      }
      throw error;
    }
  }

  /** Idempotente: borrar una relación inexistente devuelve `0`, nunca lanza. */
  async delete(blockerAccountId: string, blockedAccountId: string): Promise<number> {
    const result = await this.prisma.accountBlock.deleteMany({ where: { blockerAccountId, blockedAccountId } });
    return result.count;
  }

  /** Conjunto de `blockedAccountId` para un bloqueador -- usado por la redacción de Ranking / perfil público. */
  async findBlockedAccountIds(blockerAccountId: string): Promise<Set<string>> {
    const rows = await this.prisma.accountBlock.findMany({
      where: { blockerAccountId },
      select: { blockedAccountId: true },
    });
    return new Set(rows.map((r) => r.blockedAccountId));
  }

  findByBlocker(blockerAccountId: string): Promise<AccountBlock[]> {
    return this.prisma.accountBlock.findMany({
      where: { blockerAccountId },
      orderBy: { createdAt: 'desc' },
    });
  }

  isBlocked(blockerAccountId: string, blockedAccountId: string): Promise<AccountBlock | null> {
    return this.prisma.accountBlock.findUnique({
      where: { blockerAccountId_blockedAccountId: { blockerAccountId, blockedAccountId } },
    });
  }

  /**
   * F1-A.4 -- cierre definitivo de cuenta. Reemplaza `blockerAccountId` por
   * `ref` en toda fila donde el bloqueador sea la cuenta que se cierra.
   * Idempotente igual que `PublicProfileReportRepository.pseudonymizeReporter`.
   */
  async pseudonymizeBlocker(accountId: string, ref: string): Promise<number> {
    const result = await this.prisma.accountBlock.updateMany({
      where: { blockerAccountId: accountId },
      data: { blockerAccountId: ref },
    });
    return result.count;
  }

  /**
   * F1-A.4 -- cierre definitivo de cuenta. Reemplaza `blockedAccountId` por
   * `ref` en toda fila donde el objetivo bloqueado sea la cuenta que se
   * cierra.
   */
  async pseudonymizeBlocked(accountId: string, ref: string): Promise<number> {
    const result = await this.prisma.accountBlock.updateMany({
      where: { blockedAccountId: accountId },
      data: { blockedAccountId: ref },
    });
    return result.count;
  }
}
