/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * Tabla ACTUAL de `subscriptionNotification.notificationType` (enteros de
 * Google Play RTDN). NO derivar entitlement de este valor -- solo sirve para
 * (a) decidir si el evento es accionable (dispara `subscriptionsv2.get`) y
 * (b) registrar `latestNotificationType` para auditoria/soporte.
 *
 * Fuente: https://developer.android.com/google/play/billing/rtdn-reference#sub
 * (revisada 2026-09; incluye el tipo 20 `SUBSCRIPTION_PENDING_PURCHASE_CANCELED`).
 */
export const RTDN_SUBSCRIPTION_NOTIFICATION_TYPES: Record<number, string> = {
  1: 'SUBSCRIPTION_RECOVERED',
  2: 'SUBSCRIPTION_RENEWED',
  3: 'SUBSCRIPTION_CANCELED',
  4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD',
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
  7: 'SUBSCRIPTION_RESTARTED',
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
  9: 'SUBSCRIPTION_DEFERRED',
  10: 'SUBSCRIPTION_PAUSED',
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
  12: 'SUBSCRIPTION_REVOKED',
  13: 'SUBSCRIPTION_EXPIRED',
  20: 'SUBSCRIPTION_PENDING_PURCHASE_CANCELED',
};

/** Tipo 12. Revocacion / reembolso / chargeback -- contexto para la reconciliacion. */
export const RTDN_SUBSCRIPTION_REVOKED = 12;
/** Tipo 20. Compra pendiente cancelada -- fluye por el camino C3.2 ya aprobado. */
export const RTDN_SUBSCRIPTION_PENDING_PURCHASE_CANCELED = 20;

/**
 * Etiqueta legible de un `notificationType`. Un entero NO documentado (tipo
 * futuro) -> `SUBSCRIPTION_UNKNOWN_<n>` -- se registra, nunca concede nada.
 */
export function rtdnSubscriptionNotificationLabel(notificationType: number | null | undefined): string | null {
  if (notificationType === null || notificationType === undefined || !Number.isFinite(notificationType)) {
    return null;
  }
  return RTDN_SUBSCRIPTION_NOTIFICATION_TYPES[notificationType] ?? `SUBSCRIPTION_UNKNOWN_${notificationType}`;
}

/**
 * ¿El evento de suscripcion es ACCIONABLE (dispara `subscriptionsv2.get` +
 * reconciliacion C3.2)?
 *
 * SI para todo evento con `purchaseToken` -- incluidos tipos NO documentados:
 * reconsultar el estado actual de Google es siempre seguro (Google es la
 * autoridad; el mapper C3.2 es fail-closed). Un evento sin `purchaseToken`
 * (no deberia ocurrir en `subscriptionNotification`) no es accionable.
 */
export function isActionableSubscriptionNotification(purchaseToken: string | null | undefined): boolean {
  return typeof purchaseToken === 'string' && purchaseToken.length > 0;
}
