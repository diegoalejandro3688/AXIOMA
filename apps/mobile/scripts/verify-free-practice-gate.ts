// Gate del modo Práctica libre (ESTUDIO / PRÁCTICA LIBRE V1, P1 mobile).
//
// Node puro. Combina:
//   - scan de fuente del runner / tile / route / stack / gate de exámenes;
//   - comprobación de comportamiento de los helpers `lib/api/practice.ts`
//     con `fetch` stub (mismo criterio que `verify-recursos-catalog-gate.ts`,
//     incl. la redirección de `expo-secure-store` al stub compartido).
import Module from 'node:module';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

type ResolveFilename = (request: string, ...rest: unknown[]) => string;
const moduleWithInternals = Module as unknown as { _resolveFilename: ResolveFilename };
const originalResolveFilename = moduleWithInternals._resolveFilename;
moduleWithInternals._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === 'expo-secure-store') {
    return join(__dirname, '__stubs__', 'expo-secure-store.ts');
  }
  return originalResolveFilename.call(this, request, ...rest);
} as ResolveFilename;

const MOBILE = join(__dirname, '..');
let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures += 1;
  }
}
const read = (rel: string) => readFileSync(join(MOBILE, rel), 'utf8');
/** Sin comentarios -- los "no importa/usa X" escanean SÓLO código: los docstrings
 *  mencionan a propósito lo que NO se hace (resourceFlowNav, XP, lib/progress...). */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '').replace(/^\s*\/\/.*$/gm, '');

const runner = read('app/(tabs)/estudio/[subjectId]/practica-libre.tsx');
const runnerCode = stripComments(runner);
const apiHelper = read('lib/api/practice.ts');
const apiHelperCode = stripComments(apiHelper);
const tile = read('app/(tabs)/estudio/[subjectId]/index.tsx');
const layout = read('app/(tabs)/estudio/_layout.tsx');
const examGate = read('scripts/verify-exam-mobile-flow-gate.ts');

// --------------------------------------------------------------------------
console.log('--- 1-4. Tile / route / copy / stack ---');
check('tile practica-libre enabled: true', /key: 'practica-libre',[\s\S]{0,180}enabled: true/.test(tile));
check("copy nueva: 'Practica con preguntas aleatorias de la materia.'", /description: 'Practica con preguntas aleatorias de la materia\.'/.test(tile));
check('tile: label "Práctica libre" e icon study-mode-practice sin cambios', /key: 'practica-libre',[\s\S]{0,180}label: 'Práctica libre',[\s\S]{0,180}icon: 'study-mode-practice'/.test(tile));
check('TILE_ROUTE: practica-libre -> /(tabs)/estudio/[subjectId]/practica-libre', /'practica-libre': '\/\(tabs\)\/estudio\/\[subjectId\]\/practica-libre'/.test(tile));
check('_layout: <Stack.Screen name="[subjectId]/practica-libre" title "Práctica libre">', /name="\[subjectId\]\/practica-libre"\s+options=\{\{ title: 'Práctica libre' \}\}/.test(layout));
check('Unidades / Recursos / Ensayo del selector sin tocar (siguen enabled)', /key: 'unidades',[\s\S]{0,180}enabled: true/.test(tile) && /key: 'recursos',[\s\S]{0,180}enabled: true/.test(tile) && /key: 'ensayo',[\s\S]{0,180}enabled: true/.test(tile));

