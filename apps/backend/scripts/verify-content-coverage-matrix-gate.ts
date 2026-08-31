// Gate del LEF Bloque VII ("Plataforma Editorial"), Incremento 5 --
// "Content Coverage Matrix (solo lectura)".
// Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §12.5 (frontera), §13.5 (los cinco
// criterios de cierre, citados literalmente sobre cada bloque de este archivo),
// decisión E (§4) e invariante 14 (§7.1).
//
// Contra el BACKEND REAL ya levantado y contra PostgreSQL REAL (conexión
// directa `pg` para inspección), mismo patrón que los gates de I1..I4.
//
// CRITERIO DE FONDO: §13.5 punto 1 ("la matriz refleja el estado real de la
// base DESPUÉS DE PUBLICAR y DESPUÉS DE RETIRAR") solo es demostrable de forma
// DINÁMICA. Este gate no se conforma con comprobar que la ruta existe: publica
// y retira contenido REAL por la API de I3/I4, con actores administrativos
// reales y sus tokens reales, y comprueba que los conteos SE MUEVEN en la
// dirección correcta y en la magnitud exacta. Las comprobaciones estáticas
// (§13.5 punto 4) son un complemento, no la sustancia del gate.
//
// DISCIPLINA DE FIXTURES (I1): el contenido que llega a publicarse NO puede
// borrarse (invariante 3, sin bypass) y no se toca el catálogo sembrado. El
// aislamiento sustituye a la limpieza: materia y tema propios por corrida.
//
// NUNCA gasta Anthropic: no llama a ningún endpoint de generación de `/ai`.
//
// Uso:
//   node dist/main.js            (en otra terminal, con PORT propio)
//   npm run verify:content-coverage-matrix-gate -- http://127.0.0.1:<PORT>
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const backendDir = join(__dirname, '..');
const srcDir = join(backendDir, 'src');
const repoRoot = join(backendDir, '..', '..');

let failures = 0;
let checksRun = 0;

function check(label: string, condition: boolean, detail?: string) {
  checksRun++;
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    if (detail) console.error(`       -> ${detail}`);
    failures++;
  }
}

