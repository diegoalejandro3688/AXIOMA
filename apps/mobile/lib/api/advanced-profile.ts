import { myAdvancedProfileResponseSchema, type MyAdvancedProfileResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * LEF Bloque V, Incremento 5 (docs/adr/LEF-BLOCK-V-DEFINITION.md §13) --
 * vista consolidada de perfil propio. Fuente ÚNICA para encabezado
 * (identidad + competitivo propio), resumen académico e historial
 * competitivo en la superficie móvil (Incremento 8) -- evita volver a
 * pedir por separado lo que este agregador ya trae, mismo criterio que
 * `AdvancedProfileController` en el backend (composición, sin duplicar
 * la fuente de cada sección).
 */
export function getMyAdvancedProfile(): Promise<ApiResult<MyAdvancedProfileResponse>> {
  return apiRequest('GET', '/user/me/advanced-profile', { schema: myAdvancedProfileResponseSchema });
}
