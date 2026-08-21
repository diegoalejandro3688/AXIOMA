import { publicProfileResponseSchema, type PublicProfileResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * `POST /user/public-profile` -- reclamo perezoso de username (ADR-0018).
 * `request.accountId` (AuthGuard) decide la cuenta, nunca el cliente.
 * 201 si se creó, 200 si la cuenta ya tenía perfil (idempotente para el
 * mismo accountId); 409 si el username está en uso/reservado -- el cliente
 * no reinterpreta esos casos, solo reenvía `ApiResult` tal cual.
 */
export function claimPublicProfile(username: string): Promise<ApiResult<PublicProfileResponse>> {
  return apiRequest('POST', '/user/public-profile', { body: { username }, schema: publicProfileResponseSchema });
}

/**
 * `GET /user/public-profile` (own) -- única fuente real de
 * `visibilityStatus` ('PRIVATE'/'VISIBLE'). El agregador de
 * `GET /user/me/advanced-profile` (`meCompetitiveProfileResponseSchema`) NO
 * expone este campo -- se consulta aparte en vez de asumirlo, nunca se
 * infiere del estado local.
 */
export function getMyPublicProfile(): Promise<ApiResult<PublicProfileResponse>> {
  return apiRequest('GET', '/user/public-profile', { schema: publicProfileResponseSchema });
}

/**
 * `PATCH /user/public-profile/visibility` -- opt-in/opt-out explícito.
 * El default `PRIVATE` al crear el perfil NO cambia aquí ni en ningún otro
 * punto del cliente -- este wrapper solo traduce la acción del usuario al
 * endpoint real, nunca decide el valor por su cuenta.
 */
export function setPublicProfileVisibility(visible: boolean): Promise<ApiResult<PublicProfileResponse>> {
  return apiRequest('PATCH', '/user/public-profile/visibility', { body: { visible }, schema: publicProfileResponseSchema });
}