// --------------------------------------------------------------------------
console.log('--- 5. El runner NO pertenece al lane académico ---');
for (const forbidden of [
  'submitResponseViaOutbox',
  'submitResponse',
  'getTopicProgress',
  'getTopicsProgressBatch',
  'resourceFlowNav',
  'resolveContinuationEntry',
  'aggregateUnitProgressStatus',
  'lib/offline',
  'lib/progress',
  'syncPendingOperations',
]) {
  check(`runner no importa/usa \`${forbidden}\``, !runnerCode.includes(forbidden));
}
check('runner importa SOLO el lane de práctica (`lib/api/practice`)', /from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/api\/practice'/.test(runner));
check('helper `lib/api/practice.ts` no importa lib/offline ni lib/progress', !/lib\/offline|lib\/progress/.test(apiHelperCode));

// --------------------------------------------------------------------------
console.log('--- 6-10. Sampling / exclusión / no repetición ---');
check('runner mantiene un seen set SOLO en memoria (useRef<Set>)', /useRef<Set<string>>\(new Set\(\)\)/.test(runner));
check('seen set NO se persiste (sin AsyncStorage / SecureStore / SQLite en el runner)', !/AsyncStorage|SecureStore|expo-sqlite|localStorage/.test(runner));
check('la pregunta mostrada entra al seen set', /seenRef\.current\.add\(question\.versionId\)/.test(runner));
check('cada sample envía las ya vistas como exclude', /samplePracticeQuestion\(subjectId, \[\.\.\.seenRef\.current\]\)/.test(runner));
check('el cliente NO elige al azar (sin Math.random / shuffle)', !/Math\.random|shuffle/.test(runner));

// --------------------------------------------------------------------------
console.log('--- 11-13. Empty / exhausted / answer failure ---');
check('sample null en la primera carga -> estado empty', /outcome\.question === null[\s\S]{0,120}status: 'empty'/.test(runner));
check('sample null tras actividad (Continuar) -> estado exhausted', /outcome\.question === null[\s\S]{0,120}status: 'exhausted'/.test(runner));
check('empty usa EmptyState con copy de materia sin preguntas', /EmptyState message="Todav[íi]a no hay preguntas disponibles para esta materia\."/.test(runner));
check('exhausted: "Has practicado todas las preguntas disponibles de esta materia." + Salir', /Has practicado todas las preguntas disponibles de esta materia\./.test(runner) && /label="Salir"/.test(runner));
check('exhausted: sin score / porcentaje / resultado', !/porcentaje|de aciertos|score|puntaje/i.test(runner));
check('answer con fallo NO avanza (mantiene la pregunta) y limpia la selección', /result\.ok[\s\S]{0,400}setSelectedOptionId\(null\)[\s\S]{0,120}setSubmitError/.test(runner));
check('answer: nunca marca isCorrect local sin respuesta del servidor', /if \(result\.ok\) \{[\s\S]{0,200}setAnswer\(\{ answerOptionId: result\.data\.answerOptionId, isCorrect: result\.data\.isCorrect \}\)/.test(runner));
check('fallo al cargar la siguiente: mantiene la anterior + Reintentar', /setNextError\('No se pudo cargar la siguiente pregunta/.test(runner) && /label=\{nextError \? 'Reintentar' : 'Continuar'\}/.test(runner));

// --------------------------------------------------------------------------
console.log('--- 14-17. Sin timer / LP / XP / progress bar fija ---');
for (const forbidden of ['Timer', 'timer', 'deadlineAt', 'QuickQuestion', 'LeagueTrophy', ' LP', 'League Points', ' XP', ' xp', 'progressSegment', 'progressTrack', 'totalSteps', 'currentStep']) {
  check(`runner sin \`${forbidden.trim()}\``, !runnerCode.includes(forbidden));
}
check('runner sin barra de progreso segmentada (Array.from length totalSteps)', !/Array\.from\(\{ length:/.test(runnerCode));
check('runner sin contador X/Y', !/Pregunta \d|\d+ de \d+|\$\{.*\} de \$\{/.test(runnerCode));

// --------------------------------------------------------------------------
console.log('--- 18. Gate de exam flow: assertion obsoleta corregida ---');
check('verify-exam-mobile-flow-gate ya NO exige recursos/practica-libre disabled', !/tiles 'recursos' y 'practica-libre' siguen deshabilitados/.test(examGate));
check('verify-exam-mobile-flow-gate documenta el fix como stale assertion', /stale assertion discovered during free-practice audit/.test(examGate));
check('verify-exam-mobile-flow-gate ahora afirma los 4 modos enabled', /los cuatro tiles de modalidad están enabled: true/.test(examGate));
check('verify-exam-mobile-flow-gate: flujo de Ensayos intacto (secciones 1-12 sin tocar)', /sin shuffle\/sort\/random del arreglo de preguntas/.test(examGate));

// --------------------------------------------------------------------------
console.log('--- 19. Helpers `lib/api/practice.ts`: URLs y bodies (fetch stub) ---');
async function behaviour() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';
  const { samplePracticeQuestion, answerPracticeQuestion } = await import('../lib/api/practice');

  const calls: Array<{ method: string; url: string; body: unknown }> = [];
  (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      method: init?.method ?? 'GET',
      url: typeof input === 'string' ? input : input.toString(),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (String(input).includes('/answer')) {
      return new Response(JSON.stringify({ questionVersionId: 'a1b2c3d4-0000-4000-8000-000000000001', answerOptionId: 'a1b2c3d4-0000-4000-8000-000000000002', isCorrect: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ question: null }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  const sub = 'a1b2c3d4-0000-4000-8000-0000000000ff';
  const qv = 'a1b2c3d4-0000-4000-8000-000000000001';
  const opt = 'a1b2c3d4-0000-4000-8000-000000000002';

  const s = await samplePracticeQuestion(sub, [qv, qv]);
  check('sample: POST a /education/subjects/:id/practice-questions/sample', calls[0]?.method === 'POST' && calls[0]?.url.endsWith(`/education/subjects/${sub}/practice-questions/sample`));
  check('sample: body lleva excludeQuestionVersionIds', Array.isArray((calls[0]?.body as { excludeQuestionVersionIds?: unknown[] })?.excludeQuestionVersionIds));
  check('sample: { question: null } se resuelve ok', s.ok && s.data.question === null);

  const a = await answerPracticeQuestion(sub, qv, opt);
  check('answer: POST a /education/subjects/:id/practice-questions/:qvId/answer', calls[1]?.method === 'POST' && calls[1]?.url.endsWith(`/education/subjects/${sub}/practice-questions/${qv}/answer`));
  check('answer: body = { answerOptionId }', (calls[1]?.body as { answerOptionId?: string })?.answerOptionId === opt);
  check('answer: devuelve isCorrect server-authoritative', a.ok && a.data.isCorrect === true);
}

behaviour()
  .then(() => {
    console.log('');
    if (failures > 0) {
      console.error(`Gate de Práctica libre (P1 mobile): ${failures} verificación(es) fallaron.`);
      process.exit(1);
    }
    console.log('Gate de Práctica libre (P1 mobile): todas las verificaciones pasaron.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
