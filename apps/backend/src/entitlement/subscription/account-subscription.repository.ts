import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service';
import type { AccountSubscription } from '../../generated/prisma/client';
import type { DerivableSubscription } from './derive-subscription-tier';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.1.
 *
 * Repositorio de LECTURA del dominio de suscripcion. C3.1 no escribe nada
 * (sin verificacion de Google, sin RTDN); la unica operacion es resolver la
 * fila "vigente" de una cuenta para que `EntitlementService` derive el tier.
 *
 * Regla de seleccion DETERMINISTA (ADR seccion D.3 / task C3.1 seccion 7):
 * el historico es legitimo (una cuenta puede tener una fila EXPIRED vieja +
 * una fila nueva tras resubscribe con token rotado). NUNCA es un
 * `findFirst()` sin orden.
 *
 *   - se EXCLUYEN las filas `SUPERSEDED` (reemplazadas por rotacion de token);
 *   - entre el resto gana la que Google actualizo mas recientemente:
 *     `updatedAt` DESC (siempre presente) -> desempate por `id` DESC.
 *
 * Consecuencia: una fila ACTIVE historica y stale NUNCA gana frente a una
 * fila mas nueva EXPIRED/REVOKED/ON_HOLD. Los registros historicos jamas
 * conceden Premium por accidente cuando un registro mas nuevo dice lo
 * contrario.
 */
@Injectable()
export class AccountSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentByAccountId(accountId: string): Promise<AccountSubscription | null> {
    return this.prisma.accountSubscription.findFirst({
      where: { accountId, state: { not: 'SUPERSEDED' } },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
  }
}

/**
 * Proyecta una fila Prisma `AccountSubscription` a la forma MINIMA que
 * consume la funcion pura `deriveSubscriptionTier` -- deja fuera todo lo
 * diagnostico/auditoria y todo lo de transporte.
 */
export function toDerivableSubscription(row: AccountSubscription | null): DerivableSubscription | null {
  if (row === null) return null;
  return {
    state: row.state,
    expiryTime: row.expiryTime,
    autoRenewing: row.autoRenewing,
  };
}
