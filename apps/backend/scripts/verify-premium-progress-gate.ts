// Gate de PREMIUM V1 -- Capa 1 (Entitlement backend), C1.4: enforcement de
// la ESCRITURA de progreso. Contra el servidor de gates real + SQL directo.
//
// Regla: crear un `student_response` NUEVO sobre un tema de una unidad en
// posicion >= 2 requiere tier PREMIUM. El replay por operationId y la
// idempotencia de negocio (misma pregunta, misma alternativa) YA retornan
// antes del gate; las LECTURAS de progreso nunca se gatean; los datos
// existentes nunca se borran ni modifican.
//
// Invariantes C1.4:
//   1. FREE + escritura nueva sobre tema PREMIUM_UNIT -> 403 PREMIUM_REQUIRED.
//   2. FREE + escritura sobre tema FREE_UNIT -> 201 (contenido de U1/U2 libre).
//   3. PREMIUM + escritura sobre tema PREMIUM_UNIT -> 201.
//   4. Lecturas SIEMPRE abiertas: GET topics/:id, GET me/summary, batch ->
//      200 para FREE, incluso sobre temas premium; nunca 403.
//   5. Downgrade: la fila creada como PREMIUM sigue legible (GET topic +
//      me/summary la cuentan) y presente en DB, sin cambios.
//   6. Replay idempotente tras downgrade: mismo operationId + misma
//      alternativa -> 200, sin fila nueva, NUNCA 403.
//   7. Re-upgrade reanuda la escritura.
//   8. Idempotencia de negocio tras downgrade: misma pregunta + misma
//      alternativa (otro operationId) -> 200 sin escritura; alternativa
//      distinta -> 409 conflicto; ninguno 403; ninguno escribe.
//   + scan estatico: el gate esta DESPUES de replay+idempotencia de negocio
//     y ANTES de responseRepo.create.
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

