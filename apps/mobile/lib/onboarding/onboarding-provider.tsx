import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { localFlags } from '../storage/local-flags';
import { useAuth } from '../auth/auth-provider';

export type OnboardingStatus = 'loading' | 'incomplete' | 'complete';

interface OnboardingContextValue {
  status: OnboardingStatus;
  complete: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

interface ResolvedState {
  /** accountId para el que `resolvedStatus` es válido -- `null` = todavía nada resuelto. */
  resolvedForAccountId: string | null;
  resolvedStatus: 'incomplete' | 'complete';
}

/**
 * VC4 MICROBLOQUE 10.1 -- completion SCOPED POR CUENTA, con el status
 * derivado de forma PURAMENTE SÍNCRONA en cada render (nunca del timing de
 * un `useEffect`).
 *
 * Root cause corregido aquí (Microbloque 10.1 §3/§4): `useEffect` corre
 * SIEMPRE después del commit/render, nunca antes. La versión de
 * Microbloque 10 guardaba el status resuelto directamente en
 * `useState<OnboardingStatus>` y reseteaba a `'loading'` DENTRO del
 * efecto -- eso deja al menos un render real (el que consume el
 * `accountId` nuevo, antes de que el efecto llegue a ejecutarse) donde
 * `accountId` ya es B pero `status` en React state todavía vale
 * `'complete'`, resuelto para A. Ese render intermedio SÍ es observable
 * por `_layout.tsx` (su guard lee `onboarding.status` en cada render, no
 * sólo tras estabilizarse).
 *
 * Fix: el estado guardado (`ResolvedState`) SIEMPRE incluye para QUÉ
 * `accountId` es válido (`resolvedForAccountId`). `effectiveStatus` se
 * calcula en el CUERPO del componente (no en el efecto): si
 * `resolvedForAccountId !== accountId` (incluye null->B, A->B, A->null),
 * el resultado es SIEMPRE `'loading'`, sin importar qué status antiguo
 * siga en `resolvedStatus` -- imposible de observar un status que no
 * pertenece al `accountId` del render actual, en NINGÚN render,
 * independientemente de si el efecto ya corrió.
 *
 * Mismo accountId (A -> A, ej. refresh de token): `useEffect([accountId])`
 * ni siquiera se re-dispara (React compara por valor, mismo string), y
 * `resolvedForAccountId === accountId` ya es cierto -- cero flash, cero
 * reset innecesario (§15).
 *
 * REGRESIÓN CORREGIDA AQUÍ (QA física post-10.1): el supuesto anterior de
 * que "`_layout.tsx` nunca deja alcanzar `onboarding` sin sesión de todos
 * modos" era FALSO -- su guard global es
 * `auth.status === 'loading' || onboarding.status === 'loading'`, un OR
 * plano que bloquea TODO el navegador (incluida la ruta `(auth)`/Login),
 * no sólo la rama autenticada. Con `accountId === null` devolviendo
 * `'loading'` incondicionalmente, y sin ningún `useEffect` que corra para
 * `accountId === null` (para resolverlo a otra cosa), el logout dejaba a
 * `onboarding.status` en `'loading'` PARA SIEMPRE -- spinner global
 * permanente, Login nunca alcanzable. Esto es el blocker exacto reportado.
 *
 * Fix: `onboarding` sólo tiene sentido/aplica bajo una cuenta autenticada
 * (`"no authenticated account"` !== `"authenticated account not yet
 * resolved"`, ver Microbloque 10.1 §3). Sin `accountId`, no hay ninguna
 * cuenta para la que resolver nada -- `effectiveStatus` es `'complete'`
 * (NO-BLOQUEANTE; no una afirmación literal de "onboarding completado").
 * `_layout.tsx` sigue siendo quien decide la ruta real vía `isAuthenticated`
 * (la rama `(auth)` se activa por `!isAuthenticated`, independientemente
 * del valor de `isOnboardingComplete`) -- este valor sólo existe para NO
 * quedar atascado en el loader global mientras no hay sesión.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { accountId } = useAuth();
  const [resolved, setResolved] = useState<ResolvedState>({ resolvedForAccountId: null, resolvedStatus: 'incomplete' });

  const effectiveStatus: OnboardingStatus = !accountId
    ? 'complete' // sin cuenta -- no aplica onboarding, nunca debe bloquear el loader global (ver regresión arriba).
    : resolved.resolvedForAccountId === accountId
      ? resolved.resolvedStatus
      : 'loading';

  useEffect(() => {
    if (!accountId) return;

    let cancelled = false;
    localFlags.getHasCompletedOnboarding(accountId).then((done) => {
      if (!cancelled) setResolved({ resolvedForAccountId: accountId, resolvedStatus: done ? 'complete' : 'incomplete' });
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      status: effectiveStatus,
      complete: async () => {
        if (!accountId) return;
        await localFlags.setHasCompletedOnboarding(accountId, true);
        setResolved({ resolvedForAccountId: accountId, resolvedStatus: 'complete' });
      },
    }),
    [effectiveStatus, accountId],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding debe usarse dentro de OnboardingProvider');
  return ctx;
}
