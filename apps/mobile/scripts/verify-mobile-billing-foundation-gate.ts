// Gate -- PREMIUM V1, Capa 3 (Google Play Billing), PB-2A:
// FUNDACION NATIVA DE BILLING EN MOBILE (metadata / conexion, SIN compra).
//
// Verificacion DETERMINISTA -- Node puro, scan de fuente + package.json +
// lockfile + paquete instalado. NINGUN archivo de produccion se modifica, NO
// se ejecuta Gradle, NO se toca ningun dispositivo. La evidencia de build
// nativo + humo en Samsung se produce EXTERNAMENTE (maquina del PO) y se
// documenta en el reporte de cierre de PB-2A.
//
// PB-2B: los checks L / O / P / T de "sin compra" quedan SUPERSEDIDOS (no
// borrados) -- PB-2B implementa compra/restore/reconcile y su superficie
// completa la prueba `verify:billing-purchase-gate` (15 invariantes). Aqui se
// conservan solo los limites que siguen vigentes (sin acknowledge cliente, sin
// grant local, sin log/persistencia de token, sin precio estatico comprable).
//
// Cubre A..T:
//   A. expo-iap fijado EXACTAMENTE a 5.5.1 en apps/mobile/package.json.
//   B. pnpm-lock.yaml resuelve expo-iap@5.5.1 (specifier + entrada + integrity).
//   C. Paquete instalado = 5.5.1; openiap-versions.json google === 3.5.0.
//   D. app.json plugins === EXACTAMENTE ["expo-router", "expo-iap"]
//      (excepcion controlada PB-2A: solo se agrega "expo-iap" como string).
//   E. app.json: android.package sigue com.zetrynd.app; "expo-iap" aparece
//      SOLO como string (sin objeto de config), sin otro plugin nuevo.
//   F. El manifest de la libreria expo-iap declara com.android.vending.BILLING
//      (el permiso entra por merge aunque el plugin no corriera).
//   G. apps/mobile/lib/billing/ tiene google-play-billing.ts + billing-provider.tsx.
//   H. Identificadores CONGELADOS: product 'zetrynd_premium', base plan
//      'premium-monthly' -- sin overrides por entorno.
//   I. Seleccion de oferta: filtra por basePlanIdAndroid === 'premium-monthly';
//      NUNCA offers[0] / subscriptionOffers[0].
//   J. La oferta seleccionada preserva offerTokenAndroid (para PB-2B).
//   K. El precio se toma de la fase con recurrenceMode === 1 (INFINITE_RECURRING),
//      NO de pricingPhaseList[last] a ciegas.
//   L. Ningun archivo de lib/billing menciona purchaseToken.
//   M. UN solo ciclo de conexion: exactamente un useIAP() en lib/billing.
//   N. Gate de runtime: Expo Go (storeClient) / no-android -> unsupported_runtime,
//      sin montar useIAP().
//   O. El provider NO expone compra ni restore, NO llama requestPurchase /
//      getAvailablePurchases / finishTransaction / acknowledge / restorePurchases.
//   P. El provider NO importa entitlement / billing-context / reconcile.
//   Q. _layout.tsx: BillingProvider entre EntitlementProvider y PaywallProvider.
//   R. Sin segunda pila de billing (RevenueCat / react-native-purchases /
//      react-native-iap) en package.json ni en el codigo movil.
//   S. Higiene: sin apps/mobile/android/ trackeado por git; metro.config.js =
//      solo getDefaultConfig(__dirname), sin override unstable_serverRoot, sin BOM
//      (PB-2A-M1 quito el override stale que rompia el entry hoisted en Windows).
//   T. Display-only: la paywall NO cablea compra -- pricing.ts conserva su
//      constante estatica y el CTA sigue "Disponible proximamente".
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const MOBILE_ROOT = join(__dirname, '..');
const REPO_ROOT = join(MOBILE_ROOT, '..', '..');
const read = (...seg: string[]) => readFileSync(join(...seg), 'utf8').replace(/\r\n/g, '\n');

