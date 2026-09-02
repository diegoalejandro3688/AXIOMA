// Gate de PREMIUM V1 -- Capa 1 (Entitlement backend), C1.2: enforcement de
// Ensayos. Contra el servidor de gates real (mismo patron que
// verify-exam-foundation-gate.ts) + invariantes de base de datos por SQL
// directo.
//
// Regla: CREAR un intento de ensayo nuevo exige tier PREMIUM. REANUDAR un
// ACTIVE vigente NO lo exige. El 403 PREMIUM_REQUIRED se lanza DESPUES del
// commit de la transaccion, de modo que la transicion a EXPIRED de un
// intento vencido queda persistida igualmente.
//
// Invariantes C1.2:
//   1. FREE + ACTIVE vigente        -> 200, mismo attempt (reanuda, sin gate).
//   2. FREE + sin ACTIVE            -> 403 PREMIUM_REQUIRED.
//   3. PREMIUM + sin ACTIVE         -> 200, crea.
//   4. PREMIUM + ACTIVE expirado    -> marca viejo EXPIRED + crea nuevo.
//   5. FREE + ACTIVE expirado       -> marca viejo EXPIRED, COMMIT, luego 403.
//   6. DB: el intento vencido queda REALMENTE en EXPIRED tras el 403.
//   + catalogo abierto para FREE (GET /exams sigue 200), 401 sin sesion,
//     y verificacion estatica de que el throw NO ocurre dentro de $transaction.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
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

