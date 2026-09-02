// Gate de PREMIUM V1 -- Capa 2 (Mobile gating), C2.3: gating de Ensayos.
//
// Verificacion DETERMINISTA -- Node puro, `expo-secure-store` stubeado y
// `global.fetch` reemplazado. Ningun archivo de produccion se modifica.
//
// Cubre:
//   A. estudio/ensayos/index.tsx (lista) -> `GET /exams` intacto; FREE
//      confirmado: `<PremiumBadge>` + tile atenuada (tokens `state.warning`,
//      sin opacity de card); el tap SIGUE navegando al pre-start y NUNCA
//      abre el paywall desde la lista; loading/error de entitlement -> sin
//      estado comercial; el tier NO re-pide `GET /exams`.
//   B. estudio/ensayos/[examId]/index.tsx (pre-start) -> `handleResume`
//      intacto y SIN gate de entitlement/paywall; `handleStart` SIEMPRE
//      llama `startExamAttempt`; SOLO `isPremiumRequiredError(result)` abre
//      `open('exams')`; un resultado ok sigue recordando el intento +
//      navegando; SIN bloqueo preventivo `if (isFree)` antes del POST; la
//      cache de intentos no cambia.
//   C. Invariante ACTIVE (behavioral): FREE + `POST` 200 con ACTIVE
//      existente -> runner, sin paywall; FREE + `POST` 403 PREMIUM_REQUIRED
//      -> paywall, sin runner.
//   D. runner / submit / result / review -> sin gating Premium nuevo (ni
//      imports ni cambios en el arbol de trabajo).
import Module from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
const REPO_ROOT = join(MOBILE_ROOT, '..', '..');
const read = (...seg: string[]) => readFileSync(join(MOBILE_ROOT, ...seg), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
function premium403() {
  return jsonResponse({ error: { code: 'PREMIUM_REQUIRED', message: 'x', requestId: 'r', timestamp: 't' } }, 403);
}

const LIST = 'app/(tabs)/estudio/ensayos/index.tsx';
const PRESTART = 'app/(tabs)/estudio/ensayos/[examId]/index.tsx';
const RUNNER = 'app/(tabs)/estudio/ensayos/[examId]/attempt/[attemptId].tsx';
const RESULT = 'app/(tabs)/estudio/ensayos/[examId]/result/[attemptId].tsx';
const REVIEW = 'app/(tabs)/estudio/ensayos/[examId]/review/[attemptId].tsx';
const CACHE = 'lib/exams/attempt-cache.ts';

/** Extrae el cuerpo `{ ... }` de una funcion nombrada (balance de llaves). */
function fnBody(src: string, decl: string): string {
  const start = src.indexOf(decl);
  if (start === -1) return '';
  const braceStart = src.indexOf('{', start);
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(braceStart, i + 1);
    }
  }
  return '';
}

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';

  // --------------------------------------------------------------------
  console.log('--- A. lista de Ensayos : catalogo visible para FREE, badge + tile atenuada, tap -> pre-start ---');
  const listCode = stripComments(read(LIST));
  check('importa y usa useEntitlement', /import \{ useEntitlement \} from '[^']*lib\/entitlement\/entitlement-provider'/.test(listCode) && /const \{ isFree \} = useEntitlement\(\);/.test(listCode));
  check('importa PremiumBadge', /import \{ PremiumBadge \} from '[^']*components\/premium\/premium-badge'/.test(listCode));
  check('`GET /exams` (listExams) sigue siendo la unica fuente, sin filtro por tier', /const result = await listExams\(\);/.test(listCode) && !/listExams\([^)]/.test(listCode));
  check('load() depende SOLO de [subjectId] -- el tier NO re-pide el catalogo', /\}, \[subjectId\]\);/.test(listCode));
  check('locked = isFree (badge y atenuacion solo con FREE confirmado)', /const locked = isFree;/.test(listCode));
  check('<PremiumBadge /> se renderiza SOLO cuando locked', /locked \? \(\s*<View style=\{styles\.badgeRow\}>\s*<PremiumBadge \/>\s*<\/View>\s*\) : null/.test(listCode));
  check('atenuacion decorativa: tile con tokens state.warning, base sin tocar', /locked \? tokens\.color\.state\.warning\.background : examIconBackground/.test(listCode) && /locked \? tokens\.color\.state\.warning\.text : examIconColor/.test(listCode));
  check('NO hay opacity en toda la card', !/opacity/i.test(listCode));
  check('el titulo del ensayo sigue a contraste pleno (titleMedium, sin tint)', /<Text variant="titleMedium">\{item\.title\}<\/Text>/.test(listCode));
  check('el tap de la card SIGUE navegando al pre-start (router.push a ensayos/[examId])', /onPress=\{\(\) =>\s*router\.push\(\{\s*pathname: '\/\(tabs\)\/estudio\/ensayos\/\[examId\]',/.test(listCode));
  check('la lista NUNCA abre el paywall (sin usePaywall, sin open())', !/usePaywall|\.open\(/.test(listCode));
  check('loading/error/empty de la lista sin estado comercial (mismos LoadingState/ErrorState/EmptyState)', /return <LoadingState /.test(listCode) && /return <ErrorState /.test(listCode) && /return <EmptyState /.test(listCode) && !/PremiumLockedScreen/.test(listCode));

  // --------------------------------------------------------------------
  console.log('--- B. pre-start : sin bloqueo preventivo; solo el 403 del backend abre el paywall ---');
  const preCode = stripComments(read(PRESTART));
  check('importa usePaywall e isPremiumRequiredError', /import \{ usePaywall \} from '[^']*paywall-context'/.test(preCode) && /import \{ isPremiumRequiredError \} from '[^']*premium-error'/.test(preCode));
  const handleStartBody = fnBody(preCode, 'async function handleStart(');
  const handleResumeBody = fnBody(preCode, 'function handleResume(');
  check('handleStart SIEMPRE llama startExamAttempt(examId)', /const result = await startExamAttempt\(examId\);/.test(handleStartBody));
  check('handleStart NO tiene bloqueo preventivo `if (isFree)` / open() antes del POST', preCode.indexOf('startExamAttempt(examId)') < preCode.indexOf("open('exams')") && !/if \(isFree\)/.test(handleStartBody) && !/isFree/.test(handleStartBody));
  check('handleStart: SOLO isPremiumRequiredError(result) abre open(\'exams\')', /if \(isPremiumRequiredError\(result\)\) \{\s*open\('exams'\);\s*return;\s*\}/.test(handleStartBody));
  check('handleStart: el paywall va DENTRO de la rama !result.ok, antes del ErrorState', handleStartBody.indexOf('isPremiumRequiredError(result)') < handleStartBody.indexOf("setState({ status: 'error'"));
  check('handleStart: otros errores conservan el ErrorState actual', /setState\(\{ status: 'error', message: result\.message \}\);/.test(handleStartBody));
  check('handleStart: un resultado ok sigue recordando el intento + navegando', /await rememberActiveAttempt\(examId, attemptId\);/.test(handleStartBody) && /router\.replace\(\{ pathname: '\/\(tabs\)\/estudio\/ensayos\/\[examId\]\/attempt\/\[attemptId\]'/.test(handleStartBody));
  check('handleStart: NO crea un intento local falso ni reintenta solo', !/setInterval|setTimeout|fakeAttempt|localAttempt/.test(handleStartBody));
  check('handleResume: intacto, SIN entitlement/paywall/isFree/open()', handleResumeBody.length > 0 && !/entitlement|paywall|isFree|open\(|isPremiumRequiredError/i.test(handleResumeBody));
  check('handleResume: sigue navegando directo al runner con el resumeAttemptId', /router\.replace\(\{\s*pathname: '\/\(tabs\)\/estudio\/ensayos\/\[examId\]\/attempt\/\[attemptId\]',\s*params: \{ examId, attemptId: state\.resumeAttemptId/.test(handleResumeBody));
  check('la cache de intentos se usa igual (get/remember/forget), sin nuevas llamadas', /getRememberedAttempt\(examId\)/.test(preCode) && /rememberActiveAttempt\(examId, attemptId\)/.test(preCode) && /forgetActiveAttempt\(examId\)/.test(preCode));
  check('load() del pre-start NO consulta entitlement (mirar la intro nunca crea intento ni gatea)', !/entitlement|useEntitlement/i.test(fnBody(preCode, 'const load = useCallback(async ()')));

  // --------------------------------------------------------------------
  console.log('--- C. invariante ACTIVE (behavioral) ---');
  const { startExamAttempt } = await import('../lib/api/exams');
  const { isPremiumRequiredError } = await import('../lib/entitlement/premium-error');
  const examId = randomUUID();

  function installFetch(handler: (url: string, method: string) => Response) {
    (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
      handler(String(input), init?.method ?? 'GET')) as typeof fetch;
  }
  const now = new Date();
  const activeState = {
    attemptId: randomUUID(),
    examId,
    status: 'ACTIVE' as const,
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 3_600_000).toISOString(),
    completedAt: null,
    serverTime: now.toISOString(),
  };

  // Replica EXACTA de la rama de decision de handleStart (verificada por scan en B).
  async function simulateHandleStart(): Promise<'runner' | 'paywall' | 'error'> {
    const result = await startExamAttempt(examId);
    if (!result.ok) {
      if (isPremiumRequiredError(result)) return 'paywall';
      return 'error';
    }
    return 'runner'; // rememberActiveAttempt + router.replace(attempt/...)
  }

  // C1: FREE + POST 200 con ACTIVE existente (resume-first del backend) -> runner, sin paywall.
  installFetch((url, method) => (method === 'POST' && /\/exams\/[^/]+\/attempts$/.test(url) ? jsonResponse(activeState, 200) : jsonResponse({}, 200)));
  {
    const r = await startExamAttempt(examId);
    check('C1: POST 200 -> result.ok con el intento ACTIVE', r.ok === true && r.data.status === 'ACTIVE' && r.data.attemptId === activeState.attemptId);
    check('C1: isPremiumRequiredError(200) === false', isPremiumRequiredError(r) === false);
    check('C1: handleStart -> runner (sin paywall)', (await simulateHandleStart()) === 'runner');
  }

  // C2: FREE + POST 403 PREMIUM_REQUIRED -> paywall, sin runner.
  installFetch((url, method) => (method === 'POST' && /\/exams\/[^/]+\/attempts$/.test(url) ? premium403() : jsonResponse({}, 200)));
  {
    const r = await startExamAttempt(examId);
    check('C2: POST 403 -> result no-ok, kind http 403 code PREMIUM_REQUIRED', !r.ok && r.kind === 'http' && r.status === 403 && r.code === 'PREMIUM_REQUIRED');
    check('C2: isPremiumRequiredError(403) === true', isPremiumRequiredError(r) === true);
    check('C2: handleStart -> paywall (sin runner)', (await simulateHandleStart()) === 'paywall');
  }

  // C3: un 403 SIN code / otro 4xx NO abre el paywall.
  installFetch((url, method) => (method === 'POST' && /\/attempts$/.test(url) ? jsonResponse({ error: { code: 'FORBIDDEN', message: 'x' } }, 403) : jsonResponse({}, 200)));
  {
    const r = await startExamAttempt(examId);
    check('C3: 403 sin PREMIUM_REQUIRED -> isPremiumRequiredError === false -> ErrorState', isPremiumRequiredError(r) === false && (await simulateHandleStart()) === 'error');
  }
  installFetch((url, method) => (method === 'POST' && /\/attempts$/.test(url) ? jsonResponse({ error: { code: 'CONFLICT', message: 'x' } }, 409) : jsonResponse({}, 200)));
  {
    const r = await startExamAttempt(examId);
    check('C3: 409 -> isPremiumRequiredError === false -> ErrorState', isPremiumRequiredError(r) === false && (await simulateHandleStart()) === 'error');
  }

  // --------------------------------------------------------------------
  console.log('--- D. runner / submit / result / review : sin gating Premium nuevo ---');
  for (const [label, path] of [
    ['runner', RUNNER],
    ['result', RESULT],
    ['review', REVIEW],
    ['attempt-cache', CACHE],
  ] as const) {
    const code = stripComments(read(path));
    check(`${label}: sin usePaywall / useEntitlement / PremiumBadge / PremiumLockedScreen / isPremiumRequiredError`,
      !/usePaywall|useEntitlement|PremiumBadge|PremiumLockedScreen|isPremiumRequiredError/.test(code));
  }
  for (const rel of [
    'apps/mobile/app/(tabs)/estudio/ensayos/[examId]/attempt/[attemptId].tsx',
    'apps/mobile/app/(tabs)/estudio/ensayos/[examId]/result/[attemptId].tsx',
    'apps/mobile/app/(tabs)/estudio/ensayos/[examId]/review/[attemptId].tsx',
    'apps/mobile/lib/exams/attempt-cache.ts',
    'apps/mobile/lib/api/exams.ts',
  ]) {
    const out = execFileSync('git', ['diff', '--stat', 'HEAD', '--', rel], { cwd: REPO_ROOT, encoding: 'utf8' });
    if (out.trim() !== '') console.error(`       diff: ${out.trim()}`);
    check(`${rel}: sin cambios en el arbol de trabajo (post-commit)`, out.trim() === '');
  }

  // --------------------------------------------------------------------
  console.log('--- E. package.json ---');
  check('verify:exam-premium-gating-gate registrado', /"verify:exam-premium-gating-gate": "tsx scripts\/verify-exam-premium-gating-gate\.ts"/.test(read('package.json')));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de gating de Ensayos (PREMIUM V1, Capa 2, C2.3) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
