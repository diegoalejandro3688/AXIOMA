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
//   H. --all           -- selecciona EXACTAMENTE los módulos kind:'catalog' reales actuales
//                         (derivado dinámicamente del loader -- CONTENT-4.4A, ya no hardcodea "0"),
//                         y nunca incluye kind:'validation' ni kind:'fixture', incluso con --allow-validation.
//   I. coverage        -- 'validation' NUNCA cuenta en los totales oficiales V1 del manifest.
//   J. isCorrect-only  -- cambio EXCLUSIVO de qué alternativa es correcta -> NEW VERSION (CONTENT-4.2B, punto 6).
//   K. recuperación    -- CONTENT-4.6A: una identidad interrumpida a mitad de workflow (DRAFT/
//                         IN_REVIEW/APPROVED, nunca llegó a PUBLISHED) se reanuda con seguridad
//                         en el siguiente run, sin crear una identidad/versión duplicada; y un
//                         contenido huérfano que NO coincide con el source produce un conflicto
//                         explícito, nunca una publicación silenciosa.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { CONTENT_MANIFEST, catalogSubjects, findManifestResource } from '../content/manifest';
import { loadResourceModules } from '../content/load';

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

/**
 * Petición administrativa DIRECTA (sin pasar por el importer) -- SOLO para
 * el Caso K, que necesita fabricar deliberadamente una identidad "a mitad de
 * workflow" (DRAFT/IN_REVIEW/APPROVED) para poder probar que el importer la
 * recupera. Usa exclusivamente los mismos endpoints reales que el propio
 * importer ya usa (nunca SQL para escribir contenido editorial -- mismo
 * invariante del resto de este gate).
 */
