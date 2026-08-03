// Gate de integración PROGRESS -> GAMIFICATION -- ver
// docs/adr/0016-gamificacion-fundacion.md. Prueba contra el servidor real
// ya compilado y corriendo, con acceso directo a Postgres para inspeccionar
// outbox_event/outbox_event_delivery/validated_gamification_activity y
// para fixtures que no son alcanzables solo con rutas HTTP.
//
// NO calcula XP, NO toca xp_ledger_entry/xp_balance -- fuera de alcance de
// este incremento.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
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
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function newSession(label: string) {
  const uid = `gam-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const r = await req('POST', '/auth/session', {}, { idToken });
  return {
    accountId: r.body?.accountId as string,
    authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': r.body?.sessionId },
  };
}

async function relayGamification() {
  return req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey });
}

async function relayAnalytics() {
  return req('POST', '/analytics/_internal/relay', { 'x-internal-ops-key': opsKey });
}

/**
 * outbox_event es una tabla compartida: cualquier backlog previo (AUTH,
 * PRIVACY, corridas anteriores) aparece "pendiente" para GAMIFICATION la
 * primera vez que se le pide procesar, aunque ya haya sido consumido por
 * ANALYTICS -- son consumidores independientes por diseño (ADR-0017), así
 * que GAMIFICATION debe recorrer y descartar (FAILED, eventKey desconocido)
 * ese backlog una sola vez antes de que las aserciones de este gate tengan
 * sentido. Drenar en un loop evita depender de resetear la base de datos.
 */
async function drainGamificationBacklog() {
  for (let i = 0; i < 50; i++) {
    const r = await relayGamification();
    const total = (r.body?.processed ?? 0) + (r.body?.failed ?? 0);
    if (total === 0) return i;
  }
  throw new Error('El backlog de GAMIFICATION no drenó tras 50 iteraciones -- algo no converge.');
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const topicRow = await pg.query(`SELECT id FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
  const topicId = topicRow.rows[0].id;
  const questionVersions = await pg.query(
    `SELECT id FROM question_version WHERE curriculum_topic_id = $1 AND editorial_status = 'PUBLISHED' ORDER BY published_at ASC`,
    [topicId],
  );
  const [qv1, qv2] = questionVersions.rows.map((r) => r.id);
  const opt1Correct = (
    await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = true`, [qv1])
  ).rows[0].id;
  const opt2Wrong = (
    await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = false LIMIT 1`, [qv2])
  ).rows[0].id;

  console.log('--- -1. Decision Gate 5 (Bloque I): autoridad exclusiva de servidor -- sin clave de operaciones -> 401 ---');
  const relayNoKey = await req('POST', '/gamification/_internal/relay');
  check('POST /gamification/_internal/relay sin INTERNAL_OPS_KEY -> 401', relayNoKey.status === 401);

  console.log('--- 0. Drenar backlog previo de outbox_event para el consumidor GAMIFICATION ---');
  const drainedIn = await drainGamificationBacklog();
  check('backlog drenado sin error (loop convergió)', true);
  console.log(`  (${drainedIn} iteración(es) de relay hasta quedar sin pendientes)`);

  // ============================================================
  // 1. Primera respuesta: publica student_response_recorded.v1, NO publica
  //    curriculum_topic_completed.v1 todavía (falta una pregunta).
  // ============================================================
  console.log('--- 1. Primera respuesta real: publica student_response_recorded.v1 ---');
  const a = await newSession('a');
  const opA1 = randomUUID();
  const r1 = await req('POST', `/progress/topics/${topicId}/responses`, a.authHeaders, {
    questionVersionId: qv1,
    answerOptionId: opt1Correct,
    operationId: opA1,
  });
  check('respuesta correcta -> 201', r1.status === 201);
  check('topicStatus IN_PROGRESS (falta una pregunta)', r1.body?.topicStatus === 'IN_PROGRESS');

  const studentResponse1 = (
    await pg.query('SELECT id FROM student_response WHERE account_id = $1 AND question_version_id = $2', [a.accountId, qv1])
  ).rows[0];
  check('StudentResponse creado', Boolean(studentResponse1?.id));

  const outboxResponse1 = await pg.query(
    "SELECT id, payload FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'student_response_recorded'",
    [a.accountId],
  );
  check('exactamente 1 evento student_response_recorded publicado', outboxResponse1.rowCount === 1);
  check(
    'payload.studentResponseId coincide con la fila real',
    outboxResponse1.rows[0]?.payload?.studentResponseId === studentResponse1.id,
  );
  check('payload.isCorrect coincide con la respuesta real (true)', outboxResponse1.rows[0]?.payload?.isCorrect === true);

  const outboxCompleted1 = await pg.query(
    "SELECT id FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'curriculum_topic_completed'",
    [a.accountId],
  );
  check('curriculum_topic_completed NO publicado todavía (tema no completo)', outboxCompleted1.rowCount === 0);

  console.log('--- 1b. Replay exacto (mismo operationId) NO republica el evento ---');
  const r1Replay = await req('POST', `/progress/topics/${topicId}/responses`, a.authHeaders, {
    questionVersionId: qv1,
    answerOptionId: opt1Correct,
    operationId: opA1,
  });
  check('replay exacto -> 200 (no 201)', r1Replay.status === 200);
  const outboxResponse1AfterReplay = await pg.query(
    "SELECT count(*)::int AS n FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'student_response_recorded'",
    [a.accountId],
  );
  check('replay no generó un segundo evento', outboxResponse1AfterReplay.rows[0].n === 1);

  // ============================================================
  // 2. Segunda respuesta: completa el tema -> publica AMBOS eventos.
  // ============================================================
  console.log('--- 2. Segunda respuesta: completa el tema -> publica curriculum_topic_completed.v1 ---');
  const opA2 = randomUUID();
  const r2 = await req('POST', `/progress/topics/${topicId}/responses`, a.authHeaders, {
    questionVersionId: qv2,
    answerOptionId: opt2Wrong,
    operationId: opA2,
  });
  check('respuesta incorrecta -> 201', r2.status === 201);
  check('topicStatus COMPLETED', r2.body?.topicStatus === 'COMPLETED');

  const outboxResponse2 = await pg.query(
    "SELECT count(*)::int AS n FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'student_response_recorded'",
    [a.accountId],
  );
  check('ahora 2 eventos student_response_recorded en total', outboxResponse2.rows[0].n === 2);

  const outboxCompleted2 = await pg.query(
    "SELECT id, payload FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'curriculum_topic_completed'",
    [a.accountId],
  );
  check('exactamente 1 evento curriculum_topic_completed publicado', outboxCompleted2.rowCount === 1);
  check('payload.curriculumTopicId coincide con el tema real', outboxCompleted2.rows[0]?.payload?.curriculumTopicId === topicId);

  // ============================================================
  // 3. Relay: crea validated_gamification_activity para ambos hechos.
  // ============================================================
  console.log('--- 3. Relay de GAMIFICATION: crea validated_gamification_activity ---');
  const relayResult = await relayGamification();
  check('relay status 200', relayResult.status === 200);
  check('relay procesó al menos los 3 eventos nuevos (2 respuestas + 1 completado)', relayResult.body?.processed >= 3);

  const activityResponse1 = await pg.query(
    "SELECT id, source_entity_type, source_entity_id, activity_type, deduplication_key FROM validated_gamification_activity WHERE deduplication_key = $1",
    [`response:${studentResponse1.id}`],
  );
  check('validated_gamification_activity creada para la 1ra respuesta', activityResponse1.rowCount === 1);
  check('sourceEntityType == StudentResponse', activityResponse1.rows[0]?.source_entity_type === 'StudentResponse');
  check('sourceEntityId == studentResponseId', activityResponse1.rows[0]?.source_entity_id === studentResponse1.id);

  const activityCompleted = await pg.query(
    'SELECT id, source_entity_type, source_entity_id FROM validated_gamification_activity WHERE deduplication_key = $1',
    [`topic-completed:${a.accountId}:${topicId}`],
  );
  check('validated_gamification_activity creada para el tema completado', activityCompleted.rowCount === 1);
  check('sourceEntityType == CurriculumTopicProgress', activityCompleted.rows[0]?.source_entity_type === 'CurriculumTopicProgress');
  check('sourceEntityId == curriculumTopicId', activityCompleted.rows[0]?.source_entity_id === topicId);

  const deliveryForResponse1 = await pg.query(
    "SELECT status FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'",
    [outboxResponse1.rows[0].id],
  );
  check('outbox_event_delivery(GAMIFICATION) marcado PROCESSED', deliveryForResponse1.rows[0]?.status === 'PROCESSED');

  console.log('--- 3b. Segundo relay inmediato: 0 procesados (nada pendiente, sin duplicar) ---');
  const relayResult2 = await relayGamification();
  check('segundo relay: 0 procesados', relayResult2.body?.processed === 0);
  const activityCountAfterSecondRelay = await pg.query(
    'SELECT count(*)::int AS n FROM validated_gamification_activity WHERE deduplication_key = $1',
    [`response:${studentResponse1.id}`],
  );
  check('correr el relay dos veces no duplica la actividad validada', activityCountAfterSecondRelay.rows[0].n === 1);

  // ============================================================
  // 4. Deduplicación de NEGOCIO: dos outbox_event DISTINTOS para el mismo
  //    hecho académico (simulando una publicación duplicada por error) no
  //    producen una segunda actividad validada.
  // ============================================================
  console.log('--- 4. Deduplicación de negocio: dos eventos distintos para el MISMO hecho -> 1 sola actividad ---');
  const duplicateOutboxId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'student_response_recorded', 'v1', 'PROGRESS', $2, now(), $3::jsonb)`,
    [
      duplicateOutboxId,
      a.accountId,
      JSON.stringify({
        accountId: a.accountId,
        studentResponseId: studentResponse1.id,
        questionVersionId: qv1,
        curriculumTopicId: topicId,
        isCorrect: true,
        respondedAt: new Date().toISOString(),
      }),
    ],
  );
  const relayResult3 = await relayGamification();
  check('relay procesó el evento duplicado (delivery propia, no falla)', relayResult3.body?.processed >= 1);
  const activityCountAfterDuplicate = await pg.query(
    'SELECT count(*)::int AS n FROM validated_gamification_activity WHERE deduplication_key = $1',
    [`response:${studentResponse1.id}`],
  );
  check(
    'sigue existiendo UNA sola validated_gamification_activity para ese hecho académico',
    activityCountAfterDuplicate.rows[0].n === 1,
  );
  const duplicateDeliveryStatus = await pg.query(
    "SELECT status FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'",
    [duplicateOutboxId],
  );
  check(
    'el outbox_event duplicado igual queda PROCESSED (éxito idempotente, no error)',
    duplicateDeliveryStatus.rows[0]?.status === 'PROCESSED',
  );

  // ============================================================
  // 5. Fallo aislado: un evento con payload inválido falla para
  //    GAMIFICATION sin afectar a ANALYTICS ni al resto del lote.
  // ============================================================
  console.log('--- 5. Fallo con payload inválido: aislado, no afecta a ANALYTICS ni al resto del lote ---');
  const badOutboxId = randomUUID();
  const goodOutboxId = randomUUID();
  const goodStudentResponseId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'student_response_recorded', 'v1', 'PROGRESS', $2, now(), $3::jsonb)`,
    [badOutboxId, a.accountId, JSON.stringify({ accountId: a.accountId, isCorrect: true })], // faltan campos obligatorios
  );
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'student_response_recorded', 'v1', 'PROGRESS', $2, now(), $3::jsonb)`,
    [
      goodOutboxId,
      a.accountId,
      JSON.stringify({
        accountId: a.accountId,
        studentResponseId: goodStudentResponseId,
        questionVersionId: qv1,
        curriculumTopicId: topicId,
        isCorrect: true,
        respondedAt: new Date().toISOString(),
      }),
    ],
  );
  const relayResult4 = await relayGamification();
  check('relay reporta al menos 1 fallo (payload inválido)', relayResult4.body?.failed >= 1);
  check('relay igual procesó la fila buena del mismo lote', relayResult4.body?.processed >= 1);

  const badDelivery = await pg.query(
    "SELECT status, last_error FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'",
    [badOutboxId],
  );
  check('payload inválido queda FAILED', badDelivery.rows[0]?.status === 'FAILED');
  check('last_error registrado', Boolean(badDelivery.rows[0]?.last_error));

  const analyticsUnaffected = await pg.query(
    "SELECT status FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'ANALYTICS'",
    [outboxResponse1.rows[0].id],
  );
  check(
    'ANALYTICS no tiene fila de entrega para un evento que nunca le pertenece (independencia real entre consumidores)',
    analyticsUnaffected.rowCount === 0,
  );

  // ============================================================
  // 6. Aislamiento de PROGRESS: con GAMIFICATION deliberadamente SIN
  //    relay, el envío de una respuesta real sigue teniendo éxito.
  // ============================================================
  console.log('--- 6. Aislamiento: PROGRESS funciona con éxito aunque GAMIFICATION no procese nada ---');
  const b = await newSession('b');
  const opB1 = randomUUID();
  const r3 = await req('POST', `/progress/topics/${topicId}/responses`, b.authHeaders, {
    questionVersionId: qv1,
    answerOptionId: opt1Correct,
    operationId: opB1,
  });
  check('respuesta de una cuenta nueva -> 201, sin depender del relay de GAMIFICATION', r3.status === 201);
  const pendingForNewAccount = await pg.query(
    "SELECT oe.id FROM outbox_event oe LEFT JOIN outbox_event_delivery oed ON oed.outbox_event_id = oe.id AND oed.consumer_name = 'GAMIFICATION' WHERE oe.aggregate_id = $1 AND oe.event_key = 'student_response_recorded' AND oed.id IS NULL",
    [b.accountId],
  );
  check(
    'el evento queda pendiente sin fila de entrega -- PROGRESS no esperó ni dependió de GAMIFICATION',
    pendingForNewAccount.rowCount === 1,
  );

  console.log('--- 7. Confirmación cruzada: ANALYTICS sigue funcionando igual, sin interferencia de GAMIFICATION ---');
  const analyticsRelayResult = await relayAnalytics();
  check('relay de ANALYTICS sigue respondiendo 200 con GAMIFICATION activo', analyticsRelayResult.status === 200);

  console.log('--- 8. Fuera de alcance verificado: NADA escribió en xp_ledger_entry ni xp_balance en este gate ---');
  const ledgerCountForAccountA = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1', [
    a.accountId,
  ]);
  const balanceCountForAccountA = await pg.query('SELECT count(*)::int AS n FROM xp_balance WHERE account_id = $1', [
    a.accountId,
  ]);
  check('xp_ledger_entry: 0 filas para la cuenta de este gate (sin cálculo de XP todavía)', ledgerCountForAccountA.rows[0].n === 0);
  check('xp_balance: 0 filas para la cuenta de este gate', balanceCountForAccountA.rows[0].n === 0);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de integración PROGRESS -> GAMIFICATION pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
