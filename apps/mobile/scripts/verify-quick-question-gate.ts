// Gate del Bloque IV, Incremento 5, sub-incremento 5.d ("Pregunta rápida
// móvil") -- prueba la lógica REAL de producción
// (`lib/quick-question/outcomes.ts`) sin runtime de React Native, mismo
// criterio que verify-challenges-gate.ts. Incluye verificaciones
// ESTÁTICAS de la pantalla real (`competir/quick-question.tsx`): `close()`
// solo desde el botón "Salir", nunca en desmontaje/back; online-only, sin
// imports de la cola offline.
//
// Esto NO reemplaza la verificación manual en Browser/simulador de la
// PANTALLA (renderizado real, tema claro/oscuro, gestos, Android físico).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AnswerQuickQuestionResponse, QuickQuestionNextResponse } from '@axioma/contracts';
import type { ApiResult } from '../lib/api/client';
import { mapNextResult, mapAnswerResult, resolveAnswerOperationId } from '../lib/quick-question/outcomes';
import {
  QUICK_QUESTION_TIME_LIMIT_SECONDS,
  QUICK_QUESTION_ATTENTION_THRESHOLD_SECONDS,
  QUICK_QUESTION_URGENCY_THRESHOLD_SECONDS,
  timerLevel,
  secondsRemainingUntil,
  formatTimerSeconds,
  answerHeadline,
  optionOutcome,
} from '../lib/quick-question/quick-question-feedback';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function readSource(...pathSegments: string[]): string {
  return readFileSync(join(__dirname, '..', ...pathSegments), 'utf8');
}

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}
function http(status: number, message = 'error'): ApiResult<never> {
  return { ok: false, kind: 'http', status, message };
}
function network(message = 'sin red'): ApiResult<never> {
  return { ok: false, kind: 'network', message };
}

const questionPresented: QuickQuestionNextResponse = {
  outcome: 'QUESTION_PRESENTED',
  stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuánto es 2+2?' }],
  answerOptions: [
    { id: 'opt-1', content: { type: 'paragraph', order: 0, text: '4' }, displayOrder: 0 },
    { id: 'opt-2', content: { type: 'paragraph', order: 0, text: '5' }, displayOrder: 1 },
  ],
};
const noQuestionsAvailable: QuickQuestionNextResponse = { outcome: 'NO_QUESTIONS_AVAILABLE' };

