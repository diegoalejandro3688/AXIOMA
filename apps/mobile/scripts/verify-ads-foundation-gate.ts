// Gate ADS-1B -- fundacion de publicidad (AdsProvider + entitlement gate + kill
// switch remoto). Verificacion DETERMINISTA: Node puro, sin React Native, sin el
// SDK, sin red. No inicializa el SDK ni solicita ningun anuncio.
//
// Protege:
//   1. RNGMA exacto 17.0.0 + el gate de parche TFAT sigue pasando.
//   2. Politica de elegibilidad (maquina de estados PURA): Premium / entitlement
//      sin resolver / config fallida o apagada NUNCA inicializan ni quedan
//      `ready`; solo FREE + config habilitada inicializa. Propiedad exhaustiva:
//      `ready` => FREE confirmado + config habilitada + SDK listo.
//   3. Ids de unidad: dev/QA => SOLO ids de prueba oficiales de Google; la
//      produccion exige opt-in explicito, forma valida y NO ser id de prueba.
//   4. Codigo fuente: PG + TEEN configurados ANTES de initialize(); SDK importado
//      dinamicamente y solo desde ads-sdk.ts; sin TFUA/TFCD; sin llamadas
//      directas al modulo nativo; sin placements (ADS-1C); sin ids de produccion
//      versionados; AdsProvider dentro de EntitlementProvider.
//   5. app.json: el plugin con el App ID real es un pendiente EXPLICITO del
//      operador (WARN); si esta presente se valida (formato, no es el id de
//      muestra, delayAppMeasurementInit). `ADS_REQUIRE_APP_ID=1` lo vuelve
//      obligatorio (usar en el gate de release).
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { ADS_CONFIG_OFF, type AdsConfigResponse } from '@axioma/contracts';
import {
  deriveAdsPhase,
  effectiveAdsConfig,
  isAdsReady,
  isPlacementEnabled,
  shouldInitializeSdk,
  toAdsEntitlementInput,
  type AdsConfigInput,
  type AdsEntitlementInput,
  type AdsPlacement,
  type AdsSdkInput,
} from '../lib/ads/ads-state';
import {
  GOOGLE_TEST_UNIT_IDS,
  isTestAdMode,
  resolveAdUnitId,
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

const FULL_CONFIG: AdsConfigResponse = {
  adsEnabled: true,
  bannerHomeEnabled: true,
  bannerStudyEnabled: true,
  bannerCompeteEnabled: true,
  interstitialCompeteEnabled: true,
  interstitialCooldownMinutes: 20,
  interstitialMaxPerSession: 1,
};

// --- 1. version exacta + gate del parche TFAT -------------------------------
console.log('--- 1. RNGMA exacto + gate de parche TFAT ---');
{
  const pkg = JSON.parse(readMobile('package.json'));
  check('react-native-google-mobile-ads fijado EXACTAMENTE a 17.0.0 (sin ^ ni ~)', pkg.dependencies?.['react-native-google-mobile-ads'] === '17.0.0');
  const tfat = spawnSync('pnpm', ['verify:ads-tfat-patch-gate'], { cwd: MOBILE_ROOT, shell: true, encoding: 'utf8' });
  check('verify:ads-tfat-patch-gate sigue pasando (TFAT/TEEN + nulabilidad RN 0.81)', tfat.status === 0);
}

// --- 2. politica de elegibilidad (pura) -------------------------------------
console.log('--- 2. elegibilidad: Premium / sin resolver / backend fallido NO inicializan ---');
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

  // Caso a caso (los 5 escenarios pedidos).
  const free = (c: AdsConfigInput, s: AdsSdkInput = 'idle') => ({ phase: deriveAdsPhase('FREE', c, s), init: shouldInitializeSdk('FREE', c, s) });
  check('FREE + adsEnabled=true (SDK sin iniciar) -> elegible: fase initializing y SE inicializa', free({ status: 'ready', config: FULL_CONFIG }).phase === 'initializing' && free({ status: 'ready', config: FULL_CONFIG }).init === true);
  check('FREE + adsEnabled=false -> disabled y NO se inicializa', free({ status: 'ready', config: ADS_CONFIG_OFF }).phase === 'disabled' && !free({ status: 'ready', config: ADS_CONFIG_OFF }).init);
  check('FREE + backend en error -> fase error y NO se inicializa', free({ status: 'error' }).phase === 'error' && !free({ status: 'error' }).init);
  check('FREE + config cargando/idle -> waiting_config y NO se inicializa', free({ status: 'loading' }).phase === 'waiting_config' && free({ status: 'idle' }).phase === 'waiting_config' && !free({ status: 'loading' }).init && !free({ status: 'idle' }).init);
  check('PREMIUM (config favorable, SDK incluso ya listo) -> disabled, NO ready, NO se inicializa', deriveAdsPhase('PREMIUM', { status: 'ready', config: FULL_CONFIG }, 'ready') === 'disabled' && !shouldInitializeSdk('PREMIUM', { status: 'ready', config: FULL_CONFIG }, 'idle'));
  check('entitlement loading -> waiting_entitlement y NO se inicializa', deriveAdsPhase('loading', { status: 'ready', config: FULL_CONFIG }, 'idle') === 'waiting_entitlement' && !shouldInitializeSdk('loading', { status: 'ready', config: FULL_CONFIG }, 'idle'));
  check('entitlement error -> disabled y NO se inicializa', deriveAdsPhase('error', { status: 'ready', config: FULL_CONFIG }, 'idle') === 'disabled' && !shouldInitializeSdk('error', { status: 'ready', config: FULL_CONFIG }, 'idle'));
  check('valor de entitlement inesperado -> disabled (fail-closed)', deriveAdsPhase('GOLD' as AdsEntitlementInput, { status: 'ready', config: FULL_CONFIG }, 'ready') === 'disabled');
  check('SDK ya en initializing -> NO se solicita una segunda inicializacion', !shouldInitializeSdk('FREE', { status: 'ready', config: FULL_CONFIG }, 'initializing'));
  check('SDK listo -> fase ready', deriveAdsPhase('FREE', { status: 'ready', config: FULL_CONFIG }, 'ready') === 'ready');
  check('SDK fallido -> fase error (sin anuncios)', deriveAdsPhase('FREE', { status: 'ready', config: FULL_CONFIG }, 'failed') === 'error');

  // Propiedad exhaustiva sobre TODAS las combinaciones.
  let violations = 0;
  let combos = 0;
  for (const e of entitlements)
    for (const [, c] of configs)
      for (const s of sdks) {
        combos++;
        const phase = deriveAdsPhase(e, c, s);
        const init = shouldInitializeSdk(e, c, s);
        const eligible = e === 'FREE' && c.status === 'ready' && c.config.adsEnabled;
        if (isAdsReady(phase) && !(eligible && s === 'ready')) violations++;
        if (init && !(eligible && s === 'idle')) violations++;
        if (e !== 'FREE' && (isAdsReady(phase) || init)) violations++;
        const ec = effectiveAdsConfig(phase, c);
        if (!isAdsReady(phase) && JSON.stringify(ec) !== JSON.stringify(ADS_CONFIG_OFF)) violations++;
        for (const p of ['bannerHome', 'bannerStudy', 'bannerCompete', 'interstitialQuickExit'] as AdsPlacement[]) {
          if (isPlacementEnabled(phase, c, p) && !(eligible && s === 'ready')) violations++;
        }
      }
  check(`PROPIEDAD (${combos} combinaciones): ready/inicializar/placements => FREE + config habilitada (+ SDK listo)`, violations === 0);

  const readyFree = deriveAdsPhase('FREE', { status: 'ready', config: { ...FULL_CONFIG, bannerStudyEnabled: false } }, 'ready');
  check('kill switch por placement: bannerStudy apagado -> false; los demas siguen segun config', !isPlacementEnabled(readyFree, { status: 'ready', config: { ...FULL_CONFIG, bannerStudyEnabled: false } }, 'bannerStudy') && isPlacementEnabled(readyFree, { status: 'ready', config: { ...FULL_CONFIG, bannerStudyEnabled: false } }, 'bannerHome'));
  check('toAdsEntitlementInput mapea loading/error/FREE/PREMIUM y trata un tier desconocido como error', toAdsEntitlementInput({ status: 'loading' }) === 'loading' && toAdsEntitlementInput({ status: 'error' }) === 'error' && toAdsEntitlementInput({ status: 'ready', tier: 'FREE' }) === 'FREE' && toAdsEntitlementInput({ status: 'ready', tier: 'PREMIUM' }) === 'PREMIUM' && toAdsEntitlementInput({ status: 'ready', tier: 'GOLD' }) === 'error');
}

