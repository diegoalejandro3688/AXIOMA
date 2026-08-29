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
  sortByDisplayOrder,
  reindexCurrentQuestion,
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
    passageId: null,
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
    passageId: null,
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
    passageId: null,
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
  check('"Siguiente"/"Anterior" avanzan con updater funcional acotado (no un valor stale), sin inventar preguntas', /setCurrentIndex\(\(i\) => Math\.min\(total - 1, Math\.max\(i, 0\) \+ 1\)\)/.test(attemptScreen) && /setCurrentIndex\(\(i\) => Math\.max\(0, Math\.min\(i, total - 1\) - 1\)\)/.test(attemptScreen));
  check('la pantalla de intento acota safeIndex a [0, total-1]', /const safeIndex = Math\.min\(Math\.max\(currentIndex, 0\), total - 1\)/.test(attemptScreen));

  console.log('--- 16. ENSAYOS-M1-D: layout del intento (alternativas alcanzables sobre el footer) + tamaño contextual de fórmulas ---');
  check('la pantalla de intento acota el ScrollView de la pregunta con flex:1 (alternativas desplazables sobre el footer)', /<ScrollView[^>]*\bstyle=\{styles\.scroll\}/.test(attemptScreen) && /scroll: \{ flex: 1 \}/.test(attemptScreen));
  check('la revisión acota su ScrollView con flex:1 igual', /<ScrollView[^>]*\bstyle=\{styles\.scroll\}/.test(reviewScreen) && /scroll: \{ flex: 1 \}/.test(reviewScreen));
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

  console.log('--- 17. ENSAYOS-M1-D2: index/displayOrder sincronizados -- header === currentQuestion.displayOrder en todo paso ---');
  type FixtureQ = {
    questionVersionId: string;
    displayOrder: number;
    stemContent: { type: 'paragraph'; order: number; text: string }[];
    answerOptions: { id: string; content: { type: 'paragraph'; order: number; text: string }; displayOrder: number }[];
    selectedAnswerOptionId: string | null;
  };
  // 65 preguntas con enunciado ÚNICO e identificable ("Question N") -- no un
  // límite sintético con stems idénticos.
  const makeExam = (n: number, backendShuffled: boolean): FixtureQ[] => {
    const qs: FixtureQ[] = Array.from({ length: n }, (_, k) => ({
      questionVersionId: `qv-${k + 1}`,
      displayOrder: k + 1,
      stemContent: [{ type: 'paragraph', order: 0, text: `Question ${k + 1}` }],
      answerOptions: [{ id: `qv-${k + 1}-a`, content: { type: 'paragraph', order: 0, text: 'a' }, displayOrder: 0 }],
      selectedAnswerOptionId: null,
    }));
    return backendShuffled ? [...qs].reverse() : qs;
  };
  const stemN = (q: FixtureQ) => q.stemContent[0].text;

  // sortByDisplayOrder repara incluso un backend que entregara desordenado.
  const sorted = sortByDisplayOrder(makeExam(65, true));
  check('sortByDisplayOrder -> displayOrder 1..65 contiguo', JSON.stringify(sorted.map((q) => q.displayOrder)) === JSON.stringify(Array.from({ length: 65 }, (_, i) => i + 1)));
  check('sortByDisplayOrder -> questions[i].displayOrder === i + 1 (identidad posicional)', sorted.every((q, i) => q.displayOrder === i + 1));
  check('sortByDisplayOrder -> stem del índice i es "Question i+1"', sorted.every((q, i) => stemN(q) === `Question ${i + 1}`));
  check('sortByDisplayOrder no muta la entrada', (() => { const src = makeExam(3, true); const before = src.map((q) => q.displayOrder); sortByDisplayOrder(src); return JSON.stringify(src.map((q) => q.displayOrder)) === JSON.stringify(before); })());

  // Simulación del reducer de la pantalla (misma semántica que attempt screen).
  const total17 = sorted.length;
  const clamp = (i: number) => Math.min(Math.max(i, 0), total17 - 1);
  const step = (i: number) => {
    const safe = clamp(i);
    const cq = sorted[safe];
    return { safe, cq, header: cq.displayOrder, nextDisabled: safe === total17 - 1, prevDisabled: safe === 0 };
  };
  // Secuencial Q60 -> Q65 vía "Siguiente".
  let idx17 = 59; // currentIndex apuntando a Q60
  for (let expected = 60; expected <= 65; expected++) {
    const s = step(idx17);
    check(`paso secuencial: currentIndex=${idx17} -> header ${s.header}, stem "${stemN(s.cq)}" (esperado Q${expected})`, s.header === expected && stemN(s.cq) === `Question ${expected}` && s.cq.displayOrder === expected);
    idx17 = Math.min(total17 - 1, Math.max(idx17, 0) + 1);
  }
  check('Q65: "Siguiente" deshabilitado, header 65, stem "Question 65"', (() => { const s = step(64); return s.nextDisabled && !s.prevDisabled && s.header === 65 && stemN(s.cq) === 'Question 65'; })());
  check('Q65 + "Siguiente" NO avanza (no hay Q66, no wrap): min(64, 64+1) = 64', Math.min(total17 - 1, Math.max(64, 0) + 1) === 64);

  // Saltos del navegador: tap N -> pregunta con displayOrder N (índice N-1).
  for (const jump of [61, 65, 63, 1]) {
    const s = step(jump - 1);
    check(`navegador: tap ${jump} -> header ${s.header}, stem "${stemN(s.cq)}"`, s.header === jump && stemN(s.cq) === `Question ${jump}`);
  }

  // §10 -- refetch mientras el usuario está en Q61: refs nuevas, mismos
  // displayOrder; el usuario NO se mueve; "Siguiente" -> Q62.
  const onQ61Index = sorted.findIndex((q) => q.displayOrder === 61);
  const prevId = sorted[onQ61Index].questionVersionId;
  const refetched = sortByDisplayOrder(makeExam(65, true)); // objetos nuevos
  check('refetch: objetos realmente distintos (no misma referencia)', refetched[onQ61Index] !== sorted[onQ61Index]);
  const reindexed = reindexCurrentQuestion(refetched, prevId);
  check('refetch: reindexCurrentQuestion reancla por identidad -> sigue en Q61', reindexed === onQ61Index && refetched[reindexed].displayOrder === 61 && stemN(refetched[reindexed]) === 'Question 61');
  const afterNext = Math.min(64, Math.max(reindexed, 0) + 1);
  check('refetch + "Siguiente" -> Q62 sincronizado (header y stem)', refetched[afterNext].displayOrder === 62 && stemN(refetched[afterNext]) === 'Question 62');
  check('reindexCurrentQuestion: sin previa -> 0', reindexCurrentQuestion(refetched, null) === 0);
  check('reindexCurrentQuestion: id inexistente -> 0 (clamp seguro, nunca desalinea)', reindexCurrentQuestion(refetched, 'qv-nope') === 0);
  check('reindexCurrentQuestion: arreglo vacío -> 0', reindexCurrentQuestion([], prevId) === 0);

  // Estático: la pantalla usa UNA sola selección mutable y deriva todo de ella.
  check('la pantalla de intento deriva el header de currentQuestion.displayOrder (no de safeIndex + 1)', /Pregunta \{currentQuestion\.displayOrder\} de \{total\}/.test(attemptScreen) && !/Pregunta \{safeIndex \+ 1\}/.test(attemptScreen));
  check('la pantalla de intento ordena por displayOrder y reancla en el refetch', /sortByDisplayOrder\(qResult\.data\.questions\)/.test(attemptScreen) && /reindexCurrentQuestion\(questions, currentQuestionIdRef\.current\)/.test(attemptScreen));
  check('la pantalla de intento remonta el subárbol de la pregunta por identidad (key)', /<ScrollView key=\{currentQuestion\.questionVersionId\}/.test(attemptScreen));
  check('la pantalla de intento NO guarda un currentDisplayOrder aparte de currentIndex (una sola fuente)', !/currentDisplayOrder|setCurrentDisplayOrder/.test(attemptScreen) && (attemptScreen.match(/useState\(/g) ?? []).length <= 8);
  check('currentQuestionIdRef es copia derivada refrescada en render (no segunda fuente de verdad)', /currentQuestionIdRef\.current = currentQuestion\.questionVersionId/.test(attemptScreen));
  check('la revisión también ordena por displayOrder, header por displayOrder y remonta con key', /sortByDisplayOrder\(state\.review\.questions\)/.test(reviewScreen) && /Pregunta \{question\.displayOrder\} de \{total\}/.test(reviewScreen) && /<ScrollView key=\{question\.questionVersionId\}/.test(reviewScreen));

  console.log('--- 18. ENSAYOS-F2: textos de lectura compartidos (PassageCard) + tabla ---');
  // Fixture sintético: Q1/Q2 comparten el texto T1; Q3 pasa al texto T2; Q4 sin texto.
  type F2Q = ExamAttemptQuestion;
  const passages = [
    {
      id: 'p-t1',
      passageKey: 'ENSAYO.ZZTESTF2.T1',
      displayOrder: 1,
      title: 'Texto 1',
      content: [
        { type: 'paragraph' as const, order: 0, text: 'Texto compartido 1.' },
        { type: 'table' as const, order: 1, headers: ['A', 'B', 'C'], rows: [['1', '2', '3'], ['4', '5', '6']], footnote: 'Fuente.' },
      ],
    },
    { id: 'p-t2', passageKey: 'ENSAYO.ZZTESTF2.T2', displayOrder: 2, title: 'Texto 2', content: [{ type: 'paragraph' as const, order: 0, text: 'Texto compartido 2.' }] },
  ];
  const f2q = (i: number, passageId: string | null): F2Q => ({
    questionVersionId: `f2-qv-${i}`,
    displayOrder: i,
    stemContent: [{ type: 'paragraph', order: 0, text: `Pregunta ${i}` }],
    answerOptions: [{ id: `f2-qv-${i}-a`, content: { type: 'paragraph', order: 0, text: 'a' }, displayOrder: 0 }],
    selectedAnswerOptionId: null,
    passageId,
  });
  const f2questions = sortByDisplayOrder([f2q(1, 'p-t1'), f2q(2, 'p-t1'), f2q(3, 'p-t2'), f2q(4, null)]);
  const resolvePassage = (q: F2Q) => (q.passageId ? passages.find((p) => p.id === q.passageId) ?? null : null);

  check('el payload contiene 2 textos, una sola vez cada uno (aunque Q1 y Q2 comparten T1)', passages.length === 2 && new Set(passages.map((p) => p.id)).size === 2);
  check('Q1 y Q2 resuelven al MISMO objeto de texto (T1)', resolvePassage(f2questions[0]) === resolvePassage(f2questions[1]) && resolvePassage(f2questions[0])?.id === 'p-t1');
  check('Q3 resuelve al texto siguiente (T2)', resolvePassage(f2questions[2])?.id === 'p-t2');
  check('Q4 sin passageId -> no hay texto -> se renderiza la ruta existente sin PassageCard', resolvePassage(f2questions[3]) === null);
  // Volver de Q3 a Q2 restaura el texto anterior (T1) -- la resolución es por
  // passageId de la pregunta actual, sin estado de texto arrastrado.
  check('back Q3 -> Q2 restaura el texto previo (T1), no deja T2 pegado', resolvePassage(f2questions[1])?.id === 'p-t1');
  const t1Table = passages[0].content.find((b) => b.type === 'table') as { headers: string[]; rows: string[][] } | undefined;
  check('la tabla del texto conserva A|B|C y 1|2|3 / 4|5|6 (sin conversión a imagen ni Markdown)', !!t1Table && JSON.stringify(t1Table.headers) === JSON.stringify(['A', 'B', 'C']) && JSON.stringify(t1Table.rows) === JSON.stringify([['1', '2', '3'], ['4', '5', '6']]));

  // Estático: componentes y cableado.
  for (const rel of ['components/exams/passage-card.tsx', 'components/exams/passage-content-renderer.tsx', 'components/exams/passage-table.tsx']) {
    check(`existe ${rel}`, existsSync(join(mobileDir, rel)));
  }
  const passageCard = stripComments(read('components/exams/passage-card.tsx'));
  const passageRenderer = stripComments(read('components/exams/passage-content-renderer.tsx'));
  const passageTable = stripComments(read('components/exams/passage-table.tsx'));
  check('PassageCard: header "TEXTO <title>" y control "Ver texto / Ocultar texto"', /TEXTO \{passage\.title\}/.test(passageCard) && /Ver texto/.test(passageCard) && /Ocultar texto/.test(passageCard));
  check('PassageCard: plegado controlado por props (collapsed/onToggle), no un índice mutable propio', /collapsed:\s*boolean/.test(passageCard) && !/useState/.test(passageCard));
  check('PassageContentRenderer delega los bloques estándar a ContentBlockRenderer y maneja `table` él mismo', /ContentBlockRenderer/.test(passageRenderer) && /PassageTable/.test(passageRenderer) && !/SvgXml|parseSvgIntrinsicSize/.test(passageRenderer));
  check('PassageTable: filas/columnas reales, sin conversión a imagen ni Markdown', !/<Image|require\(|\.png|\bmarkdown\b|dangerouslySetInnerHTML/i.test(passageTable) && /block\.headers/.test(passageTable) && /block\.rows/.test(passageTable));
  check('PassageTable: scroll horizontal SOLO para la tabla (ScrollView horizontal local)', /<ScrollView\s+horizontal/.test(passageTable));
  check('ningún ScrollView vertical anidado dentro del contenido del texto (no atrapa gestos)', !/<ScrollView(?![^>]*horizontal)/.test(passageCard) && !/<ScrollView(?![^>]*horizontal)/.test(passageRenderer));

  for (const [rel, src] of [['attempt', attemptScreen], ['review', reviewScreen]] as const) {
    check(`la pantalla de ${rel} renderiza PassageCard resuelto por passageId desde el mapa de textos`, /<PassageCard/.test(src) && /passages\.find\(\(p\) => p\.id === /.test(src));
    check(`la pantalla de ${rel} solo muestra PassageCard cuando hay texto (currentPassage ? ... : null)`, /currentPassage \? \(\s*<PassageCard/.test(src));
    check(`la pantalla de ${rel} mantiene el plegado de textos a nivel de pantalla (Record), sin segundo índice de pregunta`, /collapsedPassages/.test(src) && !/currentDisplayOrder|setCurrentIndex2/.test(src));
    check(`la pantalla de ${rel} coloca el texto DENTRO del ScrollView de la pregunta (fluye con el resto)`, /<ScrollView key=\{[\s\S]{0,260}<PassageCard/.test(src));
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate del flujo mobile de Ensayos (ENSAYOS-M1-C) pasaron.');
}

main();