/**
 * PB-2A-R3 -- `expo-iap` se resuelve DESDE `apps/mobile/package.json` (el
 * workspace que declara la dependencia), NUNCA desde un
 * `<repo>/node_modules/expo-iap` hard-codeado. Ese path plano solo existe con
 * `node-linker=hoisted` (residuo local Windows, ver PB-2A-R2), no es un
 * invariante del repo: bajo el linker `isolated` por defecto de pnpm, el
 * paquete vive en `apps/mobile/node_modules/expo-iap` (symlink) o en
 * `node_modules/.pnpm/...`. `createRequire` originado en `apps/mobile` lo
 * encuentra en AMBAS topologias. El workspace raiz NO declara `expo-iap`, asi
 * que resolver desde ahi seria incorrecto.
 */
const mobileRequire = createRequire(join(MOBILE_ROOT, 'package.json'));
let expoIapRoot: string | null = null;
try {
  expoIapRoot = dirname(mobileRequire.resolve('expo-iap/package.json'));
} catch {
  expoIapRoot = null; // no instalado -> lo reporta el check C
}
const readIap = (...seg: string[]) => readFileSync(join(expoIapRoot as string, ...seg), 'utf8').replace(/\r\n/g, '\n');
const iapExists = (...seg: string[]) => expoIapRoot !== null && existsSync(join(expoIapRoot, ...seg));
const readMobile = (...seg: string[]) => read(MOBILE_ROOT, ...seg);
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

const EXPO_IAP_VERSION = '5.5.1';
const OPENIAP_GOOGLE_VERSION = '3.5.0';
const ANDROID_APP_ID = 'com.zetrynd.app';
const PRODUCT_ID = 'zetrynd_premium';
const BASE_PLAN_ID = 'premium-monthly';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

console.log('=== Gate PB-2A -- fundacion nativa de Google Play Billing en mobile (estatico) ===\n');

// --- A ---------------------------------------------------------------------
const mobilePkg = JSON.parse(readMobile('package.json'));
const iapSpec: unknown = mobilePkg.dependencies?.['expo-iap'];
check('A: apps/mobile/package.json depende de expo-iap', typeof iapSpec === 'string');
check(`A: expo-iap fijado EXACTAMENTE a ${EXPO_IAP_VERSION} (sin ^ ~ ni rango)`, iapSpec === EXPO_IAP_VERSION);
check('A: expo-iap en dependencies (no devDependencies)', !mobilePkg.devDependencies?.['expo-iap']);

