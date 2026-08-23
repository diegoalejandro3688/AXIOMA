// Gate de PROGRESS (Bloque III, Vertical Slice M1) -- ver ADR-0014. Prueba
// contra el servidor real ya compilado y corriendo, con acceso directo a
// Postgres para fixtures y para probar los triggers vía SQL puro -- mismo
// patrón que los gates de EDUCATION/USER.
//
// Los puntos 14/15/17 (comportamiento sin red y sincronización de la cola
// offline del CLIENTE) se verifican por separado con el Browser tool contra
// una app real (ver ADR-0014, "Validación") -- este script no tiene acceso
// a `expo-secure-store`/SQLite del cliente. El punto 16 (idempotencia por
// operationId) SÍ se prueba aquí: es una garantía del servidor, exigible
// repitiendo la misma petición HTTP.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3007';
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
  const uid = `progress-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const r = await req('POST', '/auth/session', {}, { idToken });
  return {
    accountId: r.body?.accountId as string,
    authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': r.body?.sessionId },
  };
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
  // Deliberadamente NO se asume un tamaño fijo de catálogo -- el topic
  // sembrado (M1.NUMEROS.PORCENTAJES) es contenido educativo real y su
  // cantidad de preguntas publicadas puede crecer legítimamente (ver
  // TEST-CONTENT-1). qv1/qv2 siguen usándose tal cual para los escenarios que
  // solo necesitan DOS preguntas cualesquiera (concurrencia, idempotencia,
  // rechazo de alternativa ajena); el invariante de COMPLETED (10/11/12) se
  // verifica respondiendo dinámicamente TODAS las publicadas.
  const questionVersionIds: string[] = questionVersions.rows.map((r) => r.id);
  const [qv1, qv2] = questionVersionIds;
  const opt1Correct = (
    await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = true`, [qv1])
  ).rows[0].id;
  const opt2Wrong = (
    await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = false LIMIT 1`, [qv2])
  ).rows[0].id;

  // ============================================================
  // 1-2. Respuesta correcta / incorrecta + 10. COMPLETED
  // ============================================================
  console.log('--- 1-2. Responder correcta e incorrectamente; 10. COMPLETED al responder todo ---');
  const a = await newSession('a');
  const opA1 = randomUUID();
  const r1 = await req('POST', `/progress/topics/${topicId}/responses`, a.authHeaders, {
    questionVersionId: qv1,
    answerOptionId: opt1Correct,
    operationId: opA1,
  });
  check('respuesta correcta -> 201', r1.status === 201);
  check('isCorrect: true', r1.body?.isCorrect === true);
  check('topicStatus IN_PROGRESS (aún quedan preguntas publicadas sin responder)', r1.body?.topicStatus === 'IN_PROGRESS');

  const opA2 = randomUUID();
  const r2 = await req('POST', `/progress/topics/${topicId}/responses`, a.authHeaders, {
    questionVersionId: qv2,
    answerOptionId: opt2Wrong,
    operationId: opA2,
  });
  check('respuesta incorrecta -> 201', r2.status === 201);
  check('isCorrect: false', r2.body?.isCorrect === false);

  // Responde dinámicamente el RESTO de las QuestionVersion PUBLISHED del
  // topic (más allá de qv1/qv2) -- el invariante de COMPLETED es "todas las
  // publicadas respondidas", no "exactamente 2". La corrección de cada
  // respuesta es irrelevante para COMPLETED (comportamiento ya aprobado);
  // se usa la alternativa correcta solo por conveniencia de fixture.
  let lastCompletionResponse = r2;
  for (const remainingVersionId of questionVersionIds.slice(2)) {
    const remainingCorrectOption = (
      await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = true`, [remainingVersionId])
    ).rows[0].id;
    lastCompletionResponse = await req('POST', `/progress/topics/${topicId}/responses`, a.authHeaders, {
      questionVersionId: remainingVersionId,
      answerOptionId: remainingCorrectOption,
      operationId: randomUUID(),
    });
  }
  check(
    `10. topicStatus COMPLETED tras responder las ${questionVersionIds.length} preguntas publicadas`,
    lastCompletionResponse.body?.topicStatus === 'COMPLETED',
  );

  // ============================================================
  // 3. isCorrect nunca en EDUCATION / 13. separación de dominio
  // ============================================================
  console.log('--- 3/13. EDUCATION nunca expone isCorrect ni accountId ---');
  const eduQuestions = await req('GET', `/education/topics/${topicId}/questions`, a.authHeaders);
  check('3. /education/.../questions NO contiene "isCorrect"', !eduQuestions.raw.includes('isCorrect'));
  check('13. /education/.../questions NO contiene "accountId"', !eduQuestions.raw.includes('accountId'));
  const eduResource = await req('GET', `/education/topics/${topicId}/resource`, a.authHeaders);
  check('13. /education/.../resource NO contiene "accountId"', !eduResource.raw.includes('accountId'));
  const eduSubjects = await req('GET', `/education/subjects`, a.authHeaders);
  check('13. /education/subjects NO contiene "accountId"', !eduSubjects.raw.includes('accountId'));

  // ============================================================
  // 3a/3b. Tema inexistente vs. sin progreso
  // ============================================================
  console.log('--- 3a/3b. Tema inexistente (404) vs. tema sin progreso (200 NOT_STARTED) ---');
  const fakeTopicId = randomUUID();
  const rMissing = await req('GET', `/progress/topics/${fakeTopicId}`, a.authHeaders);
  check('3a. GET tema inexistente -> 404', rMissing.status === 404);

  const b = await newSession('b');
  const rFresh = await req('GET', `/progress/topics/${topicId}`, b.authHeaders);
  check('3b. GET tema existente sin progreso -> 200', rFresh.status === 200);
  check('3b. status NOT_STARTED', rFresh.body?.status === 'NOT_STARTED');
  check('3b. responses vacío', Array.isArray(rFresh.body?.responses) && rFresh.body.responses.length === 0);
  check('3b. startedAt/completedAt nulos', rFresh.body?.startedAt === null && rFresh.body?.completedAt === null);

  // ============================================================
  // 4. Concurrencia
  // ============================================================
  console.log('--- 4. Envíos concurrentes no duplican ni producen 500 ---');
  const c = await newSession('c');
  const opC = randomUUID();
  const [rConcA, rConcB] = await Promise.all([
    req('POST', `/progress/topics/${topicId}/responses`, c.authHeaders, {
      questionVersionId: qv1,
      answerOptionId: opt1Correct,
      operationId: opC,
    }),
    req('POST', `/progress/topics/${topicId}/responses`, c.authHeaders, {
      questionVersionId: qv1,
      answerOptionId: opt1Correct,
      operationId: opC,
    }),
  ]);
  check('ningún 500 en la carrera de concurrencia', rConcA.status !== 500 && rConcB.status !== 500);
  check('ambas respuestas exitosas (200 o 201)', [200, 201].includes(rConcA.status) && [200, 201].includes(rConcB.status));
  const concCount = await pg.query(
    `SELECT count(*)::int AS n FROM student_response WHERE account_id = $1 AND question_version_id = $2`,
    [c.accountId, qv1],
  );
  check('4. solo una fila creada pese a la carrera', concCount.rows[0].n === 1);

  // ============================================================
  // 5-6. Idempotencia condicionada
  // ============================================================
  console.log('--- 5. Mismo valor -> 200 sin nueva fila; 6. valor distinto -> 409 ---');
  const opA1b = randomUUID(); // operationId nuevo, MISMA alternativa.
  const r5 = await req('POST', `/progress/topics/${topicId}/responses`, a.authHeaders, {
    questionVersionId: qv1,
    answerOptionId: opt1Correct,
    operationId: opA1b,
  });
  check('5. mismo valor con operationId nuevo -> 200', r5.status === 200);
  check('5. misma respuesta devuelta (mismo respondedAt)', r5.body?.respondedAt === r1.body?.respondedAt);

  const otherOption = (
    await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 AND id != $2 LIMIT 1`, [qv1, opt1Correct])
  ).rows[0].id;
  const opA1c = randomUUID();
  const r6 = await req('POST', `/progress/topics/${topicId}/responses`, a.authHeaders, {
    questionVersionId: qv1,
    answerOptionId: otherOption,
    operationId: opA1c,
  });
  check('6. alternativa distinta -> 409', r6.status === 409);
  check('6. cuerpo incluye existingResponse', r6.body?.existingResponse?.answerOptionId === opt1Correct);
  const afterConflict = await pg.query(`SELECT answer_option_id FROM student_response WHERE account_id = $1 AND question_version_id = $2`, [
    a.accountId,
    qv1,
  ]);
  check('6. la fila original no cambió', afterConflict.rows[0].answer_option_id === opt1Correct);

  // ============================================================
  // 16. Idempotencia por operationId (replay exacto)
  // ============================================================
  console.log('--- 16. Reprocesar el mismo operationId no duplica ---');
  const r16 = await req('POST', `/progress/topics/${topicId}/responses`, a.authHeaders, {
    questionVersionId: qv1,
    answerOptionId: opt1Correct,
    operationId: opA1, // el operationId ORIGINAL de la respuesta #1.
  });
  check('16. replay exacto -> 200', r16.status === 200);
  check('16. mismo resultado que el original', r16.body?.respondedAt === r1.body?.respondedAt);
  const replayCount = await pg.query(`SELECT count(*)::int AS n FROM student_response WHERE operation_id = $1`, [opA1]);
  check('16. una sola fila para ese operationId', replayCount.rows[0].n === 1);

  // ============================================================
  // 7. Alternativa que no pertenece a la pregunta
  // ============================================================
  console.log('--- 7. Alternativa de otra pregunta -> rechazada ---');
  const d = await newSession('d');
  const foreignOption = (await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 LIMIT 1`, [qv2])).rows[0].id;
  const r7 = await req('POST', `/progress/topics/${topicId}/responses`, d.authHeaders, {
    questionVersionId: qv1,
    answerOptionId: foreignOption,
    operationId: randomUUID(),
  });
  check('7. alternativa de otra pregunta -> 400', r7.status === 400);

  // ============================================================
  // 8-9. Fixtures: pregunta en DRAFT y pregunta retirada
  // ============================================================
  console.log('--- 8. QuestionVersion no publicada; 9. Question retirada ---');
  const subjectId = (await pg.query(`SELECT subject_id FROM curriculum_topic WHERE id = $1`, [topicId])).rows[0].subject_id;

  // LEF Bloque VII, Incremento 1 -- higiene de fixtures compatible con
  // producción. Una `question_version` que alcanzó publicación ya NO puede
  // borrarse (invariante 3, `trg_question_version_published_no_delete`), así
  // que las fixtures PUBLICADAS de este gate ya no se limpian en el teardown:
  // cuelgan de temas PROPIOS y ÚNICOS por corrida (mismo criterio que
  // verify-academic-summary-gate y verify-advanced-profile-gate, que nunca
  // borraron los suyos) y simplemente persisten, igual que persiste el
  // contenido de `prisma/seed.ts`. El tema SEMBRADO queda intacto: conserva
  // el catálogo de preguntas publicadas que traiga `prisma/seed.ts` en cada
  // momento (su tamaño exacto no se asume en ningún punto de este gate), que
  // es de lo que dependen las aserciones 1-2/10/12 de este mismo gate.
  //
  // Son DOS temas aislados, no uno, porque la fixture de pregunta RETIRADA es
  // publicada y no respondible: dejarla junto a la del check 11 impediría para
  // siempre alcanzar COMPLETED en ese tema (`countPublishedByTopicId` cuenta
  // toda versión publicada del tema, sin mirar el estado de la identidad).
  const gateSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const gateRejectTopicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema aislado del gate de PROGRESS (rechazos)', 901, $3, now(), now())`,
    [gateRejectTopicId, `GATE.PROGRESS.REJECT.${gateSuffix}`, subjectId],
  );
  const gateMonotonicTopicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema aislado del gate de PROGRESS (monotonía)', 902, $3, now(), now())`,
    [gateMonotonicTopicId, `GATE.PROGRESS.MONOTONIC.${gateSuffix}`, subjectId],
  );

  const draftQuestionId = randomUUID();
  const draftVersionId = randomUUID();
  const draftOptionId = randomUUID();
  await pg.query(
    `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
    [draftQuestionId, `GATE.DRAFT.Q.${Date.now()}`, subjectId],
  );
  await pg.query(
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
    [draftVersionId, draftQuestionId, topicId],
  );
  await pg.query(
    `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
     VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"x"}', 0, true, now())`,
    [draftOptionId, draftVersionId],
  );
  const r8 = await req('POST', `/progress/topics/${topicId}/responses`, d.authHeaders, {
    questionVersionId: draftVersionId,
    answerOptionId: draftOptionId,
    operationId: randomUUID(),
  });
  check('8. QuestionVersion DRAFT -> 400', r8.status === 400);

  // Fixture PUBLICADA: se construye en DRAFT, se le insertan las alternativas
  // y recién entonces se publica (DRAFT -> PUBLISHED) -- único orden válido
  // desde LEF Bloque VII, Incremento 1 (`trg_answer_option_published_parent_immutable`).
  const retiredQuestionId = randomUUID();
  const retiredVersionId = randomUUID();
  const retiredOptionId = randomUUID();
  await pg.query(
    `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'RETIRED', now(), now())`,
    [retiredQuestionId, `GATE.RETIRED.Q.${gateSuffix}`, subjectId],
  );
  await pg.query(
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
    [retiredVersionId, retiredQuestionId, gateRejectTopicId],
  );
  await pg.query(
    `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
     VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"x"}', 0, true, now())`,
    [retiredOptionId, retiredVersionId],
  );
  await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [retiredVersionId]);
  const r9 = await req('POST', `/progress/topics/${gateRejectTopicId}/responses`, d.authHeaders, {
    questionVersionId: retiredVersionId,
    answerOptionId: retiredOptionId,
    operationId: randomUUID(),
  });
  check('9. Question retirada (identidad RETIRED) -> 400', r9.status === 400);

  // ============================================================
  // 11. COMPLETED monotónico -- publicar contenido nuevo no downgradea
  // ============================================================
  console.log('--- 11. COMPLETED no retrocede al publicar contenido nuevo ---');
  // Sobre el tema aislado de monotonía: una cuenta lo completa (1/1) y
  // DESPUÉS se publica contenido nuevo en ese mismo tema. Aserción idéntica a
  // la histórica; lo único que cambia es que el tema es propio del gate en vez
  // del sembrado -- lo que permite que la fixture publicada persista sin
  // borrarse (invariante 3) y sin alterar el catálogo compartido.
  const f = await newSession('f');
  const monotonicBaseQuestionId = randomUUID();
  const monotonicBaseVersionId = randomUUID();
  const monotonicBaseOptionId = randomUUID();
  await pg.query(
    `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
    [monotonicBaseQuestionId, `GATE.MONOTONIC.BASE.Q.${gateSuffix}`, subjectId],
  );
  await pg.query(
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
    [monotonicBaseVersionId, monotonicBaseQuestionId, gateMonotonicTopicId],
  );
  await pg.query(
    `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
     VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"x"}', 0, true, now())`,
    [monotonicBaseOptionId, monotonicBaseVersionId],
  );
  await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [monotonicBaseVersionId]);
  const rMonotonicComplete = await req('POST', `/progress/topics/${gateMonotonicTopicId}/responses`, f.authHeaders, {
    questionVersionId: monotonicBaseVersionId,
    answerOptionId: monotonicBaseOptionId,
    operationId: randomUUID(),
  });
  check('11. el tema aislado queda COMPLETED al responder todo su contenido publicado', rMonotonicComplete.body?.topicStatus === 'COMPLETED');

  const newQuestionId = randomUUID();
  const newVersionId = randomUUID();
  await pg.query(
    `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
    [newQuestionId, `GATE.NEWCONTENT.Q.${gateSuffix}`, subjectId],
  );
  await pg.query(
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, published_at, created_at, updated_at)
     VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'PUBLISHED', now(), now(), now())`,
    [newVersionId, newQuestionId, gateMonotonicTopicId],
  );
  const rAfterNewContent = await req('GET', `/progress/topics/${gateMonotonicTopicId}`, f.authHeaders);
  check('11. status sigue COMPLETED tras publicarse una pregunta nueva sin responderla', rAfterNewContent.body?.status === 'COMPLETED');

  await pg.query(
    `UPDATE curriculum_topic_progress SET status = 'IN_PROGRESS' WHERE account_id = $1 AND curriculum_topic_id = $2`,
    [a.accountId, topicId],
  ).then(
    () => check('11. UPDATE directo COMPLETED->IN_PROGRESS debió fallar por trigger', false),
    () => check('11. UPDATE directo COMPLETED->IN_PROGRESS rechazado por trigger', true),
  );

  // ============================================================
  // 12. Continuidad
  // ============================================================
  console.log('--- 12. Continuidad: GET refleja exactamente lo respondido ---');
  const rContinuity = await req('GET', `/progress/topics/${topicId}`, a.authHeaders);
  check('12. status COMPLETED', rContinuity.body?.status === 'COMPLETED');
  check(
    `12. ${questionVersionIds.length} respuestas registradas (una por cada QuestionVersion PUBLISHED del topic)`,
    rContinuity.body?.responses?.length === questionVersionIds.length,
  );
  const respQ1 = rContinuity.body.responses.find((r: { questionVersionId: string }) => r.questionVersionId === qv1);
  check('12. alternativa de Q1 coincide', respQ1?.answerOptionId === opt1Correct);
  check('12. isCorrect de Q1 coincide', respQ1?.isCorrect === true);
  check('12. startedAt/completedAt presentes', !!rContinuity.body?.startedAt && !!rContinuity.body?.completedAt);

  // ============================================================
  // 18-19. Privacy: cierre de cuenta elimina progreso; fallo no completa
  // ============================================================
  console.log('--- 18. Cierre de cuenta elimina progreso; 19. fallo de PROGRESS no completa la solicitud ---');
  const e = await newSession('e');
  await req('POST', `/progress/topics/${topicId}/responses`, e.authHeaders, {
    questionVersionId: qv1,
    answerOptionId: opt1Correct,
    operationId: randomUUID(),
  });
  const beforeSweep = await pg.query(
    `SELECT (SELECT count(*)::int FROM student_response WHERE account_id = $1) AS r, (SELECT count(*)::int FROM curriculum_topic_progress WHERE account_id = $1) AS p`,
    [e.accountId],
  );
  check('el progreso existe antes del barrido', beforeSweep.rows[0].r > 0 && beforeSweep.rows[0].p > 0);

  // 19. Fault injection: un trigger temporal que rechaza cualquier DELETE
  // sobre curriculum_topic_progress fuerza que deleteProgressForAccountClosure
  // falle DESPUÉS de borrar student_response -- exactamente el escenario de
  // eliminación parcial que no debe completarse (ADR-0014, punto 2). (REVOKE
  // no sirve aquí: el rol `axioma` es DUEÑO de la tabla y los dueños ignoran
  // GRANT/REVOKE en Postgres -- un trigger sí se aplica siempre.)
  await req('POST', '/privacy/account-deletion', e.authHeaders, {});
  await pg.query(`UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'`, [
    e.accountId,
  ]);
  await pg.query(`
    CREATE OR REPLACE FUNCTION gate_temp_block_delete() RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'gate: fault injection -- DELETE bloqueado temporalmente';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER gate_temp_block_delete_trg BEFORE DELETE ON curriculum_topic_progress
    FOR EACH ROW EXECUTE FUNCTION gate_temp_block_delete();
  `);
  const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
  const rSweepFail = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('19. sweep responde 200 (procesa otras solicitudes igual)', rSweepFail.status === 200);
  const statusAfterFail = await pg.query(`SELECT status FROM privacy_request WHERE account_id = $1`, [e.accountId]);
  check('19. la solicitud de esta cuenta NO quedó COMPLETED tras el fallo', statusAfterFail.rows[0]?.status === 'PROCESSING');
  await pg.query(`DROP TRIGGER gate_temp_block_delete_trg ON curriculum_topic_progress`);
  await pg.query(`DROP FUNCTION gate_temp_block_delete()`);

  // `processingStartedAt` se fija la PRIMERA vez que entra a PROCESSING y no
  // se sobrescribe en reintentos (ver PrivacyRequest) -- para que el
  // siguiente barrido la recoja como "atascada" sin esperar la hora real del
  // umbral, se adelanta el reloj de esta fila específica del gate.
  await pg.query(
    `UPDATE privacy_request SET processing_started_at = now() - interval '2 hours' WHERE account_id = $1 AND status = 'PROCESSING'`,
    [e.accountId],
  );

  const rSweepRetry = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('reintento tras restaurar permisos -> 200', rSweepRetry.status === 200);

  const afterSweep = await pg.query(
    `SELECT (SELECT count(*)::int FROM student_response WHERE account_id = $1) AS r, (SELECT count(*)::int FROM curriculum_topic_progress WHERE account_id = $1) AS p`,
    [e.accountId],
  );
  check('18. StudentResponse eliminado por completo tras el reintento', afterSweep.rows[0].r === 0);
  check('18. CurriculumTopicProgress eliminado por completo tras el reintento', afterSweep.rows[0].p === 0);
  const statusAfterRetry = await pg.query(`SELECT status FROM privacy_request WHERE account_id = $1`, [e.accountId]);
  check('la solicitud ahora sí quedó COMPLETED', statusAfterRetry.rows[0]?.status === 'COMPLETED');

  // Limpieza de fixtures de este gate.
  //
  // LEF Bloque VII, Incremento 1: solo se borra lo que NUNCA alcanzó
  // publicación -- la fixture en DRAFT del check 8, cuyo padre sigue en DRAFT
  // y por tanto es borrable sin tocar ninguna garantía. Las fixtures
  // PUBLICADAS (checks 9 y 11) ya no se borran: el `DELETE` sobre contenido
  // que alcanzó publicación está prohibido sin excepciones, también para
  // tests, y NO existe ningún bypass de trigger, session flag ni mecanismo SQL
  // especial para saltárselo. Su aislamiento lo dan los temas propios y únicos
  // por corrida creados arriba, así que persistir es inocuo -- exactamente
  // igual que persiste el contenido sembrado por `prisma/seed.ts`.
  await pg.query(`DELETE FROM answer_option WHERE question_version_id = $1`, [draftVersionId]);
  await pg.query(`DELETE FROM question_version WHERE id = $1`, [draftVersionId]);
  await pg.query(`DELETE FROM question WHERE id = $1`, [draftQuestionId]);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de PROGRESS pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
