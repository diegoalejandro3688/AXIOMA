/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
 *
 * Tipos de TRANSPORTE -- subconjunto MINIMO de `SubscriptionPurchaseV2` /
 * `SubscriptionPurchaseLineItem` que ZETRYND lee de
 * `purchases.subscriptionsv2.get` (Android Publisher API v3).
 *
 * SOLO viven en `subscription/google/` -- ni el servicio de reconciliacion,
 * ni `EntitlementService`, ni ningun controller los importan. Todo lo que
 * sale de esta carpeta ya es un `VerifiedSubscriptionSnapshot` neutral.
 *
 * NOTA CONGELADA (task C3.2 seccion 3): `SubscriptionPurchaseV2` NO expone
 * `eventTimeMillis` -- ese campo pertenece a `DeveloperNotification` (RTDN,
 * C3.3). El mapper C3.2 NUNCA fija `latestEventTime`.
 */

/** Valores documentados de `SubscriptionPurchaseV2.subscriptionState`. */
export type GoogleSubscriptionStateString =
  | 'SUBSCRIPTION_STATE_UNSPECIFIED'
  | 'SUBSCRIPTION_STATE_PENDING'
  | 'SUBSCRIPTION_STATE_ACTIVE'
  | 'SUBSCRIPTION_STATE_PAUSED'
  | 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
  | 'SUBSCRIPTION_STATE_ON_HOLD'
  | 'SUBSCRIPTION_STATE_CANCELED'
  | 'SUBSCRIPTION_STATE_EXPIRED';

export interface GoogleAutoRenewingPlan {
  autoRenewEnabled?: boolean;
}

export interface GoogleOfferDetails {
  basePlanId?: string;
  offerId?: string;
  offerTags?: string[];
}

export interface GoogleSubscriptionPurchaseLineItem {
  productId?: string;
  /** Timestamp RFC3339. */
  expiryTime?: string;
  autoRenewingPlan?: GoogleAutoRenewingPlan;
  prepaidPlan?: unknown;
  offerDetails?: GoogleOfferDetails;
}

export interface GoogleExternalAccountIdentifiers {
  externalAccountId?: string;
  obfuscatedExternalAccountId?: string;
  obfuscatedExternalProfileId?: string;
}

export interface GoogleCanceledStateContext {
  userInitiatedCancellation?: unknown;
  systemInitiatedCancellation?: unknown;
  developerInitiatedCancellation?: unknown;
  replacementCancellation?: unknown;
}

/**
 * `SubscriptionPurchaseV2` -- subconjunto leido. Campos deliberadamente
 * OMITIDOS por decision de persistencia de la ADR (seccion D.2.c):
 * `subscribeWithGoogleInfo`, `latestOrderId` de line item, `etag`,
 * `pausedStateContext` (no aplica V1), etc.
 */
export interface GoogleSubscriptionPurchaseV2 {
  kind?: string;
  regionCode?: string;
  /** String enum; puede ser un valor futuro NO documentado. */
  subscriptionState?: string;
  linkedPurchaseToken?: string;
  acknowledgementState?: string;
  /** Objeto marcador ("no fields") -- presente == compra de prueba. */
  testPurchase?: Record<string, never> | null;
  externalAccountIdentifiers?: GoogleExternalAccountIdentifiers;
  canceledStateContext?: GoogleCanceledStateContext;
  /** Timestamp RFC3339. */
  startTime?: string;
  lineItems?: GoogleSubscriptionPurchaseLineItem[];
}
