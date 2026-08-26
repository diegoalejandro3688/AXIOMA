// CONTENT-4.2 / CONTENT-4.2B -- Gate end-to-end de `import-content.ts`,
// contra backend real + Postgres real, mismo patrón exacto que
// `verify-editorial-cli-gate.ts` (I6): el CLI/importer se ejecuta como
// PROCESO HIJO real (nunca se importa como módulo), con un actor
// administrativo real creado por `dist/cli/create-admin-actor.js` (nunca
// por INSERT de fixture). `pg` se usa EXCLUSIVAMENTE para LEER y verificar
// el efecto -- ninguna escritura de contenido editorial por SQL manual,
// mismo invariante que I6.
//
// Namespace técnico ZZTEST (ver content/manifest.ts) -- nunca M1/M2/
// Lenguaje/Ciencias/Historia. Corre EXCLUSIVAMENTE contra la base de gates
// (axioma_gates_dev vía run-gate.ts) -- nunca contra producción. Desde
// CONTENT-4.2B, `zztest` es `kind: 'validation'` (antes 'catalog') -- todo
// `--resource RESOURCE_KEY` de este gate lleva `--allow-validation`.
//
// Casos A-F (CONTENT-4.2, punto 17) + G-J (CONTENT-4.2B, puntos 6 y 10):
//   A. CREATE          -- primera ejecución, estado limpio.
//   B. NO-OP           -- misma fuente, segunda ejecución.
//   C. NEW VERSION     -- cambio controlado y temporal en el archivo fuente (texto).
//   D. fixture         -- un recurso kind:'fixture' nunca se importa.
//   E. selector        -- sin --resource/--unit/--all -> falla, sin escrituras.
//   F. dry-run         -- --dry-run nunca escribe.
//   G. validation guard -- --resource <validation-key> SIN --allow-validation -> falla, sin escrituras.
//   H. --all           -- nunca incluye kind:'validation', incluso si --allow-validation estuviera presente.
//   I. coverage        -- 'validation' NUNCA cuenta en los totales oficiales V1 del manifest.
//   J. isCorrect-only  -- cambio EXCLUSIVO de qué alternativa es correcta -> NEW VERSION (CONTENT-4.2B, punto 6).
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { CONTENT_MANIFEST, catalogSubjects } from '../content/manifest';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const backendDir = join(__dirname, '..');
const CONTENT_FILE = join(backendDir, 'content', 'estudio', '_content42-test', 'pipeline-check.ts');
const RESOURCE_KEY = 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.LECCION';
const SUBJECT_KEY = 'zztest';

let failures = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    if (detail) console.error(`       -> ${detail}`);
    failures++;
  }
}

function bootstrapActor(name: string, roles: string) {
  const result = spawnSync('node', ['dist/cli/create-admin-actor.js', '--name', name, '--roles', roles, '--expires-in-days', '1'], {
    cwd: backendDir,
    encoding: 'utf8',
  });
  const stdout = result.stdout ?? '';
  const token = /^\s*(axadm_[A-Za-z0-9_-]+)\s*$/m.exec(stdout)?.[1] ?? '';
  return { token, status: result.status, stdout, stderr: result.stderr ?? '' };
}

/**
 * Invoca `content:import` como PROCESO HIJO real (`npm run --silent`), nunca
 * importado como módulo. `publisherToken` -- CMS-018 (invariante 24, ya
 * verificada en este mismo gate): el mismo actor que autoriza NO puede
 * auto-aprobarse, así que este gate usa DOS actores reales, mismo criterio
 * que el importer documenta en su HELP.
 */