// --- 3. ids de unidad / modo prueba -----------------------------------------
console.log('--- 3. ids de unidad: dev/QA usa SOLO ids de prueba de Google ---');
{
  const PROD_BANNER = 'ca-app-pub-1111222233334444/1234567890';
  const PROD_INTER = 'ca-app-pub-1111222233334444/0987654321';
  const env = (over: Partial<AdUnitEnv>): AdUnitEnv => ({ isDev: false, productionOptIn: undefined, testDeviceIds: undefined, ids: { bannerHome: PROD_BANNER, bannerStudy: PROD_BANNER, bannerCompete: PROD_BANNER, interstitialQuickExit: PROD_INTER }, ...over });
  const placements: AdsPlacement[] = ['bannerHome', 'bannerStudy', 'bannerCompete', 'interstitialQuickExit'];

  check('__DEV__ con ids de produccion presentes -> SIEMPRE ids de prueba (nunca produccion)', placements.every((p) => resolveAdUnitId(p, env({ isDev: true, productionOptIn: 'true' }))?.startsWith(`ca-app-pub-${GOOGLE_TEST_PUBLISHER}/`)));
  check('release SIN opt-in -> ids de prueba (un build de QA no genera trafico real)', placements.every((p) => resolveAdUnitId(p, env({}))?.startsWith(`ca-app-pub-${GOOGLE_TEST_PUBLISHER}/`)));
  for (const bad of ['TRUE', '1', 'yes', ' true', 'false', '']) {
    check(`opt-in ${JSON.stringify(bad)} (no el literal "true") -> sigue en modo prueba`, isTestAdMode(env({ productionOptIn: bad })));
  }
  check('release CON opt-in "true" + ids validos -> ids de produccion', resolveAdUnitId('bannerHome', env({ productionOptIn: 'true' })) === PROD_BANNER && resolveAdUnitId('interstitialQuickExit', env({ productionOptIn: 'true' })) === PROD_INTER);
  check('opt-in + id AUSENTE -> null (fail-closed, sin fallback)', resolveAdUnitId('bannerStudy', env({ productionOptIn: 'true', ids: {} })) === null);
  check('opt-in + id con forma invalida -> null', resolveAdUnitId('bannerStudy', env({ productionOptIn: 'true', ids: { bannerStudy: 'not-an-id' } })) === null);
  check('opt-in + id de prueba de Google como "produccion" -> null', resolveAdUnitId('bannerCompete', env({ productionOptIn: 'true', ids: { bannerCompete: GOOGLE_TEST_UNIT_IDS.banner } })) === null);
  check('banner y intersticial usan ids de prueba distintos y oficiales', GOOGLE_TEST_UNIT_IDS.banner !== GOOGLE_TEST_UNIT_IDS.interstitial && Object.values(GOOGLE_TEST_UNIT_IDS).every((id) => id.startsWith(`ca-app-pub-${GOOGLE_TEST_PUBLISHER}/`)));
  check('dispositivos de prueba: modo prueba incluye EMULATOR + los configurados', JSON.stringify(resolveTestDeviceIds(env({ isDev: true, testDeviceIds: 'AAA, BBB' }))) === JSON.stringify(['EMULATOR', 'AAA', 'BBB']));
  check('dispositivos de prueba: produccion NO incluye EMULATOR', !resolveTestDeviceIds(env({ productionOptIn: 'true', testDeviceIds: 'AAA' })).includes('EMULATOR'));

  // Los ids de prueba coinciden con TestIds de la libreria (Android).
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

// --- 4. codigo fuente --------------------------------------------------------
console.log('--- 4. fuente: PG + TEEN antes de initialize, SDK aislado, sin placements ---');
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
  check(`SOLO lib/ads/ads-sdk.ts toca react-native-google-mobile-ads (encontrado: ${withLib.join(', ') || 'ninguno'})`, withLib.length === 1 && withLib[0] === 'lib/ads/ads-sdk.ts');

  const offendersDeprecated = appFiles.filter((f) => /tagForChildDirectedTreatment|tagForUnderAgeOfConsent|NativeModules\.RNGoogleMobileAds|RNGoogleMobileAdsModule/.test(stripComments(readText(f)))).map(rel);
  check(`sin TFUA/TFCD ni llamadas directas al modulo nativo${offendersDeprecated.length ? ` (${offendersDeprecated.join(', ')})` : ''}`, offendersDeprecated.length === 0);

  const placementRe = /\bBannerAd\b|\bInterstitialAd\b|useInterstitialAd|useRewardedAd|\bRewardedAd\b|\bAppOpenAd\b|\bNativeAd\b|\bAdBannerSlot\b|\bCompetirInterstitialController\b/;
  const placementOffenders = appFiles.filter((f) => placementRe.test(stripComments(readText(f)))).map(rel);
  check(`NO existen placements ni contenedores de anuncio (ADS-1C)${placementOffenders.length ? ` (${placementOffenders.join(', ')})` : ''}`, placementOffenders.length === 0);
  check('ninguna pantalla ni componente consume useAds todavia', !appFiles.filter((f) => rel(f).startsWith('app/') || rel(f).startsWith('components/')).some((f) => /\buseAds\b/.test(stripComments(readText(f)))));
  check('no existe components/ads/', !existsSync(join(MOBILE_ROOT, 'components', 'ads')));

  const prodIdOffenders = appFiles.filter((f) => [...stripComments(readText(f)).matchAll(/ca-app-pub-(\d{16})/g)].some((m) => m[1] !== GOOGLE_TEST_PUBLISHER)).map(rel);
  check(`ningun id de AdMob de produccion versionado en app/lib/components${prodIdOffenders.length ? ` (${prodIdOffenders.join(', ')})` : ''}`, prodIdOffenders.length === 0);

  const provider = stripComments(readMobile('lib', 'ads', 'ads-provider.tsx'));
  check('provider: no importa el SDK directamente (solo via ads-sdk)', !/react-native-google-mobile-ads/.test(provider));
  check('provider: consume auth + entitlement', /useAuth\(\)/.test(provider) && /useEntitlement\(\)/.test(provider) && /toAdsEntitlementInput\(entitlement\.state\)/.test(provider));
  check('provider: initializeAdsSdk se llama UNA vez y solo tras `if (!needsInit) return;`', (provider.match(/initializeAdsSdk\(/g) ?? []).length === 1 && provider.indexOf('if (!needsInit) return;') > -1 && provider.indexOf('if (!needsInit) return;') < provider.indexOf('initializeAdsSdk('));
  check('provider: needsInit proviene de shouldInitializeSdk (politica pura)', /const needsInit = shouldInitializeSdk\(/.test(provider));
  check("provider: la config remota solo se pide con FREE confirmado (`entitlementInput !== 'FREE'` corta)", /if \(entitlementInput !== 'FREE' \|\| !accountId\)/.test(provider));
  check('provider: un error de config => estado error (fail-closed), no un valor optimista', /result\.ok \? \{ status: 'ready', config: result\.data \} : \{ status: 'error' \}/.test(provider));
  check('provider: useAds fuera del proveedor devuelve TODO apagado', /useContext\(AdsContext\) \?\? ADS_OFF/.test(provider) && /ready: false/.test(provider));
  check('provider: la config expuesta es effectiveAdsConfig (OFF salvo ready)', /config: effectiveAdsConfig\(phase, configState\)/.test(provider));

  const api = stripComments(readMobile('lib', 'api', 'ads.ts'));
  check("lib/api/ads.ts: GET /me/ads-config validado con adsConfigResponseSchema (strict)", /'GET', '\/me\/ads-config'/.test(api) && /schema: adsConfigResponseSchema/.test(api));

  const layout = stripComments(readMobile('app', '_layout.tsx'));
  // El anidado congelado Entitlement > Billing > Paywall > ThemedRootNavigator NO se altera
  // (lo protegen verify:entitlement-mobile / premium-paywall / mobile-billing-foundation).
  check('_layout: anidado congelado Entitlement > Billing > Paywall > ThemedRootNavigator intacto', /<EntitlementProvider>\s*<BillingProvider>\s*<PaywallProvider>\s*<ThemedRootNavigator \/>\s*<\/PaywallProvider>\s*<\/BillingProvider>\s*<\/EntitlementProvider>/.test(layout));
  check("_layout: AdsProvider importado de lib/ads/ads-provider", /import \{ AdsProvider \} from '\.\.\/lib\/ads\/ads-provider'/.test(layout));
  const fnStart = layout.indexOf('function ThemedRootNavigator()');
  const fnEnd = layout.indexOf('function RootNavigator()');
  const themed = fnStart > -1 && fnEnd > fnStart ? layout.slice(fnStart, fnEnd) : '';
  check('_layout: AdsProvider se monta DENTRO de ThemedRootNavigator (debajo de Auth + Entitlement)', /<AdsProvider>[\s\S]*<NavigationThemeProvider[\s\S]*<\/NavigationThemeProvider>[\s\S]*<\/AdsProvider>/.test(themed));
  check('_layout: exactamente UN AdsProvider y ninguno fuera de ThemedRootNavigator', (layout.match(/<AdsProvider>/g) ?? []).length === 1 && layout.indexOf('<AdsProvider>') > fnStart && layout.indexOf('<AdsProvider>') < fnEnd);
  check('_layout: AuthProvider y EntitlementProvider envuelven a ThemedRootNavigator (AdsProvider los consume)', layout.indexOf('<AuthProvider>') > -1 && layout.indexOf('<AuthProvider>') < layout.indexOf('<EntitlementProvider>') && layout.indexOf('<EntitlementProvider>') < layout.indexOf('<ThemedRootNavigator />'));
}

// --- 5. app.json: App ID real (pendiente explicito del operador) ------------
console.log('--- 5. app.json: plugin de AdMob ---');
{
  const appJson = JSON.parse(readMobile('app.json'));
  const plugins: unknown[] = appJson.expo?.plugins ?? [];
  const entry = plugins.find((p) => (Array.isArray(p) ? p[0] : p) === 'react-native-google-mobile-ads');
  const requireStrict = process.env.ADS_REQUIRE_APP_ID === '1';
  if (!entry) {
    if (requireStrict) check('app.json declara el plugin react-native-google-mobile-ads con el App ID real (ADS_REQUIRE_APP_ID=1)', false);
    else warn('PENDIENTE DEL OPERADOR: app.json aun NO declara el plugin react-native-google-mobile-ads. No hacer un build release hasta insertar el App ID real (ver reporte ADS-1B).');
  } else {
    const opts = (Array.isArray(entry) ? entry[1] : {}) as { androidAppId?: string; delayAppMeasurementInit?: boolean };
    check('plugin: androidAppId con forma valida ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX', typeof opts.androidAppId === 'string' && /^ca-app-pub-\d{16}~\d{10}$/.test(opts.androidAppId));
    check('plugin: androidAppId NO es el App ID de muestra de Google', opts.androidAppId !== SAMPLE_APP_ID && !(opts.androidAppId ?? '').includes(GOOGLE_TEST_PUBLISHER));
    check('plugin: delayAppMeasurementInit === true (la medicion del SDK no arranca antes de initialize())', opts.delayAppMeasurementInit === true);
  }
  check('app.json no contiene ids de UNIDAD de anuncio (solo el App ID, que no es secreto)', !/ca-app-pub-\d{16}\/\d{10}/.test(JSON.stringify(appJson)));
}

if (failures > 0) {
  console.error(`\n${failures} verificacion(es) del gate ADS-1B FALLARON.`);
  process.exit(1);
}
console.log('\nTodas las verificaciones del gate ADS-1B (fundacion de publicidad) pasaron.');
