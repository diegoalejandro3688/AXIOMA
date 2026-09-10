import {
  GOOGLE_PLAY_SUBSCRIPTIONS_MANAGEMENT_URL,
  type SubscriptionRenewalStatus,
  type SubscriptionSummaryResponse,
} from '@axioma/contracts';
import type { NormalizedSubscriptionState } from '../entitlement/subscription/derive-subscription-tier';

/**
 * Estados TERMINALES del ciclo de vida (ADR K.2 -- "AccountSubscription
 * no-terminal"). Una fila en uno de estos estados ya no representa una
 * suscripcion viva: Google no la va a reactivar por si sola (una re-alta es
 * una compra NUEVA, otra fila). Es tambien la clave de `isSubscribed`.
 */
export const TERMINAL_SUBSCRIPTION_STATES: ReadonlySet<NormalizedSubscriptionState> = new Set([
  'EXPIRED',
  'REVOKED',
  'SUPERSEDED',
]);

/** Proyeccion MINIMA que el presentador necesita de la fila vigente. */
export interface PresentableSubscription {
  state: NormalizedSubscriptionState;
  /** `currentPeriodEnd`. */
  expiryTime: Date | null;
}

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1B.
 *
 * PRESENTADOR PURO del resumen de gestion de suscripcion (`GET /me/subscription`).
 * Sin DB, sin API, sin framework, `now` inyectado. Deriva EXCLUSIVAMENTE de la
 * fila `AccountSubscription` vigente + el `tier` de authorization ya resuelto
 * -- NUNCA re-deriva el tier, NUNCA fabrica estado de Google, NUNCA expone
 * tokens / `rawSnapshot` / el `subscriptionState` crudo / ids de cuenta.
 *
 * Invariante clave (ADR E.1 / K.2): `CANCELED` + `expiryTime > now` SIGUE
 * concediendo acceso (`renewalStatus: 'cancels'`, `tier` puede ser PREMIUM) --
 * cancelar la auto-renovacion NO es "expirada".
 */
export function presentSubscriptionSummary(
  subscription: PresentableSubscription | null,
  tier: 'FREE' | 'PREMIUM',
  now: Date,
): SubscriptionSummaryResponse {
  const managementUrl = GOOGLE_PLAY_SUBSCRIPTIONS_MANAGEMENT_URL;

  if (subscription === null) {
    return { tier, isSubscribed: false, renewalStatus: 'none', accessUntil: null, paymentIssue: false, managementUrl };
  }

  const { state, expiryTime } = subscription;
  const isTerminal = TERMINAL_SUBSCRIPTION_STATES.has(state);
  const expiryInFuture = expiryTime !== null && expiryTime.getTime() > now.getTime();

  // ADR K.2: `paymentIssue` = state IN_GRACE_PERIOD || ON_HOLD (exacto).
  const paymentIssue = state === 'IN_GRACE_PERIOD' || state === 'ON_HOLD';

  let renewalStatus: SubscriptionRenewalStatus;
  switch (state) {
    case 'ACTIVE':
      renewalStatus = 'renews';
      break;
    case 'IN_GRACE_PERIOD':
      renewalStatus = 'grace_period';
      break;
    case 'ON_HOLD':
      renewalStatus = 'on_hold';
      break;
    case 'CANCELED':
      // Periodo pagado aun vigente -> el acceso continua hasta `accessUntil`.
      renewalStatus = expiryInFuture ? 'cancels' : 'none';
      break;
    default:
      // PENDING / PAUSED / EXPIRED / REVOKED / SUPERSEDED
      renewalStatus = 'none';
  }

  // `accessUntil` (ISO) solo cuando es significativo: fila NO terminal con un
  // `currentPeriodEnd` conocido. Nunca lo calcula el cliente.
  const accessUntil = !isTerminal && expiryTime !== null ? expiryTime.toISOString() : null;

  return {
    tier,
    // ADR K.2: "hay una AccountSubscription no-terminal". PENDING / ON_HOLD /
    // PAUSED / CANCELED cuentan como `true` (siguen produciendo ciclo de vida
    // de Google y ameritan la advertencia al eliminar la cuenta) aunque su
    // `tier` sea FREE. NUNCA es sinonimo de `tier === 'PREMIUM'`.
    isSubscribed: !isTerminal,
    renewalStatus,
    accessUntil,
    paymentIssue,
    managementUrl,
  };
}
