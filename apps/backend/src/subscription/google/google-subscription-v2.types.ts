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

/**
 * `SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED` -- estado ACTUAL y
 * documentado de Google (NO un enum futuro desconocido): una compra
 * PENDIENTE (un cambio de plan / re-alta / compra con pago diferido que aun
 * no completaba) fue CANCELADA antes de completarse. La transaccion NUNCA
 * llego a ser una suscripcion.
 *
 * Si la compra pendiente concernia a una suscripcion EXISTENTE, Google
 * devuelve `linkedPurchaseToken` apuntando a esa suscripcion y el estado
 * autoritativo hay que leerlo de ELLA (no de este token). RTDN emite el tipo
 * 20 `SUBSCRIPTION_PENDING_PURCHASE_CANCELED` (C3.3).
 *
 * ZETRYND lo trata como una DISPOSICION dedicada del mapper -- nunca una fila
 * `AccountSubscription`, nunca un `NormalizedSubscriptionState`, nunca un
 * acknowledge. Ver `map-google-subscription.ts`.
 */
export const GOOGLE_SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED =
  'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED' as const;

/** Valores documentados de `SubscriptionPurchaseV2.subscriptionState`. */
export type GoogleSubscriptionStateString =
  | 'SUBSCRIPTION_STATE_UNSPECIFIED'
  | 'SUBSCRIPTION_STATE_PENDING'
  | 'SUBSCRIPTION_STATE_ACTIVE'
  | 'SUBSCRIPTION_STATE_PAUSED'
  | 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
  | 'SUBSCRIPTION_STATE_ON_HOLD'
  | 'SUBSCRIPTION_STATE_CANCELED'
  | 'SUBSCRIPTION_STATE_EXPIRED'
  | typeof GOOGLE_SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED;

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
 * `SubscriptionPurchaseV2.outOfAppPurchaseContext` -- presente cuando la
 * suscripcion se compro FUERA de la app (p. ej. el usuario se re-suscribe
 * desde la Play Store tras la EXPIRACION TOTAL de su suscripcion anterior).
 * Google lo provee EXPRESAMENTE para que el backend pueda asociar y
 * acknowledgear la compra nueva aunque la app nunca se abra.
 *
 * `expiredPurchaseToken` NO es `linkedPurchaseToken`: la suscripcion anterior
 * YA termino (no es un reemplazo en vivo) -- ver `map-google-subscription.ts`.
 */
export interface GoogleOutOfAppPurchaseContext {
  /** `purchaseToken` de la suscripcion EXPIRADA de la que esta es re-alta. */
  expiredPurchaseToken?: string;
  /** Identificadores externos (ofuscados) de esa suscripcion expirada. */
  expiredExternalAccountIdentifiers?: GoogleExternalAccountIdentifiers;
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
  /** Presente en re-altas fuera de la app tras expiracion total. */
  outOfAppPurchaseContext?: GoogleOutOfAppPurchaseContext;
  /** Timestamp RFC3339. */
  startTime?: string;
  lineItems?: GoogleSubscriptionPurchaseLineItem[];
}