async function newSession(label: string) {
  const uid = `premium-progress-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  if (r.status !== 200 && r.status !== 201) throw new Error(`set-tier-override(${accountId},${tier}) -> ${r.status} ${r.raw}`);
}

const isPremiumRequired = (r: { status: number; body: unknown }) =>
  r.status === 403 && (r.body as { error?: { code?: string } })?.error?.code === 'PREMIUM_REQUIRED';

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const subjectId = randomUUID();
  const accounts: string[] = [];

  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, display_order, status, created_at, updated_at)
     VALUES ($1,$2,'Materia del gate Premium/Progreso (C1.4)','GATEP',965,'ACTIVE',now(),now())`,
    [subjectId, `gate-premium-progress-${runId}`],
  );

  /** Unidad canonica raiz + 1 recurso hijo (lrv PUBLISHED) + `nQuestions` preguntas PUBLISHED (correcta = opción 0). */
  async function makeUnit(order: number, label: string, nQuestions: number): Promise<{ unitId: string; resourceId: string; questions: { qvId: string; correct: string; wrong: string }[] }> {
    const unitId = randomUUID();
    const resourceId = randomUUID();
    await pg.query(
      `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,now(),now()), ($6,$7,$8,0,$5,now(),now())`,
      [unitId, `GATE.PREMIUM.PROGRESS.${runId}.${label}`, `Unidad ${label}`, order, subjectId, resourceId, `GATE.PREMIUM.PROGRESS.${runId}.${label}.R`, `Recurso ${label}`],
    );
    await pg.query(`UPDATE curriculum_topic SET parent_id = $1 WHERE id = $2`, [unitId, resourceId]);

    const lrId = randomUUID();
    const lrvId = randomUUID();
    await pg.query(`INSERT INTO learning_resource (id, resource_key, primary_subject_id, resource_type, status, created_at, updated_at) VALUES ($1,$2,$3,'LESSON','ACTIVE',now(),now())`, [lrId, `GATE.PREMIUM.PROGRESS.LR.${randomUUID()}`, subjectId]);
    await pg.query(
      `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, created_at, updated_at)
       VALUES ($1,$2,$3,'Recurso','[{"type":"paragraph","order":0,"text":"x"}]','DRAFT',now(),now())`,
      [lrvId, lrId, resourceId],
    );
    await pg.query(`UPDATE learning_resource_version SET editorial_status='PUBLISHED', published_at=now() WHERE id=$1`, [lrvId]);

    const questions: { qvId: string; correct: string; wrong: string }[] = [];
    for (let i = 0; i < nQuestions; i++) {
      const qId = randomUUID();
      const qvId = randomUUID();
      await pg.query(`INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at) VALUES ($1,$2,$3,'SINGLE_CHOICE','ACTIVE',now(),now())`, [qId, `GATE.PREMIUM.PROGRESS.Q.${randomUUID()}`, subjectId]);
      await pg.query(
        `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
         VALUES ($1,$2,$3,'[{"type":"paragraph","order":0,"text":"Enunciado."}]','[{"type":"paragraph","order":0,"text":"Explicacion."}]','DRAFT',now(),now())`,
        [qvId, qId, resourceId],
      );
      const opts: string[] = [];
      for (let k = 0; k < 4; k++) {
        const oid = randomUUID();
        opts.push(oid);
        await pg.query(`INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at) VALUES ($1,$2,$3,$4,$5,now())`, [oid, qvId, JSON.stringify({ type: 'paragraph', order: 0, text: `Alt ${k}` }), k, k === 0]);
      }
      await pg.query(`UPDATE question_version SET editorial_status='PUBLISHED', published_at=now() WHERE id=$1`, [qvId]);
      questions.push({ qvId, correct: opts[0]!, wrong: opts[1]! });
    }
    return { unitId, resourceId, questions };
  }

  const submit = (headers: Record<string, string>, topicId: string, qvId: string, answerOptionId: string, operationId: string) =>
    req('POST', `/progress/topics/${topicId}/responses`, headers, { questionVersionId: qvId, answerOptionId, operationId });

  try {
    const U0 = await makeUnit(10, 'U0', 1); // FREE
    await makeUnit(20, 'U1', 1);            // FREE (relleno de posición)
    const U2 = await makeUnit(30, 'U2', 4); // PREMIUM
    const freeTopic = U0.resourceId;
    const premTopic = U2.resourceId;

    const free = await newSession('free');
    const prem = await newSession('prem');
    accounts.push(free.accountId, prem.accountId);
    await setTier(free.accountId, 'FREE');
    await setTier(prem.accountId, 'PREMIUM');

    console.log('--- 1/2/3. Matriz de escritura ---');
    const w1 = await submit(free.authHeaders, premTopic, U2.questions[0]!.qvId, U2.questions[0]!.correct, randomUUID());
    check('1. FREE + escritura nueva sobre tema PREMIUM_UNIT -> 403 PREMIUM_REQUIRED', isPremiumRequired(w1));
    check('1. el 403 no lleva `origin`', !('origin' in ((w1.body as { error?: object })?.error ?? {})));
    check('1. DB: no se creó ninguna fila para esa (cuenta, pregunta)',
      (await pg.query(`SELECT count(*)::int n FROM student_response WHERE account_id=$1 AND question_version_id=$2`, [free.accountId, U2.questions[0]!.qvId])).rows[0].n === 0);

    const w2 = await submit(free.authHeaders, freeTopic, U0.questions[0]!.qvId, U0.questions[0]!.correct, randomUUID());
    check('2. FREE + escritura sobre tema FREE_UNIT -> 201 (contenido de U1/U2 libre)', w2.status === 201);

    const w3 = await submit(prem.authHeaders, premTopic, U2.questions[0]!.qvId, U2.questions[0]!.correct, randomUUID());
    check('3. PREMIUM + escritura sobre tema PREMIUM_UNIT -> 201', w3.status === 201);

    console.log('--- 4. Lecturas SIEMPRE abiertas para FREE (incluso sobre temas premium) ---');
    check('4. FREE: GET /progress/topics/:premTopic -> 200', (await req('GET', `/progress/topics/${premTopic}`, free.authHeaders)).status === 200);
    check('4. FREE: GET /progress/me/summary -> 200', (await req('GET', '/progress/me/summary', free.authHeaders)).status === 200);
    check('4. FREE: GET /progress/topics?topicIds=premTopic,freeTopic -> 200', (await req('GET', `/progress/topics?topicIds=${premTopic},${freeTopic}`, free.authHeaders)).status === 200);
    check('4. ninguna lectura devolvió 403',
      [
        await req('GET', `/progress/topics/${premTopic}`, free.authHeaders),
        await req('GET', '/progress/me/summary', free.authHeaders),
        await req('GET', `/progress/topics?topicIds=${premTopic}`, free.authHeaders),
      ].every((r) => r.status !== 403));

    console.log('--- 5. Downgrade: la fila creada como PREMIUM se conserva y sigue legible ---');
    // prem responde Q1 correcta, luego pierde Premium
    const opQ1 = randomUUID();
    const sQ1 = await submit(prem.authHeaders, premTopic, U2.questions[1]!.qvId, U2.questions[1]!.correct, opQ1);
    check('5. PREMIUM responde Q1 -> 201', sQ1.status === 201);
    const rowBefore = (await pg.query(`SELECT answer_option_id, is_correct, operation_id FROM student_response WHERE account_id=$1 AND question_version_id=$2`, [prem.accountId, U2.questions[1]!.qvId])).rows[0];
    await setTier(prem.accountId, 'FREE'); // DOWNGRADE
    const readTopic = await req('GET', `/progress/topics/${premTopic}`, prem.authHeaders);
    check('5. tras downgrade: GET /progress/topics/:premTopic sigue 200', readTopic.status === 200);
    const summaryAfter = await req('GET', '/progress/me/summary', prem.authHeaders);
    check('5. tras downgrade: GET /progress/me/summary sigue 200', summaryAfter.status === 200);
    const rowAfter = (await pg.query(`SELECT answer_option_id, is_correct, operation_id FROM student_response WHERE account_id=$1 AND question_version_id=$2`, [prem.accountId, U2.questions[1]!.qvId])).rows[0];
    check('5. DB: la fila de Q1 sigue existiendo SIN cambios tras el downgrade', !!rowAfter && JSON.stringify(rowAfter) === JSON.stringify(rowBefore));

    console.log('--- 6. Replay idempotente tras downgrade: mismo operationId + misma alternativa -> 200, sin fila nueva ---');
    const replay = await submit(prem.authHeaders, premTopic, U2.questions[1]!.qvId, U2.questions[1]!.correct, opQ1);
    check('6. replay (FREE, mismo operationId) -> 200, NUNCA 403', replay.status === 200);
    check('6. DB: sigue habiendo UNA sola fila para ese operationId',
      (await pg.query(`SELECT count(*)::int n FROM student_response WHERE operation_id=$1`, [opQ1])).rows[0].n === 1);

    console.log('--- 7. Re-upgrade reanuda la escritura ---');
    const blockedQ2 = await submit(prem.authHeaders, premTopic, U2.questions[2]!.qvId, U2.questions[2]!.correct, randomUUID());
    check('7. FREE: escritura sobre otra pregunta premium -> 403', isPremiumRequired(blockedQ2));
    await setTier(prem.accountId, 'PREMIUM'); // RE-UPGRADE
    const resumedQ2 = await submit(prem.authHeaders, premTopic, U2.questions[2]!.qvId, U2.questions[2]!.correct, randomUUID());
    check('7. tras re-upgrade: la misma escritura -> 201', resumedQ2.status === 201);

    console.log('--- 8. Idempotencia de negocio tras downgrade (misma pregunta ya respondida) ---');
    await setTier(prem.accountId, 'FREE'); // DOWNGRADE otra vez
    // Q1 ya respondida como PREMIUM (opción correcta). Reenviar la MISMA alternativa con OTRO operationId.
    const bizSame = await submit(prem.authHeaders, premTopic, U2.questions[1]!.qvId, U2.questions[1]!.correct, randomUUID());
    check('8. misma pregunta + misma alternativa (otro operationId) -> 200, NUNCA 403', bizSame.status === 200);
    // Reenviar una alternativa DISTINTA -> conflicto de negocio (409), no 403, no escritura.
    const bizConflict = await submit(prem.authHeaders, premTopic, U2.questions[1]!.qvId, U2.questions[1]!.wrong, randomUUID());
    check('8. misma pregunta + alternativa distinta -> 409 (conflicto de negocio), NUNCA 403', bizConflict.status === 409);
    check('8. DB: la fila de Q1 NO cambió (sigue con la alternativa original)',
      (await pg.query(`SELECT answer_option_id FROM student_response WHERE account_id=$1 AND question_version_id=$2`, [prem.accountId, U2.questions[1]!.qvId])).rows[0]?.answer_option_id === rowBefore.answer_option_id);
    check('8. DB: sigue habiendo exactamente 1 fila para (cuenta, Q1)',
      (await pg.query(`SELECT count(*)::int n FROM student_response WHERE account_id=$1 AND question_version_id=$2`, [prem.accountId, U2.questions[1]!.qvId])).rows[0].n === 1);

    console.log('--- 9. Scan estatico: el gate está tras replay+idempotencia de negocio y antes de responseRepo.create ---');
    const src = readFileSync(join(__dirname, '..', 'src', 'progress', 'progress.service.ts'), 'utf8');
    const iReplay = src.indexOf('findByOperationId(input.operationId)');
    const iBiz = src.indexOf('resolveAgainstExisting(existing');
    const iGate = src.indexOf('assertPremiumProgressWriteAllowed(accountId, topicId)');
    const iCreate = src.indexOf('this.responseRepo.create({');
    check('9. gate DESPUÉS del replay por operationId', iReplay !== -1 && iGate > iReplay);
    check('9. gate DESPUÉS de la idempotencia de negocio (resolveAgainstExisting)', iBiz !== -1 && iGate > iBiz);
    check('9. gate ANTES de responseRepo.create', iCreate !== -1 && iGate < iCreate);
    check('9. assertPremiumProgressWriteAllowed solo consulta el tier para PREMIUM_UNIT', /if \(klass !== 'PREMIUM_UNIT'\) return;[\s\S]{0,140}getEntitlement\(accountId\)/.test(src));
    // El único call-site vive entre la idempotencia de negocio y responseRepo.create
    // (ya verificado por iBiz < iGate < iCreate). Aquí: NO hay ningún otro.
    check('9. assertPremiumProgressWriteAllowed tiene EXACTAMENTE 1 call-site (la escritura nueva)',
      (src.match(/this\.assertPremiumProgressWriteAllowed\(/g) ?? []).length === 1);
    check('9. el único call-site está dentro de submitResponse (entre resolveAgainstExisting y responseRepo.create)',
      src.indexOf('this.assertPremiumProgressWriteAllowed(') > iBiz && src.indexOf('this.assertPremiumProgressWriteAllowed(') < iCreate);
  } finally {
    console.log('--- Limpieza (contenido publicado inmutable permanece; respuestas de prueba borradas; materia retirada) ---');
    for (const acc of accounts) {
      try { await setTier(acc, null); } catch { /* best-effort */ }
    }
    try {
      await pg.query(`DELETE FROM student_response WHERE account_id = ANY($1::uuid[])`, [accounts]);
      await pg.query(`DELETE FROM curriculum_topic_progress WHERE account_id = ANY($1::uuid[])`, [accounts]);
      await pg.query(
        `DELETE FROM outbox_event WHERE aggregate_id = ANY($1::uuid[]) OR payload->>'accountId' = ANY($2::text[])`,
        [accounts, accounts],
      );
      await pg.query(`UPDATE subject SET status='RETIRED', updated_at=now() WHERE id=$1`, [subjectId]);
    } catch (e) {
      console.error('  (limpieza parcial:', (e as Error).message, ')');
    }
  }

  await pg.end();
  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Premium/Progreso (PREMIUM V1, Capa 1, C1.4) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
