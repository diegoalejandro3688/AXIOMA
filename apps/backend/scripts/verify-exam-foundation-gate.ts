// Gate de ENSAYOS-F1 -- "Fundación del dominio EXAMS / Ensayos V1".
// Ver docs/adr/0024-ensayos-foundation.md.
//
// Contra el servidor real ya corriendo (mismo patrón que
// verify-quick-question-http-gate.ts). Verifica el ciclo completo de un
// intento de ensayo mediante HTTP + invariantes de base de datos por SQL
// directo, MÁS el aislamiento crítico frente a Study/gamificación.
//
// NO importa ninguna pregunta ENSAYO.M1.* -- crea sus propias fixtures
// (preguntas publicadas dedicadas + ensayos técnicos) y opera sobre ellas.
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
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';

/**
 * PREMIUM V1 (C1.2) -- crear un intento de ensayo exige tier PREMIUM. Este
 * gate ejercita el ciclo COMPLETO de un intento, así que sus cuentas de
 * prueba se marcan PREMIUM vía el override interno (mismo mecanismo que
 * `verify-premium-exams-gate.ts`); el enforcement en sí lo cubre ese gate.
 */
async function setTier(accountId: string, tier: 'FREE' | 'PREMIUM' | null) {
  const q = tier === null ? '' : `&tier=${tier}`;
  const r = await req('POST', `/_internal/entitlement/set-tier-override?accountId=${accountId}${q}`, { 'x-internal-ops-key': opsKey });
  if (r.status !== 200 && r.status !== 201) throw new Error(`set-tier-override(${accountId},${tier}) -> ${r.status} ${r.raw}`);
}

