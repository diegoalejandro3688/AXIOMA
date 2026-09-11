// WEB-0D.1B-P0A -- remediación de una discrepancia detectada por la auditoría
// de privacidad WEB-0D.1: el cierre DEFINITIVO de cuenta dejaba el historial
// de Ensayos PAES (ExamAttempt/ExamAttemptAnswer) y de Pregunta rápida
// (QuickQuestionSession/QuickQuestionAttempt) ligado indefinidamente al UUID
// de una cuenta ya cerrada. Este gate prueba, contra el servidor real ya
// corriendo + Postgres directo, que `PrivacyService.runAccountDeletionSweep`
// ahora también los elimina -- y que NO toca la cuenta/datos de otra cuenta.
//
// Mismo patrón que verify-privacy-gate.ts (paso 7, "barrido de cierre
// definitivo") + verify-exam-foundation-gate.ts / verify-quick-question-http-gate.ts
// (fixtures propias, aisladas, vía HTTP real -- nunca INSERT directo de las
// filas que se van a verificar, para probar el camino de escritura real).
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

async function setTier(accountId: string, tier: 'FREE' | 'PREMIUM' | null) {
  const q = tier === null ? '' : `&tier=${tier}`;
  const r = await req('POST', `/_internal/entitlement/set-tier-override?accountId=${accountId}${q}`, { 'x-internal-ops-key': opsKey });
  if (r.status !== 200 && r.status !== 201) throw new Error(`set-tier-override(${accountId},${tier}) -> ${r.status} ${r.raw}`);
}

