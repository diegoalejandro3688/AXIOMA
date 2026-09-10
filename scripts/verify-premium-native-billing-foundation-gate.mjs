#!/usr/bin/env node
/**
 * Gate -- PREMIUM V1, Capa 3 (Google Play Billing), C3.5A:
 * FUNDACION NATIVA DE BILLING.
 *
 * ACTUALIZADO EN PB-2A (2026-09-10): PB-2A subio el pin a expo-iap 5.5.1,
 * aplico la EXCEPCION CONTROLADA de app.json (`plugins: ["expo-router",
 * "expo-iap"]`) e introdujo el provider `apps/mobile/lib/billing/`. Este gate
 * ahora afirma esa nueva postura autorizada. Lo que NO cambio: pin exacto,
 * integridad del lockfile, openiap-google 3.5.0, cero segunda pila de billing,
 * cero orquestacion de COMPRA (requestPurchase/launchBillingFlow/
 * finishTransaction/acknowledge/restore) en el codigo movil, android/ no
 * trackeado. El gate PB-2A dedicado es
 * apps/mobile/scripts/verify-mobile-billing-foundation-gate.ts (A..T).
 *
 * Verificacion ESTATICA y REPRODUCIBLE (Node puro, scan de fuente +
 * lockfile + paquete instalado). NO ejecuta Gradle, NO compila Android, NO
 * toca dispositivos -- esa evidencia se produjo EXTERNAMENTE en la maquina
 * Windows del Product Owner y se documenta en
 * docs/adr/PREMIUM-V1-LAYER-3-NATIVE-BILLING-FOUNDATION-CLOSURE-REPORT.md.
 *
 * Este gate SOLO afirma lo que un repo estatico puede probar:
 *   A. `expo-iap` fijado EXACTAMENTE a 5.5.1 en apps/mobile/package.json
 *      (sin `^` ni `~` ni rango).
 *   B. `pnpm-lock.yaml` contiene la resolucion de `expo-iap@5.5.1`
 *      (specifier del importer + entrada del paquete + integrity).
 *   C. El paquete `expo-iap@5.5.1` instalado declara, para Android,
 *      `openiap-google` 3.5.0 (`openiap-versions.json` + `android/build.gradle`).
 *      -> Segun la evidencia EXTERNA de `gradlew :app:dependencyInsight`,
 *         eso resuelve `com.android.billingclient:billing:9.1.0`. Este gate
 *         NO afirma probar esa resolucion de runtime -- solo que el paquete
 *         fijado la pide.
 *   D. Autolinking: `expo-module.config.json` declara el modulo Android
 *      `expo.modules.iap.ExpoIapModule`.
 *   E. `apps/mobile/app.json`: `android.package` sigue `com.zetrynd.app` y
 *      `plugins` === EXACTAMENTE `["expo-router", "expo-iap"]` -- la excepcion
 *      controlada de PB-2A agrega solo el string `"expo-iap"`, nada mas.
 *   F. `expo-iap` y el flujo de compra/restore (`requestPurchase` /
 *      `getAvailablePurchases`) viven SOLO en `apps/mobile/lib/billing/`
 *      (PB-2B). En NINGUN lado -- lib/billing incluido -- el CLIENTE
 *      acknowledgea/finaliza con Google (`finishTransaction` /
 *      `acknowledgePurchaseAndroid` / `consumePurchaseAndroid` /
 *      `launchBillingFlow` / `BillingClient`) ni hay una segunda pila de
 *      billing -- el acknowledge es 100% del backend.
 *   G. Higiene: `apps/mobile/metro.config.js` = solo `getDefaultConfig(__dirname)`
 *      (PB-2A-M1 quito el override stale `unstable_serverRoot`, sin BOM); sin
 *      `apps/mobile/android/` trackeado por git (CNG/generado/gitignored).
 *
 * Uso: node scripts/verify-premium-native-billing-foundation-gate.mjs
 * (equivalente a `pnpm run verify:premium-native-billing-foundation-gate`)
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const rel = (p) => new URL(p, new URL('../', import.meta.url));
// Normaliza CRLF -> LF: el repo se edita en Windows y varios archivos quedan con \r\n.
const read = (p) => readFileSync(rel(p), 'utf8').replace(/\r\n/g, '\n');

/**
 * PB-2A-R3 -- `expo-iap` se resuelve DESDE `apps/mobile/package.json` (el
 * workspace que declara la dependencia), NUNCA desde un
 * `<repo>/node_modules/expo-iap` hard-codeado: ese path plano solo existe con
 * `node-linker=hoisted` (residuo local Windows, PB-2A-R2), no es un invariante
 * del repo. Bajo el linker `isolated` por defecto de pnpm el paquete vive en
 * `apps/mobile/node_modules/expo-iap` (symlink) o en `node_modules/.pnpm/...`;
 * `createRequire` originado en `apps/mobile` lo encuentra en ambas topologias.
 */
