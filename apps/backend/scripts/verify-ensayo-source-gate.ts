// ENSAYOS-M1-A / ENSAYOS-M2 -- Gate PRE-BD del banco de Ensayos V1
// (`apps/backend/content/ensayo/`). Ver docs/adr/0024-ensayos-foundation.md.
//
// Puramente estático: SIN Postgres, SIN Docker, SIN `run-gate.ts`, SIN
// servidor -- ejecutable con solo `tsx`. Mismo espíritu que
// `verify-content-source-gate.ts` (Study), pero para el schema/loader/
// manifest propios de Ensayos.
//
// Recorre TODOS los módulos de Ensayo declarados en `ENSAYO_MANIFEST`
// (hoy M1 + M2) y verifica CADA UNO contra SU blueprint:
// definición del ensayo, conteos (N preguntas / 4N alternativas / N correctas /
// N explicaciones no vacías), orden fijo Q1..QN, unicidad de claves en
// namespace `ENSAYO.*` sin colisión con Study, integridad de contenido
// (4 alternativas / 1 correcta / bloques bien formados / sin duplicados),
// LaTeX renderizable (MathJax en memoria), Unicode limpio, y las tres
// distribuciones del blueprint (eje / dificultad / habilidad). Además: Study
// permanece 98 LR / 980 Q y ninguna clave `ENSAYO.*` aparece en el manifest
// de Study. Por último, pins específicos de M2 (correcciones editoriales
// definitivas de Q6 y Q37).
import { join, relative } from 'node:path';
import { loadExamModules } from '../content/ensayo/load';
import {
  examSourceModuleSchema,
  examClassification,
  isLectoraSourceQuestion,
  type MathSourceQuestion,
} from '../content/ensayo/schema';
import {
  ENSAYO_MANIFEST,
  ENSAYO_READING_MANIFEST,
  ENSAYO_MODULE_COUNT,
  findExamBlueprint,
  findReadingBlueprint,
  EXAM_AXES,
  EXAM_DIFFICULTIES,
  EXAM_PRIMARY_SKILLS,
  EXAM_READING_SKILLS,
} from '../content/ensayo/manifest';
import { loadResourceModules as loadStudyModules } from '../content/load';
import { CONTENT_MANIFEST, totalExpectedQuestions, totalExpectedResources } from '../content/manifest';
import { renderLatexToSvg } from '../src/education/formula-rendering';

const CONTENT_ROOT = join(__dirname, '..', 'content');
const ENSAYO_ROOT = join(CONTENT_ROOT, 'ensayo');
const ESTUDIO_ROOT = join(CONTENT_ROOT, 'estudio');

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

type Blk = { type: string; text?: string; latex?: string };
const blkText = (b: Blk) => (b.type === 'formula' ? b.latex ?? '' : b.text ?? '');
const hasReplacementChar = (s: string) => s.includes('�');
/** El LaTeX no debe contener el artefacto de "render filtrado": signo menos Unicode, punto medio o operador punto. */
const hasRenderedArtifact = (latex: string) => /[−·⋅×]/.test(latex);

function tally<T extends string>(values: T[], keys: readonly T[]): Record<T, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
  for (const v of values) out[v] += 1;
  return out;
}

function manifestMentionsEnsayo(): boolean {
  const json = JSON.stringify(CONTENT_MANIFEST);
  return json.includes('ENSAYO.') || json.toLowerCase().includes('"ensayo"');
}

