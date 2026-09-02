// Gate de PREMIUM V1 -- Capa 2 (Mobile gating), C2.2: gating de Estudio.
//
// Verificacion DETERMINISTA -- Node puro, `expo-secure-store` stubeado (via
// `Module._resolveFilename`) y `global.fetch` reemplazado. Ningun archivo de
// produccion se modifica.
//
// Cubre:
//   A. unidades.tsx -> FREE nunca pide children de U3+ (filtro por
//      `isFreeUnitPosition(index)`, sin codigos/nombres/`index === 2`
//      hardcodeados); la carga depende del tier CONFIRMADO; `loadGenRef`
//      protege contra respuestas obsoletas; loading/error de entitlement
//      nunca muestran un lock comercial; el reintento es state-driven
//      (`refresh()`); `PREMIUM -> FREE` bloquea de inmediato.
//   B. estudio/[subjectId]/index.tsx -> SOLO la tile "recursos" se gatea;
//      FREE -> `<PremiumBadge>` + `open('resources')`; los datos de
//      `STUDY_MODE_TILES` / `TILE_ROUTE` no cambian.
//   C. recursos.tsx -> FREE corta a `<PremiumLockedScreen>` SIN ensamblar el
//      catalogo; `premiumRequired` stale -> `<PremiumLockedScreen>`; error
//      inicial de entitlement -> `<EntitlementUnavailable>`.
//   D. resource-catalog.ts (behavioral) -> `assembleResourceCatalog`
//      preserva un discriminante `premiumRequired` dedicado; el resto de
//      errores conserva su semantica (`premiumRequired: false` + `message`).
//   E. deep links (unidad/[unitId], topic/[topicId]/recurso, .../ejercicio)
//      -> mapean `403 PREMIUM_REQUIRED` a `<PremiumLockedScreen origin="unit">`
//      con `onBack` propio; el check ocurre ANTES del 404 -> vacio; el
//      ejercicio conserva las cadenas que exige `verify:ai-mobile-gate`.
//   F. practica-libre.tsx NO se toca (no importa entitlement/paywall/premium).
//   G. premium-card-style.ts diferido a C2.3 (no existe todavia).
import Module from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

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