const mobileRequire = createRequire(join(ROOT, 'apps', 'mobile', 'package.json'));
let expoIapRoot = null;
try {
  expoIapRoot = dirname(mobileRequire.resolve('expo-iap/package.json'));
} catch {
  expoIapRoot = null; // no instalado -> lo reporta el check C
}
const readIap = (...seg) => readFileSync(join(expoIapRoot, ...seg), 'utf8').replace(/\r\n/g, '\n');
const iapExists = (...seg) => expoIapRoot !== null && existsSync(join(expoIapRoot, ...seg));

const EXPO_IAP_VERSION = '5.5.1';
const OPENIAP_GOOGLE_VERSION = '3.5.0';
const ANDROID_APP_ID = 'com.zetrynd.app';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures += 1;
  }
}

console.log('=== Gate C3.5A -- fundacion nativa de Google Play Billing (estatico) ===\n');

// ---------------------------------------------------------------------------
// A. expo-iap fijado EXACTAMENTE a 5.5.0
// ---------------------------------------------------------------------------
const mobilePkg = JSON.parse(read('apps/mobile/package.json'));
const iapSpec = mobilePkg.dependencies?.['expo-iap'];
check(`A: apps/mobile/package.json depende de expo-iap`, typeof iapSpec === 'string');
check(`A: expo-iap fijado EXACTAMENTE a ${EXPO_IAP_VERSION} (sin ^ ~ ni rango)`, iapSpec === EXPO_IAP_VERSION);
check('A: expo-iap esta en dependencies (no devDependencies)', !(mobilePkg.devDependencies?.['expo-iap']));

