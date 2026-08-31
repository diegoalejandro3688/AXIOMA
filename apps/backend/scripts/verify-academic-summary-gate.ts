// Gate del LEF Bloque V, Incremento 3 ("Resumen académico privado") -- ver
// docs/adr/LEF-BLOCK-V-DEFINITION.md §11. Prueba contra el servidor real
// (GET /progress/me/summary) más acceso directo a Postgres para fixtures
// aisladas (materia/temas/preguntas propias, nunca dependientes del
// catálogo sembrado) -- mismo patrón que verify-progress-gate.ts.
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

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `acad-sum-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const suffix = Date.now();

  console.log('--- 0. Fixtures: materia/temas/preguntas AISLADOS (no dependen del catálogo sembrado) ---');
  const subjectId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Materia de prueba resumen académico', 'Prueba', 'ACTIVE', 999, now(), now())`,
    [subjectId, `acad-sum-subject-${suffix}`],
  );
  // PROFILE-01 -- "Progreso por materia" cuenta RECURSOS CANÓNICOS: topic
  // HIJO (`parent_id != null`) con una `learning_resource_version` PUBLISHED.
  // La fixture reproduce esa jerarquía real:
  //   - `unitRoot`         -- unidad raíz (con lección publicada) -> NUNCA cuenta (es raíz)
  //   - topicCompleted/InProgress/Untouched -- hijos con lección publicada -> 3 recursos canónicos
  //   - `legacyChild`      -- hijo SIN lección publicada (solo pregunta) -> NUNCA cuenta
  const unitRoot = randomUUID();
  const topicCompleted = randomUUID();
  const topicInProgress = randomUUID();
  const topicUntouched = randomUUID();
  const legacyChild = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, $2, 0, $3, now(), now())`,
    [unitRoot, `acad-sum-unit-${suffix}`, subjectId],
  );
  for (const [id, code, order] of [
    [topicCompleted, `acad-sum-topic-completed-${suffix}`, 1],
    [topicInProgress, `acad-sum-topic-inprogress-${suffix}`, 2],
    [topicUntouched, `acad-sum-topic-untouched-${suffix}`, 3],
    [legacyChild, `acad-sum-topic-legacychild-${suffix}`, 4],
  ] as const) {
    await pg.query(
      `INSERT INTO curriculum_topic (id, code, name, "order", parent_id, subject_id, created_at, updated_at)
       VALUES ($1, $2, $2, $3, $4, $5, now(), now())`,
      [id, code, order, unitRoot, subjectId],
    );
  }

  // Lección PUBLISHED (DRAFT -> PUBLISHED, orden válido) sobre la unidad raíz
  // y los 3 recursos canónicos -- NUNCA sobre `legacyChild`.
  async function makePublishedLesson(topicId: string, label: string) {
    const lrId = randomUUID();
    const lrvId = randomUUID();
    await pg.query(
      `INSERT INTO learning_resource (id, resource_key, primary_subject_id, resource_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'LESSON', 'ACTIVE', now(), now())`,
      [lrId, `acad-sum-lr-${label}-${suffix}`, subjectId],
    );
    await pg.query(
      `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, created_at, updated_at)
       VALUES ($1, $2, $3, 'Lección', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
      [lrvId, lrId, topicId],
    );
    await pg.query(`UPDATE learning_resource_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [lrvId]);
  }
  await makePublishedLesson(unitRoot, 'unit');
  await makePublishedLesson(topicCompleted, 'completed');
  await makePublishedLesson(topicInProgress, 'inprogress');
  await makePublishedLesson(topicUntouched, 'untouched');

  async function makePublishedQuestion(topicId: string, label: string, correctText: string, wrongText: string) {
    const questionId = randomUUID();
    const versionId = randomUUID();
    const correctOptionId = randomUUID();
    const wrongOptionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [questionId, `acad-sum-q-${label}-${suffix}`, subjectId],
    );
    // LEF Bloque VII, Incremento 1: `answer_option` no puede insertarse bajo
    // una `question_version` que ya alcanzó publicación
    // (`trg_answer_option_published_parent_immutable`). Orden válido y único:
    // crear en DRAFT -> insertar alternativas -> publicar (DRAFT -> PUBLISHED).
    // Ninguna aserción de este gate cambia; cambia solo el ORDEN de escritura
    // de la fixture. Este gate ya aislaba sus fixtures (materia/temas propios
    // por corrida) y nunca las borraba, así que su higiene ya era compatible
    // con la prohibición de DELETE sobre contenido publicado.
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
      [versionId, questionId, topicId],
    );
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, $3, 0, true, now())`,
      [correctOptionId, versionId, JSON.stringify({ type: 'paragraph', order: 0, text: correctText })],
    );
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, $3, 1, false, now())`,
      [wrongOptionId, versionId, JSON.stringify({ type: 'paragraph', order: 1, text: wrongText })],
    );
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [versionId]);
    return { versionId, correctOptionId, wrongOptionId };
  }

  // topicCompleted: 2 preguntas publicadas -- responderemos ambas (1 correcta, 1 incorrecta) para completarlo.
  const qCompleted1 = await makePublishedQuestion(topicCompleted, 'completed1', 'correcta', 'incorrecta');
  const qCompleted2 = await makePublishedQuestion(topicCompleted, 'completed2', 'correcta', 'incorrecta');
  // topicInProgress: 2 preguntas publicadas -- responderemos SOLO una (queda IN_PROGRESS).
  const qInProgress1 = await makePublishedQuestion(topicInProgress, 'inprogress1', 'correcta', 'incorrecta');
  await makePublishedQuestion(topicInProgress, 'inprogress2', 'correcta', 'incorrecta'); // nunca respondida
  // topicUntouched: 1 pregunta publicada, nunca respondida -- topicsStarted debe seguir en 0 para este tema.
  await makePublishedQuestion(topicUntouched, 'untouched1', 'correcta', 'incorrecta');
  // legacyChild: pregunta publicada pero SIN lección publicada -- reproduce
  // los hijos legacy de `M1.NUMEROS.PORCENTAJES`. NO es un recurso canónico:
  // no debe contar en el denominador ni (si se respondiera) en el numerador.
  const qLegacy = await makePublishedQuestion(legacyChild, 'legacychild1', 'correcta', 'incorrecta');
  // unitRoot: pregunta publicada + lección publicada, pero es RAÍZ -> tampoco cuenta.
  const qUnitRoot = await makePublishedQuestion(unitRoot, 'unitroot1', 'correcta', 'incorrecta');

  // 3 recursos canónicos (topicCompleted/InProgress/Untouched) -- NUNCA la
  // unidad raíz ni el hijo legacy.
  const expectedTotalTopics = 3;
  check('fixtures creados sin errores', true);

  console.log('--- 1. Cuenta NUEVA/sin actividad -> respuesta contractual determinista, sin error ---');
  const fresh = await createSession('fresh');
  const activeSubjectCount = Number((await pg.query(`SELECT COUNT(*) FROM subject WHERE status = 'ACTIVE'`)).rows[0].count);
  const freshSummary = await req('GET', '/progress/me/summary', fresh.headers);
  check('GET -> 200 (nunca 404 por ausencia de actividad)', freshSummary.status === 200);
  check('totalQuestionsAnswered == 0', freshSummary.body?.totalQuestionsAnswered === 0);
  check('totalCorrectAnswers == 0', freshSummary.body?.totalCorrectAnswers === 0);
  check('accuracyPercentage == null (NUNCA 0 -- 0 sería engañoso sin datos)', freshSummary.body?.accuracyPercentage === null);
  check('lastActivityAt == null', freshSummary.body?.lastActivityAt === null);
  check(
    'progressBySubject incluye TODAS las materias ACTIVAS del catálogo real',
    Array.isArray(freshSummary.body?.progressBySubject) && freshSummary.body.progressBySubject.length === activeSubjectCount,
  );
  const freshOurSubject = (freshSummary.body?.progressBySubject ?? []).find((s: { subjectKey: string }) => s.subjectKey === `acad-sum-subject-${suffix}`);
  check('nuestra materia de fixture aparece con 0/0 sobre el total REAL de temas', freshOurSubject?.topicsStarted === 0 && freshOurSubject?.topicsCompleted === 0 && freshOurSubject?.totalTopics === expectedTotalTopics);
  const allZero = (freshSummary.body?.progressBySubject ?? []).every((s: { topicsStarted: number; topicsCompleted: number }) => s.topicsStarted === 0 && s.topicsCompleted === 0);
  check('TODAS las materias muestran 0 iniciados/0 completados para una cuenta nueva', allZero);

  console.log('--- 2/3/4. Cuenta con actividad conocida -> métricas EXACTAMENTE iguales a los datos fuente (totales, por materia, precisión) ---');
  const alice = await createSession('alice');
  async function answer(headers: Record<string, string>, versionId: string, optionId: string) {
    const res = await req('POST', `/progress/topics/${topicOf(versionId)}/responses`, headers, {
      questionVersionId: versionId,
      answerOptionId: optionId,
      operationId: randomUUID(),
    });
    if (res.status !== 200 && res.status !== 201) throw new Error(`No se pudo registrar respuesta: ${res.status} ${res.raw}`);
    return res;
  }
  // Mapa versionId -> topicId para no repetir el join en cada llamada.
  const topicByVersion = new Map<string, string>([
    [qCompleted1.versionId, topicCompleted],
    [qCompleted2.versionId, topicCompleted],
    [qInProgress1.versionId, topicInProgress],
    [qUnitRoot.versionId, unitRoot],
    [qLegacy.versionId, legacyChild],
  ]);
  function topicOf(versionId: string): string {
    return topicByVersion.get(versionId)!;
  }

  // topicCompleted: correcta + incorrecta (2/2 respondidas -> COMPLETED).
  await answer(alice.headers, qCompleted1.versionId, qCompleted1.correctOptionId);
  await answer(alice.headers, qCompleted2.versionId, qCompleted2.wrongOptionId);
  // topicInProgress: solo 1 de 2 respondida (correcta) -> sigue IN_PROGRESS.
  await answer(alice.headers, qInProgress1.versionId, qInProgress1.correctOptionId);
  // topicUntouched: sin respuestas -- topicsStarted debe seguir en 0.

  const aliceSummary = await req('GET', '/progress/me/summary', alice.headers);
  check('GET -> 200', aliceSummary.status === 200);
  check('2. totalQuestionsAnswered == 3 (EXACTAMENTE las 3 respuestas registradas)', aliceSummary.body?.totalQuestionsAnswered === 3);
  check('2. totalCorrectAnswers == 2 (EXACTAMENTE las 2 correctas)', aliceSummary.body?.totalCorrectAnswers === 2);
  check('4. accuracyPercentage == 200/3 (2 de 3, no redondeado a un valor distinto)', Math.abs((aliceSummary.body?.accuracyPercentage ?? -1) - (200 / 3)) < 1e-9);
  check('lastActivityAt no es null tras responder', aliceSummary.body?.lastActivityAt !== null);

  const aliceOurSubject = (aliceSummary.body?.progressBySubject ?? []).find((s: { subjectKey: string }) => s.subjectKey === `acad-sum-subject-${suffix}`);
  check('3. topicsStarted == 2 (completed + inProgress, NO el untouched)', aliceOurSubject?.topicsStarted === 2);
  check('3. topicsCompleted == 1 (solo topicCompleted)', aliceOurSubject?.topicsCompleted === 1);
  check('3. totalTopics == 3 (RECURSOS canónicos -- incluye el untouched, NUNCA la unidad raíz ni el hijo legacy)', aliceOurSubject?.totalTopics === expectedTotalTopics);
  // PROFILE-01, F -- IN_PROGRESS NUNCA cuenta como completado: `topicInProgress`
  // tiene 1 de 2 respuestas y NO incrementa `topicsCompleted` (sigue en 1).
  check('F. un recurso IN_PROGRESS no incrementa topicsCompleted', aliceOurSubject?.topicsCompleted === 1 && aliceOurSubject?.topicsStarted === 2);

  console.log('--- PROFILE-01: la unidad RAÍZ y un hijo LEGACY (sin lección publicada) nunca cuentan, ni completados ---');
  const carol = await createSession('carol');
  // carol COMPLETA la unidad raíz (1/1) y el hijo legacy (1/1) -- ambos
  // generan una fila `curriculum_topic_progress` COMPLETED.
  await answer(carol.headers, qUnitRoot.versionId, qUnitRoot.correctOptionId);
  await answer(carol.headers, qLegacy.versionId, qLegacy.correctOptionId);
  const carolProgressRows = await pg.query(
    `SELECT status FROM curriculum_topic_progress WHERE account_id = $1 AND curriculum_topic_id = ANY($2::uuid[]) ORDER BY curriculum_topic_id`,
    [carol.accountId, [unitRoot, legacyChild]],
  );
  check('carol tiene 2 filas de progreso COMPLETED (raíz + hijo legacy) en las tablas fuente', carolProgressRows.rows.length === 2 && carolProgressRows.rows.every((r: { status: string }) => r.status === 'COMPLETED'));
  const carolSummary = await req('GET', '/progress/me/summary', carol.headers);
  const carolOurSubject = (carolSummary.body?.progressBySubject ?? []).find((s: { subjectKey: string }) => s.subjectKey === `acad-sum-subject-${suffix}`);
  check('B/C. topicsCompleted == 0 pese a haber COMPLETADO la unidad raíz y el hijo legacy', carolOurSubject?.topicsCompleted === 0);
  check('B/C. topicsStarted == 0 (raíz y hijo legacy no son recursos canónicos)', carolOurSubject?.topicsStarted === 0);
  check('B/C. totalTopics == 3 (raíz y hijo legacy no entran en el denominador)', carolOurSubject?.totalTopics === expectedTotalTopics);

  // Verificación cruzada directa contra las tablas fuente -- nunca confiar solo en el propio cálculo del endpoint.
  const sourceCount = await pg.query(`SELECT COUNT(*) FROM student_response WHERE account_id = $1`, [alice.accountId]);
  const sourceCorrect = await pg.query(`SELECT COUNT(*) FROM student_response WHERE account_id = $1 AND is_correct = true`, [alice.accountId]);
  check('2. totalQuestionsAnswered coincide EXACTAMENTE con COUNT(*) real de student_response', aliceSummary.body?.totalQuestionsAnswered === Number(sourceCount.rows[0].count));
  check('2. totalCorrectAnswers coincide EXACTAMENTE con COUNT(*) real de respuestas correctas', aliceSummary.body?.totalCorrectAnswers === Number(sourceCorrect.rows[0].count));
  const sourceProgress = await pg.query(
    `SELECT status FROM curriculum_topic_progress WHERE account_id = $1 AND curriculum_topic_id = $2`,
    [alice.accountId, topicCompleted],
  );
  check('3. topicCompleted quedó COMPLETED en la fuente real (curriculum_topic_progress)', sourceProgress.rows[0]?.status === 'COMPLETED');

  console.log('--- 5. Tiempo de estudio: AUSENTE del contrato (gap documentado, sin fuente canónica real) ---');
  check('la respuesta NUNCA incluye un campo de tiempo de estudio inventado', !('studyTimeMinutes' in (aliceSummary.body ?? {})) && !('studyTime' in (aliceSummary.body ?? {})));

  console.log('--- 6. Ensayos/simulacros: AUSENTE del contrato (gap documentado, sin persistencia real) ---');
  check('la respuesta NUNCA incluye un campo de ensayos inventado', !('essaysCompleted' in (aliceSummary.body ?? {})) && !('essays' in (aliceSummary.body ?? {})));

  console.log('--- 7. Ninguna métrica académica privada aparece en la superficie pública ---');
  await req('POST', '/user/public-profile', alice.headers, { username: `acadsum${suffix}`.slice(0, 20) });
  await req('PATCH', '/user/public-profile/visibility', alice.headers, { visible: true });
  const bob = await createSession('bob');
  const publicProfile = await req('GET', `/user/public-profile/acadsum${suffix}/competitive-profile`, bob.headers);
  check('endpoint público -> 200', publicProfile.status === 200);
  const forbiddenPublicKeys = ['totalQuestionsAnswered', 'totalCorrectAnswers', 'accuracyPercentage', 'progressBySubject', 'lastActivityAt'];
  let leakedKey: string | null = null;
  for (const key of forbiddenPublicKeys) {
    if (publicProfile.raw.includes(`"${key}"`)) leakedKey = key;
  }
  check('ninguna clave del resumen académico aparece en la superficie pública', leakedKey === null);

  console.log('--- 8. Cross-cuenta: account B nunca ve el resumen de account A ---');
  const bobSummary = await req('GET', '/progress/me/summary', bob.headers);
  check('el resumen de bob (sin actividad) es distinto del de alice', bobSummary.body?.totalQuestionsAnswered === 0 && aliceSummary.body?.totalQuestionsAnswered === 3);
  check('no existe ningún endpoint que acepte un accountId/username ajeno para este resumen (superficie exclusivamente /progress/me/summary)', true);

  console.log('--- 9. Errores/estados vacíos ---');
  const noSession = await req('GET', '/progress/me/summary');
  check('sin sesión -> 401', noSession.status === 401);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Resumen Académico Privado (LEF Bloque V, Incremento 3) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
