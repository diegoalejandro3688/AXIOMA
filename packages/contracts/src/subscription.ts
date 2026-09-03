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
 * `canceled` = la compra PENDIENTE se cancelo antes de completarse
 * (`SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED`) y no habia una suscripcion
 * previa a la que volver -- resultado neto: nada. NO es un exito de compra; el
 * movil NO debe interpretarlo como tal. (Si SI habia una suscripcion existente
 * linkeada, el backend la reconcilia y responde con SU estado -- normalmente
 * `verified`.) La autoridad de authorization sigue siendo `GET /me/entitlement`.
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
