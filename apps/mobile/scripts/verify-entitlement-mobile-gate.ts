// Gate de PREMIUM V1 -- Capa 2 (Mobile gating), C2.0: fundacion de
// entitlement en mobile.
//
// Verificacion DETERMINISTA -- Node puro, `expo-secure-store` stubeado (via
// `Module._resolveFilename`, mismo criterio que `verify-api-client-gate.ts`)
// y `global.fetch` reemplazado. Ningun archivo de produccion se modifica.
//
// Cubre:
//   A. `lib/api/entitlement.ts` -> `GET /me/entitlement`, schema estricto,
//      forma de `ApiResult` para exito / 403 PREMIUM_REQUIRED / red.
//   B. `lib/entitlement/premium-error.ts` -> `isPremiumRequiredError` solo
//      matchea `403` + `code === 'PREMIUM_REQUIRED'`.
//   C. `lib/entitlement/types.ts` -> `nextEntitlementState`: exito -> ready;
//      fallo inicial -> 'error' (nunca FREE); fallo con tier previo ->
//      conserva el tier (stale); recuperacion desde 'error'.
//   D. `types.ts` deriva `EntitlementTier` del contrato compartido; no
//      redeclara `'FREE' | 'PREMIUM'`; `isFree`/`isPremium` en el contrato.
//   E. `pricing.ts` -> un unico string de precio, marcado
//      `TEMPORARY PRE-BILLING DISPLAY ONLY`, NO importado por ningun `lib/api/*`.
//   F. `entitlement-provider.tsx` -> proteccion de carrera (`generation` +
//      `accountId`), deduplicacion, refresco en foreground, CERO persistencia
//      del tier, sin manejo especial de `401`, usa `nextEntitlementState`.
//   G. `app/_layout.tsx` -> `EntitlementProvider` montado dentro de `AuthProvider`.
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type ResolveFilename = (request: string, ...rest: unknown[]) => string;
const moduleWithInternals = Module as unknown as { _resolveFilename: ResolveFilename };
const originalResolveFilename = moduleWithInternals._resolveFilename;
moduleWithInternals._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === 'expo-secure-store') return join(__dirname, '__stubs__', 'expo-secure-store.ts');
  return originalResolveFilename.call(this, request, ...rest);
} as ResolveFilename;

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

