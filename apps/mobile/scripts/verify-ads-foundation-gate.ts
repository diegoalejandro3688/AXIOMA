// Gate ADS-1B / ADS-1B.1 -- fundacion de publicidad (AdsProvider + entitlement
// gate + kill switch remoto + modo de build fail-closed + aislamiento de
// cuenta). Verificacion DETERMINISTA: Node puro, sin React Native, sin el SDK,
// sin red. No inicializa el SDK ni solicita ningun anuncio.
//
// Protege:
//   1. RNGMA exacto 17.0.0 + el gate de parche TFAT sigue pasando.
//   2. Elegibilidad (maquina de estados PURA): Premium / entitlement sin
//      resolver / config fallida o apagada / release SIN modo explicito NUNCA
//      inicializan ni quedan `ready`. Propiedad exhaustiva sobre 240 combos.
//   3. Aislamiento de cuenta: la config de una cuenta jamas se filtra a otra
//      sesion (FREE A -> logout -> PREMIUM B -> FREE C), con el SDK ya
//      inicializado a nivel de proceso.
//   4. Modo de build / ids: __DEV__ y smoke => SOLO ids de prueba de Google;
//      produccion exige opt-in explicito + ids validos; release SIN modo
//      explicito (variable olvidada) => NULL (ni prueba ni produccion).
//   5. Fuente: PG + TEEN antes de initialize(); SDK dinamico y aislado en
//      ads-sdk.ts; sin TFUA/TFCD; sin llamadas nativas directas; sin placements
//      (ADS-1C); sin ids de unidad versionados; provider bajo Auth+Entitlement.
//   6. app.json: plugin del App ID real (1 entrada, no es el de muestra,
//      delayAppMeasurementInit). Modo release-candidate (ADS_RELEASE_CANDIDATE=1)
//      endurece: modo de prueba APAGADO en el entorno de release y, con
//      ADS_REQUIRE_UNIT_IDS=1, ids de produccion validos. Su logica se prueba con
//      fixtures; el smoke con ids de prueba sigue permitido.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { ADS_CONFIG_OFF, type AdsConfigResponse } from '@axioma/contracts';
import {
  ADS_CONFIG_ENTRY_IDLE,
  deriveAdsPhase,
  effectiveAdsConfig,
  isAdsReady,
  isPlacementEnabled,
  scopeConfigToAccount,
  shouldFetchAdsConfig,
  shouldInitializeSdk,
  toAdsEntitlementInput,
  type AdsBuildMode,
  type AdsConfigEntry,
  type AdsConfigInput,
  type AdsEntitlementInput,
  type AdsPlacement,
  type AdsSdkInput,
} from '../lib/ads/ads-state';
import {
  GOOGLE_TEST_UNIT_IDS,
  isTestAdMode,
  resolveAdUnitId,
  resolveAdsBuildMode,
  resolveTestDeviceIds,
  type AdUnitEnv,
} from '../lib/ads/ad-unit-ids';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}
function warn(label: string) {
  console.warn(`  WARN  ${label}`);
}

const MOBILE_ROOT = join(__dirname, '..');
const readText = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
const readMobile = (...seg: string[]) => readText(join(MOBILE_ROOT, ...seg));

const SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const GOOGLE_TEST_PUBLISHER = '3940256099942544';
const ALL_PLACEMENTS: AdsPlacement[] = ['bannerHome', 'bannerStudy', 'bannerCompete', 'interstitialQuickExit'];

const FULL_CONFIG: AdsConfigResponse = {
  adsEnabled: true,
  bannerHomeEnabled: true,
  bannerStudyEnabled: true,
  bannerCompeteEnabled: true,
  interstitialCompeteEnabled: true,
  interstitialCooldownMinutes: 20,
  interstitialMaxPerSession: 1,
};