async function adminHttp(token: string, method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'x-admin-token': token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    /* respuesta no-JSON */
  }
  return { status: response.status, body: parsed };
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
  // Caso K -- CONTENT-4.6A: recuperación segura de imports interrumpidos.
  //
  // Corre ANTES que cualquier otro caso (namespace ZZTEST todavía virgen o
  // reconciliado, ver Caso 0): fabrica DELIBERADAMENTE, vía los mismos
  // endpoints reales que usa el importer (NUNCA SQL), tres identidades de
  // Question a mitad de workflow -- una en DRAFT, una en IN_REVIEW, una en
  // APPROVED -- y una LearningResource en DRAFT, TODAS con contenido
  // IDÉNTICO al source real (`content/estudio/_content42-test/
  // pipeline-check.ts`, cargado con el MISMO loader que usa `import-content.ts`,
  // nunca duplicado a mano). Después corre el importer real UNA vez y
  // confirma que resume las 4 hasta PUBLISHED sin crear ninguna identidad ni
  // versión duplicada. Finalmente fabrica un 5to caso: una versión DRAFT
  // huérfana de Q1 cuyo contenido NO coincide con el source, y confirma que
  // el importer la rechaza con un conflicto explícito, sin tocar la versión
  // PUBLISHED ya vigente.
  // ==========================================================================
  console.log('\n--- Caso K: recuperación segura de identidades interrumpidas a mitad de workflow ---');

  const { loaded: kLoaded } = await loadResourceModules(join(backendDir, 'content', 'estudio'));
  const kEntry = kLoaded.find((e) => e.module.resourceKey === RESOURCE_KEY);
  check('Caso K, precondición: el módulo fuente de ZZTEST carga correctamente', kEntry !== undefined);
  if (!kEntry) {
    console.error('Sin el módulo fuente no se puede fabricar el escenario de recuperación -- abortando Caso K.');
    process.exit(1);
  }
  const kModule = kEntry.module;
  const kManifestEntry = findManifestResource(CONTENT_MANIFEST, kModule.topicCode);
  check('Caso K, precondición: el recurso existe en el manifest', kManifestEntry !== null);
  if (!kManifestEntry) {
    console.error('Sin entrada de manifest no se puede resolver la taxonomía -- abortando Caso K.');
    process.exit(1);
  }

  // --- Taxonomía real (idempotente, mismos endpoints que usa el importer) ---
  const kSubjectRes = await adminHttp(actor.token, 'POST', '/administration/editorial/subjects', {
    subjectKey: kManifestEntry.subject.subjectKey,
    name: kManifestEntry.subject.name,
    shortName: kManifestEntry.subject.shortName,
    displayOrder: kManifestEntry.subject.displayOrder,
  });
  const kSubjectId = (kSubjectRes.body as { id: string }).id;
  const kUnitRes = await adminHttp(actor.token, 'POST', '/administration/editorial/curriculum-topics', {
    code: kModule.unitCode,
    name: kManifestEntry.unit.name,
    order: kManifestEntry.unit.order,
    subjectId: kSubjectId,
    parentId: null,
  });
  const kUnitId = (kUnitRes.body as { id: string }).id;
  const kTopicRes = await adminHttp(actor.token, 'POST', '/administration/editorial/curriculum-topics', {
    code: kModule.topicCode,
    name: kModule.title,
    order: kModule.order,
    subjectId: kSubjectId,
    parentId: kUnitId,
  });
  const kTopicId = (kTopicRes.body as { id: string }).id;
  check('Caso K: taxonomía real resuelta (subject/unit/topic)', Boolean(kSubjectId && kUnitId && kTopicId));

  const kAnswerOptions = (q: (typeof kModule.questions)[number]) => q.options.map((o) => ({ content: o.content, isCorrect: o.correct }));
  // Declaradas aquí (no dentro del bloque `if (kNamespaceVirgin)` de abajo)
  // porque Caso K5, al final del archivo, las necesita SIEMPRE -- independiente
  // de si el namespace era virgen al arrancar esta corrida.
  const kQ1 = kModule.questions[0]!;
  const kQ2 = kModule.questions[1]!;
  const kQ3 = kModule.questions[2]!;

  // La fabricación K1-K4 (crear identities DESDE CERO en DRAFT/IN_REVIEW/
  // APPROVED) solo es posible con el namespace VIRGEN: los endpoints de
  // autoría (T1) son CREATE puro, sin semántica idempotente -- un segundo
  // intento de crear `RESOURCE_KEY` ya PUBLISHED (de una corrida anterior de
  // ESTE MISMO gate, en la misma base de gates) devolvería 409 antes de
  // poder fabricar nada. En una corrida repetida, este bloque se salta
  // (informativo, no es un FALLO) y el resto del gate sigue probando
  // recuperación real vía Caso K5 más abajo, que sí es independiente del
  // estado de arranque.
  const kLrAlreadyPublished = await pg.query(
    `SELECT 1 FROM learning_resource lr JOIN learning_resource_version lrv ON lrv.learning_resource_id = lr.id WHERE lr.resource_key = $1 AND lrv.editorial_status = 'PUBLISHED'`,
    [kModule.resourceKey],
  );
  const kNamespaceVirgin = kLrAlreadyPublished.rowCount === 0;

  if (!kNamespaceVirgin) {
    console.log(
      '  (namespace ZZTEST ya tiene PUBLISHED de una corrida anterior de este gate -- se omite la fabricación K1-K4; ' +
        'Caso K5 más abajo sigue probando recuperación de forma independiente)',
    );
  }

  if (kNamespaceVirgin) {
  // --- K1: LearningResource en DRAFT (identity creada, NUNCA transicionada) ---
  const kLrCreate = await adminHttp(actor.token, 'POST', '/administration/editorial/learning-resources', {
    resourceKey: kModule.resourceKey,
    primarySubjectId: kSubjectId,
    resourceType: kModule.resourceType,
    curriculumTopicId: kTopicId,
    title: kModule.title,
    contentBlocks: kModule.contentBlocks,
  });
  check('Caso K1 (setup): LearningResource creado en DRAFT', kLrCreate.status >= 200 && kLrCreate.status < 300, JSON.stringify(kLrCreate.body));
  const kLrVersionIdBefore = (kLrCreate.body as { versionId: string }).versionId;

  // --- K2: Q1 en DRAFT (identity creada, NUNCA transicionada) ---
  const kQ1Create = await adminHttp(actor.token, 'POST', '/administration/editorial/questions', {
    questionKey: kQ1.questionKey,
    primarySubjectId: kSubjectId,
    curriculumTopicId: kTopicId,
    stemContent: kQ1.stemContent,
    explanationContent: kQ1.explanationContent,
    answerOptions: kAnswerOptions(kQ1),
  });
  check('Caso K2 (setup): Q1 creado en DRAFT', kQ1Create.status >= 200 && kQ1Create.status < 300, JSON.stringify(kQ1Create.body));
  const kQ1VersionIdBefore = (kQ1Create.body as { versionId: string }).versionId;

  // --- K3: Q2 en IN_REVIEW (T3 con AUTHOR, nunca T5/T7) ---
  const kQ2Create = await adminHttp(actor.token, 'POST', '/administration/editorial/questions', {
    questionKey: kQ2.questionKey,
    primarySubjectId: kSubjectId,
    curriculumTopicId: kTopicId,
    stemContent: kQ2.stemContent,
    explanationContent: kQ2.explanationContent,
    answerOptions: kAnswerOptions(kQ2),
  });
  const kQ2VersionIdBefore = (kQ2Create.body as { versionId: string }).versionId;
  const kQ2ToInReview = await adminHttp(actor.token, 'POST', `/administration/editorial/question-versions/${kQ2VersionIdBefore}/transitions`, {
    targetStatus: 'IN_REVIEW',
  });
  check(
    'Caso K3 (setup): Q2 creado y avanzado a IN_REVIEW (T3), nunca más allá',
    kQ2Create.status >= 200 && kQ2Create.status < 300 && kQ2ToInReview.status >= 200 && kQ2ToInReview.status < 300,
    JSON.stringify({ create: kQ2Create.body, transition: kQ2ToInReview.body }),
  );

  // --- K4: Q3 en APPROVED (T3 con AUTHOR + T5 con PUBLISHER, nunca T7) ---
  const kQ3Create = await adminHttp(actor.token, 'POST', '/administration/editorial/questions', {
    questionKey: kQ3.questionKey,
    primarySubjectId: kSubjectId,
    curriculumTopicId: kTopicId,
    stemContent: kQ3.stemContent,
    explanationContent: kQ3.explanationContent,
    answerOptions: kAnswerOptions(kQ3),
  });
  const kQ3VersionIdBefore = (kQ3Create.body as { versionId: string }).versionId;
  const kQ3ToInReview = await adminHttp(actor.token, 'POST', `/administration/editorial/question-versions/${kQ3VersionIdBefore}/transitions`, {
    targetStatus: 'IN_REVIEW',
  });
  const kQ3ToApproved = await adminHttp(publisher.token, 'POST', `/administration/editorial/question-versions/${kQ3VersionIdBefore}/transitions`, {
    targetStatus: 'APPROVED',
  });
  check(
    'Caso K4 (setup): Q3 creado y avanzado a APPROVED (T3+T5), nunca más allá',
    kQ3Create.status >= 200 && kQ3ToInReview.status >= 200 && kQ3ToInReview.status < 300 && kQ3ToApproved.status >= 200 && kQ3ToApproved.status < 300,
    JSON.stringify({ create: kQ3Create.body, t3: kQ3ToInReview.body, t5: kQ3ToApproved.body }),
  );

  // --- Corrida real del importer: debe RESUMIR las 4 identidades huérfanas ---
  const kRun1 = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
  check('Caso K (recuperación): importer sale con status 0', kRun1.status === 0, kRun1.stderr || kRun1.stdout.slice(-1000));
  check('Caso K (recuperación): LearningResource reporta RESUMED', /action: RESUMED/.test(kRun1.stdout));
  check(`Caso K (recuperación): ${kQ1.questionKey} reporta RESUMED (recuperado desde DRAFT)`, new RegExp(`${kQ1.questionKey}: RESUMED`).test(kRun1.stdout));
  check(`Caso K (recuperación): ${kQ2.questionKey} reporta RESUMED (recuperado desde IN_REVIEW)`, new RegExp(`${kQ2.questionKey}: RESUMED`).test(kRun1.stdout));
  check(`Caso K (recuperación): ${kQ3.questionKey} reporta RESUMED (recuperado desde APPROVED)`, new RegExp(`${kQ3.questionKey}: RESUMED`).test(kRun1.stdout));

  const kLrAfter = await pg.query(
    `SELECT lrv.id, lrv.editorial_status FROM learning_resource_version lrv JOIN learning_resource lr ON lr.id = lrv.learning_resource_id WHERE lr.resource_key = $1`,
    [kModule.resourceKey],
  );
  check('Caso K: la LearningResourceVersion recuperada es la MISMA fila (mismo id, sin duplicar)', kLrAfter.rows.length === 1 && kLrAfter.rows[0].id === kLrVersionIdBefore);
  check('Caso K: esa versión terminó PUBLISHED', kLrAfter.rows[0]?.editorial_status === 'PUBLISHED');

  for (const [q, versionIdBefore] of [
    [kQ1, kQ1VersionIdBefore],
    [kQ2, kQ2VersionIdBefore],
    [kQ3, kQ3VersionIdBefore],
  ] as const) {
    const qAfter = await pg.query(
      `SELECT qv.id, qv.editorial_status FROM question_version qv JOIN question q ON q.id = qv.question_id WHERE q.question_key = $1`,
      [q.questionKey],
    );
    check(`Caso K: ${q.questionKey} sigue teniendo EXACTAMENTE 1 versión (la misma, sin duplicar)`, qAfter.rows.length === 1 && qAfter.rows[0].id === versionIdBefore);
    check(`Caso K: ${q.questionKey} terminó PUBLISHED`, qAfter.rows[0]?.editorial_status === 'PUBLISHED');
  }

  // --- Reejecución: ahora todo está PUBLISHED -> debe ser NO-OP total ---
  const kRun2 = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
  check('Caso K.2 (post-recuperación): reejecución sale con status 0', kRun2.status === 0, kRun2.stderr);
  check('Caso K.2: LearningResource ahora NO-OP', /action: NO-OP/.test(kRun2.stdout));
  check(`Caso K.2: ${kQ1.questionKey} ahora NO-OP`, new RegExp(`${kQ1.questionKey}: NO-OP`).test(kRun2.stdout));
  check(`Caso K.2: ${kQ2.questionKey} ahora NO-OP`, new RegExp(`${kQ2.questionKey}: NO-OP`).test(kRun2.stdout));
  check(`Caso K.2: ${kQ3.questionKey} ahora NO-OP`, new RegExp(`${kQ3.questionKey}: NO-OP`).test(kRun2.stdout));
  } // fin del bloque condicionado a kNamespaceVirgin

  // Caso K5 (contenido huérfano DISTINTO del source -> conflicto) se ejecuta
  // al FINAL de este archivo, después de todos los demás casos: fabrica una
  // segunda versión DRAFT de Q1 con contenido que NO coincide con el source,
  // y esa fila queda deliberadamente en la base al terminar el gate (nunca
  // se toca por SQL, ver invariante del archivo) -- si corriera aquí,
  // contaminaría la comparación canónica de Q1 para TODOS los casos A-J que
  // vienen después (el importer siempre compara contra la versión MÁS
  // RECIENTE, y esa fila sería más reciente que la original).

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
  // Caso H -- CONTENT-4.2B punto 8 + CONTENT-4.4A (mantenimiento).
  //
  // ORIGEN DEL AJUSTE: este caso se escribió cuando el manifest NO declaraba
  // ningún Subject kind:'catalog' real -- en ese momento, "--all selecciona
  // CERO módulos" era la única forma observable de comprobar la exclusión de
  // validation/fixture. Desde CONTENT-4.3, `M1.NUMEROS` (3 recursos
  // kind:'catalog') es contenido real: --all ahora SÍ selecciona esos 3
  // módulos -- ese es el comportamiento CORRECTO del importer (§CONTENT-4.2B
  // punto 8: "--all = únicamente catalog"), no una regresión. La aserción
  // "0 módulos" quedó obsoleta por el propio éxito de CONTENT-4.3/4.4, no
  // por ningún cambio en este incremento.
  //
  // DISEÑO NUEVO (no hardcodea el conteo): se cargan los módulos reales con
  // el MISMO loader que usa `import-content.ts` (`content/load.ts`,
  // extracción de CONTENT-4.2) y se deriva el conjunto de `resourceKey`
  // esperado filtrando `kind === 'catalog'` -- exactamente el mismo criterio
  // que `selectEntries('--all', ...)` aplica dentro del importer. La
  // comparación es un IGUAL DE CONJUNTOS contra lo que `--all --dry-run`
  // reportó seleccionar, así que el gate sigue siendo válido sin tocarlo
  // cuando se agreguen M1 Álgebra y Funciones, Geometría, Probabilidad y
  // Estadística u otras materias -- el número esperado crece solo con el
  // contenido real, nunca con una constante en este archivo.
  //
  // `--dry-run`: Caso H verifica SELECCIÓN, no escritura (eso ya lo cubren
  // los Casos A-D/F) -- correr en dry-run evita sembrar el catálogo M1.NUMEROS
  // real dentro de `axioma_gates_dev` en cada ejecución del gate, sin perder
  // fuerza de verificación (el header `=== CONTENT IMPORT: <resourceKey> ===`
  // se imprime igual en dry-run, por cada módulo seleccionado).
  // ==========================================================================
  console.log("\n--- Caso H: --all selecciona EXACTAMENTE el catálogo real (catalog) y excluye validation/fixture ---");

  // `content/ensayo/**` es un dominio separado (ADR-0024), no se recorre aquí.
  const { loaded: allLoadedForH } = await loadResourceModules(join(backendDir, 'content', 'estudio'));
  const expectedCatalogKeys = allLoadedForH
    .filter((e) => e.module.kind === 'catalog')
    .map((e) => e.module.resourceKey)
    .sort();
  const validationKeysForH = allLoadedForH.filter((e) => e.module.kind === 'validation').map((e) => e.module.resourceKey);
  const fixtureKeysForH = allLoadedForH.filter((e) => e.module.kind === 'fixture').map((e) => e.module.resourceKey);
  check(
    'Caso H, precondición: el content fuente declara al menos un módulo catalog real (M1.NUMEROS) -- si esto falla, el caso no es significativo',
    expectedCatalogKeys.length > 0,
    'expectedCatalogKeys vacío',
  );

  const subjectBeforeH = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  const topicsBeforeH = await pg.query("SELECT count(*)::int AS n FROM curriculum_topic WHERE code LIKE 'M1.NUMEROS%'");
  const allRun = runImporter(['--all', '--allow-validation', '--dry-run'], actor.token);
  check('--all --dry-run: status 0', allRun.status === 0, allRun.stderr || allRun.stdout.slice(-500));
  check('--all --dry-run: NUNCA imprime un token', !allRun.stdout.includes(actor.token) && !allRun.stderr.includes(actor.token));

  const selectedKeys = [...allRun.stdout.matchAll(/=== CONTENT IMPORT: (\S+) /g)].map((m) => m[1]).sort();
  check(
    `--all: selecciona EXACTAMENTE los ${expectedCatalogKeys.length} módulo(s) catalog reales actuales, ni más ni menos`,
    JSON.stringify(selectedKeys) === JSON.stringify(expectedCatalogKeys),
    `esperado=[${expectedCatalogKeys.join(', ')}] obtenido=[${selectedKeys.join(', ')}]`,
  );
  check(
    '--all: incluye los 3 recursos catalog de M1.NUMEROS (regresión específica, CONTENT-4.4A punto 8.1)',
    ['M1.NUMEROS.ENTEROS_RACIONALES.LECCION', 'M1.NUMEROS.PORCENTAJE.LECCION', 'M1.NUMEROS.POTENCIAS_RAICES.LECCION'].every((k) =>
      selectedKeys.includes(k),
    ),
  );
  check(
    '--all: NINGÚN módulo kind:"validation" (ej. ZZTEST.*) aparece seleccionado (CONTENT-4.4A punto 8.2)',
    validationKeysForH.every((k) => !selectedKeys.includes(k)),
  );
  check(
    '--all: NINGÚN módulo kind:"fixture" aparece seleccionado (CONTENT-4.4A punto 8.3)',
    fixtureKeysForH.every((k) => !selectedKeys.includes(k)),
  );

  const subjectAfterH = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [SUBJECT_KEY]);
  check('--all --dry-run: CERO Subject "zztest" nuevos (delta 0 -- validation no se coló, ni siquiera vía escritura)', subjectAfterH.rows[0].n === subjectBeforeH.rows[0].n);
  const topicsAfterH = await pg.query("SELECT count(*)::int AS n FROM curriculum_topic WHERE code LIKE 'M1.NUMEROS%'");
  check(
    '--all --dry-run: CERO CurriculumTopic M1.NUMEROS nuevos (dry-run real, no siembra el catálogo real en axioma_gates_dev)',
    topicsAfterH.rows[0].n === topicsBeforeH.rows[0].n,
  );

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

  // ==========================================================================
  // Caso K5 -- CONTENT-4.6A: contenido huérfano que NO coincide con el
  // source: DEBE rechazarse con un conflicto explícito, NUNCA publicarse
  // silenciosamente, NUNCA tocar la versión PUBLISHED ya vigente de la misma
  // identidad. Corre AL FINAL (después de A-J) a propósito -- ver nota junto
  // a Caso K.2: la fila DRAFT que fabrica quedaría "más reciente" que
  // cualquier versión PUBLISHED de Q1 y rompería la comparación canónica de
  // los casos que siguen si corriera antes.
  // ==========================================================================
  console.log('\n--- Caso K5: versión huérfana con contenido DISTINTO del source -> conflicto, sin mutación destructiva ---');
  const kQ1IdentityRow = await pg.query('SELECT id FROM question WHERE question_key = $1', [kQ1.questionKey]);
  const kQ1IdentityId = kQ1IdentityRow.rows[0].id as string;
  // La versión PUBLISHED ACTUAL de Q1 a esta altura -- NO necesariamente
  // `kQ1VersionIdBefore` (el Caso C y el Caso J, ejecutados entre medio, ya
  // la reemplazaron cada uno por una NEW_VERSION legítima). Se resuelve
  // fresca, por lectura, nunca asumida.
  const kQ1PublishedNow = await pg.query(
    `SELECT qv.id FROM question_version qv JOIN question q ON q.id = qv.question_id WHERE q.question_key = $1 AND qv.editorial_status = 'PUBLISHED'`,
    [kQ1.questionKey],
  );
  const kQ1PublishedIdBeforeMismatch = kQ1PublishedNow.rows[0].id as string;
  const kMismatchStem = [{ type: 'paragraph' as const, order: 0, text: `${(kQ1.stemContent[0] as { text: string }).text} [CONTENT-4.6A MISMATCH TEST]` }];
  const kMismatchVersion = await adminHttp(actor.token, 'POST', `/administration/editorial/questions/${kQ1IdentityId}/versions`, {
    curriculumTopicId: kTopicId,
    stemContent: kMismatchStem,
    explanationContent: kQ1.explanationContent,
    answerOptions: kAnswerOptions(kQ1),
  });
  check('Caso K5 (setup): nueva versión DRAFT de Q1 creada con contenido DISTINTO del source', kMismatchVersion.status >= 200 && kMismatchVersion.status < 300, JSON.stringify(kMismatchVersion.body));
  const kMismatchVersionId = (kMismatchVersion.body as { versionId: string }).versionId;

  const kRun3 = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
  check('Caso K5: el importer NO sale con status 0 (conflicto explícito, no publicación silenciosa)', kRun3.status !== 0);
  check(`Caso K5: ${kQ1.questionKey} NO reporta NO-OP ni RESUMED (debe fallar, no resolverse solo)`, !new RegExp(`${kQ1.questionKey}: (NO-OP|RESUMED)`).test(kRun3.stdout));
  check(
    'Caso K5: Q2/Q3 siguen NO-OP (el conflicto de Q1 no contamina a las demás)',
    new RegExp(`${kQ2.questionKey}: NO-OP`).test(kRun3.stdout) && new RegExp(`${kQ3.questionKey}: NO-OP`).test(kRun3.stdout),
  );

  const kMismatchAfter = await pg.query('SELECT editorial_status FROM question_version WHERE id = $1', [kMismatchVersionId]);
  check('Caso K5: la versión huérfana mismatch sigue en DRAFT (no fue publicada ni tocada)', kMismatchAfter.rows[0]?.editorial_status === 'DRAFT');
  const kOriginalPublishedAfter = await pg.query('SELECT editorial_status, stem_content FROM question_version WHERE id = $1', [kQ1PublishedIdBeforeMismatch]);
  check('Caso K5: la versión PUBLISHED vigente de Q1 sigue PUBLISHED, sin tocar', kOriginalPublishedAfter.rows[0]?.editorial_status === 'PUBLISHED');
  check(
    'Caso K5: el CONTENIDO de la versión PUBLISHED vigente no cambió (sin mutación destructiva)',
    !JSON.stringify(kOriginalPublishedAfter.rows[0]?.stem_content).includes('MISMATCH TEST'),
  );
  const kQ1PublishedCount = await pg.query(
    `SELECT count(*)::int AS n FROM question_version qv JOIN question q ON q.id = qv.question_id WHERE q.question_key = $1 AND qv.editorial_status = 'PUBLISHED'`,
    [kQ1.questionKey],
  );
  check('Caso K5: sigue existiendo EXACTAMENTE 1 versión PUBLISHED de Q1 (la vigente, ninguna nueva)', kQ1PublishedCount.rows[0].n === 1);

  // --- Reconciliación final: corrige (T2, versión aún DRAFT) el contenido
  // de la fila mismatch para que vuelva a coincidir con el source, y deja
  // que el importer la RESUMA a PUBLISHED. Sin esto, la fila mismatch
  // quedaría como la versión MÁS RECIENTE de Q1 para siempre, y una FUTURA
  // corrida de este mismo gate fallaría en el Caso A de reconciliación
  // (encontraría Q1 en conflicto desde el primer momento). Usa solo
  // endpoints reales (T2 + el importer) -- ninguna escritura de contenido
  // editorial por SQL, mismo invariante del archivo.
  const kMismatchFix = await adminHttp(actor.token, 'PATCH', `/administration/editorial/question-versions/${kMismatchVersionId}`, {
    stemContent: kQ1.stemContent,
  });
  check('Caso K5 (reconciliación): la versión mismatch se corrige (T2) para volver a coincidir con el source', kMismatchFix.status >= 200 && kMismatchFix.status < 300, JSON.stringify(kMismatchFix.body));
  const kRun4 = runImporter(['--resource', RESOURCE_KEY, '--allow-validation'], actor.token, publisher.token);
  check('Caso K5 (reconciliación): tras corregir el contenido, el importer RESUME la versión y publica -- namespace queda sano para una futura corrida', kRun4.status === 0 && new RegExp(`${kQ1.questionKey}: RESUMED`).test(kRun4.stdout));

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
