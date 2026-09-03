import type { PremiumTier } from '@axioma/contracts';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.1.
 *
 * Los 9 estados NORMALIZADOS del ciclo de vida de una suscripcion
 * (docs/adr/PREMIUM-V1-LAYER-3-BILLING-ARCHITECTURE.md seccion D.6). Coincide
 * 1:1 con el enum Prisma `SubscriptionState`; se declara aqui como una union
 * de strings para que `deriveSubscriptionTier` sea PURA -- testeable con solo
 * `tsx`, sin arrastrar el cliente de Prisma ni NestJS.
 *
 * El futuro adaptador de Google (C3.2/C3.3) mapea
 * `SubscriptionPurchaseV2.subscriptionState` a estos valores; el dominio
 * nunca ve tipos de transporte de Google.
 */
export type NormalizedSubscriptionState =
  | 'PENDING'
  | 'ACTIVE'
  | 'IN_GRACE_PERIOD'
  | 'ON_HOLD'
  | 'CANCELED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'PAUSED'
  | 'SUPERSEDED';

/**
 * Proyeccion MINIMA que necesita la derivacion del tier. `autoRenewing` se
 * incluye a proposito en la firma para dejar EXPLICITO que la funcion lo
 * IGNORA -- el tier nunca se deriva de la intencion de renovacion.
 */
export interface DerivableSubscription {
  state: NormalizedSubscriptionState;
  /** `currentPeriodEnd`. La comparacion con `now` es `>` ESTRICTA. */
  expiryTime: Date | null;
  /** DIAGNOSTICO. `deriveSubscriptionTier` NUNCA lo lee (ADR seccion E.1). */
  autoRenewing: boolean;
}

/**
 * FUNCION PURA -- el corazon de la Capa 3. Sin DB, sin API, sin framework,
 * sin `Date.now()` implicito (`now` se inyecta). Implementa EXACTAMENTE la
 * matriz de ciclo de vida aprobada en C3.0 (ADR seccion E.1 / E.2).
 *
 * Invariantes congelados:
 *   - `null`                              -> FREE
 *   - `PENDING`                           -> FREE  (pago no confirmado; una compra pendiente nunca concede)
 *   - `REVOKED`                           -> FREE  (reembolso/chargeback: inmediato, ignora timestamps stale)
 *   - `EXPIRED`                           -> FREE
 *   - `ON_HOLD`                           -> FREE  (Google ya bloquea)
 *   - `PAUSED`                            -> FREE  (no aplica V1)
 *   - `SUPERSEDED`                        -> FREE  (nunca deberia llegar como fila "vigente")
 *   - `ACTIVE` / `IN_GRACE_PERIOD`        -> PREMIUM  (grace CONSERVA acceso)
 *          salvo guarda de robustez: si `expiryTime` ya paso, es una fila
 *          stale -> FREE hasta que una reconsulta (C3.2/C3.3) la corrija
 *   - `CANCELED`                          -> PREMIUM si `expiryTime > now`, si no FREE
 *          (cancelar la auto-renovacion NO degrada; el tier NUNCA sale de `autoRenewing`)
 */
export function deriveSubscriptionTier(subscription: DerivableSubscription | null, now: Date): PremiumTier {
  if (subscription === null) return 'FREE';

  const nowMs = now.getTime();
  const expiryMs = subscription.expiryTime === null ? null : subscription.expiryTime.getTime();
  /** ADR E.1: `>` ESTRICTA -- `expiryTime === now` cuenta como YA EXPIRADO. */
  const paidPeriodStillValid = expiryMs !== null && expiryMs > nowMs;
  const paidPeriodClearlyPast = expiryMs !== null && expiryMs <= nowMs;

  switch (subscription.state) {
    case 'PENDING':
    case 'REVOKED':
    case 'EXPIRED':
    case 'ON_HOLD':
    case 'PAUSED':
    case 'SUPERSEDED':
      return 'FREE';

    case 'ACTIVE':
    case 'IN_GRACE_PERIOD':
      return paidPeriodClearlyPast ? 'FREE' : 'PREMIUM';

    case 'CANCELED':
      return paidPeriodStillValid ? 'PREMIUM' : 'FREE';

    default: {
      // Exhaustividad: si el enum crece sin actualizar esta funcion, TS falla
      // aqui en compilacion. En runtime, lo conservador es FREE.
      const exhaustive: never = subscription.state;
      void exhaustive;
      return 'FREE';
    }
  }
}
