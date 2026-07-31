import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Account, AccountStatus } from '../generated/prisma/client';

/** Único punto de acceso a la tabla `account`. */
@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({ where: { id } });
  }

  create(status: AccountStatus): Promise<Account> {
    return this.prisma.account.create({ data: { status } });
  }

  updateStatus(id: string, status: AccountStatus): Promise<Account> {
    return this.prisma.account.update({ where: { id }, data: { status } });
  }

  touchLastAuthenticated(id: string): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: { lastAuthenticatedAt: new Date() },
    });
  }

  /** Invalida globalmente todas las sesiones anteriores de la cuenta. */
  incrementSessionVersion(id: string): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: { sessionVersion: { increment: 1 } },
    });
  }

  markDeletionPending(id: string): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: { status: 'DELETION_PENDING', deletionRequestedAt: new Date() },
    });
  }

  markClosed(id: string): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }
}