async function main() {
  console.log('--- 0. Carga de módulos de Ensayo (content/ensayo/**) ---');
  const { loaded, issues } = await loadExamModules(ENSAYO_ROOT);
  for (const issue of issues) {
    check(`${relative(CONTENT_ROOT, issue.file)}: cumple examSourceModuleSchema`, false);
    console.error(`       ${issue.message}`);
  }
  check(
    `${ENSAYO_MODULE_COUNT} módulo(s) de Ensayo cargado(s) y válido(s) (encontrados: ${loaded.length})`,
    loaded.length === ENSAYO_MODULE_COUNT,
  );
  const loadedKeys = new Set(loaded.map((l) => l.module.examKey));
  for (const bp of [...ENSAYO_MANIFEST, ...ENSAYO_READING_MANIFEST]) {
    check(`el manifest declara "${bp.examKey}" y existe su módulo fuente`, loadedKeys.has(bp.examKey));
  }

  // Study cargado una sola vez -- se reutiliza en la comprobación de colisiones de cada ensayo.
  const { loaded: studyLoaded } = await loadStudyModules(ESTUDIO_ROOT);
  const studyQuestionKeys = new Set<string>();
  const studyResourceKeys = new Set<string>();
  for (const s of studyLoaded) {
    studyResourceKeys.add(s.module.resourceKey);
    for (const q of s.module.questions) studyQuestionKeys.add(q.questionKey);
  }

  const mathModules = loaded.filter((l) => !!findExamBlueprint(l.module.examKey));
  for (const { file, module: exam } of mathModules) {
    const bp = findExamBlueprint(exam.examKey);
    console.log(`\n=== ${exam.examKey} (${relative(CONTENT_ROOT, file)}) ===`);
    check(`${exam.examKey}: tiene un blueprint en ENSAYO_MANIFEST`, !!bp);
    if (!bp) continue;
    const N = bp.expectedQuestionCount;

    console.log(`--- 1. Definición de ${exam.examKey} (contra blueprint APPROVED) ---`);
    check(`examKey = "${bp.examKey}"`, exam.examKey === bp.examKey);
    check(`title = "${bp.title}"`, exam.title === bp.title);
    check(`subjectKey = "${bp.subjectKey}"`, exam.subjectKey === bp.subjectKey);
    check(`durationMinutes = ${bp.durationMinutes}`, exam.durationMinutes === bp.durationMinutes);
    check(`${N} preguntas (encontradas: ${exam.questions.length})`, exam.questions.length === N);

    console.log(`--- 2. Orden fijo Q1..Q${N} (sin huecos, sin duplicados) ---`);
    const orders = exam.questions.map((q) => q.displayOrder).sort((a, b) => a - b);
    check(`displayOrder es exactamente 1..${N}`, orders.length === N && orders.every((o, i) => o === i + 1));
    const keyByOrder = new Map(exam.questions.map((q) => [q.displayOrder, q.questionKey]));
    check(
      `cada displayOrder n corresponde a la clave ${exam.examKey}.Q<n>`,
      exam.questions.every((q) => keyByOrder.get(q.displayOrder) === `${exam.examKey}.Q${q.displayOrder}`),
    );

    console.log(`--- 3. Claves: ${N} únicas, namespace ENSAYO.*, sin colisión con Study ---`);
    const keys = exam.questions.map((q) => q.questionKey);
    check(`${N} questionKeys únicas (distintas: ${new Set(keys).size})`, new Set(keys).size === N);
    check(`todas bajo el namespace "ENSAYO."`, keys.every((k) => k.startsWith('ENSAYO.')));
    check(`examKey "${exam.examKey}" bajo el namespace "ENSAYO."`, exam.examKey.startsWith('ENSAYO.'));
    check(
      `0 colisiones questionKey ${exam.examKey} <-> Study (${studyQuestionKeys.size} claves Study)`,
      keys.every((k) => !studyQuestionKeys.has(k)),
    );
    check(`examKey no colisiona con ningún resourceKey de Study`, !studyResourceKeys.has(exam.examKey));

    console.log('--- 4. Integridad de contenido por pregunta ---');
    let totalOptions = 0;
    let totalCorrect = 0;
    let emptyStems = 0;
    let emptyExplanations = 0;
    for (const q of exam.questions) {
      totalOptions += q.options.length;
      const correct = q.options.filter((o) => o.correct).length;
      totalCorrect += correct;
      check(`${q.questionKey}: exactamente 4 alternativas (${q.options.length})`, q.options.length === 4);
      check(`${q.questionKey}: exactamente 1 correcta (${correct})`, correct === 1);
      if (q.stemContent.length === 0) emptyStems++;
      if (q.explanationContent.length === 0) emptyExplanations++;
      check(
        `${q.questionKey}: enunciado no vacío y con bloques con contenido`,
        q.stemContent.length > 0 && q.stemContent.every((b) => blkText(b as Blk).length > 0),
      );
      check(
        `${q.questionKey}: explicación no vacía y con bloques con contenido`,
        q.explanationContent.length > 0 && q.explanationContent.every((b) => blkText(b as Blk).length > 0),
      );
      const canon = q.options.map((o) => (o.content.type === 'formula' ? `f:${o.content.latex}` : `t:${o.content.text}`));
      check(`${q.questionKey}: alternativas no duplicadas`, new Set(canon).size === canon.length);
    }
    check(`${N * 4} alternativas en total (${totalOptions})`, totalOptions === N * 4);
    check(`${N} respuestas correctas en total (${totalCorrect})`, totalCorrect === N);
    check(`${N} explicaciones no vacías (vacías: ${emptyExplanations})`, emptyExplanations === 0);
    check(`${N} enunciados no vacíos (vacíos: ${emptyStems})`, emptyStems === 0);

    console.log('--- 4b. ENSAYOS-F2: M1/M2 no tienen textos compartidos ni preguntas de lectora ---');
    check(`${exam.examKey}: passages == [] (encontrados: ${exam.passages.length})`, exam.passages.length === 0);
    check(
      `${exam.examKey}: 0 preguntas de competencia lectora`,
      exam.questions.every((q) => !isLectoraSourceQuestion(q)),
    );

    console.log('--- 5. Blueprint: distribuciones exactas (eje / dificultad / habilidad) ---');
    const mathQs = exam.questions.filter((q): q is MathSourceQuestion => !isLectoraSourceQuestion(q));
    const axisCount = tally(mathQs.map((q) => q.axis), EXAM_AXES);
    const diffCount = tally(mathQs.map((q) => q.difficulty), EXAM_DIFFICULTIES);
    const skillCount = tally(mathQs.map((q) => q.primarySkill), EXAM_PRIMARY_SKILLS);
    for (const a of EXAM_AXES) check(`eje ${a}: ${axisCount[a]} == ${bp.expectedAxis[a]}`, axisCount[a] === bp.expectedAxis[a]);
    for (const d of EXAM_DIFFICULTIES) check(`dificultad ${d}: ${diffCount[d]} == ${bp.expectedDifficulty[d]}`, diffCount[d] === bp.expectedDifficulty[d]);
    for (const s of EXAM_PRIMARY_SKILLS) check(`habilidad ${s}: ${skillCount[s]} == ${bp.expectedPrimarySkill[s]}`, skillCount[s] === bp.expectedPrimarySkill[s]);

    console.log('--- 6. Unicode limpio (sin carácter de reemplazo, español intacto) ---');
    const allText: string[] = [];
    for (const q of exam.questions) {
      for (const b of [...q.stemContent, ...q.explanationContent] as Blk[]) allText.push(blkText(b));
      for (const o of q.options) allText.push(o.content.type === 'formula' ? o.content.latex : o.content.text);
    }
    check(`ningún bloque contiene el carácter de reemplazo U+FFFD`, !allText.some(hasReplacementChar));
    check(`el contenido conserva caracteres acentuados del español (á/é/í/ó/ú/ñ/¿/¡)`, allText.some((t) => /[áéíóúñ¿¡]/i.test(t)));

    console.log('--- 7. LaTeX: todas las fórmulas únicas renderizan (MathJax, sin efectos secundarios) ---');
    const latexSeen = new Set<string>();
    let formulaCount = 0;
    let formulaFailures = 0;
    let artifactFailures = 0;
    for (const q of exam.questions) {
      const formulas: string[] = [];
      for (const b of [...q.stemContent, ...q.explanationContent] as Blk[]) if (b.type === 'formula' && b.latex) formulas.push(b.latex);
      for (const o of q.options) if (o.content.type === 'formula') formulas.push(o.content.latex);
      for (const latex of formulas) {
        if (hasRenderedArtifact(latex)) {
          artifactFailures++;
          check(`${q.questionKey}: LaTeX sin artefacto de render (-/./x): "${latex}"`, false);
        }
        if (latexSeen.has(latex)) continue;
        latexSeen.add(latex);
        formulaCount++;
        try {
          renderLatexToSvg(latex);
        } catch {
          formulaFailures++;
          check(`${q.questionKey}: LaTeX renderizable: "${latex}"`, false);
        }
      }
    }
    check(`todas las fórmulas LaTeX únicas renderizan (${formulaCount - formulaFailures}/${formulaCount})`, formulaFailures === 0);
    check(`ninguna fórmula contiene un artefacto de render`, artifactFailures === 0);
  }

  console.log('\n--- 8. Aislamiento de Study: 98 LR / 980 Q sin cambios ---');
  check(`CONTENT_MANIFEST de Study: totalExpectedResources = 98 (${totalExpectedResources(CONTENT_MANIFEST)})`, totalExpectedResources(CONTENT_MANIFEST) === 98);
  check(`CONTENT_MANIFEST de Study: totalExpectedQuestions = 980 (${totalExpectedQuestions(CONTENT_MANIFEST)})`, totalExpectedQuestions(CONTENT_MANIFEST) === 980);
  check(`loader de Study carga módulos de content/estudio sin errores (${studyLoaded.length} recursos)`, studyLoaded.length > 0);
  check(`ninguna clave ENSAYO.* aparece en el CONTENT_MANIFEST de Study`, !manifestMentionsEnsayo());

  console.log('\n--- 9. ENSAYO.M2: pins de las correcciones editoriales DEFINITIVAS (Q6, Q37) ---');
  const m2 = loaded.find((l) => l.module.examKey === 'ENSAYO.M2')?.module;
  check('ENSAYO.M2 presente para pinear Q6/Q37', !!m2);
  if (m2) {
    const q6 = m2.questions.find((q) => q.questionKey === 'ENSAYO.M2.Q6')!;
    const q6opts = q6.options.map((o) => (o.content.type === 'formula' ? o.content.latex : `t:${o.content.text}`));
    check(
      'Q6: las 4 alternativas DEFINITIVAS son exactamente 6√2 / 3√2 / 4√3 / 6√3',
      JSON.stringify(q6opts) === JSON.stringify(['6\\sqrt{2}', '3\\sqrt{2}', '4\\sqrt{3}', '6\\sqrt{3}']),
    );
    check('Q6: correcta = A (6√2), exactamente 1', q6.options[0].correct === true && q6.options.filter((o) => o.correct).length === 1);
    check('Q6: sin dos alternativas matemáticamente idénticas (4 strings distintas)', new Set(q6opts).size === 4);
    check('Q6: dificultad FACIL, eje NUMEROS, habilidad REPRESENTAR', q6.difficulty === 'FACIL' && q6.axis === 'NUMEROS' && q6.primarySkill === 'REPRESENTAR');

    const q37 = m2.questions.find((q) => q.questionKey === 'ENSAYO.M2.Q37')!;
    const q37stem = q37.stemContent.map((b) => (b.type === 'formula' ? b.latex : b.text)).join(' ');
    const q37expl = q37.explanationContent.map((b) => (b.type === 'formula' ? b.latex : b.text)).join(' ');
    check('Q37: el enunciado usa "al menos 192 miles de pesos" (no 256)', /al menos 192 miles de pesos/.test(q37stem) && !/256/.test(q37stem) && !/256/.test(q37expl));
    check('Q37: la explicación exige G(x) >= 192', q37expl.includes('G(x)\\geq192'));
    const q37opts = q37.options.map((o) => (o.content.type === 'formula' ? o.content.latex : `t:${o.content.text}`));
    check('Q37: correcta = B (16 <= x <= 32)', q37.options[1].content.type === 'formula' && q37.options[1].content.latex === '16\\leq x\\leq32' && q37.options[1].correct === true);
    check('Q37: exactamente 1 correcta y es la B', q37.options.filter((o) => o.correct).length === 1 && q37opts[1] === '16\\leq x\\leq32');

    const q10 = m2.questions.find((q) => q.questionKey === 'ENSAYO.M2.Q10')!;
    check('Q10: dificultad MEDIA (resolución de la contradicción), eje NUMEROS, correcta C', q10.difficulty === 'MEDIA' && q10.axis === 'NUMEROS' && q10.options[2].correct === true);

    // Una pregunta es de Suficiencia de Datos si alguna alternativa habla de
    // "Se necesitan conjuntamente" (patrón único de ese tipo de ítem).
    const dsKeys = m2.questions
      .filter((q) => q.options.some((o) => o.content.type === 'paragraph' && /Se necesitan conjuntamente/.test(o.content.text)))
      .map((q) => q.questionKey)
      .sort();
    check(
      `ENSAYO.M2: exactamente 5 preguntas de Suficiencia de Datos, Q9/Q18/Q31/Q40/Q49 (encontradas: ${dsKeys.join(',')})`,
      JSON.stringify(dsKeys) === JSON.stringify(['ENSAYO.M2.Q18', 'ENSAYO.M2.Q31', 'ENSAYO.M2.Q40', 'ENSAYO.M2.Q49', 'ENSAYO.M2.Q9'].sort()),
    );
    const dsAxes = new Map(m2.questions.map((q) => [q.questionKey, q.axis]));
    check(
      'ENSAYO.M2: los ejes de las 5 DS son Q9=ALGEBRA_FUNCIONES, Q18=GEOMETRIA, Q31=NUMEROS, Q40=ALGEBRA_FUNCIONES, Q49=PROBABILIDAD_ESTADISTICA',
      dsAxes.get('ENSAYO.M2.Q9') === 'ALGEBRA_FUNCIONES' &&
        dsAxes.get('ENSAYO.M2.Q18') === 'GEOMETRIA' &&
        dsAxes.get('ENSAYO.M2.Q31') === 'NUMEROS' &&
        dsAxes.get('ENSAYO.M2.Q40') === 'ALGEBRA_FUNCIONES' &&
        dsAxes.get('ENSAYO.M2.Q49') === 'PROBABILIDAD_ESTADISTICA',
    );
  }

  console.log('\n--- 9b. ENSAYO.LECTORA: contenido productivo de Competencia Lectora ---');
  const lectoraBp = findReadingBlueprint('ENSAYO.LECTORA')!;
  const lectora = loaded.find((l) => l.module.examKey === 'ENSAYO.LECTORA')?.module;
  check('ENSAYO.LECTORA presente y cargado', !!lectora && !!lectoraBp);
  if (lectora) {
    const L = lectora;
    check(`ENSAYO.LECTORA: title = "${lectoraBp.title}"`, L.title === lectoraBp.title);
    check('ENSAYO.LECTORA: subjectKey = "lenguaje"', L.subjectKey === 'lenguaje');
    check('ENSAYO.LECTORA: durationMinutes = 150', L.durationMinutes === 150);
    check(`ENSAYO.LECTORA: ${lectoraBp.expectedPassageCount} textos (encontrados: ${L.passages.length})`, L.passages.length === 10);
    check(`ENSAYO.LECTORA: ${lectoraBp.expectedQuestionCount} preguntas (encontradas: ${L.questions.length})`, L.questions.length === 65);

    // Claves T1..T10 y orden 1..10
    const pKeys = L.passages.map((p) => p.passageKey);
    check(
      'ENSAYO.LECTORA: passageKeys = ENSAYO.LECTORA.T1..T10',
      JSON.stringify([...pKeys].sort()) === JSON.stringify(Array.from({ length: 10 }, (_, i) => `ENSAYO.LECTORA.T${i + 1}`).sort()),
    );
    const pOrders = L.passages.map((p) => p.displayOrder).sort((a, b) => a - b);
    check('ENSAYO.LECTORA: displayOrder de textos es 1..10', JSON.stringify(pOrders) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));

    // questionKeys Q1..Q65, displayOrder 1..65, todas lectora
    const qKeys = L.questions.map((q) => q.questionKey);
    check(
      'ENSAYO.LECTORA: questionKeys = ENSAYO.LECTORA.Q1..Q65',
      JSON.stringify([...qKeys].sort()) === JSON.stringify(Array.from({ length: 65 }, (_, i) => `ENSAYO.LECTORA.Q${i + 1}`).sort()),
    );
    const qOrders = L.questions.map((q) => q.displayOrder).sort((a, b) => a - b);
    check('ENSAYO.LECTORA: displayOrder 1..65 sin huecos', JSON.stringify(qOrders) === JSON.stringify(Array.from({ length: 65 }, (_, i) => i + 1)));
    check('ENSAYO.LECTORA: TODAS las preguntas son de competencia lectora (llevan passageKey)', L.questions.every((q) => isLectoraSourceQuestion(q)));
    check('ENSAYO.LECTORA: 0 colisión de questionKey con Study', qKeys.every((k) => !studyQuestionKeys.has(k)));
    check('ENSAYO.LECTORA: examKey/passageKeys bajo namespace "ENSAYO."', L.examKey.startsWith('ENSAYO.') && pKeys.every((k) => k.startsWith('ENSAYO.')));

    // Mapa texto -> rango de preguntas EXACTO contra el blueprint autoritativo
    const byKey = (q: { passageKey?: string }) => (q as { passageKey: string }).passageKey;
    let mapOk = true;
    for (const range of lectoraBp.passageMap) {
      const inRange = L.questions.filter((q) => q.displayOrder >= range.firstQuestion && q.displayOrder <= range.lastQuestion);
      const allMapped = inRange.every((q) => byKey(q) === range.passageKey);
      const count = inRange.length;
      const expectedCount = range.lastQuestion - range.firstQuestion + 1;
      if (!allMapped || count !== expectedCount) mapOk = false;
      check(
        `ENSAYO.LECTORA: ${range.passageKey} ("${range.title}") <- Q${range.firstQuestion}..Q${range.lastQuestion} (${count}/${expectedCount})`,
        allMapped && count === expectedCount,
      );
      const passage = L.passages.find((p) => p.passageKey === range.passageKey)!;
      check(`ENSAYO.LECTORA: ${range.passageKey} title = "${range.title}"`, passage.title === range.title);
    }
    check('ENSAYO.LECTORA: cada pregunta apunta a un passageKey que existe', L.questions.every((q) => pKeys.includes(byKey(q))));
    check('ENSAYO.LECTORA: mapa texto->pregunta 100% coherente con el blueprint', mapOk);

    // Integridad por pregunta
    let opts = 0;
    let correct = 0;
    for (const q of L.questions) {
      opts += q.options.length;
      const c = q.options.filter((o) => o.correct).length;
      correct += c;
      check(`ENSAYO.LECTORA ${q.questionKey}: 4 alternativas / 1 correcta`, q.options.length === 4 && c === 1);
      check(`ENSAYO.LECTORA ${q.questionKey}: enunciado y explicación no vacíos`, q.stemContent.length > 0 && q.explanationContent.length > 0);
      const canon = q.options.map((o) => (o.content.type === 'formula' ? `f:${o.content.latex}` : `t:${o.content.text}`));
      check(`ENSAYO.LECTORA ${q.questionKey}: alternativas no duplicadas`, new Set(canon).size === 4);
    }
    check(`ENSAYO.LECTORA: 260 alternativas en total (${opts})`, opts === 260);
    check(`ENSAYO.LECTORA: 65 correctas / 195 incorrectas (${correct}/${opts - correct})`, correct === 65 && opts - correct === 195);

    // Blueprint DERIVADO desde las 65 preguntas (labels reales, no hardcode del resultado)
    const skillTally = tally(L.questions.map((q) => (q as { readingSkill: (typeof EXAM_READING_SKILLS)[number] }).readingSkill), EXAM_READING_SKILLS);
    const diffTally = tally(L.questions.map((q) => q.difficulty), EXAM_DIFFICULTIES);
    for (const s of EXAM_READING_SKILLS) {
      check(`ENSAYO.LECTORA: habilidad ${s}: ${skillTally[s]} == ${lectoraBp.expectedReadingSkill[s]}`, skillTally[s] === lectoraBp.expectedReadingSkill[s]);
    }
    for (const d of EXAM_DIFFICULTIES) {
      check(`ENSAYO.LECTORA: dificultad ${d}: ${diffTally[d]} == ${lectoraBp.expectedDifficulty[d]}`, diffTally[d] === lectoraBp.expectedDifficulty[d]);
    }

    // Clave autoritativa compacta Q1..Q65
    const KEY = 'BCBCDABABDBCCCBBCACDCBDBCBABBBAABCBCACADDACDADCDACDBDACDBDCADCBDA';
    const derivedKey = [...L.questions]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((q) => 'ABCD'[q.options.findIndex((o) => o.correct)])
      .join('');
    check(`ENSAYO.LECTORA: clave Q1..Q65 coincide con la compacta autoritativa`, derivedKey === KEY);
    const keyDist = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
    for (const ch of derivedKey) keyDist[ch] += 1;
    check(
      `ENSAYO.LECTORA: distribución de clave A=14 B=18 C=18 D=15 (${JSON.stringify(keyDist)})`,
      keyDist.A === 14 && keyDist.B === 18 && keyDist.C === 18 && keyDist.D === 15,
    );

    // Q19 -- PIN de la versión DEFINITIVA CORREGIDA, no regresar a la vieja
    const q19 = L.questions.find((q) => q.questionKey === 'ENSAYO.LECTORA.Q19')!;
    const q19stem = q19.stemContent.map((b) => (b.type === 'formula' ? b.latex : b.text)).join(' ');
    check('ENSAYO.LECTORA Q19: readingSkill=EVALUAR, difficulty=MEDIA', (q19 as { readingSkill: string }).readingSkill === 'EVALUAR' && q19.difficulty === 'MEDIA');
    check('ENSAYO.LECTORA Q19: correcta = C', q19.options.findIndex((o) => o.correct) === 2);
    check(
      'ENSAYO.LECTORA Q19: enunciado es la versión DEFINITIVA ("...debilitaría más directamente la defensa...")',
      q19stem.includes('debilitaría más directamente la defensa que hace el autor de reservar treinta minutos'),
    );
    check(
      'ENSAYO.LECTORA Q19: NO es la versión antigua ("la principal objeción")',
      !q19stem.includes('principal objeción') && !q19stem.includes('objeción más fuerte'),
    );
    check(
      'ENSAYO.LECTORA Q19: la alternativa C es el estudio con grupos comparables',
      q19.options[2].content.type === 'paragraph' &&
        q19.options[2].content.text.includes('grupos comparables') &&
        q19.options[2].content.text.includes('no desarrollan mayor autonomía ni persistencia'),
    );

    // Tablas T2 / T5 / T10 -- estructura y valores EXACTOS
    const tableOf = (key: string) => L.passages.find((p) => p.passageKey === key)!.content.find((b) => b.type === 'table') as
      | { headers: string[]; rows: string[][]; footnote?: string }
      | undefined;
    const t2 = tableOf('ENSAYO.LECTORA.T2');
    check(
      'ENSAYO.LECTORA T2: headers exactos (Zona / Cobertura / Temperatura / Árboles...)',
      !!t2 &&
        JSON.stringify(t2.headers) ===
          JSON.stringify([
            'Zona',
            'Cobertura aproximada de copas',
            'Temperatura del pavimento',
            'Árboles plantados cinco años antes que seguían vivos',
          ]),
    );
    check(
      'ENSAYO.LECTORA T2: filas exactas (8 %/38,6 °C/54 %, 22 %/34,2 °C/76 %, 47 %/29,8 °C/89 %)',
      !!t2 &&
        JSON.stringify(t2.rows) ===
          JSON.stringify([
            ['Avenida Norte', '8 %', '38,6 °C', '54 %'],
            ['Barrio Estación', '22 %', '34,2 °C', '76 %'],
            ['Parque Sur', '47 %', '29,8 °C', '89 %'],
          ]),
    );
    const t5 = tableOf('ENSAYO.LECTORA.T5');
    check(
      'ENSAYO.LECTORA T5: headers exactos (Sector / Horas grabadas / Especies... / Registros...)',
      !!t5 &&
        JSON.stringify(t5.headers) ===
          JSON.stringify(['Sector', 'Horas grabadas', 'Especies acústicamente identificadas', 'Registros de vocalizaciones']),
    );
    check(
      'ENSAYO.LECTORA T5: filas exactas (120/18/640, 120/24/510, 120/13/790)',
      !!t5 &&
        JSON.stringify(t5.rows) ===
          JSON.stringify([
            ['Quebrada', '120', '18', '640'],
            ['Bosque alto', '120', '24', '510'],
            ['Borde agrícola', '120', '13', '790'],
          ]),
    );
    const t10 = tableOf('ENSAYO.LECTORA.T10');
    check(
      'ENSAYO.LECTORA T10: headers exactos (Sector / Temperatura nocturna... / Día promedio...* / Árboles observados)',
      !!t10 &&
        JSON.stringify(t10.headers) ===
          JSON.stringify([
            'Sector',
            'Temperatura nocturna media previa a la floración',
            'Día promedio de primera floración*',
            'Árboles observados',
          ]),
    );
    check(
      'ENSAYO.LECTORA T10: filas exactas (11,8 °C/72/40, 9,9 °C/78/40, 8,7 °C/84/40)',
      !!t10 &&
        JSON.stringify(t10.rows) ===
          JSON.stringify([
            ['Centro urbano', '11,8 °C', '72', '40'],
            ['Periferia', '9,9 °C', '78', '40'],
            ['Valle rural', '8,7 °C', '84', '40'],
          ]),
    );
    check('ENSAYO.LECTORA T10: footnote = "*El día 1 corresponde al 1 de enero."', t10?.footnote === '*El día 1 corresponde al 1 de enero.');
    check('ENSAYO.LECTORA: exactamente 3 textos con tabla (T2, T5, T10)', L.passages.filter((p) => p.content.some((b) => b.type === 'table')).length === 3);

    // El texto NO se repite dentro del stem de cada pregunta
    let dupInStem = 0;
    for (const q of L.questions) {
      const passage = L.passages.find((p) => p.passageKey === byKey(q))!;
      const firstProse = passage.content.find((b) => b.type === 'paragraph') as { text: string } | undefined;
      const stemJoined = q.stemContent.map((b) => (b.type === 'formula' ? b.latex : b.text)).join(' ');
      if (firstProse && firstProse.text.length > 60 && stemJoined.includes(firstProse.text.slice(0, 60))) dupInStem += 1;
    }
    check('ENSAYO.LECTORA: NINGUNA pregunta embebe el texto completo en su stem', dupInStem === 0);

    // Unicode limpio + puntuación española
    const allStr = JSON.stringify(L);
    check('ENSAYO.LECTORA: sin carácter de reemplazo U+FFFD', !allStr.includes('�'));
    check('ENSAYO.LECTORA: conserva acentos y ¿ del español', /[áéíóúñ]/.test(allStr) && allStr.includes('¿'));
    check('ENSAYO.LECTORA: em dash y comillas tipográficas representadas', allStr.includes('—') && (allStr.includes('“') || allStr.includes('”')));
  }

  console.log('\n--- 10. ENSAYOS-F2: fixture SINTÉTICO -- texto compartido + tabla + preguntas de lectora ---');
  const syntheticTable = {
    type: 'table' as const,
    order: 1,
    headers: ['A', 'B', 'C'],
    rows: [
      ['1', '2', '3'],
      ['4', '5', '6'],
    ],
    footnote: 'Fuente: fixture sintético.',
  };
  const syntheticModule = {
    examKey: 'ENSAYO.ZZTESTSRC',
    title: 'Ensayo sintético F2',
    subjectKey: 'competencia-lectora',
    durationMinutes: 60,
    passages: [
      {
        passageKey: 'ENSAYO.ZZTESTSRC.T1',
        displayOrder: 1,
        title: 'Texto sintético 1',
        content: [
          { type: 'paragraph' as const, order: 0, text: 'Párrafo del texto compartido con acentos: á é í ó ú ñ.' },
          syntheticTable,
        ],
      },
    ],
    questions: [
      {
        questionKey: 'ENSAYO.ZZTESTSRC.Q1',
        displayOrder: 1,
        readingSkill: 'LOCALIZAR' as const,
        difficulty: 'FACIL' as const,
        passageKey: 'ENSAYO.ZZTESTSRC.T1',
        stemContent: [{ type: 'paragraph' as const, order: 0, text: 'Pregunta 1 sobre el texto.' }],
        options: [
          { content: { type: 'paragraph' as const, order: 0, text: 'a' }, correct: true },
          { content: { type: 'paragraph' as const, order: 0, text: 'b' }, correct: false },
          { content: { type: 'paragraph' as const, order: 0, text: 'c' }, correct: false },
          { content: { type: 'paragraph' as const, order: 0, text: 'd' }, correct: false },
        ],
        explanationContent: [{ type: 'paragraph' as const, order: 0, text: 'Porque a.' }],
      },
      {
        questionKey: 'ENSAYO.ZZTESTSRC.Q2',
        displayOrder: 2,
        readingSkill: 'INTERPRETAR' as const,
        difficulty: 'MEDIA' as const,
        passageKey: 'ENSAYO.ZZTESTSRC.T1',
        stemContent: [{ type: 'paragraph' as const, order: 0, text: 'Pregunta 2 sobre el MISMO texto.' }],
        options: [
          { content: { type: 'paragraph' as const, order: 0, text: 'a' }, correct: false },
          { content: { type: 'paragraph' as const, order: 0, text: 'b' }, correct: true },
          { content: { type: 'paragraph' as const, order: 0, text: 'c' }, correct: false },
          { content: { type: 'paragraph' as const, order: 0, text: 'd' }, correct: false },
        ],
        explanationContent: [{ type: 'paragraph' as const, order: 0, text: 'Porque b.' }],
      },
    ],
  };
  const parsed = examSourceModuleSchema.safeParse(syntheticModule);
  check('fixture sintético F2: cumple examSourceModuleSchema', parsed.success);
  if (parsed.success) {
    check('fixture: 1 texto compartido, 2 preguntas de lectora al mismo passageKey', parsed.data.passages.length === 1 && parsed.data.questions.length === 2);
    check(
      'fixture: ambas preguntas clasifican como COMPETENCIA_LECTORA',
      parsed.data.questions.every((q) => examClassification(q).family === 'COMPETENCIA_LECTORA'),
    );
    const tableBlock = parsed.data.passages[0].content.find((b) => b.type === 'table') as typeof syntheticTable | undefined;
    check(
      'fixture: la tabla conserva EXACTAMENTE headers A|B|C y filas 1|2|3 / 4|5|6 tras el roundtrip',
      !!tableBlock &&
        JSON.stringify(tableBlock.headers) === JSON.stringify(['A', 'B', 'C']) &&
        JSON.stringify(tableBlock.rows) === JSON.stringify([['1', '2', '3'], ['4', '5', '6']]),
    );
  }
  // Negativos
  check(
    'fixture: se RECHAZA una fila de tabla con celdas de más',
    !examSourceModuleSchema.safeParse({
      ...syntheticModule,
      passages: [{ ...syntheticModule.passages[0], content: [{ ...syntheticTable, rows: [['1', '2', '3', '4']] }] }],
    }).success,
  );
  check(
    'fixture: se RECHAZA una pregunta de lectora con passageKey inexistente',
    !examSourceModuleSchema.safeParse({
      ...syntheticModule,
      questions: [{ ...syntheticModule.questions[0], passageKey: 'ENSAYO.ZZTESTSRC.T9' }, syntheticModule.questions[1]],
    }).success,
  );

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de source de Ensayos pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
