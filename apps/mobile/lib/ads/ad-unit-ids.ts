import type { AdsPlacement } from './ads-state';

/**
 * ADS V1 -- ADS-1B. Frontera DETERMINISTA de ids de unidad de anuncio y de
 * dispositivos de prueba: ADS-1C resolvera cada placement desde aqui sin
 * duplicar logica de entorno.
 *
 * Reglas (protegen contra trafico invalido -- riesgo para la cuenta de AdMob):
 *   1. En `__DEV__` SOLO se usan los ids de prueba OFICIALES de Google; los
 *      ids de produccion ni siquiera se leen.
 *   2. Un build release usa ids de produccion UNICAMENTE con el opt-in
 *      explicito `EXPO_PUBLIC_ADMOB_PRODUCTION_IDS=true`. Sin opt-in -> ids de
 *      prueba (un build de QA nunca genera impresiones/clics reales por
 *      olvido).
 *   3. Con opt-in, el id de produccion debe tener forma valida y NO ser un id
 *      de prueba de Google; si falta o es invalido -> `null` (el placement no
 *      se muestra, fail-closed). Nunca hay fallback a otro id.
 *   4. Los ids de produccion NO se versionan en el repositorio: viven en la
 *      configuracion de build (`EXPO_PUBLIC_*`). No se necesitan en ADS-1B.
 */
export type AdUnitKind = 'banner' | 'interstitial';

/** Ids de prueba OFICIALES de Google para Android (banner adaptativo anclado + intersticial). */
export const GOOGLE_TEST_UNIT_IDS: Readonly<Record<AdUnitKind, string>> = Object.freeze({
  banner: 'ca-app-pub-3940256099942544/9214589741',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
});

/** Publisher de los ids de prueba de Google: nunca valido como id de produccion. */
export const GOOGLE_TEST_PUBLISHER_PREFIX = 'ca-app-pub-3940256099942544/';

const PRODUCTION_UNIT_ID = /^ca-app-pub-\d{16}\/\d{10}$/;

export interface AdUnitEnv {
  isDev: boolean;
  /** Valor crudo de `EXPO_PUBLIC_ADMOB_PRODUCTION_IDS`. Solo el literal "true" activa produccion. */
  productionOptIn: string | undefined;
  ids: Partial<Record<AdsPlacement, string | undefined>>;
  /** Valor crudo de `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS` (separado por comas), opcional. */
  testDeviceIds: string | undefined;
}

/** `true` cuando se deben usar ids de prueba (dev, o build sin opt-in explicito de produccion). */
export function isTestAdMode(env: AdUnitEnv): boolean {
  return env.isDev || env.productionOptIn !== 'true';
}

function kindOf(placement: AdsPlacement): AdUnitKind {
  return placement === 'interstitialQuickExit' ? 'interstitial' : 'banner';
}

export function resolveAdUnitId(placement: AdsPlacement, env: AdUnitEnv): string | null {
  if (isTestAdMode(env)) return GOOGLE_TEST_UNIT_IDS[kindOf(placement)];
  const id = env.ids[placement]?.trim();
  if (!id || !PRODUCTION_UNIT_ID.test(id) || id.startsWith(GOOGLE_TEST_PUBLISHER_PREFIX)) return null;
  return id;
}

/** Dispositivos de prueba: en modo prueba siempre `EMULATOR` + los configurados; en produccion solo los configurados. */
export function resolveTestDeviceIds(env: AdUnitEnv): string[] {
  const custom = (env.testDeviceIds ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return isTestAdMode(env) ? ['EMULATOR', ...custom] : custom;
}

/** Lectura ESTATICA de `process.env.EXPO_PUBLIC_*` (Metro solo inlinea accesos literales). */
export function readAdUnitEnv(): AdUnitEnv {
  return {
    // Mismo criterio que `lib/api/client.ts`: solo un `__DEV__ === false` explicito es release.
    isDev: typeof __DEV__ === 'undefined' || __DEV__ !== false,
    productionOptIn: process.env.EXPO_PUBLIC_ADMOB_PRODUCTION_IDS,
    ids: {
      bannerHome: process.env.EXPO_PUBLIC_ADMOB_BANNER_HOME_ID,
      bannerStudy: process.env.EXPO_PUBLIC_ADMOB_BANNER_STUDY_ID,
      bannerCompete: process.env.EXPO_PUBLIC_ADMOB_BANNER_COMPETE_ID,
      interstitialQuickExit: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_QUICK_EXIT_ID,
    },
    testDeviceIds: process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS,
  };
}
