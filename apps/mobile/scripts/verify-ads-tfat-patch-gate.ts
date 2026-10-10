// Gate ADS-1A.1 / 1A.1C -- parche de dependencia `react-native-google-mobile-ads`
// (AgeRestrictedTreatment / TFAT en Android + compatibilidad Kotlin con RN 0.81).
//
// Defecto upstream confirmado (16.5.0 .. 17.2.0): el enum JS envía minúsculas
// ('child' | 'teen' | 'unspecified') y el puente Kotlin de Android compara
// contra MAYÚSCULAS sin normalizar ni `else`, de modo que `TEEN` nunca se
// aplica (falla en silencio; iOS compara minúsculas y no se ve afectado). El
// parche pnpm normaliza el caso UNA vez antes del `when`.
//
// ADS-1A.1C -- 17.0.0 TAMPOCO compila contra RN 0.81.5 sin un 2.o arreglo: en
// `ReactNativeGoogleMobileAdsNativeModule.kt` (2 sitios) `ReadableMap.getString()`
// es `String?` pero `Promise.reject(code: String, …)` exige no-nulo. El mismo
// parche aplica `?: "internal-error"` en AMBOS sitios y nada más.
//
// Este gate falla si: la versión deriva de 17.0.0, falta el parche (archivo,
// metadata pnpm o hash en el lockfile), el parche toca algo más que el
// mapeo, o el Kotlin RESUELTO deja de aceptar los valores minúsculos del enum
// JS. Tampoco admite el atajo deprecado (TFUA/TFCD) ni llamadas directas al
// módulo nativo en el código de la app. NO inicializa el SDK ni pide anuncios.
//
// Verificación DETERMINISTA -- Node puro, solo lectura de archivos.
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const PKG = 'react-native-google-mobile-ads';
const PINNED_VERSION = '17.0.0';
const KOTLIN_DIR = 'android/src/main/java/io/invertase/googlemobileads';
const KOTLIN_REL = `${KOTLIN_DIR}/ReactNativeGoogleMobileAdsModule.kt`;
const NATIVE_MODULE_REL = `${KOTLIN_DIR}/ReactNativeGoogleMobileAdsNativeModule.kt`;
const REJECT_ORIGINAL = 'promise.reject(error.getString("code"), error.getString("message"), error)';
const REJECT_PATCHED = 'promise.reject(error.getString("code") ?: "internal-error", error.getString("message"), error)';

const MOBILE_ROOT = join(__dirname, '..');
const REPO_ROOT = join(MOBILE_ROOT, '..', '..');
const readText = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// --- 1. versión exacta + metadata pnpm + lockfile ---------------------------
console.log('--- 1. versión EXACTA y metadata del parche ---');
const mobilePkg = JSON.parse(readText(join(MOBILE_ROOT, 'package.json')));
const declared: string | undefined = mobilePkg.dependencies?.[PKG];
check(`apps/mobile/package.json fija ${PKG}@${PINNED_VERSION} EXACTO (sin ^ ni ~)`, declared === PINNED_VERSION);

const rootPkg = JSON.parse(readText(join(REPO_ROOT, 'package.json')));
const patchKey = `${PKG}@${PINNED_VERSION}`;
const patchRel: string | undefined = rootPkg.pnpm?.patchedDependencies?.[patchKey];
check(`package.json raíz declara pnpm.patchedDependencies["${patchKey}"]`, typeof patchRel === 'string' && patchRel.length > 0);
const patchPath = patchRel ? join(REPO_ROOT, patchRel) : '';
check('el archivo de parche existe', patchPath !== '' && existsSync(patchPath));

const lock = readText(join(REPO_ROOT, 'pnpm-lock.yaml'));
check('pnpm-lock.yaml registra el parche (patchedDependencies)', new RegExp(`patchedDependencies:[\\s\\S]*?${PKG}@${PINNED_VERSION.replace(/\./g, '\\.')}:\\s+hash:`).test(lock));
check(`pnpm-lock.yaml resuelve ${PKG}@${PINNED_VERSION}(patch_hash=…)`, new RegExp(`${PKG}@${PINNED_VERSION.replace(/\./g, '\\.')}\\(patch_hash=`).test(lock));

