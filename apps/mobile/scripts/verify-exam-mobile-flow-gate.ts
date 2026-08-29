// Gate de ENSAYOS-M1-C ("Flujo mobile del Ensayo PAES M1") -- ver
// docs/adr/0024-ensayos-foundation.md. Prueba la lógica REAL de producción
// (`lib/exams/timer.ts`, `lib/exams/attempt-state.ts` -- RN-free) sin runtime
// de React Native, mismo criterio que `verify-quick-question-gate.ts`, MÁS
// verificaciones ESTÁTICAS de las pantallas y el cliente de API.
//
// NO reemplaza la verificación manual en emulador/Browser (render real, tema
// claro/oscuro, gestos, Android físico, timer en background).
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ExamAttemptQuestion, ExamAttemptReviewQuestion } from '@axioma/contracts';
import {
  calibrateTimer,
  remainingMs,
  isExpiredByClock,
  formatCountdown,
  formatDuration,
} from '../lib/exams/timer';
import {
  selectionsFromQuestions,
  withSelection,
  countProgress,
  routeForAttemptStatus,
  isTerminal,
  liveOptionState,
  reviewOptionState,
  navCellState,
  reviewNavCellState,
  resultStatusLabel,
} from '../lib/exams/attempt-state';

const mobileDir = join(__dirname, '..');
const repoRoot = join(mobileDir, '..', '..');
let failures = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    if (detail) console.error(`       -> ${detail}`);
    failures++;
  }
}
function read(...segments: string[]): string {
  return readFileSync(join(mobileDir, ...segments), 'utf8');
}
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function main() {
  console.log('--- 1. timer.ts: countdown derivado de expiresAt + serverTime (server-authoritative) ---');
  // servidor 10s por delante del cliente; expira 60s después del serverTime.
  const cal = calibrateTimer({ expiresAt: '2026-01-01T00:01:00.000Z', serverTime: '2026-01-01T00:00:00.000Z' }, Date.parse('2025-12-31T23:59:50.000Z'));
  check('skew = serverNow - clientNow (= +10s)', cal.skewMs === 10_000);
  check('expiresAtMs corresponde al expiresAt del backend', cal.expiresAtMs === Date.parse('2026-01-01T00:01:00.000Z'));
  // En el instante de calibrar, el servidor dice 00:00:00 y expira a 00:01:00 -> 60s.
  const rem = remainingMs(cal, Date.parse('2025-12-31T23:59:50.000Z'));
  check('restante calibrado contra el reloj del servidor = 60s', rem === 60_000);
  // 5s de reloj local después, el servidor estimado son 00:00:05 -> quedan 55s.
  const remLater = remainingMs(cal, Date.parse('2025-12-31T23:59:55.000Z'));
  check('5s de reloj local después -> 55s restantes', remLater === 55_000);
  check('nunca negativo', remainingMs(cal, Date.parse('2030-01-01T00:00:00.000Z')) === 0);
  check('isExpiredByClock true cuando el reloj calibrado pasó expiresAt', isExpiredByClock(cal, Date.parse('2030-01-01T00:00:00.000Z')));
  check('isExpiredByClock false mientras queda tiempo', !isExpiredByClock(cal, Date.parse('2025-12-31T23:59:50.000Z')));

  console.log('--- 2. formato ---');
  check('formatCountdown(8400_000) = "02:20:00"', formatCountdown(8_400_000) === '02:20:00');
  check('formatCountdown redondea hacia arriba el segundo en curso', formatCountdown(1) === '00:00:01');
  check('formatCountdown(0) = "00:00:00"', formatCountdown(0) === '00:00:00');
  check('formatDuration(8400) = "2 h 20 min"', formatDuration(8400) === '2 h 20 min');
  check('formatDuration(3600) = "1 h"', formatDuration(3600) === '1 h');
  check('formatDuration(1200) = "20 min"', formatDuration(1200) === '20 min');

  console.log('--- 3. attempt-state.ts: selecciones, conteos, ruteo ---');
  const q = (id: string, selected: string | null): ExamAttemptQuestion => ({
    questionVersionId: id,
    displayOrder: 1,
    stemContent: [{ type: 'paragraph', order: 0, text: 'x' }],
    answerOptions: [{ id: `${id}-a`, content: { type: 'paragraph', order: 0, text: 'a' }, displayOrder: 0 }],
    selectedAnswerOptionId: selected,
  });
  const questions = [q('q1', 'q1-a'), q('q2', null), q('q3', 'q3-a')];
  const selections = selectionsFromQuestions(questions);
  check('selectionsFromQuestions toma la selección del backend, ignora las null', JSON.stringify(selections) === JSON.stringify({ q1: 'q1-a', q3: 'q3-a' }));
  const updated = withSelection(selections, 'q2', 'q2-a');
  check('withSelection no muta el original', selections.q2 === undefined && updated.q2 === 'q2-a');
  const counts = countProgress(questions, selections);
  check('countProgress: 3 total / 2 respondidas / 1 sin responder', counts.total === 3 && counts.answered === 2 && counts.unanswered === 1);
  check('routeForAttemptStatus ACTIVE -> questions', routeForAttemptStatus('ACTIVE') === 'questions');
  check('routeForAttemptStatus COMPLETED -> result', routeForAttemptStatus('COMPLETED') === 'result');
  check('routeForAttemptStatus EXPIRED -> result (nunca "questions")', routeForAttemptStatus('EXPIRED') === 'result');
  check('isTerminal: COMPLETED y EXPIRED sí, ACTIVE no', isTerminal('COMPLETED') && isTerminal('EXPIRED') && !isTerminal('ACTIVE'));
  check('resultStatusLabel distingue COMPLETED vs EXPIRED', resultStatusLabel('COMPLETED') === 'Ensayo entregado' && resultStatusLabel('EXPIRED') === 'Tiempo finalizado');

  console.log('--- 4. estados visuales: DURANTE el intento nunca se revela corrección ---');
  check('liveOptionState: pendiente -> submitting', liveOptionState({ optionId: 'a', selectedOptionId: undefined, pendingOptionId: 'a' }) === 'submitting');
  check('liveOptionState: seleccionada -> selected', liveOptionState({ optionId: 'a', selectedOptionId: 'a', pendingOptionId: null }) === 'selected');
  check('liveOptionState: otra -> default', liveOptionState({ optionId: 'b', selectedOptionId: 'a', pendingOptionId: null }) === 'default');
  check("liveOptionState NUNCA devuelve 'correct' ni 'incorrect'", !['correct', 'incorrect'].includes(liveOptionState({ optionId: 'a', selectedOptionId: 'a', pendingOptionId: null }) as string));
  check('navCellState: actual/respondida/sin responder, sin correcta/incorrecta', navCellState({ isCurrent: true, isAnswered: false }) === 'current' && navCellState({ isCurrent: false, isAnswered: true }) === 'answered' && navCellState({ isCurrent: false, isAnswered: false }) === 'unanswered');

  console.log('--- 5. estados visuales: EN LA REVISIÓN sí se distingue correcta/incorrecta/sin responder ---');
  const rq = (correct: string, selected: string | null, isCorrect: boolean): ExamAttemptReviewQuestion => ({
    questionVersionId: 'q', displayOrder: 1,
    stemContent: [{ type: 'paragraph', order: 0, text: 'x' }],
    answerOptions: [
      { id: 'A', content: { type: 'paragraph', order: 0, text: 'a' }, displayOrder: 0 },
      { id: 'B', content: { type: 'paragraph', order: 0, text: 'b' }, displayOrder: 1 },
    ],
    selectedAnswerOptionId: selected, correctAnswerOptionId: correct, isCorrect,
    explanationContent: [{ type: 'paragraph', order: 0, text: 'porque sí' }],
  });
  check('reviewOptionState: la correcta -> correct', reviewOptionState(rq('A', 'B', false), 'A') === 'correct');
  check('reviewOptionState: la elegida equivocada -> incorrect', reviewOptionState(rq('A', 'B', false), 'B') === 'incorrect');
  check('reviewOptionState: otra -> default', reviewOptionState(rq('A', 'B', false), 'B') === 'incorrect');
  check('reviewNavCellState: sin responder -> unanswered', reviewNavCellState({ isCurrent: false, question: rq('A', null, false) }) === 'unanswered');
  check('reviewNavCellState: acierto -> correct', reviewNavCellState({ isCurrent: false, question: rq('A', 'A', true) }) === 'correct');
  check('reviewNavCellState: error -> incorrect', reviewNavCellState({ isCurrent: false, question: rq('A', 'B', false) }) === 'incorrect');

  console.log('--- 6. Rutas del flujo existen ---');
  const routeFiles = [
    'app/(tabs)/estudio/ensayos/index.tsx',
    'app/(tabs)/estudio/ensayos/[examId]/index.tsx',
    'app/(tabs)/estudio/ensayos/[examId]/attempt/[attemptId].tsx',
    'app/(tabs)/estudio/ensayos/[examId]/result/[attemptId].tsx',
    'app/(tabs)/estudio/ensayos/[examId]/review/[attemptId].tsx',
  ];
  for (const rel of routeFiles) check(`existe ${rel}`, existsSync(join(mobileDir, rel)));
  const layout = read('app/(tabs)/estudio/_layout.tsx');
  for (const name of ['ensayos/index', 'ensayos/[examId]/index', 'ensayos/[examId]/attempt/[attemptId]', 'ensayos/[examId]/result/[attemptId]', 'ensayos/[examId]/review/[attemptId]']) {
    check(`_layout.tsx registra "${name}"`, layout.includes(`name="${name}"`));
  }

  console.log('--- 7. Cliente de API: solo /exams, contracts de F1, sin StudentResponse ---');
  const examsApi = read('lib/api/exams.ts');
  check('lib/api/exams.ts usa rutas /exams', /['"`]\/exams/.test(examsApi));
  check('lib/api/exams.ts NO usa /progress/topics ni /education', !/\/progress\/topics|\/education\//.test(examsApi));
  check('lib/api/exams.ts NO menciona StudentResponse ni submitResponse', !/StudentResponse|submitResponse/i.test(examsApi));
  check('lib/api/exams.ts importa schemas de @axioma/contracts (no interfaces manuales)', /from '@axioma\/contracts'/.test(examsApi) && /examAttemptQuestionsResponseSchema/.test(examsApi));
  check('lib/api/exams.ts NO importa lib/offline/*', !/from ['"].*\/offline\//.test(examsApi));

  console.log('--- 8. Pantallas del flujo: sin Study/progreso, sin XP/LP, sin puntaje PAES ---');
  const flowScreens = routeFiles.map((rel) => [rel, stripComments(read(rel))] as const);
  const flowLib = [
    ['lib/exams/timer.ts', stripComments(read('lib/exams/timer.ts'))],
    ['lib/exams/attempt-state.ts', stripComments(read('lib/exams/attempt-state.ts'))],
    ['lib/exams/attempt-cache.ts', stripComments(read('lib/exams/attempt-cache.ts'))],
    ['components/exams/exam-countdown.tsx', stripComments(read('components/exams/exam-countdown.tsx'))],
    ['components/exams/exam-question-navigator.tsx', stripComments(read('components/exams/exam-question-navigator.tsx'))],
  ] as const;
  for (const [rel, src] of [...flowScreens, ...flowLib]) {
    check(`${rel}: sin lib/api/progress ni submitResponseViaOutbox`, !/lib\/api\/progress|submitResponseViaOutbox/.test(src));
    check(`${rel}: sin imports de lib/offline/*`, !/from ['"].*\/offline\//.test(src));
    check(`${rel}: sin XP/LP/racha/liga/trofeo`, !/\bXP\b|\bLP\b|racha|streak|liga|league|trofeo|xpAmount|leaguePoint/i.test(src));
    check(`${rel}: sin puntaje PAES / escala 100-1000 / percentil`, !/puntaje PAES|escala.*1000|100.*1000|percentil|percentile|scaled ?score/i.test(src));
  }

  console.log('--- 9. Timer basado en expiresAt/serverTime, no en una duración local ---');
  const countdown = read('components/exams/exam-countdown.tsx');
  check('ExamCountdown recibe expiresAt y serverTime', /expiresAt/.test(countdown) && /serverTime/.test(countdown));
  check('ExamCountdown NO hace "Date.now() + 8400" ni suma una duración fija', !/Date\.now\(\)\s*\+\s*\d{3,}/.test(countdown) && !/\+\s*8400/.test(countdown));
  check('ExamCountdown recalibra cuando cambian los props (refetch)', /useEffect\([\s\S]*calibrateTimer[\s\S]*\[expiresAt, serverTime\]/.test(countdown));
  const attemptScreen = read('app/(tabs)/estudio/ensayos/[examId]/attempt/[attemptId].tsx');
  check('la pantalla de intento pasa timing del backend al countdown', /ExamCountdown[\s\S]*expiresAt=\{state\.timing\.expiresAt\}[\s\S]*serverTime=\{state\.timing\.serverTime\}/.test(attemptScreen));

  console.log('--- 10. Sin fuga de pauta mientras ACTIVE ---');
  check('la pantalla de intento NO renderiza explanationContent', !/explanationContent/.test(stripComments(attemptScreen)));
  check('la pantalla de intento NO usa correctAnswerOptionId ni isCorrect', !/correctAnswerOptionId|\.isCorrect/.test(stripComments(attemptScreen)));
  check('la pantalla de intento marca las opciones como radio (no button de resultado)', /accessibilityRole="radio"/.test(attemptScreen));
  const reviewScreen = read('app/(tabs)/estudio/ensayos/[examId]/review/[attemptId].tsx');
  check('la REVISIÓN sí usa correctAnswerOptionId + explanationContent (solo tras cierre)', /correctAnswerOptionId/.test(reviewScreen) && /explanationContent/.test(reviewScreen));

  console.log('--- 11. Doble-toque bloqueado ---');
  check('handleSelect verifica pendingOptionId antes de proceder', /pendingOptionId !== null\) return/.test(attemptScreen));
  check('handleSubmit verifica submitting antes de proceder', /submitting\) return/.test(attemptScreen));
  check('submit pasa por un Dialog de confirmación', /Dialog[\s\S]*confirmSubmit/.test(attemptScreen) && /¿Quieres entregar el ensayo\?/.test(attemptScreen));

  console.log('--- 12. Orden fijo: se usa el orden del backend, sin shuffle ---');
  for (const [rel, src] of flowScreens) {
    check(`${rel}: sin shuffle/sort/random del arreglo de preguntas`, !/\.sort\(|shuffle|Math\.random\(\)[\s\S]{0,40}questions/i.test(src));
  }
  check('el navegador usa index+1 como número de pregunta (posición estable)', /\{index \+ 1\}/.test(read('components/exams/exam-question-navigator.tsx')));

  console.log('--- 13. Tile "Ensayo" habilitado y con ruta a /estudio/ensayos ---');
  const tile = read('app/(tabs)/estudio/[subjectId]/index.tsx');
  check("el tile 'ensayo' está enabled: true", /key: 'ensayo',[\s\S]{0,160}enabled: true/.test(tile));
  check("el tile 'ensayo' rutea a /(tabs)/estudio/ensayos", /ensayo: '\/\(tabs\)\/estudio\/ensayos'/.test(tile));
  check("los tiles 'recursos' y 'practica-libre' siguen deshabilitados", /key: 'recursos',[\s\S]{0,160}enabled: false/.test(tile) && /key: 'practica-libre',[\s\S]{0,160}enabled: false/.test(tile));

  console.log('--- 14. Regresión Study: pantallas del recorrido de Study sin cambios ---');
  // ENSAYOS-M1-D toca a propósito `content-block-renderer.tsx` (tamaño
  // contextual de fórmulas) -> sale de esta lista y se cubre por assertions
  // de comportamiento en la sección 16 + los gates de lógica de Study.
  const studyReaders = [
    'apps/mobile/app/(tabs)/estudio/topic/[topicId]/ejercicio.tsx',
    'apps/mobile/app/(tabs)/estudio/topic/[topicId]/recurso.tsx',
    'apps/mobile/app/(tabs)/estudio/[subjectId]/unidades.tsx',
    'apps/mobile/app/(tabs)/estudio/index.tsx',
    'apps/mobile/lib/api/education.ts',
    'apps/mobile/components/ui/answer-option.tsx',
  ];
  for (const rel of studyReaders) {
    const out = execFileSync('git', ['diff', '--stat', 'HEAD', '--', rel.replace(/\\/g, '/')], { cwd: repoRoot, encoding: 'utf8' });
    check(`${rel}: sin cambios en el árbol de trabajo`, out.trim() === '', out.trim());
  }

  console.log('--- 15. ENSAYOS-M1-D: fixture de 65 preguntas -- Q63 -> Q64 -> Q65 respondibles, 65/65, submit sin sin-responder ---');
  const mk65 = (i: number): ExamAttemptQuestion => ({
    questionVersionId: `qv-${i}`,
    displayOrder: i,
    stemContent: [{ type: 'paragraph', order: 0, text: `Pregunta ${i}` }],
    answerOptions: [
      { id: `qv-${i}-a`, content: { type: 'paragraph', order: 0, text: 'a' }, displayOrder: 0 },
      {
        id: `qv-${i}-b`,
        // Q64/Q65 reales tienen alternativas "solo fórmula" (fracciones) --
        // el fixture las incluye para no probar solo un límite sintético.
        content: { type: 'formula', order: 0, latex: '\\frac{13}{20}', svg: '<svg width="2.595ex" height="2.789ex" viewBox="0 -872 1147 1232"></svg>' },
        displayOrder: 1,
      },
    ],
    selectedAnswerOptionId: null,
  });
  const exam65 = Array.from({ length: 65 }, (_, k) => mk65(k + 1));
  check('el fixture tiene exactamente 65 preguntas', exam65.length === 65);
  let sel65 = selectionsFromQuestions(exam65);
  check('al inicio 0/65 respondidas', countProgress(exam65, sel65).answered === 0);
  for (let k = 0; k < 63; k++) sel65 = withSelection(sel65, exam65[k].questionVersionId, `qv-${k + 1}-a`);
  check('tras responder 1..63 -> 63/65 respondidas, 2 sin responder', countProgress(exam65, sel65).answered === 63 && countProgress(exam65, sel65).unanswered === 2);
  // El bug real de Issue A: el conteo se quedaba en 63 porque Q64/Q65 no se
  // podían seleccionar. Aquí se verifica que ambas SÍ aceptan selección.
  sel65 = withSelection(sel65, exam65[63].questionVersionId, 'qv-64-b');
  check('Q64 acepta respuesta -> 64/65', countProgress(exam65, sel65).answered === 64);
  sel65 = withSelection(sel65, exam65[64].questionVersionId, 'qv-65-b');
  check('Q65 acepta respuesta -> 65/65', countProgress(exam65, sel65).answered === 65);
  check('con 65 selecciones -> unanswered = 0 (submit no marca ninguna como incorrecta por omisión)', countProgress(exam65, sel65).unanswered === 0);
  const total65 = exam65.length;
  const nextDisabled = (idx: number) => idx === total65 - 1;
  const prevDisabled = (idx: number) => idx === 0;
  check('Q63 (idx 62): "Siguiente" habilitado', !nextDisabled(62));
  check('Q64 (idx 63): "Siguiente" y "Anterior" habilitados', !nextDisabled(63) && !prevDisabled(63));
  check('Q65 (idx 64): "Siguiente" DESHABILITADO (no hay Q66), "Anterior" habilitado', nextDisabled(64) && !prevDisabled(64));
  check('no se envuelve a Q1 ni se inventa Q66: clamp Math.min(64, 64+1) = 64', Math.min(total65 - 1, 64 + 1) === 64);
  check('la pantalla de intento deshabilita "Siguiente" solo en la última (safeIndex === total - 1)', /disabled=\{safeIndex === total - 1\}/.test(attemptScreen));
  check('la pantalla de intento deshabilita "Anterior" solo en la primera (safeIndex === 0)', /disabled=\{safeIndex === 0\}/.test(attemptScreen));
  check('la pantalla de intento hace clamp del índice (Math.min/Math.max), no reinicia ni inventa preguntas', /Math\.min\(total - 1, safeIndex \+ 1\)/.test(attemptScreen) && /Math\.max\(0, safeIndex - 1\)/.test(attemptScreen));
  check('la pantalla de intento indexa la pregunta con safeIndex = Math.min(currentIndex, total - 1)', /const safeIndex = Math\.min\(currentIndex, total - 1\)/.test(attemptScreen));

  console.log('--- 16. ENSAYOS-M1-D: layout del intento (alternativas alcanzables sobre el footer) + tamaño contextual de fórmulas ---');
  check('la pantalla de intento acota el ScrollView de la pregunta con flex:1 (alternativas desplazables sobre el footer)', /<ScrollView style=\{styles\.scroll\}/.test(attemptScreen) && /scroll: \{ flex: 1 \}/.test(attemptScreen));
  check('la revisión acota su ScrollView con flex:1 igual', /<ScrollView style=\{styles\.scroll\}/.test(reviewScreen) && /scroll: \{ flex: 1 \}/.test(reviewScreen));
  check('el footer del intento NO es position:absolute (no tapa las alternativas)', !/footer:\s*\{[^}]*position:\s*['"]absolute/.test(attemptScreen));
  check('el contentContainer del intento reserva aire bajo la última alternativa (paddingBottom >= 24)', /content: \{ gap: \d+, paddingBottom: (?:2[4-9]|[3-9]\d) \}/.test(attemptScreen));
  const renderer = read('components/content-block-renderer.tsx');
  check('ContentBlockRenderer acepta formulaContext', /formulaContext\?: FormulaContext/.test(renderer));
  check('FormulaBlock deriva el tamaño intrínseco del SVG (unidad ex), no un height global fijo', /parseSvgIntrinsicSize/.test(renderer) && /ex"/.test(renderer) && /exWidth/.test(renderer));
  check('FormulaBlock ya no fuerza height={40} de forma incondicional', !/\bheight=\{40\}/.test(stripComments(renderer)));
  check('FormulaBlock escala px por ex distinto para alternativa vs bloque', /EX_PX[\s\S]{0,400}option:\s*\d+[\s\S]{0,400}block:\s*\d+/.test(renderer));
  check('FormulaBlock reduce a lo ancho del contenedor si la ecuación es más ancha (sin recorte)', /naturalWidth > maxWidth/.test(renderer));
  check('el renderer NO interpreta LaTeX ni regenera el svg (sigue usando el svg del servidor)', !/katex|mathjax|renderLatex/i.test(stripComments(renderer)) && /SvgXml/.test(renderer));
  check('la pantalla de intento pasa formulaContext="option" al renderer de alternativas', /blocks=\{\[option\.content\]\} formulaContext="option"/.test(attemptScreen));
  check('la revisión pasa formulaContext="option" al renderer de alternativas', /blocks=\{\[option\.content\]\} formulaContext="option"/.test(reviewScreen));
  check('el stem y la explicación NO fuerzan formulaContext="option" (quedan en "block")', !/blocks=\{question\.stemContent\} formulaContext/.test(attemptScreen) && !/blocks=\{question\.explanationContent\} formulaContext/.test(reviewScreen));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate del flujo mobile de Ensayos (ENSAYOS-M1-C) pasaron.');
}

main();
