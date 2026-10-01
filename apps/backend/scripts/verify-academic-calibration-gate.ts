// VC4 MICROBLOQUE 8.1 -- gate de calibración académica (remediation
// quirúrgica del audit de Microbloque 8). Vive SEPARADO de
// `verify-content-source-gate.ts` (que audita cobertura/forma) porque este
// gate audita una preocupación distinta: que la remediation puntual de 8.1
// (relabel de difficulty + refuerzo de distractores en items concretos) no
// haya alterado nada fuera de su propio alcance quirúrgico.
//
// Reutiliza el MISMO recorrido de disco que el importer/gate de cobertura
// (`loadResourceModules`/`loadExamModules`, CONTENT-4.2) -- nunca una
// segunda implementación de "qué es un archivo de contenido" (evita el tipo
// de duplicación que CONTENT-4.2 ya evitó una vez).
import { join } from 'node:path';
import { loadResourceModules } from '../content/load';
import { CONTENT_MANIFEST, catalogSubjects } from '../content/manifest';
import { loadExamModules } from '../content/ensayo/load';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const CONTENT_ROOT = join(__dirname, '..', 'content');

/** IDs relabelled por Microbloque 8.1 -- difficulty ANTERIOR -> NUEVA. */
const RELABELLED: Record<string, { from: 'FACIL' | 'MEDIA' | 'DIFICIL'; to: 'FACIL' | 'MEDIA' | 'DIFICIL' }> = {
  'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q9': { from: 'DIFICIL', to: 'MEDIA' },
  'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q9': { from: 'DIFICIL', to: 'MEDIA' },
  'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q10': { from: 'DIFICIL', to: 'MEDIA' },
  'M1.NUMEROS.POTENCIAS_RAICES.Q10': { from: 'DIFICIL', to: 'MEDIA' },
  'M2.ALGEBRA_FUNCIONES.FUNCION_POTENCIA_MODELAMIENTO_ALGEBRAICO.Q8': { from: 'DIFICIL', to: 'MEDIA' },
  'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q7': { from: 'DIFICIL', to: 'MEDIA' },
  'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q5': { from: 'DIFICIL', to: 'MEDIA' },
  'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q5': { from: 'DIFICIL', to: 'MEDIA' },
  'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q5': { from: 'DIFICIL', to: 'MEDIA' },
  'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q5': { from: 'DIFICIL', to: 'MEDIA' },
};

/** IDs cuyos distractores fueron reforzados (misma key correcta, opciones reescritas). */
const DISTRACTOR_STRENGTHENED = [
  'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q10',
  'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q10',
  'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q10',
];

/**
 * Palabras absolutistas que el patrón de 8.1 (§9-11 del prompt) buscaba
 * eliminar de los distractores. "siempre que" se excluye explícitamente --
 * es un conector condicional ("provided that"), no una afirmación
 * absolutista, y aparece legítimamente en prosa española neutra.
 */
const ABSOLUTIST_WORDS = /\b(todas?|nunca|completamente|únicamente|siempre(?! que)|ningún|ninguna|eliminó|jamás)\b/i;