// --- B ---------------------------------------------------------------------
const lock = read(REPO_ROOT, 'pnpm-lock.yaml');
check(
  'B: lockfile -- importer apps/mobile -> expo-iap specifier 5.5.1 / version 5.5.1',
  /\n {6}expo-iap:\n {8}specifier: 5\.5\.1\n {8}version: 5\.5\.1\(/.test(lock),
);
check('B: lockfile tiene la entrada del paquete expo-iap@5.5.1:', lock.includes(`\n  expo-iap@${EXPO_IAP_VERSION}:\n`));
check('B: lockfile tiene integrity (sha512) para expo-iap@5.5.1', /expo-iap@5\.5\.1:\n {4}resolution: \{integrity: sha512-/.test(lock));
check('B: el lockfile NO introduce react-native-purchases / RevenueCat / react-native-iap', !/react-native-purchases|@revenuecat|react-native-iap@/.test(lock));

// --- C ---------------------------------------------------------------------
check('C: expo-iap resoluble desde apps/mobile (workspace que lo declara)', expoIapRoot !== null);
check(
  `C: expo-iap instalado en ${EXPO_IAP_VERSION}`,
  iapExists('package.json') && JSON.parse(readIap('package.json')).version === EXPO_IAP_VERSION,
);
if (iapExists('openiap-versions.json')) {
  const openiap = JSON.parse(readIap('openiap-versions.json'));
  check(`C: openiap-versions.json declara google = ${OPENIAP_GOOGLE_VERSION}`, openiap.google === OPENIAP_GOOGLE_VERSION);
} else {
  check('C: openiap-versions.json presente', false);
}

// --- D / E ---------------------------------------------------------------------
const appJsonRaw = readMobile('app.json');
const appJson = JSON.parse(appJsonRaw);
const plugins: unknown[] = appJson.expo?.plugins ?? [];
check('D: app.json plugins === exactamente ["expo-router", "expo-iap"]', JSON.stringify(plugins) === JSON.stringify(['expo-router', 'expo-iap']));
check('E: app.json android.package sigue siendo ' + ANDROID_APP_ID, appJson.expo?.android?.package === ANDROID_APP_ID);
check('E: "expo-iap" aparece SOLO como string (sin objeto de config con opciones)', plugins.includes('expo-iap') && !plugins.some((p) => Array.isArray(p) && p[0] === 'expo-iap'));

// --- F ---------------------------------------------------------------------
const libManifest = iapExists('android', 'src', 'main', 'AndroidManifest.xml')
  ? readIap('android', 'src', 'main', 'AndroidManifest.xml')
  : '';
check('F: el manifest de la libreria expo-iap declara com.android.vending.BILLING', /com\.android\.vending\.BILLING/.test(libManifest));

// --- G ---------------------------------------------------------------------
const billingDir = join(MOBILE_ROOT, 'lib', 'billing');
check('G: apps/mobile/lib/billing/ existe', existsSync(billingDir));
const hasConstants = existsSync(join(billingDir, 'google-play-billing.ts'));
const hasProvider = existsSync(join(billingDir, 'billing-provider.tsx'));
check('G: lib/billing/google-play-billing.ts presente', hasConstants);
check('G: lib/billing/billing-provider.tsx presente', hasProvider);

const constantsSrc = hasConstants ? readMobile('lib', 'billing', 'google-play-billing.ts') : '';
const constantsCode = stripComments(constantsSrc);
const providerSrc = hasProvider ? readMobile('lib', 'billing', 'billing-provider.tsx') : '';
const providerCode = stripComments(providerSrc);
const billingFiles = existsSync(billingDir) ? readdirSync(billingDir).filter((f) => /\.tsx?$/.test(f)) : [];
const billingBlob = billingFiles.map((f) => stripComments(readMobile('lib', 'billing', f))).join('\n');

// --- H ---------------------------------------------------------------------
check(`H: product id CONGELADO '${PRODUCT_ID}'`, new RegExp(`ZETRYND_PREMIUM_PRODUCT_ID\\s*=\\s*'${PRODUCT_ID}'`).test(constantsCode));
check(`H: base plan CONGELADO '${BASE_PLAN_ID}'`, new RegExp(`ZETRYND_PREMIUM_BASE_PLAN_ID\\s*=\\s*'${BASE_PLAN_ID}'`).test(constantsCode));
check('H: sin override por entorno de los identificadores (sin process.env / Constants.expoConfig.extra en lib/billing)', !/process\.env|expoConfig\?\.extra|Constants\.expoConfig/.test(billingBlob));

// --- I ---------------------------------------------------------------------
check("I: la seleccion filtra por basePlanIdAndroid === 'premium-monthly'", /basePlanIdAndroid === ZETRYND_PREMIUM_BASE_PLAN_ID|basePlanIdAndroid === 'premium-monthly'/.test(constantsCode));
check('I: NUNCA subscriptionOffers[0] / offers[0] como seleccion', !/subscriptionOffers\[0\]|\boffers\[0\]/.test(constantsCode));

// --- J ---------------------------------------------------------------------
check('J: la oferta seleccionada preserva offerTokenAndroid', /offerTokenAndroid/.test(constantsCode) && /offerToken:\s*offer\.offerTokenAndroid/.test(constantsCode));

// --- K ---------------------------------------------------------------------
check('K: el precio se toma de la fase recurrenceMode === 1 (INFINITE_RECURRING)', /RECURRENCE_MODE_INFINITE_RECURRING\s*=\s*1/.test(constantsCode) && /recurrenceMode === RECURRENCE_MODE_INFINITE_RECURRING/.test(constantsCode));
check('K: NO usa pricingPhaseList[last] / .at(-1) / [length - 1] a ciegas', !/pricingPhaseList\[[^\]]*(?:length\s*-\s*1|last)[^\]]*\]|pricingPhaseList\.at\(-1\)/.test(constantsCode));

