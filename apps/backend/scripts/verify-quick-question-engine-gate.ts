// Gate del Bloque IV, Incremento 4, sub-incremento 4.b ("Motor de sesión de
// Pregunta rápida") -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.2-13.3.
// Sin HTTP todavía (4.c) -- gate directo contra QuickQuestionService, mismo
// criterio que verify-competitive-profile-foundation-gate.ts (3.a).
// Precisiones obligatorias del Product Owner verificadas aquí: sesión ACTIVE
// única por cuenta bajo concurrencia real, ownership cross-account,
// exclusión mutua compartida next/answer/close dentro del mismo tx,
// idempotencia de replay vs. conflicto controlado entre operationId
// distintos, NO_QUESTIONS_AVAILABLE, publicación best-effort post-commit
// con evidencia de que un fallo no revierte ni duplica nada.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { OutboxService } from '../src/platform/outbox/outbox.service';
import { OutboxEventRepository } from '../src/platform/outbox/outbox-event.repository';
import { QuestionVersionRepository } from '../src/education/question-version.repository';
import { AnswerOptionRepository } from '../src/education/answer-option.repository';
import { QuickQuestionSessionRepository } from '../src/gamification/quick-question-session.repository';
import { QuickQuestionAttemptRepository } from '../src/gamification/quick-question-attempt.repository';
import { QuickQuestionService, QUICK_QUESTION_TIME_LIMIT_MS } from '../src/gamification/quick-question.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function settled<T>(promises: Promise<T>[]): Promise<PromiseSettledResult<T>[]> {
  return Promise.allSettled(promises);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const config = new ConfigService();
  const outboxRepo = new OutboxEventRepository(prisma);
  const outbox = new OutboxService(outboxRepo, config);

  const questionVersionRepo = new QuestionVersionRepository(prisma);
  const answerOptionRepo = new AnswerOptionRepository(prisma);
  const sessionRepo = new QuickQuestionSessionRepository(prisma);
  const attemptRepo = new QuickQuestionAttemptRepository(prisma);
  const service = new QuickQuestionService(prisma, outbox, sessionRepo, attemptRepo, questionVersionRepo, answerOptionRepo);

  const suffix = Date.now();

  console.log('--- 0. Fixtures: QuestionVersion/AnswerOption publicadas (mismo criterio que verify-quick-question-foundation-gate) ---');
  const topicRow = await pg.query(`SELECT id, subject_id FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
  if (topicRow.rowCount === 0) throw new Error('Fixture de currículo no encontrada -- ¿seed ejecutado?');
  const subjectId = topicRow.rows[0].subject_id as string;

  // LEF Bloque VII, Incremento 1 -- higiene compatible con producción: las
  // fixtures publicadas ya no pueden borrarse (invariante 3), así que cuelgan
  // de un tema PROPIO y ÚNICO por corrida en vez del tema sembrado. El
  // catálogo compartido queda intacto.
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema aislado del gate de Pregunta rápida (4.b)', 904, $3, now(), now())`,
    [topicId, `GATE.QQE.TOPIC.${suffix}-${Math.random().toString(36).slice(2, 8)}`, subjectId],
  );

  async function makePublishedQuestion(): Promise<{ questionVersionId: string; answerOptionId: string }> {
    const questionId = randomUUID();
    const questionVersionId = randomUUID();
    const answerOptionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [questionId, `GATE.QQE.${randomUUID()}`, subjectId],
    );
    // Orden válido y único desde LEF Bloque VII, Incremento 1: DRAFT ->
    // alternativas -> publicar.
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
      [questionVersionId, questionId, topicId],
    );
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"x"}', 0, true, now())`,
      [answerOptionId, questionVersionId],
    );
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [questionVersionId]);
    return { questionVersionId, answerOptionId };
  }

  /**
   * Aísla el universo ELEGIBLE de UNA sesión concreta sin tocar el catálogo
   * editorial.
   *
   * LEF Bloque VII, Incremento 1 -- sustituye la estrategia histórica de este
   * gate, que despublicaba TEMPORALMENTE toda otra `question_version`
   * (`UPDATE ... SET editorial_status='DEPRECATED'`) y la restauraba a
   * `PUBLISHED` en la limpieza. Esa maniobra es hoy irrepresentable y quedaría
   * prohibida en dos puntos independientes: `DEPRECATED` es TERMINAL en V1
   * (no existe `DEPRECATED -> PUBLISHED`, §8.4), y despublicar contenido
   * sembrado sería además un efecto permanente sobre el catálogo real.
   *
   * El reemplazo usa el mecanismo que el propio incremento 4.b define
   * (§13.2): la elegibilidad excluye toda pregunta ya intentada EN ESA SESIÓN.
   * Registrar intentos previos de la sesión de prueba deja exactamente las
   * fixtures deseadas como elegibles, es estrictamente local a la sesión del
   * gate, no toca ninguna fila de contenido y se limpia con el mismo
   * `DELETE FROM quick_question_attempt` que este gate ya hacía.
   *
   * Devuelve cuántos intentos de exclusión insertó, para que las aserciones de
   * conteo por sesión sigan siendo EXACTAS.
   */
  async function isolateEligibleUniverse(sessionId: string, accountId: string, keepIds: string[]): Promise<number> {
    const inserted = await pg.query(
      `INSERT INTO quick_question_attempt (id, session_id, account_id, question_version_id, answer_option_id, is_correct, presented_at, responded_at, operation_id, created_at)
       SELECT gen_random_uuid(), $1, $2, qv."id",
              COALESCE(
                (SELECT ao."id" FROM answer_option ao WHERE ao."question_version_id" = qv."id" LIMIT 1),
                (SELECT ao2."id" FROM answer_option ao2 LIMIT 1)
              ),
              false, now(), now(), gen_random_uuid(), now()
         FROM question_version qv
        WHERE qv."editorial_status" = 'PUBLISHED'
          AND qv."id" <> ALL($3::uuid[])`,
      [sessionId, accountId, keepIds],
    );
    return inserted.rowCount ?? 0;
  }

  // La selección es aleatoria sobre TODO el catálogo PUBLISHED (§13.2, sin
  // scope por fixture) -- el catálogo real de la base (seed + fixtures de
  // otros gates) puede tener muchas más preguntas que las creadas aquí, así
  // que la pregunta pendiente NUNCA se asume por identidad; se resuelve
  // siempre su alternativa real por consulta directa.
  async function answerOptionForQuestion(questionVersionId: string): Promise<string> {
    const row = await pg.query('SELECT id FROM answer_option WHERE question_version_id = $1 LIMIT 1', [questionVersionId]);
    if (row.rowCount === 0) throw new Error(`Sin AnswerOption para questionVersionId=${questionVersionId}`);
    return row.rows[0].id as string;
  }

  const trackedQuestionIds: string[] = [];
  const trackedSessionIds: string[] = [];

  console.log('--- 1. openSession: creación, idempotencia rápida sin concurrencia ---');
  const accountAlice = randomUUID();
  const open1 = await service.openSession(accountAlice);
  trackedSessionIds.push(open1.session.id);
  check('primera apertura -> created=true', open1.created === true);
  check('nace ACTIVE', open1.session.status === 'ACTIVE');

  const open2 = await service.openSession(accountAlice);
  check('segunda apertura (misma cuenta, sin serializar) -> created=false', open2.created === false);
  check('devuelve LA MISMA sesión', open2.session.id === open1.session.id);

  console.log('--- 2. Precisión #1: apertura CONCURRENTE de sesión -- una sola ACTIVE por cuenta bajo carrera real ---');
  const accountBob = randomUUID();
  const concurrentOpens = await Promise.all(Array.from({ length: 5 }, () => service.openSession(accountBob)));
  const openSessionIds = new Set(concurrentOpens.map((o) => o.session.id));
  check('5 aperturas concurrentes de la MISMA cuenta -> UNA sola sesión (sin duplicados, sin 500)', openSessionIds.size === 1);
  trackedSessionIds.push(...openSessionIds);
  const bobActiveCount = await pg.query(`SELECT count(*)::int AS n FROM quick_question_session WHERE account_id = $1 AND status = 'ACTIVE'`, [accountBob]);
  check('exactamente UNA fila ACTIVE real en base de datos para esa cuenta', bobActiveCount.rows[0].n === 1);
  let directSecondActiveRejected = false;
  try {
    await pg.query(`INSERT INTO quick_question_session (id, account_id, status, started_at) VALUES ($1, $2, 'ACTIVE', now())`, [randomUUID(), accountBob]);
  } catch (error) {
    directSecondActiveRejected = (error as { code?: string }).code === '23505';
  }
  check('índice único parcial rechaza una segunda ACTIVE directa por INSERT (respaldo de base de datos)', directSecondActiveRejected);

  console.log('--- 3. Precisión #2: acceso cross-account -- 404 uniforme, nunca filtra existencia ---');
  const aliceSessionId = open1.session.id;
  let nextCrossAccountRejected = false;
  let answerCrossAccountRejected = false;
  let closeCrossAccountRejected = false;
  try {
    await service.next(accountBob, aliceSessionId);
  } catch (error) {
    nextCrossAccountRejected = (error as { status?: number }).status === 404;
  }
  try {
    await service.answer(accountBob, aliceSessionId, randomUUID(), randomUUID());
  } catch (error) {
    answerCrossAccountRejected = (error as { status?: number }).status === 404;
  }
  try {
    await service.close(accountBob, aliceSessionId);
  } catch (error) {
    closeCrossAccountRejected = (error as { status?: number }).status === 404;
  }
  check('next() sobre sesión ajena -> 404', nextCrossAccountRejected);
  check('answer() sobre sesión ajena -> 404', answerCrossAccountRejected);
  check('close() sobre sesión ajena -> 404', closeCrossAccountRejected);

  let unknownSessionRejected = false;
  try {
    await service.next(accountAlice, randomUUID());
  } catch (error) {
    unknownSessionRejected = (error as { status?: number }).status === 404;
  }
  check('next() sobre sesión inexistente -> 404 (mismo código que ajena, sin distinguir motivo)', unknownSessionRejected);

  console.log('--- 4. Doble /next sin responder de por medio: devuelve LA MISMA pregunta, sin generar otra ---');
  const qA = await makePublishedQuestion();
  const qB = await makePublishedQuestion();
  trackedQuestionIds.push(qA.questionVersionId, qB.questionVersionId);

  const next1 = await service.next(accountAlice, aliceSessionId);
  if (next1.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED en el primer /next.');
  const next2 = await service.next(accountAlice, aliceSessionId);
  if (next2.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED en el segundo /next.');
  check('doble /next devuelve la MISMA questionVersionId', next1.questionVersion.id === next2.questionVersion.id);
  const attemptsSoFar = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [aliceSessionId]);
  check('ningún intento creado todavía (solo se fijó la pregunta pendiente)', attemptsSoFar.rows[0].n === 0);

  console.log('--- 5. answer(): corrección real, limpieza de pregunta pendiente, publicación best-effort ---');
  const presentedQuestionId = next1.questionVersion.id;
  const presentedAnswerOptionId = await answerOptionForQuestion(presentedQuestionId);
  const operationId1 = randomUUID();
  const answerResult1 = await service.answer(accountAlice, aliceSessionId, presentedAnswerOptionId, operationId1);
  check('answer dentro de la ventana -> outcome ANSWERED (Incremento 9)', answerResult1.outcome === 'ANSWERED');
  if (answerResult1.outcome !== 'ANSWERED') throw new Error('Se esperaba ANSWERED.');
  check('primer answer -> created=true', answerResult1.created === true);
  const presentedAnswerOptionRow = await pg.query('SELECT is_correct FROM answer_option WHERE id = $1', [presentedAnswerOptionId]);
  check('isCorrect refleja EXACTAMENTE AnswerOption.isCorrect real (nunca decidido de otra forma)', answerResult1.attempt.isCorrect === presentedAnswerOptionRow.rows[0].is_correct);
  const sessionAfterAnswer = await sessionRepo.findById(aliceSessionId);
  check('currentQuestionVersionId vuelve a null tras responder', sessionAfterAnswer?.currentQuestionVersionId === null);

  // COMPETITIVE V1 (rediseño visual, Incremento 2) -- correctAnswerOptionId
  // en la respuesta (post-respuesta, nunca antes), para resaltar la correcta.
  const correctOptionRow = await pg.query(
    'SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = true',
    [presentedQuestionId],
  );
  check(
    'answer() devuelve correctAnswerOptionId = la alternativa correcta real de la pregunta',
    answerResult1.correctAnswerOptionId === correctOptionRow.rows[0].id,
  );

  const outboxRowForAttempt1 = await pg.query(
    `SELECT event_key, payload FROM outbox_event WHERE payload->>'quickQuestionAttemptId' = $1`,
    [answerResult1.attempt.id],
  );
  check('publicación best-effort: existe EXACTAMENTE un outbox_event para este intento', outboxRowForAttempt1.rowCount === 1);
  check('eventKey correcto', outboxRowForAttempt1.rows[0]?.event_key === 'quick_question_answered');
  const payload1 = outboxRowForAttempt1.rows[0]?.payload;
  check(
    'payload contiene exactamente los campos aprobados (§13, sin XP/LP/respuesta correcta/texto)',
    payload1?.accountId === accountAlice &&
      payload1?.quickQuestionSessionId === aliceSessionId &&
      payload1?.questionVersionId === presentedQuestionId &&
      typeof payload1?.isCorrect === 'boolean' &&
      Object.keys(payload1).length === 5,
  );

  console.log('--- 6. Replay idempotente: mismo operationId no duplica ni republica ---');
  const answerReplay = await service.answer(accountAlice, aliceSessionId, presentedAnswerOptionId, operationId1);
  if (answerReplay.outcome !== 'ANSWERED') throw new Error('Se esperaba ANSWERED en el replay.');
  check('replay -> created=false', answerReplay.created === false);
  check('replay devuelve el MISMO attempt.id', answerReplay.attempt.id === answerResult1.attempt.id);
  check('replay devuelve el MISMO correctAnswerOptionId', answerReplay.correctAnswerOptionId === correctOptionRow.rows[0].id);
  const outboxRowsAfterReplay = await pg.query(`SELECT count(*)::int AS n FROM outbox_event WHERE payload->>'quickQuestionAttemptId' = $1`, [answerResult1.attempt.id]);
  check('el replay NO publicó un segundo outbox_event', outboxRowsAfterReplay.rows[0].n === 1);

  console.log('--- 7. Precisión #4a: respuestas concurrentes con el MISMO operationId -- un único intento, sin 500 ---');
  const nextForConcurrentSame = await service.next(accountAlice, aliceSessionId);
  if (nextForConcurrentSame.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED antes de la carrera de operationId igual.');
  const concurrentAnswerOptionId = await answerOptionForQuestion(nextForConcurrentSame.questionVersion.id);
  const sharedOperationId = randomUUID();
  const concurrentSameOpResults = await Promise.all(
    Array.from({ length: 3 }, () => service.answer(accountAlice, aliceSessionId, concurrentAnswerOptionId, sharedOperationId)),
  );
  check('las 3 respuestas concurrentes son ANSWERED (dentro de la ventana)', concurrentSameOpResults.every((r) => r.outcome === 'ANSWERED'));
  const distinctAttemptIds = new Set(concurrentSameOpResults.map((r) => (r.outcome === 'ANSWERED' ? r.attempt.id : 'x')));
  check('3 respuestas concurrentes con el MISMO operationId -> UN solo attempt.id, sin error', distinctAttemptIds.size === 1);
  const rowsForSharedOp = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE operation_id = $1', [sharedOperationId]);
  check('exactamente UNA fila real en base de datos para ese operationId', rowsForSharedOp.rows[0].n === 1);
  const outboxForSharedOp = await pg.query(`SELECT count(*)::int AS n FROM outbox_event WHERE payload->>'quickQuestionAttemptId' = $1`, [[...distinctAttemptIds][0]]);
  check('publicación ÚNICA pese a la concurrencia (nunca una por solicitud)', outboxForSharedOp.rows[0].n === 1);

  console.log('--- 8. Precisión #4b: respuestas concurrentes con operationId DISTINTOS sobre la MISMA pregunta -- una gana, la otra recibe conflicto controlado ---');
  const nextForConcurrentDistinct = await service.next(accountAlice, aliceSessionId);
  if (nextForConcurrentDistinct.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED antes de la carrera de operationId distinto.');
  const distinctRaceAnswerOptionId = await answerOptionForQuestion(nextForConcurrentDistinct.questionVersion.id);
  const opA = randomUUID();
  const opB = randomUUID();
  const distinctOpResults = await settled([
    service.answer(accountAlice, aliceSessionId, distinctRaceAnswerOptionId, opA),
    service.answer(accountAlice, aliceSessionId, distinctRaceAnswerOptionId, opB),
  ]);
  const fulfilledDistinct = distinctOpResults.filter((r) => r.status === 'fulfilled');
  const rejectedDistinct = distinctOpResults.filter((r) => r.status === 'rejected');
  check('exactamente UNA de las dos solicitudes tiene éxito (created=true)', fulfilledDistinct.length === 1);
  check('exactamente UNA es rechazada -- nunca las dos aceptadas, nunca las dos fallidas', rejectedDistinct.length === 1);
  if (rejectedDistinct.length === 1) {
    const rejectedReason = (rejectedDistinct[0] as PromiseRejectedResult).reason;
    check('la solicitud perdedora recibe un CONFLICTO controlado (409), nunca un 500', rejectedReason?.status === 409);
    check(
      'mensaje explícito de "sin pregunta pendiente" -- consecuencia natural de la serialización, no un caso especial',
      String(rejectedReason?.message ?? '').includes('pregunta pendiente'),
    );
  }
  const attemptRowsForDistinctRace = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE operation_id IN ($1, $2)', [opA, opB]);
  check('EXACTAMENTE una fila de intento nueva para esta carrera (nunca aceptación silenciosa de ambas)', attemptRowsForDistinctRace.rows[0].n === 1);

  console.log('--- 9. Precisión #3: respuesta-vs-cierre concurrente -- misma exclusión mutua por sesión, nunca un estado a medias ---');
  const sessionForRace = await service.openSession(randomUUID());
  trackedSessionIds.push(sessionForRace.session.id);
  const qC = await makePublishedQuestion();
  trackedQuestionIds.push(qC.questionVersionId);
  const nextForRace = await service.next(sessionForRace.session.accountId, sessionForRace.session.id);
  if (nextForRace.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED antes de la carrera respuesta-vs-cierre.');
  const raceAnswerOptionId = await answerOptionForQuestion(nextForRace.questionVersion.id);
  const raceOperationId = randomUUID();
  const answerVsCloseResults = await settled([
    service.answer(sessionForRace.session.accountId, sessionForRace.session.id, raceAnswerOptionId, raceOperationId),
    service.close(sessionForRace.session.accountId, sessionForRace.session.id),
  ]);
  const answerOutcomeInRace = answerVsCloseResults[0];
  const closeOutcomeInRace = answerVsCloseResults[1];
  check('close() siempre tiene éxito (forward-only, nunca falla por la carrera)', closeOutcomeInRace.status === 'fulfilled');
  const sessionAfterRace = await sessionRepo.findById(sessionForRace.session.id);
  check('la sesión terminó CLOSED en cualquier orden de la carrera', sessionAfterRace?.status === 'CLOSED');
  const attemptRowsAfterRace = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [sessionForRace.session.id]);
  const raceConsistent =
    (answerOutcomeInRace.status === 'fulfilled' && attemptRowsAfterRace.rows[0].n === 1) ||
    (answerOutcomeInRace.status === 'rejected' && attemptRowsAfterRace.rows[0].n === 0 && (answerOutcomeInRace as PromiseRejectedResult).reason?.status === 409);
  check(
    'resultado consistente: si answer ganó, existe EXACTAMENTE 1 intento; si close ganó, CERO intentos y answer recibió 409 -- nunca un estado a medias, nunca 500',
    raceConsistent,
  );

  console.log('--- 10. close(): idempotente, forward-only, cierra con pregunta pendiente sin crear intento ---');
  const closeAgain = await service.close(sessionForRace.session.accountId, sessionForRace.session.id);
  check('cerrar una sesión ya CLOSED -> mismo estado, sin error (no-op seguro)', closeAgain.status === 'CLOSED');
  check('closedAt NO cambia en el segundo close (idempotente de verdad, no solo "no falla")', closeAgain.closedAt?.getTime() === sessionAfterRace?.closedAt?.getTime());

  const sessionToCloseWithPending = await service.openSession(randomUUID());
  trackedSessionIds.push(sessionToCloseWithPending.session.id);
  const qD = await makePublishedQuestion();
  trackedQuestionIds.push(qD.questionVersionId);
  await service.next(sessionToCloseWithPending.session.accountId, sessionToCloseWithPending.session.id);
  const closedWithPending = await service.close(sessionToCloseWithPending.session.accountId, sessionToCloseWithPending.session.id);
  check('close() con pregunta pendiente la descarta (currentQuestionVersionId -> null)', closedWithPending.currentQuestionVersionId === null);
  const attemptsForClosedWithPending = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [sessionToCloseWithPending.session.id]);
  check('cerrar con pregunta pendiente NO crea ningún intento', attemptsForClosedWithPending.rows[0].n === 0);

  console.log('--- 11. Precisión #5: agotamiento de preguntas elegibles -> NO_QUESTIONS_AVAILABLE, sesión sigue ACTIVA ---');
  const qE = await makePublishedQuestion();
  trackedQuestionIds.push(qE.questionVersionId);

  const sessionForExhaustion = await service.openSession(randomUUID());
  trackedSessionIds.push(sessionForExhaustion.session.id);
  const exhaustAccountId = sessionForExhaustion.session.accountId;
  const exhaustSessionId = sessionForExhaustion.session.id;
  // Aísla el universo elegible DE ESTA SESIÓN a la única fixture qE, sin tocar
  // el catálogo editorial (ver `isolateEligibleUniverse`).
  await isolateEligibleUniverse(exhaustSessionId, exhaustAccountId, [qE.questionVersionId]);

  const firstAndOnly = await service.next(exhaustAccountId, exhaustSessionId);
  if (firstAndOnly.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba la única pregunta elegible restante.');
  check('la única pregunta ELEGIBLE restante para esta sesión es la fixture aislada', firstAndOnly.questionVersion.id === qE.questionVersionId);
  await service.answer(exhaustAccountId, exhaustSessionId, qE.answerOptionId, randomUUID());

  const exhausted = await service.next(exhaustAccountId, exhaustSessionId);
  check('NO_QUESTIONS_AVAILABLE cuando no queda ninguna pregunta elegible', exhausted.outcome === 'NO_QUESTIONS_AVAILABLE');
  if (exhausted.outcome === 'NO_QUESTIONS_AVAILABLE') {
    check('la sesión sigue ACTIVE (nunca se cierra por agotamiento)', exhausted.session.status === 'ACTIVE');
    check('sin pregunta pendiente tras el agotamiento', exhausted.session.currentQuestionVersionId === null);
  }

  console.log('--- 12. Precisión #6: fallo de publicación NO revierte ni duplica el intento, ni deja la sesión inconsistente ---');
  class BrokenOutboxEventRepository {
    create(): Promise<never> {
      return Promise.reject(new Error('fallo simulado del gate 4.b para probar la garantía best-effort'));
    }
  }
  const brokenOutbox = new OutboxService(new BrokenOutboxEventRepository() as unknown as OutboxEventRepository, config);
  const serviceWithBrokenOutbox = new QuickQuestionService(prisma, brokenOutbox, sessionRepo, attemptRepo, questionVersionRepo, answerOptionRepo);

  const sessionForBrokenOutbox = await serviceWithBrokenOutbox.openSession(randomUUID());
  trackedSessionIds.push(sessionForBrokenOutbox.session.id);
  const qF = await makePublishedQuestion();
  trackedQuestionIds.push(qF.questionVersionId);
  const brokenOutboxExclusions = await isolateEligibleUniverse(
    sessionForBrokenOutbox.session.id,
    sessionForBrokenOutbox.session.accountId,
    [qF.questionVersionId],
  );

  const nextWithBrokenOutbox = await serviceWithBrokenOutbox.next(sessionForBrokenOutbox.session.accountId, sessionForBrokenOutbox.session.id);
  if (nextWithBrokenOutbox.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED para la prueba de outbox roto.');

  let answerWithBrokenOutboxThrew = false;
  let answerWithBrokenOutboxResult: Awaited<ReturnType<typeof service.answer>> | undefined;
  try {
    answerWithBrokenOutboxResult = await serviceWithBrokenOutbox.answer(
      sessionForBrokenOutbox.session.accountId,
      sessionForBrokenOutbox.session.id,
      qF.answerOptionId,
      randomUUID(),
    );
  } catch {
    answerWithBrokenOutboxThrew = true;
  }
  check('answer() NUNCA propaga un fallo de publicación -- OutboxService lo atrapa internamente (ADR-0006)', !answerWithBrokenOutboxThrew);
  if (answerWithBrokenOutboxResult && answerWithBrokenOutboxResult.outcome !== 'ANSWERED') throw new Error('Se esperaba ANSWERED (dentro de ventana).');
  check('el intento se creó normalmente pese al fallo de publicación', answerWithBrokenOutboxResult?.outcome === 'ANSWERED' && answerWithBrokenOutboxResult.created === true);

  const brokenSessionAfter = await sessionRepo.findById(sessionForBrokenOutbox.session.id);
  check('currentQuestionVersionId sigue en null -- la sesión NO queda inconsistente por el fallo de publicación', brokenSessionAfter?.currentQuestionVersionId === null);

  const attemptRowsAfterBrokenOutbox = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [sessionForBrokenOutbox.session.id]);
  // Conteo EXACTO igual que siempre: los intentos de exclusión insertados para
  // aislar el universo elegible de esta sesión son conocidos y se descuentan.
  check('exactamente UN intento -- el fallo de publicación no duplicó nada', attemptRowsAfterBrokenOutbox.rows[0].n - brokenOutboxExclusions === 1);

  const outboxRowsAfterBrokenOutbox = await pg.query(
    `SELECT count(*)::int AS n FROM outbox_event WHERE payload->>'quickQuestionAttemptId' = $1`,
    [answerWithBrokenOutboxResult?.attempt.id ?? ''],
  );
  check('ausencia del evento es el ÚNICO efecto observable del fallo -- ningún outbox_event se publicó', outboxRowsAfterBrokenOutbox.rows[0].n === 0);

  const replayAfterBrokenOutbox = await service.answer(
    sessionForBrokenOutbox.session.accountId,
    sessionForBrokenOutbox.session.id,
    qF.answerOptionId,
    (answerWithBrokenOutboxResult as { attempt: { operationId: string } }).attempt.operationId,
  );
  check(
    'incluso con el servicio SANO, reintentar con el MISMO operationId sigue siendo un replay idempotente (nunca se corrompe)',
    replayAfterBrokenOutbox.outcome === 'ANSWERED' &&
      replayAfterBrokenOutbox.created === false &&
      replayAfterBrokenOutbox.attempt.id === (answerWithBrokenOutboxResult as { attempt: { id: string } }).attempt.id,
  );

  console.log('--- 12b. Incremento 9: deadline AUTORITATIVA + timeout server-side ---');
  check('la constante autoritativa es 45 000 ms', QUICK_QUESTION_TIME_LIMIT_MS === 45_000);

  const tSession = await service.openSession(randomUUID());
  trackedSessionIds.push(tSession.session.id);
  const acc = tSession.session.accountId;
  const qT1 = await makePublishedQuestion();
  const qT2 = await makePublishedQuestion();
  const qT3 = await makePublishedQuestion();
  trackedQuestionIds.push(qT1.questionVersionId, qT2.questionVersionId, qT3.questionVersionId);
  // Aísla el universo elegible de ESTA sesión a las 3 fixtures (todas con
  // alternativa) -- así `/next` nunca elige una `question_version` ajena sin
  // answer_option, y la exclusión post-timeout es determinista.
  await isolateEligibleUniverse(tSession.session.id, acc, [qT1.questionVersionId, qT2.questionVersionId, qT3.questionVersionId]);

  // A. /next presenta con deadline autoritativa = presentedAt + 45 s.
  const tNext1 = await service.next(acc, tSession.session.id);
  if (tNext1.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED.');
  const s1 = await sessionRepo.findById(tSession.session.id);
  const expectedDeadline1 = new Date((s1!.currentPresentedAt as Date).getTime() + 45_000).getTime();
  check('A. /next devuelve deadlineAt = currentPresentedAt + 45 s (reloj del servidor)', tNext1.deadlineAt.getTime() === expectedDeadline1);

  // B. /next de nuevo dentro de la ventana -> MISMA pregunta, MISMA deadline (no se reinicia).
  const tNext2 = await service.next(acc, tSession.session.id);
  if (tNext2.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED en el segundo /next.');
  check('B. pending dentro de ventana -> MISMA questionVersion', tNext2.questionVersion.id === tNext1.questionVersion.id);
  check('B. la deadline NO se reinicia -- misma que la original', tNext2.deadlineAt.getTime() === tNext1.deadlineAt.getTime());
  const s2 = await sessionRepo.findById(tSession.session.id);
  check('B. currentPresentedAt NO cambió', (s2!.currentPresentedAt as Date).getTime() === (s1!.currentPresentedAt as Date).getTime());

  // Captura de LP antes de cualquier timeout (F).
  const lpBefore = await pg.query(
    `SELECT COALESCE(SUM(le.point_amount), 0)::int AS lp
       FROM league_point_ledger_entry le WHERE le.account_id = $1`,
    [acc],
  );

  // H. timeout() antes de la deadline -> NOT_EXPIRED, sin consumir nada.
  const tEarly = await service.timeout(acc, tSession.session.id);
  check('H. timeout() dentro de la ventana -> NOT_EXPIRED (sin consumir)', tEarly.outcome === 'NOT_EXPIRED');
  const sAfterEarly = await sessionRepo.findById(tSession.session.id);
  check('H. la pregunta pendiente sigue intacta tras un timeout prematuro', sAfterEarly?.currentQuestionVersionId === tNext1.questionVersion.id);

  // Simula que la ventana expiró: currentPresentedAt 46 s en el pasado (reloj del servidor, nunca del cliente).
  await pg.query(`UPDATE quick_question_session SET current_presented_at = now() - interval '46 seconds' WHERE id = $1`, [tSession.session.id]);

  const qT1CorrectRow = await pg.query('SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = true', [tNext1.questionVersion.id]);
  const attemptsBeforeTimeout = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [tSession.session.id]);

  // E. timeout() explícito -> TIMED_OUT + correctAnswerOptionId real.
  const tTimeout = await service.timeout(acc, tSession.session.id);
  check('E. timeout() tras expirar -> TIMED_OUT', tTimeout.outcome === 'TIMED_OUT');
  check('E. TIMED_OUT devuelve correctAnswerOptionId = la alternativa correcta real', tTimeout.outcome === 'TIMED_OUT' && tTimeout.correctAnswerOptionId === qT1CorrectRow.rows[0].id);

  // 6 / no fake answer: NINGÚN intento se creó.
  const attemptsAfterTimeout = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [tSession.session.id]);
  check('el timeout NO creó ningún quick_question_attempt (sin answer falso)', attemptsAfterTimeout.rows[0].n === attemptsBeforeTimeout.rows[0].n);

  // no event: NINGÚN quick_question_answered para esta sesión.
  const timeoutEvents = await pg.query(
    `SELECT count(*)::int AS n FROM outbox_event WHERE event_key = 'quick_question_answered' AND payload->>'quickQuestionSessionId' = $1`,
    [tSession.session.id],
  );
  check('el timeout NO emitió quick_question_answered', timeoutEvents.rows[0].n === 0);

  // Consumo: la pregunta pendiente quedó limpia.
  const sAfterTimeout = await sessionRepo.findById(tSession.session.id);
  check('7. tras el timeout, currentQuestionVersionId vuelve a null (pregunta consumida)', sAfterTimeout?.currentQuestionVersionId === null);

  // E (replay). Segundo timeout() -> NO_PENDING_QUESTION, estable, sin 500.
  const tTimeoutReplay = await service.timeout(acc, tSession.session.id);
  check('E. replay de timeout() -> NO_PENDING_QUESTION (estable, nunca 500 ni doble efecto)', tTimeoutReplay.outcome === 'NO_PENDING_QUESTION');

  // F. LP sin cambios tras el timeout.
  // (el LeaguePointGrantScheduler no corre en el gate; basta con que no exista el evento -> nunca habrá grant)
  const lpAfter = await pg.query(
    `SELECT COALESCE(SUM(le.point_amount), 0)::int AS lp FROM league_point_ledger_entry le WHERE le.account_id = $1`,
    [acc],
  );
  check('F. LP del ledger sin cambios: antes == después del timeout', lpBefore.rows[0].lp === lpAfter.rows[0].lp);

  // G. /next tras el timeout -> NUEVA presentación (nueva deadline, nuevo
  // presentedAt), NUNCA la misma pending con su deadline vieja. Con 3
  // fixtures aisladas y una ya consumida, entrega OTRA.
  const tNext3 = await service.next(acc, tSession.session.id);
  if (tNext3.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED tras el timeout.');
  check('G. /next tras el timeout NO devuelve la misma pending con la deadline vieja', tNext3.deadlineAt.getTime() !== tNext1.deadlineAt.getTime());
  check('G. /next tras el timeout entrega OTRA pregunta (pool aislado, la consumida no reaparece como misma pending)', tNext3.questionVersion.id !== tNext1.questionVersion.id);
  const s3 = await sessionRepo.findById(tSession.session.id);
  check('G. currentPresentedAt es fresco (posterior a la presentación original)', (s3!.currentPresentedAt as Date).getTime() > (s1!.currentPresentedAt as Date).getTime());

  // D. answer() DESPUÉS de la deadline -> TIMED_OUT, sin intento, sin evento.
  await pg.query(`UPDATE quick_question_session SET current_presented_at = now() - interval '46 seconds' WHERE id = $1`, [tSession.session.id]);
  const qT3CorrectRow = await pg.query('SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = true', [tNext3.questionVersion.id]);
  const lateAnswerOptionId = qT3CorrectRow.rows[0].id;
  const attemptsBeforeLate = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [tSession.session.id]);
  const lateAnswer = await service.answer(acc, tSession.session.id, lateAnswerOptionId, randomUUID());
  check('D. answer() tras la deadline -> outcome TIMED_OUT (no se acepta como respuesta)', lateAnswer.outcome === 'TIMED_OUT');
  check('D. TIMED_OUT del answer tardío devuelve correctAnswerOptionId real', lateAnswer.outcome === 'TIMED_OUT' && lateAnswer.correctAnswerOptionId === qT3CorrectRow.rows[0].id);
  const attemptsAfterLate = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [tSession.session.id]);
  check('D. answer() tardío NO creó ningún intento', attemptsAfterLate.rows[0].n === attemptsBeforeLate.rows[0].n);
  const lateEvents = await pg.query(
    `SELECT count(*)::int AS n FROM outbox_event WHERE event_key = 'quick_question_answered' AND payload->>'quickQuestionSessionId' = $1`,
    [tSession.session.id],
  );
  check('D. answer() tardío NO emitió quick_question_answered', lateEvents.rows[0].n === 0);

  // C. answer() DENTRO de la ventana sigue funcionando con la semántica de siempre.
  const tNext4 = await service.next(acc, tSession.session.id);
  if (tNext4.outcome !== 'QUESTION_PRESENTED') throw new Error('Se esperaba QUESTION_PRESENTED.');
  const inWindowOption = await answerOptionForQuestion(tNext4.questionVersion.id);
  const inWindowAnswer = await service.answer(acc, tSession.session.id, inWindowOption, randomUUID());
  check('C. answer() dentro de la ventana -> ANSWERED, intento creado, semántica intacta', inWindowAnswer.outcome === 'ANSWERED' && inWindowAnswer.created === true);

  console.log('--- 13. Frontera de dominio: QuickQuestionService no escribe en PROGRESS ---');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const serviceSource = readFileSync(join(gamificationDir, 'quick-question.service.ts'), 'utf8');
  const forbidden = ['StudentResponse', 'CurriculumTopicProgress', 'ProgressService'];
  check('QuickQuestionService no referencia StudentResponse/CurriculumTopicProgress/ProgressService', !forbidden.some((s) => serviceSource.includes(s)));

  console.log('--- 14. Limpieza de fixtures de este gate ---');
  await pg.query('DELETE FROM quick_question_attempt WHERE session_id = ANY($1::uuid[])', [trackedSessionIds]);
  await pg.query('DELETE FROM quick_question_session WHERE id = ANY($1::uuid[])', [trackedSessionIds]);
  await pg.query(
    `DELETE FROM outbox_event WHERE payload->>'quickQuestionSessionId' = ANY($1)`,
    [trackedSessionIds],
  );
  // LEF Bloque VII, Incremento 1: las `question_version` publicadas de este
  // gate y sus `answer_option` ya NO se borran -- el DELETE sobre contenido
  // que alcanzó publicación está prohibido sin excepciones, también para
  // tests, y no existe ningún bypass de trigger. La contaminación del
  // `curriculum_topic` compartido, motivo original de esta limpieza, se evita
  // en el ORIGEN: las fixtures cuelgan de un tema propio y único por corrida
  // (ver bloque 0), y su presencia residual en el catálogo publicado ya no
  // afecta a ninguna aserción porque el aislamiento del universo elegible es
  // POR SESIÓN (ver `isolateEligibleUniverse`).
  void trackedQuestionIds;

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log(`Todas las verificaciones del gate de Motor de Sesión de Pregunta Rápida (Bloque IV, Incremento 4, sub-incremento 4.b) pasaron. (suffix=${suffix})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
