// VC4 MICROBLOQUE 11 -- Essay Reward Truth (mobile). Estructural (lectura de
// fuente + regex), mismo criterio que `verify-account-state-isolation-gate.ts`:
// `attempt/[attemptId].tsx` importa React Native, no ejecutable bajo `tsx`
// puro. Prueba que el burst/XP optimista de Ensayo esté cableado a la
// evidencia AUTORITATIVA real (`GET /exams/:examId/reward-status`), nunca al
// mero éxito HTTP de `submit` (`result.ok`/`justCompleted`).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const MOBILE_ROOT = join(__dirname, '..');
const read = (...p: string[]) => readFileSync(join(MOBILE_ROOT, ...p), 'utf8');
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

function main() {
  const attemptScreenRaw = read('app', '(tabs)', 'estudio', 'ensayos', '[examId]', 'attempt', '[attemptId].tsx');
  const attemptScreen = strip(attemptScreenRaw);
  const examsApi = strip(read('lib', 'api', 'exams.ts'));

  console.log('--- 1/2. submit HTTP success ALONE nunca dispara burst/optimistic XP ---');

  // El bloque `if (result.ok) { ... }` de handleSubmit NUNCA debe llamar
  // addOptimisticXp/setEssayBurst directamente -- debe pasar SIEMPRE por
  // pollExamRewardGranted (la única fuente autoritativa) antes de decidir.
  // Extraído por posición (indexOf) SOBRE EL RAW (sin strip) -- el marcador
  // "// 409 = intento cerrado" es un COMENTARIO real que `strip()` ya habría
  // eliminado del texto sobre el que se busca.
  const handleSubmitStart = attemptScreenRaw.indexOf('async function handleSubmit()');
  const handleSubmitEnd = attemptScreenRaw.indexOf('\n  }\n\n  if (state.status', handleSubmitStart);
  check('handleSubmit() existe y es localizable', handleSubmitStart !== -1 && handleSubmitEnd !== -1);
  const resultOkBlock = strip(attemptScreenRaw.slice(handleSubmitStart, handleSubmitEnd === -1 ? undefined : handleSubmitEnd));
  check(
    'dentro de if (result.ok), pollExamRewardGranted se consulta ANTES de cualquier addOptimisticXp/setEssayBurst (nunca al revés)',
    /pollExamRewardGranted\(/.test(resultOkBlock) &&
      resultOkBlock.indexOf('pollExamRewardGranted(') < resultOkBlock.indexOf('addOptimisticXp(') &&
      resultOkBlock.indexOf('pollExamRewardGranted(') < resultOkBlock.indexOf('setEssayBurst(true)'),
  );
  check(
    'addOptimisticXp SOLO se llama dentro del branch `if (granted)` (nunca incondicionalmente en result.ok)',
    /if \(granted\) \{[\s\S]*?addOptimisticXp\(/.test(resultOkBlock),
  );
  check(
    'setEssayBurst(true) SOLO se llama dentro del branch `if (granted)` (nunca incondicionalmente en result.ok)',
    /if \(granted\) \{[\s\S]*?setEssayBurst\(true\)/.test(resultOkBlock),
  );
  check(
    'existe una rama explícita para "ventana agotada sin GRANTED" que navega SIN burst ni XP optimista',
    /goToResult\(\);\s*\n\s*return;\s*\n\s*\}\s*\n?\s*$/.test(resultOkBlock) || /return;\s*\n\s*\}[\s\S]*goToResult\(\);/.test(resultOkBlock),
  );

  console.log('--- 3/4. identidad de recompensa = accountId+examId (server-side), justCompleted NUNCA tratado como rewardGranted ---');

  check(
    'pollExamRewardGranted consulta getExamRewardStatus(examId) -- lectura AUTORITATIVA server-side, nunca un campo local',
    /getExamRewardStatus\(examId\)/.test(attemptScreen),
  );
  check(
    'ningún campo local ("justCompleted"/booleano propio) se usa como proxy de "reward otorgado" -- la señal real es result.data.status === \'GRANTED\'',
    /result\.data\.status === 'GRANTED'/.test(attemptScreen) && !/justCompleted/.test(attemptScreen),
  );
  check(
    'el cliente NUNCA envía accountId -- getExamRewardStatus(examId) en lib/api/exams.ts toma solo examId, identidad la deriva apiRequest/AuthGuard server-side (mismo criterio que el resto del cliente)',
    /export function getExamRewardStatus\(examId: string\)/.test(examsApi) && !/accountId/i.test(examsApi),
  );

  console.log('--- 5. GRANTED requiere evidencia autoritativa del backend (nunca optimista) ---');

  check(
    'getExamRewardStatus usa el schema de contracts examRewardStatusResponseSchema (validación real, no un tipo manual)',
    /examRewardStatusResponseSchema/.test(examsApi),
  );
  check(
    'xpAmount mostrado en el burst viene EXCLUSIVAMENTE de la respuesta autoritativa (addOptimisticXp(xpAmount), sin fallback a un literal hardcodeado -- GRANTED garantiza xpAmount real, ver examRewardStatusResponseSchema)',
    /addOptimisticXp\(xpAmount\)/.test(attemptScreen) && !/addOptimisticXp\(xpAmount \?\?/.test(attemptScreen),
  );

  console.log('--- 6. Replay del mismo examen -> sin nuevo grant, sin burst (estructural: mismo endpoint, mismo servicio idempotente) ---');
  check(
    'reward-status se consulta vía GET (lectura pura, nunca un POST/escritura) -- un replay nunca re-otorga desde el cliente',
    /'GET', `\$\{BASE\}\/\$\{examId\}\/reward-status`/.test(examsApi),
  );

  console.log('--- 6b. PRE-QA CONSISTENCY FIX -- baseline AUTORITATIVO antes del submit, distingue "ya estaba GRANTED" de "recién otorgado" ---');

  const submitCallPos = attemptScreen.indexOf('await submitExamAttempt(attemptId)');
  const baselineCallPos = attemptScreen.indexOf('await getExamRewardStatus(examId)');
  check(
    'existe una consulta a getExamRewardStatus(examId) ANTES del propio submitExamAttempt (baseline real, no una suposición)',
    baselineCallPos !== -1 && submitCallPos !== -1 && baselineCallPos < submitCallPos,
  );
  check(
    'wasGrantedBeforeSubmit se deriva de esa consulta baseline (nunca de una memoria local histórica tipo "burstShownForExamIds")',
    /const wasGrantedBeforeSubmit = !baseline\.ok \|\| baseline\.data\.status === 'GRANTED';/.test(attemptScreen) &&
      !/burstShownFor|shownExamIds|localBurstHistory/i.test(attemptScreen),
  );
  check(
    'fail-closed: si la consulta baseline falla (red), wasGrantedBeforeSubmit se asume true (el estado MÁS conservador -- nunca arriesga un burst falso)',
    /!baseline\.ok \|\| baseline\.data\.status === 'GRANTED'/.test(attemptScreen),
  );
  const wasGrantedGuardPos = attemptScreen.indexOf('if (wasGrantedBeforeSubmit) {');
  const pollCallPos = attemptScreen.indexOf('await pollExamRewardGranted(');
  check(
    'if (wasGrantedBeforeSubmit) { goToResult(); return; } aparece ANTES de pollExamRewardGranted -- el poll NUNCA se ejecuta si ya estaba GRANTED (replay de ENSAYO.M2: cero red extra, cero burst, cero XP optimista)',
    wasGrantedGuardPos !== -1 && pollCallPos !== -1 && wasGrantedGuardPos < pollCallPos,
  );
  check(
    'la rama wasGrantedBeforeSubmit navega con goToResult() ANTES de cualquier addOptimisticXp/setEssayBurst en ese camino (return inmediato, código muerto imposible)',
    /if \(wasGrantedBeforeSubmit\) \{\s*\n\s*goToResult\(\);\s*\n\s*return;\s*\n\s*\}/.test(attemptScreen),
  );
  check(
    'CASO "PENDING antes -> GRANTED después": el poll SÓLO corre cuando wasGrantedBeforeSubmit === false (guard de arriba ya retornó en el caso contrario) -- sigue siendo alcanzable un burst único para una recompensa GENUINAMENTE nueva',
    pollCallPos > wasGrantedGuardPos,
  );

  console.log('--- 7. Primera recompensa -> a lo sumo UN burst (estado React, no un contador global) ---');
  check(
    'essayBurst sigue siendo un único booleano de React State (setEssayBurst) -- un solo montaje posible del RewardBurst por vez, nunca una cola',
    /const \[essayBurst, setEssayBurst\] = useState/.test(attemptScreen),
  );
  check(
    'el RewardBurst se desmonta a sí mismo en onComplete (setEssayBurst(false)) -- no puede re-montarse sin un nuevo ciclo granted=true explícito',
    /onComplete=\{\(\) => \{\s*\n\s*setEssayBurst\(false\);/.test(attemptScreen),
  );

  console.log('--- 8/9. Reconciliación ACOTADA -- no infinita, se detiene, cancela en unmount ---');

  check('REWARD_POLL_OFFSETS_MS es un arreglo FINITO de offsets (ventana acotada, nunca un intervalo infinito)', /const REWARD_POLL_OFFSETS_MS = \[[\d,\s]+\];/.test(attemptScreen));
  check(
    'pollExamRewardGranted itera SOLO sobre REWARD_POLL_OFFSETS_MS (for...of sobre un arreglo finito, nunca while(true)/setInterval)',
    /for \(const offset of REWARD_POLL_OFFSETS_MS\)/.test(attemptScreen) && !/setInterval|while \(true\)/.test(attemptScreen),
  );
  check(
    'pollExamRewardGranted revisa isCancelled() ANTES de cada intento Y antes de cada espera -- nunca actualiza tras desmontar',
    (attemptScreen.match(/if \(isCancelled\(\)\) return \{ granted: false, xpAmount: null \};/g) ?? []).length >= 3,
  );
  check(
    'isCancelled se construye desde mounted.current (el mismo ref ya usado por toda la pantalla para cancelación) -- nunca un segundo mecanismo paralelo',
    /pollExamRewardGranted\(examId, \(\) => !mounted\.current\)/.test(attemptScreen),
  );
  check(
    'tras el poll, se revisa mounted.current de nuevo antes de tocar cualquier estado de React (addOptimisticXp/setEssayBurst/goToResult)',
    /const \{ granted, xpAmount \} = await pollExamRewardGranted\(examId, \(\) => !mounted\.current\);\s*\n\s*if \(!mounted\.current\) return;/.test(attemptScreen),
  );

  console.log('--- 10. Ningún accountId se pasa insegurametne desde mobile ---');
  check('ninguna llamada a getExamRewardStatus incluye un segundo argumento (nunca accountId/cuenta arbitraria del cliente)', !/getExamRewardStatus\([^)]*,/.test(attemptScreen));

  console.log('--- 11. Sin cambio de monto de recompensa ni de la regla de negocio ---');
  check('XP_REWARD_BY_ACTIVITY_TYPE.ENSAYO_COMPLETADO sigue siendo el único literal de monto usado como fallback (100 vía la constante ya existente, no un nuevo número mágico)', /XP_REWARD_BY_ACTIVITY_TYPE\.ENSAYO_COMPLETADO/.test(attemptScreen));
  check('ningún literal numérico nuevo de "100" aparece suelto en el bloque de submit (el único monto es xpAmount autoritativo o el fallback ya existente)', !/addOptimisticXp\(100\)/.test(attemptScreen));

  console.log('--- 13. Invariante GRANTED => xpAmount no-nulo, forzada en el contrato (packages/contracts) ---');
  const contractsSrc = strip(readFileSync(join(MOBILE_ROOT, '..', '..', 'packages', 'contracts', 'src', 'exams.ts'), 'utf8'));
  check(
    'examRewardStatusResponseSchema tiene un .refine que rechaza GRANTED con xpAmount null (nunca solo documentado, forzado en runtime)',
    /\.refine\(\(v\) => v\.status !== 'GRANTED' \|\| v\.xpAmount !== null/.test(contractsSrc),
  );

  console.log('--- 12. Sin import de lib/offline/* (ENSAYOS sigue ONLINE-ONLY) ---');
  check('attempt/[attemptId].tsx sigue sin importar lib/offline/*', !/from ['"].*\/offline\//.test(attemptScreen));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de EXAM REWARD TRUTH (VC4 MICROBLOQUE 11, mobile) pasaron.');
}

main();
