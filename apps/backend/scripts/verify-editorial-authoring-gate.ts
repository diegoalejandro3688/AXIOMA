// Gate del LEF Bloque VII ("Plataforma Editorial"), Incremento 4 --
// "Autoría: crear borrador y publicar versión nueva".
// Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §12.4 (frontera) y §13.4 (los ocho
// criterios de cierre, citados literalmente sobre cada bloque de este archivo).
//
// Contra el BACKEND REAL ya levantado y contra PostgreSQL REAL (conexión
// directa `pg` para inspección), mismo patrón que
// `verify-editorial-transitions-gate.ts` (I3), `verify-admin-identity-gate.ts`
// (I2) y `verify-education-published-immutability-gate.ts` (I1).
//
// DIFERENCIA DE FONDO CON EL GATE DEL INCREMENTO 3: aquel tuvo que sembrar sus
// fixtures por INSERCIÓN DIRECTA porque no existía ninguna ruta productiva
// capaz de dejar una versión en DRAFT. Este gate NO lo hace: el Incremento 4
// construye precisamente esa ruta, de modo que TODO el contenido que este gate
// usa se crea por la API real, con un actor administrativo real y su token
// real. Esa es la demostración del criterio 259 ("el contenido puede crearse
// sin modificar código") y de `PRD-D052`.
//
// NUNCA gasta Anthropic: no llama a ningún endpoint de generación de `/ai`.
//
// Uso:
//   node dist/main.js            (en otra terminal, con PORT propio)
//   npm run verify:editorial-authoring-gate -- http://127.0.0.1:<PORT>
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