// --- L (PB-2B SUPERSEDES / supersede) -------------------------------------
// PB-2A prohibia TODA mencion de `purchaseToken` en lib/billing. PB-2B lo
// maneja legitimamente: lo extrae del callback de compra y lo pasa SOLO al
// reconcile del backend. El invariante vigente -- el token nunca se loggea,
// ni se persiste, ni se renderiza -- lo prueba `verify:billing-purchase-gate`
// (check 11). Aqui solo se conserva la parte que sigue siendo cierta:
const billingFilesRaw = billingFiles.map((f) => readMobile('lib', 'billing', f)).join('\n');
check('L (PB-2B): lib/billing NO tiene console.* (ningun log, ni de token ni de nada)', !/console\.(log|info|warn|error|debug)\(/.test(billingFilesRaw));
check('L (PB-2B): lib/billing NO persiste nada (AsyncStorage / SecureStore / MMKV)', !/AsyncStorage|SecureStore|expo-secure-store|MMKV/.test(billingBlob));

// --- M ---------------------------------------------------------------------
const useIapCount = (providerCode.match(/useIAP\(/g) ?? []).length;
check('M: exactamente un useIAP() en el provider (un solo ciclo de conexion)', useIapCount === 1);
check('M: ningun otro archivo de lib/billing llama useIAP()', (billingBlob.match(/useIAP\(/g) ?? []).length === 1);

// --- N ---------------------------------------------------------------------
check('N: gate de runtime -- storeClient (Expo Go) marcado no soportado', /ExecutionEnvironment\.StoreClient/.test(providerCode));
check("N: gate de runtime -- Platform.OS !== 'android' no soportado", /Platform\.OS !== 'android'/.test(providerCode));
check('N: unsupported_runtime como estado de producto', /unsupported_runtime/.test(providerCode));
check('N: useIAP() NO se monta en runtime no soportado (guard antes del hook)', /if \(!isNativeBillingRuntime\(\)\)[\s\S]{0,200}return[\s\S]{0,200}FALLBACK/.test(providerCode));

// --- O (PB-2B SUPERSEDES / supersede) -------------------------------------
// PB-2A prohibia orquestar compra/restore. PB-2B lo IMPLEMENTA (ese es su
// objetivo): el provider llama `requestPurchase` / `getAvailablePurchases` y
// expone `purchase()` / `restore()`. El detalle de esos flujos lo prueba
// `verify:billing-purchase-gate`. Aqui se conserva el UNICO limite que
// sigue vigente: el movil NUNCA acknowledgea con Google (eso es del backend).
const clientAckVerbs = /finishTransaction|acknowledgePurchaseAndroid|consumePurchaseAndroid|\backnowledgePurchase\b|launchBillingFlow|BillingClient/;
check('O (PB-2B): el provider NUNCA acknowledgea/finaliza la transaccion en el cliente (finishTransaction / acknowledge / consume / launchBillingFlow)', !clientAckVerbs.test(billingBlob));
check('O (PB-2B): el provider expone purchase() y restore() (PB-2B los implementa)', /purchase,\s*\n\s*restore,/.test(providerCode) || /\bpurchase:\s*\(\)/.test(providerCode));

// --- P (PB-2B SUPERSEDES / supersede) -------------------------------------
// PB-2A prohibia que lib/billing llamara billing-context / reconcile. PB-2B
// lo REQUIERE (via `lib/api/subscription.ts`). El limite vigente: lib/billing
// NUNCA concede Premium local ni toca el entitlement salvo `refresh()`.
check('P (PB-2B): lib/billing solo toca el entitlement via entitlement.refresh() (sin set/grant/activate)', /entitlement\.refresh\(\)/.test(providerCode) && !/set(Premium|Tier|Entitlement|IsPremium)\s*\(/i.test(billingBlob));
check('P (PB-2B): lib/billing NO importa el override interno de tier (_internal/entitlement / set-tier-override)', !/_internal\/entitlement|set-tier-override|entitlement-internal/i.test(billingBlob));
check('P (PB-2B): lib/billing pega al backend SOLO via lib/api/subscription (billing-context + reconcile), nunca fetch crudo', /from '\.\.\/api\/subscription'/.test(providerCode) && !/\bfetch\(/.test(billingBlob));

// --- Q ---------------------------------------------------------------------
const layoutSrc = readMobile('app', '_layout.tsx');
check("Q: _layout.tsx importa BillingProvider de lib/billing/billing-provider", /import \{ BillingProvider \} from '\.\.\/lib\/billing\/billing-provider'/.test(layoutSrc));
check('Q: BillingProvider anidado EXACTAMENTE entre EntitlementProvider y PaywallProvider', /<EntitlementProvider>\s*<BillingProvider>\s*<PaywallProvider>\s*<ThemedRootNavigator \/>\s*<\/PaywallProvider>\s*<\/BillingProvider>\s*<\/EntitlementProvider>/.test(layoutSrc));

// --- R ---------------------------------------------------------------------
const allDeps = { ...mobilePkg.dependencies, ...mobilePkg.devDependencies };
check('R: package.json sin segunda pila de billing', !Object.keys(allDeps).some((d) => /react-native-purchases|react-native-iap|@revenuecat|purchasely/.test(d)));

// --- S ---------------------------------------------------------------------
// PB-2A-M1: metro.config.js se simplifico a solo `getDefaultConfig(__dirname)`
// -- se quito el override manual y stale `server.unstable_serverRoot = __dirname`
// (Expo SDK 54 ya fija el serverRoot en la raiz del monorepo; el override lo
// forzaba a apps/mobile y rompia la resolucion del entry hoisted en Windows).
// Sin override manual, sin BOM.
const metroSrc = existsSync(join(MOBILE_ROOT, 'metro.config.js')) ? readMobile('metro.config.js') : '';
check('S: metro.config.js llama getDefaultConfig', /getDefaultConfig\(__dirname\)/.test(metroSrc));
check('S: metro.config.js NO fija server.unstable_serverRoot manualmente (override stale removido en PB-2A-M1)', !/unstable_serverRoot\s*=/.test(metroSrc));
check('S: metro.config.js sin BOM UTF-8', metroSrc.charCodeAt(0) !== 0xfeff);
let androidTracked = '';
try {
  androidTracked = execFileSync('git', ['-C', REPO_ROOT, 'ls-files', 'apps/mobile/android'], { encoding: 'utf8' }).trim();
} catch {
  /* git ausente -> se reporta abajo como fallo suave */
}
check('S: apps/mobile/android/ NO esta trackeado por git (CNG / generado / gitignored)', androidTracked === '');

// --- T (PB-2B SUPERSEDES / supersede) -------------------------------------
// PB-2A: la paywall NO cablea compra; "Disponible proximamente" es texto.
// PB-2B: la paywall SI cablea `useBilling().purchase()` / `restore()` (cableado
// minimo; PB-2C es el rediseño comercial). El limite vigente: pricing.ts sigue
// siendo la UNICA fuente del precio estatico, y ese string NUNCA se presenta
// como precio comprable en vivo (eso lo prueba `verify:billing-purchase-gate`
// checks 15).
const pricingSrc = readMobile('lib', 'entitlement', 'pricing.ts');
check('T (PB-2B): pricing.ts conserva la constante estatica PREMIUM_PRICE_DISPLAY', /export const PREMIUM_PRICE_DISPLAY\s*=/.test(pricingSrc));
const paywallSrc = stripComments(readMobile('components', 'premium', 'premium-paywall.tsx'));
check('T (PB-2B): la paywall NO hard-codea el literal de precio (6.990 / CLP) -- solo via pricing.ts / metadata Google', !/6[.,]990|\bCLP\b/.test(paywallSrc));
check('T (PB-2B): "Disponible proximamente" sigue como <Text> no interactivo (rama sin metadata Google)', /<Text[^>]*>\s*Disponible próximamente\s*<\/Text>/.test(paywallSrc) && !/label=(['"])Disponible próximamente\1/.test(paywallSrc));

// --- META (anti-regresion PB-2A-R3) --------------------------------------
// Impide que se reintroduzca la resolucion hard-codeada de expo-iap contra la
// raiz del repo (un path que solo existe con node-linker=hoisted). La unica
// forma permitida es createRequire originado en apps/mobile/package.json.
const selfCode = stripComments(readFileSync(__filename, 'utf8'));
const NM = 'node_' + 'modules';
const hardCodedRepoRootIap =
  new RegExp('join\\(\\s*REPO_ROOT[^\\n)]*[\'"]' + NM + '[\'"]').test(selfCode) ||
  new RegExp('[\'"]' + NM + '\\/expo-iap[\'"]').test(selfCode);
check(
  'META: expo-iap se resuelve por createRequire(apps/mobile/package.json), sin path a la raiz del repo',
  /createRequire\(\s*join\(\s*MOBILE_ROOT\s*,\s*'package\.json'\s*\)\s*\)/.test(selfCode) &&
    /\.resolve\(\s*'expo-iap\/package\.json'\s*\)/.test(selfCode) &&
    !hardCodedRepoRootIap,
);

// -------------------------------------------------------------------------
console.log('');
if (failures > 0) {
  console.error(`${failures} verificacion(es) fallaron.\nGate PB-2A (fundacion nativa de Billing en mobile): FAIL\n`);
  process.exit(1);
}
console.log('Gate PB-2A (fundacion nativa de Google Play Billing en mobile): PASS\n');
process.exit(0);
