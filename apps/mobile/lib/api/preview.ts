import { competitiveProfileResponseSchema, type CompetitiveProfileResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * LEF Bloque V, Incremento 7 (docs/adr/LEF-BLOCK-V-DEFINITION.md §15) --
 * vista previa pública fiel. `GET /user/public-profile/me/preview` reutiliza
 * en el backend el MISMO camino de código que un tercero real (nunca la
 * autoconsulta privilegiada) -- por eso la respuesta usa exactamente
 * `competitiveProfileResponseSchema`, el mismo contrato que
 * `getUserCompetitiveProfile` (perfil de un tercero), nunca la forma `me`
 * con `lifecycleStatus`. Un 404 aquí es la representación REAL de lo que
 * vería un tercero (perfil PRIVATE o no presentable) -- este cliente no lo
 * distingue del 404 de un username inexistente, mismo criterio que
 * `getUserCompetitiveProfile`.
 */
export function getMyProfilePreview(): Promise<ApiResult<CompetitiveProfileResponse>> {
  return apiRequest('GET', '/user/public-profile/me/preview', { schema: competitiveProfileResponseSchema });
}