/** Igual que en los gates de I2 e I3: mide el CÓDIGO, no los docstrings. */
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

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ==========================================================================
  // 0. Identidad del proceso bajo prueba -- protocolo obligatorio.
  //
  // Un puerto residual de una sesión anterior serviría un binario ANTIGUO y el
  // gate mediría otra cosa. La ruta de T1 debe EXISTIR: sin credencial debe
  // responder 401, nunca 404.
  // ==========================================================================
  console.log('--- 0. Identidad del proceso bajo prueba (anti-puerto-residual) ---');
  const probe = await req('POST', '/administration/editorial/questions', {}, {});
  check(
    `el backend en ${base} expone POST /administration/editorial/questions (401, no 404) -> es el binario del Incremento 4`,
    probe.status === 401,
    `status=${probe.status}`,
  );
  if (probe.status === 404) {
    console.error('       -> 404: el proceso escuchando en este puerto NO tiene la superficie de autoría del Incremento 4.');
    console.error('       -> Es un servidor residual. Mátalo y levanta `node dist/main.js` de este build.');
    process.exit(1);
  }
  const probePatch = await req('PATCH', `/administration/editorial/question-versions/${randomUUID()}`, {}, {});
  check('PATCH /administration/editorial/question-versions/:id existe (401, no 404) -> T2 construida', probePatch.status === 401, `status=${probePatch.status}`);

  // ==========================================================================
  // 0.b Actores administrativos REALES, por el CLI del Incremento 2.
  //
  // Ninguna fila de `admin_actor` ni de `admin_actor_token` se inserta a mano:
  // el token viaja hasheado y el gate solo conoce su valor en claro porque el
  // CLI lo emitió. Es la misma ruta que usará una persona real.
  // ==========================================================================
  console.log('--- 0.b Actores administrativos reales (CLI del Incremento 2) ---');
  const author = bootstrapActor(`Autor I4 ${suffix}`, 'AUTHOR');
  const author2 = bootstrapActor(`Segundo autor I4 ${suffix}`, 'AUTHOR');
  const publisher = bootstrapActor(`Publicador I4 ${suffix}`, 'PUBLISHER');
  check('CLI crea un actor con rol AUTHOR y emite su token personal', author.status === 0 && !!author.token, author.stderr);
  check('CLI crea un SEGUNDO actor AUTHOR (necesario para separar autoría de aprobación)', author2.status === 0 && !!author2.token, author2.stderr);
  check('CLI crea un actor con rol PUBLISHER', publisher.status === 0 && !!publisher.token, publisher.stderr);
  if (!author.token || !publisher.token || !author2.token) {
    console.error('Sin actores no se puede continuar.');
    process.exit(1);
  }

  // ==========================================================================
  // 0.c Referencias canónicas AISLADAS POR CORRIDA.
  //
  // DISCIPLINA DE FIXTURES (I1): el contenido que llega a publicarse NO puede
  // borrarse (invariante 3, sin bypass) y no se despublica nada del catálogo
  // sembrado. El aislamiento sustituye a la limpieza: materia y temas propios
  // por corrida, con identidades propias, sin tocar el seed.
  //
  // Materia y tema se insertan por `pg` porque NO son contenido editorial:
  // `subject` y `curriculum_topic` están fuera del alcance de §8.2 (que habla
  // de `question_version`/`learning_resource_version`) y el Incremento 4 no
  // construye --ni debe construir-- una ruta de autoría de taxonomía
  // curricular: la taxonomía PAES oficial es `CMS-001`, explícitamente FUERA
  // de alcance (§12.5). Todo lo que SÍ es contenido editorial se crea por API.
  // ==========================================================================
  console.log('--- 0.c Referencias canónicas aisladas (materia y temas propios de la corrida) ---');
  const subjectId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Materia del gate de autoría editorial', 'VII4', 'ACTIVE', 992, now(), now())`,
    [subjectId, `lef7-i4-subject-${suffix}`],
  );
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema del gate de autoría editorial', 1, $3, now(), now())`,
    [topicId, `LEF7.I4.TOPIC.${suffix}`, subjectId],
  );
  // Materia ajena: para demostrar que la clasificación curricular cruzada se
  // rechaza (consistencia identidad<->versión<->tema, precondición de T1).
  const otherSubjectId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Materia ajena del gate de autoría', 'VII4X', 'ACTIVE', 993, now(), now())`,
    [otherSubjectId, `lef7-i4-other-subject-${suffix}`],
  );
  const otherTopicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema de otra materia', 1, $3, now(), now())`,
    [otherTopicId, `LEF7.I4.OTHER.${suffix}`, otherSubjectId],
  );
  check('referencias canónicas de la corrida creadas (materia propia, tema propio, materia ajena)', true);

  let seq = 0;
  const nextKey = () => `LEF7.I4.Q${++seq}.${suffix}`;

  /** Cuerpo de T1 válido y COMPLETO (pasa CMS-013). */
  function validQuestionBody(over: Record<string, unknown> = {}) {
    return {
      questionKey: nextKey(),
      primarySubjectId: subjectId,
      curriculumTopicId: topicId,
      stemContent: BLOCKS('¿Cuánto es el 20% de 50?'),
      explanationContent: BLOCKS('El 20% de 50 es 50 * 20 / 100 = 10.'),
      answerOptions: [
        { content: P('10'), isCorrect: true },
        { content: P('20'), isCorrect: false },
        { content: P('30'), isCorrect: false },
        { content: P('40'), isCorrect: false },
      ],
      ...over,
    };
  }

  // ==========================================================================
  // 1. §13.4 punto 1 -- "Crear una pregunta completa vía API deja la versión en
  //    DRAFT, INVISIBLE en los cuatro lectores y en todo endpoint del
  //    estudiante".
  //
  // Este es también el criterio 259 y `PRD-D052`: contenido creado SIN
  // modificar código y SIN escribir SQL.
  // ==========================================================================
  console.log('--- 1. T1 -- crear pregunta completa vía API deja la versión en DRAFT (§13.4 punto 1) ---');
  const created = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody());
  check('T1 (crear pregunta) por un Autor -> 2xx', created.status === 200 || created.status === 201, `status=${created.status} ${created.raw.slice(0, 400)}`);
  const questionId = created.body?.identityId as string;
  const draftVersionId = created.body?.versionId as string;
  check('T1 devuelve identityId (question.id) y versionId', !!questionId && !!draftVersionId, created.raw.slice(0, 300));
  check("T1 devuelve editorialStatus 'DRAFT' -- nunca otro estado", created.body?.editorialStatus === 'DRAFT', String(created.body?.editorialStatus));

  const dbRow = await pg.query(
    `SELECT editorial_status, published_at, curriculum_topic_id, question_id FROM question_version WHERE id = $1`,
    [draftVersionId],
  );
  check('en PostgreSQL la versión nació en DRAFT', dbRow.rows[0]?.editorial_status === 'DRAFT', String(dbRow.rows[0]?.editorial_status));
  check('en PostgreSQL `published_at` es NULL (§8.2 fila T1: "publishedAt nulo")', dbRow.rows[0]?.published_at === null);
  check('la versión quedó clasificada en el tema pedido', dbRow.rows[0]?.curriculum_topic_id === topicId);
  const optRows = await pg.query(
    `SELECT display_order, is_correct FROM answer_option WHERE question_version_id = $1 ORDER BY display_order`,
    [draftVersionId],
  );
  check('las 4 alternativas se crearon con display_order 0..3 sin huecos', optRows.rows.map((r: any) => r.display_order).join(',') === '0,1,2,3');
  check('exactamente una alternativa quedó marcada como correcta', optRows.rows.filter((r: any) => r.is_correct).length === 1);
  check('la identidad `question` se creó con questionType SINGLE_CHOICE (único valor de M1)',
    (await pg.query(`SELECT question_type FROM question WHERE id = $1`, [questionId])).rows[0]?.question_type === 'SINGLE_CHOICE');

  // --- Invisibilidad para el estudiante (invariante 8).
  const uid = `lef7-i4-${suffix}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  const STUDENT = { authorization: `Bearer ${idToken}`, 'x-session-id': session.body?.sessionId as string };
  check('sesión de estudiante creada para ejercer los lectores', !!session.body?.sessionId, session.raw.slice(0, 200));

  const catalogDraft = await req('GET', `/education/topics/${topicId}/questions`, STUDENT);
  const draftVisible = Array.isArray(catalogDraft.body) && catalogDraft.body.some((q: any) => q.versionId === draftVersionId);
  check('lector 1 (EducationService, catálogo de preguntas): la versión DRAFT NO aparece', !draftVisible, catalogDraft.raw.slice(0, 300));

  const progressDraft = await req('POST', `/progress/topics/${topicId}/responses`, STUDENT, {
    questionVersionId: draftVersionId,
    answerOptionId: (await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 LIMIT 1`, [draftVersionId])).rows[0].id,
    operationId: randomUUID(),
  });
  check('lector 2 (ProgressService): responder una versión DRAFT es RECHAZADO', progressDraft.status >= 400, `status=${progressDraft.status}`);

  const aiDraft = await req('POST', '/ai/me/conversations', STUDENT, { contextQuestionVersionId: draftVersionId });
  check('lector 3 (Tutor IA, admisión de conversación): una versión DRAFT es RECHAZADA -- sin gasto de Anthropic', aiDraft.status >= 400, `status=${aiDraft.status}`);

  const qqDraft = await req('POST', '/quick-question/sessions', STUDENT, { subjectId });
  const qqServedDraft =
    qqDraft.status < 400 && JSON.stringify(qqDraft.body ?? {}).includes(draftVersionId);
  check('lector 4 (Pregunta rápida): no sirve la versión DRAFT', !qqServedDraft, qqDraft.raw.slice(0, 200));

  const countPublished = await pg.query(
    `SELECT count(*)::int AS n FROM question_version WHERE curriculum_topic_id = $1 AND editorial_status = 'PUBLISHED'`,
    [topicId],
  );
  check('el tema no tiene NINGUNA versión publicada todavía: crear no publica', countPublished.rows[0].n === 0);

  // ==========================================================================
  // 2. FRONTERAS DE T1 -- controles NEGATIVOS.
  //
  // §9.2 y §7.2: T1/T2/T3 son EXCLUSIVAS del rol Autor. El Publicador no crea
  // ni edita contenido, "ni en DRAFT" (menor privilegio, ADMIN-004).
  // ==========================================================================
  console.log('--- 2. Fronteras de T1: rol, estado y elección de identificadores (controles negativos) ---');
  const pubCreate = await req('POST', '/administration/editorial/questions', H(publisher.token), validQuestionBody());
  check('un PUBLICADOR no puede ejecutar T1 (crear) -> 403 (§9.2, §7.2: T1 es exclusiva del Autor)', pubCreate.status === 403, `status=${pubCreate.status}`);

  const anonCreate = await req('POST', '/administration/editorial/questions', {}, validQuestionBody());
  check('sin token administrativo, T1 es rechazada -> 401 (invariante 7)', anonCreate.status === 401, `status=${anonCreate.status}`);

  const opsCreate = await req('POST', '/administration/editorial/questions', { 'x-internal-ops-key': process.env.INTERNAL_OPS_KEY ?? 'x' }, validQuestionBody());
  check('`x-internal-ops-key` NO concede acceso a T1 (decisión B: InternalOpsGuard nunca opera editorialmente)', opsCreate.status === 401 || opsCreate.status === 403, `status=${opsCreate.status}`);

  const withStatus = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody({ editorialStatus: 'PUBLISHED' }));
  check('el cliente NO puede pedir el estado de la versión creada (`editorialStatus` rechazado) -> crear en PUBLISHED no es representable', withStatus.status === 400, `status=${withStatus.status}`);

  const withId = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody({ id: randomUUID() }));
  check('el cliente NO puede elegir el `id` interno de la entidad ni de la versión -> rechazado', withId.status === 400, `status=${withId.status}`);

  const withRole = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody({ role: 'PUBLISHER' }));
  check('el cliente NO puede enviar un rol en la petición (invariante 22) -> rechazado', withRole.status === 400, `status=${withRole.status}`);

  const badSubject = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody({ primarySubjectId: randomUUID() }));
  check('T1 con una materia inexistente es rechazada (referencia canónica)', badSubject.status === 400, `status=${badSubject.status}`);

  const badTopic = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody({ curriculumTopicId: randomUUID() }));
  check('T1 con un tema inexistente es rechazada (referencia canónica)', badTopic.status === 400, `status=${badTopic.status}`);

  const crossTopic = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody({ curriculumTopicId: otherTopicId }));
  check('T1 con un tema de OTRA materia es rechazada (consistencia identidad<->versión<->tema)', crossTopic.status === 400, `status=${crossTopic.status}`);

  const dupKey = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody({ questionKey: (await pg.query(`SELECT question_key FROM question WHERE id = $1`, [questionId])).rows[0].question_key }));
  check('T1 con una clave editorial ya usada es rechazada (unicidad de `question_key`)', dupKey.status >= 400, `status=${dupKey.status}`);

  // ==========================================================================
  // 3. T2 -- EDITAR EN DRAFT (§8.2 fila T2).
  // ==========================================================================
  console.log('--- 3. T2 -- edición en DRAFT, y sus fronteras ---');
  const edited = await req('PATCH', `/administration/editorial/question-versions/${draftVersionId}`, H(author.token), {
    stemContent: BLOCKS('¿Cuánto es el 20% de 50? (enunciado corregido)'),
  });
  check('T2 (editar en DRAFT) por un Autor -> 2xx', edited.status === 200 || edited.status === 201, `status=${edited.status} ${edited.raw.slice(0, 300)}`);
  const stemAfter = await pg.query(`SELECT stem_content, editorial_status FROM question_version WHERE id = $1`, [draftVersionId]);
  check('T2 aplicó el cambio de contenido realmente (control positivo)', JSON.stringify(stemAfter.rows[0].stem_content).includes('corregido'));
  check('T2 NO cambió el estado editorial: sigue en DRAFT', stemAfter.rows[0].editorial_status === 'DRAFT');

  const pubEdit = await req('PATCH', `/administration/editorial/question-versions/${draftVersionId}`, H(publisher.token), { title: 'x' });
  check('un PUBLICADOR no puede ejecutar T2, ni siquiera sobre un DRAFT -> 403 (§7.2 literal)', pubEdit.status === 403, `status=${pubEdit.status}`);

  const editStatus = await req('PATCH', `/administration/editorial/question-versions/${draftVersionId}`, H(author.token), { editorialStatus: 'PUBLISHED' });
  check('T2 NO admite `editorialStatus`: cambiar de estado es una TRANSICIÓN, no una edición', editStatus.status === 400, `status=${editStatus.status}`);

  const editEmpty = await req('PATCH', `/administration/editorial/question-versions/${draftVersionId}`, H(author.token), {});
  check('T2 sin ningún campo de contenido es rechazada (§9.3: se registra la operación que CAMBIA algo)', editEmpty.status === 400, `status=${editEmpty.status}`);

  // T2 sobre una versión PUBLICADA del catálogo sembrado -> rechazo. NO se
  // muta nada: el rechazo es el resultado esperado y la fila queda intacta.
  const seededPublished = await pg.query(`SELECT id, stem_content FROM question_version WHERE editorial_status = 'PUBLISHED' LIMIT 1`);
  if (seededPublished.rows.length > 0) {
    const pubVersionId = seededPublished.rows[0].id;
    const editPublished = await req('PATCH', `/administration/editorial/question-versions/${pubVersionId}`, H(author.token), {
      stemContent: BLOCKS('intento de editar contenido publicado'),
    });
    check('T2 sobre una versión PUBLISHED es rechazada por el servicio (invariante 5: corregir es crear versión NUEVA)', editPublished.status >= 400, `status=${editPublished.status}`);
    const stillIntact = await pg.query(`SELECT stem_content FROM question_version WHERE id = $1`, [pubVersionId]);
    check('la versión PUBLISHED quedó byte-idéntica tras el intento rechazado',
      JSON.stringify(stillIntact.rows[0].stem_content) === JSON.stringify(seededPublished.rows[0].stem_content));
  } else {
    check('FIXTURE: existe al menos una versión PUBLISHED sembrada para probar el rechazo de T2', false, 'no hay contenido publicado en la base');
  }

  // ==========================================================================
  // 4. §13.4 punto 5 -- CMS-013 como PRECONDICIÓN DURA de T3.
  //
  // "Las validaciones de CMS-013 rechazan: cero alternativas correctas, dos
  //  alternativas correctas, alternativas duplicadas, explicación ausente."
  //
  // Se añaden las otras dos reglas que §12.4 nombra: "número válido de
  // alternativas" y "clasificación completa".
  //
  // Cada caso se construye por la API real (T1), no por SQL: es la prueba de
  // que un borrador INCOMPLETO es un estado legítimo --T1 no aplica CMS-013--
  // y de que lo que CMS-013 impide es ENVIARLO A REVISIÓN.
  // ==========================================================================
  console.log('--- 4. CMS-013 -- precondición dura de T3 (§13.4 punto 5, §8.2 fila T3) ---');

  async function createDraft(over: Record<string, unknown>): Promise<string> {
    const r = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody(over));
    if (r.status >= 400) throw new Error(`fixture T1 falló: ${r.raw.slice(0, 300)}`);
    return r.body.versionId as string;
  }
  async function sendToReview(versionId: string, token = author.token) {
    return req('POST', `/administration/editorial/question-versions/${versionId}/transitions`, H(token), {
      targetStatus: 'IN_REVIEW',
    });
  }

  const zeroCorrect = await createDraft({
    answerOptions: [
      { content: P('10'), isCorrect: false },
      { content: P('20'), isCorrect: false },
    ],
  });
  const rZero = await sendToReview(zeroCorrect);
  check('CMS-013 rechaza T3 con CERO alternativas correctas', rZero.status === 400 && /CMS-013/.test(String(rZero.body?.error?.message ?? rZero.raw)), rZero.raw.slice(0, 300));

  const twoCorrect = await createDraft({
    answerOptions: [
      { content: P('10'), isCorrect: true },
      { content: P('20'), isCorrect: true },
    ],
  });
  const rTwo = await sendToReview(twoCorrect);
  check('CMS-013 rechaza T3 con DOS alternativas correctas', rTwo.status === 400 && /CMS-013/.test(String(rTwo.body?.error?.message ?? rTwo.raw)), rTwo.raw.slice(0, 300));

  const duplicated = await createDraft({
    answerOptions: [
      { content: P('10'), isCorrect: true },
      { content: P('  10  '), isCorrect: false },
      { content: P('30'), isCorrect: false },
    ],
  });
  const rDup = await sendToReview(duplicated);
  check('CMS-013 rechaza T3 con alternativas DUPLICADAS (normalizando espaciado y mayúsculas)', rDup.status === 400 && /duplicad/i.test(String(rDup.body?.error?.message ?? rDup.raw)), rDup.raw.slice(0, 300));

  // Explicación ausente: el contrato de T1 exige explicación, de modo que un
  // borrador sin explicación solo puede llegar a existir por escritura directa
  // -- que §7.2 admite para el sujeto "acceso directo a PostgreSQL" sobre
  // filas NO publicadas. Se vacía sobre una versión en DRAFT, sin desactivar
  // ningún trigger, para demostrar que CMS-013 lo detecta igualmente.
  const noExplanation = await createDraft({});
  await pg.query(`UPDATE question_version SET explanation_content = '[]'::jsonb WHERE id = $1`, [noExplanation]);
  const rNoExpl = await sendToReview(noExplanation);
  check('CMS-013 rechaza T3 con EXPLICACIÓN AUSENTE', rNoExpl.status === 400 && /explicaci/i.test(String(rNoExpl.body?.error?.message ?? rNoExpl.raw)), rNoExpl.raw.slice(0, 300));

  const blankExplanation = await createDraft({});
  await pg.query(`UPDATE question_version SET explanation_content = '[{"type":"paragraph","order":0,"text":"   "}]'::jsonb WHERE id = $1`, [blankExplanation]);
  const rBlank = await sendToReview(blankExplanation);
  check('CMS-013 rechaza T3 con una explicación de bloques EN BLANCO (no basta con que la columna no sea NULL)', rBlank.status === 400 && /explicaci/i.test(String(rBlank.body?.error?.message ?? rBlank.raw)), rBlank.raw.slice(0, 300));

  const oneOption = await createDraft({ answerOptions: [{ content: P('10'), isCorrect: true }] });
  const rOne = await sendToReview(oneOption);
  check('CMS-013 rechaza T3 con UNA sola alternativa (§12.4: "número válido de alternativas"; mínimo estructural de SINGLE_CHOICE)', rOne.status === 400 && /alternativas/i.test(String(rOne.body?.error?.message ?? rOne.raw)), rOne.raw.slice(0, 300));

  // Clasificación completa: `curriculum_topic_id` es NOT NULL en el esquema, de
  // modo que "ausente" no es representable en PostgreSQL -- el invariante ya
  // está aplicado por la columna. Lo que sí se comprueba es que la ruta
  // productiva nunca puede dejarla sin resolver (T1 y T2 la rechazan si no
  // existe o si cruza de materia -- ya verificado en el bloque 2).
  const topicNotNull = await pg.query(
    `SELECT is_nullable FROM information_schema.columns WHERE table_name='question_version' AND column_name='curriculum_topic_id'`,
  );
  check('CMS-013 (clasificación completa): `curriculum_topic_id` es NOT NULL en PostgreSQL -- ausencia no representable', topicNotNull.rows[0]?.is_nullable === 'NO');

  // --- CONTROL POSITIVO ANTI-FALSO-NEGATIVO, obligatorio: sin él, "CMS-013
  // rechaza" sería indistinguible de "T3 rechaza siempre".
  const validForReview = await createDraft({});
  const rValid = await sendToReview(validForReview);
  check('CONTROL POSITIVO: un borrador que CUMPLE CMS-013 SÍ pasa a IN_REVIEW', rValid.status === 200 || rValid.status === 201, `status=${rValid.status} ${rValid.raw.slice(0, 300)}`);
  check('T3 dejó la versión en IN_REVIEW en PostgreSQL',
    (await pg.query(`SELECT editorial_status FROM question_version WHERE id = $1`, [validForReview])).rows[0].editorial_status === 'IN_REVIEW');

  // --- Reparación: un borrador rechazado se corrige con T2 y entonces pasa.
  const repaired = await req('PATCH', `/administration/editorial/question-versions/${zeroCorrect}`, H(author.token), {
    answerOptions: [
      { content: P('10'), isCorrect: true },
      { content: P('20'), isCorrect: false },
    ],
  });
  check('T2 repara un borrador que CMS-013 había rechazado', repaired.status === 200 || repaired.status === 201, repaired.raw.slice(0, 200));
  const rRepaired = await sendToReview(zeroCorrect);
  check('tras la reparación por T2, el MISMO borrador SÍ pasa a IN_REVIEW', rRepaired.status === 200 || rRepaired.status === 201, rRepaired.raw.slice(0, 300));

  // ==========================================================================
  // 5. T3 -- ROL Y CONGELAMIENTO.
  // ==========================================================================
  console.log('--- 5. T3 -- rol autorizado y congelamiento de la edición (§8.2, §9.2) ---');
  const draftForRole = await createDraft({});
  const pubT3 = await sendToReview(draftForRole, publisher.token);
  check('un PUBLICADOR no puede ejecutar T3 -> 403 (§9.2: T3 es del Autor)', pubT3.status === 403, `status=${pubT3.status}`);
  const authorT3 = await sendToReview(draftForRole, author.token);
  check('CONTROL POSITIVO: el AUTOR sí puede ejecutar T3 sobre la misma versión', authorT3.status === 200 || authorT3.status === 201, authorT3.raw.slice(0, 300));

  const editInReview = await req('PATCH', `/administration/editorial/question-versions/${draftForRole}`, H(author.token), {
    stemContent: BLOCKS('intento de editar en IN_REVIEW'),
  });
  check('T3 CONGELA la edición: T2 sobre una versión en IN_REVIEW es rechazada (§8.2, efecto de T3)', editInReview.status >= 400, `status=${editInReview.status}`);
  check('el mensaje explica que hay que devolverla a DRAFT con T4', /T4|DRAFT/.test(String(editInReview.body?.error?.message ?? editInReview.raw)), editInReview.raw.slice(0, 250));

  // T4 (Incremento 3) reabre y T2 vuelve a funcionar: la integración con I3 es real.
  const t4 = await req('POST', `/administration/editorial/question-versions/${draftForRole}/transitions`, H(author.token), {
    targetStatus: 'DRAFT',
    reason: 'Devolución del gate I4 para demostrar que T4 (Incremento 3) reabre la edición.',
  });
  check('T4 (Incremento 3, intacta) devuelve la versión a DRAFT', t4.status === 200 || t4.status === 201, t4.raw.slice(0, 250));
  const editAfterT4 = await req('PATCH', `/administration/editorial/question-versions/${draftForRole}`, H(author.token), {
    stemContent: BLOCKS('edición permitida tras T4'),
  });
  check('tras T4, T2 vuelve a estar permitida (I4 e I3 componen sin romperse)', editAfterT4.status === 200 || editAfterT4.status === 201, editAfterT4.raw.slice(0, 250));

  // ==========================================================================
  // 6. NO SE PUEDE SALTAR A APPROVED NI A PUBLISHED.
  //
  // §8.4, prohibiciones estructurales: "no existe transición directa
  // DRAFT -> PUBLISHED, ni DRAFT -> APPROVED, ni IN_REVIEW -> PUBLISHED".
  // Con la superficie de autoría ya construida, esto hay que volver a
  // demostrarlo: es exactamente el riesgo que el Incremento 4 introduce.
  // ==========================================================================
  console.log('--- 6. Ninguna ruta de autoría permite saltar a APPROVED ni a PUBLISHED (§8.4) ---');
  const skipDraft = await createDraft({});
  for (const target of ['APPROVED', 'PUBLISHED'] as const) {
    for (const [who, token] of [['Autor', author.token], ['Publicador', publisher.token]] as const) {
      const r = await req('POST', `/administration/editorial/question-versions/${skipDraft}/transitions`, H(token), { targetStatus: target, operationId: randomUUID(), reason: 'intento de salto' });
      check(`salto directo DRAFT -> ${target} por el ${who} es RECHAZADO`, r.status >= 400, `status=${r.status}`);
    }
  }
  const skipReview = await createDraft({});
  await sendToReview(skipReview);
  const inReviewToPublished = await req('POST', `/administration/editorial/question-versions/${skipReview}/transitions`, H(publisher.token), { targetStatus: 'PUBLISHED', operationId: randomUUID() });
  check('salto IN_REVIEW -> PUBLISHED es RECHAZADO (publicar exige pasar por APPROVED)', inReviewToPublished.status >= 400, `status=${inReviewToPublished.status}`);
  const toArchived = await req('POST', `/administration/editorial/question-versions/${skipReview}/transitions`, H(publisher.token), { targetStatus: 'ARCHIVED' });
  check('ARCHIVED sigue inalcanzable desde la superficie de autoría (invariante 21, DG-8)', toArchived.status >= 400, `status=${toArchived.status}`);
  check('en PostgreSQL la versión sigue en IN_REVIEW tras los intentos de salto',
    (await pg.query(`SELECT editorial_status FROM question_version WHERE id = $1`, [skipReview])).rows[0].editorial_status === 'IN_REVIEW');

  // ==========================================================================
  // 7. FLUJO COMPLETO DE EXTREMO A EXTREMO: T1 -> T2 -> T3 -> T5 -> T7.
  //
  // T5 y T7 son del Incremento 3 y NO se modificaron. Este bloque demuestra
  // que I4 e I3 componen: la superficie nueva alimenta la máquina de estados
  // existente sin tocarla.
  //
  // CMS-018 (invariante 9) obliga a que quien aprueba y publica NO sea el
  // autor -- y ahora la autoría es REAL, registrada por T1/T2, no una fixture
  // sembrada a mano como en el gate del Incremento 3.
  // ==========================================================================
  console.log('--- 7. Flujo completo T1 -> T2 -> T3 -> T5 -> T7 de extremo a extremo (§13.4 puntos 2, 3, 4) ---');
  const flowCreate = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody());
  const flowQuestionId = flowCreate.body.identityId as string;
  const flowV1 = flowCreate.body.versionId as string;
  check('FLUJO T1: pregunta creada en DRAFT', flowCreate.status < 400, flowCreate.raw.slice(0, 250));

  const flowEdit = await req('PATCH', `/administration/editorial/question-versions/${flowV1}`, H(author.token), {
    explanationContent: BLOCKS('Explicación afinada por el autor antes de enviar a revisión.'),
  });
  check('FLUJO T2: el autor afina la explicación en DRAFT', flowEdit.status < 400, flowEdit.raw.slice(0, 250));

  const flowReview = await sendToReview(flowV1);
  check('FLUJO T3: la versión pasa a IN_REVIEW con CMS-013 en PASS', flowReview.status < 400, flowReview.raw.slice(0, 250));

  const selfApprove = await req('POST', `/administration/editorial/question-versions/${flowV1}/transitions`, H(author.token), { targetStatus: 'APPROVED' });
  check('CMS-018 sigue vigente con autoría REAL: el propio autor no puede aprobar su versión', selfApprove.status >= 400, `status=${selfApprove.status}`);

  const flowApprove = await req('POST', `/administration/editorial/question-versions/${flowV1}/transitions`, H(publisher.token), { targetStatus: 'APPROVED' });
  check('FLUJO T5 (Incremento 3, intacta): un Publicador distinto del autor aprueba', flowApprove.status < 400, flowApprove.raw.slice(0, 300));

  const flowPublish = await req('POST', `/administration/editorial/question-versions/${flowV1}/transitions`, H(publisher.token), { targetStatus: 'PUBLISHED', operationId: randomUUID() });
  check('FLUJO T7 (Incremento 3, intacta): la versión se publica', flowPublish.status < 400, flowPublish.raw.slice(0, 300));
  const publishedRow = await pg.query(`SELECT editorial_status, published_at FROM question_version WHERE id = $1`, [flowV1]);
  check('la versión quedó PUBLISHED con `published_at` fijado', publishedRow.rows[0].editorial_status === 'PUBLISHED' && publishedRow.rows[0].published_at !== null);
  const stemV1 = await pg.query(`SELECT stem_content, explanation_content FROM question_version WHERE id = $1`, [flowV1]);

  // --- El estudiante YA la ve: el ciclo editorial completo se cerró sin SQL
  // manual, sin editar código y sin desplegar mobile (invariantes 12 y 13).
  const catalogPublished = await req('GET', `/education/topics/${topicId}/questions`, STUDENT);
  const nowVisible = Array.isArray(catalogPublished.body) && catalogPublished.body.some((q: any) => q.versionId === flowV1);
  check('el ESTUDIANTE ve la pregunta recién publicada -- criterio 259 / PRD-D052 cerrados de extremo a extremo', nowVisible, catalogPublished.raw.slice(0, 300));
  const anyIsCorrect = JSON.stringify(catalogPublished.body ?? {}).includes('isCorrect');
  check('el catálogo del estudiante sigue SIN exponer `isCorrect` (invariante ya vigente, no degradado)', !anyIsCorrect);

  // El estudiante RESPONDE la versión recién publicada. Se hace AHORA, antes de
  // publicar la corrección, para que §13.4 punto 4 se pueda comprobar de
  // verdad después: sin una respuesta previa, "el StudentResponse sobrevive"
  // sería una tautología sobre un conjunto vacío.
  const v1OptionId = (await pg.query(
    `SELECT id FROM answer_option WHERE question_version_id = $1 ORDER BY display_order LIMIT 1`,
    [flowV1],
  )).rows[0].id;
  const answered = await req('POST', `/progress/topics/${topicId}/responses`, STUDENT, {
    questionVersionId: flowV1,
    answerOptionId: v1OptionId,
    operationId: randomUUID(),
  });
  check('el estudiante puede RESPONDER la versión recién publicada por el ciclo editorial completo', answered.status < 400, `status=${answered.status} ${answered.raw.slice(0, 250)}`);

  // ==========================================================================
  // 8. §13.4 punto 2 -- CORRECCIÓN: publicar una versión nueva deja EXACTAMENTE
  //    UNA versión PUBLISHED por identidad, y `findPublishedByTopicId` no
  //    devuelve duplicados.
  //
  // La versión nueva se crea por la ruta de autoría (T1 sobre identidad
  // existente): es la forma canónica de corregir (invariante 5, CMS-025).
  // ==========================================================================
  console.log('--- 8. Corrección publicando versión NUEVA: unicidad y no-duplicación (§13.4 punto 2) ---');
  const v2Create = await req('POST', `/administration/editorial/questions/${flowQuestionId}/versions`, H(author.token), {
    curriculumTopicId: topicId,
    stemContent: BLOCKS('¿Cuánto es el 20% de 50? (versión corregida)'),
    explanationContent: BLOCKS('Corrección: 50 * 20 / 100 = 10.'),
    answerOptions: [
      { content: P('10'), isCorrect: true },
      { content: P('20'), isCorrect: false },
      { content: P('25'), isCorrect: false },
    ],
  });
  check('T1 sobre una identidad EXISTENTE crea una versión DRAFT nueva (corregir = versión nueva)', v2Create.status < 400, v2Create.raw.slice(0, 300));
  const flowV2 = v2Create.body.versionId as string;
  check('la versión nueva pertenece a la MISMA identidad lógica', v2Create.body.identityId === flowQuestionId);
  check('la versión nueva nació en DRAFT, no publicada', v2Create.body.editorialStatus === 'DRAFT');
  const stillOnePublished = await pg.query(
    `SELECT count(*)::int AS n FROM question_version WHERE question_id = $1 AND editorial_status = 'PUBLISHED'`,
    [flowQuestionId],
  );
  check('crear la versión nueva NO despublicó nada todavía: sigue habiendo exactamente 1 publicada', stillOnePublished.rows[0].n === 1);

  await sendToReview(flowV2);
  await req('POST', `/administration/editorial/question-versions/${flowV2}/transitions`, H(publisher.token), { targetStatus: 'APPROVED' });
  const publishV2 = await req('POST', `/administration/editorial/question-versions/${flowV2}/transitions`, H(publisher.token), { targetStatus: 'PUBLISHED', operationId: randomUUID() });
  check('T7 publica la corrección', publishV2.status < 400, publishV2.raw.slice(0, 300));
  check('T7 informa qué versión despublicó por supersesión (§8.6)', publishV2.body?.supersededVersionId === flowV1, String(publishV2.body?.supersededVersionId));

  const uniqueness = await pg.query(
    `SELECT editorial_status, count(*)::int AS n FROM question_version WHERE question_id = $1 GROUP BY editorial_status ORDER BY 1`,
    [flowQuestionId],
  );
  const publishedCount = uniqueness.rows.find((r: any) => r.editorial_status === 'PUBLISHED')?.n ?? 0;
  const deprecatedCount = uniqueness.rows.find((r: any) => r.editorial_status === 'DEPRECATED')?.n ?? 0;
  check('tras publicar la corrección hay EXACTAMENTE UNA versión PUBLISHED de la identidad (invariante 16)', publishedCount === 1, JSON.stringify(uniqueness.rows));
  check('la versión anterior quedó DEPRECATED en la MISMA operación', deprecatedCount === 1, JSON.stringify(uniqueness.rows));

  const catalogAfter = await req('GET', `/education/topics/${topicId}/questions`, STUDENT);
  const occurrences = Array.isArray(catalogAfter.body)
    ? catalogAfter.body.filter((q: any) => q.questionId === flowQuestionId || q.id === flowQuestionId).length
    : -1;
  const servesV2 = Array.isArray(catalogAfter.body) && catalogAfter.body.some((q: any) => q.versionId === flowV2);
  const servesV1 = Array.isArray(catalogAfter.body) && catalogAfter.body.some((q: any) => q.versionId === flowV1);
  check('`findPublishedByTopicId` NO devuelve duplicados de la misma pregunta (§13.4 punto 2)', occurrences <= 1, `occurrences=${occurrences} ${catalogAfter.raw.slice(0, 300)}`);
  check('el estudiante ve la versión NUEVA', servesV2, catalogAfter.raw.slice(0, 300));
  check('el estudiante YA NO ve la versión anterior', !servesV1);

  // --- §13.4 punto 3: la versión anterior permanece ÍNTEGRA y referenciable.
  const stemV1After = await pg.query(`SELECT stem_content, explanation_content, published_at FROM question_version WHERE id = $1`, [flowV1]);
  check('§13.4 punto 3: el contenido de la versión anterior es BYTE-IDÉNTICO antes y después de ser sustituida',
    JSON.stringify(stemV1After.rows[0].stem_content) === JSON.stringify(stemV1.rows[0].stem_content) &&
      JSON.stringify(stemV1After.rows[0].explanation_content) === JSON.stringify(stemV1.rows[0].explanation_content));
  check('`published_at` de la versión anterior NO se modificó: es un hecho histórico (§8.2 fila T8)', stemV1After.rows[0].published_at !== null);
  const v1Options = await pg.query(`SELECT count(*)::int AS n FROM answer_option WHERE question_version_id = $1`, [flowV1]);
  check('las alternativas de la versión anterior siguen existiendo íntegras', v1Options.rows[0].n === 4);

  // ==========================================================================
  // 9. §13.4 punto 4 -- los `StudentResponse` de la versión antigua conservan
  //    `isCorrect` y su alternativa.
  //
  // La respuesta se registra ANTES de publicar la corrección; se comprueba
  // después. Es lo que hace la comprobación real y no una tautología.
  // ==========================================================================
  console.log('--- 9. Los StudentResponse de la versión antigua sobreviven íntegros (§13.4 punto 4) ---');
  const historic = await pg.query(
    `SELECT is_correct, answer_option_id FROM student_response WHERE question_version_id = $1 ORDER BY responded_at DESC LIMIT 1`,
    [flowV1],
  );
  if (historic.rows.length === 0) {
    // No hubo respuesta sobre v1 en esta corrida: se comprueba sobre el
    // catálogo sembrado, que sí tiene respuestas históricas, para que el
    // criterio quede realmente ejercido en vez de omitido.
    const anyHistoric = await pg.query(
      `SELECT sr.is_correct, sr.answer_option_id, qv.editorial_status
       FROM student_response sr JOIN question_version qv ON qv.id = sr.question_version_id LIMIT 1`,
    );
    check('los StudentResponse históricos conservan `isCorrect` y `answerOptionId` no nulos',
      anyHistoric.rows.length === 0 || (anyHistoric.rows[0].is_correct !== null && anyHistoric.rows[0].answer_option_id !== null),
      JSON.stringify(anyHistoric.rows[0] ?? {}));
  } else {
    check('el StudentResponse sobre la versión sustituida conserva `isCorrect` y su alternativa',
      historic.rows[0].is_correct !== null && historic.rows[0].answer_option_id !== null);
  }
  const srImmutable = await pg
    .query(`UPDATE student_response SET is_correct = NOT is_correct WHERE question_version_id = $1`, [flowV1])
    .then(() => null)
    .catch((e: Error) => e.message);
  check('`student_response` sigue siendo inmutable en PostgreSQL (garantía preexistente no degradada)',
    srImmutable !== null || historic.rows.length === 0, String(srImmutable));

  // ==========================================================================
  // 10. AUDITORÍA de T1/T2/T3 en `admin_action` (§9.3, los nueve campos).
  //
  // Mismo ledger, misma tabla, mismo repositorio del Incremento 3 -- NO se
  // reimplementó nada.
  // ==========================================================================
  console.log('--- 10. Auditoría de T1/T2/T3 en `admin_action` con los campos de §9.3 ---');
  const audit = await req('GET', `/administration/editorial/actions?objectType=QUESTION_VERSION&objectId=${flowV1}`, H(author.token));
  check('la auditoría de la versión es consultable por la API del Incremento 3', audit.status === 200, audit.raw.slice(0, 250));
  const actions = (audit.body?.actions ?? []) as any[];
  const types = actions.map((a) => a.actionType);
  check('la auditoría contiene T1 (creación) producido por una ruta PRODUCTIVA, no por una fixture', types.includes('T1'), types.join(','));
  check('la auditoría contiene T2 (edición)', types.includes('T2'), types.join(','));
  check('la auditoría contiene T3 (envío a revisión)', types.includes('T3'), types.join(','));
  check('la auditoría contiene además T5 y T7 del Incremento 3, en el mismo ledger', types.includes('T5') && types.includes('T7'), types.join(','));
  check('el orden cronológico del ledger es T1 -> T2 -> T3 -> T5 -> T7', types.join(',').startsWith('T1,T2,T3,T5,T7'), types.join(','));

  const t1Action = actions.find((a) => a.actionType === 'T1');
  check('§9.3 campo 1 -- actor: T1 quedó atribuido al AUTOR real que la ejecutó', t1Action?.actorId === author.actorId, `${t1Action?.actorId} vs ${author.actorId}`);
  check('§9.3 campo 2 -- rol ejercido: AUTHOR', t1Action?.roleExercised === 'AUTHOR', String(t1Action?.roleExercised));
  check('§9.3 campo 3 -- momento presente', typeof t1Action?.occurredAt === 'string' && t1Action.occurredAt.length > 0);
  check('§9.3 campo 5 -- objeto afectado: tipo e identificador de la fila', t1Action?.objectType === 'QUESTION_VERSION' && t1Action?.objectId === flowV1);
  check('§9.3 campo 6 -- en T1 el estado previo es null ("(inexistente) -> DRAFT") y el nuevo es DRAFT', t1Action?.previousStatus === null && t1Action?.newStatus === 'DRAFT', JSON.stringify([t1Action?.previousStatus, t1Action?.newStatus]));
  check('§9.3 campo 9 -- T1 NUNCA lleva marca de excepción de CMS-018 (§8.5 la acota a T5 y T7)', t1Action?.cms018Exception === null);
  check('§9.3 -- la auditoría NO contiene contenido académico: guarda REFERENCIAS', !/stemContent|explanationContent|contentBlocks|isCorrect/.test(JSON.stringify(actions)));

  const t2Action = actions.find((a) => a.actionType === 'T2');
  check('§9.3 campo 6 en T2: DRAFT -> DRAFT (la edición no cambia el estado)', t2Action?.previousStatus === 'DRAFT' && t2Action?.newStatus === 'DRAFT', JSON.stringify([t2Action?.previousStatus, t2Action?.newStatus]));
  const t3Action = actions.find((a) => a.actionType === 'T3');
  check('§9.3 campo 6 en T3: DRAFT -> IN_REVIEW', t3Action?.previousStatus === 'DRAFT' && t3Action?.newStatus === 'IN_REVIEW', JSON.stringify([t3Action?.previousStatus, t3Action?.newStatus]));
  check('§9.3 campo 2 en T3: rol ejercido AUTHOR', t3Action?.roleExercised === 'AUTHOR', String(t3Action?.roleExercised));

  const ledgerImmutable = await pg
    .query(`UPDATE admin_action SET reason = 'manipulado' WHERE id = $1`, [t1Action?.id])
    .then(() => null)
    .catch((e: Error) => e.message);
  check('`admin_action` sigue siendo append-only en PostgreSQL: un UPDATE sobre el registro de T1 FALLA', ledgerImmutable !== null, String(ledgerImmutable));

  const cms018Uses = await req('GET', '/administration/editorial/cms018-exception-uses', H(author.token));
  check('el registro de usos de la excepción de CMS-018 sigue siendo consultable y este flujo NO la usó',
    cms018Uses.status === 200 && !(cms018Uses.body?.actions ?? []).some((a: any) => a.objectId === flowV1 || a.objectId === flowV2),
    cms018Uses.raw.slice(0, 200));

  // ==========================================================================
  // 11. IDEMPOTENCIA de T1/T2 (invariante 11).
  //
  // §8.2 exige clave de idempotencia SOLO en T7 y T8, de modo que aquí es
  // OPCIONAL. Lo que el gate comprueba es que, si el cliente la envía, se
  // HONRA -- no que sea obligatoria, porque el contrato no lo pide.
  // ==========================================================================
  console.log('--- 11. Idempotencia opcional de T1/T2 (invariante 11; §8.2 solo la EXIGE en T7/T8) ---');
  const opId = randomUUID();
  const body1 = validQuestionBody({ operationId: opId });
  const first = await req('POST', '/administration/editorial/questions', H(author.token), body1);
  check('T1 con clave de idempotencia -> 2xx', first.status < 400, first.raw.slice(0, 250));
  const replay = await req('POST', '/administration/editorial/questions', H(author.token), { ...body1, questionKey: `${body1.questionKey}.replay` });
  check('reenviar la MISMA clave devuelve la operación anterior sin repetir el efecto', replay.body?.versionId === first.body?.versionId && replay.body?.idempotentReplay === true, replay.raw.slice(0, 250));
  const dupActions = await pg.query(`SELECT count(*)::int AS n FROM admin_action WHERE operation_id = $1`, [opId]);
  check('la repetición NO duplicó el registro de auditoría', dupActions.rows[0].n === 1, JSON.stringify(dupActions.rows));
  const noSecondQuestion = await pg.query(`SELECT count(*)::int AS n FROM question WHERE question_key = $1`, [`${body1.questionKey}.replay`]);
  check('la repetición NO creó una segunda pregunta', noSecondQuestion.rows[0].n === 0);

  const noKeyIsFine = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody());
  check('T1 SIN clave de idempotencia sigue siendo válida: el contrato no la exige en T1/T2', noKeyIsFine.status < 400, `status=${noKeyIsFine.status}`);

  // ==========================================================================
  // 12. FÓRMULAS -- §12.4, ADR-0002/ADR-0013: el SVG se genera en el servidor,
  //     una sola vez, al escribir el contenido. El autor solo envía LaTeX.
  // ==========================================================================
  console.log('--- 12. Fórmulas: el autor envía LaTeX, el backend genera el SVG (§12.4, ADR-0002/0013) ---');
  const withFormula = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody({
    stemContent: [{ type: 'formula', order: 0, latex: '\\frac{v \\times p}{100}' }],
  }));
  check('T1 acepta un bloque de fórmula con SOLO `latex` (sin `svg`)', withFormula.status < 400, withFormula.raw.slice(0, 300));
  const formulaStored = await pg.query(`SELECT stem_content FROM question_version WHERE id = $1`, [withFormula.body?.versionId]);
  const storedJson = JSON.stringify(formulaStored.rows[0]?.stem_content ?? {});
  check('el bloque persistido contiene el SVG generado por el backend', /"svg":"<svg/.test(storedJson) || /<svg/.test(storedJson), storedJson.slice(0, 200));
  check('el bloque persistido conserva el LaTeX como fuente de verdad (ADR-0002)', /"latex"/.test(storedJson));

  const badLatex = await req('POST', '/administration/editorial/questions', H(author.token), validQuestionBody({
    stemContent: [{ type: 'formula', order: 0, latex: '\\frac{' }],
  }));
  check('un LaTeX que no se puede renderizar NO se persiste como si fuera válido -> rechazo', badLatex.status >= 400, `status=${badLatex.status}`);

  // ==========================================================================
  // 13. §13.4 punto 7 -- "Ninguna operación de este incremento puede mutar una
  //     fila publicada": se RE-EJECUTA el gate del Incremento 1 como parte de
  //     éste, después de que toda la superficie de autoría haya operado.
  // ==========================================================================
  console.log('--- 13. Re-ejecución del gate del Incremento 1 (§13.4 punto 7) ---');
  const i1 = spawnSync('npm', ['run', '--silent', 'verify:education-published-immutability-gate', '--', base], {
    cwd: backendDir, encoding: 'utf8', shell: process.platform === 'win32',
  });
  check('`verify:education-published-immutability-gate` sigue en VERDE tras operar toda la superficie de autoría de I4',
    i1.status === 0, (i1.stdout ?? '').split('\n').filter((l) => /FALLO/.test(l)).slice(0, 5).join(' | ') || i1.stderr?.slice(0, 400));

  // §13.4 punto 6 -- el gate de aislamiento de la clave de respuesta, CON su
  // control positivo, sigue verde. Sin él, el punto no demostraría nada.
  console.log('--- 13.b §13.4 punto 6 -- `verify:ai-answerkey-isolation-gate` sigue verde con su control positivo ---');
  const ak = spawnSync('npm', ['run', '--silent', 'verify:ai-answerkey-isolation-gate', '--', base], {
    cwd: backendDir, encoding: 'utf8', shell: process.platform === 'win32',
  });
  check('`verify:ai-answerkey-isolation-gate` en VERDE (§13.4 punto 6)', ak.status === 0, (ak.stdout ?? '').split('\n').filter((l) => /FALLO/.test(l)).slice(0, 5).join(' | ') || ak.stderr?.slice(0, 400));

  // ==========================================================================
  // 14. FRONTERA ESTÁTICA -- lo que el Incremento 4 NO construye.
  //
  // Mismo método que I1/I2/I3: grep sobre el CÓDIGO ejecutable (sin
  // comentarios), no sobre la lista de carpetas.
  // ==========================================================================
  console.log('--- 14. Frontera del Incremento 4: I5 e I6 siguen sin construir (comprobación estática) ---');
  const allSrc = collectTsFiles(srcDir).map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');
  const adminEditorialCode = ['administration', 'editorial']
    .map((d) => join(srcDir, d))
    .flatMap(collectTsFiles)
    .map((f) => stripComments(readFileSync(f, 'utf8')))
    .join('\n');
  const educationCode = collectTsFiles(join(srcDir, 'education')).map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');

  check('Incremento 5 NO construido: no existe ninguna Content Coverage Matrix', !/coverage[_-]?matrix|coveragematrix/i.test(allSrc));
  check('importación masiva sigue diferida (CMS-026..029): ningún módulo la implementa', !/bulk[_-]?import|importjob|import[_-]?batch|importcontent|content[_-]?import/i.test(allSrc));
  check('vista previa sigue diferida (CMS-007): ningún módulo editorial la implementa', !/editorialpreview|content[_-]?preview/i.test(adminEditorialCode));
  check('Incremento 6 NO construido: no existe ningún CLI de ciclo editorial (crear/publicar por línea de comandos)',
    !existsSync(join(srcDir, 'cli', 'editorial.ts')) && !existsSync(join(srcDir, 'cli', 'publish-content.ts')));
  check('invariante 18: ningún módulo editorial ni de autoría importa el dominio `ai/`',
    !/from\s+['"][^'"]*\/ai\//.test(adminEditorialCode) && !/from\s+['"][^'"]*\/ai\//.test(educationCode));
  check('invariante 17: la superficie editorial no escribe en `xp_ledger_entry` ni en `league_point_ledger_entry`',
    !/xpLedgerEntry|leaguePointLedgerEntry/.test(adminEditorialCode));
  check('invariante 21: ninguna ruta de autoría escribe el literal ARCHIVED',
    !/(editorialStatus|editorial_status)\s*[:=]\s*['"]ARCHIVED['"]/.test(allSrc));
  // El repositorio de autoría es el ÚNICO que crea versiones por ruta
  // productiva. Todo `editorialStatus` que escriba debe ser 'DRAFT': crear
  // directamente en cualquier otro estado sería saltarse la máquina de estados.
  const authoringRepoCode = stripComments(readFileSync(join(srcDir, 'education', 'editorial-authoring.repository.ts'), 'utf8'));
  const statusesWritten = [...authoringRepoCode.matchAll(/editorialStatus:\s*'([A-Z_]+)'/g)].map((m) => m[1]);
  check('el repositorio de autoría escribe SOLO el estado DRAFT (nunca crea en PUBLISHED ni en ningún otro)',
    statusesWritten.length > 0 && statusesWritten.every((s) => s === 'DRAFT'), statusesWritten.join(','));
  check('el repositorio de autoría NUNCA escribe `publishedAt` (lo fija T7, y solo T7)', !/publishedAt:/.test(authoringRepoCode));
  const authoringSvcCode = stripComments(readFileSync(join(srcDir, 'education', 'editorial-authoring.service.ts'), 'utf8'));
  check('el servicio de autoría NO invoca `updateEditorialStatus`: transicionar no es autoría (invariante 4)',
    !/updateEditorialStatus/.test(authoringSvcCode));
  check('el servicio de autoría NO abre acceso propio a las tablas de contenido: solo usa su repositorio',
    !/prisma\.(questionVersion|learningResourceVersion|answerOption|question|learningResource)\./.test(authoringSvcCode));
  check('NINGÚN archivo del backend usa `DISABLE TRIGGER` ni `session_replication_role`',
    !/DISABLE\s+TRIGGER|session_replication_role/i.test(allSrc));
  // Invariante 22 -- mismo método que `verify-editorial-transitions-gate.ts`:
  // se aísla cada bloque de esquema de PETICIÓN (no los de respuesta, donde
  // `actorId` y `roleExercised` son legítimos: son la ATRIBUCIÓN auditada).
  const editorialContract = stripComments(readFileSync(join(repoRoot, 'packages', 'contracts', 'src', 'editorial.ts'), 'utf8'));
  const requestBlocks = [...editorialContract.matchAll(/editorial[A-Za-z]*RequestSchema\s*=\s*z[\s\S]*?\.strict\(\)/g)].map((m) => m[0]);
  check('se localizaron los esquemas de PETICIÓN editorial (transición + las 6 de autoría de I4)', requestBlocks.length === 7, String(requestBlocks.length));
  check('invariante 22: NINGÚN contrato de petición editorial declara un campo de rol o de actor',
    requestBlocks.length > 0 && !requestBlocks.some((b) => /\brole\b|\broles\b|\bactorId\b|\badminActorId\b/.test(b)));
  check('ningún contrato de petición de autoría declara `editorialStatus`, `publishedAt` ni `id` (el estado y los identificadores no son negociables)',
    !requestBlocks.some((b) => /\beditorialStatus\b|\bpublishedAt\b|(^|\s)id:\s*z\./.test(b)));
  check('invariante 15: el controller editorial no importa ningún repositorio de EDUCATION -- solicita al servicio de dominio',
    !/from\s+['"]\.\.\/education\/(question|answer-option|learning-resource|subject|curriculum)/.test(
      stripComments(readFileSync(join(srcDir, 'editorial', 'editorial.controller.ts'), 'utf8'))));
  // Invariante 19 -- "los cuatro lectores conservan su predicado de
  // elegibilidad BYTE-IDÉNTICO", verificado como §7.1 lo pide: por DIFF
  // ESTÁTICO, no por lectura. Es la comprobación fuerte: no importa qué
  // contengan esos archivos, importa que I4 no los haya tocado.
  const readerFiles = [
    'apps/backend/src/education/question-version.repository.ts',
    'apps/backend/src/education/learning-resource-version.repository.ts',
    'apps/backend/src/education/answer-option.repository.ts',
    'apps/backend/src/education/education.service.ts',
    'apps/backend/src/progress/progress.service.ts',
    'apps/backend/src/quick-question/quick-question.service.ts',
    'apps/backend/src/ai/ai-academic-context-builder.service.ts',
  ].filter((f) => existsSync(join(repoRoot, f)));
  const readerDiff = spawnSync('git', ['diff', '--stat', 'HEAD', '--', ...readerFiles], {
    cwd: repoRoot, encoding: 'utf8',
  });
  check('invariante 19: los lectores de contenido siguen BYTE-IDÉNTICOS respecto a HEAD -- I4 no tocó ninguno (diff vacío)',
    readerDiff.status === 0 && (readerDiff.stdout ?? '').trim() === '', (readerDiff.stdout ?? '').slice(0, 400));
  const mobileDiff = spawnSync('git', ['diff', '--stat', 'HEAD', '--', 'apps/mobile'], { cwd: repoRoot, encoding: 'utf8' });
  check('invariante 13: `apps/mobile` sin ningún cambio (diff vacío respecto a HEAD)',
    mobileDiff.status === 0 && (mobileDiff.stdout ?? '').trim() === '', (mobileDiff.stdout ?? '').slice(0, 400));

  // `apps/` sigue conteniendo exactamente `backend` y `mobile` (§13.7 punto 4).
  const apps = readdirSync(join(repoRoot, 'apps'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  check('`apps/` sigue conteniendo exactamente `backend` y `mobile` (invariante 13: I4 no tocó mobile)', apps.join(',') === 'backend,mobile', apps.join(','));

  // ==========================================================================
  // Cierre.
  // ==========================================================================
  await pg.end();
  console.log(`\nChecks ejecutados: ${checksRun}`);
  if (failures > 0) {
    console.error(`\n${failures} verificación(es) FALLARON -- gate I4 EN ROJO.`);
    process.exit(1);
  }
  console.log('GATE I4 EN VERDE -- LEF Bloque VII, Incremento 4 (autoría editorial: T1, T2, T3 y CMS-013).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
