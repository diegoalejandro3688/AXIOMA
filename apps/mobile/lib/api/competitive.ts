import {
  leaderboardPageResponseSchema,
  meCompetitiveProfileResponseSchema,
  competitiveProfileResponseSchema,
  type LeaderboardPageResponse,
  type MeCompetitiveProfileResponse,
  type CompetitiveProfileResponse,
} from '@axioma/contracts';
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

/**
 * Autoconsulta -- Bloque IV, Incremento 5, sub-incremento 5.c. `GET
 * /user/public-profile/me/competitive-profile` (3.b, ya cerrado). 404
 * cuando la cuenta no tiene `public_profile` inicializado todavía --
 * mismo criterio que `getProfile` (`lib/api/user.ts`): la pantalla trata
 * ese 404 como estado informativo, no como error.
 */
export function getMyCompetitiveProfile(): Promise<ApiResult<MeCompetitiveProfileResponse>> {
  return apiRequest('GET', '/user/public-profile/me/competitive-profile', { schema: meCompetitiveProfileResponseSchema });
}

/**
 * Perfil de un tercero -- solo lectura. `username` se recibe YA canónico
 * del backend (fila de ranking, ADR-0018 §2) -- este cliente NUNCA lo
 * normaliza (NFC/minúsculas) por su cuenta, solo lo codifica como
 * segmento de URL (`encodeURIComponent`) para transportarlo con
 * seguridad. 404 uniforme -- PRIVATE/RETIRED/ANONYMIZED/inexistente
 * responden exactamente el mismo cuerpo, este wrapper no distingue el
 * motivo (ni podría: el backend ya lo oculta, ADR-0021 §2/§3).
 */
export function getUserCompetitiveProfile(username: string): Promise<ApiResult<CompetitiveProfileResponse>> {
  return apiRequest('GET', `/user/public-profile/${encodeURIComponent(username)}/competitive-profile`, { schema: competitiveProfileResponseSchema });
}
