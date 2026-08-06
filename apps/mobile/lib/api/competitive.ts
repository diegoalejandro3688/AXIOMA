import { leaderboardPageResponseSchema, type LeaderboardPageResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrapper tipado sobre el Incremento 3, sub-incremento 3.c (ranking con
 * redacción, ya cerrado) -- ver docs/adr/0021-perfil-competitivo-cross-cuenta.md.
 * `GET /user/public-profile/me/leaderboard` opera sobre `request.accountId`
 * (AuthGuard), este cliente nunca envía un accountId explícito.
 *
 * `cursor` es OPAQUE (ver `leaderboard-cursor.ts` en el backend) -- se pasa
 * tal cual como `?cursor=`, nunca decodificado ni inspeccionado de este
 * lado. Sin `cursor`, el backend sirve la primera página.
 */
export function getLeaderboardPage(cursor?: string): Promise<ApiResult<LeaderboardPageResponse>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiRequest('GET', `/user/public-profile/me/leaderboard${query}`, { schema: leaderboardPageResponseSchema });
}
