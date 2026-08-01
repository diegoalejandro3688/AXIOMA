import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Autenticación SIMULADA, solo para desarrollo -- ver ADR-0009. Vive
 * enteramente en memoria (`useState`): reiniciar la app siempre vuelve a
 * 'unauthenticated', nunca sobrevive como si fuera una sesión real. Nada de
 * este estado se persiste en AsyncStorage ni en ningún otro almacenamiento.
 *
 * El contrato (`status`, `login`, `logout`) es el mismo que tendrá el
 * proveedor real respaldado por Firebase cuando se implemente -- el resto
 * del árbol de navegación no necesita cambiar cuando eso ocurra.
 */
export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // Simula una comprobación asíncrona (ej. validar un token real) para
    // ejercitar el estado 'loading' de la máquina de estados incluso sin
    // I/O real todavía.
    const timeout = setTimeout(() => setStatus('unauthenticated'), 0);
    return () => clearTimeout(timeout);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      login: () => setStatus('authenticated'),
      logout: () => setStatus('unauthenticated'),
    }),
    [status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de MockAuthProvider');
  return ctx;
}
