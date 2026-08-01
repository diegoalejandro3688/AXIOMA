import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { localFlags } from '../storage/local-flags';

export type OnboardingStatus = 'loading' | 'incomplete' | 'complete';

interface OnboardingContextValue {
  status: OnboardingStatus;
  complete: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/**
 * Único estado que se persiste localmente (ver ADR-0009) -- no sensible,
 * independiente de la autenticación. Lee `local-flags` al montar; nunca
 * bloquea el arranque si falla la lectura (cae a 'incomplete').
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OnboardingStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    localFlags.getHasCompletedOnboarding().then((done) => {
      if (!cancelled) setStatus(done ? 'complete' : 'incomplete');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      status,
      complete: async () => {
        await localFlags.setHasCompletedOnboarding(true);
        setStatus('complete');
      },
    }),
    [status],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding debe usarse dentro de OnboardingProvider');
  return ctx;
}