// ---------------------------------------------------------------------------
// B. pnpm-lock.yaml contiene la resolucion de expo-iap@5.5.0
// ---------------------------------------------------------------------------
const lock = read('pnpm-lock.yaml');
check(
  'B: lockfile tiene el specifier del importer apps/mobile -> expo-iap: 5.5.1',
  /\n {6}expo-iap:\n {8}specifier: 5\.5\.1\n {8}version: 5\.5\.1\(/.test(lock),
);
check(`B: lockfile tiene la entrada del paquete expo-iap@${EXPO_IAP_VERSION}:`, lock.includes(`\n  expo-iap@${EXPO_IAP_VERSION}:\n`));
check('B: lockfile tiene integrity (sha512) para expo-iap@5.5.1', /expo-iap@5\.5\.1:\n {4}resolution: \{integrity: sha512-/.test(lock));
check(
  'B: en el lockfile expo-iap SOLO trae expo/react/react-native (sin deps npm nuevas)',
  /\n {2}expo-iap@5\.5\.1\([^\n]*\):\n {4}dependencies:\n {6}expo:[^\n]*\n {6}react: 19\.1\.0\n {6}react-native: 0\.81\.5[^\n]*\n\n/.test(lock),
);
// No hay segunda pila de billing en el lockfile.
check('B: el lockfile NO introduce react-native-purchases / RevenueCat', !/react-native-purchases|@revenuecat|react-native-iap@/.test(lock));

// ---------------------------------------------------------------------------
// C. El paquete instalado declara openiap-google 3.5.0 para Android
//    (la PBL 9.1.0 real la prueba la evidencia EXTERNA de Gradle)
// ---------------------------------------------------------------------------
check('C: expo-iap resoluble desde apps/mobile (workspace que lo declara)', expoIapRoot !== null);
check(`C: expo-iap instalado en version ${EXPO_IAP_VERSION}`, iapExists('package.json') && JSON.parse(readIap('package.json')).version === EXPO_IAP_VERSION);
if (iapExists('openiap-versions.json')) {
  const openiap = JSON.parse(readIap('openiap-versions.json'));
  check(`C: openiap-versions.json declara google = ${OPENIAP_GOOGLE_VERSION}`, openiap.google === OPENIAP_GOOGLE_VERSION);
} else {
  check('C: openiap-versions.json presente', false);
}
const iapGradle = iapExists('android', 'build.gradle') ? readIap('android', 'build.gradle') : '';
check(
  'C: android/build.gradle del modulo trae io.github.hyochan.openiap:openiap-google',
  /implementation "io\.github\.hyochan\.openiap:openiap-google:\$\{googleVersionString\}"/.test(iapGradle),
);
check(
  'C: android/build.gradle resuelve la version de openiap-google desde openiap-versions.json',
  /openiapVersions\.google/.test(iapGradle) && /openiap-versions\.json/.test(iapGradle),
);
check(
  'C: el modulo NO declara com.android.billingclient:billing directo (llega transitivo por openiap-google)',
  !/com\.android\.billingclient:billing/.test(iapGradle),
);

// ---------------------------------------------------------------------------
// D. Autolinking sin config plugin
// ---------------------------------------------------------------------------
const moduleConfig = iapExists('expo-module.config.json') ? JSON.parse(readIap('expo-module.config.json')) : {};
check(
  'D: expo-module.config.json declara el modulo Android expo.modules.iap.ExpoIapModule',
  Array.isArray(moduleConfig.android?.modules) && moduleConfig.android.modules.includes('expo.modules.iap.ExpoIapModule'),
);
check('D: expo-module.config.json incluye android en platforms', (moduleConfig.platforms ?? []).includes('android'));

// ---------------------------------------------------------------------------
// E. app.json intacto en C3.5A
// ---------------------------------------------------------------------------
const appJson = JSON.parse(read('apps/mobile/app.json'));
check(`E: app.json android.package sigue siendo ${ANDROID_APP_ID}`, appJson.expo?.android?.package === ANDROID_APP_ID);
// PB-2A: EXCEPCION CONTROLADA -- se agrego "expo-iap" (string) al array de
// plugins. Nada mas. Ningun objeto de config, ningun otro plugin.
check('E: app.json plugins es exactamente ["expo-router", "expo-iap"] (excepcion controlada PB-2A)', JSON.stringify(appJson.expo?.plugins) === JSON.stringify(['expo-router', 'expo-iap']));
check('E: "expo-iap" figura SOLO como string, sin objeto de opciones', (appJson.expo?.plugins ?? []).includes('expo-iap') && !(appJson.expo?.plugins ?? []).some((p) => Array.isArray(p) && p[0] === 'expo-iap'));

// ---------------------------------------------------------------------------
// F. Alcance: sin orquestacion de compra en el codigo movil
// ---------------------------------------------------------------------------
// PB-2A: `apps/mobile/lib/billing/` es el UNICO lugar autorizado para importar
// expo-iap. PB-2B: ese mismo directorio orquesta compra/restore
// (`requestPurchase` / `getAvailablePurchases`). Lo que sigue PROHIBIDO EN TODAS
// PARTES -- lib/billing incluido -- es: (a) una segunda pila de billing;
// (b) que el CLIENTE acknowledgee/finalice la transaccion con Google
// (`finishTransaction` / `acknowledgePurchaseAndroid` / `consumePurchaseAndroid`
// / `launchBillingFlow` / `BillingClient`) -- el acknowledge es 100% del backend.
// Se escanea CODIGO (comentarios fuera).
const clientAckOrSecondStack = /react-native-iap|react-native-purchases|RevenueCat|purchasely|launchBillingFlow|BillingClient|finishTransaction|acknowledgePurchaseAndroid|consumePurchaseAndroid|\backnowledgePurchase\b/;
// `requestPurchase` / `getAvailablePurchases` solo dentro de lib/billing/ (PB-2B).
const purchaseFlowOutsideBilling = /\brequestPurchase\b|\bgetAvailablePurchases\b|\brestorePurchases\b/;
const iapImportOutsideProvider = /\bexpo-iap\b|\bExpoIap\b/;
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
let clientAckHits = [];
let strayPurchaseFlowHits = [];
let strayIapImportHits = [];
try {
  const listed = execFileSync('git', ['-C', ROOT, 'ls-files', 'apps/mobile/app', 'apps/mobile/lib', 'apps/mobile/components'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.(ts|tsx)$/.test(f));
  for (const f of listed) {
    const code = stripComments(readFileSync(rel(f), 'utf8'));
    const inBilling = f.startsWith('apps/mobile/lib/billing/');
    if (clientAckOrSecondStack.test(code)) clientAckHits.push(f);
    if (!inBilling && purchaseFlowOutsideBilling.test(code)) strayPurchaseFlowHits.push(f);
    if (iapImportOutsideProvider.test(code) && !inBilling) strayIapImportHits.push(f);
  }
} catch (error) {
  check(`F: se pudo listar el codigo movil (git ls-files) -- ${error.message}`, false);
}
check(
  'F: NINGUN archivo movil acknowledgea en el cliente ni trae segunda pila (finishTransaction / acknowledge / consume / launchBillingFlow / RevenueCat / react-native-iap)',
  clientAckHits.length === 0,
);
if (clientAckHits.length) console.error('       archivos prohibidos: ' + clientAckHits.join(', '));
check(
  'F: requestPurchase / getAvailablePurchases / restorePurchases SOLO dentro de apps/mobile/lib/billing/ (PB-2B)',
  strayPurchaseFlowHits.length === 0,
);
if (strayPurchaseFlowHits.length) console.error('       flujo de compra fuera de lib/billing: ' + strayPurchaseFlowHits.join(', '));
check(
  'F: expo-iap se importa SOLO desde apps/mobile/lib/billing/ (excepcion controlada PB-2A)',
  strayIapImportHits.length === 0,
);
if (strayIapImportHits.length) console.error('       imports de expo-iap fuera de lib/billing: ' + strayIapImportHits.join(', '));

// ---------------------------------------------------------------------------
// G. Higiene: sin metro.config.js temporal, sin android/ trackeado
// ---------------------------------------------------------------------------
// PB-2A-M1: metro.config.js = solo `getDefaultConfig(__dirname)`. Se quito el
// override manual y stale `server.unstable_serverRoot = __dirname` (Expo SDK 54
// ya fija el serverRoot en la raiz del monorepo; el override lo forzaba a
// apps/mobile y rompia la resolucion del entry virtual de expo-router con
// node-linker=hoisted en Windows -> Metro 404). Sin override, sin BOM.
const metroSrc = existsSync(rel('apps/mobile/metro.config.js')) ? read('apps/mobile/metro.config.js') : '';
check('G: metro.config.js llama getDefaultConfig(__dirname)', /getDefaultConfig\(__dirname\)/.test(metroSrc));
check('G: metro.config.js NO fija server.unstable_serverRoot manualmente (override stale removido en PB-2A-M1)', !/unstable_serverRoot\s*=/.test(metroSrc));
check('G: metro.config.js sin BOM UTF-8', metroSrc.charCodeAt(0) !== 0xfeff);
let androidTracked = '';
try {
  androidTracked = execFileSync('git', ['-C', ROOT, 'ls-files', 'apps/mobile/android'], { encoding: 'utf8' }).trim();
} catch { /* git ausente -> se reporta abajo */ }
check('G: apps/mobile/android/ NO esta trackeado por git (CNG / generado / gitignored)', androidTracked === '');

// ---------------------------------------------------------------------------
// META (anti-regresion PB-2A-R3): impedir que se reintroduzca la resolucion
// hard-codeada de expo-iap contra la raiz del repo (solo valida con
// node-linker=hoisted). La unica forma permitida es createRequire desde
// apps/mobile/package.json.
// ---------------------------------------------------------------------------
const selfSrc = readFileSync(fileURLToPath(import.meta.url), 'utf8');
// Tokens partidos para que este propio bloque no dispare las prohibiciones.
const NM = 'node_' + 'modules';
const PKGROOT = 'pkg' + 'Root';
const hardCodedRepoRootIap =
  new RegExp("[`'\"]" + NM + "\\/expo-iap").test(selfSrc) || // path plano de la libreria citado como string
  new RegExp('\\b' + PKGROOT + '\\b').test(selfSrc); // el identificador viejo, reintroducido
check(
  'META: expo-iap se resuelve por createRequire(apps/mobile/package.json), sin path a la raiz del repo',
  /createRequire\(\s*join\(\s*ROOT\s*,\s*'apps'\s*,\s*'mobile'\s*,\s*'package\.json'\s*\)\s*\)/.test(selfSrc) &&
    /\.resolve\('expo-iap\/package\.json'\)/.test(selfSrc) &&
    !hardCodedRepoRootIap,
);

// ---------------------------------------------------------------------------
console.log('');
if (failures > 0) {
  console.error(`${failures} verificacion(es) fallaron.\nGate C3.5A (fundacion nativa de Billing): FAIL\n`);
  process.exit(1);
}
console.log('Gate C3.5A (fundacion nativa de Google Play Billing): PASS\n');
process.exit(0);
