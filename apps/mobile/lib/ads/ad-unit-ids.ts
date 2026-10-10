import type { AdsBuildMode, AdsPlacement } from './ads-state';

/**
 * ADS V1 -- ADS-1B / ADS-1B.1. Frontera DETERMINISTA de ids de unidad de
 * anuncio, del modo de build de anuncios y de dispositivos de prueba: ADS-1C
 * resolvera cada placement desde aqui sin duplicar logica de entorno.
 *
 * MODO DE BUILD (`resolveAdsBuildMode`) -- INVARIANTE CRITICA: una variable de
 * entorno OLVIDADA produce SIN anuncios; jamas anuncios de prueba ni anuncios
 * de produccion por accidente.
 *
 *   `__DEV__`                                              -> 'test'
 *   release + EXPO_PUBLIC_ADMOB_TEST_MODE=true (smoke/QA)  -> 'test'
 *   release + EXPO_PUBLIC_ADMOB_PRODUCTION_IDS=true        -> 'production'
 *   release sin ninguna de las dos                         -> 'off'  (SIN anuncios)
 *   release con AMBAS (configuracion contradictoria)       -> 'off'
 *
 * Solo el literal "true" cuenta; "TRUE", "1", " true", "yes" => no activan nada.
 *
 * ID DE UNIDAD (`resolveAdUnitId`):
 *   'test'       -> ids de prueba OFICIALES de Google (nunca se leen los de produccion)
 *   'production' -> id validado (forma `ca-app-pub-<16>/<10>` y que NO sea un id de
 *                   prueba de Google); ausente o invalido -> null (sin fallback)
 *   'off'        -> null (sin fallback a prueba NI a produccion)
 *
 * Los ids de produccion NO se versionan en el repositorio: viven en la
 * configuracion de build (`EXPO_PUBLIC_*`). No se necesitan en ADS-1B/1B.1.
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
  /** Valor crudo de `EXPO_PUBLIC_ADMOB_TEST_MODE`. Solo el literal "true" activa el modo smoke/QA. */
  testMode: string | undefined;
  /** Valor crudo de `EXPO_PUBLIC_ADMOB_PRODUCTION_IDS`. Solo el literal "true" activa produccion. */
  productionOptIn: string | undefined;
  ids: Partial<Record<AdsPlacement, string | undefined>>;
  /** Valor crudo de `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS` (separado por comas), opcional. */
  testDeviceIds: string | undefined;
}

export function resolveAdsBuildMode(env: AdUnitEnv): AdsBuildMode {
  if (env.isDev) return 'test';
  const test = env.testMode === 'true';
  const production = env.productionOptIn === 'true';
  if (test && production) return 'off'; // contradictorio: fail-closed
  if (test) return 'test';
  if (production) return 'production';
  return 'off';
}

/** `true` cuando se deben usar ids de prueba de Google. */
export function isTestAdMode(env: AdUnitEnv): boolean {
  return resolveAdsBuildMode(env) === 'test';
}

function kindOf(placement: AdsPlacement): AdUnitKind {
  return placement === 'interstitialQuickExit' ? 'interstitial' : 'banner';
}

export function resolveAdUnitId(placement: AdsPlacement, env: AdUnitEnv): string | null {
  const mode = resolveAdsBuildMode(env);
  if (mode === 'test') return GOOGLE_TEST_UNIT_IDS[kindOf(placement)];
  if (mode !== 'production') return null;
  const id = env.ids[placement]?.trim();
  if (!id || !PRODUCTION_UNIT_ID.test(id) || id.startsWith(GOOGLE_TEST_PUBLISHER_PREFIX)) return null;
  return id;
}

/** Dispositivos de prueba: en modo prueba `EMULATOR` + los configurados; en produccion/off solo los configurados. */
export function resolveTestDeviceIds(env: AdUnitEnv): string[] {
  const custom = (env.testDeviceIds ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return resolveAdsBuildMode(env) === 'test' ? ['EMULATOR', ...custom] : custom;
}

/** Lectura ESTATICA de `process.env.EXPO_PUBLIC_*` (Metro solo inlinea accesos literales). */
export function readAdUnitEnv(): AdUnitEnv {
  return {
    // Mismo criterio que `lib/api/client.ts`: solo un `__DEV__ === false` explicito es release.
    isDev: typeof __DEV__ === 'undefined' || __DEV__ !== false,
    testMode: process.env.EXPO_PUBLIC_ADMOB_TEST_MODE,
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
