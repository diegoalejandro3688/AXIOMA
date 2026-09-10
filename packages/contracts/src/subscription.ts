import { z } from 'zod';

// ===========================================================================
// PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
//
// Reconciliacion de una compra de Google Play. El movil (C3.5) enviara
// UNICAMENTE el `purchaseToken` opaco; el backend lo verifica con
// `purchases.subscriptionsv2.get`, persiste `AccountSubscription` y deja que
// `GET /me/entitlement` derive el tier. La respuesta es minima -- el movil
// consulta `GET /me/entitlement` para la verdad de authorization.
//
// FRONTERA CONGELADA: authorization (`accountEntitlementResponseSchema` de
// `./premium`, `{ tier }` estricto) NO cambia. Lo comercial vive aqui.
// ===========================================================================

/**
 * Body de `POST /me/subscription/google-play/reconcile`. `.strict()`: el
 * cliente NUNCA envia `accountId` / `tier` / `state` / `expiryTime` /
 * `autoRenewing` / un `productId` arbitrario -- la identidad real del
 * producto la determina Google, y el `accountId` sale de la sesion.
 */
export const subscriptionReconcileRequestSchema = z
  .object({
    purchaseToken: z.string().min(1).max(4096),
  })
  .strict();
export type SubscriptionReconcileRequest = z.infer<typeof subscriptionReconcileRequestSchema>;

/**
 * `verified` = el `purchaseToken` se verifico con Google y se reconcilio
 * `AccountSubscription` (el tier resultante puede ser PREMIUM o FREE segun el
 * estado -- se consulta con `GET /me/entitlement`).
 * `pending` = Google reporta la compra como pendiente de pago; NO se concede
 * acceso, no se acknowledgea; un evento posterior la reconciliara.
 * `canceled` = el `purchaseToken` que el cliente envio corresponde a una
 * compra PENDIENTE que se cancelo antes de completarse
 * (`SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED`). El `status` describe la
 * disposicion de ESE token: SIEMPRE `canceled`, aunque internamente el backend
 * reconcilie una suscripcion previa linkeada que siga concediendo PREMIUM. NO
 * es un exito de compra; el movil NO debe interpretarlo como tal. La verdad de
 * authorization es independiente: `GET /me/entitlement` (PREMIUM o FREE segun
 * la suscripcion previa, si la habia).
 */
export const subscriptionReconcileStatusSchema = z.enum(['verified', 'pending', 'canceled']);
export type SubscriptionReconcileStatus = z.infer<typeof subscriptionReconcileStatusSchema>;

export const subscriptionReconcileResponseSchema = z
  .object({
    status: subscriptionReconcileStatusSchema,
  })
  .strict();
export type SubscriptionReconcileResponse = z.infer<typeof subscriptionReconcileResponseSchema>;

/** `code` estable del 409 cuando un `purchaseToken` ya pertenece a OTRA cuenta ZETRYND. */
export const SUBSCRIPTION_ACCOUNT_MISMATCH_CODE = 'SUBSCRIPTION_ACCOUNT_MISMATCH';
/** `code` estable del 400 cuando el snapshot verificado no corresponde al producto ZETRYND (packageName/productId/base plan). */
export const SUBSCRIPTION_INVALID_CODE = 'SUBSCRIPTION_INVALID';
/**
 * `code` estable del 422 cuando una reconciliacion de PRIMER CONTACTO directa
 * (sin fila previa ni predecesor linkeado/re-alta) no puede ATRIBUIR la compra:
 * el snapshot verificado no trae `obfuscatedExternalAccountId`, o la cuenta
 * autenticada aun no tiene `billingAccountRef` aprovisionado. Solicitud bien
 * formada pero evidencia de atribucion insuficiente (PB-0A-R2 / PB-1A). No se
 * crea fila, no se acknowledgea, no se concede entitlement.
 */
export const SUBSCRIPTION_UNVERIFIABLE_CODE = 'SUBSCRIPTION_UNVERIFIABLE';

// ===========================================================================
// PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1A: identidad de cuenta de
// facturacion.
// ===========================================================================

/**
 * Respuesta de `POST /me/subscription/google-play/billing-context`. El movil
 * la pide UNA vez antes de `launchBillingFlow` y pasa `billingAccountRef` como
 * `obfuscatedAccountId` de Google. `billingAccountRef` es un identificador
 * OPACO, aleatorio y estable por cuenta -- el movil NUNCA lo genera ni lo
 * elige, y el backend NUNCA acepta uno del cliente (el `accountId` sale
 * siempre de la sesion). `.strict()`: cero metadata extra.
 */
