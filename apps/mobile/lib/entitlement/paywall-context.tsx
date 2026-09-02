import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/auth-provider';
import { PremiumPaywall } from '../../components/premium/premium-paywall';
import type { PaywallOrigin } from './types';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.1.
 *
 * Host global del paywall. `usePaywall().open(origin)` desde cualquier
 * superficie (Estudio / Ensayos / IA en C2.2-C2.4); `<PremiumPaywall>` se
 * renderiza UNA sola vez aqui -- ninguna pantalla lo importa. Asi la
 * superficie IA solo importa `usePaywall` de `lib/entitlement/` (ruta/nombre
 * sin subcadenas prohibidas por `verify:ai-mobile-gate`).
 *
 * Guardrail: en logout o cambio de `accountId`, el paywall se CIERRA y su
 * `origin` se limpia -- un paywall abierto nunca sobrevive a un cambio de
 * cuenta.
 *
 * NO conoce el tier (eso es `EntitlementProvider`): solo abre/cierra un
 * `Dialog`. NO route nueva, NO bottom sheet, NO compra.
 */
interface PaywallContextValue {
  open: (origin: PaywallOrigin) => void;
  close: () => void;
}

const PaywallContext = createContext<PaywallContextValue | null>(null);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [origin, setOrigin] = useState<PaywallOrigin | null>(null);

  const open = useCallback((next: PaywallOrigin) => setOrigin(next), []);
  const close = useCallback(() => setOrigin(null), []);

  // Cerrar y limpiar `origin` en logout o cambio de cuenta. `setOrigin` con
  // update funcional que devuelve el mismo valor cuando ya es `null` -> React
  // no re-renderiza si no hay nada abierto.
  const accountIdRef = useRef<string | null>(auth.accountId);
  useEffect(() => {
    const accountChanged = auth.accountId !== accountIdRef.current;
    accountIdRef.current = auth.accountId;
    if (auth.status !== 'authenticated' || accountChanged) {
      setOrigin((prev) => (prev === null ? prev : null));
    }
  }, [auth.status, auth.accountId]);

  const value = useMemo<PaywallContextValue>(() => ({ open, close }), [open, close]);

  return (
    <PaywallContext.Provider value={value}>
      {children}
      <PremiumPaywall origin={origin} onRequestClose={close} />
    </PaywallContext.Provider>
  );
}

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error('usePaywall debe usarse dentro de PaywallProvider');
  return ctx;
}
