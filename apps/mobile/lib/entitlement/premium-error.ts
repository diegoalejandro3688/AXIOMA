import { PREMIUM_REQUIRED_CODE } from '@axioma/contracts';
import type { ApiResult } from '../api/client';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.0.
 *
 * Unico helper para reconocer el `403` de contenido bloqueado por Premium.
 * SOLO `403` **con** `error.code === 'PREMIUM_REQUIRED'` cuenta -- cualquier
 * otro `403` (o el mismo code con otro status) es un error normal.
 *
 * NO es un interceptor global: cada superficie premium-relevante llama a este
 * helper EXPLICITAMENTE en su rama de error, y el `origin` del paywall lo
 * aporta esa superficie (nunca el backend, cuyo body es `{ code, message }`
 * sin `origin`). `lib/api/client.ts` ya expone `code` -- no se modifica.
 */
export function isPremiumRequiredError(result: ApiResult<unknown>): boolean {
  return (
    result.ok === false &&
    result.kind === 'http' &&
    result.status === 403 &&
    result.code === PREMIUM_REQUIRED_CODE
  );
}
