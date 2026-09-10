import {
  googlePlayBillingContextResponseSchema,
  subscriptionReconcileResponseSchema,
  subscriptionSummaryResponseSchema,
  type GooglePlayBillingContextResponse,
  type SubscriptionReconcileResponse,
  type SubscriptionSummaryResponse,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrapper tipado sobre `GET /me/subscription` (PREMIUM V1, Capa 3, PB-1B) --
 * respuesta validada con Zod tambien en el cliente. Opera sobre
 * `request.accountId` (AuthGuard); este cliente NUNCA envia un accountId.
 *
 * SOLO LECTURA: datos de la pantalla de gestion + la condicion de la
 * advertencia al eliminar la cuenta. La respuesta es `.strict()` y NUNCA trae
 * `purchaseToken` / `obfuscatedAccountId` / `billingAccountRef` / `rawSnapshot`
 * / el estado crudo de Google -- solo campos normalizados de gestion.
 */
export function getSubscriptionSummary(): Promise<ApiResult<SubscriptionSummaryResponse>> {
  return apiRequest('GET', '/me/subscription', { schema: subscriptionSummaryResponseSchema });
}

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-2B.
 *
 * `POST /me/subscription/google-play/billing-context` (PB-1A). El movil lo
 * llama UNA vez ANTES de `launchBillingFlow` para obtener el
 * `billingAccountRef` -- el `obfuscatedAccountId` opaco y estable de la cuenta
 * autenticada, emitido por el BACKEND. El movil NUNCA lo genera ni lo cachea
 * entre cuentas; SIN body (el `accountId` sale siempre de la sesion). Es POST
 * porque la primera llamada aprovisiona (escribe `Account.obfuscatedAccountId`).
 * La respuesta es `.strict()`: solo `{ billingAccountRef }`.
 */
export function postBillingContext(): Promise<ApiResult<GooglePlayBillingContextResponse>> {
  return apiRequest('POST', '/me/subscription/google-play/billing-context', {
    schema: googlePlayBillingContextResponseSchema,
  });
}

/**
 * `POST /me/subscription/google-play/reconcile` (C3.2). El movil envia
 * EXCLUSIVAMENTE el `purchaseToken` opaco de Google Play (tras una compra o un
 * restore). El backend lo verifica con `purchases.subscriptionsv2.get`,
 * persiste `AccountSubscription`, hace el acknowledge con Google si corresponde
 * (regla pura `shouldAcknowledgeSubscription`), y deja que `GET /me/entitlement`
 * derive el tier. El movil NUNCA envia `accountId` / `productId` / `tier` /
 * estado -- el body es `.strict()` `{ purchaseToken }`.
 *
 * Respuesta 200: `{ status: 'verified' | 'pending' | 'canceled' }`.
 * Errores relevantes (via `ApiResult<'http'>` con `code`):
 *   - 409 `SUBSCRIPTION_ACCOUNT_MISMATCH` -- el token pertenece a otra cuenta;
 *   - 422 `SUBSCRIPTION_UNVERIFIABLE` -- no se puede atribuir (sin ref externa /
 *     sin `billingAccountRef`);
 *   - 400 `SUBSCRIPTION_INVALID` -- la compra no corresponde a ZETRYND Premium;
 *   - 503 -- la compra se registro pero aun no se pudo confirmar (reintentable);
 *   - 5xx / network -- transitorio, reintentable.
 *
 * `verified` NO significa "PREMIUM" -- significa "token verificado y
 * reconciliado". La verdad de authorization es SIEMPRE `GET /me/entitlement`.
 */
export function postGooglePlayReconcile(
  purchaseToken: string,
): Promise<ApiResult<SubscriptionReconcileResponse>> {
  return apiRequest('POST', '/me/subscription/google-play/reconcile', {
    body: { purchaseToken },
    schema: subscriptionReconcileResponseSchema,
  });
}