export const googlePlayBillingContextResponseSchema = z
  .object({
    billingAccountRef: z.string().min(1),
  })
  .strict();
export type GooglePlayBillingContextResponse = z.infer<typeof googlePlayBillingContextResponseSchema>;

// ===========================================================================
// PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1B: resumen de gestion de
// suscripcion (`GET /me/subscription`).
//
// Datos de la PANTALLA DE GESTION, derivados del backend (`AccountSubscription`
// verificada + entitlement), NUNCA inferidos del estado local de Play. Campos
// CONGELADOS en docs/adr/PREMIUM-V1-LAYER-3-BILLING-ARCHITECTURE.md seccion K.2.
// NUNCA emite: purchaseToken / linkedPurchaseToken / resubscribedFromPurchaseToken
// / obfuscatedAccountId / billingAccountRef / rawSnapshot / el `subscriptionState`
// crudo de Google / order ids / accountId / Firebase UID.
// ===========================================================================

/**
 * Estado de renovacion PUBLICO (ADR K.2) -- proyeccion minima del
 * `SubscriptionState` normalizado, NUNCA el estado crudo del proveedor:
 *   - `renews`        -> ACTIVE (se renueva al final del periodo)
 *   - `cancels`       -> CANCELED con periodo pagado aun vigente (el acceso
 *                        continua hasta `accessUntil`; cancelar la
 *                        auto-renovacion NO es un downgrade inmediato)
 *   - `grace_period`  -> IN_GRACE_PERIOD (fallo de cobro, acceso conservado)
 *   - `on_hold`       -> ON_HOLD (Google ya bloqueo el acceso)
 *   - `none`          -> sin suscripcion / PENDING / PAUSED / terminal
 *                        (EXPIRED/REVOKED/SUPERSEDED) / CANCELED ya vencida
 */
export const subscriptionRenewalStatusSchema = z.enum(['renews', 'cancels', 'grace_period', 'on_hold', 'none']);
export type SubscriptionRenewalStatus = z.infer<typeof subscriptionRenewalStatusSchema>;

/**
 * Respuesta de `GET /me/subscription`. `.strict()`.
 *
 *   - `tier`         -- `FREE` | `PREMIUM`, la MISMA verdad de authorization que
 *                       `GET /me/entitlement` (no se re-deriva aparte).
 *   - `isSubscribed` -- hay una `AccountSubscription` NO TERMINAL (estado
 *                       distinto de EXPIRED/REVOKED/SUPERSEDED). Responde "¿esta
 *                       cuenta tiene un ciclo de vida de Google Play
 *                       suficientemente relevante como para mostrar gestion de
 *                       suscripcion / la advertencia al eliminar la cuenta?".
 *                       NO es sinonimo de `tier === 'PREMIUM'`: una compra
 *                       PENDING o un ON_HOLD son `isSubscribed: true` con
 *                       `tier: 'FREE'`.
 *   - `renewalStatus`-- ver `subscriptionRenewalStatusSchema`.
 *   - `accessUntil`  -- ISO 8601 de `currentPeriodEnd` (`expiryTime`) cuando es
 *                       significativo (suscripcion no terminal con periodo
 *                       conocido); `null` si no aplica. SIEMPRE lo calcula el
 *                       backend, nunca el cliente.
 *   - `paymentIssue` -- `state === IN_GRACE_PERIOD || state === ON_HOLD`
 *                       (ADR K.2). Derivado del estado normalizado del backend,
 *                       nunca de una suposicion del movil.
 *   - `managementUrl`-- deep link SEGURO a la pantalla de suscripciones de
 *                       Google Play (nunca una pagina de pago externa).
 */
export const subscriptionSummaryResponseSchema = z
  .object({
    tier: z.enum(['FREE', 'PREMIUM']),
    isSubscribed: z.boolean(),
    renewalStatus: subscriptionRenewalStatusSchema,
    accessUntil: z.string().datetime().nullable(),
    paymentIssue: z.boolean(),
    managementUrl: z.string().url(),
  })
  .strict();
export type SubscriptionSummaryResponse = z.infer<typeof subscriptionSummaryResponseSchema>;

/**
 * Deep link CONGELADO a la gestion de suscripciones de Google Play (ADR K.2 /
 * seccion J). Es la UNICA URL que `GET /me/subscription` emite y la unica a la
 * que "Gestionar suscripcion" navega -- informativa, NUNCA una pagina de pago.
 */
export const GOOGLE_PLAY_SUBSCRIPTIONS_MANAGEMENT_URL =
  'https://play.google.com/store/account/subscriptions?sku=zetrynd_premium&package=com.zetrynd.app';