const MOBILE_ROOT = join(__dirname, '..');
const read = (...seg: string[]) => readFileSync(join(MOBILE_ROOT, ...seg), 'utf8');
/** Quita comentarios de bloque y de linea -- los scans miran solo codigo. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
function premium403() {
  return jsonResponse({ error: { code: 'PREMIUM_REQUIRED', message: 'x', requestId: 'r', timestamp: 't' } }, 403);
}

const UNIDADES = 'app/(tabs)/estudio/[subjectId]/unidades.tsx';
const SUBJECT_INDEX = 'app/(tabs)/estudio/[subjectId]/index.tsx';
const RECURSOS = 'app/(tabs)/estudio/[subjectId]/recursos.tsx';
const UNIDAD_DL = 'app/(tabs)/estudio/[subjectId]/unidad/[unitId].tsx';
const RECURSO_DL = 'app/(tabs)/estudio/topic/[topicId]/recurso.tsx';
const EJERCICIO_DL = 'app/(tabs)/estudio/topic/[topicId]/ejercicio.tsx';
const PRACTICA = 'app/(tabs)/estudio/[subjectId]/practica-libre.tsx';

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';

  // --------------------------------------------------------------------
  console.log('--- A. unidades.tsx : FREE nunca pide children de U3+, carga tier-driven ---');
  const uniCode = stripComments(read(UNIDADES));
  check('importa isFreeUnitPosition de @axioma/contracts', /import \{[^}]*\bisFreeUnitPosition\b[^}]*\} from '@axioma\/contracts'/.test(uniCode));
  check('usa useEntitlement y usePaywall', /useEntitlement\(\)/.test(uniCode) && /usePaywall\(\)/.test(uniCode));
  check(
    'unitsToFetch filtra por tier PREMIUM o isFreeUnitPosition(index)',
    /\.filter\(\(\{ index \}\) => tier === 'PREMIUM' \|\| isFreeUnitPosition\(index\)\)/.test(uniCode),
  );
  check('los children se piden SOLO de unitsToFetch (no de todos los roots)', /unitsToFetch\.map\(\(\{ unit \}\) => listChildTopics\(unit\.id\)\)/.test(uniCode));
  check('NO hay `index === 2` ni `index == 2` hardcodeado', !/index\s*===?\s*2\b/.test(uniCode));
  check('NO hay codigos/nombres de unidad hardcodeados (M1\\.|U3|Unidad 3)', !/'M1\.|"M1\.|\bU3\b|Unidad 3/.test(uniCode));
  check('load() depende de [subjectId, confirmedTier]', /\}, \[subjectId, confirmedTier\]\);/.test(uniCode));
  check('confirmedTier sale SOLO de state.status === "ready"', /entitlement\.state\.status === 'ready' \? entitlement\.state\.tier : null/.test(uniCode));
  check('loadGenRef protege contra respuestas obsoletas (>=3 guards)', (uniCode.match(/if \(gen !== loadGenRef\.current\) return;/g) ?? []).length >= 3);
  check('entitlement loading -> LoadingState (no lock)', /entitlement\.state\.status === 'loading'\) return <LoadingState/.test(uniCode));
  check(
    'entitlement error -> <EntitlementUnavailable onRetry={refresh}> (NUNCA paywall/badge/lock)',
    /entitlement\.state\.status === 'error'\) return <EntitlementUnavailable onRetry=\{\(\) => void entitlement\.refresh\(\)\}/.test(uniCode),
  );
  check('el reintento de entitlement llama refresh(), nunca load() directo', !/onRetry=\{\(\) => void entitlement\.refresh\(\)[\s\S]{0,40}load\(\)/.test(uniCode));
  check('`PREMIUM -> FREE` bloquea de inmediato (render gateado por state.tier === confirmedTier)', /state\.tier === confirmedTier/.test(uniCode));
  check('la card bloqueada usa <PremiumBadge/> en vez del <Chip> de progreso', /locked \? \(\s*<PremiumBadge \/>\s*\) : \(\s*<Chip/.test(uniCode));
  check('tap en card bloqueada -> open(\'unit\'); card libre -> openUnit', /onPress=\{locked \? \(\) => open\('unit'\) : \(\) => openUnit\(item\)\}/.test(uniCode));
  check('atenuacion SOLO decorativa: tile/motivo con tokens warning, sin opacity de card', /warning\.background : motifBackground/.test(uniCode) && !/opacity:/.test(uniCode));
  check('el titulo de la card sigue a contraste pleno (titleMedium, sin tint)', /<Text variant="titleMedium">\{item\.name\}<\/Text>/.test(uniCode));

  // --------------------------------------------------------------------
  console.log('--- B. estudio/[subjectId]/index.tsx : SOLO la tile recursos se gatea ---');
  const idxCode = stripComments(read(SUBJECT_INDEX));
  check('resourcesLocked = isFree (del entitlement)', /const \{ isFree \} = useEntitlement\(\);/.test(idxCode) && /const resourcesLocked = isFree;/.test(idxCode));
  check('SOLO la key "recursos" se gatea', /const locked = tile\.key === 'recursos' && resourcesLocked;/.test(idxCode));
  check('locked -> <PremiumBadge/> en trailing', /locked \? \(\s*<PremiumBadge \/>\s*\)/.test(idxCode));
  check('locked -> onPress abre el paywall origin resources', /locked\s*\?\s*\(\) => open\('resources'\)/.test(idxCode));
  check('STUDY_MODE_TILES sigue con las 4 tiles enabled: true (sin "Recursos" deshabilitado)', (idxCode.match(/enabled: true/g) ?? []).length === 4 && !/enabled: false/.test(idxCode));
  check('TILE_ROUTE de recursos intacto', /recursos: '\/\(tabs\)\/estudio\/\[subjectId\]\/recursos'/.test(idxCode));
  check('la rama "Proximamente" (!tile.enabled) sigue existiendo y va ANTES que locked', idxCode.indexOf('!tile.enabled ?') < idxCode.indexOf(': locked ?'));

  // --------------------------------------------------------------------
  console.log('--- C. recursos.tsx : FREE corta sin ensamblar catalogo ---');
  const recCode = stripComments(read(RECURSOS));
  check('usa useEntitlement', /const entitlement = useEntitlement\(\);/.test(recCode));
  check('confirmedTier sale SOLO de state.status === "ready"', /entitlement\.state\.status === 'ready' \? entitlement\.state\.tier : null/.test(recCode));
  check('FREE confirmado -> setState premium ANTES de assembleResourceCatalog', recCode.indexOf("confirmedTier === 'FREE'") < recCode.indexOf('assembleResourceCatalog(subjectId)'));
  check(
    'FREE confirmado -> return sin llamar assembleResourceCatalog',
    /if \(confirmedTier === 'FREE'\) \{\s*setState\(\{ status: 'premium' \}\);\s*return;\s*\}/.test(recCode),
  );
  check('result.premiumRequired -> setState premium', /if \(result\.premiumRequired\) \{\s*setState\(\{ status: 'premium' \}\);\s*return;\s*\}/.test(recCode));
  check('load() depende de [subjectId, confirmedTier]', /\}, \[subjectId, confirmedTier\]\);/.test(recCode));
  check('entitlement loading -> LoadingState; error -> <EntitlementUnavailable onRetry={refresh}>', /entitlement\.state\.status === 'error'\) return <EntitlementUnavailable onRetry=\{\(\) => void entitlement\.refresh\(\)\}/.test(recCode));
  check('premium -> <PremiumLockedScreen origin="resources" onBack={goBack}>', /state\.status === 'premium'\) return <PremiumLockedScreen origin="resources" onBack=\{goBack\}/.test(recCode));
  check('goBack tiene fallback de router seguro (canGoBack -> replace al menu de la materia)', /if \(router\.canGoBack\(\)\) router\.back\(\);\s*else router\.replace\(\{ pathname: '\/\(tabs\)\/estudio\/\[subjectId\]'/.test(recCode));

  // --------------------------------------------------------------------
  console.log('--- D. resource-catalog.ts : discriminante premiumRequired (behavioral) ---');
  const { assembleResourceCatalog } = await import('../lib/study/resource-catalog');
  const subjectId = randomUUID();
  const u1 = { id: randomUUID(), code: 'S.U1', name: 'U1', order: 1, parentId: null, subjectId };
  const u2 = { id: randomUUID(), code: 'S.U2', name: 'U2', order: 2, parentId: null, subjectId };
  const child = { id: randomUUID(), code: 'S.U1.R1', name: 'R1', order: 1, parentId: u1.id, subjectId };

  function installFetch(handler: (url: string, method: string) => Response) {
    (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      return handler(String(input), init?.method ?? 'GET');
    }) as typeof fetch;
  }

  // D1: 403 en listRootTopics -> premiumRequired: true
  installFetch((url) => (/\/topics$/.test(url) ? premium403() : jsonResponse([])));
  {
    const r = await assembleResourceCatalog(subjectId);
    check('D1: 403 en roots -> { ok:false, premiumRequired:true }', !r.ok && r.premiumRequired === true && !('message' in r));
  }

  // D2: 403 en un listChildTopics -> premiumRequired: true
  installFetch((url) => {
    if (/\/education\/subjects\/[^/]+\/topics$/.test(url)) return jsonResponse([u1, u2]);
    if (url.includes(`/education/topics/${u2.id}/children`)) return premium403();
    if (/\/children$/.test(url)) return jsonResponse([child]);
    return jsonResponse([]);
  });
  {
    const r = await assembleResourceCatalog(subjectId);
    check('D2: 403 en children -> { ok:false, premiumRequired:true }', !r.ok && r.premiumRequired === true);
  }

  // D3: 500 en roots -> premiumRequired: false + message (semantica original)
  installFetch((url) => (/\/topics$/.test(url) ? new Response('boom', { status: 500 }) : jsonResponse([])));
  {
    const r = await assembleResourceCatalog(subjectId);
    check('D3: 500 en roots -> { ok:false, premiumRequired:false, message }', !r.ok && r.premiumRequired === false && typeof (r as { message?: string }).message === 'string');
  }

  // D4: 500 en children -> premiumRequired: false
  installFetch((url) => {
    if (/\/education\/subjects\/[^/]+\/topics$/.test(url)) return jsonResponse([u1, u2]);
    if (url.includes(`/education/topics/${u2.id}/children`)) return new Response('boom', { status: 500 });
    if (/\/children$/.test(url)) return jsonResponse([child]);
    return jsonResponse([]);
  });
  {
    const r = await assembleResourceCatalog(subjectId);
    check('D4: 500 en children -> { ok:false, premiumRequired:false }', !r.ok && r.premiumRequired === false);
  }

  // D5: 500 en el batch de progreso -> premiumRequired: false (nunca premium)
  installFetch((url) => {
    if (/\/education\/subjects\/[^/]+\/topics$/.test(url)) return jsonResponse([u1]);
    if (/\/children$/.test(url)) return jsonResponse([child]);
    if (url.includes('/progress/topics?topicIds=')) return new Response('boom', { status: 500 });
    return jsonResponse([]);
  });
  {
    const r = await assembleResourceCatalog(subjectId);
    check('D5: 500 en el batch de progreso -> { ok:false, premiumRequired:false }', !r.ok && r.premiumRequired === false);
  }

  // D6: camino feliz -> ok
  installFetch((url) => {
    if (/\/education\/subjects\/[^/]+\/topics$/.test(url)) return jsonResponse([u1]);
    if (/\/children$/.test(url)) return jsonResponse([child]);
    if (url.includes('/progress/topics?topicIds=')) return jsonResponse([]);
    return jsonResponse([]);
  });
  {
    const r = await assembleResourceCatalog(subjectId);
    check('D6: camino feliz -> { ok:true }', r.ok === true);
  }

  const catCode = stripComments(read('lib/study/resource-catalog.ts'));
  check('el tipo de retorno declara el discriminante premiumRequired', /premiumRequired: true/.test(catCode) && /premiumRequired: false; message: string/.test(catCode));

  // --------------------------------------------------------------------
  console.log('--- E. deep links : 403 PREMIUM_REQUIRED -> <PremiumLockedScreen origin="unit"> ---');
  for (const [label, path] of [
    ['unidad/[unitId]', UNIDAD_DL],
    ['topic/[topicId]/recurso', RECURSO_DL],
    ['topic/[topicId]/ejercicio', EJERCICIO_DL],
  ] as const) {
    const code = stripComments(read(path));
    check(`${label}: importa isPremiumRequiredError`, /import \{ isPremiumRequiredError \} from '[^']*lib\/entitlement\/premium-error'/.test(code));
    check(`${label}: importa PremiumLockedScreen`, /import \{ PremiumLockedScreen \} from '[^']*components\/premium\/premium-locked-screen'/.test(code));
    check(`${label}: mapea isPremiumRequiredError -> setState({ status: 'premium' })`, /if \(isPremiumRequiredError\([\s\S]{0,120}setState\(\{ status: 'premium' \}\)/.test(code));
    check(`${label}: renderiza <PremiumLockedScreen origin="unit" onBack={...}>`, /state\.status === 'premium'\) return <PremiumLockedScreen origin="unit" onBack=\{(goBack|backToUnidades)\}/.test(code));
    check(`${label}: 'premium' esta en el union ScreenState`, /\|\s*\{ status: 'premium' \}/.test(code));
  }
  // El check de premium debe ir ANTES del 404 -> vacio en recurso/ejercicio.
  {
    const rec = stripComments(read(RECURSO_DL));
    check('recurso: el check premium precede al 404 -> empty', rec.indexOf('isPremiumRequiredError(') < rec.indexOf("status === 404"));
  }
  // ejercicio conserva las cadenas que exige verify:ai-mobile-gate.
  {
    const ej = read(EJERCICIO_DL);
    check("ejercicio: conserva 'Preguntar al Tutor IA'", ej.includes('Preguntar al Tutor IA'));
    check('ejercicio: conserva contextQuestionVersionId: currentQuestion.versionId', ej.includes('contextQuestionVersionId: currentQuestion.versionId'));
    check('ejercicio: el path de escritura submitResponseViaOutbox sigue intacto', ej.includes('submitResponseViaOutbox({'));
  }
  // unidad/[unitId] onBack propio con fallback seguro.
  {
    const dl = stripComments(read(UNIDAD_DL));
    check('unidad/[unitId]: goBack propio con fallback (canGoBack -> replace a unidades)', /if \(router\.canGoBack\(\)\) router\.back\(\);\s*else router\.replace\(\{ pathname: '\/\(tabs\)\/estudio\/\[subjectId\]\/unidades'/.test(dl));
  }

  // --------------------------------------------------------------------
  console.log('--- F. practica-libre.tsx : sin tocar ---');
  const pracCode = stripComments(read(PRACTICA));
  check('practica-libre NO importa entitlement/paywall/premium', !/entitlement|paywall|premium|Premium/i.test(pracCode));

  // --------------------------------------------------------------------
  console.log('--- G. premium-card-style.ts diferido a C2.3 ---');
  check('premium-card-style.ts NO existe todavia (diferido)', !existsSync(join(MOBILE_ROOT, 'lib/entitlement/premium-card-style.ts')) && !existsSync(join(MOBILE_ROOT, 'components/premium/premium-card-style.ts')));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de gating de Estudio (PREMIUM V1, Capa 2, C2.2) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
