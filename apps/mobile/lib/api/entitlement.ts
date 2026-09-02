import { accountEntitlementResponseSchema, type AccountEntitlementResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrapper tipado sobre `GET /me/entitlement` (PREMIUM V1, Capa 1) -- respuesta
 * validada con Zod tambien en el cliente. Opera sobre `request.accountId`
 * (AuthGuard); este cliente NUNCA envia un accountId.
 *
 * Proyeccion MINIMA y `.strict()`: la respuesta es EXCLUSIVAMENTE `{ tier }`.
 * NO trae precio, ni estado de suscripcion, ni fechas -- ese contrato quedo
 * congelado en Capa 1 y `verify:premium-contract-gate` lo protege.
 *
 * NO importa `lib/entitlement/pricing.ts` ni ninguna nocion de precio: el
 * precio es un string de display temporal de Capa 2, jamas viaja por la API.
 */
export function getEntitlement(): Promise<ApiResult<AccountEntitlementResponse>> {
  return apiRequest('GET', '/me/entitlement', { schema: accountEntitlementResponseSchema });
}
