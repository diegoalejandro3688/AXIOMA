import type { NormalizedSubscriptionState } from '../entitlement/subscription/derive-subscription-tier';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
 *
 * FRONTERA de transporte. Ninguna forma de Google (`SubscriptionPurchaseV2`,
 * `SubscriptionPurchaseLineItem`, enums `SUBSCRIPTION_STATE_*`) cruza este
 * puerto: el adaptador concreto ya devuelve un snapshot NEUTRAL y ya
 * NORMALIZADO al vocabulario de la Capa 1 (`NormalizedSubscriptionState`).
 * El servicio de reconciliacion y `EntitlementService` nunca ven JSON de
 * Google.
 */

/**
 * Snapshot VERIFICADO y NEUTRAL de una suscripcion, tal y como la
 * reconciliacion lo consume. Todo lo autoritativo + lo diagnostico que la
 * ADR (seccion D.2) decide persistir; nada de transporte.
 */
export interface VerifiedSubscriptionSnapshot {
  /** El `packageName` contra el que se verifico (constante ZETRYND). */
  packageName: string;
  purchaseToken: string;
  /** Token predecesor si Google reporta rotacion (`linkedPurchaseToken`). */
  linkedPurchaseToken: string | null;

  /** Estado YA normalizado (matriz C3.0 seccion E). */
  state: NormalizedSubscriptionState;
  /**
   * `false` si Google devolvio un `subscriptionState` que ZETRYND no
   * reconoce (enum futuro / `UNSPECIFIED`). Fail-closed: el estado
   * normalizado en ese caso es no-entitled y NUNCA `ACTIVE`.
   */
  recognizedState: boolean;
  /** El valor CRUDO de Google, solo para diagnostico/log. */
  rawSubscriptionState: string;

  /** `productId` del line item ZETRYND seleccionado. */
  productId: string;
  /** `basePlanId` del line item, o `null` si Google lo omite. */
  basePlanId: string | null;
  /** `lineItems[].expiryTime` -> `currentPeriodEnd`. */
  expiryTime: Date | null;
  /** `SubscriptionPurchaseV2.startTime`. */
  startTime: Date | null;
  /**
   * `lineItems[].autoRenewingPlan.autoRenewEnabled`. DIAGNOSTICO -- el tier
   * NUNCA se deriva de este campo (Capa 1).
   */
  autoRenewing: boolean;
  /** `acknowledgementState === ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED`. */
  acknowledged: boolean;

  /** Diagnostico (ADR seccion D.2.b) -- ningun consumidor de producto los lee. */
  testPurchase: boolean;
  regionCode: string | null;
  /** `externalAccountIdentifiers.obfuscatedExternalAccountId`, o `null`. */
  obfuscatedExternalAccountId: string | null;
  /** `canceledStateContext.userInitiatedCancellation` presente -> true; system -> false; ausente -> null. */
  cancelUserInitiated: boolean | null;

  /**
   * `outOfAppPurchaseContext.expiredPurchaseToken` -- la suscripcion EXPIRADA
   * de la que esta compra es re-alta FUERA de la app. Solo para ATRIBUCION de
   * cuenta (resolver el `accountId` de la fila expirada). NO es rotacion de
   * token: la fila anterior NO se marca `SUPERSEDED`.
   */
  expiredPurchaseToken: string | null;
  /**
   * `outOfAppPurchaseContext.expiredExternalAccountIdentifiers.obfuscatedExternalAccountId`.
   * DIAGNOSTICO -- fallback FUTURO de atribucion (C3.5 fijara un
   * `obfuscatedAccountId` opaco en el BillingFlow); hoy `expiredPurchaseToken`
   * basta para el caso primario (ZETRYND ya tiene la fila anterior).
   */
  expiredObfuscatedExternalAccountId: string | null;

  /** Respuesta cruda completa de `subscriptionsv2.get` -- se persiste en `rawSnapshot` (Json), nunca se loguea ni se expone por HTTP. */
  raw: unknown;
}

/**
 * Resultado de verificar un `purchaseToken` cuya compra PENDIENTE fue
 * CANCELADA (`SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED`). NO es un error
 * (el token se verifico con exito) y NO es una suscripcion (nunca produce una
 * fila `AccountSubscription`). `linkedPurchaseToken`, si Google lo trae, es la
 * suscripcion EXISTENTE cuyo estado autoritativo debe consultarse en su lugar.
 */
export interface PendingPurchaseCanceledResult {
  pendingPurchaseCanceled: true;
  purchaseToken: string;
  linkedPurchaseToken: string | null;
  /** Payload crudo del proveedor -- nunca se loguea ni se expone por HTTP. */
  raw: unknown;
}

export type SubscriptionVerificationResult = VerifiedSubscriptionSnapshot | PendingPurchaseCanceledResult;

export function isPendingPurchaseCanceled(
  result: SubscriptionVerificationResult,
): result is PendingPurchaseCanceledResult {
  return (result as PendingPurchaseCanceledResult).pendingPurchaseCanceled === true;
}

export interface SubscriptionProviderAdapter {
  /**
   * Verifica un `purchaseToken` contra el proveedor
   * (`purchases.subscriptionsv2.get`). Lanza `SubscriptionProviderError`
   * ante CUALQUIER fallo (credenciales ausentes, 4xx, 5xx, red, snapshot que
   * no corresponde al producto ZETRYND). NUNCA fabrica un snapshot exitoso.
   *
   * Devuelve un `VerifiedSubscriptionSnapshot` normal, o -- si la compra
   * pendiente fue cancelada -- un `PendingPurchaseCanceledResult` (no es un
   * fallo: el token se verifico).
   */
  getSubscription(purchaseToken: string): Promise<SubscriptionVerificationResult>;

  /**
   * Acknowledgea una compra (`purchases.subscriptions.acknowledge`).
   * IDEMPOTENTE: acknowledgear algo ya acknowledgeado es un no-op exitoso.
   * Lanza `SubscriptionProviderError` ante fallo -- el servicio de
   * reconciliacion lo trata como NO fatal (la fila ya esta persistida) y
   * reintenta despues.
   */
  acknowledgeSubscription(purchaseToken: string): Promise<void>;
}

export const SUBSCRIPTION_PROVIDER_ADAPTER = Symbol('SUBSCRIPTION_PROVIDER_ADAPTER');

export type SubscriptionProviderErrorCategory =
  /** Faltan / son invalidas las credenciales del backend. NUNCA es un exito de verificacion. */
  | 'not_configured'
  /** 404 -- el `purchaseToken` no existe / es desconocido para Google. */
  | 'not_found'
  /** 401 / 403 de Google -- problema de auth de la service account. */
  | 'auth_error'
  /** 400 -- peticion malformada / token con formato invalido. */
  | 'invalid_request'
  /** El snapshot no corresponde al producto ZETRYND (packageName/productId/base plan). */
  | 'wrong_product'
  /** 5xx / red -- transitorio, reintentable. */
  | 'transient'
  | 'unknown';

/** Fallo de transporte/verificacion del proveedor. Nunca lleva detalle crudo del SDK a HTTP. */
export class SubscriptionProviderError extends Error {
  readonly category: SubscriptionProviderErrorCategory;

  constructor(message: string, category: SubscriptionProviderErrorCategory) {
    super(message);
    this.name = 'SubscriptionProviderError';
    this.category = category;
  }
}