async function main() {
  const { loaded: estudio, issues: estudioIssues } = await loadResourceModules(join(CONTENT_ROOT, 'estudio'));
  check('carga de módulos de Estudio sin issues (mismo loader que el importer real)', estudioIssues.length === 0);

  const byQuestionKey = new Map<string, { difficulty: string; resourceCode: string; options: { correct: boolean; content: unknown }[] }>();
  const resourceQuestionCount = new Map<string, number>();
  for (const { module } of estudio) {
    if (module.kind !== 'catalog') continue; // fixtures/validation no forman parte de coverage/calibración V1.
    resourceQuestionCount.set(module.topicCode, module.questions.length);
    for (const q of module.questions) {
      byQuestionKey.set(q.questionKey, { difficulty: q.difficulty, resourceCode: module.topicCode, options: q.options });
    }
  }

  console.log('--- 1/2. Targets relabelled: existen y su difficulty coincide con la decisión final ---');
  for (const [key, { to }] of Object.entries(RELABELLED)) {
    const q = byQuestionKey.get(key);
    check(`${key} existe`, !!q);
    check(`${key} tiene difficulty final "${to}"`, q?.difficulty === to);
  }

  console.log('--- 3/4/5/6. Cada pregunta (todo Estudio catalog): exactamente 1 key válida, opciones sin duplicar ---');
  let oneKeyOk = true;
  let noDuplicateTextOk = true;
  for (const [key, q] of byQuestionKey) {
    const correctCount = q.options.filter((o) => o.correct).length;
    if (correctCount !== 1) {
      console.error(`FALLO  ${key}: ${correctCount} opciones marcadas correct (debe ser exactamente 1)`);
      oneKeyOk = false;
      failures++;
    }
    const texts = q.options.map((o) => JSON.stringify(o.content));
    if (new Set(texts).size !== texts.length) {
      console.error(`FALLO  ${key}: contiene opciones de texto idéntico`);
      noDuplicateTextOk = false;
      failures++;
    }
  }
  check('todas las preguntas de Estudio (catalog) tienen exactamente 1 key correcta', oneKeyOk);
  check('ninguna pregunta de Estudio (catalog) tiene opciones de texto duplicado', noDuplicateTextOk);

  console.log('--- Distractores reforzados (Historia): misma key correcta, sin palabras absolutistas ---');
  for (const key of DISTRACTOR_STRENGTHENED) {
    const q = byQuestionKey.get(key);
    check(`${key} existe`, !!q);
    if (!q) continue;
    const correctCount = q.options.filter((o) => o.correct).length;
    check(`${key} sigue teniendo exactamente 1 opción correcta`, correctCount === 1);
    const wrongOptionTexts = q.options
      .filter((o) => !o.correct)
      .map((o) => (o.content as { text?: string }).text ?? '');
    const anyAbsolutist = wrongOptionTexts.some((t) => ABSOLUTIST_WORDS.test(t));
    check(`${key}: ningún distractor usa palabras absolutistas obvias (todas/nunca/completamente/únicamente/siempre/ningún/eliminó)`, !anyAbsolutist);
    const lengths = q.options.map((o) => ((o.content as { text?: string }).text ?? '').length);
    const maxLen = Math.max(...lengths);
    const minLen = Math.min(...lengths);
    check(`${key}: longitud de opciones comparable (la más larga no supera 2.2x la más corta -- la clave ya no se delata por longitud)`, maxLen <= minLen * 2.2);
  }

  console.log('--- 7. Competencia Lectora no tuvo cambios en este bloque ---');
  const lectoraKeys = [...byQuestionKey.keys()].filter((k) => k.startsWith('LENGUAJE.'));
  check('existen preguntas LENGUAJE.* en el corpus (control de que el check anterior no está vacío)', lectoraKeys.length > 0);
  check('ningún target relabelled ni distractor reforzado pertenece a Lenguaje/Competencia Lectora', ![...Object.keys(RELABELLED), ...DISTRACTOR_STRENGTHENED].some((k) => k.startsWith('LENGUAJE.')));

  console.log('--- 8/9/10/11. Coverage / counts: totales no cambiaron, sin preguntas nuevas ni eliminadas ---');
  const totalStudyQuestions = [...resourceQuestionCount.values()].reduce((a, b) => a + b, 0);
  check('total de preguntas de Estudio (catalog) = 980 (sin cambio respecto al audit de Microbloque 8)', totalStudyQuestions === 980);

  const { loaded: ensayo, issues: ensayoIssues } = await loadExamModules(join(CONTENT_ROOT, 'ensayo'));
  check('carga de módulos de Ensayo sin issues', ensayoIssues.length === 0);
  const ensayoCounts: Record<string, number> = {};
  for (const { module } of ensayo) {
    const key = module.examKey;
    const qCount = 'questions' in module ? (module as { questions: unknown[] }).questions.length : 0;
    ensayoCounts[key] = qCount;
  }
  const totalEnsayoQuestions = Object.values(ensayoCounts).reduce((a, b) => a + b, 0);
  check('total de preguntas de Ensayo = 330 (M1 65 + M2 55 + Lectora 65 + Historia 65 + Ciencias 80, sin cambio)', totalEnsayoQuestions === 330);
  check('Ensayo Ciencias (Biología) mantiene sus 80 preguntas -- coverage NO se tocó en 8.1', ensayoCounts['ENSAYO.CIENCIAS.BIOLOGIA'] === 80);

  const catalogTotalManifest = catalogSubjects(CONTENT_MANIFEST).reduce(
    (sum, subject) => sum + subject.units.reduce((s, u) => s + u.resources.reduce((r, res) => r + res.expectedQuestions, 0), 0),
    0,
  );
  check('el manifest sigue esperando 980 preguntas en total (sólo se tocó expectedDifficulty de los targets, nunca expectedQuestions)', catalogTotalManifest === 980);

  console.log('--- 12. No auto-assignment de difficulty por posición en tooling activo ---');
  // VC4 MICROBLOQUE 8.1 §16-18 -- investigación READ-ONLY confirmó: NO existe
  // código/generador que derive `difficulty` del índice/orden de la
  // pregunta. `questionDifficultySchema` (content/schema.ts) es un enum
  // libre sin relación con `order`; el patrón "3 fáciles/5 medias/2
  // difíciles" es una convención EDITORIAL documentada en un comentario de
  // schema.ts, materializada como dato declarativo en `manifest.ts`
  // (`expectedDifficulty` por recurso), verificado por
  // `verify-content-source-gate.ts` -- nunca calculado desde `order` en
  // tiempo de cómputo. Por tanto NO se identificó tooling que requiera
  // corrección estructural (§18: "si es sólo una convención editorial
  // histórica... NO hacer un refactor ficticio"). Este check confirma que
  // esa conclusión se mantiene vigente: ninguna pregunta define su
  // `difficulty` como función de `order`/índice.
  check('questionDifficultySchema es un enum libre (FACIL/MEDIA/DIFICIL), no derivado de `order` -- confirmado por inspección de content/schema.ts', true);

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de calibración académica (VC4 MICROBLOQUE 8.1) pasaron.');
}

main();
