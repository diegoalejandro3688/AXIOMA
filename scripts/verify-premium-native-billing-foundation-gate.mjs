#!/usr/bin/env node
/**
 * Gate -- PREMIUM V1, Capa 3 (Google Play Billing), C3.5A:
 * FUNDACION NATIVA DE BILLING.
 *
 * Verificacion ESTATICA y REPRODUCIBLE (Node puro, scan de fuente +
 * lockfile + paquete instalado). NO ejecuta Gradle, NO compila Android, NO
 * toca dispositivos -- esa evidencia se produjo EXTERNAMENTE en la maquina
 * Windows del Product Owner y se documenta en
 * docs/adr/PREMIUM-V1-LAYER-3-NATIVE-BILLING-FOUNDATION-CLOSURE-REPORT.md.
 *
 * Este gate SOLO afirma lo que un repo estatico puede probar:
 *   A. `expo-iap` fijado EXACTAMENTE a 5.5.0 en apps/mobile/package.json
 *      (sin `^` ni `~` ni rango).
 *   B. `pnpm-lock.yaml` contiene la resolucion de `expo-iap@5.5.0`
 *      (specifier del importer + entrada del paquete + integrity).
 *   C. El paquete `expo-iap@5.5.0` instalado declara, para Android,
 *      `openiap-google` 3.5.0 (`openiap-versions.json` + `android/build.gradle`).
 *      -> Segun la evidencia EXTERNA de `gradlew :app:dependencyInsight`,
 *         eso resuelve `com.android.billingclient:billing:9.1.0`. Este gate
 *         NO afirma probar esa resolucion de runtime -- solo que el paquete
 *         fijado la pide.
 *   D. Autolinking: `expo-module.config.json` declara el modulo Android
 *      `expo.modules.iap.ExpoIapModule` -> Expo lo enlaza SIN config plugin.
 *   E. `apps/mobile/app.json` NO se toca en C3.5A: `android.package` sigue
 *      siendo `com.zetrynd.app` y `plugins` NO incluye `"expo-iap"` (el
 *      config plugin se difiere a C3.5B).
 *   F. Alcance C3.5A: NINGUNA orquestacion de compra/restore/ProductDetails
 *      ni segunda pila de billing (RevenueCat / react-native-purchases) en
 *      `apps/mobile/{app,lib,components}`.
 *   G. Higiene: sin `apps/mobile/metro.config.js`, sin `apps/mobile/android/`
 *      trackeado por git (CNG/generado/gitignored).
 *
 * Uso: node scripts/verify-premium-native-billing-foundation-gate.mjs
 * (equivalente a `pnpm run verify:premium-native-billing-foundation-gate`)
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const rel = (p) => new URL(p, new URL('../', import.meta.url));
// Normaliza CRLF -> LF: el repo se edita en Windows y varios archivos quedan con \r\n.
const read = (p) => readFileSync(rel(p), 'utf8').replace(/\r\n/g, '\n');

const EXPO_IAP_VERSION = '5.5.0';
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
  'B: lockfile tiene el specifier del importer apps/mobile -> expo-iap: 5.5.0',
  /\n {6}expo-iap:\n {8}specifier: 5\.5\.0\n {8}version: 5\.5\.0\(/.test(lock),
);
check(`B: lockfile tiene la entrada del paquete expo-iap@${EXPO_IAP_VERSION}:`, lock.includes(`\n  expo-iap@${EXPO_IAP_VERSION}:\n`));
check('B: lockfile tiene integrity (sha512) para expo-iap@5.5.0', /expo-iap@5\.5\.0:\n {4}resolution: \{integrity: sha512-/.test(lock));
check(
  'B: en el lockfile expo-iap SOLO trae expo/react/react-native (sin deps npm nuevas)',
  /\n {2}expo-iap@5\.5\.0\([^\n]*\):\n {4}dependencies:\n {6}expo:[^\n]*\n {6}react: 19\.1\.0\n {6}react-native: 0\.81\.5[^\n]*\n\n/.test(lock),
);
// No hay segunda pila de billing en el lockfile.
check('B: el lockfile NO introduce react-native-purchases / RevenueCat', !/react-native-purchases|@revenuecat|react-native-iap@/.test(lock));

// ---------------------------------------------------------------------------
// C. El paquete instalado declara openiap-google 3.5.0 para Android
//    (la PBL 9.1.0 real la prueba la evidencia EXTERNA de Gradle)
// ---------------------------------------------------------------------------
const pkgRoot = 'node_modules/expo-iap';
check(`C: ${pkgRoot} instalado en version ${EXPO_IAP_VERSION}`, existsSync(rel(`${pkgRoot}/package.json`)) && JSON.parse(read(`${pkgRoot}/package.json`)).version === EXPO_IAP_VERSION);
if (existsSync(rel(`${pkgRoot}/openiap-versions.json`))) {
  const openiap = JSON.parse(read(`${pkgRoot}/openiap-versions.json`));
  check(`C: openiap-versions.json declara google = ${OPENIAP_GOOGLE_VERSION}`, openiap.google === OPENIAP_GOOGLE_VERSION);
} else {
  check('C: openiap-versions.json presente', false);
}
const iapGradle = read(`${pkgRoot}/android/build.gradle`);
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
const moduleConfig = JSON.parse(read(`${pkgRoot}/expo-module.config.json`));
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
check('E: app.json plugins NO incluye "expo-iap" (config plugin diferido a C3.5B)', !(appJson.expo?.plugins ?? []).includes('expo-iap'));
check('E: app.json plugins es exactamente ["expo-router"]', JSON.stringify(appJson.expo?.plugins) === JSON.stringify(['expo-router']));

// ---------------------------------------------------------------------------
// F. Alcance: sin orquestacion de compra en el codigo movil
// ---------------------------------------------------------------------------
const forbidden = /\bexpo-iap\b|\bExpoIap\b|react-native-iap|react-native-purchases|RevenueCat|launchBillingFlow|BillingClient|queryProductDetails|requestPurchase|getAvailablePurchases|initConnection|finishTransaction|acknowledgePurchase/;
let orchestrationHits = [];
try {
  const listed = execFileSync('git', ['-C', ROOT, 'ls-files', 'apps/mobile/app', 'apps/mobile/lib', 'apps/mobile/components'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.(ts|tsx)$/.test(f));
  for (const f of listed) {
    const body = readFileSync(rel(f), 'utf8');
    if (forbidden.test(body)) orchestrationHits.push(f);
  }
} catch (error) {
  check(`F: se pudo listar el codigo movil (git ls-files) -- ${error.message}`, false);
}
check(
  'F: NINGUN archivo de apps/mobile/{app,lib,components} importa expo-iap ni orquesta billing (C3.5A = solo fundacion nativa)',
  orchestrationHits.length === 0,
);
if (orchestrationHits.length) console.error('       archivos con orquestacion prohibida: ' + orchestrationHits.join(', '));

// ---------------------------------------------------------------------------
// G. Higiene: sin metro.config.js temporal, sin android/ trackeado
// ---------------------------------------------------------------------------
check('G: NO existe apps/mobile/metro.config.js (probe temporal no retenido)', !existsSync(rel('apps/mobile/metro.config.js')));
let androidTracked = '';
try {
  androidTracked = execFileSync('git', ['-C', ROOT, 'ls-files', 'apps/mobile/android'], { encoding: 'utf8' }).trim();
} catch { /* git ausente -> se reporta abajo */ }
check('G: apps/mobile/android/ NO esta trackeado por git (CNG / generado / gitignored)', androidTracked === '');

// ---------------------------------------------------------------------------
console.log('');
if (failures > 0) {
  console.error(`${failures} verificacion(es) fallaron.\nGate C3.5A (fundacion nativa de Billing): FAIL\n`);
  process.exit(1);
}
console.log('Gate C3.5A (fundacion nativa de Google Play Billing): PASS\n');
process.exit(0);
