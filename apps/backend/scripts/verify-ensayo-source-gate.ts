// ENSAYOS-M1-A -- Gate PRE-BD del banco de Ensayos V1 (`apps/backend/content/ensayo/`).
// Ver docs/adr/0024-ensayos-foundation.md.
//
// Puramente estático: SIN Postgres, SIN Docker, SIN `run-gate.ts`, SIN
// servidor -- ejecutable con solo `tsx`. Mismo espíritu que
// `verify-content-source-gate.ts` (Study), pero para el schema/loader/
// manifest propios de Ensayos.
//
// Verifica: definición del ensayo, conteos (65 preguntas / 260 alternativas /
// 65 correctas / 65 explicaciones no vacías), orden fijo Q1..Q65, unicidad de
// claves en namespace `ENSAYO.*` sin colisión con Study, integridad de
// contenido (4 alternativas / 1 correcta / bloques bien formados), LaTeX
// renderizable (MathJax en memoria), Unicode limpio, y las tres
// distribuciones del blueprint (eje 15/19/15/16, dificultad 16/33/16,
// habilidad 25/15/14/11). Además: Study permanece 98 LR / 980 Q y ninguna
// clave `ENSAYO.*` aparece en el manifest de Study.
import { join, relative } from 'node:path';
import { loadExamModules } from '../content/ensayo/load';
import { ENSAYO_M1_BLUEPRINT, EXAM_AXES, EXAM_DIFFICULTIES, EXAM_PRIMARY_SKILLS } from '../content/ensayo/manifest';
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