const MOBILE_ROOT = join(__dirname, '..');
const read = (...seg: string[]) => readFileSync(join(MOBILE_ROOT, ...seg), 'utf8');
/** Quita comentarios de bloque y de linea -- los scans de "nunca aparece X" miran solo codigo. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';
  const { getEntitlement } = await import('../lib/api/entitlement');
  const { isPremiumRequiredError } = await import('../lib/entitlement/premium-error');
  const { nextEntitlementState } = await import('../lib/entitlement/types');

  // ----------------------------------------------------------------------
  console.log('--- A. lib/api/entitlement.ts : GET /me/entitlement + schema estricto ---');
  {
    let lastUrl = '';
    let lastMethod = '';
    (globalThis as { fetch: typeof fetch }).fetch = (async (url: string, init?: RequestInit) => {
      lastUrl = String(url);
      lastMethod = init?.method ?? 'GET';
      return jsonResponse({ tier: 'FREE' }, 200);
    }) as typeof fetch;

    const free = await getEntitlement();
    check('pega a GET http://mock/me/entitlement', lastMethod === 'GET' && lastUrl === 'http://mock/me/entitlement');
    check('tier FREE -> { ok:true, data:{ tier:"FREE" } }', free.ok === true && free.data.tier === 'FREE');
    check('la respuesta no gana claves extra tras el parse', free.ok === true && JSON.stringify(Object.keys(free.data)) === JSON.stringify(['tier']));
  }
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () => jsonResponse({ tier: 'PREMIUM' }, 200)) as typeof fetch;
    const premium = await getEntitlement();
    check('tier PREMIUM -> { ok:true, data:{ tier:"PREMIUM" } }', premium.ok === true && premium.data.tier === 'PREMIUM');
  }
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () => jsonResponse({ tier: 'GOLD' }, 200)) as typeof fetch;
    let threwOrNotOk = false;
    try {
      const r = await getEntitlement();
      threwOrNotOk = r.ok === false;
    } catch {
      threwOrNotOk = true;
    }
    check('tier desconocido ("GOLD") -> rechazado (schema)', threwOrNotOk);
  }
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () => jsonResponse({ tier: 'FREE', price: 6990 }, 200)) as typeof fetch;
    let threwOrNotOk = false;
    try {
      const r = await getEntitlement();
      threwOrNotOk = r.ok === false;
    } catch {
      threwOrNotOk = true;
    }
    check('campo extra ("price") -> rechazado (.strict())', threwOrNotOk);
  }
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      jsonResponse({ error: { code: 'PREMIUM_REQUIRED', message: 'x', requestId: 'r', timestamp: 't' } }, 403)) as typeof fetch;
    const r = await getEntitlement();
    check('403 -> { ok:false, kind:"http", status:403, code:"PREMIUM_REQUIRED" }', r.ok === false && r.kind === 'http' && r.status === 403 && r.code === 'PREMIUM_REQUIRED');
  }
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    const r = await getEntitlement();
    check('red caida -> { ok:false, kind:"network" }', r.ok === false && r.kind === 'network');
  }

  // ----------------------------------------------------------------------
  console.log('--- B. isPremiumRequiredError : solo 403 + code PREMIUM_REQUIRED ---');
  const http = (status: number, code?: string) => ({ ok: false as const, kind: 'http' as const, status, code, message: 'm' });
  check('403 + PREMIUM_REQUIRED -> true', isPremiumRequiredError(http(403, 'PREMIUM_REQUIRED')));
  check('403 sin code -> false', !isPremiumRequiredError(http(403)));
  check('403 + otro code -> false', !isPremiumRequiredError(http(403, 'FORBIDDEN')));
  check('404 + PREMIUM_REQUIRED -> false', !isPremiumRequiredError(http(404, 'PREMIUM_REQUIRED')));
  check('409 + PREMIUM_REQUIRED -> false', !isPremiumRequiredError(http(409, 'PREMIUM_REQUIRED')));
  check('network -> false', !isPremiumRequiredError({ ok: false, kind: 'network', message: 'm' }));
  check('ok -> false', !isPremiumRequiredError({ ok: true, data: {} }));

  // ----------------------------------------------------------------------
  console.log('--- C. nextEntitlementState : transiciones puras ---');
  const okFree = { ok: true as const, data: { tier: 'FREE' as const } };
  const okPremium = { ok: true as const, data: { tier: 'PREMIUM' as const } };
  const fail = { ok: false as const, kind: 'network' as const, message: 'm' };
  check('loading + exito(FREE) -> ready(FREE)', JSON.stringify(nextEntitlementState({ status: 'loading' }, okFree)) === JSON.stringify({ status: 'ready', tier: 'FREE' }));
  check('loading + fallo -> error (NUNCA FREE)', JSON.stringify(nextEntitlementState({ status: 'loading' }, fail)) === JSON.stringify({ status: 'error' }));
  check('error + fallo -> error (se mantiene)', JSON.stringify(nextEntitlementState({ status: 'error' }, fail)) === JSON.stringify({ status: 'error' }));
  check('error + exito(PREMIUM) -> ready(PREMIUM)', JSON.stringify(nextEntitlementState({ status: 'error' }, okPremium)) === JSON.stringify({ status: 'ready', tier: 'PREMIUM' }));
  check('ready(PREMIUM) + fallo -> ready(PREMIUM) CONSERVADO (stale, no degrada)', JSON.stringify(nextEntitlementState({ status: 'ready', tier: 'PREMIUM' }, fail)) === JSON.stringify({ status: 'ready', tier: 'PREMIUM' }));
  check('ready(FREE) + fallo -> ready(FREE) CONSERVADO', JSON.stringify(nextEntitlementState({ status: 'ready', tier: 'FREE' }, fail)) === JSON.stringify({ status: 'ready', tier: 'FREE' }));
  check('ready(FREE) + exito(PREMIUM) -> ready(PREMIUM)', JSON.stringify(nextEntitlementState({ status: 'ready', tier: 'FREE' }, okPremium)) === JSON.stringify({ status: 'ready', tier: 'PREMIUM' }));

  // ----------------------------------------------------------------------
  console.log('--- D. types.ts : EntitlementTier derivado del contrato ---');
  const typesSrc = read('lib', 'entitlement', 'types.ts');
  const typesCode = stripComments(typesSrc);
  check('importa PremiumTier de @axioma/contracts', /import type \{[^}]*\bPremiumTier\b[^}]*\} from '@axioma\/contracts'/.test(typesCode));
  check('EntitlementTier = PremiumTier (no redeclara la union)', /export type EntitlementTier = PremiumTier;/.test(typesCode));
  check("types.ts NO declara la union literal 'FREE' | 'PREMIUM' a mano", !/'FREE'\s*\|\s*'PREMIUM'/.test(typesCode) && !/"FREE"\s*\|\s*"PREMIUM"/.test(typesCode));
  check('EntitlementContextValue expone isFree e isPremium', /isFree:\s*boolean/.test(typesCode) && /isPremium:\s*boolean/.test(typesCode));
  check('EntitlementContextValue expone refresh(): Promise<void>', /refresh:\s*\(\)\s*=>\s*Promise<void>/.test(typesCode));

  // ----------------------------------------------------------------------
  console.log('--- E. pricing.ts : constante temporal unica ---');
  const pricingSrc = read('lib', 'entitlement', 'pricing.ts');
  const pricingCode = stripComments(pricingSrc);
  check('marcado TEMPORARY PRE-BILLING DISPLAY ONLY', /TEMPORARY PRE-BILLING DISPLAY ONLY/.test(pricingSrc));
  check("exporta exactamente PREMIUM_PRICE_DISPLAY = '$6.990 CLP / mes'", /export const PREMIUM_PRICE_DISPLAY = '\$6\.990 CLP \/ mes';/.test(pricingCode));
  check('pricing.ts exporta UNA sola constante', (pricingCode.match(/export const /g) ?? []).length === 1);
  check('el literal de precio aparece UNA sola vez en el codigo', (pricingCode.match(/6\.990/g) ?? []).length === 1);
  const apiEntitlementCode = stripComments(read('lib', 'api', 'entitlement.ts'));
  check('lib/api/entitlement.ts NO importa pricing ni menciona precio', !/pricing|6\.990|CLP|PREMIUM_PRICE/.test(apiEntitlementCode));
  // Ningun archivo de lib/api/* importa pricing.
  const { readdirSync } = await import('node:fs');
  const apiDir = join(MOBILE_ROOT, 'lib', 'api');
  const apiImportsPricing = readdirSync(apiDir).filter(
    (f) => /\.ts$/.test(f) && /entitlement\/pricing|PREMIUM_PRICE_DISPLAY/.test(stripComments(readFileSync(join(apiDir, f), 'utf8'))),
  );
  check(`ningun lib/api/*.ts importa pricing (${apiImportsPricing.join(', ') || 'limpio'})`, apiImportsPricing.length === 0);

  // ----------------------------------------------------------------------
  console.log('--- F. entitlement-provider.tsx : carrera, dedup, foreground, cero persistencia ---');
  const provSrc = read('lib', 'entitlement', 'entitlement-provider.tsx');
  const provCode = stripComments(provSrc);
  check('el effect de sesion considera auth.accountId (no solo auth.status)', /\[auth\.status,\s*auth\.accountId,\s*runFetch\]/.test(provCode));
  check('generationRef presente y se incrementa en cada cambio de sesion', /generationRef\s*=\s*useRef\(0\)/.test(provCode) && /generationRef\.current\s*\+=\s*1/.test(provCode));
  check('descarta respuestas obsoletas (generacion o cuenta cambiada) antes de setState', /if \(gen !== generationRef\.current \|\| account !== accountIdRef\.current\) return;[\s\S]{0,200}setState\(/.test(provCode));
  check('deduplicacion: reutiliza la request en vuelo de la misma generacion', /inFlightRef\.current && inFlightGenRef\.current === gen/.test(provCode));
  check('refresco al volver a foreground (AppState "active")', /AppState\.addEventListener\('change'/.test(provCode) && /nextAppState === 'active'\) void runFetch\(\)/.test(provCode));
  check('usa la transicion pura nextEntitlementState (no logica inline)', /setState\(\(prev\) => nextEntitlementState\(prev, result\)\)/.test(provCode));
  check('isFree/isPremium se calculan SOLO desde state.status === "ready"', /isPremium:\s*state\.status === 'ready' && state\.tier === 'PREMIUM'/.test(provCode) && /isFree:\s*state\.status === 'ready' && state\.tier === 'FREE'/.test(provCode));
  check('CERO persistencia del tier: no importa expo-secure-store / AsyncStorage / session-storage', !/secure-store|SecureStore|AsyncStorage|async-storage|session-storage|saveSession/.test(provCode));
  check('NO maneja 401 explicitamente (lo hace el unauthorized handler global de client.ts)', !/=== 401|status === 401|unauthorized/i.test(provCode));
  check('el effect de sesion resetea a { status: "loading" } cuando no hay sesion', /setState\(\{ status: 'loading' \}\)/.test(provCode));
  check('lastConfirmedTierRef se limpia en cada cambio de sesion', /lastConfirmedTierRef\.current = null;/.test(provCode));

  // ----------------------------------------------------------------------
  console.log('--- G. app/_layout.tsx : EntitlementProvider dentro de AuthProvider ---');
  const layoutSrc = read('app', '_layout.tsx');
  check('importa EntitlementProvider de lib/entitlement/entitlement-provider', /import \{ EntitlementProvider \} from '\.\.\/lib\/entitlement\/entitlement-provider'/.test(layoutSrc));
  check('EntitlementProvider esta ANIDADO dentro de AuthProvider', layoutSrc.indexOf('<AuthProvider>') !== -1 && layoutSrc.indexOf('<EntitlementProvider>') > layoutSrc.indexOf('<AuthProvider>') && layoutSrc.indexOf('</EntitlementProvider>') < layoutSrc.indexOf('</AuthProvider>'));
  check('EntitlementProvider envuelve ThemedRootNavigator', /<EntitlementProvider>\s*<ThemedRootNavigator \/>\s*<\/EntitlementProvider>/.test(layoutSrc));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de fundacion de entitlement mobile (PREMIUM V1, Capa 2, C2.0) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
