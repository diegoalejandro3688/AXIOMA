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
  isHistoriaSourceQuestion,
  isCienciasSourceQuestion,
  type MathSourceQuestion,
} from '../content/ensayo/schema';
import {
  ENSAYO_MANIFEST,
  ENSAYO_READING_MANIFEST,
  ENSAYO_HISTORIA_MANIFEST,
  ENSAYO_CIENCIAS_MANIFEST,
  ENSAYO_MODULE_COUNT,
  findExamBlueprint,
  findReadingBlueprint,
  findHistoriaBlueprint,
  findCienciasBlueprint,
  EXAM_HISTORIA_AXES,
  EXAM_HISTORIA_SKILLS,
  EXAM_CIENCIAS_DISCIPLINES,
  EXAM_CIENCIAS_MODULES,
  EXAM_CIENCIAS_SKILLS,
  EXAM_AXES,
  EXAM_DIFFICULTIES,
  EXAM_PRIMARY_SKILLS,
  EXAM_READING_SKILLS,
} from '../content/ensayo/manifest';
import { loadResourceModules as loadStudyModules } from '../content/load';
import {
  CONTENT_MANIFEST,
  totalExpectedQuestions,
  totalExpectedResources,
} from '../content/manifest';
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
const blkText = (b: Blk) => (b.type === 'formula' ? (b.latex ?? '') : (b.text ?? ''));
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
  for (const bp of [
    ...ENSAYO_MANIFEST,
    ...ENSAYO_READING_MANIFEST,
    ...ENSAYO_HISTORIA_MANIFEST,
    ...ENSAYO_CIENCIAS_MANIFEST,
  ]) {
    check(
      `el manifest declara "${bp.examKey}" y existe su módulo fuente`,
      loadedKeys.has(bp.examKey),
    );
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
    check(
      `displayOrder es exactamente 1..${N}`,
      orders.length === N && orders.every((o, i) => o === i + 1),
    );
    const keyByOrder = new Map(exam.questions.map((q) => [q.displayOrder, q.questionKey]));
    check(
      `cada displayOrder n corresponde a la clave ${exam.examKey}.Q<n>`,
      exam.questions.every(
        (q) => keyByOrder.get(q.displayOrder) === `${exam.examKey}.Q${q.displayOrder}`,
      ),
    );

    console.log(`--- 3. Claves: ${N} únicas, namespace ENSAYO.*, sin colisión con Study ---`);
    const keys = exam.questions.map((q) => q.questionKey);
    check(`${N} questionKeys únicas (distintas: ${new Set(keys).size})`, new Set(keys).size === N);
    check(
      `todas bajo el namespace "ENSAYO."`,
      keys.every((k) => k.startsWith('ENSAYO.')),
    );
    check(
      `examKey "${exam.examKey}" bajo el namespace "ENSAYO."`,
      exam.examKey.startsWith('ENSAYO.'),
    );
    check(
      `0 colisiones questionKey ${exam.examKey} <-> Study (${studyQuestionKeys.size} claves Study)`,
      keys.every((k) => !studyQuestionKeys.has(k)),
    );
    check(
      `examKey no colisiona con ningún resourceKey de Study`,
      !studyResourceKeys.has(exam.examKey),
    );

    console.log('--- 4. Integridad de contenido por pregunta ---');
    let totalOptions = 0;
    let totalCorrect = 0;
    let emptyStems = 0;
    let emptyExplanations = 0;
    for (const q of exam.questions) {
      totalOptions += q.options.length;
      const correct = q.options.filter((o) => o.correct).length;
      totalCorrect += correct;
      check(
        `${q.questionKey}: exactamente 4 alternativas (${q.options.length})`,
        q.options.length === 4,
      );
      check(`${q.questionKey}: exactamente 1 correcta (${correct})`, correct === 1);
      if (q.stemContent.length === 0) emptyStems++;
      if (q.explanationContent.length === 0) emptyExplanations++;
      check(
        `${q.questionKey}: enunciado no vacío y con bloques con contenido`,
        q.stemContent.length > 0 && q.stemContent.every((b) => blkText(b as Blk).length > 0),
      );
      check(
        `${q.questionKey}: explicación no vacía y con bloques con contenido`,
        q.explanationContent.length > 0 &&
          q.explanationContent.every((b) => blkText(b as Blk).length > 0),
      );
      const canon = q.options.map((o) =>
        o.content.type === 'formula' ? `f:${o.content.latex}` : `t:${o.content.text}`,
      );
      check(`${q.questionKey}: alternativas no duplicadas`, new Set(canon).size === canon.length);
    }
    check(`${N * 4} alternativas en total (${totalOptions})`, totalOptions === N * 4);
    check(`${N} respuestas correctas en total (${totalCorrect})`, totalCorrect === N);
    check(`${N} explicaciones no vacías (vacías: ${emptyExplanations})`, emptyExplanations === 0);
    check(`${N} enunciados no vacíos (vacíos: ${emptyStems})`, emptyStems === 0);

    console.log(
      '--- 4b. ENSAYOS-F2: M1/M2 no tienen textos compartidos ni preguntas de lectora ---',
    );
    check(
      `${exam.examKey}: passages == [] (encontrados: ${exam.passages.length})`,
      exam.passages.length === 0,
    );
    check(
      `${exam.examKey}: 0 preguntas de competencia lectora`,
      exam.questions.every((q) => !isLectoraSourceQuestion(q)),
    );

    console.log('--- 5. Blueprint: distribuciones exactas (eje / dificultad / habilidad) ---');
    const mathQs = exam.questions.filter(
      (q): q is MathSourceQuestion => !isLectoraSourceQuestion(q),
    );
    const axisCount = tally(
      mathQs.map((q) => q.axis),
      EXAM_AXES,
    );
    const diffCount = tally(
      mathQs.map((q) => q.difficulty),
      EXAM_DIFFICULTIES,
    );
    const skillCount = tally(
      mathQs.map((q) => q.primarySkill),
      EXAM_PRIMARY_SKILLS,
    );
    for (const a of EXAM_AXES)
      check(
        `eje ${a}: ${axisCount[a]} == ${bp.expectedAxis[a]}`,
        axisCount[a] === bp.expectedAxis[a],
      );
    for (const d of EXAM_DIFFICULTIES)
      check(
        `dificultad ${d}: ${diffCount[d]} == ${bp.expectedDifficulty[d]}`,
        diffCount[d] === bp.expectedDifficulty[d],
      );
    for (const s of EXAM_PRIMARY_SKILLS)
      check(
        `habilidad ${s}: ${skillCount[s]} == ${bp.expectedPrimarySkill[s]}`,
        skillCount[s] === bp.expectedPrimarySkill[s],
      );

    console.log('--- 6. Unicode limpio (sin carácter de reemplazo, español intacto) ---');
    const allText: string[] = [];
    for (const q of exam.questions) {
      for (const b of [...q.stemContent, ...q.explanationContent] as Blk[])
        allText.push(blkText(b));
      for (const o of q.options)
        allText.push(o.content.type === 'formula' ? o.content.latex : o.content.text);
    }
    check(
      `ningún bloque contiene el carácter de reemplazo U+FFFD`,
      !allText.some(hasReplacementChar),
    );
    check(
      `el contenido conserva caracteres acentuados del español (á/é/í/ó/ú/ñ/¿/¡)`,
      allText.some((t) => /[áéíóúñ¿¡]/i.test(t)),
    );

    console.log(
      '--- 7. LaTeX: todas las fórmulas únicas renderizan (MathJax, sin efectos secundarios) ---',
    );
    const latexSeen = new Set<string>();
    let formulaCount = 0;
    let formulaFailures = 0;
    let artifactFailures = 0;
    for (const q of exam.questions) {
      const formulas: string[] = [];
      for (const b of [...q.stemContent, ...q.explanationContent] as Blk[])
        if (b.type === 'formula' && b.latex) formulas.push(b.latex);
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
    check(
      `todas las fórmulas LaTeX únicas renderizan (${formulaCount - formulaFailures}/${formulaCount})`,
      formulaFailures === 0,
    );
    check(`ninguna fórmula contiene un artefacto de render`, artifactFailures === 0);
  }

  console.log('\n--- 8. Aislamiento de Study: 98 LR / 980 Q sin cambios ---');
  check(
    `CONTENT_MANIFEST de Study: totalExpectedResources = 98 (${totalExpectedResources(CONTENT_MANIFEST)})`,
    totalExpectedResources(CONTENT_MANIFEST) === 98,
  );
  check(
    `CONTENT_MANIFEST de Study: totalExpectedQuestions = 980 (${totalExpectedQuestions(CONTENT_MANIFEST)})`,
    totalExpectedQuestions(CONTENT_MANIFEST) === 980,
  );
  check(
    `loader de Study carga módulos de content/estudio sin errores (${studyLoaded.length} recursos)`,
    studyLoaded.length > 0,
  );
  check(
    `ninguna clave ENSAYO.* aparece en el CONTENT_MANIFEST de Study`,
    !manifestMentionsEnsayo(),
  );

  console.log('\n--- 9. ENSAYO.M2: pins de las correcciones editoriales DEFINITIVAS (Q6, Q37) ---');
  const m2 = loaded.find((l) => l.module.examKey === 'ENSAYO.M2')?.module;
  check('ENSAYO.M2 presente para pinear Q6/Q37', !!m2);
  if (m2) {
    const q6 = m2.questions.find((q) => q.questionKey === 'ENSAYO.M2.Q6')!;
    const q6opts = q6.options.map((o) =>
      o.content.type === 'formula' ? o.content.latex : `t:${o.content.text}`,
    );
    check(
      'Q6: las 4 alternativas DEFINITIVAS son exactamente 6√2 / 3√2 / 4√3 / 6√3',
      JSON.stringify(q6opts) ===
        JSON.stringify(['6\\sqrt{2}', '3\\sqrt{2}', '4\\sqrt{3}', '6\\sqrt{3}']),
    );
    check(
      'Q6: correcta = A (6√2), exactamente 1',
      q6.options[0].correct === true && q6.options.filter((o) => o.correct).length === 1,
    );
    check(
      'Q6: sin dos alternativas matemáticamente idénticas (4 strings distintas)',
      new Set(q6opts).size === 4,
    );
    check(
      'Q6: dificultad FACIL, eje NUMEROS, habilidad REPRESENTAR',
      q6.difficulty === 'FACIL' && q6.axis === 'NUMEROS' && q6.primarySkill === 'REPRESENTAR',
    );

    const q37 = m2.questions.find((q) => q.questionKey === 'ENSAYO.M2.Q37')!;
    const q37stem = q37.stemContent.map((b) => (b.type === 'formula' ? b.latex : b.text)).join(' ');
    const q37expl = q37.explanationContent
      .map((b) => (b.type === 'formula' ? b.latex : b.text))
      .join(' ');
    check(
      'Q37: el enunciado usa "al menos 192 miles de pesos" (no 256)',
      /al menos 192 miles de pesos/.test(q37stem) && !/256/.test(q37stem) && !/256/.test(q37expl),
    );
    check('Q37: la explicación exige G(x) >= 192', q37expl.includes('G(x)\\geq192'));
    const q37opts = q37.options.map((o) =>
      o.content.type === 'formula' ? o.content.latex : `t:${o.content.text}`,
    );
    check(
      'Q37: correcta = B (16 <= x <= 32)',
      q37.options[1].content.type === 'formula' &&
        q37.options[1].content.latex === '16\\leq x\\leq32' &&
        q37.options[1].correct === true,
    );
    check(
      'Q37: exactamente 1 correcta y es la B',
      q37.options.filter((o) => o.correct).length === 1 && q37opts[1] === '16\\leq x\\leq32',
    );

    const q10 = m2.questions.find((q) => q.questionKey === 'ENSAYO.M2.Q10')!;
    check(
      'Q10: dificultad MEDIA (resolución de la contradicción), eje NUMEROS, correcta C',
      q10.difficulty === 'MEDIA' && q10.axis === 'NUMEROS' && q10.options[2].correct === true,
    );

    // Una pregunta es de Suficiencia de Datos si alguna alternativa habla de
    // "Se necesitan conjuntamente" (patrón único de ese tipo de ítem).
    const dsKeys = m2.questions
      .filter((q) =>
        q.options.some(
          (o) =>
            o.content.type === 'paragraph' && /Se necesitan conjuntamente/.test(o.content.text),
        ),
      )
      .map((q) => q.questionKey)
      .sort();
    check(
      `ENSAYO.M2: exactamente 5 preguntas de Suficiencia de Datos, Q9/Q18/Q31/Q40/Q49 (encontradas: ${dsKeys.join(',')})`,
      JSON.stringify(dsKeys) ===
        JSON.stringify(
          [
            'ENSAYO.M2.Q18',
            'ENSAYO.M2.Q31',
            'ENSAYO.M2.Q40',
            'ENSAYO.M2.Q49',
            'ENSAYO.M2.Q9',
          ].sort(),
        ),
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
    check(
      `ENSAYO.LECTORA: ${lectoraBp.expectedPassageCount} textos (encontrados: ${L.passages.length})`,
      L.passages.length === 10,
    );
    check(
      `ENSAYO.LECTORA: ${lectoraBp.expectedQuestionCount} preguntas (encontradas: ${L.questions.length})`,
      L.questions.length === 65,
    );

    // Claves T1..T10 y orden 1..10
    const pKeys = L.passages.map((p) => p.passageKey);
    check(
      'ENSAYO.LECTORA: passageKeys = ENSAYO.LECTORA.T1..T10',
      JSON.stringify([...pKeys].sort()) ===
        JSON.stringify(Array.from({ length: 10 }, (_, i) => `ENSAYO.LECTORA.T${i + 1}`).sort()),
    );
    const pOrders = L.passages.map((p) => p.displayOrder).sort((a, b) => a - b);
    check(
      'ENSAYO.LECTORA: displayOrder de textos es 1..10',
      JSON.stringify(pOrders) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );

    // questionKeys Q1..Q65, displayOrder 1..65, todas lectora
    const qKeys = L.questions.map((q) => q.questionKey);
    check(
      'ENSAYO.LECTORA: questionKeys = ENSAYO.LECTORA.Q1..Q65',
      JSON.stringify([...qKeys].sort()) ===
        JSON.stringify(Array.from({ length: 65 }, (_, i) => `ENSAYO.LECTORA.Q${i + 1}`).sort()),
    );
    const qOrders = L.questions.map((q) => q.displayOrder).sort((a, b) => a - b);
    check(
      'ENSAYO.LECTORA: displayOrder 1..65 sin huecos',
      JSON.stringify(qOrders) === JSON.stringify(Array.from({ length: 65 }, (_, i) => i + 1)),
    );
    check(
      'ENSAYO.LECTORA: TODAS las preguntas son de competencia lectora (llevan passageKey)',
      L.questions.every((q) => isLectoraSourceQuestion(q)),
    );
    check(
      'ENSAYO.LECTORA: 0 colisión de questionKey con Study',
      qKeys.every((k) => !studyQuestionKeys.has(k)),
    );
    check(
      'ENSAYO.LECTORA: examKey/passageKeys bajo namespace "ENSAYO."',
      L.examKey.startsWith('ENSAYO.') && pKeys.every((k) => k.startsWith('ENSAYO.')),
    );

    // Mapa texto -> rango de preguntas EXACTO contra el blueprint autoritativo
    const byKey = (q: { passageKey?: string }) => (q as { passageKey: string }).passageKey;
    let mapOk = true;
    for (const range of lectoraBp.passageMap) {
      const inRange = L.questions.filter(
        (q) => q.displayOrder >= range.firstQuestion && q.displayOrder <= range.lastQuestion,
      );
      const allMapped = inRange.every((q) => byKey(q) === range.passageKey);
      const count = inRange.length;
      const expectedCount = range.lastQuestion - range.firstQuestion + 1;
      if (!allMapped || count !== expectedCount) mapOk = false;
      check(
        `ENSAYO.LECTORA: ${range.passageKey} ("${range.title}") <- Q${range.firstQuestion}..Q${range.lastQuestion} (${count}/${expectedCount})`,
        allMapped && count === expectedCount,
      );
      const passage = L.passages.find((p) => p.passageKey === range.passageKey)!;
      check(
        `ENSAYO.LECTORA: ${range.passageKey} title = "${range.title}"`,
        passage.title === range.title,
      );
    }
    check(
      'ENSAYO.LECTORA: cada pregunta apunta a un passageKey que existe',
      L.questions.every((q) => pKeys.includes(byKey(q))),
    );
    check('ENSAYO.LECTORA: mapa texto->pregunta 100% coherente con el blueprint', mapOk);

    // Integridad por pregunta
    let opts = 0;
    let correct = 0;
    for (const q of L.questions) {
      opts += q.options.length;
      const c = q.options.filter((o) => o.correct).length;
      correct += c;
      check(
        `ENSAYO.LECTORA ${q.questionKey}: 4 alternativas / 1 correcta`,
        q.options.length === 4 && c === 1,
      );
      check(
        `ENSAYO.LECTORA ${q.questionKey}: enunciado y explicación no vacíos`,
        q.stemContent.length > 0 && q.explanationContent.length > 0,
      );
      const canon = q.options.map((o) =>
        o.content.type === 'formula' ? `f:${o.content.latex}` : `t:${o.content.text}`,
      );
      check(
        `ENSAYO.LECTORA ${q.questionKey}: alternativas no duplicadas`,
        new Set(canon).size === 4,
      );
    }
    check(`ENSAYO.LECTORA: 260 alternativas en total (${opts})`, opts === 260);
    check(
      `ENSAYO.LECTORA: 65 correctas / 195 incorrectas (${correct}/${opts - correct})`,
      correct === 65 && opts - correct === 195,
    );

    // Blueprint DERIVADO desde las 65 preguntas (labels reales, no hardcode del resultado)
    const skillTally = tally(
      L.questions.map(
        (q) => (q as { readingSkill: (typeof EXAM_READING_SKILLS)[number] }).readingSkill,
      ),
      EXAM_READING_SKILLS,
    );
    const diffTally = tally(
      L.questions.map((q) => q.difficulty),
      EXAM_DIFFICULTIES,
    );
    for (const s of EXAM_READING_SKILLS) {
      check(
        `ENSAYO.LECTORA: habilidad ${s}: ${skillTally[s]} == ${lectoraBp.expectedReadingSkill[s]}`,
        skillTally[s] === lectoraBp.expectedReadingSkill[s],
      );
    }
    for (const d of EXAM_DIFFICULTIES) {
      check(
        `ENSAYO.LECTORA: dificultad ${d}: ${diffTally[d]} == ${lectoraBp.expectedDifficulty[d]}`,
        diffTally[d] === lectoraBp.expectedDifficulty[d],
      );
    }

    // Clave autoritativa compacta Q1..Q65
    const KEY = 'BCBCDABABDBCCCBBCACDCBDBCBABBBAABCBCACADDACDADCDACDBDACDBDCADCBDA';
    const derivedKey = [...L.questions]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((q) => 'ABCD'[q.options.findIndex((o) => o.correct)])
      .join('');
    check(
      `ENSAYO.LECTORA: clave Q1..Q65 coincide con la compacta autoritativa`,
      derivedKey === KEY,
    );
    const keyDist = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
    for (const ch of derivedKey) keyDist[ch] += 1;
    check(
      `ENSAYO.LECTORA: distribución de clave A=14 B=18 C=18 D=15 (${JSON.stringify(keyDist)})`,
      keyDist.A === 14 && keyDist.B === 18 && keyDist.C === 18 && keyDist.D === 15,
    );

    // Q19 -- PIN de la versión DEFINITIVA CORREGIDA, no regresar a la vieja
    const q19 = L.questions.find((q) => q.questionKey === 'ENSAYO.LECTORA.Q19')!;
    const q19stem = q19.stemContent.map((b) => (b.type === 'formula' ? b.latex : b.text)).join(' ');
    check(
      'ENSAYO.LECTORA Q19: readingSkill=EVALUAR, difficulty=MEDIA',
      (q19 as { readingSkill: string }).readingSkill === 'EVALUAR' && q19.difficulty === 'MEDIA',
    );
    check('ENSAYO.LECTORA Q19: correcta = C', q19.options.findIndex((o) => o.correct) === 2);
    check(
      'ENSAYO.LECTORA Q19: enunciado es la versión DEFINITIVA ("...debilitaría más directamente la defensa...")',
      q19stem.includes(
        'debilitaría más directamente la defensa que hace el autor de reservar treinta minutos',
      ),
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
    const tableOf = (key: string) =>
      L.passages.find((p) => p.passageKey === key)!.content.find((b) => b.type === 'table') as
        { headers: string[]; rows: string[][]; footnote?: string } | undefined;
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
          JSON.stringify([
            'Sector',
            'Horas grabadas',
            'Especies acústicamente identificadas',
            'Registros de vocalizaciones',
          ]),
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
    check(
      'ENSAYO.LECTORA T10: footnote = "*El día 1 corresponde al 1 de enero."',
      t10?.footnote === '*El día 1 corresponde al 1 de enero.',
    );
    check(
      'ENSAYO.LECTORA: exactamente 3 textos con tabla (T2, T5, T10)',
      L.passages.filter((p) => p.content.some((b) => b.type === 'table')).length === 3,
    );

    // El texto NO se repite dentro del stem de cada pregunta
    let dupInStem = 0;
    for (const q of L.questions) {
      const passage = L.passages.find((p) => p.passageKey === byKey(q))!;
      const firstProse = passage.content.find((b) => b.type === 'paragraph') as
        { text: string } | undefined;
      const stemJoined = q.stemContent
        .map((b) => (b.type === 'formula' ? b.latex : b.text))
        .join(' ');
      if (
        firstProse &&
        firstProse.text.length > 60 &&
        stemJoined.includes(firstProse.text.slice(0, 60))
      )
        dupInStem += 1;
    }
    check('ENSAYO.LECTORA: NINGUNA pregunta embebe el texto completo en su stem', dupInStem === 0);

    // Unicode limpio + puntuación española
    const allStr = JSON.stringify(L);
    check('ENSAYO.LECTORA: sin carácter de reemplazo U+FFFD', !allStr.includes('�'));
    check(
      'ENSAYO.LECTORA: conserva acentos y ¿ del español',
      /[áéíóúñ]/.test(allStr) && allStr.includes('¿'),
    );
    check(
      'ENSAYO.LECTORA: em dash y comillas tipográficas representadas',
      allStr.includes('—') && (allStr.includes('“') || allStr.includes('”')),
    );
  }

  console.log(
    '\n--- 9c. ENSAYO.HISTORIA: contenido productivo de Historia y Ciencias Sociales ---',
  );
  const histBp = findHistoriaBlueprint('ENSAYO.HISTORIA')!;
  const historia = loaded.find((l) => l.module.examKey === 'ENSAYO.HISTORIA')?.module;
  check('ENSAYO.HISTORIA presente y cargado', !!historia && !!histBp);
  if (historia) {
    const H = historia;
    check(`ENSAYO.HISTORIA: title = "${histBp.title}"`, H.title === histBp.title);
    check('ENSAYO.HISTORIA: subjectKey = "historia"', H.subjectKey === 'historia');
    check('ENSAYO.HISTORIA: durationMinutes = 120', H.durationMinutes === 120);
    check(
      `ENSAYO.HISTORIA: ${histBp.expectedPassageCount} textos (encontrados: ${H.passages.length})`,
      H.passages.length === 24,
    );
    check(
      `ENSAYO.HISTORIA: ${histBp.expectedQuestionCount} preguntas (encontradas: ${H.questions.length})`,
      H.questions.length === 65,
    );

    const pKeys = H.passages.map((p) => p.passageKey);
    check(
      'ENSAYO.HISTORIA: passageKeys = ENSAYO.HISTORIA.T1..T24',
      JSON.stringify([...pKeys].sort()) ===
        JSON.stringify(Array.from({ length: 24 }, (_, i) => `ENSAYO.HISTORIA.T${i + 1}`).sort()),
    );
    const pOrders = H.passages.map((p) => p.displayOrder).sort((a, b) => a - b);
    check(
      'ENSAYO.HISTORIA: displayOrder de textos es 1..24',
      JSON.stringify(pOrders) === JSON.stringify(Array.from({ length: 24 }, (_, i) => i + 1)),
    );

    const qKeys = H.questions.map((q) => q.questionKey);
    check(
      'ENSAYO.HISTORIA: questionKeys = ENSAYO.HISTORIA.Q1..Q65',
      JSON.stringify([...qKeys].sort()) ===
        JSON.stringify(Array.from({ length: 65 }, (_, i) => `ENSAYO.HISTORIA.Q${i + 1}`).sort()),
    );
    const qOrders = H.questions.map((q) => q.displayOrder).sort((a, b) => a - b);
    check(
      'ENSAYO.HISTORIA: displayOrder 1..65 sin huecos',
      JSON.stringify(qOrders) === JSON.stringify(Array.from({ length: 65 }, (_, i) => i + 1)),
    );
    check(
      'ENSAYO.HISTORIA: TODAS las preguntas son de familia HISTORIA_CIENCIAS_SOCIALES',
      H.questions.every((q) => isHistoriaSourceQuestion(q)),
    );
    check(
      'ENSAYO.HISTORIA: 0 preguntas de familia lectora/matemática',
      H.questions.every((q) => !isLectoraSourceQuestion(q)),
    );
    check(
      'ENSAYO.HISTORIA: 0 colisión de questionKey con Study',
      qKeys.every((k) => !studyQuestionKeys.has(k)),
    );
    check(
      'ENSAYO.HISTORIA: namespace "ENSAYO."',
      H.examKey.startsWith('ENSAYO.') && pKeys.every((k) => k.startsWith('ENSAYO.')),
    );

    // Mapa texto -> rango EXACTO
    const pkOf = (q: { passageKey?: string }) => (q as { passageKey: string }).passageKey;
    let mapOk = true;
    for (const range of histBp.passageMap) {
      const inRange = H.questions.filter(
        (q) => q.displayOrder >= range.firstQuestion && q.displayOrder <= range.lastQuestion,
      );
      const allMapped = inRange.every((q) => pkOf(q) === range.passageKey);
      const expectedCount = range.lastQuestion - range.firstQuestion + 1;
      if (!allMapped || inRange.length !== expectedCount) mapOk = false;
      check(
        `ENSAYO.HISTORIA: ${range.passageKey} ("${range.title}") <- Q${range.firstQuestion}..Q${range.lastQuestion} (${inRange.length}/${expectedCount})`,
        allMapped && inRange.length === expectedCount,
      );
      check(
        `ENSAYO.HISTORIA: ${range.passageKey} title = "${range.title}"`,
        H.passages.find((p) => p.passageKey === range.passageKey)!.title === range.title,
      );
    }
    check(
      'ENSAYO.HISTORIA: cada pregunta apunta a un passageKey existente',
      H.questions.every((q) => pKeys.includes(pkOf(q))),
    );
    check('ENSAYO.HISTORIA: mapa texto->pregunta 100% coherente con el blueprint', mapOk);

    // Integridad por pregunta
    let opts = 0;
    let correct = 0;
    for (const q of H.questions) {
      opts += q.options.length;
      const c = q.options.filter((o) => o.correct).length;
      correct += c;
      check(
        `ENSAYO.HISTORIA ${q.questionKey}: 4 alternativas / 1 correcta`,
        q.options.length === 4 && c === 1,
      );
      check(
        `ENSAYO.HISTORIA ${q.questionKey}: enunciado y explicación no vacíos`,
        q.stemContent.length > 0 && q.explanationContent.length > 0,
      );
      const canon = q.options.map((o) =>
        o.content.type === 'formula' ? `f:${o.content.latex}` : `t:${o.content.text}`,
      );
      check(
        `ENSAYO.HISTORIA ${q.questionKey}: alternativas no duplicadas`,
        new Set(canon).size === 4,
      );
    }
    check(`ENSAYO.HISTORIA: 260 alternativas (${opts})`, opts === 260);
    check(
      `ENSAYO.HISTORIA: 65 correctas / 195 incorrectas (${correct}/${opts - correct})`,
      correct === 65 && opts - correct === 195,
    );

    // Blueprint DERIVADO desde las 65 preguntas
    const axisTally = tally(
      H.questions.map((q) => (q as { axis: (typeof EXAM_HISTORIA_AXES)[number] }).axis),
      EXAM_HISTORIA_AXES,
    );
    const skillTally = tally(
      H.questions.map((q) => (q as { skill: (typeof EXAM_HISTORIA_SKILLS)[number] }).skill),
      EXAM_HISTORIA_SKILLS,
    );
    const diffTally = tally(
      H.questions.map((q) => q.difficulty),
      EXAM_DIFFICULTIES,
    );
    for (const a of EXAM_HISTORIA_AXES)
      check(
        `ENSAYO.HISTORIA: eje ${a}: ${axisTally[a]} == ${histBp.expectedAxis[a]}`,
        axisTally[a] === histBp.expectedAxis[a],
      );
    for (const s of EXAM_HISTORIA_SKILLS)
      check(
        `ENSAYO.HISTORIA: habilidad ${s}: ${skillTally[s]} == ${histBp.expectedSkill[s]}`,
        skillTally[s] === histBp.expectedSkill[s],
      );
    for (const d of EXAM_DIFFICULTIES)
      check(
        `ENSAYO.HISTORIA: dificultad ${d}: ${diffTally[d]} == ${histBp.expectedDifficulty[d]}`,
        diffTally[d] === histBp.expectedDifficulty[d],
      );
    check(
      'ENSAYO.HISTORIA: todas las preguntas clasifican como HISTORIA_CIENCIAS_SOCIALES',
      H.questions.every((q) => examClassification(q).family === 'HISTORIA_CIENCIAS_SOCIALES'),
    );

    // Clave autoritativa compacta
    const derivedKey = [...H.questions]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((q) => 'ABCD'[q.options.findIndex((o) => o.correct)])
      .join('');
    check(
      'ENSAYO.HISTORIA: clave Q1..Q65 == compacta autoritativa',
      derivedKey === histBp.compactKey,
    );
    check('ENSAYO.HISTORIA: compacta tiene 65 caracteres', histBp.compactKey.length === 65);
    const keyDist = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
    for (const ch of derivedKey) keyDist[ch] += 1;
    check(
      `ENSAYO.HISTORIA: distribución de clave A=16 B=16 C=16 D=17 (${JSON.stringify(keyDist)})`,
      keyDist.A === 16 && keyDist.B === 16 && keyDist.C === 16 && keyDist.D === 17,
    );

    // Exactamente 8 tablas: T2/T4/T8/T9/T12/T15/T17/T24
    const tableKeys = H.passages
      .filter((p) => p.content.some((b) => b.type === 'table'))
      .map((p) => p.passageKey)
      .sort();
    check(
      'ENSAYO.HISTORIA: exactamente 8 textos con tabla (T2/T4/T8/T9/T12/T15/T17/T24)',
      JSON.stringify(tableKeys) ===
        JSON.stringify(
          [
            'ENSAYO.HISTORIA.T12',
            'ENSAYO.HISTORIA.T15',
            'ENSAYO.HISTORIA.T17',
            'ENSAYO.HISTORIA.T2',
            'ENSAYO.HISTORIA.T24',
            'ENSAYO.HISTORIA.T4',
            'ENSAYO.HISTORIA.T8',
            'ENSAYO.HISTORIA.T9',
          ].sort(),
        ),
    );
    const tableOf = (key: string) =>
      H.passages.find((p) => p.passageKey === key)!.content.find((b) => b.type === 'table') as
        { headers: string[]; rows: string[][]; footnote?: string } | undefined;
    const t2 = tableOf('ENSAYO.HISTORIA.T2');
    check(
      'ENSAYO.HISTORIA T2: headers + filas exactos (1850/1875/1900)',
      !!t2 &&
        JSON.stringify(t2.headers) ===
          JSON.stringify([
            'Año',
            'Población urbana',
            'Trabajadores en manufactura',
            'Producción industrial (índice, 1850=100)',
          ]) &&
        JSON.stringify(t2.rows) ===
          JSON.stringify([
            ['1850', '31 %', '420.000', '100'],
            ['1875', '44 %', '690.000', '175'],
            ['1900', '58 %', '1.080.000', '290'],
          ]),
    );
    const t4 = tableOf('ENSAYO.HISTORIA.T4');
    check(
      'ENSAYO.HISTORIA T4: headers + filas exactos, sin footnote',
      !!t4 &&
        JSON.stringify(t4.headers) === JSON.stringify(['Indicador', '1930', '1960']) &&
        JSON.stringify(t4.rows) ===
          JSON.stringify([
            ['Habitantes de la ciudad', '180.000', '410.000'],
            ['Población nacida en zonas rurales', '21 %', '37 %'],
            ['Viviendas con acceso a agua potable', '68 %', '61 %'],
            ['Personas por vivienda, promedio', '4,7', '6,1'],
          ]) &&
        t4.footnote === undefined,
    );
    const t8 = tableOf('ENSAYO.HISTORIA.T8');
    check(
      'ENSAYO.HISTORIA T8: headers + filas exactos, sin footnote',
      !!t8 &&
        JSON.stringify(t8.headers) ===
          JSON.stringify(['Semana', 'Cantidad ofrecida', 'Precio promedio por kg']) &&
        JSON.stringify(t8.rows) ===
          JSON.stringify([
            ['Antes de las lluvias', '10.000 kg', '$1.200'],
            ['Después de las lluvias', '6.000 kg', '$1.750'],
          ]) &&
        t8.footnote === undefined,
    );
    const t9 = tableOf('ENSAYO.HISTORIA.T9');
    check(
      'ENSAYO.HISTORIA T9: headers + filas exactos + footnote "Índice 1928 = 100."',
      !!t9 &&
        JSON.stringify(t9.headers) === JSON.stringify(['Indicador', '1928', '1932']) &&
        JSON.stringify(t9.rows) ===
          JSON.stringify([
            ['Valor de las exportaciones', '100', '38'],
            ['Empleo en sectores exportadores', '100', '61'],
            ['Ingresos fiscales provenientes del comercio exterior', '100', '47'],
            ['Producción destinada al mercado interno', '100', '92'],
          ]) &&
        t9.footnote === 'Índice 1928 = 100.',
    );
    const t12 = tableOf('ENSAYO.HISTORIA.T12');
    check(
      'ENSAYO.HISTORIA T12: headers + filas exactos, sin footnote',
      !!t12 &&
        JSON.stringify(t12.headers) === JSON.stringify(['Indicador', '1960', '1970']) &&
        JSON.stringify(t12.rows) ===
          JSON.stringify([
            ['Población urbana', '68 %', '76 %'],
            ['Inscripción electoral', '1,8 millones', '3,5 millones'],
            ['Trabajadores sindicalizados', '290.000', '560.000'],
            ['Propiedades agrícolas incluidas en procesos de reforma', '100', '2.900'],
          ]) &&
        t12.footnote === undefined,
    );
    const t15 = tableOf('ENSAYO.HISTORIA.T15');
    check(
      'ENSAYO.HISTORIA T15: headers + filas exactos, sin footnote',
      !!t15 &&
        JSON.stringify(t15.headers) === JSON.stringify(['Indicador', 'Año 1', 'Año 2']) &&
        JSON.stringify(t15.rows) ===
          JSON.stringify([
            ['Ingreso familiar', '$600.000', '$630.000'],
            ['Costo de una canasta habitual de bienes y servicios', '$500.000', '$550.000'],
          ]) &&
        t15.footnote === undefined,
    );
    const t17 = tableOf('ENSAYO.HISTORIA.T17');
    check(
      'ENSAYO.HISTORIA T17: headers + filas exactos, sin footnote',
      !!t17 &&
        JSON.stringify(t17.headers) ===
          JSON.stringify(['Territorio', 'Potencia colonial previa', 'Independencia']) &&
        JSON.stringify(t17.rows) ===
          JSON.stringify([
            ['India', 'Reino Unido', '1947'],
            ['Ghana', 'Reino Unido', '1957'],
            ['Argelia', 'Francia', '1962'],
          ]) &&
        t17.footnote === undefined,
    );
    const t24 = tableOf('ENSAYO.HISTORIA.T24');
    check(
      'ENSAYO.HISTORIA T24: headers + filas exactos (conserva el signo menos U+2212 en "−1 %"), sin footnote',
      !!t24 &&
        JSON.stringify(t24.headers) === JSON.stringify(['Indicador', 'Año 1', 'Año 2']) &&
        JSON.stringify(t24.rows) ===
          JSON.stringify([
            ['Crecimiento de la producción', '+4 %', '−1 %'],
            ['Desempleo', '6 %', '9 %'],
            ['Índice de precios', '100', '108'],
            ['Índice de salario nominal promedio', '100', '105'],
          ]) &&
        t24.rows[0][2] === '−1 %' &&
        t24.footnote === undefined,
    );
    check(
      'ENSAYO.HISTORIA: regresión de datos productiva para los 8 textos con tabla (T2/T4/T8/T9/T12/T15/T17/T24)',
      [t2, t4, t8, t9, t12, t15, t17, t24].every((t) => !!t),
    );

    // Cronologías T13/T16/T20 -- valores exactos
    const proseOf = (key: string) =>
      H.passages
        .find((p) => p.passageKey === key)!
        .content.filter((b) => b.type === 'paragraph')
        .map((b) => (b as { text: string }).text);
    const t13 = proseOf('ENSAYO.HISTORIA.T13').join(' | ');
    check(
      'ENSAYO.HISTORIA T13: cronología 1973/1980/1988/1989/1990 exacta',
      t13.includes('1973: quiebre del orden democrático') &&
        t13.includes('1980: aprobación de una nueva Constitución') &&
        t13.includes('1988: plebiscito') &&
        t13.includes('1989: elecciones presidenciales y parlamentarias') &&
        t13.includes('1990: asume un gobierno elegido mediante sufragio'),
    );
    const t16 = proseOf('ENSAYO.HISTORIA.T16').join(' | ');
    check(
      'ENSAYO.HISTORIA T16: cronología 1939/1945/1948 exacta',
      t16.includes('1939: comienza la Segunda Guerra Mundial') &&
        t16.includes('1945: termina la guerra') &&
        t16.includes('1948: la Asamblea General'),
    );
    const t20 = proseOf('ENSAYO.HISTORIA.T20').join(' | ');
    check(
      'ENSAYO.HISTORIA T20: cronología 1989/1991/1995 exacta',
      t20.includes('1989: cae el Muro de Berlín') &&
        t20.includes('1991: se disuelve la Unión Soviética') &&
        t20.includes('1995: comienza a funcionar la Organización Mundial del Comercio'),
    );

    // Provenance lines preserved
    const proseHas = (key: string, needle: string) => proseOf(key).some((t) => t.includes(needle));
    check(
      'ENSAYO.HISTORIA: se preserva la línea de procedencia "Datos hipotéticos elaborados para ZETRYND" (T2/T4)',
      proseHas('ENSAYO.HISTORIA.T2', 'Datos hipotéticos elaborados para ZETRYND') &&
        proseHas('ENSAYO.HISTORIA.T4', 'Datos hipotéticos elaborados para ZETRYND'),
    );
    check(
      'ENSAYO.HISTORIA: se preserva "Datos seleccionados para fines educativos" (T17)',
      proseHas('ENSAYO.HISTORIA.T17', 'Datos seleccionados para fines educativos'),
    );

    // Texto NO repetido en el stem
    let dupInStem = 0;
    for (const q of H.questions) {
      const passage = H.passages.find((p) => p.passageKey === pkOf(q))!;
      const firstProse = passage.content.find((b) => b.type === 'paragraph') as
        { text: string } | undefined;
      const stemJoined = q.stemContent
        .map((b) => (b.type === 'formula' ? b.latex : b.text))
        .join(' ');
      if (
        firstProse &&
        firstProse.text.length > 60 &&
        stemJoined.includes(firstProse.text.slice(0, 60))
      )
        dupInStem += 1;
    }
    check('ENSAYO.HISTORIA: NINGUNA pregunta embebe el texto completo en su stem', dupInStem === 0);

    const allStr = JSON.stringify(H);
    check('ENSAYO.HISTORIA: sin carácter de reemplazo U+FFFD', !allStr.includes('�'));
    check(
      'ENSAYO.HISTORIA: conserva acentos y ¿ del español',
      /[áéíóúñ]/.test(allStr) && allStr.includes('¿'),
    );
  }

  console.log(
    '\n--- 9d. ENSAYO.CIENCIAS.BIOLOGIA: contenido productivo de Ciencias (Modulo Biologia) ---',
  );
  const cienBp = findCienciasBlueprint('ENSAYO.CIENCIAS.BIOLOGIA')!;
  const ciencias = loaded.find((l) => l.module.examKey === 'ENSAYO.CIENCIAS.BIOLOGIA')?.module;
  check('ENSAYO.CIENCIAS.BIOLOGIA presente y cargado', !!ciencias && !!cienBp);
  if (ciencias) {
    const C = ciencias;
    type CQ = {
      questionKey: string;
      displayOrder: number;
      discipline: string;
      module: string;
      skill: string;
      difficulty: string;
      passageKey: string;
      stemContent: Array<{ type: string; text?: string; latex?: string }>;
      options: Array<{
        content: { type: string; text?: string; latex?: string };
        correct: boolean;
      }>;
      explanationContent: unknown[];
    };
    const cq = C.questions as unknown as CQ[];
    check(`ENSAYO.CIENCIAS.BIOLOGIA: title = "${cienBp.title}"`, C.title === cienBp.title);
    check('ENSAYO.CIENCIAS.BIOLOGIA: subjectKey = "ciencias"', C.subjectKey === 'ciencias');
    check('ENSAYO.CIENCIAS.BIOLOGIA: durationMinutes = 160', C.durationMinutes === 160);
    check(
      `ENSAYO.CIENCIAS.BIOLOGIA: ${cienBp.expectedPassageCount} textos (encontrados: ${C.passages.length})`,
      C.passages.length === 41,
    );
    check(
      `ENSAYO.CIENCIAS.BIOLOGIA: ${cienBp.expectedQuestionCount} preguntas (encontradas: ${cq.length})`,
      cq.length === 80,
    );

    const pKeys = C.passages.map((p) => p.passageKey);
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: passageKeys = T1..T41',
      JSON.stringify([...pKeys].sort()) ===
        JSON.stringify(
          Array.from({ length: 41 }, (_, i) => `ENSAYO.CIENCIAS.BIOLOGIA.T${i + 1}`).sort(),
        ),
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: displayOrder de textos 1..41',
      JSON.stringify(C.passages.map((p) => p.displayOrder).sort((a, b) => a - b)) ===
        JSON.stringify(Array.from({ length: 41 }, (_, i) => i + 1)),
    );
    const qKeys = cq.map((q) => q.questionKey);
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: questionKeys = Q1..Q80',
      JSON.stringify([...qKeys].sort()) ===
        JSON.stringify(
          Array.from({ length: 80 }, (_, i) => `ENSAYO.CIENCIAS.BIOLOGIA.Q${i + 1}`).sort(),
        ),
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: displayOrder 1..80 sin huecos',
      JSON.stringify(cq.map((q) => q.displayOrder).sort((a, b) => a - b)) ===
        JSON.stringify(Array.from({ length: 80 }, (_, i) => i + 1)),
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: TODAS de familia CIENCIAS_MODULO_BIOLOGIA',
      C.questions.every((q) => isCienciasSourceQuestion(q)),
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: 0 de familia lectora/historia',
      C.questions.every((q) => !isLectoraSourceQuestion(q) && !isHistoriaSourceQuestion(q)),
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: 0 colision questionKey con Study',
      qKeys.every((k) => !studyQuestionKeys.has(k)),
    );

    // Mapa texto -> rango EXACTO
    let mapOk = true;
    for (const range of cienBp.passageMap) {
      const inRange = cq.filter(
        (q) => q.displayOrder >= range.firstQuestion && q.displayOrder <= range.lastQuestion,
      );
      const allMapped = inRange.every((q) => q.passageKey === range.passageKey);
      const expectedCount = range.lastQuestion - range.firstQuestion + 1;
      if (!allMapped || inRange.length !== expectedCount) mapOk = false;
      const shortKey = range.passageKey.replace('ENSAYO.CIENCIAS.BIOLOGIA.', '');
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA: ${shortKey} ("${range.title}") <- Q${range.firstQuestion}..Q${range.lastQuestion} (${inRange.length}/${expectedCount})`,
        allMapped && inRange.length === expectedCount,
      );
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA: ${shortKey} title exacto`,
        C.passages.find((p) => p.passageKey === range.passageKey)!.title === range.title,
      );
    }
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: cada pregunta apunta a un passageKey existente',
      cq.every((q) => pKeys.includes(q.passageKey)),
    );
    check('ENSAYO.CIENCIAS.BIOLOGIA: mapa texto->pregunta 100% coherente con el blueprint', mapOk);

    // Integridad por pregunta
    let opts = 0;
    let correct = 0;
    for (const q of cq) {
      opts += q.options.length;
      const c = q.options.filter((o) => o.correct).length;
      correct += c;
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA ${q.questionKey}: 4 alternativas / 1 correcta`,
        q.options.length === 4 && c === 1,
      );
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA ${q.questionKey}: enunciado y explicacion no vacios`,
        q.stemContent.length > 0 && q.explanationContent.length > 0,
      );
      const canon = q.options.map((o) =>
        o.content.type === 'formula' ? `f:${o.content.latex}` : `t:${o.content.text}`,
      );
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA ${q.questionKey}: alternativas no duplicadas`,
        new Set(canon).size === 4,
      );
    }
    check(`ENSAYO.CIENCIAS.BIOLOGIA: 320 alternativas (${opts})`, opts === 320);
    check(
      `ENSAYO.CIENCIAS.BIOLOGIA: 80 correctas / 240 incorrectas (${correct}/${opts - correct})`,
      correct === 80 && opts - correct === 240,
    );

    // Blueprint DERIVADO desde las 80 preguntas
    const modT = tally(
      cq.map((q) => q.module as (typeof EXAM_CIENCIAS_MODULES)[number]),
      EXAM_CIENCIAS_MODULES,
    );
    const discT = tally(
      cq.map((q) => q.discipline as (typeof EXAM_CIENCIAS_DISCIPLINES)[number]),
      EXAM_CIENCIAS_DISCIPLINES,
    );
    const discCT = tally(
      cq
        .filter((q) => q.module === 'COMUN')
        .map((q) => q.discipline as (typeof EXAM_CIENCIAS_DISCIPLINES)[number]),
      EXAM_CIENCIAS_DISCIPLINES,
    );
    const discET = tally(
      cq
        .filter((q) => q.module === 'ELECTIVO_BIOLOGIA')
        .map((q) => q.discipline as (typeof EXAM_CIENCIAS_DISCIPLINES)[number]),
      EXAM_CIENCIAS_DISCIPLINES,
    );
    const skT = tally(
      cq.map((q) => q.skill as (typeof EXAM_CIENCIAS_SKILLS)[number]),
      EXAM_CIENCIAS_SKILLS,
    );
    const dfT = tally(
      cq.map((q) => q.difficulty as (typeof EXAM_DIFFICULTIES)[number]),
      EXAM_DIFFICULTIES,
    );
    for (const m of EXAM_CIENCIAS_MODULES)
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA: modulo ${m}: ${modT[m]} == ${cienBp.expectedModule[m]}`,
        modT[m] === cienBp.expectedModule[m],
      );
    for (const d of EXAM_CIENCIAS_DISCIPLINES)
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA: disciplina global ${d}: ${discT[d]} == ${cienBp.expectedDiscipline[d]}`,
        discT[d] === cienBp.expectedDiscipline[d],
      );
    for (const d of EXAM_CIENCIAS_DISCIPLINES)
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA: disciplina COMUN ${d}: ${discCT[d]} == ${cienBp.expectedDisciplineComun[d]}`,
        discCT[d] === cienBp.expectedDisciplineComun[d],
      );
    for (const d of EXAM_CIENCIAS_DISCIPLINES)
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA: disciplina ELECTIVO ${d}: ${discET[d]} == ${cienBp.expectedDisciplineElectivo[d]}`,
        discET[d] === cienBp.expectedDisciplineElectivo[d],
      );
    for (const s of EXAM_CIENCIAS_SKILLS)
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA: habilidad ${s}: ${skT[s]} == ${cienBp.expectedSkill[s]}`,
        skT[s] === cienBp.expectedSkill[s],
      );
    for (const d of EXAM_DIFFICULTIES)
      check(
        `ENSAYO.CIENCIAS.BIOLOGIA: dificultad ${d}: ${dfT[d]} == ${cienBp.expectedDifficulty[d]}`,
        dfT[d] === cienBp.expectedDifficulty[d],
      );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: todas clasifican como CIENCIAS_MODULO_BIOLOGIA',
      C.questions.every((q) => examClassification(q).family === 'CIENCIAS_MODULO_BIOLOGIA'),
    );

    // Frontera de modulo Q54 -> Q55
    const byOrderC = new Map(cq.map((q) => [q.displayOrder, q]));
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: Q1..Q54 = COMUN, Q55..Q80 = ELECTIVO_BIOLOGIA (frontera exacta)',
      cq.every((q) =>
        q.displayOrder <= 54 ? q.module === 'COMUN' : q.module === 'ELECTIVO_BIOLOGIA',
      ),
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: Q54 COMUN y Q55 ELECTIVO_BIOLOGIA',
      byOrderC.get(54)!.module === 'COMUN' && byOrderC.get(55)!.module === 'ELECTIVO_BIOLOGIA',
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: comunLastQuestion del blueprint = 54',
      cienBp.comunLastQuestion === 54,
    );

    // Clave FINAL compacta (§8.3) + distribucion
    const derivedKey = [...cq]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((q) => 'ABCD'[q.options.findIndex((o) => o.correct)])
      .join('');
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: clave FINAL Q1..Q80 == compacta autoritativa (§8.3)',
      derivedKey === cienBp.compactKey,
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: compacta tiene 80 caracteres',
      cienBp.compactKey.length === 80,
    );
    const kd = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
    for (const ch of derivedKey) kd[ch] += 1;
    check(
      `ENSAYO.CIENCIAS.BIOLOGIA: distribucion de clave A=20 B=20 C=20 D=20 (${JSON.stringify(kd)})`,
      kd.A === 20 && kd.B === 20 && kd.C === 20 && kd.D === 20,
    );

    // Permutation map (§8.2): 24 exactas, codigos validos, resto identidad
    const permKeys = Object.keys(cienBp.permutationMap)
      .map(Number)
      .sort((a, b) => a - b);
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: exactamente 24 preguntas con permutacion de alternativas (§8.2)',
      permKeys.length === 24 &&
        JSON.stringify(permKeys) ===
          JSON.stringify([
            3, 8, 15, 21, 22, 23, 29, 31, 32, 33, 44, 47, 51, 52, 53, 54, 56, 65, 68, 70, 73, 75,
            77, 80,
          ]),
    );
    const permCodes: Record<number, string> = {
      3: 'BCAD',
      8: 'CABD',
      15: 'ABDC',
      21: 'BACD',
      22: 'ACBD',
      23: 'ACBD',
      29: 'BCDA',
      31: 'ABDC',
      32: 'ACDB',
      33: 'CABD',
      44: 'ACBD',
      47: 'ABDC',
      51: 'ABDC',
      52: 'CABD',
      53: 'BACD',
      54: 'BACD',
      56: 'ABDC',
      65: 'BCAD',
      68: 'BACD',
      70: 'ACBD',
      73: 'BCDA',
      75: 'ACDB',
      77: 'CABD',
      80: 'ABDC',
    };
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: codigo de permutacion exacto por pregunta (§8.2)',
      permKeys.every((n) => cienBp.permutationMap[String(n)] === permCodes[n]),
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: cada codigo de permutacion es una permutacion valida de ABCD',
      Object.values(cienBp.permutationMap).every(
        (c) => /^[ABCD]{4}$/.test(c) && new Set(c).size === 4,
      ),
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: las otras 56 preguntas conservan el orden base (identidad)',
      80 - permKeys.length === 56,
    );

    // 32 tablas productivas exactas (31 textos; T6 tiene 2). Estructura pineada byte a byte.
    const CIENCIAS_EXPECTED_TABLES: Record<
      string,
      Array<{ headers: string[]; rows: string[][]; footnote: string | null }>
    > = {
      T1: [
        {
          headers: [
            'Tipo celular',
            'Retículo endoplasmático rugoso',
            'Complejo de Golgi',
            'Mitocondrias',
          ],
          rows: [
            ['Célula secretora pancreática', 'Muy abundante', 'Muy abundante', 'Abundancia media'],
            ['Célula muscular esquelética', 'Poco abundante', 'Poco abundante', 'Muy abundantes'],
          ],
          footnote: null,
        },
      ],
      T2: [
        {
          headers: ['Distancia a la fuente de luz', 'Burbujas de gas liberadas por minuto'],
          rows: [
            ['10 cm', '42'],
            ['20 cm', '27'],
            ['40 cm', '12'],
          ],
          footnote: null,
        },
      ],
      T3: [
        {
          headers: ['Variable observada', 'Control', 'Con sustancia'],
          rows: [
            ['Impulso nervioso llega al terminal presináptico', 'Sí', 'Sí'],
            ['Liberación relativa de neurotransmisor', '100', '8'],
            ['Respuesta relativa de la célula postsináptica', '100', '10'],
          ],
          footnote: null,
        },
      ],
      T4: [
        {
          headers: ['Nivel trófico', 'Energía disponible'],
          rows: [
            ['Productores', '20.000 kJ'],
            ['Herbívoros', '2.300 kJ'],
            ['Carnívoros', '260 kJ'],
          ],
          footnote: null,
        },
      ],
      T5: [
        {
          headers: ['Señal', 'Frecuencia', 'Longitud de onda'],
          rows: [
            ['X', '100 MHz', '3,0 m'],
            ['Y', '200 MHz', '1,5 m'],
            ['Z', '300 MHz', '1,0 m'],
          ],
          footnote: null,
        },
      ],
      T6: [
        {
          headers: ['Fuerza neta aplicada', 'Aceleración'],
          rows: [
            ['2 N', '1 m/s²'],
            ['4 N', '2 m/s²'],
            ['6 N', '3 m/s²'],
          ],
          footnote: null,
        },
        {
          headers: ['Tiempo', 'Posición'],
          rows: [
            ['0 s', '0 m'],
            ['1 s', '2 m'],
            ['2 s', '4 m'],
            ['3 s', '6 m'],
          ],
          footnote: null,
        },
      ],
      T7: [
        {
          headers: ['Resistencia', 'Corriente'],
          rows: [
            ['2 Ω', '3,0 A'],
            ['4 Ω', '1,5 A'],
            ['6 Ω', '1,0 A'],
          ],
          footnote: null,
        },
      ],
      T8: [
        {
          headers: ['Temperatura', 'Masa máxima disuelta'],
          rows: [
            ['10 °C', '18 g'],
            ['25 °C', '26 g'],
            ['40 °C', '37 g'],
          ],
          footnote: null,
        },
      ],
      T10: [
        {
          headers: ['Átomo', 'Protones', 'Neutrones', 'Electrones'],
          rows: [
            ['X', '17', '18', '17'],
            ['Y', '17', '20', '17'],
          ],
          footnote: null,
        },
      ],
      T12: [
        {
          headers: ['Periodo aproximado', 'Ovario', 'Útero'],
          rows: [
            [
              'Días 1–5',
              'Comienza el desarrollo de folículos',
              'Se elimina parte del revestimiento uterino',
            ],
            [
              'Días 6–13',
              'Un folículo continúa madurando',
              'El revestimiento uterino aumenta su grosor',
            ],
            [
              'Alrededor del día 14',
              'Ocurre la ovulación',
              'El revestimiento permanece desarrollado',
            ],
            [
              'Días 15–28',
              'Se desarrolla el cuerpo lúteo',
              'El revestimiento se mantiene preparado y posteriormente puede comenzar un nuevo ciclo',
            ],
          ],
          footnote: null,
        },
      ],
      T14: [
        {
          headers: ['Característica', 'Gameto X', 'Gameto Y'],
          rows: [
            ['Tamaño relativo', 'Grande', 'Pequeño'],
            ['Cantidad de citoplasma', 'Abundante', 'Escasa'],
            ['Flagelo', 'Ausente', 'Presente'],
            ['Capacidad de desplazamiento propio', 'Muy limitada', 'Alta'],
          ],
          footnote: null,
        },
      ],
      T15: [
        {
          headers: ['Tiempo', 'Velocidad'],
          rows: [
            ['0 s', '0 m/s'],
            ['1 s', '2 m/s'],
            ['2 s', '4 m/s'],
            ['3 s', '6 m/s'],
          ],
          footnote: null,
        },
      ],
      T16: [
        {
          headers: ['Distancia objeto–lente', 'Distancia lente–imagen'],
          rows: [
            ['40 cm', '13,3 cm'],
            ['30 cm', '15,0 cm'],
            ['20 cm', '20,0 cm'],
          ],
          footnote: null,
        },
      ],
      T17: [
        {
          headers: [
            'Distancia aproximada desde la fosa hacia el continente',
            'Profundidad media de los sismos',
          ],
          rows: [
            ['20 km', '18 km'],
            ['100 km', '75 km'],
            ['200 km', '155 km'],
          ],
          footnote: null,
        },
      ],
      T19: [
        {
          headers: ['Sustancia', 'Temperatura de fusión', 'Temperatura de ebullición'],
          rows: [
            ['X', '−15 °C', '65 °C'],
            ['Y', '12 °C', '98 °C'],
            ['Z', '78 °C', '160 °C'],
          ],
          footnote: null,
        },
      ],
      T23: [
        {
          headers: ['Condición', 'Disminución del volumen gaseoso'],
          rows: [
            ['Semillas germinando', '4,8 mL'],
            ['Semillas no germinadas', '0,7 mL'],
            ['Semillas hervidas', '0,1 mL'],
          ],
          footnote: null,
        },
      ],
      T24: [
        {
          headers: ['Intensidad del estímulo', 'Tiempo de respuesta'],
          rows: [
            ['Baja', '120 ms'],
            ['Media', '95 ms'],
            ['Alta', '92 ms'],
          ],
          footnote: null,
        },
      ],
      T25: [
        {
          headers: ['Ángulo de incidencia', 'Ángulo de refracción'],
          rows: [
            ['20°', '13°'],
            ['40°', '25°'],
            ['60°', '35°'],
          ],
          footnote: null,
        },
      ],
      T26: [
        {
          headers: ['Aparato', 'Potencia', 'Tiempo de uso'],
          rows: [
            ['X', '1.000 W', '30 min'],
            ['Y', '500 W', '2 h'],
          ],
          footnote: null,
        },
      ],
      T27: [
        {
          headers: ['Sustancia', 'Fórmula molecular', 'Temperatura de ebullición'],
          rows: [
            ['Metanol', 'CH₄O', '65 °C'],
            ['Etanol', 'C₂H₆O', '78 °C'],
            ['Propanol', 'C₃H₈O', '97 °C'],
          ],
          footnote: null,
        },
      ],
      T30: [
        {
          headers: ['Ensayo', 'Temperatura', 'Masa de agua', 'Masa máxima de sólido disuelta'],
          rows: [
            ['I', '20 °C', '100 g', '24 g'],
            ['II', '40 °C', '200 g', '60 g'],
          ],
          footnote: null,
        },
      ],
      T31: [
        {
          headers: ['Cultivo', 'Proteína de interés detectada'],
          rows: [
            ['Control', '0 unidades'],
            ['M', '85 unidades'],
          ],
          footnote: null,
        },
      ],
      T32: [
        {
          headers: ['Organismo', 'Organización ósea básica', 'Función principal'],
          rows: [
            ['Humano', 'Húmero, radio, cúbito y huesos de la mano', 'Manipulación'],
            ['Murciélago', 'Húmero, radio, cúbito y huesos de la mano modificados', 'Vuelo'],
            ['Ballena', 'Húmero, radio, cúbito y huesos de la mano modificados', 'Natación'],
          ],
          footnote: null,
        },
      ],
      T33: [
        {
          headers: ['Población', 'Células que ingresan a fase S'],
          rows: [
            ['X', '12 %'],
            ['Y', '68 %'],
          ],
          footnote: null,
        },
      ],
      T34: [
        {
          headers: ['Etapa observada', 'Cantidad de ADN por célula'],
          rows: [
            ['G1', '2,0'],
            ['Durante S', 'entre 2,0 y 4,0'],
            ['G2', '4,0'],
            ['Después de la división celular', '2,0 por célula hija'],
          ],
          footnote: null,
        },
      ],
      T35: [
        {
          headers: ['Etapa mitótica', 'Control', 'Tratamiento X'],
          rows: [
            ['Profase', '35 %', '15 %'],
            ['Metafase', '25 %', '65 %'],
            ['Anafase', '20 %', '10 %'],
            ['Telofase', '20 %', '10 %'],
          ],
          footnote: null,
        },
      ],
      T37: [
        {
          headers: ['Generación', 'Resistentes sin insecticida', 'Resistentes con insecticida'],
          rows: [
            ['0', '8 %', '8 %'],
            ['5', '10 %', '34 %'],
            ['10', '12 %', '71 %'],
          ],
          footnote: null,
        },
      ],
      T38: [
        {
          headers: ['Estrato', 'Antigüedad relativa', 'Característica del fósil'],
          rows: [
            ['I', 'Más antiguo', 'Estructura locomotora corta y robusta'],
            ['II', 'Intermedio', 'Estructura locomotora de longitud intermedia'],
            ['III', 'Más reciente', 'Estructura locomotora más larga y delgada'],
          ],
          footnote: null,
        },
      ],
      T39: [
        {
          headers: ['Fracción y condición', 'O₂ liberado', 'Producción de azúcares'],
          rows: [
            ['T iluminada', 'Sí', 'No'],
            ['T en oscuridad', 'No', 'No'],
            [
              'E con productos energéticos provenientes de la etapa dependiente de luz y CO₂',
              'No',
              'Sí',
            ],
          ],
          footnote: null,
        },
      ],
      T40: [
        {
          headers: ['Nivel', 'Energía disponible'],
          rows: [
            ['Productores', '50.000 kJ'],
            ['Consumidores primarios', '6.000 kJ'],
            ['Consumidores secundarios', '720 kJ'],
            ['Consumidores terciarios', '90 kJ'],
          ],
          footnote: null,
        },
      ],
      T41: [
        {
          headers: ['Luz', 'CO₂', 'Tasa fotosintética'],
          rows: [
            ['Baja', 'Baja', '10'],
            ['Baja', 'Alta', '13'],
            ['Alta', 'Baja', '18'],
            ['Alta', 'Alta', '34'],
          ],
          footnote: null,
        },
      ],
    };
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: 31 textos con tabla / 32 bloques de tabla en total',
      C.passages.filter((p) => p.content.some((b) => b.type === 'table')).length === 31 &&
        C.passages.reduce((a, p) => a + p.content.filter((b) => b.type === 'table').length, 0) ===
          32,
    );
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: T6 contiene 2 tablas productivas (fuerza/aceleracion y tiempo/posicion)',
      C.passages
        .find((p) => p.passageKey === 'ENSAYO.CIENCIAS.BIOLOGIA.T6')!
        .content.filter((b) => b.type === 'table').length === 2,
    );
    let tablesOk = 0;
    let tablesFail = 0;
    for (const [tk, expected] of Object.entries(CIENCIAS_EXPECTED_TABLES)) {
      const passage = C.passages.find((p) => p.passageKey === `ENSAYO.CIENCIAS.BIOLOGIA.${tk}`)!;
      const actual = passage.content.filter((b) => b.type === 'table') as Array<{
        headers: string[];
        rows: string[][];
        footnote?: string;
      }>;
      const match =
        actual.length === expected.length &&
        actual.every(
          (t, i) =>
            JSON.stringify(t.headers) === JSON.stringify(expected[i].headers) &&
            JSON.stringify(t.rows) === JSON.stringify(expected[i].rows) &&
            (t.footnote ?? null) === expected[i].footnote,
        );
      if (match) tablesOk += 1;
      else {
        tablesFail += 1;
        check(`ENSAYO.CIENCIAS.BIOLOGIA ${tk}: tabla(s) exacta(s)`, false);
      }
    }
    check(
      `ENSAYO.CIENCIAS.BIOLOGIA: los 32 bloques de tabla productivos coinciden byte a byte (${tablesOk}/31 textos)`,
      tablesFail === 0 && tablesOk === 31,
    );
    const t19Table = C.passages
      .find((p) => p.passageKey === 'ENSAYO.CIENCIAS.BIOLOGIA.T19')!
      .content.find((b) => b.type === 'table') as { rows: string[][] };
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: T19 conserva el signo menos U+2212 en "−15 °C"',
      CIENCIAS_EXPECTED_TABLES.T19[0].rows[0][1] === '−15 °C' && t19Table.rows[0][1] === '−15 °C',
    );

    // El texto NO se repite dentro del stem
    let dupInStem = 0;
    for (const q of cq) {
      const passage = C.passages.find((p) => p.passageKey === q.passageKey)!;
      const firstProse = passage.content.find((b) => b.type === 'paragraph') as
        { text: string } | undefined;
      const stemJoined = q.stemContent.map((b) => b.text ?? b.latex ?? '').join(' ');
      if (
        firstProse &&
        firstProse.text.length > 60 &&
        stemJoined.includes(firstProse.text.slice(0, 60))
      )
        dupInStem += 1;
    }
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: NINGUNA pregunta embebe el texto completo en su stem',
      dupInStem === 0,
    );

    const allStr = JSON.stringify(C);
    check('ENSAYO.CIENCIAS.BIOLOGIA: sin caracter de reemplazo U+FFFD', !allStr.includes('�'));
    check(
      'ENSAYO.CIENCIAS.BIOLOGIA: conserva acentos, ¿, °, Ω y subindices',
      /[áéíóúñ]/.test(allStr) &&
        allStr.includes('¿') &&
        allStr.includes('°') &&
        allStr.includes('Ω') &&
        /[₂₄₆₈]/.test(allStr),
    );
  }

  console.log(
    '\n--- 10. ENSAYOS-F2: fixture SINTÉTICO -- texto compartido + tabla + preguntas de lectora ---',
  );
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
          {
            type: 'paragraph' as const,
            order: 0,
            text: 'Párrafo del texto compartido con acentos: á é í ó ú ñ.',
          },
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
        stemContent: [
          { type: 'paragraph' as const, order: 0, text: 'Pregunta 2 sobre el MISMO texto.' },
        ],
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
    check(
      'fixture: 1 texto compartido, 2 preguntas de lectora al mismo passageKey',
      parsed.data.passages.length === 1 && parsed.data.questions.length === 2,
    );
    check(
      'fixture: ambas preguntas clasifican como COMPETENCIA_LECTORA',
      parsed.data.questions.every((q) => examClassification(q).family === 'COMPETENCIA_LECTORA'),
    );
    const tableBlock = parsed.data.passages[0].content.find((b) => b.type === 'table') as
      typeof syntheticTable | undefined;
    check(
      'fixture: la tabla conserva EXACTAMENTE headers A|B|C y filas 1|2|3 / 4|5|6 tras el roundtrip',
      !!tableBlock &&
        JSON.stringify(tableBlock.headers) === JSON.stringify(['A', 'B', 'C']) &&
        JSON.stringify(tableBlock.rows) ===
          JSON.stringify([
            ['1', '2', '3'],
            ['4', '5', '6'],
          ]),
    );
  }
  // Negativos
  check(
    'fixture: se RECHAZA una fila de tabla con celdas de más',
    !examSourceModuleSchema.safeParse({
      ...syntheticModule,
      passages: [
        {
          ...syntheticModule.passages[0],
          content: [{ ...syntheticTable, rows: [['1', '2', '3', '4']] }],
        },
      ],
    }).success,
  );
  check(
    'fixture: se RECHAZA una pregunta de lectora con passageKey inexistente',
    !examSourceModuleSchema.safeParse({
      ...syntheticModule,
      questions: [
        { ...syntheticModule.questions[0], passageKey: 'ENSAYO.ZZTESTSRC.T9' },
        syntheticModule.questions[1],
      ],
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
