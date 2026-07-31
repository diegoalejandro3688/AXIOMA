import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AuthSession } from '../generated/prisma/client';

/** Único punto de acceso a la tabla `auth_session`. */
@Injectable()
export class AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<AuthSession | null> {
    return this.prisma.authSession.findUnique({ where: { id } });
  }

  create(input: { accountId: string; sessionVersion: number; expiresAt: Date }): Promise<AuthSession> {
    return this.prisma.authSession.create({ data: input });
  }

  touchLastSeen(id: string): Promise<AuthSession> {
    return this.prisma.authSession.update({ where: { id }, data: { lastSeenAt: new Date() } });
  }

  revoke(id: string): Promise<AuthSession> {
    return this.prisma.authSession.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  /** Usado en la eliminación coordinada: revoca todas las sesiones activas de una cuenta. */
  revokeAllByAccountId(accountId: string): Promise<{ count: number }> {
    return this.prisma.authSession.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
