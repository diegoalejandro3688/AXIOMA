/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * Reglas PURAS de cronologia de proveedor y de contexto de revocacion. Sin
 * DB, sin red, sin framework.
 *
 * `DeveloperNotification.eventTimeMillis` (RTDN) es la cronologia AUTORITATIVA
 * de Google. NUNCA se usa el instante de llegada del request, `updatedAt` ni
 * `Date.now()` como cronologia de proveedor.
 */
import type { NormalizedSubscriptionState } from '../../entitlement/subscription/derive-subscription-tier';
import { RTDN_SUBSCRIPTION_REVOKED } from './rtdn-notification-type';

/** `eventTimeMillis` (string de ms epoch) -> Date, o null si no es parseable. */
export function parseEventTimeMillis(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const ms = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface ProviderEventTimeUpdate {
  latestEventTime: Date;
  latestNotificationType: string | null;
}

/**
 * MONOTONICIDAD de `latestEventTime`. Devuelve el update a aplicar, o `null`
 * si NO se debe tocar la cronologia:
 *
 *   - `incoming === null` (reconcile DIRECTO desde el movil, C3.2)   -> null
 *     (una reconsulta directa nunca aporta cronologia de proveedor y NUNCA
 *      borra la que ya hubiera de una RTDN previa)
 *   - `existing === null`                                            -> aplica `incoming`
 *   - `incoming > existing`                                          -> aplica `incoming`
 *   - `incoming <= existing` (RTDN atrasado / fuera de orden)        -> null
 *     (la entrega de Pub/Sub NO es cronologia; nunca se retrocede)
 *
 * `latestNotificationType` solo acompaña cuando la cronologia AVANZA -- una
 * RTDN vieja no pisa el tipo del ultimo evento real.
 */
export function resolveProviderEventTimeUpdate(
  existing: Date | null,
  incoming: Date | null,
  incomingNotificationType: string | null,
): ProviderEventTimeUpdate | null {
  if (incoming === null) return null;
  if (existing !== null && incoming.getTime() <= existing.getTime()) return null;
  return { latestEventTime: incoming, latestNotificationType: incomingNotificationType };
}

/**
 * Contexto de REVOCACION (task C3.3 §14). `SubscriptionPurchaseV2` NO expone
 * un estado "revoked": tras una revocacion Google devuelve un estado terminal
 * (tipicamente `EXPIRED`). El mapper C3.2 nunca produce `REVOKED`.
 *
 * Cuando el RTDN que dispara la reconsulta es `SUBSCRIPTION_REVOKED` (tipo 12)
 * Y el estado derivado del snapshot ya es terminal-no-entitled, se registra
 * `REVOKED` en vez de `EXPIRED` -- SOLO fidelidad de auditoria: ambos derivan
 * `FREE`, el entitlement no cambia. Si el snapshot dijera ACTIVE/GRACE/etc.
 * (no deberia, post-revoke) NO se sobreescribe -- se confia en Google y se deja
 * que el llamador lo loguee como posible desincronizacion.
 */
export function applyRevocationContext(
  derivedState: NormalizedSubscriptionState,
  incomingNotificationType: number | null,
): NormalizedSubscriptionState {
  if (incomingNotificationType !== RTDN_SUBSCRIPTION_REVOKED) return derivedState;
  if (derivedState === 'EXPIRED') return 'REVOKED';
  return derivedState;
}
