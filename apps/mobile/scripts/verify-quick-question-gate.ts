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

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Pregunta Rápida (móvil, Bloque IV Incremento 5, sub-incremento 5.d) pasaron.');
}

main();
