import { apiRequest, type ApiResult } from './client';

/**
 * STABILIZATION-B -- primer call site móvil de `POST /privacy/account-deletion`
 * (backend ya existente, sin cambios). 202 sin cuerpo: crea una SOLICITUD de
 * eliminación (barrido asíncrono de hasta 30 días), no borra la cuenta al
 * instante -- la copia de la UI debe reflejar esto exactamente.
 */
export function requestAccountDeletion(): Promise<ApiResult<void>> {
  return apiRequest('POST', '/privacy/account-deletion');
}
