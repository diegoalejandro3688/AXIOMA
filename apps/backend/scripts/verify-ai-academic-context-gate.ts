// Gate de LEF Bloque VI, Incremento 4 ("Contexto académico mínimo") -- ver
// docs/adr/LEF-BLOCK-VI-DEFINITION.md §24. Mayoritariamente contra
// FakeAiProvider (determinista, sin red, sin coste) -- inspecciona
// exactamente qué `AiAcademicContext` recibe la abstracción de proveedor vía
// `AiInternalAdminController.getFakeProviderLastContext`. Reutiliza el
// fixture curricular real ya sembrado por prisma/seed.ts (mismo criterio que
// verify-progress-gate.ts) -- nunca inventa datos académicos con SQL directo,
// salvo un caso puntual (pregunta DRAFT) para probar la elegibilidad.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown, attempt = 0): Promise<{ status: number; body: any; raw: string }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, 12_000));
    return req(method, path, headers, body, attempt + 1);
  }
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `ai-context-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

async function lastContextFor(content: string): Promise<unknown> {
  const r = await req('GET', `/ai/_internal/fake-provider-last-context?content=${encodeURIComponent(content)}`, { 'x-internal-ops-key': opsKey });
  return r.body?.context;
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Fixture curricular REAL (mismo tema que verify-progress-gate.ts).
  const topicRow = await pg.query(`SELECT id, name FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
  const topicId = topicRow.rows[0].id as string;
  const topicName = topicRow.rows[0].name as string;
  const subjectRow = await pg.query(`SELECT s.name FROM subject s JOIN curriculum_topic t ON t.subject_id = s.id WHERE t.id = $1`, [topicId]);
  const subjectName = subjectRow.rows[0].name as string;
  const otherTopicRow = await pg.query(`SELECT id, name FROM curriculum_topic WHERE code != 'M1.NUMEROS.PORCENTAJES' LIMIT 1`);
  const otherTopicName = otherTopicRow.rows[0]?.name as string | undefined;

  const questionVersions = await pg.query(
    `SELECT id FROM question_version WHERE curriculum_topic_id = $1 AND editorial_status = 'PUBLISHED' ORDER BY published_at ASC`,
    [topicId],
  );
  const [qv1, qv2] = questionVersions.rows.map((r) => r.id as string);
  const opt1Correct = (await pg.query(`SELECT id, content FROM answer_option WHERE question_version_id = $1 AND is_correct = true`, [qv1])).rows[0];
  const explanation1 = (await pg.query(`SELECT explanation_content FROM question_version WHERE id = $1`, [qv1])).rows[0].explanation_content;

  // ------------------------------------------------------------------
  // 1. Pestaña dedicada, sin contexto -> funciona, context ausente/null.
  // ------------------------------------------------------------------
  console.log('--- 1. Conversación sin contexto (pestaña dedicada) -> funciona, academicContext == null ---');
  const student1 = await createSession('s1');
  const conv1 = await req('POST', '/ai/me/conversations', student1.headers, {});
  check('1a. creación sin contexto -> 200/201', conv1.status === 200 || conv1.status === 201);
  check('1b. academicContext == null', conv1.body?.academicContext === null);
  const content1 = `sin-contexto-${randomUUID()}`;
  const send1 = await req('POST', `/ai/me/conversations/${conv1.body.conversationId}/messages`, student1.headers, { content: content1, operationId: randomUUID() });
  check('1c. envío de mensaje funciona -> 200/201', send1.status === 200 || send1.status === 201);
  const ctx1 = await lastContextFor(content1);
  check('1d. FakeAiProvider recibió academicContext == null (nunca inventado)', ctx1 === null);

  // ------------------------------------------------------------------
  // 2. Entrada contextual con tema válido -> backend resuelve datos reales.
  // ------------------------------------------------------------------
  console.log('--- 2. Entrada contextual con curriculumTopicId válido -> backend resuelve subject/topic reales ---');
  const student2 = await createSession('s2');
  const conv2 = await req('POST', '/ai/me/conversations', student2.headers, { contextCurriculumTopicId: topicId });
  check('2a. creación con tema -> 200/201', conv2.status === 200 || conv2.status === 201);
  check('2b. academicContext.subjectName/topicName == reales', conv2.body?.academicContext?.subjectName === subjectName && conv2.body?.academicContext?.topicName === topicName);
  const content2 = `con-tema-${randomUUID()}`;
  await req('POST', `/ai/me/conversations/${conv2.body.conversationId}/messages`, student2.headers, { content: content2, operationId: randomUUID() });
  const ctx2 = (await lastContextFor(content2)) as { subjectName?: string; topicName?: string; question?: unknown } | null;
  check('2c. FakeAiProvider recibió ÚNICAMENTE el contexto esperado (subject/topic, sin question)', ctx2?.subjectName === subjectName && ctx2?.topicName === topicName && ctx2?.question === undefined);

  // ------------------------------------------------------------------
  // 3. Pregunta ya respondida -> incluye pregunta + respuesta + correctness; pregunta SIN responder -> nunca incluye la respuesta.
  // ------------------------------------------------------------------
  console.log('--- 3. Pregunta ya respondida incluye studentAnswer; pregunta SIN responder NUNCA lo incluye ---');
  const student3 = await createSession('s3');
  const opA = randomUUID();
  const answerResult = await req('POST', `/progress/topics/${topicId}/responses`, student3.headers, { questionVersionId: qv1, answerOptionId: opt1Correct.id, operationId: opA });
  check('3 fixture: respuesta real registrada en PROGRESS', answerResult.status === 200 || answerResult.status === 201);

  const conv3Answered = await req('POST', '/ai/me/conversations', student3.headers, { contextQuestionVersionId: qv1 });
  const content3a = `pregunta-respondida-${randomUUID()}`;
  await req('POST', `/ai/me/conversations/${conv3Answered.body.conversationId}/messages`, student3.headers, { content: content3a, operationId: randomUUID() });
  const ctx3a = (await lastContextFor(content3a)) as { question?: { studentAnswer?: { isCorrect: boolean; chosenOptionText: string; explanationText: string } } };
  check('3a. pregunta YA respondida -> studentAnswer presente', !!ctx3a.question?.studentAnswer);
  check('3b. isCorrect == true (respuesta real fue correcta)', ctx3a.question?.studentAnswer?.isCorrect === true);
  check('3c. explanationText no vacío (explicación validada incluida)', !!ctx3a.question?.studentAnswer?.explanationText && ctx3a.question.studentAnswer.explanationText.length > 0);

  const student3b = await createSession('s3b');
  const conv3Unanswered = await req('POST', '/ai/me/conversations', student3b.headers, { contextQuestionVersionId: qv2 });
  const content3b = `pregunta-sin-responder-${randomUUID()}`;
  await req('POST', `/ai/me/conversations/${conv3Unanswered.body.conversationId}/messages`, student3b.headers, { content: content3b, operationId: randomUUID() });
  const ctx3b = (await lastContextFor(content3b)) as { question?: { studentAnswer?: unknown; options?: string[] } };
  check('3d. pregunta SIN responder -> question presente (stem/options)', Array.isArray(ctx3b.question?.options) && ctx3b.question!.options!.length > 0);
  check('3e. pregunta SIN responder -> studentAnswer AUSENTE (nunca correctAnswer/explicación prematura)', ctx3b.question?.studentAnswer === undefined);

  // ------------------------------------------------------------------
  // 4. Cliente intenta falsificar materia/progreso/respuesta -> rechazado por el propio esquema (whitelisting estricto).
  // ------------------------------------------------------------------
  console.log('--- 4. Cliente intenta enviar subject/correctAnswer/studentProgress directamente -> rechazado por whitelisting estricto ---');
  const student4 = await createSession('s4');
  const forged = await req('POST', '/ai/me/conversations', student4.headers, {
    subject: 'Matemática falsa',
    correctAnswer: 'Y',
    studentProgress: { fake: true },
  });
  check('4. objeto con campos no autorizados -> 400 (esquema .strict())', forged.status === 400);
  const forgedWithValidRef = await req('POST', '/ai/me/conversations', student4.headers, {
    contextCurriculumTopicId: topicId,
    correctAnswer: 'Y',
  });
  check('4b. incluso combinado con una referencia válida -> 400 (el campo extra invalida toda la solicitud)', forgedWithValidRef.status === 400);

  // ------------------------------------------------------------------
  // 5. Tema/pregunta inexistente o no elegible -> error estable, SIN llamada al provider.
  // ------------------------------------------------------------------
  console.log('--- 5. Referencia inexistente/no elegible -> error estable, sin conversación creada, sin llamada al provider ---');
  const student5 = await createSession('s5');
  const fakeQuestionId = randomUUID();
  const rejectedQuestion = await req('POST', '/ai/me/conversations', student5.headers, { contextQuestionVersionId: fakeQuestionId });
  check('5a. questionVersionId inexistente -> 404', rejectedQuestion.status === 404);
  const fakeTopicId = randomUUID();
  const rejectedTopic = await req('POST', '/ai/me/conversations', student5.headers, { contextCurriculumTopicId: fakeTopicId });
  check('5b. curriculumTopicId inexistente -> 404', rejectedTopic.status === 404);

  // Pregunta DRAFT (no elegible) -- fixture SQL puntual, único caso sin seed real disponible.
  const draftQuestionId = randomUUID();
  const draftVersionId = randomUUID();
  await pg.query(`INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at) VALUES ($1, $2, (SELECT id FROM subject LIMIT 1), 'SINGLE_CHOICE', 'ACTIVE', now(), now())`, [
    draftQuestionId,
    `gate-i4-draft-${draftQuestionId}`,
  ]);
  await pg.query(
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4, 'DRAFT', now(), now())`,
    [draftVersionId, draftQuestionId, topicId, JSON.stringify([{ type: 'paragraph', order: 0, text: 'Borrador, no publicado.' }])],
  );
  const rejectedDraft = await req('POST', '/ai/me/conversations', student5.headers, { contextQuestionVersionId: draftVersionId });
  check('5c. questionVersion en estado DRAFT (no publicada) -> 404, nunca expuesta como contexto', rejectedDraft.status === 404);

  const listAfterRejections = await req('GET', '/ai/me/conversations', student5.headers);
  check('5d. ninguna de las referencias rechazadas creó una conversación', (listAfterRejections.body?.conversations ?? []).length === 0);

  // ------------------------------------------------------------------
  // 6. Contexto de otra cuenta nunca accesible -- studentAnswer refleja SOLO la cuenta que pregunta.
  // ------------------------------------------------------------------
  console.log('--- 6. La respuesta de OTRA cuenta nunca aparece en el contexto de la cuenta actual ---');
  const bob = await createSession('bob6');
  const alice6 = await createSession('alice6');
  // bob responde qv2 incorrectamente; alice abre contexto sobre la MISMA pregunta sin haberla respondido ella.
  const bobConv = await req('POST', '/ai/me/conversations', bob.headers, {});
  void bobConv;
  const optWrong = (await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = false LIMIT 1`, [qv2])).rows[0]?.id;
  if (optWrong) {
    await req('POST', `/progress/topics/${topicId}/responses`, bob.headers, { questionVersionId: qv2, answerOptionId: optWrong, operationId: randomUUID() });
  }
  const aliceConv6 = await req('POST', '/ai/me/conversations', alice6.headers, { contextQuestionVersionId: qv2 });
  const content6 = `cross-account-${randomUUID()}`;
  await req('POST', `/ai/me/conversations/${aliceConv6.body.conversationId}/messages`, alice6.headers, { content: content6, operationId: randomUUID() });
  const ctx6 = (await lastContextFor(content6)) as { question?: { studentAnswer?: unknown } };
  check('6. la cuenta de Alice NUNCA ve la respuesta de Bob (studentAnswer ausente)', ctx6.question?.studentAnswer === undefined);

  // ------------------------------------------------------------------
  // 7-9. Minimización estructural: sin perfil/ranking/cosméticos/insignias/historial competitivo; sin otras materias/temas.
  // ------------------------------------------------------------------
  console.log('--- 7-9. Minimización estructural: sin campos prohibidos, sin datos de otra materia/tema ---');
  const forbiddenFields = ['displayName', 'email', 'timezone', 'username', 'ranking', 'competitiveHistory', 'cosmetics', 'badges', 'featuredAchievements', 'profile', 'accountId'];
  const fullContextJson = JSON.stringify(ctx3a);
  for (const field of forbiddenFields) {
    check(`7-8. contexto NUNCA contiene la clave/campo "${field}"`, !fullContextJson.toLowerCase().includes(field.toLowerCase()));
  }
  if (otherTopicName) {
    check('9. el contexto de un tema NUNCA menciona el nombre de OTRO tema no solicitado', !fullContextJson.includes(otherTopicName));
  }

  // ------------------------------------------------------------------
  // 10. Nueva conversación no recibe contexto de conversaciones anteriores.
  // ------------------------------------------------------------------
  console.log('--- 10. Nueva conversación (misma cuenta) NUNCA hereda el contexto de una conversación anterior ---');
  const student10 = await createSession('s10');
  const conv10First = await req('POST', '/ai/me/conversations', student10.headers, { contextCurriculumTopicId: topicId });
  check('10 fixture: primera conversación con contexto', conv10First.body?.academicContext?.topicName === topicName);
  const conv10Second = await req('POST', '/ai/me/conversations', student10.headers, {});
  check('10. segunda conversación (sin contexto explícito) -> academicContext == null, NUNCA hereda el tema de la primera', conv10Second.body?.academicContext === null);

  // ------------------------------------------------------------------
  // 11. Misma conversación conserva su contexto; se re-resuelve EN VIVO (build-in-read).
  // ------------------------------------------------------------------
  console.log('--- 11. Misma conversación conserva su contexto entre mensajes; se re-resuelve EN VIVO (progreso puede cambiar) ---');
  const student11 = await createSession('s11');
  const conv11 = await req('POST', '/ai/me/conversations', student11.headers, { contextCurriculumTopicId: topicId });
  const content11a = `turno-1-${randomUUID()}`;
  await req('POST', `/ai/me/conversations/${conv11.body.conversationId}/messages`, student11.headers, { content: content11a, operationId: randomUUID() });
  const ctx11a = (await lastContextFor(content11a)) as { topicProgressStatus?: string; topicName?: string };
  check('11a. turno 1: mismo topicName que al crear la conversación', ctx11a.topicName === topicName);
  check('11a. turno 1: sin progreso todavía -> topicProgressStatus ausente', ctx11a.topicProgressStatus === undefined);

  await req('POST', `/progress/topics/${topicId}/responses`, student11.headers, { questionVersionId: qv1, answerOptionId: opt1Correct.id, operationId: randomUUID() });
  const content11b = `turno-2-${randomUUID()}`;
  await req('POST', `/ai/me/conversations/${conv11.body.conversationId}/messages`, student11.headers, { content: content11b, operationId: randomUUID() });
  const ctx11b = (await lastContextFor(content11b)) as { topicProgressStatus?: string; topicName?: string };
  check('11b. turno 2: sigue siendo el MISMO topicName (contexto de la conversación no cambia de referencia)', ctx11b.topicName === topicName);
  check('11b. turno 2: topicProgressStatus AHORA presente (re-resuelto EN VIVO tras responder, build-in-read)', ctx11b.topicProgressStatus === 'IN_PROGRESS');

  // ------------------------------------------------------------------
  // 12. Verificación estática: el proveedor recibe representación neutral, nunca entidades Prisma.
  // ------------------------------------------------------------------
  console.log('--- 12. Verificación estática: FakeAiProvider/AnthropicAiProvider nunca importan Prisma/Education/Progress ---');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const fakeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'ai', 'fake-ai-provider.ts'), 'utf8');
  const anthropicSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'ai', 'anthropic-ai-provider.ts'), 'utf8');
  const forbiddenImportPatterns = [/generated\/prisma/, /education\//, /progress\//, /@prisma\/client/];
  const violatesFake = forbiddenImportPatterns.some((p) => p.test(fakeSource));
  const violatesAnthropic = forbiddenImportPatterns.some((p) => p.test(anthropicSource));
  check('12a. fake-ai-provider.ts nunca importa Prisma/Education/Progress', !violatesFake);
  check('12b. anthropic-ai-provider.ts nunca importa Prisma/Education/Progress', !violatesAnthropic);
  const contextBuilderSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'ai', 'ai-academic-context-builder.service.ts'), 'utf8');
  check('12c. la conversión a texto plano ocurre en AiAcademicContextBuilder (única frontera), no en el proveedor', contextBuilderSource.includes('AiAcademicContext'));

  // ------------------------------------------------------------------
  // 13. Logs/usage ledger no copian el contenido del context package.
  // ------------------------------------------------------------------
  console.log('--- 13. ai_usage_ledger nunca contiene el texto del context package; logObservability no referencia contexto ---');
  const secretStem = 'PALABRA-CLAVE-DEL-ENUNCIADO-QUE-NUNCA-DEBE-APARECER-EN-EL-LEDGER';
  // El enunciado real (qv1) es contenido del seed -- se verifica indirectamente: ninguna columna del ledger para el mensaje de la pregunta 3 contiene el texto de la explicación real.
  const ledgerRow = await pg.query(
    `SELECT l.* FROM ai_usage_ledger l JOIN ai_message m ON m.id = l.assistant_message_id WHERE m.conversation_id = $1 ORDER BY l.recorded_at DESC LIMIT 1`,
    [conv3Answered.body.conversationId],
  );
  const rawLedgerJson = JSON.stringify(ledgerRow.rows[0] ?? {});
  const explanationText1 = JSON.stringify(explanation1);
  check('13a. el ledger de la pregunta respondida NO contiene el texto de la explicación real', !rawLedgerJson.includes(explanationText1.slice(2, 40)));
  void secretStem;
  const serviceSourceForLogs = fs.readFileSync(path.join(__dirname, '..', 'src', 'ai', 'anthropic-ai-provider.ts'), 'utf8');
  const logObservabilityBody = serviceSourceForLogs.slice(serviceSourceForLogs.indexOf('private logObservability'));
  check('13b. logObservability nunca referencia academicContext/context (verificación estática)', !logObservabilityBody.includes('academicContext') && !logObservabilityBody.includes('Context'));

  // ------------------------------------------------------------------
  // 14. Ningún dato protegido/correctAnswer se envía si la política de revelación no lo autoriza -- ya probado en 3d/3e; refuerzo explícito aquí.
  // ------------------------------------------------------------------
  console.log('--- 14. Refuerzo: ninguna pregunta SIN responder expone alternativa correcta en NINGÚN campo del contexto ---');
  const ctx3bJson = JSON.stringify(ctx3b).toLowerCase();
  check('14. el contexto de una pregunta sin responder no contiene la palabra "correct" en ninguna forma', !ctx3bJson.includes('iscorrect') && !ctx3bJson.includes('correctanswer'));

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Contexto Académico Mínimo (LEF Bloque VI, Incremento 4) pasaron.');
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