async function newSession(label: string) {
  const uid = `exam-f1-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const r = await req('POST', '/auth/session', {}, { idToken });
  const accountId = r.body?.accountId as string;
  await setTier(accountId, 'PREMIUM');
  return {
    accountId,
    authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': r.body?.sessionId as string },
  };
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log('--- 0. Fixtures: subject + tema aislado + preguntas publicadas dedicadas ---');
  // Reutiliza cualquier subject existente; si la DB de gates está vacía, crea
  // uno propio del gate (no depende de que se haya corrido prisma:seed).
  let subjectId: string;
  const existingSubject = await pg.query(`SELECT id FROM subject ORDER BY display_order ASC LIMIT 1`);
  if (existingSubject.rowCount && existingSubject.rows[0].id) {
    subjectId = existingSubject.rows[0].id as string;
  } else {
    subjectId = randomUUID();
    await pg.query(
      `INSERT INTO subject (id, subject_key, name, short_name, display_order, status, created_at, updated_at)
       VALUES ($1, $2, 'Materia del gate de Ensayos', 'GATE', 900, 'ACTIVE', now(), now())`,
      [subjectId, `gate-exam-${runId}`],
    );
  }

  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema aislado del gate de Ensayos (F1)', 907, $3, now(), now())`,
    [topicId, `GATE.EXAM.TOPIC.${runId}`, subjectId],
  );

  /** Crea una pregunta publicada con `optionCount` alternativas; la de índice `correctIndex` es la correcta. */
  async function makePublishedQuestion(
    optionCount = 4,
    correctIndex = 0,
  ): Promise<{ questionVersionId: string; optionIds: string[]; correctOptionId: string }> {
    const questionId = randomUUID();
    const questionVersionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [questionId, `GATE.EXAM.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1, $2, $3,
         '[{"type":"paragraph","order":0,"text":"Enunciado de prueba del gate de Ensayos."}]',
         '[{"type":"paragraph","order":0,"text":"Explicacion de prueba (solo visible en revision)."}]',
         'DRAFT', now(), now())`,
      [questionVersionId, questionId, topicId],
    );
    const optionIds: string[] = [];
    for (let i = 0; i < optionCount; i++) {
      const optionId = randomUUID();
      optionIds.push(optionId);
      await pg.query(
        `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [optionId, questionVersionId, JSON.stringify({ type: 'paragraph', order: 0, text: `Alternativa ${i}` }), i, i === correctIndex],
      );
    }
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [questionVersionId]);
    return { questionVersionId, optionIds, correctOptionId: optionIds[correctIndex]! };
  }

  // Exam A: 5 preguntas publicadas. Exam corto: 2. Una pregunta AJENA (no vinculada).
  const qA = [
    await makePublishedQuestion(4, 0),
    await makePublishedQuestion(4, 1),
    await makePublishedQuestion(4, 2),
    await makePublishedQuestion(4, 3),
    await makePublishedQuestion(4, 0),
  ];
  const qForeign = await makePublishedQuestion(4, 0);
  const qShort = [await makePublishedQuestion(4, 0), await makePublishedQuestion(4, 1)];
  const qDraft = (async () => {
    const questionId = randomUUID();
    const questionVersionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [questionId, `GATE.EXAM.DRAFT.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
      [questionVersionId, questionId, topicId],
    );
    return questionVersionId;
  })();
  const draftQuestionVersionId = await qDraft;

  const examAId = randomUUID();
  const examShortId = randomUUID();
  const examDraftId = randomUUID();
  await pg.query(
    `INSERT INTO exam (id, exam_key, title, subject_id, duration_seconds, status, published_at, created_at, updated_at)
     VALUES ($1,$2,'Ensayo tecnico A del gate (F1)',$3,3600,'PUBLISHED',now(),now(),now()),
            ($4,$5,'Ensayo tecnico corto del gate (F1)',$3,2,'PUBLISHED',now(),now(),now()),
            ($6,$7,'Ensayo tecnico DRAFT del gate (F1)',$3,3600,'DRAFT',null,now(),now())`,
    [examAId, `GATE.EXAM.A.${runId}`, subjectId, examShortId, `GATE.EXAM.SHORT.${runId}`, examDraftId, `GATE.EXAM.DRAFT.${runId}`],
  );
  for (let i = 0; i < qA.length; i++) {
    await pg.query(
      `INSERT INTO exam_question (id, exam_id, question_version_id, display_order, created_at) VALUES ($1,$2,$3,$4,now())`,
      [randomUUID(), examAId, qA[i]!.questionVersionId, i],
    );
  }
  for (let i = 0; i < qShort.length; i++) {
    await pg.query(
      `INSERT INTO exam_question (id, exam_id, question_version_id, display_order, created_at) VALUES ($1,$2,$3,$4,now())`,
      [randomUUID(), examShortId, qShort[i]!.questionVersionId, i],
    );
  }

  const trackedAttemptIds: string[] = [];
  const accounts: string[] = [];

  try {
    const alice = await newSession('alice');
    const bob = await newSession('bob');
    accounts.push(alice.accountId, bob.accountId);

    console.log('--- 1. Sin sesion -> 401 ---');
    check('GET /exams sin sesion -> 401', (await req('GET', '/exams')).status === 401);
    check('POST /exams/:id/attempts sin sesion -> 401', (await req('POST', `/exams/${examAId}/attempts`, {}, {})).status === 401);

    console.log('--- 2. Catalogo: solo ensayos PUBLISHED, con questionCount ---');
    const list = await req('GET', '/exams', alice.authHeaders);
    check('GET /exams -> 200', list.status === 200);
    const listedA = (list.body?.exams ?? []).find((e: { id: string }) => e.id === examAId);
    check('Exam A PUBLISHED aparece en el listado', !!listedA);
    check('questionCount = 5', listedA?.questionCount === 5);
    check('durationSeconds = 3600', listedA?.durationSeconds === 3600);
    check('Exam DRAFT NO aparece en el listado', !(list.body?.exams ?? []).some((e: { id: string }) => e.id === examDraftId));

    console.log('--- 3. Detalle: ensayo no publicado / inexistente -> 404 uniforme ---');
    check('GET /exams/:draftId -> 404 (no filtra existencia)', (await req('GET', `/exams/${examDraftId}`, alice.authHeaders)).status === 404);
    check('GET /exams/:randomId -> 404', (await req('GET', `/exams/${randomUUID()}`, alice.authHeaders)).status === 404);

    console.log('--- 4. Start: crea intento ACTIVE, timestamps y expiracion server-authoritative ---');
    const start1 = await req('POST', `/exams/${examAId}/attempts`, alice.authHeaders, {});
    check('POST /attempts -> 200 (nunca 201)', start1.status === 200);
    check('status ACTIVE', start1.body?.status === 'ACTIVE');
    const attemptId = start1.body?.attemptId as string;
    trackedAttemptIds.push(attemptId);
    const startedAt = new Date(start1.body?.startedAt).getTime();
    const expiresAt = new Date(start1.body?.expiresAt).getTime();
    check('expiresAt = startedAt + 3600s (server-authoritative)', Math.abs(expiresAt - startedAt - 3600_000) < 1500);
    check('serverTime presente', typeof start1.body?.serverTime === 'string');
    check('completedAt null', start1.body?.completedAt === null);
    check('cuerpo inesperado en start -> 400 (.strict())', (await req('POST', `/exams/${examAId}/attempts`, alice.authHeaders, { foo: 1 })).status === 400);

    console.log('--- 5. Start idempotente: doble start reanuda el MISMO intento, sin duplicar ---');
    const start2 = await req('POST', `/exams/${examAId}/attempts`, alice.authHeaders, {});
    check('segundo start -> 200, MISMO attemptId', start2.body?.attemptId === attemptId);
    const activeCount = await pg.query(
      `SELECT count(*)::int n FROM exam_attempt WHERE account_id=$1 AND exam_id=$2 AND status='ACTIVE'`,
      [alice.accountId, examAId],
    );
    check('exactamente 1 intento ACTIVE en DB para (cuenta, ensayo)', activeCount.rows[0].n === 1);

    console.log('--- 6. Entrega de preguntas: orden fijo, SIN pauta ---');
    const qs = await req('GET', `/exams/me/attempts/${attemptId}/questions`, alice.authHeaders);
    check('GET .../questions -> 200', qs.status === 200);
    check('5 preguntas', (qs.body?.questions ?? []).length === 5);
    const orders = (qs.body?.questions ?? []).map((q: { displayOrder: number }) => q.displayOrder);
    check('displayOrder 0..4 en orden', JSON.stringify(orders) === JSON.stringify([0, 1, 2, 3, 4]));
    check('la respuesta cruda NO contiene "isCorrect"', !qs.raw.includes('isCorrect'));
    check('la respuesta cruda NO contiene "explanationContent"', !qs.raw.includes('explanationContent'));
    check('la respuesta cruda NO contiene "correctAnswerOptionId"', !qs.raw.includes('correctAnswerOptionId'));
    check('todas las selecciones nacen null', (qs.body?.questions ?? []).every((q: { selectedAnswerOptionId: unknown }) => q.selectedAnswerOptionId === null));
    check('primera pregunta = qA[0]', qs.body?.questions?.[0]?.questionVersionId === qA[0]!.questionVersionId);

    console.log('--- 7. Responder: crear, replay idempotente, cambiar seleccion ---');
    const op0 = randomUUID();
    const a0 = await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[0]!.questionVersionId,
      answerOptionId: qA[0]!.correctOptionId,
      operationId: op0,
    });
    check('PUT answers -> 200', a0.status === 200);
    check('selectedAnswerOptionId reflejado', a0.body?.selectedAnswerOptionId === qA[0]!.correctOptionId);
    const replay = await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[0]!.questionVersionId,
      answerOptionId: qA[0]!.correctOptionId,
      operationId: op0,
    });
    check('replay mismo operationId -> 200, mismo resultado', replay.status === 200 && replay.body?.selectedAnswerOptionId === qA[0]!.correctOptionId);
    const rowCountQ0 = await pg.query(
      `SELECT count(*)::int n FROM exam_attempt_answer WHERE attempt_id=$1 AND question_version_id=$2`,
      [attemptId, qA[0]!.questionVersionId],
    );
    check('una sola fila para (intento, pregunta) tras el replay', rowCountQ0.rows[0].n === 1);

    // Q1 correcta, Q2 la cambiamos: primero mal, luego bien, luego mal otra vez (deja fixture determinista).
    await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[1]!.questionVersionId, answerOptionId: qA[1]!.correctOptionId, operationId: randomUUID(),
    });
    await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[2]!.questionVersionId, answerOptionId: qA[2]!.optionIds[0]!, operationId: randomUUID(),
    });
    const changeToCorrect = await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[2]!.questionVersionId, answerOptionId: qA[2]!.correctOptionId, operationId: randomUUID(),
    });
    check('cambiar la seleccion mientras ACTIVE -> 200', changeToCorrect.status === 200 && changeToCorrect.body?.selectedAnswerOptionId === qA[2]!.correctOptionId);
    await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[2]!.questionVersionId, answerOptionId: qA[2]!.optionIds[0]!, operationId: randomUUID(),
    });
    const rowCountQ2 = await pg.query(
      `SELECT count(*)::int n FROM exam_attempt_answer WHERE attempt_id=$1 AND question_version_id=$2`,
      [attemptId, qA[2]!.questionVersionId],
    );
    check('sigue habiendo UNA sola fila para Q2 tras 3 cambios', rowCountQ2.rows[0].n === 1);

    console.log('--- 8. Validaciones de respuesta ---');
    const foreignQ = await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qForeign.questionVersionId, answerOptionId: qForeign.correctOptionId, operationId: randomUUID(),
    });
    check('pregunta que no pertenece al ensayo -> 400', foreignQ.status === 400);
    const foreignOpt = await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[3]!.questionVersionId, answerOptionId: qA[0]!.optionIds[0]!, operationId: randomUUID(),
    });
    check('alternativa de otra pregunta -> 400', foreignOpt.status === 400);
    check('cuerpo sin operationId -> 400', (await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[3]!.questionVersionId, answerOptionId: qA[3]!.correctOptionId,
    })).status === 400);
    check('cuerpo con propiedad inesperada (isCorrect) -> 400', (await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[3]!.questionVersionId, answerOptionId: qA[3]!.correctOptionId, operationId: randomUUID(), isCorrect: true,
    })).status === 400);

    console.log('--- 9. Autorizacion cross-account -> 404 uniforme ---');
    check('Bob GET state de Alice -> 404', (await req('GET', `/exams/me/attempts/${attemptId}`, bob.authHeaders)).status === 404);
    check('Bob GET questions de Alice -> 404', (await req('GET', `/exams/me/attempts/${attemptId}/questions`, bob.authHeaders)).status === 404);
    check('Bob PUT answer en intento de Alice -> 404', (await req('PUT', `/exams/me/attempts/${attemptId}/answers`, bob.authHeaders, {
      questionVersionId: qA[0]!.questionVersionId, answerOptionId: qA[0]!.correctOptionId, operationId: randomUUID(),
    })).status === 404);
    check('Bob POST submit en intento de Alice -> 404', (await req('POST', `/exams/me/attempts/${attemptId}/submit`, bob.authHeaders, {})).status === 404);
    check('Bob GET result de Alice -> 404', (await req('GET', `/exams/me/attempts/${attemptId}/result`, bob.authHeaders)).status === 404);

    console.log('--- 10. Revision bloqueada mientras ACTIVE -> 409 ---');
    check('GET .../review con intento ACTIVE -> 409', (await req('GET', `/exams/me/attempts/${attemptId}/review`, alice.authHeaders)).status === 409);

    console.log('--- 11. Submit: ACTIVE -> COMPLETED, score exacto, idempotente ---');
    const submit1 = await req('POST', `/exams/me/attempts/${attemptId}/submit`, alice.authHeaders, {});
    check('submit -> 200', submit1.status === 200);
    check('status COMPLETED', submit1.body?.status === 'COMPLETED');
    check('completedAt fijado', typeof submit1.body?.completedAt === 'string');
    const s = submit1.body?.score;
    check('score.totalQuestions = 5', s?.totalQuestions === 5);
    check('score.answered = 3', s?.answered === 3);
    check('score.correct = 2', s?.correct === 2);
    check('score.incorrect = 1', s?.incorrect === 1);
    check('score.unanswered = 2', s?.unanswered === 2);
    check('score.accuracyPercentage = 40 (correct/totalQuestions)', s?.accuracyPercentage === 40);
    const submit2 = await req('POST', `/exams/me/attempts/${attemptId}/submit`, alice.authHeaders, {});
    check('submit repetido -> 200 idempotente, mismo score', submit2.status === 200 && submit2.body?.score?.correct === 2 && submit2.body?.status === 'COMPLETED');

    console.log('--- 12. Tras el cierre: respuestas inmutables (HTTP + trigger) ---');
    check('PUT answer tras COMPLETED -> 409', (await req('PUT', `/exams/me/attempts/${attemptId}/answers`, alice.authHeaders, {
      questionVersionId: qA[3]!.questionVersionId, answerOptionId: qA[3]!.correctOptionId, operationId: randomUUID(),
    })).status === 409);
    check('GET questions tras COMPLETED -> 409 (usar revision)', (await req('GET', `/exams/me/attempts/${attemptId}/questions`, alice.authHeaders)).status === 409);
    let triggerBlocked = false;
    try {
      await pg.query(
        `INSERT INTO exam_attempt_answer (id, attempt_id, account_id, question_version_id, answer_option_id, is_correct, responded_at, updated_at, operation_id)
         VALUES ($1,$2,$3,$4,$5,true,now(),now(),$6)`,
        [randomUUID(), attemptId, alice.accountId, qA[3]!.questionVersionId, qA[3]!.correctOptionId, randomUUID()],
      );
    } catch (e) {
      triggerBlocked = String((e as Error).message).includes('inmutables');
    }
    check('trigger rechaza INSERT directo de respuesta sobre intento COMPLETED', triggerBlocked);

    console.log('--- 13. Revision tras COMPLETED: revela pauta + explicacion ---');
    const review = await req('GET', `/exams/me/attempts/${attemptId}/review`, alice.authHeaders);
    check('GET .../review -> 200', review.status === 200);
    const rq = review.body?.questions ?? [];
    check('revision tiene 5 preguntas', rq.length === 5);
    check('cada pregunta expone correctAnswerOptionId', rq.every((q: { correctAnswerOptionId?: string }) => typeof q.correctAnswerOptionId === 'string'));
    check('Q0 correctAnswerOptionId correcto', rq[0]?.correctAnswerOptionId === qA[0]!.correctOptionId);
    check('Q0 isCorrect true (Alice acerto)', rq[0]?.isCorrect === true);
    check('Q2 isCorrect false (Alice dejo la mala)', rq[2]?.isCorrect === false);
    check('Q3 sin responder -> selectedAnswerOptionId null, isCorrect false', rq[3]?.selectedAnswerOptionId === null && rq[3]?.isCorrect === false);
    check('explanationContent presente en revision', Array.isArray(rq[0]?.explanationContent) && rq[0].explanationContent.length > 0);
    check('review.score.correct = 2', review.body?.score?.correct === 2);

    console.log('--- 14. Repetibilidad: Alice inicia OTRO intento del mismo ensayo A ---');
    const start3 = await req('POST', `/exams/${examAId}/attempts`, alice.authHeaders, {});
    check('nuevo intento del mismo ensayo -> 200', start3.status === 200);
    check('attemptId DISTINTO del anterior', start3.body?.attemptId !== attemptId);
    check('status ACTIVE', start3.body?.status === 'ACTIVE');
    trackedAttemptIds.push(start3.body?.attemptId as string);
    await req('POST', `/exams/me/attempts/${start3.body?.attemptId}/submit`, alice.authHeaders, {});

    console.log('--- 15. Timer: expiracion server-authoritative (ensayo corto, 2s) ---');
    const startShort = await req('POST', `/exams/${examShortId}/attempts`, alice.authHeaders, {});
    const shortAttemptId = startShort.body?.attemptId as string;
    trackedAttemptIds.push(shortAttemptId);
    const beforeExpiry = await req('PUT', `/exams/me/attempts/${shortAttemptId}/answers`, alice.authHeaders, {
      questionVersionId: qShort[0]!.questionVersionId, answerOptionId: qShort[0]!.correctOptionId, operationId: randomUUID(),
    });
    check('respuesta ANTES de expirar -> 200', beforeExpiry.status === 200);
    await sleep(2600);
    const afterExpiry = await req('PUT', `/exams/me/attempts/${shortAttemptId}/answers`, alice.authHeaders, {
      questionVersionId: qShort[1]!.questionVersionId, answerOptionId: qShort[1]!.correctOptionId, operationId: randomUUID(),
    });
    check('respuesta DESPUES de expirar -> 409', afterExpiry.status === 409);
    const stateAfter = await req('GET', `/exams/me/attempts/${shortAttemptId}`, alice.authHeaders);
    check('estado transiciona a EXPIRED (transicion perezosa)', stateAfter.body?.status === 'EXPIRED');
    const dbStatus = await pg.query(`SELECT status FROM exam_attempt WHERE id=$1`, [shortAttemptId]);
    check('EXPIRED persistido en DB', dbStatus.rows[0].status === 'EXPIRED');
    const submitExpired = await req('POST', `/exams/me/attempts/${shortAttemptId}/submit`, alice.authHeaders, {});
    check('submit sobre intento expirado NO lo convierte en COMPLETED', submitExpired.body?.status === 'EXPIRED');
    check('score sigue calculandose para el intento expirado (1/2 correcta)', submitExpired.body?.score?.correct === 1 && submitExpired.body?.score?.totalQuestions === 2);
    check('revision disponible tras EXPIRED -> 200', (await req('GET', `/exams/me/attempts/${shortAttemptId}/review`, alice.authHeaders)).status === 200);

    console.log('--- 16. Start contra ensayo no publicado / inexistente -> 404 ---');
    check('start contra ensayo DRAFT -> 404', (await req('POST', `/exams/${examDraftId}/attempts`, alice.authHeaders, {})).status === 404);
    check('start contra ensayo inexistente -> 404', (await req('POST', `/exams/${randomUUID()}/attempts`, alice.authHeaders, {})).status === 404);

    console.log('--- 17. Invariantes de exam_question (SQL directo) ---');
    let dupOrder = false;
    try {
      await pg.query(`INSERT INTO exam_question (id, exam_id, question_version_id, display_order, created_at) VALUES ($1,$2,$3,0,now())`, [randomUUID(), examAId, qForeign.questionVersionId]);
    } catch (e) { dupOrder = (e as { code?: string }).code === '23505'; }
    check('displayOrder duplicado en el mismo ensayo -> rechazado (unique)', dupOrder);
    let dupQuestion = false;
    try {
      await pg.query(`INSERT INTO exam_question (id, exam_id, question_version_id, display_order, created_at) VALUES ($1,$2,$3,99,now())`, [randomUUID(), examAId, qA[0]!.questionVersionId]);
    } catch (e) { dupQuestion = (e as { code?: string }).code === '23505'; }
    check('misma pregunta dos veces en el mismo ensayo -> rechazado (unique)', dupQuestion);
    let draftRejected = false;
    try {
      await pg.query(`INSERT INTO exam_question (id, exam_id, question_version_id, display_order, created_at) VALUES ($1,$2,$3,50,now())`, [randomUUID(), examAId, draftQuestionVersionId]);
    } catch (e) { draftRejected = String((e as Error).message).includes('PUBLISHED'); }
    check('vincular una question_version no PUBLISHED -> rechazado (trigger)', draftRejected);

    console.log('--- 18. Maquina de estados forward-only (SQL directo) ---');
    let backwardRejected = false;
    try {
      await pg.query(`UPDATE exam_attempt SET status='ACTIVE' WHERE id=$1`, [attemptId]);
    } catch (e) { backwardRejected = String((e as Error).message).includes('no admite la transici'); }
    check('trigger rechaza COMPLETED -> ACTIVE', backwardRejected);

    console.log('--- 19. AISLAMIENTO CRITICO: cero contaminacion de Study / gamificacion ---');
    const isoAccts = [alice.accountId, bob.accountId];
    const zero = async (table: string, col = 'account_id') =>
      (await pg.query(`SELECT count(*)::int n FROM ${table} WHERE ${col} = ANY($1::uuid[])`, [isoAccts])).rows[0].n;
    check('0 filas en student_response', (await zero('student_response')) === 0);
    check('0 filas en curriculum_topic_progress', (await zero('curriculum_topic_progress')) === 0);
    check('0 filas en validated_gamification_activity', (await zero('validated_gamification_activity')) === 0);
    check('0 filas en xp_ledger_entry', (await zero('xp_ledger_entry')) === 0);
    check('0 filas en league_point_ledger_entry', (await zero('league_point_ledger_entry')) === 0);
    const gamiEvents = await pg.query(
      `SELECT count(*)::int n FROM outbox_event
        WHERE event_key IN ('student_response_recorded','curriculum_topic_completed','quick_question_answered')
          AND (aggregate_id = ANY($1::uuid[]) OR payload->>'accountId' = ANY($2::text[]))`,
      [isoAccts, isoAccts],
    );
    check('0 eventos de gamificacion en el outbox para estas cuentas', gamiEvents.rows[0].n === 0);
    const anyExamOutbox = await pg.query(`SELECT count(*)::int n FROM outbox_event WHERE source_domain = 'EXAMS'`);
    check('el dominio EXAMS no publica NINGUN outbox_event', anyExamOutbox.rows[0].n === 0);

    console.log('--- 20. Frontera de dominio estatica: los archivos de exams no tocan PROGRESS/Outbox ---');
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const examsDir = join(__dirname, '..', 'src', 'exams');
    const forbidden = ['StudentResponse', 'CurriculumTopicProgress', 'ProgressService', 'OutboxService', 'OutboxModule', 'XpGrant'];
    // Ignora comentarios -- lo que importa es que el CÓDIGO no importe ni use
    // estos símbolos, no que un comentario explique por qué NO se usan.
    const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const offenders = readdirSync(examsDir).filter((f) => {
      const code = stripComments(readFileSync(join(examsDir, f), 'utf8'));
      return forbidden.some((sym) => code.includes(sym));
    });
    check(`ningun archivo de src/exams usa (fuera de comentarios) ${forbidden.join('/')} (${offenders.join(', ') || 'limpio'})`, offenders.length === 0);
  } finally {
    console.log('--- 21. Limpieza (contenido publicado permanece, como en el resto de gates) ---');
    for (const acc of accounts) {
      try { await setTier(acc, null); } catch { /* best-effort */ }
    }
    await pg.query('DELETE FROM exam_attempt_answer WHERE attempt_id = ANY($1::uuid[])', [trackedAttemptIds]);
    await pg.query('DELETE FROM exam_attempt WHERE id = ANY($1::uuid[])', [trackedAttemptIds]);
    await pg.query('DELETE FROM exam_question WHERE exam_id = ANY($1::uuid[])', [[examAId, examShortId, examDraftId]]);
    await pg.query('DELETE FROM exam WHERE id = ANY($1::uuid[])', [[examAId, examShortId, examDraftId]]);
  }

  await pg.end();
  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundacion de Ensayos (ENSAYOS-F1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
