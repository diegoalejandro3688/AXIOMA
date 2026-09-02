import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth/auth-provider';
import { getEntitlement } from '../api/entitlement';
import { nextEntitlementState, type EntitlementContextValue, type EntitlementState, type EntitlementTier } from './types';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.0.
 *
 * Fuente de verdad de authorization en mobile. Cascara delgada de React sobre
 * `nextEntitlementState` (la transicion pura vive en `./types.ts`).
 *
 * Ciclo de vida (Architecture v2):
 *   sesion autenticada -> GET /me/entitlement -> loading | ready(tier) | error
 *   - carga al autenticarse y al CAMBIAR de `accountId` (login con otra cuenta);
 *   - refresca en `AppState -> 'active'` (mismo patron que `AuthProvider`);
 *   - `refresh()` para la futura integracion de compra/restore de Capa 3;
 *   - deduplicacion: una request en curso por generacion (no dispara N);
 *   - NO persiste el tier (fuente de verdad = backend en runtime);
 *   - un `401` no se maneja aqui: el unauthorized handler global de
 *     `lib/api/client.ts` resetea la sesion -> `auth.status` cambia -> este
 *     provider vuelve a `'loading'`.
 *
 * Proteccion de carrera (`generation` + `accountId`): cada request captura la
 * generacion y la cuenta vigentes; una respuesta cuya generacion cambio (por
 * logout, cambio de cuenta, o una request mas nueva) o cuya cuenta ya no es
 * la actual se DESCARTA -- nunca se aplica el entitlement de una sesion
 * anterior. Un fallo de `refresh()` con un tier ya confirmado conserva ese
 * tier (stale interno); solo el fallo inicial produce `'error'`.
 */
const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<EntitlementState>({ status: 'loading' });

  /** Se incrementa en cada cambio de sesion (`auth.status`/`accountId`) e invalida cualquier request en vuelo. */
  const generationRef = useRef(0);
  /** Cuenta a la que pertenece el estado actual -- las respuestas se descartan si no coincide. */
  const accountIdRef = useRef<string | null>(auth.accountId);
  /** Promise en curso + la generacion a la que pertenece (deduplicacion). */
  const inFlightRef = useRef<Promise<void> | null>(null);
  const inFlightGenRef = useRef<number>(-1);
  /**
   * Ultimo tier CONFIRMADO por el backend en esta sesion. Un `refresh()`
   * fallido con esto presente conserva el tier (stale) en vez de degradar.
   * Se limpia en cada cambio de sesion. Nunca se persiste.
   */
  const lastConfirmedTierRef = useRef<EntitlementTier | null>(null);

  const runFetch = useCallback(async (): Promise<void> => {
    if (auth.status !== 'authenticated' || !auth.accountId) return;

    const gen = generationRef.current;
    if (inFlightRef.current && inFlightGenRef.current === gen) {
      await inFlightRef.current; // deduplicacion: reutiliza la request de esta misma generacion
      return;
    }

    const account = auth.accountId;
    inFlightGenRef.current = gen;
    const promise = (async () => {
      const result = await getEntitlement();
      // Descartar respuestas obsoletas: generacion vieja (logout / cambio de
      // cuenta / request mas nueva) o cuenta que ya no es la actual.
      if (gen !== generationRef.current || account !== accountIdRef.current) return;
      if (result.ok) lastConfirmedTierRef.current = result.data.tier;
      setState((prev) => nextEntitlementState(prev, result));
    })().finally(() => {
      if (inFlightGenRef.current === gen) inFlightRef.current = null;
    });

    inFlightRef.current = promise;
    await promise;
  }, [auth.status, auth.accountId]);

  const refresh = useCallback(async (): Promise<void> => {
    await runFetch();
  }, [runFetch]);

  // Sesion + carga inicial. Considera `auth.accountId`, no solo `auth.status`:
  // login con otra cuenta re-hidrata aunque no pase por `unauthenticated`.
  useEffect(() => {
    generationRef.current += 1; // invalida cualquier request en vuelo de la sesion anterior
    inFlightRef.current = null;
    lastConfirmedTierRef.current = null;
    accountIdRef.current = auth.accountId;

    if (auth.status !== 'authenticated' || !auth.accountId) {
      setState({ status: 'loading' });
      return;
    }
    setState({ status: 'loading' });
    void runFetch();
  }, [auth.status, auth.accountId, runFetch]);

  // Refresco al volver a primer plano -- solo con sesion (mismo criterio que `AuthProvider`).
  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.accountId) return;
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') void runFetch();
    });
    return () => subscription.remove();
  }, [auth.status, auth.accountId, runFetch]);

  const value = useMemo<EntitlementContextValue>(
    () => ({
      state,
      isPremium: state.status === 'ready' && state.tier === 'PREMIUM',
      isFree: state.status === 'ready' && state.tier === 'FREE',
      refresh,
    }),
    [state, refresh],
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement(): EntitlementContextValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useEntitlement debe usarse dentro de EntitlementProvider');
  return ctx;
}