function main() {
  console.log('--- 1. resolveAnswerOperationId: reutiliza en retry ambiguo, genera nuevo al avanzar ---');
  let generated = 0;
  const generateNew = () => {
    generated++;
    return `generated-${generated}`;
  };

  const idNoPending = resolveAnswerOperationId(null, 'opt-1', generateNew);
  check('sin intento pendiente -> genera un operationId nuevo', idNoPending === 'generated-1');

  const idRetrySameOption = resolveAnswerOperationId({ answerOptionId: 'opt-1', operationId: 'op-abc' }, 'opt-1', generateNew);
  check('retry de la MISMA alternativa (mismo pendingAttempt) -> REUTILIZA el operationId pendiente, sin generar uno nuevo', idRetrySameOption === 'op-abc');
  check('generateNew NO se llamó para el retry ambiguo', generated === 1);

  const idNewAttemptDifferentOption = resolveAnswerOperationId({ answerOptionId: 'opt-1', operationId: 'op-abc' }, 'opt-2', generateNew);
  check('un intento sobre OTRA alternativa (nueva pregunta o cambio de selección) -> genera un operationId NUEVO', idNewAttemptDifferentOption === 'generated-2');

  console.log('--- 2. mapNextResult: pregunta presentada, sin distinguir "nueva" vs. "reanudada" (precisión #1) ---');
  const presentedOutcome = mapNextResult(ok(questionPresented));
  check('outcome question_presented', presentedOutcome.kind === 'question_presented');
  check('el mapeo no expone ningún campo "isResumed"/"isNew" -- la UI la trata siempre igual', !('isResumed' in presentedOutcome) && !('isNew' in presentedOutcome));

  console.log('--- 3. mapNextResult: agotamiento, sesión cerrada, red, error ---');
  check('NO_QUESTIONS_AVAILABLE -> kind no_questions (nunca error)', mapNextResult(ok(noQuestionsAvailable)).kind === 'no_questions');
  check('409 -> kind session_closed', mapNextResult(http(409)).kind === 'session_closed');
  check('sin red -> kind network', mapNextResult(network('offline')).kind === 'network');
  check('500 -> kind error', mapNextResult(http(500)).kind === 'error');

  console.log('--- 4. mapAnswerResult: éxito, alternativa inválida, conflicto, red, error ---');
  const answerOk: AnswerQuickQuestionResponse = {
    isCorrect: true,
    correctAnswerOptionId: '00000000-0000-0000-0000-000000000001',
    explanationContent: null,
  };
  check('200 -> kind ok', mapAnswerResult(ok(answerOk)).kind === 'ok');
  check('400 -> kind invalid_option', mapAnswerResult(http(400)).kind === 'invalid_option');
  check('409 -> kind conflict (SIEMPRE definitivo, nunca ambiguo)', mapAnswerResult(http(409)).kind === 'conflict');
  check('sin red -> kind network (AMBIGUO -- el único caso que conserva el operationId)', mapAnswerResult(network()).kind === 'network');
  check('500 -> kind error', mapAnswerResult(http(500)).kind === 'error');

  console.log('--- 5. Reconciliación tras 409: los TRES resultados posibles de /next tras un conflicto ---');
  const reconcileToQuestion = mapNextResult(ok(questionPresented));
  const reconcileToNoQuestions = mapNextResult(ok(noQuestionsAvailable));
  const reconcileToSessionClosed = mapNextResult(http(409));
  check('reconciliación -> pregunta disponible: adopta question_presented', reconcileToQuestion.kind === 'question_presented');
  check('reconciliación -> sin preguntas: no_questions (estado informativo)', reconcileToNoQuestions.kind === 'no_questions');
  check('reconciliación -> sesión cerrada: session_closed (TERMINAL, sin abrir otra sesión)', reconcileToSessionClosed.kind === 'session_closed');
  check('los tres resultados de reconciliación son DISTINTOS entre sí', new Set([reconcileToQuestion.kind, reconcileToNoQuestions.kind, reconcileToSessionClosed.kind]).size === 3);

  console.log('--- 6. Frontera estática: la pantalla real de Pregunta rápida ---');
  const screenSource = readSource('app', '(tabs)', 'competir', 'quick-question.tsx');

  const closeCallSites = (screenSource.match(/closeQuickQuestionSession\(/g) ?? []).length;
  check('closeQuickQuestionSession() aparece EXACTAMENTE una vez en el archivo', closeCallSites === 1);
  const handleExitStart = screenSource.indexOf('async function handleExit');
  const handleExitEnd = screenSource.indexOf('\n}', handleExitStart);
  const handleExitBody = screenSource.slice(handleExitStart, handleExitEnd);
  check('esa única llamada vive DENTRO de handleExit (el manejador del botón "Salir")', handleExitBody.includes('closeQuickQuestionSession('));

  const useEffectBlocks = screenSource.match(/useEffect\([\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
  check('al menos un useEffect presente (montaje/mountedRef)', useEffectBlocks.length > 0);
  const anyEffectClosesSession = useEffectBlocks.some((block) => block.includes('closeQuickQuestionSession'));
  check('NINGÚN useEffect (incluida su función de limpieza de desmontaje) invoca closeQuickQuestionSession', !anyEffectClosesSession);

  check('mountedRef presente -- protege setState tras desmontar', screenSource.includes('mountedRef'));
  check('cada callback asíncrono relevante verifica mountedRef.current antes de setState', (screenSource.match(/if \(!mountedRef\.current\) return;/g) ?? []).length >= 3);

  console.log('--- 7. Online-only: sin imports de la cola offline ---');
  const quickQuestionApiSource = readSource('lib', 'api', 'quick-question.ts');
  const outcomesSource = readSource('lib', 'quick-question', 'outcomes.ts');
  for (const [label, source] of [
    ['competir/quick-question.tsx', screenSource],
    ['lib/api/quick-question.ts', quickQuestionApiSource],
    ['lib/quick-question/outcomes.ts', outcomesSource],
  ] as const) {
    check(`${label} no importa lib/offline/*`, !/from ['"].*\/offline\//.test(source));
  }

  console.log('--- 8. Doble-toque bloqueado: envío de respuesta y "Siguiente pregunta" ---');
  check('handleSubmit verifica screen.submitting antes de proceder', /if \(screen\.status !== 'question' \|\| screen\.selectedOptionId === null \|\| screen\.submitting\) return;/.test(screenSource));
  check('handleNextQuestion verifica screen.loadingNext antes de proceder', /if \(screen\.status !== 'result' \|\| screen\.loadingNext\) return;/.test(screenSource));

  console.log('--- 9. Incremento 8: temporizador VISUAL de 45 s (helpers puros) ---');
  check('el límite visual es 45 segundos', QUICK_QUESTION_TIME_LIMIT_SECONDS === 45);
  check('umbrales de urgencia: atención a 10 s, urgencia a 5 s', QUICK_QUESTION_ATTENTION_THRESHOLD_SECONDS === 10 && QUICK_QUESTION_URGENCY_THRESHOLD_SECONDS === 5);
  check('45..11 s -> normal', timerLevel(45) === 'normal' && timerLevel(11) === 'normal');
  check('10..6 s -> attention', timerLevel(10) === 'attention' && timerLevel(6) === 'attention');
  check('5..1 s -> urgent', timerLevel(5) === 'urgent' && timerLevel(1) === 'urgent');
  check('0 s -> expired', timerLevel(0) === 'expired' && timerLevel(-3) === 'expired');
  check('secondsRemainingUntil nunca es negativo', secondsRemainingUntil(1000, 5000) === 0 && secondsRemainingUntil(10_000, 2_500) === 7.5);
  check('formatTimerSeconds redondea hacia arriba y no baja de 0', formatTimerSeconds(7.2) === '8 s' && formatTimerSeconds(0) === '0 s' && formatTimerSeconds(-1) === '0 s');

  console.log('--- 10. Incremento 8: feedback -- titulares y revelado por alternativa ---');
  check('titulares: "Respuesta correcta" / "Respuesta incorrecta" / "Se acabó el tiempo"', answerHeadline('correct') === 'Respuesta correcta' && answerHeadline('incorrect') === 'Respuesta incorrecta' && answerHeadline('timeout') === 'Se acabó el tiempo');
  // Respuesta correcta: la elegida ES la correcta.
  check('respuesta correcta -> la alternativa correcta se resalta, las demás atenuadas', optionOutcome('a', 'a', 'a') === 'correct' && optionOutcome('b', 'a', 'a') === 'muted');
  // Respuesta incorrecta: se revela la correcta y se marca la elegida como incorrecta.
  check('respuesta incorrecta -> correcta revelada + elegida marcada incorrecta', optionOutcome('a', 'a', 'b') === 'correct' && optionOutcome('b', 'a', 'b') === 'incorrect' && optionOutcome('c', 'a', 'b') === 'muted');
  // Timeout LOCAL (Incremento 8): sin clave -> NADA se marca como correcto.
  check('timeout local (correctAnswerOptionId === null) -> ninguna alternativa se marca como correcta', optionOutcome('a', null, null) === 'muted' && optionOutcome('b', null, null) === 'muted');

  console.log('--- 11. Incremento 8: la pantalla real -- timer, freeze, revelado, acciones, sin reward de correctness ---');
  check('el timer arranca al presentar la pregunta (deadlineTs se fija en el estado question), NUNCA durante loading/fetch', /status: 'question'[\s\S]{0,400}deadlineTs: Date\.now\(\) \+ QUICK_QUESTION_TIME_LIMIT_SECONDS/.test(screenSource));
  check('la primera SELECCIÓN congela el temporizador (`frozen: true` en handleSelectOption)', /function handleSelectOption[\s\S]{0,500}frozen: true/.test(screenSource));
  check('el intervalo del temporizador se limpia (return () => clearInterval)', screenSource.includes('return () => clearInterval(id);'));
  check('el temporizador no se reanuda tras un error de red de envío (decisión conservadora documentada)', /el temporizador NO se reanuda|no se reanuda/i.test(screenSource));
  check('`correctAnswerOptionId` SÓLO sale de la respuesta de answer (outcome.data), NUNCA de /next', screenSource.includes('outcome.data.correctAnswerOptionId') && !/mapNextResult[\s\S]{0,200}correctAnswerOptionId/.test(screenSource));
  check('el resultado revela la alternativa correcta vía `optionOutcome` + `correctAnswerOptionId`', screenSource.includes('optionOutcome(option.id, screen.correctAnswerOptionId'));
  check('feedback correcto/incorrecto/timeout vía `answerHeadline`', screenSource.includes('answerHeadline(screen.verdict)'));
  check('alternativas BLOQUEADAS tras el resultado (disabled) -- sin segunda respuesta', /screen\.status === 'result'[\s\S]{0,1200}disabled\n/.test(screenSource) || /AnswerOptionRow[\s\S]{0,200}disabled\n/.test(screenSource));
  check('el revelado no depende SOLO del color: hay check / x-circle', screenSource.includes("name=\"check\"") && screenSource.includes("name=\"x-circle\""));
  check('acciones post-resultado: "Siguiente pregunta" + "Volver a Competir"', screenSource.includes('label="Siguiente pregunta"') && screenSource.includes('label="Volver a Competir"'));
  check('sin auto-next -- "Siguiente pregunta" es un onPress explícito (handleNextQuestion)', /label="Siguiente pregunta"[\s\S]{0,120}onPress=\{handleNextQuestion\}/.test(screenSource));
  check(
    'NINGÚN affordance de reward por correctness todavía (Incremento 10): sin "+2", sin trofeo/🏆, sin "0 LP"',
    !/\+2\b/.test(screenSource) && !/🏆|LeagueTrophy|<Trophy/.test(screenSource) && !/\b0 LP\b/.test(screenSource) && !/\bpor acertar\b/.test(screenSource),
  );
  const localTimeoutStart = screenSource.indexOf('const handleLocalTimeout');
  const localTimeoutBody = screenSource.slice(localTimeoutStart, screenSource.indexOf('}, []);', localTimeoutStart));
  check(
    'el timeout local NO consume la pregunta ni llama a answer/next (queda AISLADO para el Incremento 9)',
    localTimeoutStart > 0 &&
      localTimeoutBody.includes("verdict: 'timeout'") &&
      localTimeoutBody.includes('correctAnswerOptionId: null') &&
      !localTimeoutBody.includes('answerQuickQuestion') &&
      !localTimeoutBody.includes('nextQuickQuestion') &&
      !localTimeoutBody.includes('closeQuickQuestionSession'),
  );

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Pregunta Rápida (móvil, Bloque IV Incremento 5, sub-incremento 5.d) pasaron.');
}

main();
