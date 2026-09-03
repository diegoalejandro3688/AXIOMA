/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * Tabla ACTUAL de `subscriptionNotification.notificationType` (enteros de
 * Google Play RTDN). NO derivar entitlement de este valor -- solo sirve para
 * (a) decidir si el evento es accionable (dispara `subscriptionsv2.get`) y
 * (b) registrar `latestNotificationType` para auditoria/soporte.
 *
 * Fuente: https://developer.android.com/google/play/billing/rtdn-reference#sub
 * (revisada 2026-09).
 *
 * IMPORTANTE: reconocer un tipo != soportarlo como producto. ZETRYND V1 vende
 * UN base plan mensual; `ITEMS_CHANGED` (17), `CANCELLATION_SCHEDULED` (18),
 * `PRICE_CHANGE_UPDATED` (19) y `PRICE_STEP_UP_CONSENT_UPDATED` (22) se
 * reconocen y REGISTRAN, disparan la reconsulta autoritativa como cualquier
 * otro evento con `purchaseToken`, y NO llevan a implementar add-ons /
 * cuotas / UI de cambio de precio. Si un `ITEMS_CHANGED` anadiera un add-on,
 * el mapper C3.2 lo rechaza (line item no `premium-monthly` -> fail-closed).
 */
export const RTDN_SUBSCRIPTION_NOTIFICATION_TYPES: Record<number, string> = {
  1: 'SUBSCRIPTION_RECOVERED',
  2: 'SUBSCRIPTION_RENEWED',
  3: 'SUBSCRIPTION_CANCELED',
  4: 'SUBSCRIPTION_PURCHASED',
  5: 'SUBSCRIPTION_ON_HOLD',
  6: 'SUBSCRIPTION_IN_GRACE_PERIOD',
  7: 'SUBSCRIPTION_RESTARTED',
  // Tipo 8: documentado pero DEPRECADO por Google (reemplazado por el flujo de
  // 19 `SUBSCRIPTION_PRICE_CHANGE_UPDATED`). Se sigue reconociendo.
  8: 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED',
  9: 'SUBSCRIPTION_DEFERRED',
  10: 'SUBSCRIPTION_PAUSED',
  11: 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED',
  12: 'SUBSCRIPTION_REVOKED',
  13: 'SUBSCRIPTION_EXPIRED',
  17: 'SUBSCRIPTION_ITEMS_CHANGED',
  18: 'SUBSCRIPTION_CANCELLATION_SCHEDULED',
  19: 'SUBSCRIPTION_PRICE_CHANGE_UPDATED',
  20: 'SUBSCRIPTION_PENDING_PURCHASE_CANCELED',
  22: 'SUBSCRIPTION_PRICE_STEP_UP_CONSENT_UPDATED',
};

/** Tipos documentados pero DEPRECADOS por Google -- reconocidos, no accionados de forma especial. */
export const RTDN_SUBSCRIPTION_DEPRECATED_TYPES = new Set<number>([8]);

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