/** Igual que en los gates de I2/I3/I4: mide el CÓDIGO, no los docstrings. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function collectTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'generated' || entry.name.startsWith('.')) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, raw: text };
}

function bootstrapActor(name: string, roles: string) {
  const result = spawnSync(
    'node',
    ['dist/cli/create-admin-actor.js', '--name', name, '--roles', roles, '--expires-in-days', '7'],
    { cwd: backendDir, encoding: 'utf8' },
  );
  const stdout = result.stdout ?? '';
  return {
    status: result.status,
    actorId: /actorId\s*:\s*([0-9a-f-]{36})/i.exec(stdout)?.[1] ?? '',
    token: /^\s*(axadm_[A-Za-z0-9_-]+)\s*$/m.exec(stdout)?.[1] ?? '',
    stdout,
    stderr: result.stderr ?? '',
  };
}

const H = (t: string) => ({ 'x-admin-token': t });
const P = (text: string) => ({ type: 'paragraph', order: 0, text });
const BLOCKS = (text: string) => [P(text)];

const MATRIX_PATH = '/administration/editorial/coverage-matrix';

/** Extrae la fila de un tema concreto de la respuesta de la matriz. */
function topicRow(matrixBody: any, subjectId: string, topicId: string) {
  const subject = (matrixBody?.subjects ?? []).find((s: any) => s.subjectId === subjectId);
  const topic = (subject?.topics ?? []).find((t: any) => t.curriculumTopicId === topicId);
  return { subject, topic };
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ==========================================================================
  // 0. Identidad del proceso bajo prueba -- protocolo obligatorio.
  //
  // Un puerto residual de una sesión anterior serviría un binario ANTIGUO y el
  // gate mediría otra cosa. La ruta de la matriz debe EXISTIR: sin credencial
  // debe responder 401, nunca 404.
  // ==========================================================================
  console.log('--- 0. Identidad del proceso bajo prueba (anti-puerto-residual) ---');
  const probe = await req('GET', MATRIX_PATH);
  check(
    `el backend en ${base} expone GET ${MATRIX_PATH} (401, no 404) -> es el binario del Incremento 5`,
    probe.status === 401,
    `status=${probe.status}`,
  );
  if (probe.status === 404) {
    console.error('       -> 404: el proceso escuchando en este puerto NO tiene la Content Coverage Matrix del Incremento 5.');
    console.error('       -> Es un servidor residual. Mátalo y levanta `node dist/main.js` de este build.');
    process.exit(1);
  }
  // La superficie de escritura de I3/I4 también debe existir: este gate la usa
  // para mover el estado real de la base y comprobar que la matriz lo sigue.
  const probeWrite = await req('POST', '/administration/editorial/questions', {}, {});
  check('la superficie de autoría de I4 sigue presente (401, no 404) -> el gate puede mover el estado real', probeWrite.status === 401, `status=${probeWrite.status}`);

  // ==========================================================================
  // 0.b Actores administrativos REALES, por el CLI del Incremento 2.
  //
  // Ninguna fila de `admin_actor`/`admin_actor_token` se inserta a mano.
  // Se necesitan DOS autores distintos porque CMS-018 (§8.3, invariante 9)
  // impide que quien creó la versión la apruebe o la publique.
  // ==========================================================================
  console.log('--- 0.b Actores administrativos reales (CLI del Incremento 2) ---');
  const author = bootstrapActor(`Autor cobertura ${suffix}`, 'AUTHOR');
  const publisher = bootstrapActor(`Publicador cobertura ${suffix}`, 'PUBLISHER');
  const roleless = bootstrapActor(`Sin rol cobertura ${suffix}`, '');
  check('CLI crea un actor con rol AUTHOR y emite su token personal', author.status === 0 && !!author.token, author.stderr);
  check('CLI crea un actor con rol PUBLISHER y emite su token personal', publisher.status === 0 && !!publisher.token, publisher.stderr);

  // ==========================================================================
  // 0.c Referencias canónicas AISLADAS POR CORRIDA.
  //
  // `subject` y `curriculum_topic` NO son contenido editorial (§8.2 habla de
  // `question_version`/`learning_resource_version`) y la taxonomía PAES oficial
  // es CMS-001, explícitamente FUERA de alcance (§12.5). Se insertan por `pg`.
  // Todo lo que SÍ es contenido editorial se crea por la API real.
  // ==========================================================================
  console.log('--- 0.c Referencias canónicas aisladas (materia y temas propios de la corrida) ---');
  const subjectId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Materia del gate de cobertura', 'VII5', 'ACTIVE', 994, now(), now())`,
    [subjectId, `lef7-i5-subject-${suffix}`],
  );
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema con contenido del gate de cobertura', 1, $3, now(), now())`,
    [topicId, `LEF7.I5.TOPIC.${suffix}`, subjectId],
  );
  // Tema HERMANO que se deja deliberadamente VACÍO: el hueco de cobertura es
  // exactamente lo que CMS-002 existe para hacer visible.
  const emptyTopicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema SIN contenido del gate de cobertura', 2, $3, now(), now())`,
    [emptyTopicId, `LEF7.I5.EMPTY.${suffix}`, subjectId],
  );
  check('referencias canónicas de la corrida creadas (materia propia, tema con contenido, tema vacío)', true);

  let seq = 0;
  const nextKey = () => `LEF7.I5.Q${++seq}.${suffix}`;

  function validQuestionBody(over: Record<string, unknown> = {}) {
    return {
      questionKey: nextKey(),
      primarySubjectId: subjectId,
      curriculumTopicId: topicId,
      stemContent: BLOCKS('¿Cuánto es el 25% de 80?'),
      explanationContent: BLOCKS('El 25% de 80 es 80 * 25 / 100 = 20.'),
      answerOptions: [
        { content: P('20'), isCorrect: true },
        { content: P('25'), isCorrect: false },
        { content: P('30'), isCorrect: false },
        { content: P('40'), isCorrect: false },
      ],
      ...over,
    };
  }

  // ==========================================================================
  // 1. AUTORIZACIÓN -- invariante 7 y §9.2/§7.2.
  //
  // §9.2 concede la lectura de la matriz a AMBOS roles ("leer la Content
  // Coverage Matrix" aparece en la columna "Puede" de Autor y de Publicador) y
  // §7.2 lo repite. Lo que NO existe es acceso sin credencial ni sin rol.
  // ==========================================================================
  console.log('--- 1. Autorización de la matriz: ambos roles SÍ, nadie más (invariante 7, §9.2, §7.2) ---');
  const anon = await req('GET', MATRIX_PATH);
  check('sin token administrativo -> 401 (nunca acceso anónimo, §9.5 "rechazo por defecto")', anon.status === 401, `status=${anon.status}`);

  const bogus = await req('GET', MATRIX_PATH, H('axadm_token_que_no_existe'));
  check('con un token desconocido -> 401', bogus.status === 401, `status=${bogus.status}`);

  const ops = await req('GET', MATRIX_PATH, { 'x-internal-ops-key': process.env.INTERNAL_OPS_KEY ?? 'x' });
  check('`x-internal-ops-key` NO concede acceso a la matriz (decisión B: InternalOpsGuard nunca opera editorialmente)', ops.status === 401 || ops.status === 403, `status=${ops.status}`);

  const uid = `lef7-i5-${suffix}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  const STUDENT = { authorization: `Bearer ${idToken}`, 'x-session-id': session.body?.sessionId as string };
  check('sesión de estudiante creada (para probar que su credencial NO abre la matriz)', !!session.body?.sessionId, session.raw.slice(0, 200));
  const studentTry = await req('GET', MATRIX_PATH, STUDENT);
  check('una sesión de ESTUDIANTE (AuthGuard) NO abre la matriz -> 401 (la matriz no es superficie de estudiante)', studentTry.status === 401, `status=${studentTry.status}`);

  if (roleless.status === 0 && roleless.token) {
    const norole = await req('GET', MATRIX_PATH, H(roleless.token));
    check('un actor administrativo autenticado SIN ninguno de los dos roles -> 403 (no basta con estar autenticado)', norole.status === 403, `status=${norole.status}`);
  } else {
    check('un actor administrativo SIN roles no puede crearse por el CLI: el rol es obligatorio (frontera equivalente del I2)', roleless.status !== 0);
  }

  const asAuthor = await req('GET', MATRIX_PATH, H(author.token));
  check('rol AUTOR -> 200: §9.2 le concede "leer la Content Coverage Matrix"', asAuthor.status === 200, `status=${asAuthor.status} ${asAuthor.raw.slice(0, 300)}`);
  const asPublisher = await req('GET', MATRIX_PATH, H(publisher.token));
  check('rol PUBLICADOR -> 200: §9.2 se la concede igualmente', asPublisher.status === 200, `status=${asPublisher.status} ${asPublisher.raw.slice(0, 300)}`);

  // ==========================================================================
  // 2. LA MATRIZ ES DE SOLO LECTURA -- invariante 14, §13.5 punto 4 (dinámico).
  //
  // El punto 4 de §13.5 pide una comprobación estática; aquí se añade además
  // la DINÁMICA, que es más fuerte: ningún verbo de escritura existe sobre la
  // ruta, ni siquiera con el token de mayor privilegio.
  // ==========================================================================
  console.log('--- 2. La ruta de la matriz no admite NINGÚN verbo de escritura (invariante 14) ---');
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = await req(method, MATRIX_PATH, H(publisher.token), {});
    check(`${method} ${MATRIX_PATH} no existe -> 404/405 (la matriz no tiene superficie de escritura)`, r.status === 404 || r.status === 405, `status=${r.status}`);
  }

  // ==========================================================================
  // 3. CONTROL POSITIVO Y ESTADO INICIAL.
  //
  // Mismo criterio anti-falso-negativo que `verify-ai-answerkey-isolation-gate.ts:34-39`
  // y §13.1 punto 1: si el gate midiera una matriz que no contiene el tema,
  // todas las comprobaciones posteriores pasarían por vacuidad.
  // ==========================================================================
  console.log('--- 3. Control positivo: la materia y los DOS temas de la corrida aparecen en la matriz ---');
  const m0 = await req('GET', MATRIX_PATH, H(author.token));
  const r0 = topicRow(m0.body, subjectId, topicId);
  const e0 = topicRow(m0.body, subjectId, emptyTopicId);
  check('la materia recién creada aparece en la matriz (control positivo: la matriz no está vacía ni obsoleta)', !!r0.subject, `subjects=${(m0.body?.subjects ?? []).length}`);
  check('el tema CON contenido aparece como fila de su materia', !!r0.topic);
  check('el tema VACÍO aparece TAMBIÉN: un hueco de cobertura es visible, no invisible (CMS-002)', !!e0.topic);
  check('el tema vacío declara cero preguntas y cero recursos en los cuatro estados',
    JSON.stringify(e0.topic?.questions) === JSON.stringify({ published: 0, draft: 0, inReview: 0, approved: 0 }) &&
      JSON.stringify(e0.topic?.learningResources) === JSON.stringify({ published: 0, draft: 0, inReview: 0, approved: 0 }),
    JSON.stringify(e0.topic));
  check('el tema vacío declara `lastUpdatedAt: null` (nunca se tocó)', e0.topic?.lastUpdatedAt === null, String(e0.topic?.lastUpdatedAt));
  check('el tema con contenido parte de cero en los cuatro estados (todavía no se creó nada)',
    JSON.stringify(r0.topic?.questions) === JSON.stringify({ published: 0, draft: 0, inReview: 0, approved: 0 }),
    JSON.stringify(r0.topic?.questions));
  check('la materia declara `generatedAt` como momento de la CONSULTA (la matriz no se materializa)',
    typeof m0.body?.generatedAt === 'string' && Math.abs(Date.now() - Date.parse(m0.body.generatedAt)) < 60_000,
    String(m0.body?.generatedAt));

  // ==========================================================================
  // 4. §13.5 punto 1 -- "La matriz refleja el estado real de la base DESPUÉS DE
  //    PUBLICAR y DESPUÉS DE RETIRAR".
  //
  // Se mueve el estado real por la API productiva de I3/I4 (T1 -> T3 -> T5 ->
  // T7 -> T8) y se comprueba la matriz DESPUÉS DE CADA PASO. Esta es la
  // sustancia del gate.
  // ==========================================================================
  console.log('--- 4.a Tras T1 (crear borrador): la matriz cuenta un DRAFT (§13.5 punto 1) ---');
  const created = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody());
  check('T1 (crear pregunta) por el Autor -> 2xx', created.status === 200 || created.status === 201, `status=${created.status} ${created.raw.slice(0, 400)}`);
  const questionId = created.body?.identityId as string;
  const versionId = created.body?.versionId as string;
  check('T1 devuelve identityId y versionId', !!questionId && !!versionId, created.raw.slice(0, 300));

  const m1 = await req('GET', MATRIX_PATH, H(author.token));
  const r1 = topicRow(m1.body, subjectId, topicId);
  check('la matriz cuenta 1 borrador de pregunta en el tema', r1.topic?.questions?.draft === 1, JSON.stringify(r1.topic?.questions));
  check('la matriz sigue contando 0 publicadas: crear NO publica (invariante 8)', r1.topic?.questions?.published === 0, JSON.stringify(r1.topic?.questions));
  check('`lastUpdatedAt` del tema dejó de ser null tras la primera versión', typeof r1.topic?.lastUpdatedAt === 'string', String(r1.topic?.lastUpdatedAt));
  check('el tema hermano VACÍO no se contaminó: sigue en cero', topicRow(m1.body, subjectId, emptyTopicId).topic?.questions?.draft === 0);
  check('el total de la MATERIA agrega el borrador de su tema (agregación por materia/tema, §12.5)', r1.subject?.questions?.draft === 1, JSON.stringify(r1.subject?.questions));

  console.log('--- 4.b Tras T3 (enviar a revisión) y T5 (aprobar): la matriz sigue el estado, casilla a casilla ---');
  const toReview = await req('POST', `/administration/editorial/question-versions/${versionId}/transitions`, H(author.token), { targetStatus: 'IN_REVIEW' });
  check('T3 (DRAFT -> IN_REVIEW) por el Autor -> 2xx', toReview.status < 400, `status=${toReview.status} ${toReview.raw.slice(0, 300)}`);
  const m2 = await req('GET', MATRIX_PATH, H(author.token));
  const q2 = topicRow(m2.body, subjectId, topicId).topic?.questions;
  check('la matriz mueve el conteo de `draft` a `inReview` (1 en revisión, 0 borradores)', q2?.inReview === 1 && q2?.draft === 0, JSON.stringify(q2));

  const approve = await req('POST', `/administration/editorial/question-versions/${versionId}/transitions`, H(publisher.token), { targetStatus: 'APPROVED' });
  check('T5 (IN_REVIEW -> APPROVED) por un Publicador DISTINTO del autor -> 2xx (CMS-018 respetado)', approve.status < 400, `status=${approve.status} ${approve.raw.slice(0, 300)}`);
  const m3 = await req('GET', MATRIX_PATH, H(publisher.token));
  const q3 = topicRow(m3.body, subjectId, topicId).topic?.questions;
  check('la matriz mueve el conteo a `approved` (1 aprobada, 0 en revisión, 0 publicadas)', q3?.approved === 1 && q3?.inReview === 0 && q3?.published === 0, JSON.stringify(q3));

  console.log('--- 4.c DESPUÉS DE PUBLICAR (T7): la matriz refleja el estado real (§13.5 punto 1) ---');
  const publish = await req('POST', `/administration/editorial/question-versions/${versionId}/transitions`, H(publisher.token), { targetStatus: 'PUBLISHED', operationId: randomUUID() });
  check('T7 (APPROVED -> PUBLISHED) por el Publicador -> 2xx', publish.status < 400, `status=${publish.status} ${publish.raw.slice(0, 300)}`);
  const m4 = await req('GET', MATRIX_PATH, H(publisher.token));
  const q4 = topicRow(m4.body, subjectId, topicId).topic?.questions;
  check('DESPUÉS DE PUBLICAR la matriz cuenta 1 publicada y 0 aprobadas', q4?.published === 1 && q4?.approved === 0, JSON.stringify(q4));

  // Concordancia con PostgreSQL REAL: la matriz no puede ser una historia
  // paralela. Se compara contra el MISMO predicado que usa
  // `countPublishedByTopicId` (`editorial_status = 'PUBLISHED'`), que es el
  // precedente que §12.5 ordena reutilizar.
  const pgPublished = await pg.query(
    `SELECT count(*)::int AS n FROM question_version WHERE curriculum_topic_id = $1 AND editorial_status = 'PUBLISHED'`,
    [topicId],
  );
  check('el conteo de publicadas de la matriz COINCIDE con PostgreSQL real (mismo predicado que countPublishedByTopicId)',
    q4?.published === pgPublished.rows[0].n, `matriz=${q4?.published} pg=${pgPublished.rows[0].n}`);

  // El estudiante ve exactamente lo mismo que la matriz declara publicado:
  // la matriz y el lector 1 (§11.1) no pueden divergir.
  const catalog = await req('GET', `/education/topics/${topicId}/questions`, STUDENT);
  const servedCount = Array.isArray(catalog.body) ? catalog.body.length : -1;
  check('el catálogo del ESTUDIANTE sirve exactamente tantas preguntas como publicadas declara la matriz (§11.1, invariante 19)',
    servedCount === q4?.published, `catalogo=${servedCount} matriz=${q4?.published}`);

  console.log('--- 4.d DESPUÉS DE RETIRAR (T8): la matriz refleja el estado real (§13.5 punto 1) ---');
  const deprecate = await req('POST', `/administration/editorial/question-versions/${versionId}/transitions`, H(publisher.token), {
    targetStatus: 'DEPRECATED',
    reason: 'Retiro deliberado para verificar la matriz de cobertura tras el retiro (§13.5 punto 1).',
    operationId: randomUUID(),
  });
  check('T8 (PUBLISHED -> DEPRECATED) con motivo obligatorio -> 2xx', deprecate.status < 400, `status=${deprecate.status} ${deprecate.raw.slice(0, 300)}`);
  const m5 = await req('GET', MATRIX_PATH, H(publisher.token));
  const q5 = topicRow(m5.body, subjectId, topicId).topic?.questions;
  check('DESPUÉS DE RETIRAR la matriz vuelve a 0 publicadas', q5?.published === 0, JSON.stringify(q5));
  check('la versión retirada NO reaparece como borrador/en revisión/aprobada: el retiro no resucita estados anteriores',
    q5?.draft === 0 && q5?.inReview === 0 && q5?.approved === 0, JSON.stringify(q5));
  const pgAfter = await pg.query(`SELECT editorial_status FROM question_version WHERE id = $1`, [versionId]);
  check('en PostgreSQL la fila sigue existiendo en DEPRECATED: retirar NO borra historial (CMS-016, CONTENT-008)',
    pgAfter.rows[0]?.editorial_status === 'DEPRECATED', String(pgAfter.rows[0]?.editorial_status));
  check('el total de la MATERIA también volvió a 0 publicadas (el agregado sigue al detalle)',
    topicRow(m5.body, subjectId, topicId).subject?.questions?.published === 0);

  // ==========================================================================
  // 5. La matriz cubre las DOS familias de contenido.
  //
  // §8.2/§8.4 tratan `question_version` y `learning_resource_version` en
  // paralelo, y §12.5 habla de "versiones" sin restringir la familia. Una
  // matriz que solo contara preguntas dejaría media cobertura invisible.
  // ==========================================================================
  console.log('--- 5. La matriz cubre también los recursos de aprendizaje, no solo las preguntas ---');
  const resource = await req('POST', '/administration/editorial/learning-resources', H(author.token), {
    resourceKey: `LEF7.I5.R1.${suffix}`,
    primarySubjectId: subjectId,
    curriculumTopicId: topicId,
    resourceType: 'LESSON',
    title: 'Recurso del gate de cobertura',
    contentBlocks: BLOCKS('Contenido del recurso de prueba.'),
  });
  check('T1 (crear recurso de aprendizaje) por el Autor -> 2xx', resource.status === 200 || resource.status === 201, `status=${resource.status} ${resource.raw.slice(0, 400)}`);
  const m6 = await req('GET', MATRIX_PATH, H(author.token));
  const row6 = topicRow(m6.body, subjectId, topicId).topic;
  check('la matriz cuenta 1 borrador de RECURSO en el tema, en su propia casilla', row6?.learningResources?.draft === 1, JSON.stringify(row6?.learningResources));
  check('el conteo de recursos es INDEPENDIENTE del de preguntas (no se mezclan familias)', row6?.questions?.draft === 0, JSON.stringify(row6?.questions));

  // ==========================================================================
  // 6. §13.5 punto 2 -- "NO expone AnswerOption.isCorrect: inspección
  //    EXHAUSTIVA de claves de la respuesta".
  //
  // Inspección real y recursiva de TODAS las claves y de TODOS los valores
  // string de la respuesta, no un grep superficial.
  // ==========================================================================
  console.log('--- 6. §13.5 punto 2 -- la matriz NO expone `isCorrect` ni contenido académico (inspección exhaustiva) ---');
  const full = await req('GET', MATRIX_PATH, H(publisher.token));
  const allKeys = new Set<string>();
  const allStrings: string[] = [];
  (function walk(node: any) {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node === 'string') return void allStrings.push(node);
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        allKeys.add(k);
        walk(v);
      }
    }
  })(full.body);
  check('ninguna clave de la respuesta es `isCorrect` (ni ninguna variante)',
    ![...allKeys].some((k) => /iscorrect|correct/i.test(k)), [...allKeys].filter((k) => /correct/i.test(k)).join(','));
  check('ninguna clave expone contenido académico (`stemContent`/`explanationContent`/`contentBlocks`/`answerOptions`)',
    ![...allKeys].some((k) => /stemcontent|explanationcontent|contentblocks|answeroption/i.test(k)),
    [...allKeys].filter((k) => /stem|explanation|contentblock|answeroption/i.test(k)).join(','));
  check('el enunciado real de la pregunta creada NO aparece en ningún valor de la respuesta',
    !allStrings.some((s) => s.includes('¿Cuánto es el 25% de 80?')));
  check('el texto de la alternativa correcta NO aparece en ningún valor de la respuesta',
    !allStrings.some((s) => s.includes('El 25% de 80 es 80 * 25 / 100 = 20.')));
  check('ninguna clave nombra el estado `ARCHIVED` ni lo cuenta (invariante 21: inalcanzable en V1)',
    ![...allKeys].some((k) => /archived/i.test(k)) && !allStrings.some((s) => s === 'ARCHIVED'));
  check('ninguna clave nombra `deprecated`: §12.5 pide publicadas/borradores/en revisión/aprobadas, ni una casilla más',
    ![...allKeys].some((k) => /deprecated/i.test(k)), [...allKeys].filter((k) => /deprecated/i.test(k)).join(','));

  // ==========================================================================
  // 7. §13.5 punto 3 -- "NO expone ningún dato de estudiante: inspección
  //    EXHAUSTIVA". Ver también §11.4 (invariante adicional para el gate).
  //
  // Se responde una pregunta REAL con una cuenta REAL antes de inspeccionar,
  // para que exista dato de estudiante que se pudiera filtrar. Un gate que
  // inspeccionara una base sin respuestas no demostraría nada.
  // ==========================================================================
  console.log('--- 7. §13.5 punto 3 / §11.4 -- la matriz NO expone NINGÚN dato de estudiante (inspección exhaustiva) ---');
  // Contenido publicado y VIVO para que el estudiante pueda responderlo.
  const liveCreate = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody());
  const liveVersionId = liveCreate.body?.versionId as string;
  await req('POST', `/administration/editorial/question-versions/${liveVersionId}/transitions`, H(author.token), { targetStatus: 'IN_REVIEW' });
  await req('POST', `/administration/editorial/question-versions/${liveVersionId}/transitions`, H(publisher.token), { targetStatus: 'APPROVED' });
  const livePublish = await req('POST', `/administration/editorial/question-versions/${liveVersionId}/transitions`, H(publisher.token), { targetStatus: 'PUBLISHED', operationId: randomUUID() });
  check('segunda pregunta publicada por la API para generar dato de estudiante real', livePublish.status < 400, `status=${livePublish.status}`);
  const optionId = (await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 ORDER BY display_order LIMIT 1`, [liveVersionId])).rows[0]?.id;
  const answered = await req('POST', `/progress/topics/${topicId}/responses`, STUDENT, {
    questionVersionId: liveVersionId,
    answerOptionId: optionId,
    operationId: randomUUID(),
  });
  check('el estudiante respondió una pregunta real -> existe `student_response` que se podría filtrar', answered.status < 400, `status=${answered.status} ${answered.raw.slice(0, 300)}`);
  // El `accountId` se toma de la fila REAL de `student_response` que acaba de
  // crearse: es exactamente el dato de estudiante que la matriz no puede
  // filtrar, y tomarlo de ahí (en vez de de `auth_identity`) garantiza que
  // existe y que corresponde a la respuesta recién registrada.
  const responseRow = await pg.query(
    `SELECT id, account_id, answer_option_id, is_correct FROM student_response WHERE question_version_id = $1 LIMIT 1`,
    [liveVersionId],
  );
  const accountId = responseRow.rows[0]?.account_id ?? '';
  const studentResponseId = responseRow.rows[0]?.id ?? '';
  check('la respuesta del estudiante existe en `student_response` (control positivo del punto 3)', !!accountId && !!studentResponseId);

  const after = await req('GET', MATRIX_PATH, H(publisher.token));
  const afterJson = JSON.stringify(after.body ?? {});
  const afterKeys = new Set<string>();
  (function walk(node: any) {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node === 'object') for (const [k, v] of Object.entries(node)) { afterKeys.add(k); walk(v); }
  })(after.body);
  check('la matriz refleja la segunda publicación (control positivo: se está midiendo una respuesta viva)',
    topicRow(after.body, subjectId, topicId).topic?.questions?.published === 1,
    JSON.stringify(topicRow(after.body, subjectId, topicId).topic?.questions));
  check('el `accountId` del estudiante NO aparece en la respuesta', !!accountId && !afterJson.includes(accountId), accountId);
  check('el id de la fila `student_response` NO aparece en la respuesta', !!studentResponseId && !afterJson.includes(studentResponseId), studentResponseId);
  check('el identificador de proveedor / correo del estudiante NO aparece en la respuesta', !afterJson.includes(uid));
  check('ninguna clave nombra `account`, `student`, `response`, `attempt`, `xp`, `league`, `conversation` ni `message` (§11.4)',
    ![...afterKeys].some((k) => /account|student|response|attempt|\bxp\b|league|conversation|message|streak|reward|achievement/i.test(k)),
    [...afterKeys].join(','));

  // ==========================================================================
  // 8. §13.5 punto 4 -- COMPROBACIÓN ESTÁTICA: "el módulo de la matriz no
  //    expone ningún método HTTP distinto de GET y no invoca ninguna operación
  //    de escritura en ningún repositorio (invariante 14)".
  //
  // Sobre el CÓDIGO ejecutable (sin comentarios), igual que los gates de
  // I1..I4: documentar "esto NO se hace aquí" no puede hacer fallar el gate.
  // ==========================================================================
  console.log('--- 8. §13.5 punto 4 -- comprobación estática del módulo de la matriz (invariante 14) ---');
  const matrixControllerPath = join(srcDir, 'editorial', 'coverage-matrix.controller.ts');
  const matrixModulePath = join(srcDir, 'editorial', 'coverage-matrix.module.ts');
  const coverageServicePath = join(srcDir, 'education', 'content-coverage.service.ts');
  const coverageRepoPath = join(srcDir, 'education', 'content-coverage.repository.ts');
  check('el módulo de la matriz existe como MÓDULO PROPIO, separado de la superficie de escritura de I3/I4',
    existsSync(matrixControllerPath) && existsSync(matrixModulePath));

  const matrixController = stripComments(readFileSync(matrixControllerPath, 'utf8'));
  const matrixModule = stripComments(readFileSync(matrixModulePath, 'utf8'));
  const coverageService = stripComments(readFileSync(coverageServicePath, 'utf8'));
  const coverageRepo = stripComments(readFileSync(coverageRepoPath, 'utf8'));
  const matrixModuleCode = [matrixController, matrixModule, coverageService, coverageRepo].join('\n');

  check('el controller de la matriz NO declara `@Post`/`@Put`/`@Patch`/`@Delete`: ni uno',
    !/@(Post|Put|Patch|Delete)\s*\(/.test(matrixController));
  check('el controller de la matriz declara EXACTAMENTE un `@Get` (una sola ruta de lectura)',
    (matrixController.match(/@Get\s*\(/g) ?? []).length === 1, String((matrixController.match(/@Get\s*\(/g) ?? []).length));
  check('NINGÚN archivo del módulo de la matriz invoca una operación de escritura de Prisma (create/update/upsert/delete/executeRaw)',
    !/\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/.test(matrixModuleCode) &&
      !/\$executeRaw|\$transaction/.test(matrixModuleCode),
    (matrixModuleCode.match(/\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/g) ?? []).join(','));
  check('el repositorio de cobertura SOLO agrega: `groupBy`/`findMany` con `select`, sin ninguna escritura',
    /groupBy\s*\(/.test(coverageRepo) && !/\.(create|update|upsert|delete)\w*\s*\(/.test(coverageRepo));
  check('el servicio de cobertura NO invoca la máquina de estados ni el servicio de autoría (leer no puede transicionar)',
    !/EditorialTransitionService|EditorialAuthoringService/.test(coverageService));
  check('el servicio de cobertura NO escribe ninguna acción administrativa: leer no es una operación auditable de §9.3',
    !/AdminActionRepository|adminAction/i.test(coverageService) && !/AdminActionRepository|adminAction/i.test(matrixController));
  check('el módulo de la matriz NO toca `answer_option` en ninguna consulta (§13.5 punto 2, en el código)',
    !/answerOption/i.test(matrixModuleCode));
  check('el módulo de la matriz NO importa PROGRESS/GAMIFICATION/PRIVACY/AI ni `Account` (§11.4)',
    !/from\s+['"][^'"]*\/(progress|gamification|privacy|ai|user)\//.test(matrixModuleCode) &&
      !/\baccount\b/i.test(matrixModuleCode));
  check('el controller de la matriz NO usa `InternalOpsGuard` (decisión B)',
    !/InternalOpsGuard|INTERNAL_OPS_KEY/.test(matrixController));
  check('el controller de la matriz NO usa `AuthGuard` de estudiante',
    !/\bAuthGuard\b/.test(matrixController));
  check('el controller de la matriz REUTILIZA `AdminAuthGuard`/`AdminRoleGuard`/`@RequireAdminRole` del I2, sin reimplementarlos',
    /AdminAuthGuard/.test(matrixController) && /AdminRoleGuard/.test(matrixController) && /RequireAdminRole/.test(matrixController) &&
      !/x-admin-token/i.test(matrixController) && !/createHash|bcrypt|argon2|verifyToken/i.test(matrixModuleCode));
  check('el controller de la matriz exige AMBOS roles como autorizados (§9.2: Autor y Publicador leen la matriz)',
    /@RequireAdminRole\(\s*'AUTHOR'\s*,\s*'PUBLISHER'\s*\)/.test(matrixController));
  check('invariante 15: el controller de la matriz NO importa ningún repositorio de EDUCATION -- solicita al servicio de dominio',
    !/repository/i.test(matrixController));
  check('la agregación vive en `education/` (EDUCATION es la dueña de sus tablas, MC §6.17)',
    existsSync(coverageServicePath) && existsSync(coverageRepoPath));
  check('`ContentCoverageRepository` NO se exporta desde `EducationModule`: solo el servicio cruza la frontera',
    !/exports:[\s\S]*ContentCoverageRepository/.test(stripComments(readFileSync(join(srcDir, 'education', 'education.module.ts'), 'utf8'))));

  // El contrato de la matriz no declara NINGUNA petición: no hay nada que un
  // cliente pueda enviar, y por tanto ningún campo de rol o de actor que colar
  // (invariante 22).
  const coverageContract = stripComments(readFileSync(join(repoRoot, 'packages', 'contracts', 'src', 'content-coverage.ts'), 'utf8'));
  check('el contrato de la matriz NO declara ningún esquema de PETICIÓN (la matriz se pide con un GET sin cuerpo)',
    !/RequestSchema/.test(coverageContract));
  check('el contrato de la matriz NO declara ningún campo de rol ni de actor (invariante 22)',
    !/\brole\b|\bactorId\b|\bactor\b/i.test(coverageContract.replace(/[A-Za-z]*Actor[A-Za-z]*/g, '')));

  // ==========================================================================
  // 9. NO REGRESIÓN DE LOS INVARIANTES DE I1..I4 QUE I5 PODRÍA ROZAR.
  //
  // El invariante 19 exige que los CUATRO lectores (§11.1) conserven su
  // predicado byte-idéntico. La matriz agrega sobre las mismas tablas; si
  // hubiera "arreglado" un lector para reutilizarlo, el invariante caería.
  // ==========================================================================
  console.log('--- 9. Invariante 19: los cuatro lectores de §11.1 siguen byte-idénticos tras I5 ---');
  const readerFiles = [
    // `education.service.ts` se excluye de la comprobación byte-idéntica de
    // archivo completo: STUDY CONTENT MOBILE REACHABILITY añadió a
    // `listRootTopics` un filtro de superficie (solo unidades canónicas =
    // raíces con Recurso hijo publicado), con su propio gate
    // (`verify:study-content-mobile-reachability-gate`). Ese cambio NO toca el
    // predicado de contenido PUBLISHED que el invariante 19 protege: se
    // verifica abajo, por método, que `getPublishedResource` y
    // `listPublishedQuestions` siguen byte-idénticos.
    ['education/question-version.repository.ts', 'lector 1/2/3 -- QuestionVersionRepository'],
    ['education/learning-resource-version.repository.ts', 'lector 1 -- LearningResourceVersionRepository'],
    // `progress/progress.service.ts` se excluye de la comprobación de archivo
    // completo: PROFILE-01 cambió `getAcademicSummary` para que "Progreso por
    // materia" cuente RECURSOS canónicos (topic hijo con lección publicada),
    // no `curriculum_topic` en bruto, con su propio gate
    // (`verify:profile-subject-progress-gate` + `verify:academic-summary-gate`).
    // Ese cambio NO toca el predicado de completitud que el invariante 19
    // protege (`countPublishedByTopicId` -> `shouldComplete`): se verifica
    // abajo, por método, que ese bloque sigue byte-idéntico.
    ['gamification/quick-question.service.ts', 'lector 3 -- QuickQuestionService'],
    ['ai/ai-academic-context-builder.service.ts', 'lector 4 -- AiAcademicContextBuilder'],
  ] as const;
  for (const [rel, label] of readerFiles) {
    const full = join(srcDir, rel);
    if (!existsSync(full)) {
      check(`${label}: archivo localizado`, false, `no existe: ${rel}`);
      continue;
    }
    const git = spawnSync('git', ['diff', '--stat', 'HEAD', '--', join('apps', 'backend', 'src', rel).replace(/\\/g, '/')], {
      cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32',
    });
    check(`${label}: sin ningún cambio en el árbol de trabajo (invariante 19)`, (git.stdout ?? '').trim() === '', (git.stdout ?? '').trim());
  }
  {
    // Invariante 19 para `education.service.ts` (lector 1) -- el predicado de
    // contenido PUBLISHED, no la lista de unidades raíz (que STUDY CONTENT
    // MOBILE REACHABILITY filtra a propósito). Ambos métodos, byte-idénticos.
    const eduSvc = readFileSync(join(srcDir, 'education', 'education.service.ts'), 'utf8');
    check(
      'lector 1 -- EducationService.getPublishedResource: predicado PUBLISHED byte-idéntico (invariante 19)',
      /const version = await this\.resourceVersionRepo\.findLatestPublishedByTopicId\(topicId\);\s*if \(!version\) throw new NotFoundException\('No hay ningún recurso publicado para este tema\.'\);/.test(eduSvc),
    );
    // Invariante 19 para `progress/progress.service.ts` (lector 2) -- el
    // predicado de COMPLETITUD de un tema (cuántas preguntas publicadas tiene
    // y cuántas respondió la cuenta), no la agregación por materia de Perfil
    // (que PROFILE-01 cambia a propósito a recursos canónicos).
    const progressSvc = readFileSync(join(srcDir, 'progress', 'progress.service.ts'), 'utf8');
    check(
      'lector 2 -- ProgressService: predicado de completitud (countPublishedByTopicId + shouldComplete) byte-idéntico (invariante 19)',
      /this\.questionVersionRepo\.countPublishedByTopicId\(topicId\),\s*this\.responseRepo\.countDistinctByAccountAndTopic\(accountId, topicId\),\s*\]\);\s*const shouldComplete = totalPublished > 0 && answeredCount >= totalPublished;/.test(progressSvc),
    );
    check(
      'lector 1 -- EducationService.listPublishedQuestions: predicado PUBLISHED byte-idéntico (invariante 19)',
      /const versions = await this\.questionVersionRepo\.findPublishedByTopicId\(topicId\);\s*return Promise\.all\(versions\.map\(\(version\) => this\.toQuestionResponse\(version\)\)\);/.test(eduSvc),
    );
  }
  check('`countPublishedByTopicId` sigue existiendo, byte-idéntico, como único punto de entrada de PROGRESS (§12.5: reutilizar sin duplicar)',
    /countPublishedByTopicId\(curriculumTopicId: string\): Promise<number> \{\s*return this\.prisma\.questionVersion\.count\(\{ where: \{ curriculumTopicId, editorialStatus: 'PUBLISHED' \} \}\);/.test(
      readFileSync(join(srcDir, 'education', 'question-version.repository.ts'), 'utf8'),
    ));

  // La matriz no puede haber abierto una ruta de escritura sobre EDUCATION:
  // el conjunto de rutas de escritura administrativas sigue siendo el de I3+I4.
  console.log('--- 9.b El Incremento 5 no añadió NI UNA ruta de escritura a la superficie administrativa ---');
  const adminEditorialCode = ['administration', 'editorial']
    .map((d) => join(srcDir, d))
    .flatMap(collectTsFiles)
    .map((f) => stripComments(readFileSync(f, 'utf8')))
    .join('\n');
  const writeRoutes = [...adminEditorialCode.matchAll(/@(?:Post|Put|Patch|Delete)\(\s*(['"`])(.*?)\1/g)].map((m) => m[2]);
  const authorizedWriteRoutes = [
    'question-versions/:versionId/transitions',
    'learning-resource-versions/:versionId/transitions',
    'questions',
    'questions/:questionId/versions',
    'learning-resources',
    'learning-resources/:resourceId/versions',
    'question-versions/:versionId',
    'learning-resource-versions/:versionId',
    // CONTENT-4.2A -- taxonomía (Subject/CurriculumTopic), autorizada
    // explícitamente después del cierre de I5; mismo controller/guards.
    'subjects',
    'curriculum-topics',
  ];
  check('la superficie administrativa/editorial sigue declarando EXACTAMENTE las 10 rutas de escritura de I3+I4+CONTENT-4.2A, ni una más',
    [...adminEditorialCode.matchAll(/@(?:Post|Put|Patch|Delete)\(\s*\)/g)].length === 0 &&
      writeRoutes.length === authorizedWriteRoutes.length &&
      writeRoutes.every((r) => authorizedWriteRoutes.includes(r)),
    writeRoutes.join(','));

  // ==========================================================================
  // 10. FRONTERA ESTÁTICA -- lo que el Incremento 5 NO construye, e I6 sigue
  //     ausente. Mismo patrón que los gates de I1..I4 respecto del incremento
  //     siguiente.
  // ==========================================================================
  console.log('--- 10. Frontera del Incremento 5: I6 sigue sin construir y el no-alcance sigue ausente ---');
  const allSrc = collectTsFiles(srcDir).map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');
  // --------------------------------------------------------------------------
  // ACTUALIZACIÓN LEGÍTIMA -- LEF Bloque VII, Incremento 6 (2026-08-19).
  //
  // CLASIFICACIÓN (A vs B): los TRES checks originales de este bloque
  // ("Incremento 6 NO construido", "`src/cli/` sin CLI editorial" y "ningún
  // comando consume la matriz") eran **aserciones temporales de frontera**
  // (tipo B). El tercero lo dice de forma literal en su propio texto: "eso
  // sería I6 ADELANTADO" -- es decir, consumir la matriz desde el CLI es
  // exactamente lo que el I6 debía hacer cuando llegara su turno, y §12.6 lo
  // ordena ("consumen la misma API administrativa de los Incrementos 2-5").
  // Ninguno era una garantía de solo-lectura de la matriz (tipo A): el
  // invariante 14 lo protegen los checks del bloque 9 de este mismo gate, que
  // no se tocan y siguen midiendo el módulo de la matriz.
  //
  // NO ES UNA RELAJACIÓN: las sucesoras son MÁS FUERTES. Antes se afirmaba que
  // el CLI no existía y que no leía la matriz; ahora se afirma que existe, que
  // la lee POR LA API (no por la base) y que al hacerlo NO adquiere ninguna
  // capacidad de escritura sobre ella -- que es la propiedad que de verdad
  // protegía el invariante 14 frente a un cliente nuevo. El número de checks se
  // conserva (3 -> 3).
  // --------------------------------------------------------------------------
  const i6CliFile = join(srcDir, 'cli', 'editorial.ts');
  const i6CliCode = existsSync(i6CliFile) ? stripComments(readFileSync(i6CliFile, 'utf8')) : '';
  check('Incremento 6 construido: existe el CLI del ciclo editorial y es un CLIENTE de la API -- sin Prisma, sin conexión propia a la base y sin SQL (§12.6, §13.6 punto 3)',
    i6CliCode.length > 0 &&
      !/PrismaService|@prisma\/client|generated\/prisma|PrismaClient/.test(i6CliCode) &&
      !/from\s+['"]pg['"]|new\s+Client\(|DATABASE_URL/.test(i6CliCode) &&
      !/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/.test(i6CliCode));
  const cliFiles = existsSync(join(srcDir, 'cli')) ? readdirSync(join(srcDir, 'cli')).filter((f) => f.endsWith('.ts')) : [];
  check('`src/cli/` contiene exactamente las tres herramientas fuera de banda previas más el CLI editorial del I6, y ninguna herramienta más',
    cliFiles.sort().join(',') === 'activate-cms018-exception.ts,create-admin-actor.ts,editorial.ts,recover-account.ts', cliFiles.join(','));
  const cliCode = collectTsFiles(join(srcDir, 'cli')).map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');
  check('el CLI consume la matriz SOLO por `GET` de la API (§12.6) y ningún comando le abre una ruta de escritura: la matriz sigue siendo estrictamente de solo lectura (invariante 14)',
    new RegExp('coverage-matrix').test(cliCode) &&
      !/(POST|PUT|PATCH|DELETE)[^\n]*coverage-matrix/i.test(cliCode) &&
      !/coverage-matrix[^\n]*(POST|PUT|PATCH|DELETE)/i.test(cliCode));
  check('importación masiva sigue diferida (CMS-026..029): ningún módulo la implementa',
    !/bulk[_-]?import|importjob|import[_-]?batch|importcontent|content[_-]?import/i.test(allSrc));
  check('vista previa sigue diferida (CMS-007): ningún módulo la implementa',
    !/editorialpreview|content[_-]?preview/i.test(allSrc));
  check('`apps/` sigue conteniendo exactamente `backend` y `mobile`: I5 no creó ninguna app web administrativa (§3, decisión D)',
    readdirSync(join(repoRoot, 'apps')).filter((d) => !d.startsWith('.')).sort().join(',') === 'backend,mobile',
    readdirSync(join(repoRoot, 'apps')).join(','));
  check('invariante 21: ninguna ruta escribe el literal ARCHIVED',
    !/(editorialStatus|editorial_status)\s*[:=]\s*['"]ARCHIVED['"]/.test(allSrc));
  check('invariante 18: el módulo de la matriz no importa el dominio `ai/`',
    !/from\s+['"][^'"]*\/ai\//.test(matrixModuleCode));
  check('invariante 17: el módulo de la matriz no toca `xp_ledger_entry` ni `league_point_ledger_entry`',
    !/xpLedgerEntry|leaguePointLedgerEntry/.test(matrixModuleCode));
  check('el enum `EditorialStatus` no ganó `SCHEDULED` ni perdió `ARCHIVED` (§6 punto 19)',
    (() => {
      const schema = readFileSync(join(backendDir, 'prisma', 'schema.prisma'), 'utf8');
      const block = /enum EditorialStatus \{([\s\S]*?)\}/.exec(schema)?.[1] ?? '';
      const values = block.split('\n').map((l) => l.trim()).filter((l) => /^[A-Z_]+$/.test(l));
      return values.join(',') === 'DRAFT,IN_REVIEW,APPROVED,PUBLISHED,DEPRECATED,ARCHIVED';
    })());
  // I5 es SOLO LECTURA sobre entidades existentes (§12.5): no puede haber
  // creado ninguna migración ni haber tocado el schema. Se comprueba contra
  // git, no por el nombre de los directorios -- un filtro por nombre daría
  // falsos positivos con migraciones de otros bloques (p. ej.
  // `lef_vi_i5_pedagogy`, del Bloque VI) y, peor, no detectaría una migración
  // nueva con un nombre cualquiera.
  const gitPrisma = spawnSync('git', ['status', '--porcelain', '--', 'apps/backend/prisma'], {
    cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32',
  });
  check('I5 no creó ninguna migración ni tocó `prisma/schema.prisma`: es solo lectura sobre entidades existentes (§12.5)',
    (gitPrisma.stdout ?? '').trim() === '', (gitPrisma.stdout ?? '').trim().slice(0, 300));

  // ==========================================================================
  // 11. §13.5 punto 5 -- "Regresión completa de Bloques I-VI en PASS".
  //     Se encadena además el gate del Incremento 1, que es el primer eslabón
  //     obligatorio de la secuenciación de §10.
  // ==========================================================================
  console.log('--- 11. §13.5 punto 5 -- regresión encadenada ---');
  const i1 = spawnSync('npm', ['run', '--silent', 'verify:education-published-immutability-gate', '--', base], {
    cwd: backendDir, encoding: 'utf8', shell: process.platform === 'win32',
  });
  check('`verify:education-published-immutability-gate` (I1) sigue en VERDE tras leer la matriz',
    i1.status === 0, (i1.stdout ?? '').split('\n').filter((l) => /FALLO/.test(l)).slice(0, 5).join(' | ') || i1.stderr?.slice(0, 400));

  const edu = spawnSync('npm', ['run', '--silent', 'verify:education-gate', '--', base], {
    cwd: backendDir, encoding: 'utf8', shell: process.platform === 'win32',
  });
  check('`verify:education-gate` sigue en VERDE: la ruta de lectura del estudiante no se degradó (invariantes 8 y 19)',
    edu.status === 0, (edu.stdout ?? '').split('\n').filter((l) => /FALLO/.test(l)).slice(0, 5).join(' | ') || edu.stderr?.slice(0, 400));

  await pg.end();

  console.log(`\nChecks ejecutados: ${checksRun}`);
  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron -- GATE I5 EN ROJO.`);
    process.exit(1);
  }
  console.log('GATE I5 EN VERDE -- LEF Bloque VII, Incremento 5 (Content Coverage Matrix, solo lectura).');
  console.log('');
  console.log('Recordatorio de alcance (§12.5): la matriz NO calcula cobertura curricular PAES oficial');
  console.log('(CMS-001 no existe en el esquema), NO incluye errores frecuentes ni prácticas disponibles');
  console.log('(no existen como entidades) y NO introduce ninguna ruta de escritura.');
  console.log('`ADMIN-002` sigue PARCIALMENTE satisfecho: la verificación adicional / segundo factor');
  console.log('permanece DIFERIDA (§9.6). Retención administrativa del AdminActor: DIFERIDA sin número (§11.4).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
