import {
  getLeagueParticipationResponseSchema,
  postLeagueParticipationResponseSchema,
  type GetLeagueParticipationResponse,
  type PostLeagueParticipationResponse,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrappers tipados sobre el Incremento 5, sub-incremento 5.a
 * (Enrolamiento real de liga) -- ambos endpoints operan sobre
 * `request.accountId` (AuthGuard) en el backend, este cliente nunca envía
 * ni recibe un accountId explícito. `GET` es lectura pura -- nunca se debe
 * llamar `joinLeague()` como efecto secundario de leer el estado (ver
 * `lib/league/participation-view.ts`, que decide cuándo mostrar la acción,
 * y el hub, que es el único lugar que invoca `joinLeague()`, siempre desde
 * un `onPress` explícito).
 */

export function getLeagueParticipation(): Promise<ApiResult<GetLeagueParticipationResponse>> {
  return apiRequest('GET', '/gamification/me/league/participation', { schema: getLeagueParticipationResponseSchema });
}

/** Acción idempotente -- segura de reintentar (doble-toque, reintento de red), nunca crea una segunda participación. */
export function joinLeague(): Promise<ApiResult<PostLeagueParticipationResponse>> {
  return apiRequest('POST', '/gamification/me/league/participation', { body: {}, schema: postLeagueParticipationResponseSchema });
}