async function main() {
  console.log('--- 0. Carga de módulos de Ensayo (content/ensayo/**) ---');
  const { loaded, issues } = await loadExamModules(ENSAYO_ROOT);
  for (const issue of issues) {
    check(`${relative(CONTENT_ROOT, issue.file)}: cumple examSourceModuleSchema`, false);
    console.error(`       ${issue.message}`);
  }
  check(`exactamente 1 módulo de Ensayo cargado y válido (encontrados: ${loaded.length})`, loaded.length === 1);
  if (loaded.length !== 1) {
    finish();
    return;
  }
  const exam = loaded[0]!.module;

  console.log('\n--- 1. Definición del Ensayo M1 (contra blueprint APPROVED) ---');
  check(`examKey = "${ENSAYO_M1_BLUEPRINT.examKey}"`, exam.examKey === ENSAYO_M1_BLUEPRINT.examKey);
  check(`title = "${ENSAYO_M1_BLUEPRINT.title}"`, exam.title === ENSAYO_M1_BLUEPRINT.title);
  check(`subjectKey = "${ENSAYO_M1_BLUEPRINT.subjectKey}"`, exam.subjectKey === ENSAYO_M1_BLUEPRINT.subjectKey);
  check(`durationMinutes = ${ENSAYO_M1_BLUEPRINT.durationMinutes}`, exam.durationMinutes === ENSAYO_M1_BLUEPRINT.durationMinutes);
  check(`65 preguntas (encontradas: ${exam.questions.length})`, exam.questions.length === 65);

  console.log('\n--- 2. Orden fijo Q1..Q65 (sin huecos, sin duplicados) ---');
  const orders = exam.questions.map((q) => q.displayOrder).sort((a, b) => a - b);
  check(`displayOrder es exactamente 1..65`, orders.length === 65 && orders.every((o, i) => o === i + 1));
  const keyByOrder = new Map(exam.questions.map((q) => [q.displayOrder, q.questionKey]));
  check(
    `cada displayOrder n corresponde a la clave ENSAYO.M1.Q<n>`,
    exam.questions.every((q) => keyByOrder.get(q.displayOrder) === `ENSAYO.M1.Q${q.displayOrder}`),
  );

  console.log('\n--- 3. Claves: 65 únicas, namespace ENSAYO.*, sin colisión con Study ---');
  const keys = exam.questions.map((q) => q.questionKey);
  check(`65 questionKeys únicas (distintas: ${new Set(keys).size})`, new Set(keys).size === 65);
  check(`todas bajo el namespace "ENSAYO."`, keys.every((k) => k.startsWith('ENSAYO.')));
  check(`examKey "${exam.examKey}" bajo el namespace "ENSAYO."`, exam.examKey.startsWith('ENSAYO.'));

  const { loaded: studyLoaded } = await loadStudyModules(ESTUDIO_ROOT);
  const studyQuestionKeys = new Set<string>();
  const studyResourceKeys = new Set<string>();
  for (const s of studyLoaded) {
    studyResourceKeys.add(s.module.resourceKey);
    for (const q of s.module.questions) studyQuestionKeys.add(q.questionKey);
  }
  check(
    `0 colisiones questionKey Ensayo <-> Study (${studyQuestionKeys.size} claves Study)`,
    keys.every((k) => !studyQuestionKeys.has(k)),
  );
  check(`examKey no colisiona con ningún resourceKey de Study`, !studyResourceKeys.has(exam.examKey));
  check(`ninguna clave ENSAYO.* aparece en el CONTENT_MANIFEST de Study`, !manifestMentionsEnsayo());

  console.log('\n--- 4. Integridad de contenido por pregunta ---');
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
    check(`${q.questionKey}: enunciado no vacío y con bloques con contenido`, q.stemContent.length > 0 && q.stemContent.every((b) => blkText(b as Blk).length > 0));
    check(`${q.questionKey}: explicación no vacía y con bloques con contenido`, q.explanationContent.length > 0 && q.explanationContent.every((b) => blkText(b as Blk).length > 0));
    const canon = q.options.map((o) => (o.content.type === 'formula' ? `f:${o.content.latex}` : `t:${o.content.text}`));
    check(`${q.questionKey}: alternativas no duplicadas`, new Set(canon).size === canon.length);
  }
  check(`260 alternativas en total (${totalOptions})`, totalOptions === 260);
  check(`65 respuestas correctas en total (${totalCorrect})`, totalCorrect === 65);
  check(`65 explicaciones no vacías (vacías: ${emptyExplanations})`, emptyExplanations === 0);
  check(`65 enunciados no vacíos (vacíos: ${emptyStems})`, emptyStems === 0);

  console.log('\n--- 5. Blueprint: distribuciones exactas (eje / dificultad / habilidad) ---');
  const axisCount = tally(exam.questions.map((q) => q.axis), EXAM_AXES);
  const diffCount = tally(exam.questions.map((q) => q.difficulty), EXAM_DIFFICULTIES);
  const skillCount = tally(exam.questions.map((q) => q.primarySkill), EXAM_PRIMARY_SKILLS);
  for (const a of EXAM_AXES) check(`eje ${a}: ${axisCount[a]} == ${ENSAYO_M1_BLUEPRINT.expectedAxis[a]}`, axisCount[a] === ENSAYO_M1_BLUEPRINT.expectedAxis[a]);
  for (const d of EXAM_DIFFICULTIES) check(`dificultad ${d}: ${diffCount[d]} == ${ENSAYO_M1_BLUEPRINT.expectedDifficulty[d]}`, diffCount[d] === ENSAYO_M1_BLUEPRINT.expectedDifficulty[d]);
  for (const s of EXAM_PRIMARY_SKILLS) check(`habilidad ${s}: ${skillCount[s]} == ${ENSAYO_M1_BLUEPRINT.expectedPrimarySkill[s]}`, skillCount[s] === ENSAYO_M1_BLUEPRINT.expectedPrimarySkill[s]);

  console.log('\n--- 6. Unicode limpio (sin carácter de reemplazo, español intacto) ---');
  const allText: string[] = [];
  for (const q of exam.questions) {
    for (const b of [...q.stemContent, ...q.explanationContent] as Blk[]) allText.push(blkText(b));
    for (const o of q.options) allText.push(o.content.type === 'formula' ? o.content.latex : o.content.text);
  }
  check(`ningún bloque contiene el carácter de reemplazo U+FFFD`, !allText.some(hasReplacementChar));
  check(`el contenido conserva caracteres acentuados del español (á/é/í/ó/ú/ñ/¿/¡)`, allText.some((t) => /[áéíóúñ¿¡]/i.test(t)));

  console.log('\n--- 7. LaTeX: todas las fórmulas únicas renderizan (MathJax, sin efectos secundarios) ---');
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
        check(`${q.questionKey}: LaTeX sin artefacto de render (−/·/⋅/×): "${latex}"`, false);
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

  console.log('\n--- 8. Aislamiento de Study: 98 LR / 980 Q sin cambios ---');
  check(`CONTENT_MANIFEST de Study: totalExpectedResources = 98 (${totalExpectedResources(CONTENT_MANIFEST)})`, totalExpectedResources(CONTENT_MANIFEST) === 98);
  check(`CONTENT_MANIFEST de Study: totalExpectedQuestions = 980 (${totalExpectedQuestions(CONTENT_MANIFEST)})`, totalExpectedQuestions(CONTENT_MANIFEST) === 980);
  check(`loader de Study carga módulos de content/estudio sin errores (${studyLoaded.length} recursos)`, studyLoaded.length > 0);

  finish();
}

function tally<T extends string>(values: T[], keys: readonly T[]): Record<T, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
  for (const v of values) out[v] += 1;
  return out;
}

function manifestMentionsEnsayo(): boolean {
  const json = JSON.stringify(CONTENT_MANIFEST);
  return json.includes('ENSAYO.') || json.toLowerCase().includes('"ensayo"');
}

function finish() {
  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de source de Ensayos (ENSAYOS-M1-A) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
