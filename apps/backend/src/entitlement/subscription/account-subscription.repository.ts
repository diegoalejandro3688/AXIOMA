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
 *   1. se EXCLUYEN las filas `SUPERSEDED` (reemplazadas por rotacion de token);
 *   2. entre las elegibles gana la del EVENTO DE PROVEEDOR mas reciente:
 *      `latestEventTime` DESC, **NULLS LAST**. `latestEventTime` es la
 *      cronologia AUTORITATIVA de Google (`eventTimeMillis` de la RTDN /
 *      instante de la respuesta de `subscriptionsv2.get`) -- la misma senal
 *      que la ADR (seccion D.3 / H.3) usa para idempotencia y para descartar
 *      RTDN atrasados. Una fila cuya cronologia de proveedor es DESCONOCIDA
 *      (`latestEventTime = null`, p. ej. una fila de C3.1 todavia sin evento
 *      real) NUNCA adelanta a una fila con cronologia conocida;
 *   3. el orden de ESCRITURA LOCAL (`updatedAt`) es SOLO desempate
 *      determinista (dos filas con el mismo `latestEventTime`, o ambas
 *      `null`) -> `updatedAt` DESC -> `id` DESC. NUNCA reemplaza la
 *      cronologia del proveedor: una reconciliacion inocua/stale que toque
 *      `updatedAt` de una fila vieja no puede hacerla ganar.
 *
 * Consecuencia: una fila ACTIVE historica NUNCA gana frente a una fila cuyo
 * evento de proveedor es mas reciente y dice EXPIRED/REVOKED/ON_HOLD. Los
 * registros historicos jamas conceden Premium por accidente cuando un evento
 * de proveedor mas nuevo dice lo contrario.
 */
@Injectable()
export class AccountSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentByAccountId(accountId: string): Promise<AccountSubscription | null> {
    return this.prisma.accountSubscription.findFirst({
      where: { accountId, state: { not: 'SUPERSEDED' } },
      orderBy: [
        { latestEventTime: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
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
