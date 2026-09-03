import * as SecureStore from 'expo-secure-store';

/**
 * Almacenamiento seguro de la sesión real -- ver ADR-0013, Decision Gate 2.
 * El `sessionId` opaco es información sensible (credencial de sesión):
 * `expo-secure-store` (Keychain en iOS, Keystore en Android), NUNCA
 * `AsyncStorage` (reservado para datos no sensibles, ver
 * `lib/storage/local-flags.ts`).
 *
 * RC1A (docs/adr/ZETRYND-V1-RC1A-AUTH-SESSION-LIFECYCLE.md): ya NO se
 * persiste el idToken de Firebase. Solo se usaba para reenviarlo en cada
 * request, pero expira en ~1 h y el backend ya no lo revalida -- la sesión
 * de ZETRYND (30 días) se autentica únicamente con el `sessionId`. La clave
 * antigua `idToken` se borra activamente al guardar/limpiar, para no dejar
 * un token vencido en el Keystore de instalaciones previas.
 *
 * `expo-secure-store` no tiene soporte oficial en el target Web de Expo --
 * aceptado explícitamente (ADR-0013). Verificado empíricamente (Browser
 * tool): en Web, `setItemAsync`/`getItemAsync` no lanzan pero tampoco
 * persisten nada (no escriben en `localStorage` ni en ningún otro backend) --
 * sin una caché en memoria, la app perdía la sesión en la llamada
 * INMEDIATAMENTE siguiente al login, no solo tras recargar. La caché de
 * abajo corrige eso: `loadSession()` devuelve el último valor conocido en
 * memoria (rápido y correcto en Web durante la misma ejecución) y solo
 * recurre a `SecureStore` para la restauración inicial tras un reinicio
 * real (que en Web, documentado y aceptado, no sobrevive).
 */

const KEYS = {
  sessionId: 'axioma.v1.session.sessionId',
} as const;

/** RC1A: clave legada -- ya no se escribe, solo se borra (limpieza de instalaciones previas). */
const LEGACY_ID_TOKEN_KEY = 'axioma.v1.session.idToken';

export interface StoredSession {
  sessionId: string;
}

let cachedSession: StoredSession | null | undefined = undefined; // undefined = todavía no se intentó leer en esta ejecución.

export async function loadSession(): Promise<StoredSession | null> {
  if (cachedSession !== undefined) return cachedSession;

  try {
    const sessionId = await SecureStore.getItemAsync(KEYS.sessionId);
    cachedSession = sessionId ? { sessionId } : null;
  } catch {
    // Sin soporte (ej. Web) o fallo de lectura -- tratar como "sin sesión
    // persistida" en vez de bloquear el arranque de la app.
    cachedSession = null;
  }
  return cachedSession;
}

export async function saveSession(session: StoredSession): Promise<void> {
  cachedSession = session; // fuente de verdad inmediata para esta ejecución, independiente de si SecureStore persiste de verdad.
  try {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.sessionId, session.sessionId),
      // RC1A: borra el idToken vencido que instalaciones previas dejaron en el Keystore.
      SecureStore.deleteItemAsync(LEGACY_ID_TOKEN_KEY),
    ]);
  } catch {
    // No bloquea el login si la escritura falla (ej. Web) -- la sesión
    // sigue activa en memoria (cachedSession) durante esta ejecución, pero
    // no sobrevivirá a un reinicio real. Documentado en ADR-0013.
  }
}

export async function clearSession(): Promise<void> {
  cachedSession = null;
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.sessionId),
      SecureStore.deleteItemAsync(LEGACY_ID_TOKEN_KEY),
    ]);
  } catch {
    // Ausencia de la clave o falta de soporte -- no es un error real.
  }
}
