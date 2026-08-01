import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Capa centralizada de acceso a AsyncStorage -- ver ADR-0009. Únicamente
 * para estado local NO sensible (ej. "ya vio el onboarding"). Nunca para
 * credenciales ni estado de autenticación real -- eso lo maneja el
 * proveedor de auth (hoy MockAuthProvider, en memoria; ver
 * lib/auth/mock-auth-provider.tsx).
 *
 * Claves versionadas (`axioma.v1.*`): si el formato almacenado cambiara de
 * forma incompatible, se sube el número de versión en vez de mutar la
 * clave existente -- evita leer datos con una forma inesperada de una
 * versión anterior de la app.
 */

const KEYS = {
  hasCompletedOnboarding: 'axioma.v1.hasCompletedOnboarding',
} as const;

async function readBoolean(key: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return false;
    const parsed: unknown = JSON.parse(raw);
    return parsed === true;
  } catch {
    // Dato corrupto o fallo de lectura -- default seguro: tratar como NO
    // completado. Un falso negativo (mostrar el onboarding de nuevo) es
    // preferible a saltárselo por un dato ilegible.
    return false;
  }
}

async function writeBoolean(key: string, value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // No bloquea el flujo de la app si falla la escritura -- en el peor
    // caso, se vuelve a preguntar en la próxima sesión.
  }
}

export const localFlags = {
  getHasCompletedOnboarding: (): Promise<boolean> => readBoolean(KEYS.hasCompletedOnboarding),
  setHasCompletedOnboarding: (value: boolean): Promise<void> => writeBoolean(KEYS.hasCompletedOnboarding, value),
};
