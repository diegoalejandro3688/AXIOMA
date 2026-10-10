import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { createIdentityClient } from './identity-client-factory';
import { loadSession, saveSession, clearSession } from './session-storage';
import { setUnauthorizedHandler } from '../api/client';
import { createSession, getMe, logout as logoutRequest } from '../api/auth';
import { syncPendingOperations } from '../offline/sync-worker';
import { bindInstantXpAccount } from '../progress/instant-xp-store';
import { bindPendingLpAccount } from '../league/pending-lp-store';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';
export type AuthActionResult = { ok: true } | { ok: false; message: string };

interface AuthContextValue {
  status: AuthStatus;
  accountId: string | null;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (email: string, password: string) => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
}

/**
 * Mapeo de errores de Firebase para el inicio de sesión. Nunca se expone
 * `error.message` crudo ni el código. Credenciales inválidas, contraseña
 * incorrecta y cuenta inexistente comparten el MISMO mensaje, para no revelar
 * si existe una cuenta con ese correo.
 */
function mapLoginError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/invalid-email':
      return 'Revisa el formato del correo electrónico.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    default:
      return 'No pudimos iniciar sesión. Inténtalo de nuevo.';
  }
}

/**
 * Mapeo de errores de Firebase para el registro. Nunca se expone `error.message`
 * crudo ni el código. No se fija ningún mínimo de contraseña aquí: el mensaje
 * de contraseña débil es genérico (la regla real la define Firebase).
 */
function mapRegisterError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'No pudimos crear la cuenta con ese correo. Si ya tienes una cuenta, intenta iniciar sesión.';
    case 'auth/invalid-email':
      return 'Revisa el formato del correo electrónico.';
    case 'auth/weak-password':
      return 'La contraseña no cumple los requisitos de seguridad.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    default:
      return 'No pudimos crear tu cuenta. Inténtalo de nuevo.';
  }
}

/**
 * Mapeo de errores de Firebase para el flujo de recuperación de contraseña.
 * Nunca se expone `error.message` crudo. `auth/user-not-found` se trata como
 * éxito para no revelar si existe una cuenta con ese correo.
 */
function mapPasswordResetError(error: unknown): AuthActionResult {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/user-not-found':
      return { ok: true };
    case 'auth/invalid-email':
      return { ok: false, message: 'Revisa el formato del correo electrónico.' };
    case 'auth/too-many-requests':
      return { ok: false, message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
    case 'auth/network-request-failed':
      return { ok: false, message: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.' };
    default:
      return { ok: false, message: 'No se pudo enviar el enlace. Inténtalo de nuevo más tarde.' };
  }
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

  /**
   * VC4 MICROBLOQUE 10 -- ÚNICO punto que cambia `accountId`, a propósito:
   * liga los stores locales de cuenta (`instant-xp-store`, y cualquier
   * futuro store del mismo patrón) SÍNCRONAMENTE, en el mismo tick que el
   * propio `setAccountId` -- nunca una ventana donde un render intermedio
   * pueda leer el estado optimista de la identidad anterior junto al
   * `accountId` ya nuevo (ver auditoría §13 del prompt). `bindInstantXpAccount`
   * ya es un no-op determinista cuando `accountId` no cambia realmente
   * (mismo id -- reautenticación, ver §14), así que llamarlo aquí siempre,
   * incondicionalmente, es seguro.
   */
  function updateAccountId(id: string | null): void {
    bindInstantXpAccount(id);
    bindPendingLpAccount(id);
    setAccountId(id);
  }

  useEffect(() => {
    const handleUnauthorized = () => {
      void clearSession();
      updateAccountId(null);
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
        updateAccountId(me.data.accountId);
        setStatus('authenticated');
      } else {
        // Sesión guardada pero inválida (401) o inalcanzable (red) -- por
        // seguridad se trata igual: sin sesión confirmada, no autenticado.
        // El manejador de 401 ya limpia el storage cuando aplica; para el
        // caso de red, se limpia aquí también para no quedar en un estado
        // ambiguo (ver ADR-0013, punto de gate 5).
        await clearSession();
        updateAccountId(null);
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
    // RC1A: solo se persiste el sessionId -- el idToken de Firebase ya cumplió
    // su papel (probar identidad ante POST /auth/session) y no se guarda.
    await saveSession({ sessionId: sessionResult.data.sessionId });
    updateAccountId(sessionResult.data.accountId);
    setStatus('authenticated');
    return { ok: true };
  }

  async function login(email: string, password: string): Promise<AuthActionResult> {
    try {
      const { idToken } = await identityClient.signIn(email, password);
      return await establishSession(idToken);
    } catch (error) {
      return { ok: false, message: mapLoginError(error) };
    }
  }

  async function register(email: string, password: string): Promise<AuthActionResult> {
    try {
      const { idToken } = await identityClient.signUp(email, password);
      return await establishSession(idToken);
    } catch (error) {
      return { ok: false, message: mapRegisterError(error) };
    }
  }

  async function resetPassword(email: string): Promise<AuthActionResult> {
    try {
      await identityClient.sendPasswordReset(email.trim());
      return { ok: true };
    } catch (error) {
      return mapPasswordResetError(error);
    }
  }

  async function logout(): Promise<void> {
    await logoutRequest(); // best-effort -- apiRequest nunca lanza, un fallo de red no bloquea el logout local.
    await identityClient.signOut().catch(() => {});
    await clearSession();
    updateAccountId(null);
    setStatus('unauthenticated');
  }

  const value = useMemo<AuthContextValue>(() => ({ status, accountId, login, register, resetPassword, logout }), [status, accountId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
