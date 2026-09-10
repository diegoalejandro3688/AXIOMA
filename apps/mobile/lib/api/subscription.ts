import { subscriptionSummaryResponseSchema, type SubscriptionSummaryResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrapper tipado sobre `GET /me/subscription` (PREMIUM V1, Capa 3, PB-1B) --
 * respuesta validada con Zod tambien en el cliente. Opera sobre
 * `request.accountId` (AuthGuard); este cliente NUNCA envia un accountId.
 *
 * SOLO LECTURA: datos de la pantalla de gestion + la condicion de la
 * advertencia al eliminar la cuenta. La respuesta es `.strict()` y NUNCA trae
 * `purchaseToken` / `obfuscatedAccountId` / `billingAccountRef` / `rawSnapshot`
 * / el estado crudo de Google -- solo campos normalizados de gestion. Esto NO
 * es aprovisionamiento de compra (eso es `POST .../google-play/billing-context`,
 * que el movil todavia no llama mientras Google Play real siga congelado).
 */
export function getSubscriptionSummary(): Promise<ApiResult<SubscriptionSummaryResponse>> {
  return apiRequest('GET', '/me/subscription', { schema: subscriptionSummaryResponseSchema });
}
