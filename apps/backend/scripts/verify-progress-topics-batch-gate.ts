// Gate de "Progreso batch de temas" (GET /progress/topics?topicIds=...) --
// corrección del fan-out N+1 encontrado en Inicio (mobile): un cliente con
// muchos temas raíz hacía antes un GET /progress/topics/:id POR TEMA, hasta
// superar el rate limit con un catálogo de prueba contaminado.
//
// HIGIENE DE FIXTURES -- a diferencia de otros gates de este directorio,
// este SIEMPRE limpia sus propios datos, tanto en PASS como en FAIL:
//   1. Todas sus preguntas quedan en DRAFT -- NUNCA se publican. Publicar
//      dispararía `enforce_question_version_published_no_delete` (invariante
//      editorial real) y dejaría la fixture atrapada permanentemente, como
//      ya le pasó a otros gates de este mismo directorio (ver hallazgo de
//      contaminación de BD). Como el endpoint bajo prueba solo lee
//      `curriculum_topic_progress`/`student_response` (nunca el estado
//      editorial de la pregunta), las respuestas de prueba se insertan
//      DIRECTAMENTE por SQL sobre esas dos tablas -- no hace falta pasar por
//      POST /progress/topics/:id/responses (que sí exige PUBLISHED).
//   2. Todo el cuerpo corre dentro de un try/finally: el `finally` borra por
//      patrón de sufijo (no por lista de ids, para ser robusto incluso si la
//      creación de fixtures falló a mitad de camino), en orden seguro para
//      las FK, y corre SIEMPRE -- también si algún check falla o si algo
//      lanza.
//   3. Antes de crear fixtures y después de limpiarlas, se cuenta cuántas
//      filas de cada tabla coinciden con el sufijo único de esta corrida --
//      debe dar 0 en ambos momentos. Es una aserción explícita del propio
//      gate, no una promesa sin verificar.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null, raw: text };
}

async function createSession(
  suffix: string,
  uidLabel: string,
): Promise<{ accountId: string; headers: Record<string, string>; providerSubject: string }> {
  // El sufijo viene del llamador (compartido con subject/curriculum_topic/question de esta
  // misma corrida) -- NUNCA un `Date.now()` propio aquí, o el patrón LIKE que usa la
  // limpieza (`cleanupBySuffix`) no encontraría esta cuenta y quedaría huérfana.
  const providerSubject = `progress-batch-gate-${uidLabel}-${suffix}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject, email: `${providerSubject}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${providerSubject}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
    providerSubject,
  };
}

async function countBySuffix(pg: Client, suffix: string) {
  const [subjects, topics, questions, versions, responses, progress, accounts] = await Promise.all([
    pg.query(`SELECT COUNT(*) FROM subject WHERE subject_key LIKE $1`, [`progress-batch-gate-subject-${suffix}%`]),
    pg.query(`SELECT COUNT(*) FROM curriculum_topic WHERE code LIKE $1`, [`progress-batch-gate-topic-${suffix}%`]),
    pg.query(`SELECT COUNT(*) FROM question WHERE question_key LIKE $1`, [`progress-batch-gate-q-${suffix}%`]),
    pg.query(
      `SELECT COUNT(*) FROM question_version qv JOIN question q ON q.id = qv.question_id WHERE q.question_key LIKE $1`,
      [`progress-batch-gate-q-${suffix}%`],
    ),
    pg.query(
      `SELECT COUNT(*) FROM student_response sr JOIN auth_identity ai ON ai.account_id = sr.account_id WHERE ai.provider_subject LIKE $1`,
      [`progress-batch-gate-%-${suffix}%`],
    ),
    pg.query(
      `SELECT COUNT(*) FROM curriculum_topic_progress ctp JOIN auth_identity ai ON ai.account_id = ctp.account_id WHERE ai.provider_subject LIKE $1`,
      [`progress-batch-gate-%-${suffix}%`],
    ),
    pg.query(`SELECT COUNT(*) FROM auth_identity WHERE provider_subject LIKE $1`, [`progress-batch-gate-%-${suffix}%`]),
  ]);
  return {
    subject: Number(subjects.rows[0].count),
    curriculum_topic: Number(topics.rows[0].count),
    question: Number(questions.rows[0].count),
    question_version: Number(versions.rows[0].count),
    student_response: Number(responses.rows[0].count),
    curriculum_topic_progress: Number(progress.rows[0].count),
    auth_identity: Number(accounts.rows[0].count),
  };
}

