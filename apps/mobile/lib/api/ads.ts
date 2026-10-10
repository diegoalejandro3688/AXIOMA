import { adsConfigResponseSchema, type AdsConfigResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrapper tipado sobre `GET /me/ads-config` (ADS V1, ADS-1B) -- respuesta
 * validada con el schema `.strict()` tambien en el cliente: una respuesta
 * malformada, un timeout o un error de red llegan como `ok: false`, y el
 * llamador (`AdsProvider`) los trata como TODO apagado. Opera sobre
 * `request.accountId` (AuthGuard); este cliente NUNCA envia un accountId.
 */
export function getAdsConfig(): Promise<ApiResult<AdsConfigResponse>> {
  return apiRequest('GET', '/me/ads-config', { schema: adsConfigResponseSchema });
}
