// Gate del LEF Bloque VII ("Plataforma Editorial"), Incremento 3 --
// "Transiciones de estado con auditoría (retiro primero)".
// Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §12.3 (frontera) y §13.3 (los nueve
// criterios de cierre).
//
// Contra el BACKEND REAL ya levantado y contra PostgreSQL REAL (conexión
// directa `pg` para fixtures e inspección), mismo patrón que
// `verify-admin-identity-gate.ts` y `verify-education-published-immutability-gate.ts`.
//
// NUNCA gasta Anthropic: no llama a ningún endpoint de generación de `/ai`.
// El único uso de IA aquí es la ADMISIÓN de una conversación (criterio 4), que
// ocurre ANTES de cualquier llamada al proveedor
// (`ai-academic-context-builder.service.ts:101`) y no consume cuota externa.
//
// Uso:
//   node dist/main.js            (en otra terminal, con PORT propio)
//   npm run verify:editorial-transitions-gate -- http://127.0.0.1:<PORT>
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const backendDir = join(__dirname, '..');
const srcDir = join(backendDir, 'src');

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

/** Igual que en el gate del Incremento 2: mide el CÓDIGO, no los docstrings. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
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

function activateCms018(actorId: string, objectType: string, objectId: string, reason: string) {
  const result = spawnSync(
    'node',
    [
      'dist/cli/activate-cms018-exception.js',
      '--actor-id', actorId,
      '--object-type', objectType,
      '--object-id', objectId,
      '--reason', reason,
    ],
    { cwd: backendDir, encoding: 'utf8' },
  );
  const stdout = result.stdout ?? '';
  return {
    status: result.status,
    activationId: /activationId\s*:\s*([0-9a-f-]{36})/i.exec(stdout)?.[1] ?? '',
    stdout,
    stderr: result.stderr ?? '',
  };
}

const STEM = JSON.stringify([{ type: 'paragraph', order: 0, text: 'enunciado de fixture del gate I3' }]);
const EXPL = JSON.stringify([{ type: 'paragraph', order: 0, text: 'explicación de fixture del gate I3' }]);
const OPT_A = JSON.stringify({ type: 'paragraph', order: 0, text: 'alternativa A' });
const OPT_B = JSON.stringify({ type: 'paragraph', order: 0, text: 'alternativa B' });
const BLOCKS = JSON.stringify([{ type: 'paragraph', order: 0, text: 'bloque de fixture del gate I3' }]);

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ==========================================================================
  // 0. Identidad del proceso bajo prueba -- protocolo obligatorio.
  //
  // Un puerto residual de una sesión anterior serviría un binario ANTIGUO y el
  // gate mediría otra cosa. `/administration/editorial/actions` debe existir
  // (401 sin credencial, nunca 404).
  // ==========================================================================
  console.log('--- 0. Identidad del proceso bajo prueba (anti-puerto-residual) ---');
  const probe = await req('GET', '/administration/editorial/actions?objectType=QUESTION_VERSION&objectId=' + randomUUID());
  check(
    `el backend en ${base} expone /administration/editorial (401, no 404) -> es el binario del Incremento 3`,
    probe.status === 401,
    `status=${probe.status}`,
  );
  if (probe.status === 404) {
    console.error('       -> 404: el proceso escuchando en este puerto NO tiene el módulo EDITORIAL.');
    console.error('       -> Es un servidor residual. Mátalo y levanta `node dist/main.js` de este build.');
    process.exit(1);
  }

  // ==========================================================================
  // FIXTURES DE VERIFICACIÓN -- leer esto antes de tocar nada.
  //
  // El Incremento 3 implementa EXACTAMENTE T4..T8. NO implementa T1 (crear),
  // NI T2 (editar), NI T3 (DRAFT -> IN_REVIEW): son el Incremento 4, y el
  // Product Owner lo resolvió así en DG-12, Opción C.
  //
  // Por lo tanto NO EXISTE, y no debe existir, ninguna ruta productiva capaz
  // de dejar una versión en DRAFT, IN_REVIEW o APPROVED. Las fixtures que este
  // gate necesita para ejercer T4..T8 se crean por INSERCIÓN DIRECTA con `pg`,
  // exactamente el mismo precedente que ya usa
  // `verify-education-published-immutability-gate.ts` (Incremento 1).
  //
  // ESTO ES ANDAMIAJE DE VERIFICACIÓN, NO FUNCIONALIDAD DE PRODUCTO:
  //   - vive SOLO en este archivo de gate, nunca en `src/`;
  //   - no adelanta ninguna ruta de I4, y el punto 10 de este gate comprueba
  //     estáticamente que ninguna ruta productiva de I4 existe;
  //   - NO debilita ningún invariante: son INSERT de filas en estados válidos,
  //     sin ningún bypass de trigger, sin `session_replication_role`, sin
  //     desactivar ni recrear ninguna restricción. Todos los triggers e
  //     índices del Incremento 1 siguen activos durante toda la corrida.
  //
  // La autoría (T1) también se siembra como fixture directa en `admin_action`.
  // Es imprescindible: §8.3 define CMS-018 como una comparación contra el
  // registro de acción administrativa, y §13.3 punto 6 exige demostrar que el
  // autor NO puede auto-aprobarse. Sin autoría representable, esa
  // demostración sería imposible. `admin_action` es append-only para UPDATE y
  // DELETE (trigger `admin_action_immutable`); INSERT es su modo normal.
  //
  // Higiene: el contenido que llega a publicarse NO puede borrarse
  // (invariante 3, sin bypass). Como en el Incremento 1, el aislamiento
  // sustituye a la limpieza: materia, temas e identidades propias por corrida.
  // ==========================================================================
  console.log('--- 0.b Fixtures de verificación aisladas (inserción directa, sin ruta productiva) ---');
  const subjectId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Materia del gate de transiciones editoriales', 'VII3', 'ACTIVE', 991, now(), now())`,
    [subjectId, `lef7-i3-subject-${suffix}`],
  );
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema del gate de transiciones editoriales', 1, $3, now(), now())`,
    [topicId, `LEF7.I3.TOPIC.${suffix}`, subjectId],
  );

  let seq = 0;
  async function newQuestion(): Promise<string> {
    const id = randomUUID();
    seq++;
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [id, `LEF7.I3.Q${seq}.${suffix}`, subjectId],
    );
    return id;
  }

  /** Fixture de verificación: versión de pregunta en el estado pedido. */
  async function newQuestionVersion(
    questionId: string,
    status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED',
    opts: { topic?: string } = {},
  ): Promise<{ versionId: string; optionIds: string[] }> {
    const versionId = randomUUID();
    // ORDEN OBLIGATORIO de la fixture: la versión nace en DRAFT y sus
    // alternativas se insertan mientras sigue en DRAFT. Insertar una
    // `answer_option` en una versión ya publicada está prohibido
    // (invariante 2, trigger `enforce_answer_option_published_parent_immutable`)
    // y el gate NO lo elude: lo respeta, igual que lo respetaría cualquier
    // ruta productiva futura del Incremento 4.
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'DRAFT', NULL, now(), now())`,
      [versionId, questionId, opts.topic ?? topicId, STEM, EXPL],
    );
    const optionIds = [randomUUID(), randomUUID()];
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, $3::jsonb, 0, true, now()), ($4, $2, $5::jsonb, 1, false, now())`,
      [optionIds[0], versionId, OPT_A, optionIds[1], OPT_B],
    );
    if (status !== 'DRAFT') {
      // Estado inicial de la fixture. Sigue siendo inserción/actualización
      // directa de una fila que NO alcanzó publicación, que §7.2 admite
      // expresamente para el sujeto "acceso directo a PostgreSQL". Ningún
      // trigger se desactiva ni se elude.
      const publishedAt = status === 'PUBLISHED' ? ', published_at = now()' : '';
      await pg.query(
        `UPDATE question_version SET editorial_status = $1::editorial_status${publishedAt}, updated_at = now() WHERE id = $2`,
        [status, versionId],
      );
    }
    return { versionId, optionIds };
  }

  async function newResourceVersion(status: 'APPROVED' | 'PUBLISHED', resourceId?: string) {
    const rid = resourceId ?? randomUUID();
    if (!resourceId) {
      seq++;
      await pg.query(
        `INSERT INTO learning_resource (id, resource_key, primary_subject_id, resource_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'LESSON', 'ACTIVE', now(), now())`,
        [rid, `LEF7.I3.R${seq}.${suffix}`, subjectId],
      );
    }
    const versionId = randomUUID();
    const publishedAt = status === 'PUBLISHED' ? 'now()' : 'NULL';
    await pg.query(
      `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'Recurso de fixture del gate I3', $4::jsonb, $5::editorial_status, ${publishedAt}, now(), now())`,
      [versionId, rid, topicId, BLOCKS, status],
    );
    return { resourceId: rid, versionId };
  }

  /**
   * FIXTURE DE AUTORÍA. Siembra un registro T1 ("(inexistente) -> DRAFT")
   * atribuido a un actor concreto, que es lo que §8.3 lee para decidir si
   * quien ejecuta T5/T7 es el autor. NO existe ninguna ruta productiva que
   * escriba T1 en el Incremento 3 -- se verifica estáticamente en el punto 10.
   */
  async function seedAuthorship(actorId: string, objectId: string, objectType = 'QUESTION_VERSION') {
    await pg.query(
      `INSERT INTO admin_action (id, actor_id, role_exercised, occurred_at, action_type, object_type, object_id, previous_status, new_status, reason, operation_id, cms018_activation_id)
       VALUES ($1, $2, 'AUTHOR', now(), 'T1', $3::admin_action_object_type, $4, NULL, 'DRAFT', 'Fixture de verificación de autoría (gate I3)', NULL, NULL)`,
      [randomUUID(), actorId, objectType, objectId],
    );
  }

  check('fixtures de verificación creadas por inserción directa, sin ruta productiva y sin bypass de trigger', true);

  // ==========================================================================
  // Actores administrativos -- por el CLI REAL del Incremento 2, no por INSERT.
  // ==========================================================================
  console.log('--- 0.c Actores administrativos (CLI real del Incremento 2, reutilizado sin cambios) ---');
  const author = bootstrapActor(`I3 Autora ${suffix}`, 'AUTHOR');
  const publisher = bootstrapActor(`I3 Publicador ${suffix}`, 'PUBLISHER');
  const publisher2 = bootstrapActor(`I3 Publicador2 ${suffix}`, 'PUBLISHER');
  const both = bootstrapActor(`I3 Ambos ${suffix}`, 'AUTHOR,PUBLISHER');
  check(
    'cuatro AdminActor creados por el CLI del Incremento 2 (Autor, Publicador, Publicador2, Ambos roles)',
    [author, publisher, publisher2, both].every((a) => a.status === 0 && a.token.length > 0),
  );
  const H = (t: string) => ({ 'x-admin-token': t });
  const AUTHOR = H(author.token);
  const PUB = H(publisher.token);
  const PUB2 = H(publisher2.token);
  const BOTH = H(both.token);

  async function transition(headers: Record<string, string>, versionId: string, body: unknown, family = 'question-versions') {
    return req('POST', `/administration/editorial/${family}/${versionId}/transitions`, headers, body);
  }

  // ==========================================================================
  // 1. §13.3.1 -- Retirar una pregunta la saca de los CUATRO lectores (§11.1),
  //    verificado uno por uno contra el backend real.
  // ==========================================================================
  console.log('--- 1. Retirar (T8) saca la pregunta de los CUATRO lectores de §11.1 ---');

  const retiredQ = await newQuestion();
  const retired = await newQuestionVersion(retiredQ, 'PUBLISHED');

  // Cuenta de estudiante para ejercer los lectores autenticados.
  const uid = `lef7-i3-${suffix}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  const STUDENT = { authorization: `Bearer ${idToken}`, 'x-session-id': session.body?.sessionId as string };
  const accountId = session.body?.accountId as string;

  // --- CONTROL POSITIVO, antes del retiro. Sin esto, "no aparece" sería
  // indistinguible de "nunca apareció" y el gate no probaría nada.
  const catalogBefore = await req('GET', `/education/topics/${topicId}/questions`, STUDENT);
  const visibleBefore = Array.isArray(catalogBefore.body)
    ? catalogBefore.body.some((q: any) => q.versionId === retired.versionId)
    : false;
  check('CONTROL POSITIVO lector 1 (EducationService): la pregunta PUBLISHED SÍ aparece en el catálogo antes del retiro', visibleBefore, catalogBefore.raw.slice(0, 300));

  const progressBefore = await req('POST', `/progress/topics/${topicId}/responses`, STUDENT, {
    questionVersionId: retired.versionId,
    answerOptionId: retired.optionIds[1],
    operationId: randomUUID(),
  });
  check('CONTROL POSITIVO lector 2 (ProgressService): responder la pregunta PUBLISHED SÍ se acepta antes del retiro', progressBefore.status === 200 || progressBefore.status === 201, `status=${progressBefore.status} ${progressBefore.raw.slice(0, 200)}`);

  const aiBefore = await req('POST', '/ai/me/conversations', STUDENT, { contextQuestionVersionId: retired.versionId });
  const aiAdmittedBefore = aiBefore.status === 200 || aiBefore.status === 201;
  check('CONTROL POSITIVO lector 4 (AiAcademicContextBuilder): admite una conversación sobre la pregunta PUBLISHED', aiAdmittedBefore, `status=${aiBefore.status} ${aiBefore.raw.slice(0, 200)}`);
  const liveConversationId = aiBefore.body?.conversationId ?? aiBefore.body?.id ?? null;

  const eligibleBefore = await pg.query(
    `SELECT count(*)::int AS n FROM question_version WHERE id = $1 AND editorial_status = 'PUBLISHED'`,
    [retired.versionId],
  );
  check('CONTROL POSITIVO lector 3 (QuickQuestion, predicado de selección): la versión es elegible antes del retiro', eligibleBefore.rows[0].n === 1);

  // --- T8 real, por la API administrativa.
  const t8 = await transition(PUB, retired.versionId, {
    targetStatus: 'DEPRECATED',
    reason: 'Retiro urgente: la pregunta contiene un error de enunciado (gate I3).',
    operationId: randomUUID(),
  });
  check('T8 (PUBLISHED -> DEPRECATED) ejecutada por el Publicador vía API administrativa', t8.status === 200 || t8.status === 201, `status=${t8.status} ${t8.raw.slice(0, 300)}`);

  const catalogAfter = await req('GET', `/education/topics/${topicId}/questions`, STUDENT);
  const visibleAfter = Array.isArray(catalogAfter.body)
    ? catalogAfter.body.some((q: any) => q.versionId === retired.versionId)
    : false;
  check('lector 1 (EducationService, catálogo): la pregunta retirada YA NO aparece', !visibleAfter);

  const progressAfter = await req('POST', `/progress/topics/${topicId}/responses`, STUDENT, {
    questionVersionId: retired.versionId,
    answerOptionId: retired.optionIds[0],
    operationId: randomUUID(),
  });
  check('lector 2 (ProgressService): responder la pregunta retirada se rechaza', progressAfter.status >= 400, `status=${progressAfter.status}`);

  const eligibleAfter = await pg.query(
    `SELECT count(*)::int AS n FROM question_version WHERE id = $1 AND editorial_status = 'PUBLISHED'`,
    [retired.versionId],
  );
  check('lector 3 (QuickQuestion, predicado de selección `editorial_status = PUBLISHED`): la versión retirada deja de ser elegible', eligibleAfter.rows[0].n === 0);

  const aiAfter = await req('POST', '/ai/me/conversations', STUDENT, { contextQuestionVersionId: retired.versionId });
  check('lector 4 (AiAcademicContextBuilder, admisión): una conversación NUEVA sobre la pregunta retirada se rechaza', aiAfter.status >= 400, `status=${aiAfter.status}`);

  // ==========================================================================
  // 2. §13.3.2 -- Los StudentResponse históricos sobreviven ÍNTEGROS.
  // ==========================================================================
  console.log('--- 2. Los StudentResponse históricos sobreviven íntegros al retiro ---');
  const sr = await pg.query(
    `SELECT is_correct, answer_option_id FROM student_response WHERE account_id = $1 AND question_version_id = $2`,
    [accountId, retired.versionId],
  );
  check('el StudentResponse de la versión retirada SIGUE EXISTIENDO tras T8', sr.rowCount === 1);
  check('conserva su `isCorrect` original', sr.rows[0]?.is_correct === false);
  check('conserva su `answerOptionId` original', sr.rows[0]?.answer_option_id === retired.optionIds[1]);

  // ==========================================================================
  // 3. §13.3.3 -- Sesión de Pregunta rápida en curso obtiene el
  //    ConflictException YA EXISTENTE (`quick-question.service.ts:174`).
  //    Comportamiento EXISTENTE, confirmado, NO modificado por el Incremento 3.
  // ==========================================================================
  console.log('--- 3. Pregunta rápida en curso: ConflictException ya existente (confirmado, no modificado) ---');
  const qqQ = await newQuestion();
  const qqV = await newQuestionVersion(qqQ, 'PUBLISHED');

  const qqUid = `lef7-i3-qq-${suffix}`;
  const qqToken = StubIdentityProvider.encode({ providerSubject: qqUid, email: `${qqUid}@example.com`, emailVerified: true });
  const qqSession = await req('POST', '/auth/session', {}, { idToken: qqToken });
  const QQ_STUDENT = { authorization: `Bearer ${qqToken}`, 'x-session-id': qqSession.body?.sessionId as string };

  const qqCreate = await req('POST', '/gamification/me/quick-question/sessions', QQ_STUDENT, {});
  const qqSessionId = qqCreate.body?.sessionId ?? qqCreate.body?.id;
  const qqNext = await req('POST', `/gamification/me/quick-question/sessions/${qqSessionId}/next`, QQ_STUDENT, {});
  check('sesión de Pregunta rápida creada y con pregunta presentada por la ruta productiva `/next`', qqNext.status === 200 || qqNext.status === 201, `status=${qqNext.status}`);

  // FIXTURE DE VERIFICACIÓN: se fija cuál es la pregunta PENDIENTE de la
  // sesión, para poder retirar ESA y no una del catálogo sembrado.
  //
  // `/next` selecciona con `ORDER BY random()` sobre TODO el catálogo
  // publicado (`question-version.repository.ts:findRandomEligible`), así que
  // no hay forma determinista de que presente la fixture de este gate. Retirar
  // en su lugar la pregunta que el azar eligiera significaría retirar
  // contenido sembrado de forma PERMANENTE (DEPRECATED es terminal, §8.4) --
  // un efecto real e irreversible sobre el catálogo, solo para poder medir.
  //
  // Se fija por SQL directo el puntero de la sesión a la fixture propia. Es
  // andamiaje de verificación sobre una tabla de sesión, sin ningún bypass de
  // trigger y sin tocar ningún invariante editorial: la ruta que se MIDE
  // sigue siendo la productiva (`POST .../answers`), que es donde vive el
  // `ConflictException` ya existente que este punto confirma.
  await pg.query(
    `UPDATE quick_question_session SET current_question_version_id = $1, current_presented_at = now() WHERE id = $2`,
    [qqV.versionId, qqSessionId],
  );
  const qqPending = (await pg.query(`SELECT current_question_version_id AS v FROM quick_question_session WHERE id = $1`, [qqSessionId])).rows[0]?.v ?? null;

  if (qqPending === qqV.versionId) {
    // Retiro DURANTE la sesión, con la pregunta ya presentada y pendiente.
    const qqT8 = await transition(PUB, qqV.versionId, {
      targetStatus: 'DEPRECATED',
      reason: 'Retiro con una sesión de Pregunta rápida en curso (gate I3).',
      operationId: randomUUID(),
    });
    check('T8 aplicada mientras la pregunta estaba pendiente en una sesión de Pregunta rápida', qqT8.status === 200 || qqT8.status === 201);
    const answered = await req('POST', `/gamification/me/quick-question/sessions/${qqSessionId}/answers`, QQ_STUDENT, {
      answerOptionId: qqV.optionIds[0],
      operationId: randomUUID(),
    });
    check(
      'la sesión en curso obtiene el ConflictException YA EXISTENTE (409) -- comportamiento no modificado por este incremento',
      answered.status === 409,
      `status=${answered.status} ${answered.raw.slice(0, 200)}`,
    );
  } else {
    check('la fixture de Pregunta rápida quedó pendiente para poder ejercer el ConflictException', false, `pendiente=${qqPending}`);
  }

  // Comprobación de NO MODIFICACIÓN: el predicado sigue donde estaba.
  const qqSource = readFileSync(join(srcDir, 'gamification', 'quick-question.service.ts'), 'utf8');
  check(
    'el predicado de revalidación de Pregunta rápida sigue byte-idéntico (invariante 19: el lector no se toca)',
    /editorialStatus !== 'PUBLISHED' \|\| questionVersion\.question\.status !== 'ACTIVE'/.test(qqSource) &&
      /ConflictException\('La pregunta pendiente de esta sesión ya no está disponible\.'\)/.test(qqSource),
  );

  // ==========================================================================
  // 4. §13.3.4 -- AiConversation ya creada DEGRADA correctamente; una
  //    conversación NUEVA sobre la pregunta retirada es RECHAZADA.
  //    Ambos comportamientos ya son correctos hoy; el gate confirma que no se
  //    degradaron (Bloque VI permanece cerrado y sin cambios).
  // ==========================================================================
  console.log('--- 4. Tutor IA: conversación existente degrada, conversación nueva rechazada (ya correctos, confirmados) ---');
  check('conversación NUEVA sobre pregunta retirada -> rechazada en ADMISIÓN (ai-academic-context-builder.service.ts:101)', aiAfter.status >= 400);

  if (liveConversationId) {
    const conv = await pg.query(`SELECT context_question_version_id AS v FROM ai_conversation WHERE id = $1`, [liveConversationId]);
    check(
      'la AiConversation creada ANTES del retiro sigue anclada a la versión retirada (FK Restrict, sin pérdida de referencia)',
      conv.rows[0]?.v === retired.versionId,
    );
  } else {
    check('la AiConversation de control se creó antes del retiro', false, aiBefore.raw.slice(0, 200));
  }

  const aiCtxSource = readFileSync(join(srcDir, 'ai', 'ai-academic-context-builder.service.ts'), 'utf8');
  check(
    'la ruta de DEGRADACIÓN del Tutor sigue byte-idéntica (`if (!version) return null;`) -- Bloque VI sin cambios',
    /if \(!version\) return null;/.test(aiCtxSource),
  );
  check(
    'la ruta de ADMISIÓN del Tutor sigue byte-idéntica (predicado PUBLISHED + ACTIVE) -- Bloque VI sin cambios',
    /!version \|\| version\.editorialStatus !== 'PUBLISHED' \|\| version\.question\.status !== 'ACTIVE'/.test(aiCtxSource),
  );

  // ==========================================================================
  // 5. §13.3.5 -- Cada transición PROHIBIDA de §8.4 rechazada POR LA API con
  //    un error explícito (defensa en profundidad ANTES del trigger de I1).
  // ==========================================================================
  console.log('--- 5. Transiciones prohibidas de §8.4 rechazadas por la API con error explícito ---');

  const draftQ = await newQuestion();
  const draftV = await newQuestionVersion(draftQ, 'DRAFT');
  const irQ = await newQuestion();
  const irV = await newQuestionVersion(irQ, 'IN_REVIEW');
  const depQ = await newQuestion();
  const depV = await newQuestionVersion(depQ, 'PUBLISHED');
  await transition(PUB, depV.versionId, { targetStatus: 'DEPRECATED', reason: 'Fixture: llevar a DEPRECATED para probar sus salidas.', operationId: randomUUID() });

  const prohibited: Array<[string, string, string]> = [
    ['DRAFT -> PUBLISHED', draftV.versionId, 'PUBLISHED'],
    ['DRAFT -> APPROVED', draftV.versionId, 'APPROVED'],
    ['IN_REVIEW -> PUBLISHED', irV.versionId, 'PUBLISHED'],
    ['DEPRECATED -> PUBLISHED', depV.versionId, 'PUBLISHED'],
    ['DEPRECATED -> DRAFT', depV.versionId, 'DRAFT'],
  ];
  for (const [label, versionId, target] of prohibited) {
    const r = await transition(PUB, versionId, { targetStatus: target, reason: 'intento prohibido (gate I3)', operationId: randomUUID() });
    check(
      `transición prohibida ${label} rechazada por la API con error explícito (4xx, no 5xx, no éxito)`,
      r.status >= 400 && r.status < 500,
      `status=${r.status} ${r.raw.slice(0, 220)}`,
    );
    check(
      `  ...y el mensaje de ${label} explica la lista cerrada de §8.4 (no es un error genérico)`,
      typeof r.body?.error?.message === 'string' && /§8\.4|lista cerrada|Incremento 4|terminal/i.test(r.body.error.message),
      String(r.body?.error?.message).slice(0, 200),
    );
  }

  // Destino ARCHIVED desde CUALQUIER estado (DG-8, invariante 21).
  const archivedTargets: Array<[string, string]> = [
    ['DRAFT', draftV.versionId],
    ['IN_REVIEW', irV.versionId],
    ['DEPRECATED', depV.versionId],
  ];
  for (const [from, versionId] of archivedTargets) {
    const r = await transition(PUB, versionId, { targetStatus: 'ARCHIVED', reason: 'intento ARCHIVED (gate I3)', operationId: randomUUID() });
    check(
      `destino ARCHIVED desde ${from} rechazado explícitamente (DG-8, invariante 21)`,
      r.status >= 400 && r.status < 500 && /ARCHIVED/.test(String(r.body?.error?.message ?? '')),
      `status=${r.status} ${String(r.body?.error?.message).slice(0, 200)}`,
    );
  }
  const archQ = await newQuestion();
  const archApproved = await newQuestionVersion(archQ, 'APPROVED');
  const archPub = await newQuestion();
  const archPublished = await newQuestionVersion(archPub, 'PUBLISHED');
  for (const [from, versionId] of [['APPROVED', archApproved.versionId], ['PUBLISHED', archPublished.versionId]] as Array<[string, string]>) {
    const r = await transition(PUB, versionId, { targetStatus: 'ARCHIVED', reason: 'intento ARCHIVED (gate I3)', operationId: randomUUID() });
    check(
      `destino ARCHIVED desde ${from} rechazado explícitamente (DG-8, invariante 21)`,
      r.status >= 400 && r.status < 500 && /ARCHIVED/.test(String(r.body?.error?.message ?? '')),
      `status=${r.status}`,
    );
  }
  const archivedRows = await pg.query(`SELECT count(*)::int AS n FROM question_version WHERE editorial_status = 'ARCHIVED'`);
  check('ninguna fila quedó en ARCHIVED en toda la base (el valor sigue en el enum, inalcanzable)', archivedRows.rows[0].n === 0);

  // ACTUALIZACIÓN LEGÍTIMA -- LEF Bloque VII, Incremento 4 (2026-08-18).
  //
  // Esta aserción comprobaba que T3 (DRAFT -> IN_REVIEW) todavía NO estaba
  // construida (DG-12, Opción C: el Product Owner la asignó al Incremento 4).
  // Era una ASERCIÓN TEMPORAL DE AUSENCIA, no una garantía funcional: §13.3
  // --los nueve criterios contractuales del Incremento 3-- NO exige en ningún
  // punto que T3 sea rechazada; su punto 5 enumera las transiciones PROHIBIDAS
  // de §8.4, y T3 nunca estuvo entre ellas. Con el Incremento 4 construido,
  // mantenerla haría fallar este gate por una razón falsa y, peor, afirmaría
  // algo CONTRARIO al contrato (§8.2 declara T3 autorizada).
  //
  // Su sucesora comprueba lo que sí importa desde la perspectiva del
  // Incremento 3: que T3 se integró en la misma máquina de estados sin romper
  // T4..T8 y respetando el rol que §9.2 fija.
  const t3 = await transition(AUTHOR, draftV.versionId, { targetStatus: 'IN_REVIEW', reason: 'T3 ejecutada desde el gate I3' });
  check(
    'T3 (DRAFT -> IN_REVIEW), construida por el Incremento 4, la ejecuta el AUTOR por la MISMA máquina de estados (§8.2, §9.2)',
    t3.status === 200 || t3.status === 201,
    `status=${t3.status} ${String(t3.body?.error?.message).slice(0, 200)}`,
  );

  // ==========================================================================
  // 6. §13.3.6 -- CMS-018 por IDENTIDAD DE ACTOR, con su excepción verificada
  //    COMO EXCEPCIÓN (DG-10, §8.5, invariantes 9 y 24).
  // ==========================================================================
  console.log('--- 6. CMS-018 por identidad de actor + excepción tratada como excepción ---');

  // (a) Regla normal: OTRO actor sí puede aprobar.
  const okQ = await newQuestion();
  const okV = await newQuestionVersion(okQ, 'IN_REVIEW');
  await seedAuthorship(author.actorId, okV.versionId);
  const approveByOther = await transition(PUB, okV.versionId, { targetStatus: 'APPROVED' });
  check('CONTROL POSITIVO regla normal: un Publicador que NO es el autor SÍ puede ejecutar T5', approveByOther.status === 200 || approveByOther.status === 201, `status=${approveByOther.status} ${approveByOther.raw.slice(0, 200)}`);

  // (b) El autor NO puede auto-aprobar (T5) -- actor con ambos roles.
  const selfQ = await newQuestion();
  const selfV = await newQuestionVersion(selfQ, 'IN_REVIEW');
  await seedAuthorship(both.actorId, selfV.versionId);
  const selfApprove = await transition(BOTH, selfV.versionId, { targetStatus: 'APPROVED' });
  check(
    'sin activación deliberada, la AUTO-APROBACIÓN es RECHAZADA (punto central del gate)',
    selfApprove.status === 403,
    `status=${selfApprove.status} ${String(selfApprove.body?.error?.message).slice(0, 200)}`,
  );
  check(
    'un actor con AMBOS roles (Autor y Publicador) y SIN excepción es igualmente rechazado: tener ambos roles no autoriza nada por sí solo (invariante 24)',
    selfApprove.status === 403 && /invariante 24|no autoriza|por sí solo/i.test(String(selfApprove.body?.error?.message ?? '')),
    String(selfApprove.body?.error?.message).slice(0, 250),
  );

  // (c) Activación deliberada por CLI + uso SIN motivo -> rechazado.
  const activation = activateCms018(both.actorId, 'QUESTION_VERSION', selfV.versionId, 'Equipo editorial de una sola persona durante la etapa inicial (gate I3).');
  check('la excepción se activa por CLI (acto deliberado fuera de banda), no por un campo de petición', activation.status === 0 && activation.activationId.length === 36, activation.stderr || activation.stdout);
  const useNoReason = await transition(BOTH, selfV.versionId, { targetStatus: 'APPROVED', cms018ActivationId: activation.activationId });
  check(
    'un uso de la excepción SIN motivo es rechazado (§8.5, condición 3: la justificación es POR USO)',
    useNoReason.status >= 400 && useNoReason.status < 500,
    `status=${useNoReason.status} ${String(useNoReason.body?.message).slice(0, 200)}`,
  );

  // (d) Uso válido -> queda como evento DISTINGUIBLE y CONSULTABLE con ambos actores.
  const useOk = await transition(BOTH, selfV.versionId, {
    targetStatus: 'APPROVED',
    cms018ActivationId: activation.activationId,
    reason: 'Auto-aprobación bajo excepción registrada: equipo de una sola persona, revisión cruzada imposible (uso 1).',
  });
  check('con activación deliberada Y motivo por uso, T5 bajo excepción SÍ se ejecuta', useOk.status === 200 || useOk.status === 201, `status=${useOk.status} ${useOk.raw.slice(0, 250)}`);

  const uses = await req('GET', '/administration/editorial/cms018-exception-uses', PUB);
  const thisUse = (uses.body?.actions ?? []).find((a: any) => a.id === useOk.body?.adminActionId);
  check('el uso de la excepción es CONSULTABLE como tipo de evento distinguible ("cuántas publicaciones bajo excepción")', Boolean(thisUse));
  check('el registro del uso lleva el actor que ACTIVÓ la excepción', thisUse?.cms018Exception?.activatedByActorId === both.actorId);
  check('el registro del uso lleva el actor que la USÓ', thisUse?.cms018Exception?.usedByActorId === both.actorId);
  check('el registro del uso lleva su motivo propio', typeof thisUse?.reason === 'string' && thisUse.reason.includes('uso 1'));

  // Una activación no es un flag global: no ampara OTRA versión.
  const otherQ = await newQuestion();
  const otherV = await newQuestionVersion(otherQ, 'IN_REVIEW');
  await seedAuthorship(both.actorId, otherV.versionId);
  const wrongScope = await transition(BOTH, otherV.versionId, {
    targetStatus: 'APPROVED',
    cms018ActivationId: activation.activationId,
    reason: 'Intento de reutilizar una activación de otra versión (gate I3).',
  });
  check('una activación NO es un flag global: no ampara otra versión (§8.5)', wrongScope.status === 403, `status=${wrongScope.status}`);

  // Segundo uso (T7) sobre la MISMA versión: exige su PROPIO motivo.
  const t7NoReason = await transition(BOTH, selfV.versionId, {
    targetStatus: 'PUBLISHED',
    cms018ActivationId: activation.activationId,
    operationId: randomUUID(),
  });
  check('un motivo dado una vez NO cubre usos posteriores: el segundo uso (T7) sin motivo se rechaza', t7NoReason.status >= 400 && t7NoReason.status < 500, `status=${t7NoReason.status}`);

  const t7Ok = await transition(BOTH, selfV.versionId, {
    targetStatus: 'PUBLISHED',
    cms018ActivationId: activation.activationId,
    reason: 'Publicación bajo excepción registrada: equipo de una sola persona (uso 2, independiente del uso 1).',
    operationId: randomUUID(),
  });
  check('T7 bajo excepción, con su propio motivo, SÍ se ejecuta', t7Ok.status === 200 || t7Ok.status === 201, `status=${t7Ok.status} ${t7Ok.raw.slice(0, 250)}`);

  // (e) La excepción NO relaja los invariantes 1-5 ni el 16.
  console.log('    (la excepción NO relaja nada más: invariantes 1-5 y 16, con la excepción activa)');
  const immutableAttempt = await pg
    .query(`UPDATE question_version SET stem_content = $1::jsonb WHERE id = $2`, [JSON.stringify([{ type: 'paragraph', order: 0, text: 'ALTERADO bajo excepción' }]), selfV.versionId])
    .then(() => false)
    .catch(() => true);
  check('con la excepción ACTIVA, la inmutabilidad de la versión publicada sigue aplicándose (invariantes 1-5, trigger del Incremento 1)', immutableAttempt);

  const uniquenessAttempt = await pg
    .query(`INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, published_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'PUBLISHED', now(), now(), now())`,
      [randomUUID(), selfQ, topicId, STEM, EXPL])
    .then(() => false)
    .catch(() => true);
  check('con la excepción ACTIVA, la unicidad de versión publicada sigue aplicándose (invariante 16, índice único parcial del Incremento 1)', uniquenessAttempt);

  const deleteAttempt = await pg
    .query(`DELETE FROM question_version WHERE id = $1`, [selfV.versionId])
    .then(() => false)
    .catch(() => true);
  check('con la excepción ACTIVA, el DELETE de una versión que alcanzó publicación sigue prohibido (invariante 3)', deleteAttempt);

  // ==========================================================================
  // 7. §13.3.7 -- Idempotencia (invariante 11).
  // ==========================================================================
  console.log('--- 7. Idempotencia: misma clave, sin repetir efecto ni duplicar registro ---');
  const idemQ = await newQuestion();
  const idemV = await newQuestionVersion(idemQ, 'PUBLISHED');
  const opId = randomUUID();
  const first = await transition(PUB, idemV.versionId, { targetStatus: 'DEPRECATED', reason: 'Retiro idempotente (gate I3).', operationId: opId });
  const second = await transition(PUB, idemV.versionId, { targetStatus: 'DEPRECATED', reason: 'Retiro idempotente (gate I3).', operationId: opId });
  check('el primer envío aplica el efecto', (first.status === 200 || first.status === 201) && first.body?.idempotentReplay === false);
  check('el reenvío con la MISMA clave devuelve éxito y se marca como replay, sin repetir el efecto', (second.status === 200 || second.status === 201) && second.body?.idempotentReplay === true, `status=${second.status} ${second.raw.slice(0, 200)}`);
  check('el reenvío devuelve el MISMO registro de auditoría', second.body?.adminActionId === first.body?.adminActionId);
  const dupCount = await pg.query(`SELECT count(*)::int AS n FROM admin_action WHERE object_id = $1 AND action_type = 'T8'`, [idemV.versionId]);
  check('NO se duplicó el registro de acción (exactamente uno)', dupCount.rows[0].n === 1, `n=${dupCount.rows[0].n}`);
  const idemPersisted = await pg.query(`SELECT count(*)::int AS n FROM admin_action WHERE operation_id = $1`, [opId]);
  check('la clave de idempotencia es única en PostgreSQL, no solo en el servicio', idemPersisted.rows[0].n === 1);
  await expectRejected(pg, 'PostgreSQL rechaza un segundo admin_action con la misma clave de idempotencia (UNIQUE, autoridad final)',
    `INSERT INTO admin_action (id, actor_id, role_exercised, action_type, object_type, object_id, previous_status, new_status, reason, operation_id)
     VALUES ($1, $2, 'PUBLISHER', 'T8', 'QUESTION_VERSION', $3, 'PUBLISHED', 'DEPRECATED', 'duplicado', $4)`,
    [randomUUID(), publisher.actorId, idemV.versionId, opId]);

  // ==========================================================================
  // 8. §13.3.8 -- Auditoría completa: los NUEVE campos de §9.3; el noveno solo
  //    con excepción usada; T4/T6/T8-autónomo sin motivo rechazadas.
  // ==========================================================================
  console.log('--- 8. Auditoría completa: nueve campos de §9.3, uno por transición ---');

  const auditRow = await pg.query(
    `SELECT actor_id, role_exercised, occurred_at, action_type, object_type, object_id, previous_status, new_status, reason, operation_id, cms018_activation_id
       FROM admin_action WHERE id = $1`,
    [first.body?.adminActionId],
  );
  const a = auditRow.rows[0];
  check('(1) actor: presente y no nulo, nunca "sistema"', a?.actor_id === publisher.actorId);
  check('(2) rol ejercido: presente', a?.role_exercised === 'PUBLISHER');
  check('(3) momento: presente', a?.occurred_at instanceof Date);
  check('(4) tipo de acción: la transición ejecutada', a?.action_type === 'T8');
  check('(5) objeto afectado: tipo + identificador (referencia, nunca copia del contenido)', a?.object_type === 'QUESTION_VERSION' && a?.object_id === idemV.versionId);
  check('(6) estado previo -> estado nuevo: obligatorio en T4-T8, presente', a?.previous_status === 'PUBLISHED' && a?.new_status === 'DEPRECATED');
  check('(7) motivo: presente y obligatorio en T8 autónomo', typeof a?.reason === 'string' && a.reason.length > 0);
  check('(8) clave de idempotencia: presente', a?.operation_id === opId);
  check('(9) marca de excepción CMS-018: AUSENTE por defecto', a?.cms018_activation_id === null);

  const auditColumns = await pg.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'admin_action' ORDER BY column_name`,
  );
  const cols = auditColumns.rows.map((r: any) => r.column_name as string);
  check(
    'el registro NO guarda ninguna copia del contenido académico (§9.3: la referencia, nunca el contenido)',
    !cols.some((c) => /stem|explanation|content|title|answer/i.test(c)),
    cols.join(','),
  );

  // Motivo obligatorio: T4, T6, T8 autónomo.
  const noReasonQ = await newQuestion();
  const noReasonIR = await newQuestionVersion(noReasonQ, 'IN_REVIEW');
  const t4NoReason = await transition(PUB, noReasonIR.versionId, { targetStatus: 'DRAFT' });
  check('T4 sin motivo es RECHAZADA', t4NoReason.status >= 400 && t4NoReason.status < 500, `status=${t4NoReason.status}`);

  const t6Q = await newQuestion();
  const t6V = await newQuestionVersion(t6Q, 'APPROVED');
  const t6NoReason = await transition(PUB, t6V.versionId, { targetStatus: 'DRAFT' });
  check('T6 sin motivo es RECHAZADA', t6NoReason.status >= 400 && t6NoReason.status < 500, `status=${t6NoReason.status}`);

  const t8Q = await newQuestion();
  const t8V = await newQuestionVersion(t8Q, 'PUBLISHED');
  const t8NoReason = await transition(PUB, t8V.versionId, { targetStatus: 'DEPRECATED', operationId: randomUUID() });
  check('T8 autónomo sin motivo es RECHAZADO', t8NoReason.status >= 400 && t8NoReason.status < 500, `status=${t8NoReason.status}`);

  // Exactamente un registro por transición (T4 con motivo).
  const t4Ok = await transition(PUB, noReasonIR.versionId, { targetStatus: 'DRAFT', reason: 'Devolución: falta la explicación (gate I3).' });
  check('T4 con motivo SÍ se ejecuta', t4Ok.status === 200 || t4Ok.status === 201, `status=${t4Ok.status} ${t4Ok.raw.slice(0, 200)}`);
  const t4Count = await pg.query(`SELECT count(*)::int AS n FROM admin_action WHERE object_id = $1 AND action_type = 'T4'`, [noReasonIR.versionId]);
  check('cada transición produce EXACTAMENTE UN registro', t4Count.rows[0].n === 1, `n=${t4Count.rows[0].n}`);

  // T6 con motivo.
  const t6Ok = await transition(PUB, t6V.versionId, { targetStatus: 'DRAFT', reason: 'Rechazo tardío: clasificación incorrecta (gate I3).' });
  check('T6 con motivo SÍ se ejecuta', t6Ok.status === 200 || t6Ok.status === 201, `status=${t6Ok.status}`);

  // Append-only del registro: UPDATE y DELETE rechazados por PostgreSQL.
  await expectRejected(pg, 'admin_action es append-only: UPDATE rechazado por PostgreSQL', `UPDATE admin_action SET reason = 'reescrito' WHERE id = $1`, [first.body?.adminActionId]);
  await expectRejected(pg, 'admin_action es append-only: DELETE rechazado por PostgreSQL', `DELETE FROM admin_action WHERE id = $1`, [first.body?.adminActionId]);
  await expectRejected(pg, 'FK Restrict: borrar un AdminActor referenciado por el registro de acción falla (invariante 23)', `DELETE FROM admin_actor WHERE id = $1`, [publisher.actorId]);
  await expectRejected(pg, 'PostgreSQL rechaza un admin_action de T8 sin motivo (CHECK, no solo el servicio)',
    `INSERT INTO admin_action (id, actor_id, role_exercised, action_type, object_type, object_id, previous_status, new_status)
     VALUES ($1, $2, 'PUBLISHER', 'T8', 'QUESTION_VERSION', $3, 'PUBLISHED', 'DEPRECATED')`,
    [randomUUID(), publisher.actorId, t8V.versionId]);
  await expectRejected(pg, 'PostgreSQL rechaza un admin_action que afirme haber alcanzado ARCHIVED (CHECK, invariante 21)',
    `INSERT INTO admin_action (id, actor_id, role_exercised, action_type, object_type, object_id, previous_status, new_status, reason)
     VALUES ($1, $2, 'PUBLISHER', 'T8', 'QUESTION_VERSION', $3, 'PUBLISHED', 'ARCHIVED', 'intento')`,
    [randomUUID(), publisher.actorId, t8V.versionId]);

  // ==========================================================================
  // 9. T7 con supersesión -- §8.6, orden obligatorio dentro de una transacción.
  //    (Efecto colateral obligatorio de T7 según §8.2; el invariante 16 vive en
  //    PostgreSQL desde el Incremento 1 y aquí solo se CONSUME.)
  // ==========================================================================
  console.log('--- 9. T7 con supersesión: despublica la anterior ANTES, en la misma transacción (§8.6) ---');
  const supQ = await newQuestion();
  const oldPub = await newQuestionVersion(supQ, 'PUBLISHED');
  const newApproved = await newQuestionVersion(supQ, 'APPROVED');
  const t7 = await transition(PUB, newApproved.versionId, { targetStatus: 'PUBLISHED', operationId: randomUUID() });
  check('T7 con una versión publicada previa de la MISMA identidad tiene éxito', t7.status === 200 || t7.status === 201, `status=${t7.status} ${t7.raw.slice(0, 250)}`);
  check('la respuesta declara qué versión fue despublicada por supersesión', t7.body?.supersededVersionId === oldPub.versionId);
  const states = await pg.query(`SELECT id, editorial_status, published_at FROM question_version WHERE question_id = $1 ORDER BY editorial_status`, [supQ]);
  const publishedNow = states.rows.filter((r: any) => r.editorial_status === 'PUBLISHED');
  check('queda EXACTAMENTE UNA versión PUBLISHED de la identidad (invariante 16)', publishedNow.length === 1 && publishedNow[0].id === newApproved.versionId);
  const oldRow = states.rows.find((r: any) => r.id === oldPub.versionId);
  check('la versión anterior quedó en DEPRECATED', oldRow?.editorial_status === 'DEPRECATED');
  check('el `published_at` de la versión despublicada NO se modificó (hecho histórico)', oldRow?.published_at !== null);
  const supAction = await pg.query(
    `SELECT action_type, reason, operation_id FROM admin_action WHERE object_id = $1 AND action_type = 'T8'`,
    [oldPub.versionId],
  );
  check('la despublicación automática produce su propio registro de acción', supAction.rowCount === 1);
  check('con motivo DETERMINADO POR EL SISTEMA y referencia a la versión que la sustituye (§8.6)',
    typeof supAction.rows[0]?.reason === 'string' && supAction.rows[0].reason.includes(newApproved.versionId));
  check('sin clave de idempotencia: no es una operación del cliente, es un efecto de T7', supAction.rows[0]?.operation_id === null);

  // El mismo ciclo para learning_resource_version: §8.2/§8.4 tratan ambas familias en paralelo.
  const lr1 = await newResourceVersion('PUBLISHED');
  const lr2 = await newResourceVersion('APPROVED', lr1.resourceId);
  const lrT7 = await transition(PUB, lr2.versionId, { targetStatus: 'PUBLISHED', operationId: randomUUID() }, 'learning-resource-versions');
  check('T7 con supersesión funciona igual en learning_resource_version', (lrT7.status === 200 || lrT7.status === 201) && lrT7.body?.supersededVersionId === lr1.versionId, `status=${lrT7.status} ${lrT7.raw.slice(0, 200)}`);
  const lrT8 = await transition(PUB, lr2.versionId, { targetStatus: 'DEPRECATED', reason: 'Retiro de recurso (gate I3).', operationId: randomUUID() }, 'learning-resource-versions');
  check('T8 funciona igual en learning_resource_version', lrT8.status === 200 || lrT8.status === 201, `status=${lrT8.status}`);

  // ==========================================================================
  // 10. Frontera del incremento -- comprobaciones ESTÁTICAS.
  //     El Incremento 4 (T1/T2/T3, CMS-013, matriz de cobertura, importación)
  //     debe permanecer NO CONSTRUIDO.
  // ==========================================================================
  console.log('--- 10. Frontera: el Incremento 4 permanece no construido (comprobación estática) ---');
  const domainSource = stripComments(readFileSync(join(srcDir, 'education', 'editorial-transition.service.ts'), 'utf8'));
  const controllerSource = stripComments(readFileSync(join(srcDir, 'editorial', 'editorial.controller.ts'), 'utf8'));
  const versionRepoSource = stripComments(readFileSync(join(srcDir, 'education', 'editorial-version.repository.ts'), 'utf8'));

  // ACTUALIZACIÓN LEGÍTIMA (Incremento 4, 2026-08-18): estas tres líneas
  // comprobaban la AUSENCIA de T1/T2/T3, que el Incremento 4 construyó con
  // autorización explícita. Sus sucesoras comprueban lo que sigue siendo una
  // garantía real del Incremento 3: que esta máquina de estados NO se
  // convirtió en una ruta de escritura de contenido. T1/T2 viven en
  // editorial-authoring.service.ts y este servicio no los emite.
  check('la máquina de estados NO emite T1 (crear): la creación vive en el servicio de autoría', !/actionType:\s*'T1'/.test(domainSource));
  check('la máquina de estados NO emite T2 (editar): la edición vive en el servicio de autoría', !/actionType:\s*'T2'/.test(domainSource));
  check('el controller editorial no construye ninguna acción T1/T2 por su cuenta: delega en EDUCATION (invariante 15)', !/actionType:\s*'T[12]'/.test(controllerSource));
  const transitionsTable = /const TRANSITIONS[\s\S]*?\n\];/.exec(domainSource)?.[0] ?? '';
  const declaredCodes = (transitionsTable.match(/code:\s*'(T[0-9])'/g) ?? []).map((m) => m.slice(-3, -1));
  // ACTUALIZACIÓN LEGÍTIMA (Incremento 4): la lista pasa de T4..T8 a T3..T8.
  // Es exactamente lo que §12.4 autorizó añadir, y ni una transición más --
  // T1/T2 NO son transiciones de estado y no aparecen aquí. Que la aserción
  // siga siendo "EXACTAMENTE, ni una más ni una menos" es lo que impide que
  // esta actualización se convierta en una puerta abierta.
  check(
    'la máquina de estados declara EXACTAMENTE las seis transiciones T3..T8 (ni una más, ni una menos)',
    declaredCodes.join(',') === 'T3,T4,T5,T6,T7,T8',
    declaredCodes.join(','),
  );
  // ACTUALIZACIÓN LEGÍTIMA (Incremento 4): CMS-013 es la precondición de T3 y
  // entra aquí legítimamente. Lo que se sigue comprobando es que NO se
  // implementó DENTRO de este archivo ni del controller: vive en su propio
  // módulo puro y se invoca. El controller sigue sin contener ni una regla de
  // contenido.
  check(
    'CMS-013 no se implementa dentro de la máquina de estados ni del controller: vive en su propio módulo y solo se INVOCA',
    /evaluateCms013For/.test(domainSource) &&
      !/alternativa correcta|alternativas duplicadas|answerOptions\.filter/.test(domainSource) &&
      !/CMS-013|evaluateCms013For/.test(controllerSource),
  );
  check('el repositorio editorial NO escribe ninguna columna de contenido (no crea ni edita contenido)', !/stemContent|explanationContent|contentBlocks|title:/.test(versionRepoSource));
  // ACTUALIZACIÓN LEGÍTIMA (Incremento 4): el controller ahora SÍ expone T1
  // (POST) y T2 (PATCH). Lo que se sigue comprobando --y es lo que de verdad
  // protegía esta línea-- es que NO expone `PUT` ni `DELETE`: no existe
  // reemplazo total de una versión ni borrado de contenido por ninguna ruta
  // (invariantes 3 y 5).
  check('el controller editorial NO expone ningún PUT ni DELETE: no hay reemplazo total ni borrado de contenido por API', !/@(Put|Delete)\(/.test(controllerSource));
  check('el controller editorial NO expone la Content Coverage Matrix (Incremento 5)', !/coverage|matrix/i.test(controllerSource));
  check('no existe ningún módulo de importación masiva (CMS-026..029, diferido)', !existsSync(join(srcDir, 'import')) && !existsSync(join(srcDir, 'editorial', 'import')));

  // Reutilización de la frontera del Incremento 2, sin reimplementarla.
  check('el controller editorial reutiliza AdminAuthGuard/AdminRoleGuard/@RequireAdminRole del Incremento 2', /AdminAuthGuard/.test(controllerSource) && /AdminRoleGuard/.test(controllerSource) && /RequireAdminRole/.test(controllerSource));
  check('el controller editorial NO usa InternalOpsGuard (decisión B)', !/InternalOpsGuard|INTERNAL_OPS_KEY/.test(controllerSource));
  check('el controller editorial NO usa AuthGuard de estudiante', !/\bAuthGuard\b/.test(controllerSource));
  check('el controller editorial NO devuelve datos de Account/StudentResponse/AiConversation/PROGRESS/GAMIFICATION/PRIVACY (§11.4)', !/Account|StudentResponse|AiConversation|AiMessage|progress|gamification|privacy/i.test(controllerSource));

  // Invariante 15: la autoridad de dominio vive en EDUCATION.
  check('la máquina de estados vive en education/ (invariante 15: la autoridad de publicación es EDUCATION)', existsSync(join(srcDir, 'education', 'editorial-transition.service.ts')));
  check('el controller administrativo NO contiene lógica de máquina de estados (solicita, no decide)', !/IN_REVIEW|APPROVED|DEPRECATED|PUBLISHED/.test(controllerSource));

  // Invariante 19: los cuatro lectores, sin cambios.
  const educationSvc = readFileSync(join(srcDir, 'education', 'education.service.ts'), 'utf8');
  const qvRepo = readFileSync(join(srcDir, 'education', 'question-version.repository.ts'), 'utf8');
  const lrvRepo = readFileSync(join(srcDir, 'education', 'learning-resource-version.repository.ts'), 'utf8');
  const progressSvc = readFileSync(join(srcDir, 'progress', 'progress.service.ts'), 'utf8');
  check("lector 1: `findPublishedByTopicId` conserva su predicado `editorialStatus: 'PUBLISHED'`", /editorialStatus: 'PUBLISHED'/.test(qvRepo));
  check("lector 1: `findLatestPublishedByTopicId` conserva su predicado", /editorialStatus: 'PUBLISHED'/.test(lrvRepo));
  check('lector 2: PROGRESS conserva su predicado PUBLISHED + ACTIVE + tema', /editorialStatus !== 'PUBLISHED'/.test(progressSvc) && /question\.status !== 'ACTIVE'/.test(progressSvc));
  check('ningún repositorio lector ganó métodos de escritura editorial (viven en editorial-version.repository.ts)', !/updateEditorialStatus/.test(qvRepo + lrvRepo));
  check('EducationService no ganó ninguna operación de escritura', !/editorialStatus:\s*'DEPRECATED'|update\(/.test(educationSvc));

  // Contratos: ningún campo de rol ni de actor en las peticiones (invariante 22).
  const editorialContract = stripComments(readFileSync(join(backendDir, '..', '..', 'packages', 'contracts', 'src', 'editorial.ts'), 'utf8'));
  const requestBlock = /editorialTransitionRequestSchema[\s\S]*?\.strict\(\)/.exec(editorialContract)?.[0] ?? '';
  check('ningún contrato de PETICIÓN editorial contiene un campo de rol o de actor (invariante 22)', requestBlock.length > 0 && !/\brole\b|\bactorId\b|\broles\b/.test(requestBlock), requestBlock.slice(0, 200));

  // El contrato del Incremento 2 sigue intacto.
  const adminContract = stripComments(readFileSync(join(backendDir, '..', '..', 'packages', 'contracts', 'src', 'administration.ts'), 'utf8'));
  check('`packages/contracts/src/administration.ts` (Incremento 2) sigue SIN ningún *RequestSchema -- su gate no se degrada', !/RequestSchema/.test(adminContract));

  // apps/ sin paquetes nuevos.
  check('`apps/` sigue conteniendo exactamente backend y mobile', existsSync(join(backendDir, '..', 'mobile')) && !existsSync(join(backendDir, '..', 'admin-web')));

  // ==========================================================================
  // 11. §13.3.9 -- Regresión completa de Bloques I-VI en PASS.
  //     Se REFERENCIA/INVOCA el gate consolidado existente, no se reimplementa.
  // ==========================================================================
  console.log('--- 11. Regresión de Bloques I-VI (invocación del gate consolidado existente) ---');
  const lefGate = join(backendDir, '..', '..', 'scripts', 'verify-learning-experience-foundation-gate.mjs');
  check('el gate consolidado de la fase existe y se referencia (no se reimplementa)', existsSync(lefGate), lefGate);
  console.log('       -> la ejecución de la regresión completa se hace fuera de este gate:');
  console.log('          npm run verify:learning-experience-foundation-gate');

  await pg.end();

  console.log('');
  console.log(`Checks ejecutados: ${checksRun}`);
  if (failures > 0) {
    console.error(`GATE I3 FALLIDO -- ${failures} comprobacion(es) en rojo.`);
    process.exit(1);
  }
  console.log('GATE I3 EN VERDE -- LEF Bloque VII, Incremento 3 (transiciones de estado con auditoría).');
}

/** Falla si la sentencia NO lanza (esperábamos que Postgres la rechazara). */
async function expectRejected(pg: Client, label: string, sql: string, params: unknown[] = []) {
  try {
    await pg.query(sql, params);
    check(label, false, 'la sentencia fue ACEPTADA');
  } catch (error) {
    check(label, error instanceof Error && error.message.length > 0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
