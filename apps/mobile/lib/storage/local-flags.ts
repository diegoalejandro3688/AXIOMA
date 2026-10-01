import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Capa centralizada de acceso a AsyncStorage -- ver ADR-0009. Únicamente
 * para estado local NO sensible (ej. "ya vio el onboarding"). Nunca para
 * credenciales ni estado de autenticación real -- eso usa
 * `expo-secure-store` vía `lib/auth/session-storage.ts` (ver ADR-0013).
 *
 * Claves versionadas (`axioma.v1.*`): si el formato almacenado cambiara de
 * forma incompatible, se sube el número de versión en vez de mutar la
 * clave existente -- evita leer datos con una forma inesperada de una
 * versión anterior de la app.
 */

const KEYS = {
  /** LEGACY (VC4 MICROBLOQUE 10) -- global por instalación, NUNCA scoped por
   * cuenta. Causaba que una Cuenta B nueva heredara la finalización de
   * onboarding de una Cuenta A anterior en el mismo dispositivo
   * (STATE_ISOLATION_BUG, Final QA Anomaly Audit). Ya NO se escribe --
   * sólo se LEE, una única vez por instalación, para migrar su valor a la
   * cuenta actualmente autenticada (ver `getHasCompletedOnboarding` y
   * `onboardingLegacyMigrated` abajo). Nunca se borra (§19 -- no destruir
   * datos que otro código podría necesitar reconciliar), sólo deja de
   * tener efecto una vez consumida la migración.
   */
  legacyHasCompletedOnboarding: 'axioma.v1.hasCompletedOnboarding',
  /** Marca que la migración legacy -> cuenta ya se CONSUMIÓ (con o sin
   * valor que migrar) -- garantiza que `legacyHasCompletedOnboarding`
   * sólo puede migrar a LA PRIMERA cuenta que evalúe onboarding después
   * del update, nunca a una segunda/tercera cuenta en el mismo
   * dispositivo. Ver `getHasCompletedOnboarding`. */
  onboardingLegacyMigrated: 'axioma.v2.onboardingLegacyMigrated',
  appearancePreference: 'axioma.v1.appearancePreference',
} as const;

/** Clave scoped por cuenta (VC4 MICROBLOQUE 10) -- reemplaza la clave global legacy. */
function scopedOnboardingKey(accountId: string): string {
  return `axioma.v2.hasCompletedOnboarding.${accountId}`;
}

const APPEARANCE_PREFERENCE_VALUES = ['system', 'light', 'dark'] as const;
type AppearancePreference = (typeof APPEARANCE_PREFERENCE_VALUES)[number];

async function readRawBoolean(key: string): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed === true;
  } catch {
    return null;
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

/**
 * VC4 MICROBLOQUE 10 -- onboarding completion SCOPED POR CUENTA
 * (`accountId` interno del backend, la única identidad estable disponible
 * -- ver `useAuth().accountId`). Nunca más una clave global.
 *
 * Migración legacy ONE-TIME (§7/§8 del prompt): si esta cuenta todavía no
 * tiene su propia clave scoped, y la migración legacy global NUNCA se
 * consumió antes (`onboardingLegacyMigrated` ausente), se lee el valor
 * legacy UNA SOLA VEZ y, si era `true`, se migra a ESTA cuenta. El marcador
 * de "migración consumida" se escribe SIEMPRE en ese primer paso
 * (independientemente de si el legacy valía `true` o `false`/ausente) --
 * así una SEGUNDA cuenta que nunca tuvo clave scoped propia jamás vuelve a
 * leer el legacy: ve onboarding incompleto, como corresponde a una cuenta
 * nueva. Esto es lo que impide que el legacy=true de la Cuenta A migre
 * también a la Cuenta B.
 *
 * La clave legacy NUNCA se borra (dato de otra versión, no destructivo
 * borrarla tampoco sería incorrecto, pero no aporta valor hacerlo -- el
 * marcador de migración ya la vuelve inerte para siempre).
 */
async function getHasCompletedOnboarding(accountId: string): Promise<boolean> {
  const scoped = await readRawBoolean(scopedOnboardingKey(accountId));
  if (scoped !== null) return scoped;

  const alreadyMigrated = await readRawBoolean(KEYS.onboardingLegacyMigrated);
  if (alreadyMigrated !== null) {
    // La migración one-time ya se consumió por OTRA cuenta (o por esta
    // misma en una sesión anterior sin legacy=true) -- nunca se vuelve a
    // leer el legacy para nadie más.
    return false;
  }

  const legacyValue = await readRawBoolean(KEYS.legacyHasCompletedOnboarding);
  // Se marca CONSUMIDA la migración sin importar el resultado -- la
  // ventana de migración es de UNA sola lectura, para UNA sola cuenta,
  // para siempre.
  await writeBoolean(KEYS.onboardingLegacyMigrated, true);

  if (legacyValue === true) {
    await writeBoolean(scopedOnboardingKey(accountId), true);
    return true;
  }
  return false;
}

async function setHasCompletedOnboarding(accountId: string, value: boolean): Promise<void> {
  await writeBoolean(scopedOnboardingKey(accountId), value);
}

async function readAppearancePreference(): Promise<AppearancePreference> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.appearancePreference);
    if (raw !== null && (APPEARANCE_PREFERENCE_VALUES as readonly string[]).includes(raw)) {
      return raw as AppearancePreference;
    }
    // Sin valor guardado (primera vez) o dato irreconocible (versión futura
    // desconocida) -- default seguro: 'system' (decisión de producto THEME-1).
    return 'system';
  } catch {
    return 'system';
  }
}

async function writeAppearancePreference(value: AppearancePreference): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.appearancePreference, value);
  } catch {
    // No bloquea el flujo de la app si falla la escritura -- el tema ya
    // cambió en memoria para esta sesión, solo no sobrevive a un reinicio.
  }
}

export const localFlags = {
  /** VC4 MICROBLOQUE 10 -- `accountId` obligatorio, scoped por cuenta (con migración legacy one-time incluida). */
  getHasCompletedOnboarding: (accountId: string): Promise<boolean> => getHasCompletedOnboarding(accountId),
  setHasCompletedOnboarding: (accountId: string, value: boolean): Promise<void> => setHasCompletedOnboarding(accountId, value),
  getAppearancePreference: (): Promise<AppearancePreference> => readAppearancePreference(),
  setAppearancePreference: (value: AppearancePreference): Promise<void> => writeAppearancePreference(value),
};
