import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AdminActorToken } from '../generated/prisma/client';

/**
 * Único punto de acceso a `admin_actor_token`.
 *
 * Ningún método de esta clase recibe, devuelve, registra ni almacena el token
 * EN CLARO: la frontera del secreto queda en `AdminIdentityService`, y lo que
 * cruza hacia la persistencia es siempre un hash.
 */
@Injectable()
export class AdminTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: { actorId: string; tokenHash: string; expiresAt: Date }): Promise<AdminActorToken> {
    return this.prisma.adminActorToken.create({ data: input });
  }

  /**
   * Resolución token->fila por igualdad exacta sobre el índice UNIQUE del
   * hash. Una sola búsqueda indexada, sin recorrer filas.
   */
  findByHash(tokenHash: string): Promise<AdminActorToken | null> {
    return this.prisma.adminActorToken.findUnique({ where: { tokenHash } });
  }

  revoke(id: string): Promise<AdminActorToken> {
    return this.prisma.adminActorToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /** Baja de una persona del equipo: desactivar el actor Y revocar sus tokens. */
  revokeAllByActorId(actorId: string): Promise<{ count: number }> {
    return this.prisma.adminActorToken.updateMany({
      where: { actorId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
