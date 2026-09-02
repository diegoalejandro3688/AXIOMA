import type { PremiumTier, AccountEntitlementResponse } from '@axioma/contracts';
import type { ApiResult } from '../api/client';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.0.
 *
 * Modelo de estado del entitlement de la cuenta en mobile + su transicion
 * pura (RN-free, testable con `tsx` -- mismo criterio que
 * `lib/ai/conversation-availability.ts` / `lib/exams/attempt-state.ts`). El
 * `EntitlementProvider` es una cascara delgada de React sobre
 * `nextEntitlementState`.
 *
 * Reglas de producto congeladas (Architecture v2):
 *   - `EntitlementTier` se DERIVA del contrato compartido (`PremiumTier` de
 *     `@axioma/contracts`), nunca se redeclara `'FREE' | 'PREMIUM'` a mano.
 *   - `isFree` / `isPremium` son `true` UNICAMENTE bajo `status: 'ready'`.
 *     `loading` y `error` NO equivalen a FREE.
 *   - un error inicial (sin tier confirmado previo) es un estado TECNICO
 *     (`'error'`), nunca una afirmacion de que la cuenta es FREE.
 *   - un fallo de `refresh()` teniendo un tier confirmado previo CONSERVA ese
 *     tier (FREE o PREMIUM) -- no se revoca acceso por un blip de red.
 *   - el tier NUNCA se persiste (ni secure-store ni AsyncStorage): fuente de
 *     verdad = backend en runtime.
 *   - un `401` NO llega a este modelo: lo intercepta el unauthorized handler
 *     global (`lib/api/client.ts`), que resetea la sesion y hace que el
 *     provider vuelva a `'loading'`.
 */
export type EntitlementTier = PremiumTier;

/**
 * Punto de entrada de UX que abrio el paywall -- decidido por la superficie
 * MOBILE que realizo la accion bloqueada, nunca por el backend (cuyo `403`
 * es `{ code, message }` sin `origin`). Capa 2, C2.1.
 */
export type PaywallOrigin = 'unit' | 'resources' | 'exams' | 'ai_quota';

export type EntitlementState =
  | { status: 'loading' }
  | { status: 'ready'; tier: EntitlementTier }
  | { status: 'error' };

export interface EntitlementContextValue {
  state: EntitlementState;
  /** true SOLO si `state.status === 'ready' && tier === 'PREMIUM'`. */
  isPremium: boolean;
  /** true SOLO si `state.status === 'ready' && tier === 'FREE'`. */
  isFree: boolean;
  /**
   * Re-consulta `GET /me/entitlement`. State-driven: la superficie que
   * necesite recargar contenido tras un `error` llama a `refresh()` y su
   * propio `load()` se dispara cuando el estado vuelve a `'ready'` -- nunca
   * `refresh(); load()` concurrente. Punto de integracion de
   * `purchase()`/`restore()` de Capa 3.
   */
  refresh: () => Promise<void>;
}

/**
 * Deriva el proximo `EntitlementState` tras una respuesta de
 * `GET /me/entitlement`.
 *
 *   exito                         -> { status: 'ready', tier }
 *   fallo CON tier confirmado      -> conserva ese estado (stale interno),
 *     previo (`prev.status==='ready'`)   NUNCA pasa a 'error' ni a FREE
 *   fallo SIN tier previo          -> { status: 'error' }  (tecnico)
 */
export function nextEntitlementState(
  prev: EntitlementState,
  result: ApiResult<AccountEntitlementResponse>,
): EntitlementState {
  if (result.ok) return { status: 'ready', tier: result.data.tier };
  if (prev.status === 'ready') return prev;
  return { status: 'error' };
}