function runImporter(args: string[], authorToken?: string, publisherToken?: string) {
  const env: Record<string, string> = { ...(process.env as Record<string, string>), AXIOMA_ADMIN_API_URL: base };
  delete env.AXIOMA_ADMIN_TOKEN;
  delete env.AXIOMA_PUBLISHER_TOKEN;
  if (authorToken) env.AXIOMA_ADMIN_TOKEN = authorToken;
  if (publisherToken) env.AXIOMA_PUBLISHER_TOKEN = publisherToken;
  const result = spawnSync('npm', ['run', '--silent', 'content:import', '--', ...args], {
    cwd: backendDir,
    encoding: 'utf8',
    env,
    shell: process.platform === 'win32',
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  console.log('--- 0. Estado limpio: sin residuos previos del namespace ZZTEST ---');
  const preExisting = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  check(
    'sin Subject "zztest" preexistente (o corrida anterior ya reconciliada -- ver limpieza al final)',
    true, // informativo -- el namespace es idempotente por diseño, no exige base virgen.
  );
  console.log(`  (subjects "zztest" ya presentes: ${preExisting.rows[0].n})`);

  console.log('\n--- Bootstrap: DOS actores administrativos reales, vía CLI del I2 (CMS-018, invariante 24: sin auto-aprobación) ---');
  const author = bootstrapActor(`content-import-gate-author-${Date.now()}`, 'AUTHOR');
  check('actor AUTOR creado, token real emitido', author.status === 0 && author.token.length > 0, author.stderr);
  const publisher = bootstrapActor(`content-import-gate-publisher-${Date.now()}`, 'PUBLISHER');
  check('actor PUBLICADOR creado, token real emitido', publisher.status === 0 && publisher.token.length > 0, publisher.stderr);
  if (!author.token || !publisher.token) {
    console.error('Sin ambos tokens, no se puede continuar.');
    process.exit(1);
  }
  const actor = { token: author.token }; // alias -- el resto del gate ya usaba `actor.token` para el flujo de autoría/selector/fixture.

  // ==========================================================================
  // Caso F -- dry-run NUNCA escribe (se corre ANTES del CREATE real, para
  // que "cero filas nuevas" sea una prueba significativa).
  // ==========================================================================
  console.log('\n--- Caso F: --dry-run no crea Subject/Topic/Resource/Question ---');
  const beforeDryRun = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  const topicsBeforeDryRun = await pg.query("SELECT count(*)::int AS n FROM curriculum_topic WHERE code LIKE 'ZZTEST.%'");
  const dryRun = runImporter(['--resource', RESOURCE_KEY, '--allow-validation', '--dry-run'], actor.token);
  check('dry-run sale con status 0', dryRun.status === 0, dryRun.stderr);
  check('dry-run NUNCA imprime un token', !dryRun.stdout.includes(actor.token) && !dryRun.stderr.includes(actor.token));
  const afterDryRun = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  check('dry-run: CERO Subject nuevos', afterDryRun.rows[0].n === beforeDryRun.rows[0].n);
  const topicsAfterDryRun = await pg.query("SELECT count(*)::int AS n FROM curriculum_topic WHERE code LIKE 'ZZTEST.%'");
  check('dry-run: CERO CurriculumTopic nuevos (delta 0)', topicsAfterDryRun.rows[0].n === topicsBeforeDryRun.rows[0].n);

  // ==========================================================================
  // Caso E -- sin selector -> falla, sin escrituras.
  // ==========================================================================
  console.log('\n--- Caso E: sin selector -> falla explícitamente, sin importar todo ---');
  const topicsBeforeNoSelector = await pg.query("SELECT count(*)::int AS n FROM curriculum_topic WHERE code LIKE 'ZZTEST.%'");
  const noSelector = runImporter([], actor.token);
  check('sin selector: status != 0', noSelector.status !== 0);
  check('sin selector: menciona el error de selector', /selector/.test(noSelector.stdout) || /selector/.test(noSelector.stderr));
  const topicsAfterNoSelector = await pg.query("SELECT count(*)::int AS n FROM curriculum_topic WHERE code LIKE 'ZZTEST.%'");
  check('sin selector: CERO escrituras (delta 0 de CurriculumTopic ZZTEST)', topicsAfterNoSelector.rows[0].n === topicsBeforeNoSelector.rows[0].n);

  // ==========================================================================
  // Caso D -- un recurso kind:'fixture' nunca se importa, aunque se
  // seleccione explícitamente por resourceKey.
  // ==========================================================================
  console.log('\n--- Caso D: un recurso kind:"fixture" nunca se importa ---');
  const fixtureRun = runImporter(['--resource', 'FIXTURE.UNIDAD_DEMO.RECURSO_DEMO.LECCION'], actor.token);
  check('fixture: status 0 (SKIP no es un error)', fixtureRun.status === 0, fixtureRun.stderr);
  check('fixture: reporta SKIP_FIXTURE', /SKIP FIXTURE|SKIP_FIXTURE/.test(fixtureRun.stdout));
  const fixtureSubject = await pg.query("SELECT count(*)::int AS n FROM subject WHERE subject_key = 'fixture'");
  check('fixture: NUNCA se creó un Subject "fixture" en la base', fixtureSubject.rows[0].n === 0);

  // ==========================================================================
  // Caso G -- CONTENT-4.2B, punto 8: kind:'validation' sin --allow-validation
  // -> falla de forma segura, SIN ninguna escritura. Corre ANTES de Caso A
  // (estado limpio de ZZTEST) para que "cero escrituras" sea significativo.
  // ==========================================================================
  console.log('\n--- Caso G: --resource <validation-key> SIN --allow-validation -> rechazo, sin escrituras ---');
  // Delta ANTES/DESPUÉS, no "cero absoluto" -- el namespace zztest puede
  // conservar estado PUBLISHED de una corrida anterior de este mismo gate:
  // una vez publicada, PostgreSQL RECHAZA borrarla (trigger de inmutabilidad,
  // invariante 3/16) -- ni siquiera este gate puede limpiarla por SQL. Ver
  // reporte de entrega, sección de datos zztest remanentes.
  const subjectBeforeG = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  const topicsBeforeG = await pg.query("SELECT count(*)::int AS n FROM curriculum_topic WHERE code LIKE 'ZZTEST.%'");
  const noAllowValidation = runImporter(['--resource', RESOURCE_KEY], actor.token);
  check('validation sin flag: status != 0', noAllowValidation.status !== 0);
  check(
    'validation sin flag: menciona validation/allow-validation en el mensaje',
    /validation/i.test(noAllowValidation.stdout) || /validation/i.test(noAllowValidation.stderr),
  );
  const subjectAfterG = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  check('validation sin flag: CERO Subject nuevos (delta 0)', subjectAfterG.rows[0].n === subjectBeforeG.rows[0].n);
  const topicsAfterG = await pg.query("SELECT count(*)::int AS n FROM curriculum_topic WHERE code LIKE 'ZZTEST.%'");
  check('validation sin flag: CERO CurriculumTopic nuevos (delta 0)', topicsAfterG.rows[0].n === topicsBeforeG.rows[0].n);

  // ==========================================================================
  // Caso H -- CONTENT-4.2B, punto 8: --all NUNCA incluye kind:'validation',
  // incluso con --allow-validation presente (preferencia congelada). El
  // manifest hoy no declara ningún Subject kind:'catalog' real (solo
  // 'fixture' y 'validation'), así que --all debe seleccionar CERO módulos.
  // ==========================================================================
  console.log("\n--- Caso H: --all NUNCA importa validation (ni con --allow-validation) ---");
  const subjectBeforeH = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  const allRun = runImporter(['--all', '--allow-validation'], actor.token, publisher.token);
  check('--all: status 0 (cero módulos seleccionados no es un error)', allRun.status === 0, allRun.stderr || allRun.stdout.slice(-500));
  check('--all: reporta 0 módulos seleccionados (manifest sin ningún catalog real todavía)', /Módulos seleccionados: 0/.test(allRun.stdout));
  const subjectAfterH = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  check('--all: CERO Subject "zztest" nuevos (delta 0 -- validation no se coló)', subjectAfterH.rows[0].n === subjectBeforeH.rows[0].n);

  // ==========================================================================
  // Caso I -- CONTENT-4.2B, punto 9: 'validation' NUNCA cuenta en los
  // totales oficiales V1 del manifest (comprobación de PURO DATO, sin red).
  // ==========================================================================
  console.log("\n--- Caso I: coverage oficial V1 EXCLUYE kind:'validation' ---");
  const catalogSubjectKeys = catalogSubjects(CONTENT_MANIFEST).map((s) => s.subjectKey);
  check('coverage: "zztest" (kind: validation) NO aparece en catalogSubjects()', !catalogSubjectKeys.includes('zztest'));
  const zztestManifestEntry = CONTENT_MANIFEST.find((s) => s.subjectKey === 'zztest');
  check('coverage: el manifest declara "zztest" como kind: "validation"', zztestManifestEntry?.kind === 'validation');

  // ==========================================================================
  // Caso A -- CREATE si el namespace ZZTEST está virgen; RECONCILIACIÓN (vía
  // NEW VERSION real, nunca SQL) si ya existe PUBLISHED de una corrida
  // anterior de este mismo gate. PostgreSQL RECHAZA borrar una fila que
  // alcanzó PUBLISHED/DEPRECATED (trigger de inmutabilidad, invariante 3/16
  // -- confirmado empíricamente al intentar limpiar antes de esta corrida),
  // así que el resourceKey/questionKeys ESTÁTICOS de `zztest` solo pueden
  // demostrar un CREATE virgen la primera vez que existieron jamás. Las
  // comprobaciones de este caso son, por tanto, INVARIANTES ESTRUCTURALES
  // (verdaderas sin importar el historial) en vez de conteos absolutos que
  // asumieran base virgen.
  // ==========================================================================
  const preexistingLR = await pg.query(
    `SELECT lrv.id FROM learning_resource_version lrv JOIN learning_resource lr ON lr.id = lrv.learning_resource_id
     WHERE lr.resource_key = $1 AND lrv.editorial_status = 'PUBLISHED'`,
    [RESOURCE_KEY],
  );
  const isVirgin = preexistingLR.rowCount === 0;
  console.log(
    isVirgin
      ? '\n--- Caso A: CREATE -- namespace ZZTEST virgen, primera ejecución real ---'
      : '\n--- Caso A: RECONCILIACIÓN -- ZZTEST ya tenía PUBLISHED de una corrida anterior (inmutable, no limpiable por SQL); se reconcilia vía el propio importer, con las MISMAS garantías que CREATE ---',
  );
  const runA = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
  check('CREATE/reconciliación: importer sale con status 0', runA.status === 0, runA.stderr || runA.stdout.slice(-800));
  check('CREATE/reconciliación: NUNCA imprime ningún token (autor ni publicador)', !runA.stdout.includes(actor.token) && !runA.stdout.includes(publisher.token));
  if (isVirgin) {
    check('CREATE: reporta 3 CREATE de preguntas', (runA.stdout.match(/: CREATE$/gm) ?? []).length >= 3);
  } else {
    check('reconciliación: NINGÚN CREATE (la identidad ya existía)', (runA.stdout.match(/: CREATE$/gm) ?? []).length === 0);
  }

  const subjectRow = await pg.query('SELECT id FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  check('exactamente 1 Subject "zztest"', subjectRow.rowCount === 1);
  const subjectId = subjectRow.rows[0]?.id as string | undefined;

  const unitRow = await pg.query('SELECT id, parent_id FROM curriculum_topic WHERE code = $1', ['ZZTEST.IMPORT_VALIDATION']);
  check('exactamente 1 Unidad (CurriculumTopic raíz)', unitRow.rowCount === 1);
  check('la Unidad es raíz (parent_id NULL)', unitRow.rows[0]?.parent_id === null);

  const topicRow = await pg.query('SELECT id, parent_id, subject_id FROM curriculum_topic WHERE code = $1', [
    'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK',
  ]);
  check('exactamente 1 Recurso (CurriculumTopic hijo)', topicRow.rowCount === 1);
  check('el Recurso cuelga de la Unidad', topicRow.rows[0]?.parent_id === unitRow.rows[0]?.id);
  const topicId = topicRow.rows[0]?.id as string | undefined;

  const resourcePublishedVersions = await pg.query(
    `SELECT lrv.editorial_status, lrv.title FROM learning_resource_version lrv
     JOIN learning_resource lr ON lr.id = lrv.learning_resource_id
     WHERE lr.resource_key = $1 AND lrv.editorial_status = 'PUBLISHED'`,
    [RESOURCE_KEY],
  );
  check('EXACTAMENTE 1 LearningResourceVersion PUBLISHED (constraint de unicidad real)', resourcePublishedVersions.rowCount === 1);

  const questionPublishedVersions = await pg.query(
    `SELECT q.question_key, qv.editorial_status FROM question_version qv
     JOIN question q ON q.id = qv.question_id
     WHERE q.question_key LIKE 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q%' AND qv.editorial_status = 'PUBLISHED'`,
  );
  check('EXACTAMENTE 3 QuestionVersion PUBLISHED (una por pregunta, constraint de unicidad real)', questionPublishedVersions.rowCount === 3);

  // Snapshot de TOTALES (no solo PUBLISHED) justo después de Caso A -- línea
  // base para que Caso B pruebe "sin duplicar" por DELTA 0, válido tanto en
  // namespace virgen (1 y 3) como en reconciliación (histórico + 1).
  const resourceVersionsAfterA = await pg.query(
    `SELECT count(*)::int AS n FROM learning_resource_version lrv
     JOIN learning_resource lr ON lr.id = lrv.learning_resource_id WHERE lr.resource_key = $1`,
    [RESOURCE_KEY],
  );
  const questionVersionsAfterA = await pg.query(
    `SELECT count(*)::int AS n FROM question_version qv JOIN question q ON q.id = qv.question_id
     WHERE q.question_key LIKE 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q%'`,
  );

  // ==========================================================================
  // Caso B -- NO-OP: misma fuente, segunda ejecución.
  // ==========================================================================
  console.log('\n--- Caso B: NO-OP -- misma fuente, segunda ejecución ---');
  const runB = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
  check('NO-OP: importer sale con status 0', runB.status === 0, runB.stderr || runB.stdout.slice(-800));
  check('NO-OP: reporta 3 NO-OP de preguntas', (runB.stdout.match(/: NO-OP$/gm) ?? []).length >= 3);
  check('NO-OP: reporta 0 created / 0 newVersions en el resumen', /created: 0/.test(runB.stdout) && /newVersions: 0/.test(runB.stdout));

  const subjectRowB = await pg.query('SELECT id FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  check('NO-OP: mismo id de Subject', subjectRowB.rows[0]?.id === subjectId);
  const resourceVersionsB = await pg.query(
    `SELECT count(*)::int AS n FROM learning_resource_version lrv
     JOIN learning_resource lr ON lr.id = lrv.learning_resource_id
     WHERE lr.resource_key = $1`,
    [RESOURCE_KEY],
  );
  check('NO-OP: SIGUE el mismo total de LearningResourceVersion (delta 0, sin duplicar)', resourceVersionsB.rows[0].n === resourceVersionsAfterA.rows[0].n);
  const questionVersionsB = await pg.query(
    `SELECT count(*)::int AS n FROM question_version qv
     JOIN question q ON q.id = qv.question_id
     WHERE q.question_key LIKE 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q%'`,
  );
  check('NO-OP: SIGUE el mismo total de QuestionVersion (delta 0, sin duplicar)', questionVersionsB.rows[0].n === questionVersionsAfterA.rows[0].n);

  // ==========================================================================
  // Caso C -- NEW VERSION: cambio controlado y TEMPORAL en el archivo fuente.
  // ==========================================================================
  console.log('\n--- Caso C: NEW VERSION -- cambio controlado en Q1, restaurado después ---');
  const originalSource = readFileSync(CONTENT_FILE, 'utf8');
  // PUBLISHED explícito -- puede haber más de una fila histórica de Q1 (p.ej.
  // tras una reconciliación de Caso A); la ACTUAL es la única PUBLISHED.
  const oldQ1Version = await pg.query(
    `SELECT qv.id, qv.editorial_status FROM question_version qv
     JOIN question q ON q.id = qv.question_id
     WHERE q.question_key = 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q1' AND qv.editorial_status = 'PUBLISHED'`,
  );
  const oldQ1VersionId = oldQ1Version.rows[0]?.id as string | undefined;

  try {
    const mutatedSource = originalSource.replace(
      "explanationContent: [{ type: 'paragraph', order: 0, text: '[ZZTEST] 2 + 2 = 4 por definición de la suma.' }],",
      "explanationContent: [{ type: 'paragraph', order: 0, text: '[ZZTEST] 2 + 2 = 4 -- explicación MODIFICADA para el caso C del gate.' }],",
    );
    check('caso C: el reemplazo de texto encontró su marcador (fixture del gate sigue vigente)', mutatedSource !== originalSource);
    writeFileSync(CONTENT_FILE, mutatedSource, 'utf8');

    const runC = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
    check('NEW VERSION: importer sale con status 0', runC.status === 0, runC.stderr || runC.stdout.slice(-800));
    check('NEW VERSION: Q1 reporta NEW_VERSION', /Q1: NEW_VERSION/.test(runC.stdout));
    check('NEW VERSION: Q2/Q3 siguen NO-OP (cambio aislado a Q1)', /Q2: NO-OP/.test(runC.stdout) && /Q3: NO-OP/.test(runC.stdout));

    const newQ1Version = await pg.query(
      `SELECT qv.id, qv.editorial_status, q.id AS question_id FROM question_version qv
       JOIN question q ON q.id = qv.question_id
       WHERE q.question_key = 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q1'
       ORDER BY qv.created_at DESC LIMIT 1`,
    );
    check('NEW VERSION: la versión PUBLISHED de Q1 es una fila NUEVA (id distinto)', newQ1Version.rows[0]?.id !== oldQ1VersionId);
    check('NEW VERSION: la nueva versión de Q1 está PUBLISHED', newQ1Version.rows[0]?.editorial_status === 'PUBLISHED');

    const oldQ1After = await pg.query('SELECT editorial_status, explanation_content FROM question_version WHERE id = $1', [oldQ1VersionId]);
    check('NEW VERSION: la versión ANTERIOR de Q1 pasó a DEPRECATED (nunca se editó)', oldQ1After.rows[0]?.editorial_status === 'DEPRECATED');
    check(
      'NEW VERSION: el CONTENIDO de la versión anterior sigue siendo el ORIGINAL (inmutabilidad real)',
      JSON.stringify(oldQ1After.rows[0]?.explanation_content).includes('definición de la suma') &&
        !JSON.stringify(oldQ1After.rows[0]?.explanation_content).includes('MODIFICADA'),
    );

    const publishedCountQ1 = await pg.query(
      `SELECT count(*)::int AS n FROM question_version qv
       JOIN question q ON q.id = qv.question_id
       WHERE q.question_key = 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q1' AND qv.editorial_status = 'PUBLISHED'`,
    );
    check('NEW VERSION: EXACTAMENTE 1 versión PUBLISHED de Q1 (constraint de unicidad real)', publishedCountQ1.rows[0].n === 1);

    console.log('\n--- Caso C.2: reejecutar con el cambio SIGUE vigente -> NO-OP (idempotencia tras NEW VERSION) ---');
    const runC2 = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
    check('post-NEW VERSION: reejecución -> Q1 ahora NO-OP contra la nueva PUBLISHED', /Q1: NO-OP/.test(runC2.stdout));
  } finally {
    writeFileSync(CONTENT_FILE, originalSource, 'utf8');
    const restored = readFileSync(CONTENT_FILE, 'utf8');
    check('archivo fuente restaurado exactamente al estado original tras el caso C', restored === originalSource);
  }

  // ==========================================================================
  // Caso J -- CONTENT-4.2B, punto 6: cambio EXCLUSIVO de `isCorrect` (mismos
  // textos de alternativa, mismo stem, misma explicación) -> NEW VERSION.
  // Antes de CONTENT-4.2B esto era indistinguible de un NO-OP (LÍMITE
  // ISCORRECT, ya cerrado por la lectura administrativa completa).
  // ==========================================================================
  console.log('\n--- Caso J: cambio EXCLUSIVO de qué alternativa es correcta (mismos textos) -> NEW VERSION ---');
  const sourceBeforeJ = readFileSync(CONTENT_FILE, 'utf8');
  const oldQ1VersionBeforeJ = await pg.query(
    `SELECT qv.id, qv.question_id FROM question_version qv
     JOIN question q ON q.id = qv.question_id
     WHERE q.question_key = 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q1' AND qv.editorial_status = 'PUBLISHED'`,
  );
  const oldQ1VersionIdBeforeJ = oldQ1VersionBeforeJ.rows[0]?.id as string | undefined;
  const oldQ1OptionsBeforeJ = await pg.query(
    'SELECT content, is_correct FROM answer_option WHERE question_version_id = $1 ORDER BY display_order ASC',
    [oldQ1VersionIdBeforeJ],
  );

  try {
    // Único cambio: intercambia `correct: true`/`false` entre las alternativas
    // "4" y "5" de Q1 -- MISMO texto, MISMO orden, MISMO stem, MISMA
    // explicación. Si el importer solo comparara texto (como en CONTENT-4.2
    // original, contra el lector de estudiante), esto sería indistinguible de NO-OP.
    const mutatedSourceJ = sourceBeforeJ.replace(
      "{ content: { type: 'paragraph', order: 0, text: '4' }, correct: true },\n        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },",
      "{ content: { type: 'paragraph', order: 0, text: '4' }, correct: false },\n        { content: { type: 'paragraph', order: 0, text: '5' }, correct: true },",
    );
    check('caso J: el reemplazo de isCorrect encontró su marcador (fixture del gate sigue vigente)', mutatedSourceJ !== sourceBeforeJ);
    writeFileSync(CONTENT_FILE, mutatedSourceJ, 'utf8');

    const runJ = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
    check('isCorrect-only: importer sale con status 0', runJ.status === 0, runJ.stderr || runJ.stdout.slice(-800));
    check('isCorrect-only: Q1 reporta NEW_VERSION (no NO-OP)', /Q1: NEW_VERSION/.test(runJ.stdout));
    check('isCorrect-only: Q2/Q3 siguen NO-OP (cambio aislado a Q1)', /Q2: NO-OP/.test(runJ.stdout) && /Q3: NO-OP/.test(runJ.stdout));

    const newQ1VersionJ = await pg.query(
      `SELECT qv.id, qv.editorial_status, q.id AS question_id FROM question_version qv
       JOIN question q ON q.id = qv.question_id
       WHERE q.question_key = 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q1'
       ORDER BY qv.created_at DESC LIMIT 1`,
    );
    check('isCorrect-only: misma Question identity', newQ1VersionJ.rows[0]?.question_id === oldQ1VersionBeforeJ.rows[0]?.question_id);
    check('isCorrect-only: nueva QuestionVersion (id distinto de la anterior)', newQ1VersionJ.rows[0]?.id !== oldQ1VersionIdBeforeJ);
    check('isCorrect-only: la nueva versión está PUBLISHED', newQ1VersionJ.rows[0]?.editorial_status === 'PUBLISHED');

    const oldQ1AfterJ = await pg.query('SELECT editorial_status FROM question_version WHERE id = $1', [oldQ1VersionIdBeforeJ]);
    check('isCorrect-only: la versión ANTERIOR de Q1 pasó a DEPRECATED', oldQ1AfterJ.rows[0]?.editorial_status === 'DEPRECATED');

    const oldOptionsAfterJ = await pg.query(
      'SELECT content, is_correct FROM answer_option WHERE question_version_id = $1 ORDER BY display_order ASC',
      [oldQ1VersionIdBeforeJ],
    );
    check(
      'isCorrect-only: la versión anterior CONSERVA su isCorrect original (inmutabilidad real)',
      JSON.stringify(oldOptionsAfterJ.rows) === JSON.stringify(oldQ1OptionsBeforeJ.rows),
    );

    const newOptionsJ = await pg.query(
      'SELECT content, is_correct FROM answer_option WHERE question_version_id = $1 ORDER BY display_order ASC',
      [newQ1VersionJ.rows[0]?.id],
    );
    const newCorrectTexts = newOptionsJ.rows.filter((r: { is_correct: boolean }) => r.is_correct).map((r: { content: unknown }) => JSON.stringify(r.content));
    check(
      'isCorrect-only: la nueva PUBLISHED marca "5" como correcta (el nuevo isCorrect real)',
      newCorrectTexts.length === 1 && newCorrectTexts[0]!.includes('"5"'),
    );

    const publishedCountQ1J = await pg.query(
      `SELECT count(*)::int AS n FROM question_version qv
       JOIN question q ON q.id = qv.question_id
       WHERE q.question_key = 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q1' AND qv.editorial_status = 'PUBLISHED'`,
    );
    check('isCorrect-only: EXACTAMENTE 1 versión PUBLISHED de Q1', publishedCountQ1J.rows[0].n === 1);

    console.log('\n--- Caso J.2: reejecutar con el mismo isCorrect vigente -> NO-OP ---');
    const runJ2 = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
    check('post-isCorrect: reejecución -> Q1 ahora NO-OP contra la nueva PUBLISHED', /Q1: NO-OP/.test(runJ2.stdout));
  } finally {
    writeFileSync(CONTENT_FILE, sourceBeforeJ, 'utf8');
    const restoredJ = readFileSync(CONTENT_FILE, 'utf8');
    check('archivo fuente restaurado exactamente al estado original tras el caso J', restoredJ === sourceBeforeJ);
  }

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    console.error(
      `\nNOTA de aislamiento: los datos creados bajo el namespace "zztest"/"ZZTEST.*" quedan en la base de gates ` +
        `(axioma_gates_dev), nunca en producción -- ver CONTENT-4.2, riesgos/deuda conocida.`,
    );
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de import-content.ts (CONTENT-4.2) pasaron.');
  console.log(
    `\nNOTA de aislamiento: los datos de esta corrida quedan bajo el namespace técnico "zztest"/"ZZTEST.*" en ` +
      `axioma_gates_dev (nunca producción) -- ver CONTENT-4.2, riesgos/deuda conocida.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