// --- logica de release-candidate (probada con fixtures y aplicada al repo si se pide) ---
interface ReleaseCandidateInput {
  appJson: { expo?: { plugins?: unknown[] } };
  /** Variables EXPO_PUBLIC_ADMOB_* del entorno de release (`.env.production`), o null si no existe. */
  releaseEnv: Record<string, string> | null;
  requireUnitIds: boolean;
}
function evaluateReleaseCandidate(input: ReleaseCandidateInput): string[] {
  const problems: string[] = [];
  const entries = (input.appJson.expo?.plugins ?? []).filter((p) => (Array.isArray(p) ? p[0] : p) === 'react-native-google-mobile-ads');
  const opts = (Array.isArray(entries[0]) ? entries[0][1] : {}) as { androidAppId?: string; delayAppMeasurementInit?: boolean };
  if (entries.length !== 1) problems.push('app.json debe tener exactamente 1 plugin react-native-google-mobile-ads');
  if (!/^ca-app-pub-\d{16}~\d{10}$/.test(opts.androidAppId ?? '')) problems.push('androidAppId con forma invalida');
  if ((opts.androidAppId ?? '') === SAMPLE_APP_ID || (opts.androidAppId ?? '').includes(GOOGLE_TEST_PUBLISHER)) problems.push('androidAppId es el App ID de muestra de Google');
  if (opts.delayAppMeasurementInit !== true) problems.push('delayAppMeasurementInit debe ser true');
  if (input.releaseEnv === null) {
    problems.push('falta el entorno de release (.env.production)');
    return problems;
  }
  const api = (input.releaseEnv.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
  if (!/^https:\/\/[^/]+/.test(api) || /^https:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0|\[::1\])(?::|\/|$)/.test(api)) problems.push('EXPO_PUBLIC_API_BASE_URL efectiva debe ser https y NO local (posible fuga del .env de QA)');
  if (input.releaseEnv.EXPO_PUBLIC_AUTH_IDENTITY_CLIENT !== 'firebase') problems.push('EXPO_PUBLIC_AUTH_IDENTITY_CLIENT efectivo debe ser firebase (posible fuga del .env de QA)');
  if (input.releaseEnv.EXPO_PUBLIC_ADMOB_TEST_MODE === 'true') problems.push('EXPO_PUBLIC_ADMOB_TEST_MODE=true en el entorno de release (modo de prueba debe estar APAGADO)');
  if (input.requireUnitIds) {
    if (input.releaseEnv.EXPO_PUBLIC_ADMOB_PRODUCTION_IDS !== 'true') problems.push('EXPO_PUBLIC_ADMOB_PRODUCTION_IDS debe ser true');
    for (const key of ['BANNER_HOME', 'BANNER_STUDY', 'BANNER_COMPETE', 'INTERSTITIAL_QUICK_EXIT']) {
      const id = (input.releaseEnv[`EXPO_PUBLIC_ADMOB_${key}_ID`] ?? '').trim();
      if (!/^ca-app-pub-\d{16}\/\d{10}$/.test(id) || id.startsWith(`ca-app-pub-${GOOGLE_TEST_PUBLISHER}/`)) problems.push(`id de unidad ${key} ausente, invalido o de prueba`);
    }
  }
  return problems;
}
function parseEnvFile(path: string): Record<string, string> | null {
  if (!existsSync(path)) return null;
  const out: Record<string, string> = {};
  for (const line of readText(path).split('\n')) {
    const m = line.match(/^\s*(EXPO_PUBLIC_(?:ADMOB_[A-Z_]+|API_BASE_URL|AUTH_IDENTITY_CLIENT))\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

/**
 * Entorno EFECTIVO de un build de produccion, con la precedencia REAL del cargador de Expo
 * (`@expo/env` getFiles('production')): .env.production.local > .env.local > .env.production > .env.
 * La primera definicion de cada clave gana; un `.env` de QA (TEST_MODE, API local, identidad stub)
 * rellena las claves que los archivos de produccion no definen. `null` = no existe .env.production.
 */
function mergeReleaseEnv(files: Array<Record<string, string> | null>, productionFile: Record<string, string> | null): Record<string, string> | null {
  if (productionFile === null) return null;
  const merged: Record<string, string> = {};
  for (const file of files) {
    if (!file) continue;
    for (const [key, value] of Object.entries(file)) if (!(key in merged)) merged[key] = value;
  }
  return merged;
}

// --- 1. version exacta + gate del parche TFAT -------------------------------
console.log('--- 1. RNGMA exacto + gate de parche TFAT ---');
{
  const pkg = JSON.parse(readMobile('package.json'));
  check('react-native-google-mobile-ads fijado EXACTAMENTE a 17.0.0 (sin ^ ni ~)', pkg.dependencies?.['react-native-google-mobile-ads'] === '17.0.0');
  const tfat = spawnSync('pnpm', ['verify:ads-tfat-patch-gate'], { cwd: MOBILE_ROOT, shell: true, encoding: 'utf8' });
  check('verify:ads-tfat-patch-gate sigue pasando (TFAT/TEEN + nulabilidad RN 0.81)', tfat.status === 0);
}

// --- 2. elegibilidad (pura) --------------------------------------------------
console.log('--- 2. elegibilidad: Premium / sin resolver / backend fallido / sin modo NO inicializan ---');
{
  const configs: Array<[string, AdsConfigInput]> = [
    ['idle', { status: 'idle' }],
    ['loading', { status: 'loading' }],
    ['error', { status: 'error' }],
    ['ready+OFF', { status: 'ready', config: ADS_CONFIG_OFF }],
    ['ready+adsEnabled', { status: 'ready', config: FULL_CONFIG }],
  ];
  const sdks: AdsSdkInput[] = ['idle', 'initializing', 'ready', 'failed'];
  const entitlements: AdsEntitlementInput[] = ['loading', 'error', 'FREE', 'PREMIUM'];
  const modes: AdsBuildMode[] = ['test', 'production', 'off'];
  const ON: AdsConfigInput = { status: 'ready', config: FULL_CONFIG };
  const OFF: AdsConfigInput = { status: 'ready', config: ADS_CONFIG_OFF };

  const free = (c: AdsConfigInput, s: AdsSdkInput = 'idle', m: AdsBuildMode = 'test') => ({ phase: deriveAdsPhase('FREE', c, s, m), init: shouldInitializeSdk('FREE', c, s, m) });
  check('A. FREE + adsEnabled=false -> disabled, el SDK NO se inicializa', free(OFF).phase === 'disabled' && !free(OFF).init);
  check('B. FREE + adsEnabled=true (modo test) -> elegible: initializing y SE inicializa', free(ON).phase === 'initializing' && free(ON).init);
  check('B. FREE + adsEnabled=true (modo production) -> elegible tambien', free(ON, 'idle', 'production').init);
  check('C. PREMIUM + config maestra ON (y SDK ya listo) -> disabled, NO ready, NO se inicializa', deriveAdsPhase('PREMIUM', ON, 'ready', 'test') === 'disabled' && !shouldInitializeSdk('PREMIUM', ON, 'idle', 'test'));
  check('D. entitlement loading -> waiting_entitlement, NO se inicializa', deriveAdsPhase('loading', ON, 'idle', 'test') === 'waiting_entitlement' && !shouldInitializeSdk('loading', ON, 'idle', 'test'));
  check('D. entitlement error -> disabled, NO se inicializa', deriveAdsPhase('error', ON, 'idle', 'test') === 'disabled' && !shouldInitializeSdk('error', ON, 'idle', 'test'));
  check('E. FREE + backend en error -> fase error, NO se inicializa', free({ status: 'error' }).phase === 'error' && !free({ status: 'error' }).init);
  check('FREE + config idle/loading -> waiting_config, NO se inicializa', free({ status: 'idle' }).phase === 'waiting_config' && free({ status: 'loading' }).phase === 'waiting_config' && !free({ status: 'idle' }).init && !free({ status: 'loading' }).init);
  check("release SIN modo explicito ('off') + FREE + config favorable -> disabled, NO se inicializa", free(ON, 'idle', 'off').phase === 'disabled' && !free(ON, 'idle', 'off').init && free(ON, 'ready', 'off').phase === 'disabled');
  check("modo 'off' tampoco pide la config remota (cero red)", !shouldFetchAdsConfig('FREE', 'acc-1', 'off') && shouldFetchAdsConfig('FREE', 'acc-1', 'test') && shouldFetchAdsConfig('FREE', 'acc-1', 'production'));
  check('la config remota solo se pide con FREE + cuenta conocida', !shouldFetchAdsConfig('PREMIUM', 'acc-1', 'test') && !shouldFetchAdsConfig('loading', 'acc-1', 'test') && !shouldFetchAdsConfig('error', 'acc-1', 'test') && !shouldFetchAdsConfig('FREE', null, 'test'));
  check('valor de entitlement inesperado -> disabled (fail-closed)', deriveAdsPhase('GOLD' as AdsEntitlementInput, ON, 'ready', 'test') === 'disabled');
  check('modo inesperado -> disabled (fail-closed)', deriveAdsPhase('FREE', ON, 'ready', 'weird' as AdsBuildMode) === 'disabled');
  check('SDK ya en initializing -> NO se solicita una segunda inicializacion', !shouldInitializeSdk('FREE', ON, 'initializing', 'test'));
  check('SDK listo -> fase ready; SDK fallido -> fase error', deriveAdsPhase('FREE', ON, 'ready', 'test') === 'ready' && deriveAdsPhase('FREE', ON, 'failed', 'test') === 'error');
  check('toAdsEntitlementInput mapea loading/error/FREE/PREMIUM y un tier desconocido => error', toAdsEntitlementInput({ status: 'loading' }) === 'loading' && toAdsEntitlementInput({ status: 'error' }) === 'error' && toAdsEntitlementInput({ status: 'ready', tier: 'FREE' }) === 'FREE' && toAdsEntitlementInput({ status: 'ready', tier: 'PREMIUM' }) === 'PREMIUM' && toAdsEntitlementInput({ status: 'ready', tier: 'GOLD' }) === 'error');

  let violations = 0;
  let combos = 0;
  for (const e of entitlements)
    for (const [, c] of configs)
      for (const s of sdks)
        for (const m of modes) {
          combos++;
          const phase = deriveAdsPhase(e, c, s, m);
          const init = shouldInitializeSdk(e, c, s, m);
          const eligible = e === 'FREE' && m !== 'off' && c.status === 'ready' && c.config.adsEnabled;
          if (isAdsReady(phase) && !(eligible && s === 'ready')) violations++;
          if (init && !(eligible && s === 'idle')) violations++;
          if ((e !== 'FREE' || m === 'off') && (isAdsReady(phase) || init)) violations++;
          if (!isAdsReady(phase) && JSON.stringify(effectiveAdsConfig(phase, c)) !== JSON.stringify(ADS_CONFIG_OFF)) violations++;
          for (const p of ALL_PLACEMENTS) if (isPlacementEnabled(phase, c, p) && !(eligible && s === 'ready')) violations++;
        }
  check(`PROPIEDAD (${combos} combinaciones): ready/inicializar/placements => FREE + modo explicito + config habilitada (+ SDK listo)`, violations === 0);
  const noInterstitial = deriveAdsPhase('FREE', { status: 'ready', config: { ...FULL_CONFIG, bannerStudyEnabled: false } }, 'ready', 'test');
  check('kill switch por placement: bannerStudy apagado -> false; bannerHome sigue segun config', !isPlacementEnabled(noInterstitial, { status: 'ready', config: { ...FULL_CONFIG, bannerStudyEnabled: false } }, 'bannerStudy') && isPlacementEnabled(noInterstitial, { status: 'ready', config: { ...FULL_CONFIG, bannerStudyEnabled: false } }, 'bannerHome'));
}

// --- 3. aislamiento de cuenta / vida del SDK --------------------------------
console.log('--- 3. aislamiento de cuenta: la config de una cuenta no se filtra a otra sesion ---');
{
  const entryFor = (accountId: string | null, config: AdsConfigResponse): AdsConfigEntry => ({ accountId, state: { status: 'ready', config } });
  const A = entryFor('acc-A', FULL_CONFIG);
  check('scopeConfigToAccount: la entrada de A vale para A', scopeConfigToAccount(A, 'acc-A').status === 'ready');
  check('scopeConfigToAccount: la entrada de A NO vale para B (-> idle)', scopeConfigToAccount(A, 'acc-B').status === 'idle');
  check('scopeConfigToAccount: sin sesion (accountId null) -> idle', scopeConfigToAccount(A, null).status === 'idle');
  check('scopeConfigToAccount: la entrada inicial es idle para cualquier cuenta', scopeConfigToAccount(ADS_CONFIG_ENTRY_IDLE, 'acc-A').status === 'idle');

  type Session = { ent: AdsEntitlementInput; accountId: string | null };
  const snap = (s: Session, entry: AdsConfigEntry, sdk: AdsSdkInput, mode: AdsBuildMode = 'test') => {
    const scoped = scopeConfigToAccount(entry, s.accountId);
    const phase = deriveAdsPhase(s.ent, scoped, sdk, mode);
    return { phase, ready: isAdsReady(phase), init: shouldInitializeSdk(s.ent, scoped, sdk, mode), placements: ALL_PLACEMENTS.filter((p) => isPlacementEnabled(phase, scoped, p)) };
  };
  // Modelo del efecto del provider: sin FREE+cuenta+modo => entrada idle; con ellos => la config de ESA cuenta llega luego.
  const afterSessionChange = (s: Session, serverConfigFor: (a: string) => AdsConfigResponse, mode: AdsBuildMode = 'test'): AdsConfigEntry =>
    shouldFetchAdsConfig(s.ent, s.accountId, mode) && s.accountId !== null ? entryFor(s.accountId, serverConfigFor(s.accountId)) : ADS_CONFIG_ENTRY_IDLE;
  const server = (a: string): AdsConfigResponse => (a === 'acc-B' ? ADS_CONFIG_OFF : FULL_CONFIG); // B es PREMIUM => el servidor responde OFF

  // FREE A (config ON) -> SDK inicializado a nivel de proceso.
  let sdk: AdsSdkInput = 'idle';
  let entry = afterSessionChange({ ent: 'FREE', accountId: 'acc-A' }, server);
  check('1. FREE A con config ON -> elegible para inicializar', snap({ ent: 'FREE', accountId: 'acc-A' }, entry, sdk).init);
  sdk = 'ready';
  check('2. FREE A, SDK listo -> ready con placements habilitados', snap({ ent: 'FREE', accountId: 'acc-A' }, entry, sdk).ready && snap({ ent: 'FREE', accountId: 'acc-A' }, entry, sdk).placements.length === 4);

  // logout: auth => unauthenticated => entitlement vuelve a loading y accountId a null.
  const outSnap = snap({ ent: 'loading', accountId: null }, entry, sdk); // la entrada de A aun esta en memoria un instante
  check('3. logout (aun con la entrada de A en memoria): NO ready, 0 placements, 0 init', !outSnap.ready && outSnap.placements.length === 0 && !outSnap.init && outSnap.phase === 'waiting_entitlement');
  entry = afterSessionChange({ ent: 'loading', accountId: null }, server);
  check('4. el efecto descarta la config en el logout (entrada idle)', entry.state.status === 'idle');

  // ventana de transicion: accountId ya es B pero la entitlement todavia refleja FREE de A, y la entrada es la de A.
  const staleWindow = snap({ ent: 'FREE', accountId: 'acc-B' }, entryFor('acc-A', FULL_CONFIG), sdk);
  check('5. VENTANA OBSOLETA (accountId=B, entitlement aun FREE de A, entrada de A): NO ready, 0 placements, 0 init', !staleWindow.ready && staleWindow.placements.length === 0 && !staleWindow.init && staleWindow.phase === 'waiting_config');

  // PREMIUM B en el MISMO proceso (SDK sigue inicializado).
  entry = afterSessionChange({ ent: 'PREMIUM', accountId: 'acc-B' }, server);
  const premium = snap({ ent: 'PREMIUM', accountId: 'acc-B' }, entry, sdk);
  check('6. PREMIUM B con el SDK ya inicializado en el proceso: disabled, NO ready, 0 placements, 0 init, 0 solicitudes', premium.phase === 'disabled' && !premium.ready && premium.placements.length === 0 && !premium.init);
  check('7. PREMIUM B: no se pide la config remota', !shouldFetchAdsConfig('PREMIUM', 'acc-B', 'test'));
  const premiumEvenIfServerWereWrong = snap({ ent: 'PREMIUM', accountId: 'acc-B' }, entryFor('acc-B', FULL_CONFIG), sdk);
  check('8. defensa en profundidad: aun con una config ON para B, PREMIUM sigue sin placements', premiumEvenIfServerWereWrong.placements.length === 0 && !premiumEvenIfServerWereWrong.ready);

  // FREE C: debe re-resolver su propia config; no hereda nada de A ni de B.
  const freeCBefore = snap({ ent: 'FREE', accountId: 'acc-C' }, ADS_CONFIG_ENTRY_IDLE, sdk);
  check('9. FREE C antes de su config: waiting_config, 0 placements (no hereda la de A)', freeCBefore.phase === 'waiting_config' && freeCBefore.placements.length === 0 && !freeCBefore.ready);
  entry = afterSessionChange({ ent: 'FREE', accountId: 'acc-C' }, (a) => (a === 'acc-C' ? { ...FULL_CONFIG, bannerHomeEnabled: false } : FULL_CONFIG));
  const freeC = snap({ ent: 'FREE', accountId: 'acc-C' }, entry, sdk);
  check("10. FREE C tras su config propia: ready SIN reinicializar el SDK (ya listo en el proceso) y con SU config (bannerHome apagado)", freeC.ready && !freeC.init && !freeC.placements.includes('bannerHome') && freeC.placements.length === 3);

  // FREE A -> FREE B directo (mismo entitlement FREE en ambos lados): B debe re-resolver.
  const aToB = snap({ ent: 'FREE', accountId: 'acc-B2' }, entryFor('acc-A', FULL_CONFIG), 'ready');
  check('11. FREE A -> FREE B2 sin pasar por unauthenticated: la entrada de A se descarta (waiting_config)', aToB.phase === 'waiting_config' && !aToB.ready && aToB.placements.length === 0);
  check("12. 'off' desactiva todo aunque haya sesion FREE y SDK listo en el proceso", snap({ ent: 'FREE', accountId: 'acc-A' }, entryFor('acc-A', FULL_CONFIG), 'ready', 'off').placements.length === 0);
}

// --- 4. modo de build / ids de unidad ---------------------------------------
console.log('--- 4. modo de build: release sin modo explicito => SIN anuncios (null), nunca prueba ni produccion ---');
{
  const PROD_BANNER = 'ca-app-pub-1111222233334444/1234567890';
  const PROD_INTER = 'ca-app-pub-1111222233334444/0987654321';
  const env = (over: Partial<AdUnitEnv>): AdUnitEnv => ({ isDev: false, testMode: undefined, productionOptIn: undefined, testDeviceIds: undefined, ids: { bannerHome: PROD_BANNER, bannerStudy: PROD_BANNER, bannerCompete: PROD_BANNER, interstitialQuickExit: PROD_INTER }, ...over });
  const isTestId = (id: string | null) => id !== null && id.startsWith(`ca-app-pub-${GOOGLE_TEST_PUBLISHER}/`);

  check("A. __DEV__ -> modo 'test' e ids de prueba SIEMPRE (aunque haya ids de produccion y opt-in)", resolveAdsBuildMode(env({ isDev: true, productionOptIn: 'true' })) === 'test' && ALL_PLACEMENTS.every((p) => isTestId(resolveAdUnitId(p, env({ isDev: true, productionOptIn: 'true' })))));
  check("B. release + TEST_MODE=true (smoke) -> 'test' e ids de prueba", resolveAdsBuildMode(env({ testMode: 'true' })) === 'test' && ALL_PLACEMENTS.every((p) => isTestId(resolveAdUnitId(p, env({ testMode: 'true' })))));
  check("C. release + PRODUCTION_IDS=true + ids validos -> 'production' e ids de produccion", resolveAdsBuildMode(env({ productionOptIn: 'true' })) === 'production' && resolveAdUnitId('bannerHome', env({ productionOptIn: 'true' })) === PROD_BANNER && resolveAdUnitId('interstitialQuickExit', env({ productionOptIn: 'true' })) === PROD_INTER);
  check("D. release SIN ninguna variable (olvidada) -> 'off' y TODOS los placements null (ni prueba ni produccion)", resolveAdsBuildMode(env({})) === 'off' && ALL_PLACEMENTS.every((p) => resolveAdUnitId(p, env({})) === null));
  check('D. release sin variables NO cae a ids de prueba', ALL_PLACEMENTS.every((p) => !isTestId(resolveAdUnitId(p, env({})))));
  check('D. release sin variables NO usa ids de produccion aunque esten presentes', ALL_PLACEMENTS.every((p) => resolveAdUnitId(p, env({})) !== PROD_BANNER && resolveAdUnitId(p, env({})) !== PROD_INTER));
  check("TEST_MODE y PRODUCTION_IDS a la vez (contradictorio) -> 'off' / null", resolveAdsBuildMode(env({ testMode: 'true', productionOptIn: 'true' })) === 'off' && ALL_PLACEMENTS.every((p) => resolveAdUnitId(p, env({ testMode: 'true', productionOptIn: 'true' })) === null));
  for (const bad of ['TRUE', '1', 'yes', ' true', 'true ', 'false', '']) {
    check(`valor ${JSON.stringify(bad)} (no el literal "true") en TEST_MODE y PRODUCTION_IDS -> 'off'`, resolveAdsBuildMode(env({ testMode: bad })) === 'off' && resolveAdsBuildMode(env({ productionOptIn: bad })) === 'off');
  }
  check("produccion + id AUSENTE -> null (sin fallback a prueba ni a otro id)", resolveAdUnitId('bannerStudy', env({ productionOptIn: 'true', ids: {} })) === null);
  check('produccion + id con forma invalida -> null', resolveAdUnitId('bannerStudy', env({ productionOptIn: 'true', ids: { bannerStudy: 'not-an-id' } })) === null);
  check('produccion + id de prueba de Google como "produccion" -> null', resolveAdUnitId('bannerCompete', env({ productionOptIn: 'true', ids: { bannerCompete: GOOGLE_TEST_UNIT_IDS.banner } })) === null);
  check('isTestAdMode solo es true en modo test', isTestAdMode(env({ testMode: 'true' })) && isTestAdMode(env({ isDev: true })) && !isTestAdMode(env({})) && !isTestAdMode(env({ productionOptIn: 'true' })));
  check('banner e intersticial de prueba distintos y oficiales de Google', GOOGLE_TEST_UNIT_IDS.banner !== GOOGLE_TEST_UNIT_IDS.interstitial && Object.values(GOOGLE_TEST_UNIT_IDS).every((id) => isTestId(id)));
  check('dispositivos de prueba: modo test incluye EMULATOR + configurados', JSON.stringify(resolveTestDeviceIds(env({ testMode: 'true', testDeviceIds: 'AAA, BBB' }))) === JSON.stringify(['EMULATOR', 'AAA', 'BBB']));
  check('dispositivos de prueba: produccion/off NO incluyen EMULATOR', !resolveTestDeviceIds(env({ productionOptIn: 'true', testDeviceIds: 'AAA' })).includes('EMULATOR') && !resolveTestDeviceIds(env({})).includes('EMULATOR'));

  const requireFromMobile = createRequire(join(MOBILE_ROOT, 'package.json'));
  let testIdsSrc = '';
  try {
    testIdsSrc = readText(join(dirname(requireFromMobile.resolve('react-native-google-mobile-ads/package.json')), 'src', 'TestIds.ts'));
  } catch {
    testIdsSrc = '';
  }
  const android = testIdsSrc.match(/android:\s*\{([\s\S]*?)\n\s*\},\s*\n\s*ios:/)?.[1] ?? '';
  const pick = (key: string) => android.match(new RegExp(`${key}:\\s*'([^']+)'`))?.[1];
  check('GOOGLE_TEST_UNIT_IDS.banner == TestIds.ADAPTIVE_BANNER (Android) de la libreria', pick('ADAPTIVE_BANNER') === GOOGLE_TEST_UNIT_IDS.banner);
  check('GOOGLE_TEST_UNIT_IDS.interstitial == TestIds.INTERSTITIAL (Android) de la libreria', pick('INTERSTITIAL') === GOOGLE_TEST_UNIT_IDS.interstitial);
}

// --- 5. codigo fuente --------------------------------------------------------
console.log('--- 5. fuente: PG + TEEN antes de initialize, SDK aislado, sin placements ---');
{
  const sdkRaw = readMobile('lib', 'ads', 'ads-sdk.ts');
  const sdk = stripComments(sdkRaw);
  check('ads-sdk: maxAdContentRating = MaxAdContentRating.PG', /maxAdContentRating:\s*ads\.MaxAdContentRating\.PG\b/.test(sdk));
  check('ads-sdk: ageRestrictedTreatment = AgeRestrictedTreatment.TEEN (TFAT)', /ageRestrictedTreatment:\s*ads\.AgeRestrictedTreatment\.TEEN\b/.test(sdk));
  const iConfig = sdk.indexOf('await mobileAds().setRequestConfiguration(');
  const iInit = sdk.indexOf('await mobileAds().initialize()');
  check('ads-sdk: setRequestConfiguration se AWAITA ANTES de initialize()', iConfig > -1 && iInit > -1 && iConfig < iInit);
  check('ads-sdk: initialize() aparece UNA sola vez', (sdk.match(/\.initialize\(/g) ?? []).length === 1);
  check("ads-sdk: el SDK se importa DINAMICAMENTE (await import('react-native-google-mobile-ads'))", /await import\('react-native-google-mobile-ads'\)/.test(sdk) && !/^\s*import\b[^;]*from\s+'react-native-google-mobile-ads'/m.test(sdk));
  check('ads-sdk: inicializacion idempotente por proceso (memoizada y reintentable)', /let initialization: Promise<void> \| null/.test(sdk) && /initialization = null;/.test(sdk));
  check('ads-sdk: NO solicita anuncios (sin load/show/BannerAd/InterstitialAd)', !/\.load\(|\.show\(|BannerAd|InterstitialAd|RewardedAd|AppOpenAd|requestInfoUpdate|gatherConsent/.test(sdk));
  check('ads-sdk: documenta que la inicializacion es por PROCESO y que no existe "desinicializar" (sin promesa falsa)', /por PROCESO/.test(sdkRaw) && /desinicializar/.test(sdkRaw));
  check('ads-sdk: NO inventa un workaround de desinicializacion', !/uninitialize|deinit|\.destroy\(|AppState|BackHandler|restart|reload|RNRestart/i.test(sdk));

  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'android' || name.startsWith('.')) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx|js)$/.test(name)) out.push(full);
    }
    return out;
  };
  const appFiles = ['app', 'lib', 'components'].flatMap((d) => (existsSync(join(MOBILE_ROOT, d)) ? walk(join(MOBILE_ROOT, d)) : []));
  const rel = (f: string) => relative(MOBILE_ROOT, f).replace(/\\/g, '/');
  const withLib = appFiles.filter((f) => /react-native-google-mobile-ads/.test(stripComments(readText(f)))).map(rel);
  const LIB_ALLOWED = ['components/ads/ads-banner-view.tsx', 'lib/ads/ads-interstitial-sdk.ts', 'lib/ads/ads-sdk.ts'];
  check(`SOLO 3 archivos tocan react-native-google-mobile-ads: ads-sdk.ts (init), ads-interstitial-sdk.ts y ads-banner-view.tsx (encontrado: ${withLib.join(', ') || 'ninguno'})`, JSON.stringify([...withLib].sort()) === JSON.stringify(LIB_ALLOWED));
  const deprecated = appFiles.filter((f) => /tagForChildDirectedTreatment|tagForUnderAgeOfConsent|NativeModules\.RNGoogleMobileAds|RNGoogleMobileAdsModule/.test(stripComments(readText(f)))).map(rel);
  check(`sin TFUA/TFCD ni llamadas directas al modulo nativo${deprecated.length ? ` (${deprecated.join(', ')})` : ''}`, deprecated.length === 0);
  const placementRe = /\bBannerAd\b|\bInterstitialAd\b|useInterstitialAd|useRewardedAd|\bRewardedAd\b|\bAppOpenAd\b|\bNativeAd\b|\bAdBannerSlot\b|\bCompetirInterstitialController\b/;
  const placementOffenders = appFiles.filter((f) => placementRe.test(stripComments(readText(f)))).map(rel);
  const placementOutsideAdapters = placementOffenders.filter((f) => f !== 'components/ads/ads-banner-view.tsx' && f !== 'lib/ads/ads-interstitial-sdk.ts');
  check(`las clases de anuncio (BannerAd/InterstitialAd/...) solo aparecen en los 2 adaptadores del SDK, nunca en pantallas ni en otros modulos${placementOutsideAdapters.length ? ` (${placementOutsideAdapters.join(', ')})` : ''}`, placementOutsideAdapters.length === 0);
  const useAdsConsumers = appFiles.filter((f) => /\buseAds\b/.test(stripComments(readText(f)))).map(rel).sort();
  check(`useAds() solo lo consumen el provider, el hook del intersticial y el placement de banner (encontrado: ${useAdsConsumers.join(', ')})`, JSON.stringify(useAdsConsumers) === JSON.stringify(['components/ads/ads-banner-placement.tsx', 'lib/ads/ads-provider.tsx', 'lib/ads/use-quick-exit-interstitial.ts']));
  const prodIdOffenders = appFiles.filter((f) => [...stripComments(readText(f)).matchAll(/ca-app-pub-(\d{16})/g)].some((m) => m[1] !== GOOGLE_TEST_PUBLISHER)).map(rel);
  check(`ningun id de AdMob de produccion versionado en app/lib/components${prodIdOffenders.length ? ` (${prodIdOffenders.join(', ')})` : ''}`, prodIdOffenders.length === 0);

  const provider = stripComments(readMobile('lib', 'ads', 'ads-provider.tsx'));
  check('provider: no importa el SDK directamente (solo via ads-sdk)', !/react-native-google-mobile-ads/.test(provider));
  check('provider: consume auth + entitlement', /useAuth\(\)/.test(provider) && /useEntitlement\(\)/.test(provider) && /toAdsEntitlementInput\(entitlement\.state\)/.test(provider));
  check('provider: resuelve el modo de build con resolveAdsBuildMode y lo pasa a la politica', /resolveAdsBuildMode\(adUnitEnv\)/.test(provider) && /shouldInitializeSdk\(entitlementInput, configState, sdkState, mode\)/.test(provider) && /deriveAdsPhase\(entitlementInput, configState, sdkState, mode\)/.test(provider));
  check('provider: initializeAdsSdk se llama UNA vez y solo tras `if (!needsInit) return;`', (provider.match(/initializeAdsSdk\(/g) ?? []).length === 1 && provider.indexOf('if (!needsInit) return;') > -1 && provider.indexOf('if (!needsInit) return;') < provider.indexOf('initializeAdsSdk('));
  check('provider: la config remota se pide SOLO si shouldFetchAdsConfig (FREE + cuenta + modo != off) y se descarta si no', (provider.match(/shouldFetchAdsConfig\(entitlementInput, accountId, mode\)/g) ?? []).length === 2 && /setConfigEntry\(ADS_CONFIG_ENTRY_IDLE\)/.test(provider));
  check('provider: la config se guarda ETIQUETADA con la cuenta y se lee con scopeConfigToAccount(configEntry, accountId)', /setConfigEntry\(\{\s*accountId: forAccountId/.test(provider) && /scopeConfigToAccount\(configEntry, accountId\)/.test(provider));
  check('provider: el efecto de config depende de accountId y entitlement (se re-ejecuta en cada cambio de cuenta) y usa un contador de generacion', /\[entitlementInput, accountId, mode, fetchConfig\]/.test(provider) && /generationRef\.current \+= 1/.test(provider) && /generation !== generationRef\.current/.test(provider));
  check('provider: un error de config => estado error (fail-closed), no un valor optimista', /result\.ok \? \{ status: 'ready', config: result\.data \} : \{ status: 'error' \}/.test(provider));
  check('provider: sdkState NO se resetea al cambiar de cuenta (es un hecho del proceso)', !/setSdkState\('idle'\)/.test(provider) && /prev === 'failed' \? 'idle' : prev/.test(provider));
  check('provider: useAds fuera del proveedor devuelve TODO apagado', /useContext\(AdsContext\) \?\? ADS_OFF/.test(provider) && /ready: false/.test(provider));
  check('provider: la config expuesta es effectiveAdsConfig (OFF salvo ready)', /config: effectiveAdsConfig\(phase, configState\)/.test(provider));
  check("provider: el log de QA solo corre en modo 'test' y NO incluye cuenta/email", /if \(mode !== 'test'\) return;\s*console\.info\(`\[ads\] mode=\$\{mode\} entitlement=\$\{entitlementInput\} phase=\$\{phase\} sdk=\$\{sdkState\}`\)/.test(provider) && (provider.match(/console\./g) ?? []).length === 1);

  const api = stripComments(readMobile('lib', 'api', 'ads.ts'));
  check("lib/api/ads.ts: GET /me/ads-config validado con adsConfigResponseSchema (strict)", /'GET', '\/me\/ads-config'/.test(api) && /schema: adsConfigResponseSchema/.test(api));

  const layout = stripComments(readMobile('app', '_layout.tsx'));
  check('_layout: anidado congelado Entitlement > Billing > Paywall > ThemedRootNavigator intacto', /<EntitlementProvider>\s*<BillingProvider>\s*<PaywallProvider>\s*<ThemedRootNavigator \/>\s*<\/PaywallProvider>\s*<\/BillingProvider>\s*<\/EntitlementProvider>/.test(layout));
  const fnStart = layout.indexOf('function ThemedRootNavigator()');
  const fnEnd = layout.indexOf('function RootNavigator()');
  check('_layout: exactamente UN AdsProvider, DENTRO de ThemedRootNavigator (debajo de Auth + Entitlement)', (layout.match(/<AdsProvider>/g) ?? []).length === 1 && layout.indexOf('<AdsProvider>') > fnStart && layout.indexOf('<AdsProvider>') < fnEnd && layout.indexOf('<AuthProvider>') < layout.indexOf('<EntitlementProvider>') && layout.indexOf('<EntitlementProvider>') < layout.indexOf('<ThemedRootNavigator />'));
}

// --- 6. app.json + .env.example + release-candidate -------------------------
console.log('--- 6. app.json (App ID real), documentacion de entorno y modo release-candidate ---');
{
  const appJson = JSON.parse(readMobile('app.json'));
  const plugins: unknown[] = appJson.expo?.plugins ?? [];
  const entries = plugins.filter((p) => (Array.isArray(p) ? p[0] : p) === 'react-native-google-mobile-ads');
  const opts = (Array.isArray(entries[0]) ? entries[0][1] : {}) as { androidAppId?: string; delayAppMeasurementInit?: boolean };
  check('app.json: exactamente UNA entrada del plugin react-native-google-mobile-ads', entries.length === 1);
  check('plugin: androidAppId con forma valida (usa "~", no "/")', typeof opts.androidAppId === 'string' && /^ca-app-pub-\d{16}~\d{10}$/.test(opts.androidAppId));
  check('plugin: androidAppId NO es el App ID de muestra de Google', opts.androidAppId !== SAMPLE_APP_ID && !(opts.androidAppId ?? '').includes(GOOGLE_TEST_PUBLISHER));
  check('plugin: delayAppMeasurementInit === true', opts.delayAppMeasurementInit === true);
  check('plugin: solo androidAppId y delayAppMeasurementInit (nada mas)', JSON.stringify(Object.keys(opts).sort()) === JSON.stringify(['androidAppId', 'delayAppMeasurementInit']));
  check('app.json no contiene ids de UNIDAD de anuncio (solo el App ID, que no es secreto)', !/ca-app-pub-\d{16}\/\d{10}/.test(JSON.stringify(appJson)));

  const envExample = readMobile('.env.example');
  for (const key of ['EXPO_PUBLIC_ADMOB_TEST_MODE', 'EXPO_PUBLIC_ADMOB_PRODUCTION_IDS', 'EXPO_PUBLIC_ADMOB_BANNER_HOME_ID', 'EXPO_PUBLIC_ADMOB_BANNER_STUDY_ID', 'EXPO_PUBLIC_ADMOB_BANNER_COMPETE_ID', 'EXPO_PUBLIC_ADMOB_INTERSTITIAL_QUICK_EXIT_ID', 'EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS']) {
    check(`.env.example documenta ${key} (comentada)`, new RegExp(`^# ${key}=`, 'm').test(envExample) || new RegExp(`^#   ${key}=`, 'm').test(envExample));
  }
  check('.env.example documenta SMOKE QA y PRODUCTION RELEASE y que una variable olvidada => SIN anuncios', /SMOKE QA/.test(envExample) && /PRODUCTION RELEASE/.test(envExample) && /OLVIDADA => SIN anuncios/.test(envExample));
  check('.env.example no activa ninguna variable ADMOB (todas comentadas)', !/^EXPO_PUBLIC_ADMOB_/m.test(envExample));

  // Logica release-candidate: fixtures.
  const goodApp = { expo: { plugins: [['react-native-google-mobile-ads', { androidAppId: 'ca-app-pub-1111222233334444~1234567890', delayAppMeasurementInit: true }]] } };
  const goodIds = { EXPO_PUBLIC_ADMOB_PRODUCTION_IDS: 'true', EXPO_PUBLIC_ADMOB_BANNER_HOME_ID: 'ca-app-pub-1111222233334444/1000000001', EXPO_PUBLIC_ADMOB_BANNER_STUDY_ID: 'ca-app-pub-1111222233334444/1000000002', EXPO_PUBLIC_ADMOB_BANNER_COMPETE_ID: 'ca-app-pub-1111222233334444/1000000003', EXPO_PUBLIC_ADMOB_INTERSTITIAL_QUICK_EXIT_ID: 'ca-app-pub-1111222233334444/1000000004' };
  const goodBase = { EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com', EXPO_PUBLIC_AUTH_IDENTITY_CLIENT: 'firebase' };
  const rc = (over: Partial<ReleaseCandidateInput>) =>
    evaluateReleaseCandidate({
      appJson: goodApp,
      requireUnitIds: false,
      ...over,
      releaseEnv: over.releaseEnv === undefined ? { ...goodBase } : over.releaseEnv === null ? null : { ...goodBase, ...over.releaseEnv },
    });
  check('RC (fixture): ADS-1B.1 sin ids de unidad y test mode APAGADO -> sin problemas', rc({}).length === 0);
  check('RC (fixture): entorno de release con TEST_MODE=true -> RECHAZA', rc({ releaseEnv: { EXPO_PUBLIC_ADMOB_TEST_MODE: 'true' } }).length === 1);
  check('RC (fixture): sin .env.production -> RECHAZA', rc({ releaseEnv: null }).length > 0);
  // Fuga del .env de QA: precedencia real de Expo (production > .env) con un .env de QA al final.
  const qaEnv = { EXPO_PUBLIC_API_BASE_URL: 'http://localhost:3000', EXPO_PUBLIC_AUTH_IDENTITY_CLIENT: 'stub', EXPO_PUBLIC_ADMOB_TEST_MODE: 'true' };
  const prodEnvNoAds = { EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com', EXPO_PUBLIC_AUTH_IDENTITY_CLIENT: 'firebase', ...goodIds };
  const leaked = mergeReleaseEnv([null, null, prodEnvNoAds, qaEnv], prodEnvNoAds);
  check('mergeReleaseEnv: la primera definicion gana (production pisa a .env en API e identidad) pero .env RELLENA TEST_MODE', leaked !== null && leaked.EXPO_PUBLIC_API_BASE_URL === 'https://api.example.com' && leaked.EXPO_PUBLIC_AUTH_IDENTITY_CLIENT === 'firebase' && leaked.EXPO_PUBLIC_ADMOB_TEST_MODE === 'true');
  check('RC (fixture): un .env de QA con TEST_MODE=true que se filtra al build de produccion -> RECHAZA', rc({ requireUnitIds: true, releaseEnv: leaked }).length === 1);
  check('RC (fixture): API local / http o identidad stub efectivas -> RECHAZA', rc({ releaseEnv: { EXPO_PUBLIC_API_BASE_URL: 'http://localhost:3000' } }).length === 1 && rc({ releaseEnv: { EXPO_PUBLIC_API_BASE_URL: 'https://localhost:3000' } }).length === 1 && rc({ releaseEnv: { EXPO_PUBLIC_AUTH_IDENTITY_CLIENT: 'stub' } }).length === 1);
  const cleanMerged = mergeReleaseEnv([null, null, prodEnvNoAds, null], prodEnvNoAds);
  check('RC (fixture): sin .env de QA el entorno efectivo es valido', cleanMerged !== null && rc({ requireUnitIds: true, releaseEnv: cleanMerged }).length === 0);
  check('RC (fixture): App ID de muestra -> RECHAZA', rc({ appJson: { expo: { plugins: [['react-native-google-mobile-ads', { androidAppId: SAMPLE_APP_ID, delayAppMeasurementInit: true }]] } } }).length > 0);
  check('RC (fixture): delayAppMeasurementInit ausente -> RECHAZA', rc({ appJson: { expo: { plugins: [['react-native-google-mobile-ads', { androidAppId: 'ca-app-pub-1111222233334444~1234567890' }]] } } }).length === 1);
  check('RC (fixture): plugin ausente o duplicado -> RECHAZA', rc({ appJson: { expo: { plugins: [] } } }).length > 0 && rc({ appJson: { expo: { plugins: [...goodApp.expo.plugins, ...goodApp.expo.plugins] } } }).length > 0);
  check('RC (fixture): ids de unidad requeridos y validos -> sin problemas', rc({ requireUnitIds: true, releaseEnv: goodIds }).length === 0);
  check('RC (fixture): ids requeridos pero ausentes / de prueba / sin opt-in -> RECHAZA', rc({ requireUnitIds: true, releaseEnv: {} }).length === 5 && rc({ requireUnitIds: true, releaseEnv: { ...goodIds, EXPO_PUBLIC_ADMOB_BANNER_HOME_ID: GOOGLE_TEST_UNIT_IDS.banner } }).length === 1 && rc({ requireUnitIds: true, releaseEnv: { ...goodIds, EXPO_PUBLIC_ADMOB_PRODUCTION_IDS: 'false' } }).length === 1);

  const productionFile = parseEnvFile(join(MOBILE_ROOT, '.env.production'));
  const releaseEnv = mergeReleaseEnv(['.env.production.local', '.env.local', '.env.production', '.env'].map((name) => parseEnvFile(join(MOBILE_ROOT, name))), productionFile);
  if (process.env.ADS_RELEASE_CANDIDATE === '1') {
    const problems = evaluateReleaseCandidate({ appJson, releaseEnv, requireUnitIds: process.env.ADS_REQUIRE_UNIT_IDS === '1' });
    check(`RELEASE-CANDIDATE (ADS_RELEASE_CANDIDATE=1) sobre el repo${problems.length ? `: ${problems.join('; ')}` : ''}`, problems.length === 0);
  } else if (releaseEnv?.EXPO_PUBLIC_ADMOB_TEST_MODE === 'true') {
    warn('smoke: el entorno EFECTIVO de un build de produccion tiene EXPO_PUBLIC_ADMOB_TEST_MODE=true (.env.production o un .env de QA). Permitido solo para builds de QA; un build publico exige ADS_RELEASE_CANDIDATE=1 y mover el .env de QA.');
  }
}

if (failures > 0) {
  console.error(`\n${failures} verificacion(es) del gate ADS-1B fallaron.`);
  process.exit(1);
}
console.log('\nTodas las verificaciones del gate ADS-1B / 1B.1 (fundacion de publicidad) pasaron.');
