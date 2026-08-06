// Gate del Bloque IV, Incremento 4, sub-incremento 4.c ("Endpoints HTTP y
// contratos de Pregunta rápida") -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md
// §13.4. Contra el servidor real ya compilado y corriendo, mismo patrón que
// verify-progress-gate.ts/verify-competitive-profile-endpoint-gate.ts.
// Precisiones obligatorias del Product Owner verificadas aquí: sin
// questionVersionId en /next, rutas bajo /gamification/me/quick-question/sessions,
// cuerpos .strict() (incluidos los vacíos), 200 uniforme (creación/reutilización,
// respuesta/replay, cierre/cierre idempotente, NO_QUESTIONS_AVAILABLE).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3010';
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
  const uid = `qq-http-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const r = await req('POST', '/auth/session', {}, { idToken });
  return {
    accountId: r.body?.accountId as string,
    authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': r.body?.sessionId },
  };
}

const QQ = '/gamification/me/quick-question/sessions';

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  console.log('--- 0. Fixtures: preguntas publicadas dedicadas a este gate ---');
  const topicRow = await pg.query(`SELECT id, subject_id FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
  const topicId = topicRow.rows[0].id as string;
  const subjectId = topicRow.rows[0].subject_id as string;

  const trackedQuestionIds: string[] = [];

  async function makePublishedQuestion(): Promise<{ questionVersionId: string; correctOptionId: string; wrongOptionId: string }> {
    const questionId = randomUUID();
    const questionVersionId = randomUUID();
    const correctOptionId = randomUUID();
    const wrongOptionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [questionId, `GATE.QQH.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"¿Cuánto es 10% de 200?"}]', '[{"type":"paragraph","order":0,"text":"10% de 200 es 20."}]', 'PUBLISHED', now(), now(), now())`,
      [questionVersionId, questionId, topicId],
    );
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"20"}', 0, true, now())`,
      [correctOptionId, questionVersionId],
    );
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"30"}', 1, false, now())`,
      [wrongOptionId, questionVersionId],
    );
    trackedQuestionIds.push(questionVersionId);
    return { questionVersionId, correctOptionId, wrongOptionId };
  }

  const qMain = await makePublishedQuestion();
  const qForeign = await makePublishedQuestion();

  // Aísla el universo elegible a estas dos fixtures -- evita que /next
  // seleccione una pregunta ajena al azar y rompa las aserciones sobre
  // "cuál pregunta se presentó" en este gate.
  const otherPublished = await pg.query(
    `SELECT id FROM question_version WHERE editorial_status = 'PUBLISHED' AND id NOT IN ($1, $2)`,
    [qMain.questionVersionId, qForeign.questionVersionId],
  );
  await pg.query(`UPDATE question_version SET editorial_status = 'DEPRECATED' WHERE editorial_status = 'PUBLISHED' AND id NOT IN ($1, $2)`, [
    qMain.questionVersionId,
    qForeign.questionVersionId,
  ]);

  const trackedSessionIds: string[] = [];

  try {
    const alice = await newSession('alice');
    const bob = await newSession('bob');

    console.log('--- 1. Sin sesión -> 401 en las cuatro rutas ---');
    const noAuthOpen = await req('POST', QQ, {}, {});
    const noAuthNext = await req('POST', `${QQ}/${randomUUID()}/next`, {}, {});
    const noAuthAnswer = await req('POST', `${QQ}/${randomUUID()}/answers`, {}, { answerOptionId: randomUUID(), operationId: randomUUID() });
    const noAuthClose = await req('POST', `${QQ}/${randomUUID()}/close`, {}, {});
    check('POST /sessions sin sesión -> 401', noAuthOpen.status === 401);
    check('POST /next sin sesión -> 401', noAuthNext.status === 401);
    check('POST /answers sin sesión -> 401', noAuthAnswer.status === 401);
    check('POST /close sin sesión -> 401', noAuthClose.status === 401);

    console.log('--- 2. POST /sessions: creación, 200 (nunca 201), cuerpo inesperado -> 400 ---');
    const open1 = await req('POST', QQ, alice.authHeaders, {});
    check('primera apertura -> 200 (precisión: nunca 201)', open1.status === 200);
    check('status ACTIVE', open1.body?.status === 'ACTIVE');
    const sessionId = open1.body?.sessionId as string;
    trackedSessionIds.push(sessionId);

    const openUnexpectedBody = await req('POST', QQ, alice.authHeaders, { foo: 'bar' });
    check('POST /sessions con propiedad inesperada -> 400 (.strict())', openUnexpectedBody.status === 400);

    console.log('--- 3. Creación idempotente: segunda apertura -> 200, MISMO sessionId ---');
    const open2 = await req('POST', QQ, alice.authHeaders, {});
    check('segunda apertura -> 200', open2.status === 200);
    check('devuelve el MISMO sessionId (idempotente, sin duplicar)', open2.body?.sessionId === sessionId);

    console.log('--- 4. POST /next: cuerpo inesperado -> 400; presentación SIN questionVersionId, SIN isCorrect ---');
    const nextUnexpectedBody = await req('POST', `${QQ}/${sessionId}/next`, alice.authHeaders, { anything: 1 });
    check('POST /next con propiedad inesperada -> 400', nextUnexpectedBody.status === 400);

    const next1 = await req('POST', `${QQ}/${sessionId}/next`, alice.authHeaders, {});
    check('POST /next -> 200', next1.status === 200);
    check('outcome QUESTION_PRESENTED', next1.body?.outcome === 'QUESTION_PRESENTED');
    check('SIN questionVersionId en la respuesta (precisión obligatoria del Product Owner)', !('questionVersionId' in (next1.body ?? {})));
    check('stemContent presente', Array.isArray(next1.body?.stemContent) && next1.body.stemContent.length > 0);
    check('answerOptions presente, al menos 2', Array.isArray(next1.body?.answerOptions) && next1.body.answerOptions.length >= 2);
    const noIsCorrectLeaked = (next1.body?.answerOptions ?? []).every((option: Record<string, unknown>) => !('isCorrect' in option));
    check('NINGUNA alternativa expone isCorrect', noIsCorrectLeaked);
    check('la respuesta cruda tampoco contiene la cadena "isCorrect"', !next1.raw.includes('isCorrect'));
    const presentedOptionIds = new Set((next1.body?.answerOptions ?? []).map((o: { id: string }) => o.id));
    check(
      'la pregunta presentada es UNA de las dos fixtures del universo aislado (selección server-side real, no asumida)',
      presentedOptionIds.has(qMain.correctOptionId) || presentedOptionIds.has(qForeign.correctOptionId),
    );
    // La selección entre qMain/qForeign es aleatoria (server-side real) --
    // se resuelve aquí cuál fue presentada para el resto del gate, en vez
    // de asumirlo.
    const presented = presentedOptionIds.has(qMain.correctOptionId) ? qMain : qForeign;
    const foreign = presented === qMain ? qForeign : qMain;

    console.log('--- 5. Doble /next: devuelve LA MISMA pregunta, sin generar otra ---');
    const next2 = await req('POST', `${QQ}/${sessionId}/next`, alice.authHeaders, {});
    check('segundo /next -> 200', next2.status === 200);
    const presentedOptionIds2 = new Set((next2.body?.answerOptions ?? []).map((o: { id: string }) => o.id));
    check('mismas alternativas presentadas (misma pregunta pendiente, sin regenerar)', [...presentedOptionIds].every((id) => presentedOptionIds2.has(id)));

    console.log('--- 6. POST /answers: alternativa perteneciente a OTRA pregunta -> 400 ---');
    const foreignOptionAttempt = await req('POST', `${QQ}/${sessionId}/answers`, alice.authHeaders, {
      answerOptionId: foreign.correctOptionId,
      operationId: randomUUID(),
    });
    check('alternativa de otra pregunta -> 400', foreignOptionAttempt.status === 400);

    console.log('--- 7. POST /answers: cuerpo inesperado -> 400 ---');
    const answerUnexpectedBody = await req('POST', `${QQ}/${sessionId}/answers`, alice.authHeaders, {
      answerOptionId: presented.correctOptionId,
      operationId: randomUUID(),
      questionVersionId: presented.questionVersionId, // el cliente NUNCA puede enviar esto
    });
    check('POST /answers con questionVersionId (u otra propiedad inesperada) -> 400 (.strict())', answerUnexpectedBody.status === 400);

    console.log('--- 8. POST /answers: respuesta real -> 200, isCorrect correcto, explanationContent presente ---');
    const operationId1 = randomUUID();
    const answer1 = await req('POST', `${QQ}/${sessionId}/answers`, alice.authHeaders, {
      answerOptionId: presented.correctOptionId,
      operationId: operationId1,
    });
    check('POST /answers -> 200', answer1.status === 200);
    check('isCorrect: true (alternativa correcta real)', answer1.body?.isCorrect === true);
    check('explanationContent presente (no null, fixture con explicación)', Array.isArray(answer1.body?.explanationContent) && answer1.body.explanationContent.length > 0);

    const attemptRow = await pg.query(`SELECT id FROM quick_question_attempt WHERE operation_id = $1`, [operationId1]);
    const attemptId = attemptRow.rows[0]?.id as string;
    const outboxCountAfterFirst = await pg.query(`SELECT count(*)::int AS n FROM outbox_event WHERE payload->>'quickQuestionAttemptId' = $1`, [attemptId]);
    check('publicación best-effort: exactamente UN outbox_event tras la primera respuesta', outboxCountAfterFirst.rows[0].n === 1);

    console.log('--- 9. Replay HTTP: mismo operationId -> 200, MISMO resultado, SIN segunda publicación ---');
    const answerReplay = await req('POST', `${QQ}/${sessionId}/answers`, alice.authHeaders, {
      answerOptionId: qMain.correctOptionId,
      operationId: operationId1,
    });
    check('replay -> 200 (nunca 201, nunca error)', answerReplay.status === 200);
    check('replay devuelve el MISMO isCorrect', answerReplay.body?.isCorrect === answer1.body?.isCorrect);
    const outboxCountAfterReplay = await pg.query(`SELECT count(*)::int AS n FROM outbox_event WHERE payload->>'quickQuestionAttemptId' = $1`, [attemptId]);
    check('SIN segunda publicación tras el replay -- sigue existiendo UN solo outbox_event', outboxCountAfterReplay.rows[0].n === 1);
    const attemptCountAfterReplay = await pg.query(`SELECT count(*)::int AS n FROM quick_question_attempt WHERE operation_id = $1`, [operationId1]);
    check('SIN segundo intento -- sigue existiendo UNA sola fila', attemptCountAfterReplay.rows[0].n === 1);

    console.log('--- 10. Cross-account: Bob no puede operar sobre la sesión de Alice -> 404 uniforme ---');
    const bobNext = await req('POST', `${QQ}/${sessionId}/next`, bob.authHeaders, {});
    const bobAnswer = await req('POST', `${QQ}/${sessionId}/answers`, bob.authHeaders, { answerOptionId: qMain.wrongOptionId, operationId: randomUUID() });
    const bobClose = await req('POST', `${QQ}/${sessionId}/close`, bob.authHeaders, {});
    check('Bob -> /next sobre sesión de Alice -> 404', bobNext.status === 404);
    check('Bob -> /answers sobre sesión de Alice -> 404', bobAnswer.status === 404);
    check('Bob -> /close sobre sesión de Alice -> 404', bobClose.status === 404);
    const unknownSession = await req('POST', `${QQ}/${randomUUID()}/next`, alice.authHeaders, {});
    check('sesión inexistente -> 404 (mismo código, sin distinguir motivo)', unknownSession.status === 404);

    console.log('--- 11. POST /next tras responder: pregunta nueva o NO_QUESTIONS_AVAILABLE si el catálogo aislado se agotó ---');
    const next3 = await req('POST', `${QQ}/${sessionId}/next`, alice.authHeaders, {});
    check('POST /next tras responder -> 200', next3.status === 200);
    check(
      'outcome QUESTION_PRESENTED (queda qForeign) o NO_QUESTIONS_AVAILABLE -- ambos son 200, nunca error',
      next3.body?.outcome === 'QUESTION_PRESENTED' || next3.body?.outcome === 'NO_QUESTIONS_AVAILABLE',
    );

    console.log('--- 12. POST /close: cuerpo inesperado -> 400; cierre real -> 200; cierre idempotente -> 200 ---');
    const closeUnexpectedBody = await req('POST', `${QQ}/${sessionId}/close`, alice.authHeaders, { force: true });
    check('POST /close con propiedad inesperada -> 400', closeUnexpectedBody.status === 400);

    const close1 = await req('POST', `${QQ}/${sessionId}/close`, alice.authHeaders, {});
    check('POST /close -> 200 (nunca 201)', close1.status === 200);
    check('status CLOSED', close1.body?.status === 'CLOSED');
    check('sessionId devuelto coincide', close1.body?.sessionId === sessionId);

    const close2 = await req('POST', `${QQ}/${sessionId}/close`, alice.authHeaders, {});
    check('segundo /close -> 200 (idempotente, no error)', close2.status === 200);
    check('segundo /close sigue devolviendo CLOSED', close2.body?.status === 'CLOSED');

    console.log('--- 13. Sesión cerrada: /next y /answers responden 409 vía HTTP ---');
    const nextOnClosed = await req('POST', `${QQ}/${sessionId}/next`, alice.authHeaders, {});
    const answerOnClosed = await req('POST', `${QQ}/${sessionId}/answers`, alice.authHeaders, { answerOptionId: qMain.wrongOptionId, operationId: randomUUID() });
    check('/next sobre sesión CLOSED -> 409', nextOnClosed.status === 409);
    check('/answers sobre sesión CLOSED -> 409', answerOnClosed.status === 409);

    console.log('--- 14. Nueva sesión: NO_QUESTIONS_AVAILABLE real cuando el catálogo aislado ya no tiene elegibles ---');
    // Vacía el catálogo aislado POR COMPLETO -- una sesión NUEVA (de Bob) no
    // hereda exclusión alguna de lo que Alice ya respondió (la exclusión es
    // por SESIÓN, §13.2), así que ambas fixtures (qMain Y qForeign) deben
    // dejar de ser PUBLISHED para que esta sesión nueva se quede sin nada elegible.
    await pg.query(`UPDATE question_version SET editorial_status = 'DEPRECATED' WHERE id IN ($1, $2)`, [
      qMain.questionVersionId,
      qForeign.questionVersionId,
    ]);
    const openForExhaustion = await req('POST', QQ, bob.authHeaders, {});
    trackedSessionIds.push(openForExhaustion.body?.sessionId as string);
    const exhaustedNext = await req('POST', `${QQ}/${openForExhaustion.body?.sessionId}/next`, bob.authHeaders, {});
    check('sin preguntas elegibles -> 200 (nunca error)', exhaustedNext.status === 200);
    check('outcome NO_QUESTIONS_AVAILABLE', exhaustedNext.body?.outcome === 'NO_QUESTIONS_AVAILABLE');
    check('respuesta NO_QUESTIONS_AVAILABLE no incluye stemContent/answerOptions', !('stemContent' in (exhaustedNext.body ?? {})) && !('answerOptions' in (exhaustedNext.body ?? {})));
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED' WHERE id IN ($1, $2)`, [
      qMain.questionVersionId,
      qForeign.questionVersionId,
    ]);
  } finally {
    console.log('--- 15. Limpieza de fixtures de este gate ---');
    await pg.query('DELETE FROM quick_question_attempt WHERE session_id = ANY($1::uuid[])', [trackedSessionIds]);
    await pg.query('DELETE FROM quick_question_session WHERE id = ANY($1::uuid[])', [trackedSessionIds]);
    await pg.query(
      `DELETE FROM answer_option WHERE question_version_id IN (SELECT id FROM question_version WHERE question_id IN (SELECT id FROM question WHERE question_key LIKE 'GATE.QQH.%'))`,
    );
    await pg.query(`DELETE FROM question_version WHERE question_id IN (SELECT id FROM question WHERE question_key LIKE 'GATE.QQH.%')`);
    await pg.query(`DELETE FROM question WHERE question_key LIKE 'GATE.QQH.%'`);
    if (otherPublished.rowCount) {
      await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED' WHERE id = ANY($1::uuid[])`, [
        otherPublished.rows.map((r) => r.id as string),
      ]);
    }
  }

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate HTTP de Pregunta Rápida (Bloque IV, Incremento 4, sub-incremento 4.c) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
