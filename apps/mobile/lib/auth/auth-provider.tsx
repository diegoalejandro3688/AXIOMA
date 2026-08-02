import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { createIdentityClient } from './identity-client-factory';
import { loadSession, saveSession, clearSession } from './session-storage';
import { setUnauthorizedHandler } from '../api/client';
import { createSession, getMe, logout as logoutRequest } from '../api/auth';
import { syncPendingOperations } from '../offline/sync-worker';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';
export type AuthActionResult = { ok: true } | { ok: false; message: string };

interface AuthContextValue {
  status: AuthStatus;
  accountId: string | null;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (email: string, password: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Autenticación real -- ver ADR-0013 (reemplaza `MockAuthProvider`, ADR-0009).
 * Mismo contrato de estados (`loading|unauthenticated|authenticated`) que
 * `MockAuthProvider` tenía: `app/_layout.tsx`/`Stack.Protected` no cambian.
 *
 * Restaura la sesión al abrir la app (SecureStore -> GET /auth/me) y se
 * suscribe al manejador global de 401 del cliente de API -- cualquier 401,
 * en cualquier pantalla, limpia credenciales y vuelve a `unauthenticated`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [accountId, setAccountId] = useState<string | null>(null);
  const identityClient = useRef(createIdentityClient()).current;

  useEffect(() => {
    const handleUnauthorized = () => {
      void clearSession();
      setAccountId(null);
      setStatus('unauthenticated');
    };
    setUnauthorizedHandler(handleUnauthorized);

    (async () => {
      const session = await loadSession();
      if (!session) {
        setStatus('unauthenticated');
        return;
      }
      const me = await getMe();
      if (me.ok) {
        setAccountId(me.data.accountId);
        setStatus('authenticated');
      } else {
        // Sesión guardada pero inválida (401) o inalcanzable (red) -- por
        // seguridad se trata igual: sin sesión confirmada, no autenticado.
        // El manejador de 401 ya limpia el storage cuando aplica; para el
        // caso de red, se limpia aquí también para no quedar en un estado
        // ambiguo (ver ADR-0013, punto de gate 5).
        await clearSession();
        setAccountId(null);
        setStatus('unauthenticated');
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, []);

  // Disparador "AppState -> active" del worker de sincronización (ADR-0014,
  // punto 5) -- solo mientras hay sesión (sin sesión, el intento fallaría
  // con 401 sin motivo). Corre también una vez al autenticarse, cubriendo
  // el caso "quedaron operaciones pendientes de una sesión anterior".
  useEffect(() => {
    if (status !== 'authenticated') return;

    void syncPendingOperations();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void syncPendingOperations();
    });
    return () => subscription.remove();
  }, [status]);

  async function establishSession(idToken: string): Promise<AuthActionResult> {
    const sessionResult = await createSession(idToken);
    if (!sessionResult.ok) {
      return {
        ok: false,
        message: sessionResult.kind === 'network' ? 'No se pudo conectar con el servidor.' : sessionResult.message,
      };
    }
    await saveSession({ idToken, sessionId: sessionResult.data.sessionId });
    setAccountId(sessionResult.data.accountId);
    setStatus('authenticated');
    return { ok: true };
  }

  async function login(email: string, password: string): Promise<AuthActionResult> {
    try {
      const { idToken } = await identityClient.signIn(email, password);
      return await establishSession(idToken);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'No se pudo iniciar sesión.' };
    }
  }

  async function register(email: string, password: string): Promise<AuthActionResult> {
    try {
      const { idToken } = await identityClient.signUp(email, password);
      return await establishSession(idToken);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'No se pudo crear la cuenta.' };
    }
  }

  async function logout(): Promise<void> {
    await logoutRequest(); // best-effort -- apiRequest nunca lanza, un fallo de red no bloquea el logout local.
    await identityClient.signOut().catch(() => {});
    await clearSession();
    setAccountId(null);
    setStatus('unauthenticated');
  }

  const value = useMemo<AuthContextValue>(() => ({ status, accountId, login, register, logout }), [status, accountId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