async function newSession(label: string) {
  const uid = `del-acad-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const r = await req('POST', '/auth/session', {}, { idToken });
  const accountId = r.body?.accountId as string;
  await setTier(accountId, 'PREMIUM'); // exam attempts requieren PREMIUM (C1.2)
  return {
    accountId,
    idToken,
    authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': r.body?.sessionId as string },
  };
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log('--- 0. Fixtures: subject + tema aislado + 1 pregunta publicada + 1 ensayo ---');
  let subjectId: string;
  const existingSubject = await pg.query(`SELECT id FROM subject ORDER BY display_order ASC LIMIT 1`);
  if (existingSubject.rowCount && existingSubject.rows[0].id) {
    subjectId = existingSubject.rows[0].id as string;
  } else {
    subjectId = randomUUID();
    await pg.query(
      `INSERT INTO subject (id, subject_key, name, short_name, display_order, status, created_at, updated_at)
       VALUES ($1, $2, 'Materia del gate de borrado de historial academico', 'GATE', 900, 'ACTIVE', now(), now())`,
      [subjectId, `gate-del-acad-${runId}`],
    );
  }

  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema aislado del gate de borrado de historial academico', 908, $3, now(), now())`,
    [topicId, `GATE.DEL.ACAD.TOPIC.${runId}`, subjectId],
  );

  const questionId = randomUUID();
  const questionVersionId = randomUUID();
  await pg.query(
    `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
    [questionId, `GATE.DEL.ACAD.${runId}`, subjectId],
  );
  await pg.query(
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3,
       '[{"type":"paragraph","order":0,"text":"Enunciado de prueba del gate de borrado de historial academico."}]',
       '[{"type":"paragraph","order":0,"text":"Explicacion de prueba."}]',
       'DRAFT', now(), now())`,
    [questionVersionId, questionId, topicId],
  );
  const optionIds: string[] = [];
  for (let i = 0; i < 4; i++) {
    const optionId = randomUUID();
    optionIds.push(optionId);
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [optionId, questionVersionId, JSON.stringify({ type: 'paragraph', order: 0, text: `Alternativa ${i}` }), i, i === 0],
    );
  }
  await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [questionVersionId]);

  const examId = randomUUID();
  await pg.query(
    `INSERT INTO exam (id, exam_key, title, subject_id, duration_seconds, status, published_at, created_at, updated_at)
     VALUES ($1, $2, 'Ensayo tecnico del gate de borrado de historial academico', $3, 3600, 'PUBLISHED', now(), now(), now())`,
    [examId, `GATE.DEL.ACAD.EXAM.${runId}`, subjectId],
  );
  await pg.query(
    `INSERT INTO exam_question (id, exam_id, question_version_id, display_order, created_at) VALUES ($1, $2, $3, 0, now())`,
    [randomUUID(), examId, questionVersionId],
  );

  /** Crea 1 ExamAttempt + 1 ExamAttemptAnswer reales via HTTP (start -> upsert answer -> submit). */
  async function createExamHistory(account: { accountId: string; authHeaders: Record<string, string> }) {
    const start = await req('POST', `/exams/${examId}/attempts`, account.authHeaders, {});
    if (start.status !== 200) throw new Error(`start attempt -> ${start.status} ${start.raw}`);
    const attemptId = start.body.attemptId as string;

    const answer = await req(
      'PUT',
      `/exams/me/attempts/${attemptId}/answers`,
      account.authHeaders,
      { questionVersionId, answerOptionId: optionIds[0], operationId: randomUUID() },
    );
    if (answer.status !== 200) throw new Error(`upsert answer -> ${answer.status} ${answer.raw}`);

    const submit = await req('POST', `/exams/me/attempts/${attemptId}/submit`, account.authHeaders, {});
    if (submit.status !== 200) throw new Error(`submit attempt -> ${submit.status} ${submit.raw}`);

    return { attemptId };
  }

  /** Crea 1 QuickQuestionSession + 1 QuickQuestionAttempt reales via HTTP (open -> next -> answers). */
  async function createQuickQuestionHistory(account: { accountId: string; authHeaders: Record<string, string> }) {
    const QQ = '/gamification/me/quick-question/sessions';
    const open = await req('POST', QQ, account.authHeaders, {});
    if (open.status !== 200) throw new Error(`open session -> ${open.status} ${open.raw}`);
    const sessionId = open.body.sessionId as string;

    const next = await req('POST', `${QQ}/${sessionId}/next`, account.authHeaders, {});
    if (next.status !== 200) throw new Error(`next -> ${next.status} ${next.raw}`);
    if (next.body.outcome !== 'QUESTION_PRESENTED') {
      throw new Error(`next: se esperaba QUESTION_PRESENTED, llego "${next.body.outcome}" -- la pregunta fixture del gate no era elegible`);
    }
    const answerOptionId = next.body.answerOptions?.[0]?.id;

    const answer = await req('POST', `${QQ}/${sessionId}/answers`, account.authHeaders, { answerOptionId, operationId: randomUUID() });
    if (answer.status !== 200) throw new Error(`answer -> ${answer.status} ${answer.raw}`);

    return { sessionId };
  }

  async function countAcademicHistory(accountId: string) {
    const examAttempts = await pg.query(`SELECT count(*)::int n FROM exam_attempt WHERE account_id = $1`, [accountId]);
    const examAnswers = await pg.query(`SELECT count(*)::int n FROM exam_attempt_answer WHERE account_id = $1`, [accountId]);
    const qqSessions = await pg.query(`SELECT count(*)::int n FROM quick_question_session WHERE account_id = $1`, [accountId]);
    const qqAttempts = await pg.query(`SELECT count(*)::int n FROM quick_question_attempt WHERE account_id = $1`, [accountId]);
    return {
      examAttempts: examAttempts.rows[0].n as number,
      examAnswers: examAnswers.rows[0].n as number,
      qqSessions: qqSessions.rows[0].n as number,
      qqAttempts: qqAttempts.rows[0].n as number,
    };
  }

  console.log('--- 1. Cuenta X: crea historial de Ensayos + Pregunta rapida (la que se va a cerrar) ---');
  const accountX = await newSession('x');
  await createExamHistory(accountX);
  await createQuickQuestionHistory(accountX);
  const beforeX = await countAcademicHistory(accountX.accountId);
  check('X: 1 ExamAttempt antes del cierre', beforeX.examAttempts === 1);
  check('X: 1 ExamAttemptAnswer antes del cierre', beforeX.examAnswers === 1);
  check('X: 1 QuickQuestionSession antes del cierre', beforeX.qqSessions === 1);
  check('X: 1 QuickQuestionAttempt antes del cierre', beforeX.qqAttempts === 1);

  console.log('--- 2. Cuenta Y (control, NUNCA se cierra): mismo historial, para probar aislamiento ---');
  const accountY = await newSession('y');
  await createExamHistory(accountY);
  await createQuickQuestionHistory(accountY);
  const beforeY = await countAcademicHistory(accountY.accountId);
  check('Y: 1 ExamAttempt antes del cierre de X', beforeY.examAttempts === 1);
  check('Y: 1 QuickQuestionSession antes del cierre de X', beforeY.qqSessions === 1);

  console.log('--- 3. Solicitud de eliminacion + forzar vencimiento del plazo de recuperacion (fixture, mismo patron que verify-privacy-gate.ts) ---');
  const rDeletion = await req(
    'POST',
    '/privacy/account-deletion',
    { authorization: accountX.authHeaders.authorization, 'x-session-id': accountX.authHeaders['x-session-id'] },
    {},
  );
  check('solicitud de eliminacion -> 202', rDeletion.status === 202);
  await pg.query(
    "UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'",
    [accountX.accountId],
  );

  console.log('--- 4. Ejecuta el barrido REAL de cierre definitivo (PrivacyService.runAccountDeletionSweep) ---');
  const rSweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  check('sweep -> 200', rSweep.status === 200);
  check('sweep proceso al menos 1 cuenta', rSweep.body?.deletion?.processed >= 1);

  console.log('--- 5. Cuenta X: el historial academico de Ensayos + Pregunta rapida quedo eliminado ---');
  const afterX = await countAcademicHistory(accountX.accountId);
  check('X: ExamAttempt = 0 tras el cierre', afterX.examAttempts === 0);
  check('X: ExamAttemptAnswer = 0 tras el cierre', afterX.examAnswers === 0);
  check('X: QuickQuestionSession = 0 tras el cierre', afterX.qqSessions === 0);
  check('X: QuickQuestionAttempt = 0 tras el cierre', afterX.qqAttempts === 0);

  const accountXAfter = await pg.query('SELECT status, closed_at FROM account WHERE id = $1', [accountX.accountId]);
  check('X: Account.status CLOSED (comportamiento existente intacto)', accountXAfter.rows[0]?.status === 'CLOSED');
  check('X: closedAt seteado (comportamiento existente intacto)', accountXAfter.rows[0]?.closed_at !== null);

  console.log('--- 6. Cuenta Y: NO se toco (aislamiento entre cuentas) ---');
  const afterY = await countAcademicHistory(accountY.accountId);
  check('Y: ExamAttempt SIGUE en 1 (no afectado por el cierre de X)', afterY.examAttempts === 1);
  check('Y: ExamAttemptAnswer SIGUE en 1', afterY.examAnswers === 1);
  check('Y: QuickQuestionSession SIGUE en 1', afterY.qqSessions === 1);
  check('Y: QuickQuestionAttempt SIGUE en 1', afterY.qqAttempts === 1);
  const accountYAfter = await pg.query('SELECT status FROM account WHERE id = $1', [accountY.accountId]);
  check('Y: Account.status SIGUE activo (no cerrado)', accountYAfter.rows[0]?.status !== 'CLOSED');

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de borrado de historial academico (WEB-0D.1B-P0A) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