async function newSession(label: string) {
  const uid = `premium-exams-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const r = await req('POST', '/auth/session', {}, { idToken });
  return {
    accountId: r.body?.accountId as string,
    authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': r.body?.sessionId as string },
  };
}

async function setTier(accountId: string, tier: 'FREE' | 'PREMIUM' | null) {
  const q = tier === null ? '' : `&tier=${tier}`;
  const r = await req('POST', `/_internal/entitlement/set-tier-override?accountId=${accountId}${q}`, { 'x-internal-ops-key': opsKey });
  // Sin @HttpCode -> Nest devuelve 201 en @Post (mismo criterio que AiInternalAdminController).
  if (r.status !== 200 && r.status !== 201) throw new Error(`set-tier-override(${accountId},${tier}) -> ${r.status} ${r.raw}`);
}

const isPremiumRequired = (r: { status: number; body: unknown }) =>
  r.status === 403 && (r.body as { error?: { code?: string } })?.error?.code === 'PREMIUM_REQUIRED';

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ---- Fixtures ----
  let subjectId: string;
  const existingSubject = await pg.query(`SELECT id FROM subject ORDER BY display_order ASC LIMIT 1`);
  if (existingSubject.rowCount && existingSubject.rows[0].id) {
    subjectId = existingSubject.rows[0].id as string;
  } else {
    subjectId = randomUUID();
    await pg.query(
      `INSERT INTO subject (id, subject_key, name, short_name, display_order, status, created_at, updated_at)
       VALUES ($1, $2, 'Materia del gate Premium/Ensayos', 'GATEP', 950, 'ACTIVE', now(), now())`,
      [subjectId, `gate-premium-exam-${runId}`],
    );
  }

  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema del gate Premium/Ensayos (C1.2)', 957, $3, now(), now())`,
    [topicId, `GATE.PREMIUM.EXAM.TOPIC.${runId}`, subjectId],
  );

  async function makePublishedQuestion(): Promise<string> {
    const questionId = randomUUID();
    const questionVersionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [questionId, `GATE.PREMIUM.EXAM.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1, $2, $3,
         '[{"type":"paragraph","order":0,"text":"Enunciado del gate Premium/Ensayos."}]',
         '[{"type":"paragraph","order":0,"text":"Explicacion (solo revision)."}]',
         'DRAFT', now(), now())`,
      [questionVersionId, questionId, topicId],
    );
    for (let i = 0; i < 4; i++) {
      await pg.query(
        `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [randomUUID(), questionVersionId, JSON.stringify({ type: 'paragraph', order: 0, text: `Alternativa ${i}` }), i, i === 0],
      );
    }
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [questionVersionId]);
    return questionVersionId;
  }

  const qLong = [await makePublishedQuestion(), await makePublishedQuestion()];
  const qShort = [await makePublishedQuestion(), await makePublishedQuestion()];

  const examLongId = randomUUID();
  const examShortId = randomUUID();
  await pg.query(
    `INSERT INTO exam (id, exam_key, title, subject_id, duration_seconds, status, published_at, created_at, updated_at)
     VALUES ($1,$2,'Ensayo largo del gate Premium (C1.2)',$3,3600,'PUBLISHED',now(),now(),now()),
            ($4,$5,'Ensayo corto (2s) del gate Premium (C1.2)',$3,2,'PUBLISHED',now(),now(),now())`,
    [examLongId, `GATE.PREMIUM.EXAM.LONG.${runId}`, subjectId, examShortId, `GATE.PREMIUM.EXAM.SHORT.${runId}`],
  );
  for (let i = 0; i < qLong.length; i++) {
    await pg.query(`INSERT INTO exam_question (id, exam_id, question_version_id, display_order, created_at) VALUES ($1,$2,$3,$4,now())`, [randomUUID(), examLongId, qLong[i]!, i]);
  }
  for (let i = 0; i < qShort.length; i++) {
    await pg.query(`INSERT INTO exam_question (id, exam_id, question_version_id, display_order, created_at) VALUES ($1,$2,$3,$4,now())`, [randomUUID(), examShortId, qShort[i]!, i]);
  }

  const accounts: string[] = [];
  const trackedAttemptIds: string[] = [];

  try {
    console.log('--- 0. Basicos: catalogo abierto para FREE, 401 sin sesion ---');
    const acctList = await newSession('list-free');
    accounts.push(acctList.accountId);
    await setTier(acctList.accountId, 'FREE');
    const list = await req('GET', '/exams', acctList.authHeaders);
    check('FREE: GET /exams -> 200 (lista visible)', list.status === 200 && Array.isArray(list.body?.exams));
    check('FREE: el ensayo largo aparece en el catalogo', (list.body?.exams ?? []).some((e: { id: string }) => e.id === examLongId));
    check('POST /exams/:id/attempts sin sesion -> 401', (await req('POST', `/exams/${examLongId}/attempts`, {}, {})).status === 401);

    console.log('--- 1+3. PREMIUM + sin ACTIVE -> crea (inv. 3) ---');
    const acctC = await newSession('premium-create');
    accounts.push(acctC.accountId);
    await setTier(acctC.accountId, 'PREMIUM');
    const createC = await req('POST', `/exams/${examLongId}/attempts`, acctC.authHeaders, {});
    check('PREMIUM sin ACTIVE: POST /attempts -> 200', createC.status === 200);
    check('PREMIUM: intento ACTIVE', createC.body?.status === 'ACTIVE');
    const attemptC = createC.body?.attemptId as string;
    trackedAttemptIds.push(attemptC);
    check('DB: 1 intento ACTIVE para (acctC, examLong)',
      (await pg.query(`SELECT count(*)::int n FROM exam_attempt WHERE account_id=$1 AND exam_id=$2 AND status='ACTIVE'`, [acctC.accountId, examLongId])).rows[0].n === 1);

    console.log('--- 2. FREE + ACTIVE vigente -> 200, mismo attempt (inv. 1) ---');
    await setTier(acctC.accountId, 'FREE'); // downgrade con un ensayo en curso
    const resumeC = await req('POST', `/exams/${examLongId}/attempts`, acctC.authHeaders, {});
    check('FREE con ACTIVE vigente: POST /attempts -> 200 (NO 403)', resumeC.status === 200);
    check('FREE con ACTIVE vigente: MISMO attemptId (reanuda)', resumeC.body?.attemptId === attemptC);
    check('DB: sigue habiendo exactamente 1 ACTIVE, el mismo id',
      (await pg.query(`SELECT count(*)::int n FROM exam_attempt WHERE account_id=$1 AND exam_id=$2 AND status='ACTIVE'`, [acctC.accountId, examLongId])).rows[0].n === 1);

    console.log('--- 3b. FREE + sin ACTIVE -> 403 PREMIUM_REQUIRED (inv. 2) ---');
    const acctB = await newSession('free-noactive');
    accounts.push(acctB.accountId);
    await setTier(acctB.accountId, 'FREE');
    const blockB = await req('POST', `/exams/${examLongId}/attempts`, acctB.authHeaders, {});
    check('FREE sin ACTIVE: POST /attempts -> 403', blockB.status === 403);
    check('FREE sin ACTIVE: body.error.code === PREMIUM_REQUIRED (sin `origin`)',
      isPremiumRequired(blockB) && !('origin' in ((blockB.body as { error?: object })?.error ?? {})));
    check('DB: 0 intentos creados para (acctB, examLong)',
      (await pg.query(`SELECT count(*)::int n FROM exam_attempt WHERE account_id=$1 AND exam_id=$2`, [acctB.accountId, examLongId])).rows[0].n === 0);

    console.log('--- 4. PREMIUM + ACTIVE expirado -> marca viejo EXPIRED + crea nuevo (inv. 4) ---');
    const acctD = await newSession('premium-expired');
    accounts.push(acctD.accountId);
    await setTier(acctD.accountId, 'PREMIUM');
    const d1 = await req('POST', `/exams/${examShortId}/attempts`, acctD.authHeaders, {});
    const attemptD1 = d1.body?.attemptId as string;
    trackedAttemptIds.push(attemptD1);
    check('PREMIUM: primer intento del ensayo corto -> 200 ACTIVE', d1.status === 200 && d1.body?.status === 'ACTIVE');
    await sleep(2600); // el ensayo corto dura 2s
    const d2 = await req('POST', `/exams/${examShortId}/attempts`, acctD.authHeaders, {});
    const attemptD2 = d2.body?.attemptId as string;
    trackedAttemptIds.push(attemptD2);
    check('PREMIUM + ACTIVE expirado: POST /attempts -> 200', d2.status === 200);
    check('PREMIUM + ACTIVE expirado: attemptId NUEVO', typeof attemptD2 === 'string' && attemptD2 !== attemptD1);
    check('PREMIUM + ACTIVE expirado: nuevo intento ACTIVE', d2.body?.status === 'ACTIVE');
    check('DB: el intento viejo (D1) quedo EXPIRED',
      (await pg.query(`SELECT status FROM exam_attempt WHERE id=$1`, [attemptD1])).rows[0]?.status === 'EXPIRED');
    check('DB: exactamente 1 ACTIVE para (acctD, examShort), y es D2',
      (await pg.query(`SELECT id FROM exam_attempt WHERE account_id=$1 AND exam_id=$2 AND status='ACTIVE'`, [acctD.accountId, examShortId])).rows.map((r) => r.id).join(',') === attemptD2);

    console.log('--- 5+6. FREE + ACTIVE expirado -> marca EXPIRED, COMMIT, luego 403 (inv. 5/6) ---');
    const acctE = await newSession('free-expired');
    accounts.push(acctE.accountId);
    await setTier(acctE.accountId, 'PREMIUM');
    const e1 = await req('POST', `/exams/${examShortId}/attempts`, acctE.authHeaders, {});
    const attemptE1 = e1.body?.attemptId as string;
    trackedAttemptIds.push(attemptE1);
    check('PREMIUM: intento del ensayo corto creado -> 200 ACTIVE', e1.status === 200 && e1.body?.status === 'ACTIVE');
    await sleep(2600);
    await setTier(acctE.accountId, 'FREE'); // downgrade DESPUES de que E1 vencio
    const e2 = await req('POST', `/exams/${examShortId}/attempts`, acctE.authHeaders, {});
    check('FREE + ACTIVE expirado: POST /attempts -> 403 PREMIUM_REQUIRED', isPremiumRequired(e2));
    // La clave del guardrail: el markExpired NO se revirtio pese al 403.
    const e1Status = (await pg.query(`SELECT status FROM exam_attempt WHERE id=$1`, [attemptE1])).rows[0]?.status;
    check('DB: pese al 403, el intento vencido (E1) quedo REALMENTE en EXPIRED (markExpired no hizo rollback)', e1Status === 'EXPIRED');
    check('DB: NO se creo ningun intento nuevo para (acctE, examShort) -- sigue habiendo 1 fila, EXPIRED',
      (await pg.query(`SELECT count(*)::int n, bool_and(status='EXPIRED') allexp FROM exam_attempt WHERE account_id=$1 AND exam_id=$2`, [acctE.accountId, examShortId])).rows[0].n === 1);
    check('DB: 0 intentos ACTIVE para (acctE, examShort)',
      (await pg.query(`SELECT count(*)::int n FROM exam_attempt WHERE account_id=$1 AND exam_id=$2 AND status='ACTIVE'`, [acctE.accountId, examShortId])).rows[0].n === 0);

    console.log('--- 7. Verificacion estatica: el 403 NO se lanza dentro de $transaction ---');
    const svcSrc = readFileSync(join(__dirname, '..', 'src', 'exams', 'exam.service.ts'), 'utf8');
    const txStart = svcSrc.indexOf('this.prisma.$transaction(async (tx)');
    const txEnd = svcSrc.indexOf('}, TX_OPTIONS);', txStart);
    check('startAttempt: se encontro el bloque $transaction', txStart !== -1 && txEnd !== -1 && txEnd > txStart);
    const txBody = svcSrc.slice(txStart, txEnd);
    check('dentro de $transaction NO hay `throw new ForbiddenException`', !/throw new ForbiddenException/.test(txBody));
    check('dentro de $transaction se DEVUELVE el sentinel PREMIUM_REQUIRED', /return \{ kind: 'PREMIUM_REQUIRED' \}/.test(txBody));
    const afterTx = svcSrc.slice(txEnd, svcSrc.indexOf('return outcome.attempt;', txEnd) + 30);
    check('el `throw new ForbiddenException({ code: PREMIUM_REQUIRED_CODE ... })` esta DESPUES del commit', /outcome\.kind === 'PREMIUM_REQUIRED'[\s\S]*throw new ForbiddenException\(\{[\s\S]*PREMIUM_REQUIRED_CODE/.test(afterTx));
  } finally {
    console.log('--- 8. Limpieza (contenido publicado permanece; se limpian intentos y overrides) ---');
    for (const acc of accounts) {
      try { await setTier(acc, null); } catch { /* best-effort */ }
    }
    const examIds = [examLongId, examShortId];
    void trackedAttemptIds;
    await pg.query(
      `DELETE FROM exam_attempt_answer WHERE attempt_id IN (SELECT id FROM exam_attempt WHERE exam_id = ANY($1::uuid[]))`,
      [examIds],
    );
    await pg.query('DELETE FROM exam_attempt WHERE exam_id = ANY($1::uuid[])', [examIds]);
    await pg.query('DELETE FROM exam_question WHERE exam_id = ANY($1::uuid[])', [examIds]);
    await pg.query('DELETE FROM exam WHERE id = ANY($1::uuid[])', [examIds]);
  }

  await pg.end();
  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Premium/Ensayos (PREMIUM V1, Capa 1, C1.2) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