function allZero(counts: Record<string, number>): boolean {
  return Object.values(counts).every((n) => n === 0);
}

/**
 * Cada paso corre en su propio `try/catch` -- si UNO falla (ej. por un id
 * inesperado que no coincide con el patrón de esta corrida), los demás
 * pasos igual se ejecutan. `cleanupBySuffix` nunca lanza: la limpieza es
 * "mejor esfuerzo garantizado", nunca todo-o-nada -- un fallo parcial deja
 * el resto de la limpieza avanzar en vez de abortar y dejar TODO
 * persistido. Cualquier residuo real que sobreviva a esto lo reporta la
 * verificación explícita de después (`countBySuffix` + `check()`), nunca
 * queda oculto.
 */
async function cleanupBySuffix(pg: Client, suffix: string): Promise<void> {
  async function step(label: string, sql: string, params: unknown[]): Promise<void> {
    try {
      await pg.query(sql, params);
    } catch (error) {
      console.error(`  (limpieza) paso "${label}" falló, se continúa con el resto:`, (error as Error).message);
    }
  }

  // Orden seguro para FK RESTRICT: respuestas/progreso -> answer_option (cascade
  // desde question_version) -> question_version -> question -> curriculum_topic
  // -> subject -> auth_session/auth_identity/account. Ninguna fila de esta
  // fixture llega nunca a PUBLISHED/DEPRECATED -- el trigger de inmutabilidad
  // editorial nunca puede bloquear este borrado.
  await step(
    'student_response',
    `DELETE FROM student_response WHERE account_id IN (SELECT account_id FROM auth_identity WHERE provider_subject LIKE $1)`,
    [`progress-batch-gate-%-${suffix}%`],
  );
  await step(
    'curriculum_topic_progress',
    `DELETE FROM curriculum_topic_progress WHERE account_id IN (SELECT account_id FROM auth_identity WHERE provider_subject LIKE $1)`,
    [`progress-batch-gate-%-${suffix}%`],
  );
  await step(
    'question_version',
    `DELETE FROM question_version WHERE question_id IN (SELECT id FROM question WHERE question_key LIKE $1)`,
    [`progress-batch-gate-q-${suffix}%`],
  );
  await step('question', `DELETE FROM question WHERE question_key LIKE $1`, [`progress-batch-gate-q-${suffix}%`]);
  await step('curriculum_topic', `DELETE FROM curriculum_topic WHERE code LIKE $1`, [`progress-batch-gate-topic-${suffix}%`]);
  await step('subject', `DELETE FROM subject WHERE subject_key LIKE $1`, [`progress-batch-gate-subject-${suffix}%`]);
  await step(
    'auth_session',
    `DELETE FROM auth_session WHERE account_id IN (SELECT account_id FROM auth_identity WHERE provider_subject LIKE $1)`,
    [`progress-batch-gate-%-${suffix}%`],
  );

  let gateAccountIds: string[] = [];
  try {
    const rows = await pg.query(`SELECT account_id FROM auth_identity WHERE provider_subject LIKE $1`, [
      `progress-batch-gate-%-${suffix}%`,
    ]);
    gateAccountIds = rows.rows.map((row) => row.account_id as string);
  } catch (error) {
    console.error('  (limpieza) no se pudo leer las cuentas de esta corrida:', (error as Error).message);
  }
  await step('auth_identity', `DELETE FROM auth_identity WHERE provider_subject LIKE $1`, [`progress-batch-gate-%-${suffix}%`]);
  for (const accountId of gateAccountIds) {
    await step('account', `DELETE FROM account WHERE id = $1`, [accountId]);
  }
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const suffix = `${Date.now()}`;

  console.log('--- 0. Aislamiento: baseline ANTES de crear fixtures (debe ser 0 en todo) ---');
  const before = await countBySuffix(pg, suffix);
  check('ninguna fila coincide con el sufijo de esta corrida antes de empezar', allZero(before));

  try {
    console.log('--- 1. Fixtures: materia/temas AISLADOS, preguntas SIEMPRE en DRAFT (nunca PUBLISHED) ---');
    const subjectId = randomUUID();
    await pg.query(
      `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
       VALUES ($1, $2, 'Materia de prueba -- progreso batch', 'Prueba', 'ACTIVE', 999, now(), now())`,
      [subjectId, `progress-batch-gate-subject-${suffix}`],
    );

    const topicNotStarted = randomUUID();
    const topicResource = randomUUID();
    const topicExercise = randomUUID();
    const topicCompleted = randomUUID();
    for (const [id, code, order] of [
      [topicNotStarted, `progress-batch-gate-topic-${suffix}-notstarted`, 1],
      [topicResource, `progress-batch-gate-topic-${suffix}-resource`, 2],
      [topicExercise, `progress-batch-gate-topic-${suffix}-exercise`, 3],
      [topicCompleted, `progress-batch-gate-topic-${suffix}-completed`, 4],
    ] as const) {
      await pg.query(
        `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
         VALUES ($1, $2, $2, $3, $4, now(), now())`,
        [id, code, order, subjectId],
      );
    }

    // Pregunta DRAFT con 2 alternativas -- suficiente para insertar
    // `student_response` real vía SQL (la FK no exige PUBLISHED, solo la
    // regla de negocio de `submitResponse()`, que aquí no usamos).
    async function makeDraftQuestion(topicId: string, label: string) {
      const questionId = randomUUID();
      const versionId = randomUUID();
      const correctOptionId = randomUUID();
      const wrongOptionId = randomUUID();
      await pg.query(
        `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
        [questionId, `progress-batch-gate-q-${suffix}-${label}`, subjectId],
      );
      await pg.query(
        `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
         VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
        [versionId, questionId, topicId],
      );
      await pg.query(
        `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
         VALUES ($1, $2, $3, 0, true, now())`,
        [correctOptionId, versionId, JSON.stringify({ type: 'paragraph', order: 0, text: 'correcta' })],
      );
      await pg.query(
        `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
         VALUES ($1, $2, $3, 1, false, now())`,
        [wrongOptionId, versionId, JSON.stringify({ type: 'paragraph', order: 1, text: 'incorrecta' })],
      );
      return { questionId, versionId, correctOptionId, wrongOptionId };
    }

    const qExercise = await makeDraftQuestion(topicExercise, 'exercise1');
    await makeDraftQuestion(topicExercise, 'exercise2'); // segunda pregunta, nunca respondida -- el tema queda IN_PROGRESS, no COMPLETED.
    const qCompleted = await makeDraftQuestion(topicCompleted, 'completed1');

    const alice = await createSession(suffix, 'alice');

    // topicResource: fila de progreso IN_PROGRESS pero SIN respuestas (nunca
    // se creó una pregunta para este tema) -- resolveContinuationEntry (mobile)
    // lo interpreta como 'resource'.
    await pg.query(
      `INSERT INTO curriculum_topic_progress (id, account_id, curriculum_topic_id, status, started_at, last_activity_at, completed_at)
       VALUES ($1, $2, $3, 'IN_PROGRESS', now(), now(), NULL)`,
      [randomUUID(), alice.accountId, topicResource],
    );

    // topicExercise: progreso IN_PROGRESS + 1 respuesta (de 2 preguntas) -- 'exercise'.
    await pg.query(
      `INSERT INTO curriculum_topic_progress (id, account_id, curriculum_topic_id, status, started_at, last_activity_at, completed_at)
       VALUES ($1, $2, $3, 'IN_PROGRESS', now(), now(), NULL)`,
      [randomUUID(), alice.accountId, topicExercise],
    );
    await pg.query(
      `INSERT INTO student_response (id, account_id, question_version_id, answer_option_id, is_correct, responded_at, operation_id)
       VALUES ($1, $2, $3, $4, true, now(), $5)`,
      [randomUUID(), alice.accountId, qExercise.versionId, qExercise.correctOptionId, randomUUID()],
    );

    // topicCompleted: progreso COMPLETED + su única pregunta respondida.
    await pg.query(
      `INSERT INTO curriculum_topic_progress (id, account_id, curriculum_topic_id, status, started_at, last_activity_at, completed_at)
       VALUES ($1, $2, $3, 'COMPLETED', now(), now(), now())`,
      [randomUUID(), alice.accountId, topicCompleted],
    );
    await pg.query(
      `INSERT INTO student_response (id, account_id, question_version_id, answer_option_id, is_correct, responded_at, operation_id)
       VALUES ($1, $2, $3, $4, true, now(), $5)`,
      [randomUUID(), alice.accountId, qCompleted.versionId, qCompleted.correctOptionId, randomUUID()],
    );
    // topicNotStarted: deliberadamente SIN fila de curriculum_topic_progress.

    check('fixtures creadas sin errores', true);

    console.log('--- 2. GET /progress/topics?topicIds=... -- shape y valores correctos por tema ---');
    const idsParam = [topicNotStarted, topicResource, topicExercise, topicCompleted].join(',');
    const batch = await req('GET', `/progress/topics?topicIds=${idsParam}`, alice.headers);
    check('status 200', batch.status === 200);
    check('devuelve un elemento por cada uno de los 4 temas solicitados', Array.isArray(batch.body) && batch.body.length === 4);

    const byId = new Map<string, any>((batch.body ?? []).map((p: any) => [p.curriculumTopicId, p]));
    check('topicNotStarted -> NOT_STARTED, sin respuestas', byId.get(topicNotStarted)?.status === 'NOT_STARTED' && byId.get(topicNotStarted)?.responses.length === 0);
    check('topicResource -> IN_PROGRESS, sin respuestas', byId.get(topicResource)?.status === 'IN_PROGRESS' && byId.get(topicResource)?.responses.length === 0);
    check('topicExercise -> IN_PROGRESS, 1 respuesta', byId.get(topicExercise)?.status === 'IN_PROGRESS' && byId.get(topicExercise)?.responses.length === 1);
    check('topicCompleted -> COMPLETED, 1 respuesta', byId.get(topicCompleted)?.status === 'COMPLETED' && byId.get(topicCompleted)?.responses.length === 1);

    console.log('--- 3. Paridad EXACTA contra el endpoint singular (misma fuente `assembleTopicProgress`, nunca deben divergir) ---');
    for (const topicId of [topicNotStarted, topicResource, topicExercise, topicCompleted]) {
      const single = await req('GET', `/progress/topics/${topicId}`, alice.headers);
      check(`tema ${topicId.slice(0, 8)}: batch === singular`, JSON.stringify(byId.get(topicId)) === JSON.stringify(single.body));
    }

    console.log('--- 4. IDs inexistentes: se omiten en silencio, nunca 404 parcial ---');
    const withUnknown = await req('GET', `/progress/topics?topicIds=${topicNotStarted},${randomUUID()}`, alice.headers);
    check('status 200 (no 404 aunque uno de los ids no exista)', withUnknown.status === 200);
    check('solo el tema real aparece en la respuesta', withUnknown.body?.length === 1 && withUnknown.body[0].curriculumTopicId === topicNotStarted);

    console.log('--- 5. Deduplicación: el mismo id repetido no rompe ni duplica la respuesta ---');
    const dup = await req('GET', `/progress/topics?topicIds=${topicNotStarted},${topicNotStarted}`, alice.headers);
    check('status 200 con id repetido', dup.status === 200);
    check('sin duplicados en la respuesta', dup.body?.length === 1);

    console.log('--- 6. Cotas de la solicitud batch (protección de API general, no un filtro de fixtures) ---');
    const empty = await req('GET', '/progress/topics?topicIds=', alice.headers);
    check('topicIds vacío -> 400', empty.status === 400);

    const tooMany = Array.from({ length: 301 }, () => randomUUID()).join(',');
    const overLimit = await req('GET', `/progress/topics?topicIds=${tooMany}`, alice.headers);
    check('301 ids -> 400 (límite MAX_TOPIC_PROGRESS_BATCH_IDS = 300)', overLimit.status === 400);

    const atLimit = Array.from({ length: 300 }, () => randomUUID()).join(',');
    const atLimitRes = await req('GET', `/progress/topics?topicIds=${atLimit}`, alice.headers);
    check('exactamente 300 ids -> 200 (ninguno existe, respuesta vacía)', atLimitRes.status === 200 && Array.isArray(atLimitRes.body) && atLimitRes.body.length === 0);

    console.log('--- 7. Sin sesión -> 401 ---');
    const noSession = await req('GET', `/progress/topics?topicIds=${topicNotStarted}`);
    check('sin sesión -> 401', noSession.status === 401);

    console.log('--- 8. Prueba de arquitectura: N temas -> UNA sola solicitud, no N (reproduce el caso real de Inicio a escala comparable) ---');
    const manyTopicIds: string[] = [];
    for (let i = 0; i < 130; i++) {
      const id = randomUUID();
      manyTopicIds.push(id);
      await pg.query(
        `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
         VALUES ($1, $2, $2, $3, $4, now(), now())`,
        [id, `progress-batch-gate-topic-${suffix}-many-${i}`, 100 + i, subjectId],
      );
    }
    // Línea base del bucket de rate-limit INMEDIATAMENTE antes del batch de
    // 130 -- una llamada barata al mismo endpoint, para comparar la caída
    // exacta que provoca la siguiente solicitud (no el total nominal del
    // tier, que ya se gastó parcialmente en los pasos 2-7 de este mismo gate).
    const baseline = await req('GET', `/progress/topics?topicIds=${topicNotStarted}`, alice.headers);
    const remainingBefore = Number(baseline.headers.get('x-ratelimit-remaining'));

    const manyRes = await req('GET', `/progress/topics?topicIds=${manyTopicIds.join(',')}`, alice.headers);
    check('200 con los 130 temas (todos NOT_STARTED, nadie tiene progreso)', manyRes.status === 200 && manyRes.body?.length === 130);
    const remainingAfter = Number(manyRes.headers.get('x-ratelimit-remaining'));
    check(
      `el bucket de rate-limit bajó EXACTAMENTE 1 por la solicitud de 130 temas (antes=${remainingBefore}, después=${remainingAfter}), no 130`,
      Number.isFinite(remainingBefore) && Number.isFinite(remainingAfter) && remainingBefore - remainingAfter === 1,
    );

    console.log('');
    if (failures > 0) {
      console.error(`${failures} verificación(es) fallaron.`);
    } else {
      console.log('Todas las verificaciones del gate de Progreso Batch de Temas pasaron.');
    }
  } finally {
    console.log('--- 9. Limpieza garantizada (corre siempre, incluso si algo falló arriba) ---');
    await cleanupBySuffix(pg, suffix);
    const after = await countBySuffix(pg, suffix);
    check('ninguna fila de esta corrida quedó persistida tras la limpieza', allZero(after));
    if (!allZero(after)) {
      console.error('Conteos residuales:', after);
    }
    await pg.end();
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
