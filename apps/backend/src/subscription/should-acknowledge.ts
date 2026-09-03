import { deriveSubscriptionTier, type NormalizedSubscriptionState } from '../entitlement/subscription/derive-subscription-tier';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2 (hardening).
 *
 * Regla PURA de acknowledgement. Google exige acknowledgear el purchase
 * token de una compra NUEVA/cambio/re-signup una vez que la compra es valida
 * y el entitlement se concede (deadline 3 dias); una renovacion normal
 * reutiliza el mismo token y vuelve YA `ACKNOWLEDGED`, asi que no hace falta
 * re-acknowledgear.
 *
 * Se acknowledgea sii TODO lo siguiente:
 *   - `acknowledged === false` (`acknowledgementState === PENDING`) -- una
 *     renovacion / un token ya reconocido nunca vuelve aqui;
 *   - `recognizedState` -- un estado que ZETRYND no reconoce es fail-closed,
 *     nunca se acknowledgea;
 *   - el estado NO es `PENDING` (una compra pendiente de pago no se
 *     acknowledgea, aunque la regla de abajo tambien lo cubre);
 *   - la compra CONCEDE entitlement AHORA -- `deriveSubscriptionTier === 'PREMIUM'`.
 *     Esto cubre exactamente los casos correctos sin enumerarlos a mano:
 *       ACTIVE                              -> ack
 *       IN_GRACE_PERIOD                     -> ack (la tabla de dominio lo considera entitlement-bearing)
 *       CANCELED + expiryTime > now         -> ack (el usuario cancelo la auto-renovacion antes de que el
 *                                                   backend terminara, pero el periodo pagado sigue vigente
 *                                                   y deriva PREMIUM -> DEBE acknowledgearse)
 *       CANCELED + expiryTime <= now        -> NO (ya no concede)
 *       EXPIRED / ON_HOLD / PAUSED          -> NO
 *       PENDING                            -> NO
 *       desconocido (fail-closed -> EXPIRED)-> NO
 */
export interface AcknowledgeDecisionInput {
  state: NormalizedSubscriptionState;
  expiryTime: Date | null;
  recognizedState: boolean;
  acknowledged: boolean;
}

export function shouldAcknowledgeSubscription(input: AcknowledgeDecisionInput, now: Date): boolean {
  if (input.acknowledged) return false;
  if (!input.recognizedState) return false;
  if (input.state === 'PENDING') return false;
  // `autoRenowing` no influye en deriveSubscriptionTier -- se pasa false por firma.
  return deriveSubscriptionTier({ state: input.state, expiryTime: input.expiryTime, autoRenewing: false }, now) === 'PREMIUM';
}