// --- 2. el parche es mínimo y toca SOLO los 2 archivos autorizados ----------
console.log('--- 2. el parche toca ÚNICAMENTE los 2 archivos Kotlin autorizados ---');
const patchRaw = patchPath && existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : '';
check('el archivo de parche es LF puro (sin CR; el parche CRLF no aplica sobre fuentes LF)', patchRaw.length > 0 && !patchRaw.includes('\r'));
const gitattributesPath = join(REPO_ROOT, '.gitattributes');
const gitattributes = existsSync(gitattributesPath) ? readText(gitattributesPath) : '';
check('.gitattributes protege los parches: `patches/*.patch text eol=lf`', /^patches\/\*\.patch\s+text\s+eol=lf\s*$/m.test(gitattributes));
const patch = patchRaw.replace(/\r\n/g, '\n');
const patchedFiles = [...patch.matchAll(/^diff --git a\/(\S+) b\/\S+$/gm)].map((m) => m[1]);
check('el parche modifica exactamente 2 archivos', patchedFiles.length === 2);
check('los archivos son EXACTAMENTE Module.kt (TFAT) y NativeModule.kt (nulabilidad RN 0.81)', JSON.stringify([...patchedFiles].sort()) === JSON.stringify([KOTLIN_REL, NATIVE_MODULE_REL].sort()));
check('exactamente 3 hunks (1 TFAT + 2 de nulabilidad)', (patch.match(/^@@ /gm) ?? []).length === 3);
const addedLines = patch.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
const removedLines = patch.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
check('el parche reemplaza el `when (ageRestrictedTreatment)` original', removedLines.some((l) => /when \(ageRestrictedTreatment\) \{/.test(l)));
check('el parche añade la normalización `?.uppercase()`', addedLines.some((l) => /when \(ageRestrictedTreatment\?\.uppercase\(\)\) \{/.test(l)));
const rejectRemoved = removedLines.filter((l) => l.slice(1).trim() === REJECT_ORIGINAL);
const rejectAdded = addedLines.filter((l) => l.slice(1).trim() === REJECT_PATCHED);
check('el parche reemplaza EXACTAMENTE 2 `promise.reject(error.getString("code"), …)`', rejectRemoved.length === 2);
check('el parche añade EXACTAMENTE 2 fallbacks `?: "internal-error"` (solo el primer argumento cambia)', rejectAdded.length === 2);
// Líneas añadidas/quitadas fuera de los 3 cambios autorizados = parche ampliado sin permiso.
const unexpectedAdded = addedLines.filter((l) => l.slice(1).trim() !== REJECT_PATCHED && !/when \(ageRestrictedTreatment\?\.uppercase\(\)\) \{/.test(l) && !/^\+\s*\/\/ ZETRYND patch:/.test(l));
const unexpectedRemoved = removedLines.filter((l) => l.slice(1).trim() !== REJECT_ORIGINAL && !/when \(ageRestrictedTreatment\) \{/.test(l));
check(`el parche no contiene NINGÚN otro cambio de línea${unexpectedAdded.length + unexpectedRemoved.length ? ` (extra: ${unexpectedAdded.length + unexpectedRemoved.length})` : ''}`, unexpectedAdded.length === 0 && unexpectedRemoved.length === 0);
check('el parche NO introduce TFUA/TFCD ni atajos deprecados', !addedLines.some((l) => /tagFor(ChildDirected|UnderAge)|TAG_FOR_/.test(l)));

// --- 3. paquete RESUELTO (agnóstico del linker) -----------------------------
console.log('--- 3. paquete resuelto: enum JS y puente Kotlin parcheado ---');
const requireFromMobile = createRequire(join(MOBILE_ROOT, 'package.json'));
let pkgDir = '';
try {
  pkgDir = dirname(requireFromMobile.resolve(`${PKG}/package.json`));
} catch {
  pkgDir = '';
}
check(`${PKG} se resuelve desde apps/mobile`, pkgDir !== '');
const resolvedPkg = pkgDir ? JSON.parse(readText(join(pkgDir, 'package.json'))) : {};
check(`la versión resuelta es ${PINNED_VERSION}`, resolvedPkg.version === PINNED_VERSION);

const enumSrc = pkgDir ? readText(join(pkgDir, 'src', 'types', 'AgeRestrictedTreatment.ts')) : '';
const jsValues: Record<string, string> = {};
for (const m of enumSrc.matchAll(/^\s*([A-Z]+) = '([a-z]+)',?$/gm)) jsValues[m[1]] = m[2];
check('el enum JS expone TEEN = "teen" (minúsculas)', jsValues.TEEN === 'teen');
check('el enum JS expone CHILD = "child" y UNSPECIFIED = "unspecified"', jsValues.CHILD === 'child' && jsValues.UNSPECIFIED === 'unspecified');

const kotlin = pkgDir ? readText(join(pkgDir, KOTLIN_REL)) : '';
const block = kotlin.match(/when \(ageRestrictedTreatment(\?\.uppercase\(\))?\) \{([\s\S]*?)\n {6}\}/);
check('el puente Kotlin contiene el bloque `when (ageRestrictedTreatment…)`', block !== null);
const normalizes = !!block?.[1];
check('el Kotlin RESUELTO normaliza con `?.uppercase()` (parche aplicado en node_modules)', normalizes);
const branches = new Map<string, string>();
for (const m of (block?.[2] ?? '').matchAll(/"([A-Z]+)" -> builder\.setAgeRestrictedTreatment\(AgeRestrictedTreatment\.([A-Z]+)\)/g)) {
  branches.set(m[1], m[2]);
}
check('el `when` tiene exactamente las 3 ramas CHILD / TEEN / UNSPECIFIED', branches.size === 3 && ['CHILD', 'TEEN', 'UNSPECIFIED'].every((k) => branches.get(k) === k));

// Prueba de mapeo: valor JS (minúsculas) -> rama Kotlin, tal como la evalúa el `when`.
const kotlinMatch = (jsValue: string, normalize: boolean) => branches.get(normalize ? jsValue.toUpperCase() : jsValue) ?? null;
check('JS "teen" -> AgeRestrictedTreatment.TEEN', kotlinMatch(jsValues.TEEN, normalizes) === 'TEEN');
check('JS "child" -> AgeRestrictedTreatment.CHILD', kotlinMatch(jsValues.CHILD, normalizes) === 'CHILD');
check('JS "unspecified" -> AgeRestrictedTreatment.UNSPECIFIED', kotlinMatch(jsValues.UNSPECIFIED, normalizes) === 'UNSPECIFIED');
check('CONTROL NEGATIVO: SIN normalizar, "teen" no coincidiría con ninguna rama (el defecto original)', kotlinMatch(jsValues.TEEN, false) === null);

// ADS-1A.1C -- compatibilidad Kotlin con RN 0.81 en el NativeModule RESUELTO.
const nativeModuleSrc = pkgDir ? readText(join(pkgDir, NATIVE_MODULE_REL)) : '';
const countOf = (haystack: string, needle: string) => (needle === '' ? 0 : haystack.split(needle).length - 1);
check('NativeModule.kt RESUELTO: exactamente 2 `promise.reject(…getString("code") ?: "internal-error" …)`', countOf(nativeModuleSrc, REJECT_PATCHED) === 2);
check('NativeModule.kt RESUELTO: ya no queda ningún `promise.reject(error.getString("code"), …)` sin fallback (no compila con RN 0.81)', countOf(nativeModuleSrc, REJECT_ORIGINAL) === 0);
check('NativeModule.kt RESUELTO: no hay otro `promise.reject(` con `getString("code")` sin fallback', !/promise\.reject\(\s*\w+\.getString\("code"\)\s*,/.test(nativeModuleSrc));

// --- 4. el código de la app no usa atajos prohibidos ------------------------
console.log('--- 4. la app no usa TFUA/TFCD ni el módulo nativo directo ---');
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'android' || name === 'scripts' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js)$/.test(name)) out.push(full);
  }
  return out;
}
const appFiles = ['app', 'lib', 'components'].flatMap((d) => (existsSync(join(MOBILE_ROOT, d)) ? walk(join(MOBILE_ROOT, d)) : []));
const offenders = appFiles.filter((f) => /tagForChildDirectedTreatment|tagForUnderAgeOfConsent|RNGoogleMobileAdsModule|NativeModules\.RNGoogleMobileAds/.test(readText(f)));
check(`ningún archivo de app/lib/components usa TFUA/TFCD ni el módulo nativo directo${offenders.length ? ` (${offenders.map((f) => relative(MOBILE_ROOT, f)).join(', ')})` : ''}`, offenders.length === 0);

if (failures > 0) {
  console.error(`\n${failures} verificación(es) del gate ADS-1A.1C FALLARON.`);
  process.exit(1);
}
console.log('\nTodas las verificaciones del gate ADS-1A.1C (parche TFAT + compatibilidad RN 0.81 de react-native-google-mobile-ads) pasaron.');
