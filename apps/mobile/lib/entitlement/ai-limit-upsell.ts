import type { EntitlementState } from './types';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.4.
 *
 * Predicado PURO (RN-free, testable con `tsx`) que decide si el upsell
 * opcional del Tutor IA debe mostrarse. Vive fuera de la superficie escaneada
 * por `verify:ai-mobile-gate.ts`.
 *
 * `blocked` = estado de bloqueo del Tutor YA derivado del servidor por la
 * pantalla (`resolveSendAvailability`: cupo diario O limite de turnos). Este
 * modulo NO detecta cuota ni turnos y NO conoce ningun numero de plan.
 *
 * El upsell comercial aparece SOLO con:
 *   - entitlement resuelto (`status === 'ready'`), y
 *   - tier confirmado `FREE`, y
 *   - `blocked` verdadero.
 *
 * PREMIUM (que tiene sus propios limites V1), `loading` y `error` NUNCA
 * muestran upsell -- nunca se infiere FREE.
 */
export function shouldShowAiLimitUpsell(state: EntitlementState, blocked: boolean): boolean {
  return blocked && state.status === 'ready' && state.tier === 'FREE';
}
