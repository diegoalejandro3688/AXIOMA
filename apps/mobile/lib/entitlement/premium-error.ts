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

/**
 * Variante para el `SubmitResponseOutcome` de PROGRESS (`lib/api/progress.ts`)
 * -- ese wrapper aplana el `ApiResult` a `{ kind:'error', status, code }`, asi
 * que `isPremiumRequiredError` (que espera un `ApiResult`) no aplica. Mismo
 * criterio: SOLO `403` + `code === 'PREMIUM_REQUIRED'`.
 *
 * Caso real: una cuenta PREMIUM abre un ejercicio de U3+, hace downgrade / se
 * le vence la suscripcion con la pantalla abierta, y responde una pregunta
 * nueva -> C1.4 lo rechaza server-side con `403 PREMIUM_REQUIRED`. `ejercicio.tsx`
 * usa esto para NO tratarlo como exito y pasar a `<PremiumLockedScreen>`.
 */
export function isPremiumRequiredOutcome(outcome: { kind: string; status?: number; code?: string }): boolean {
  return outcome.kind === 'error' && outcome.status === 403 && outcome.code === PREMIUM_REQUIRED_CODE;
}
