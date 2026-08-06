// Gate del Bloque IV, Incremento 4, sub-incremento 4.a ("Fundación de
// persistencia de Pregunta rápida") -- ver
// docs/adr/LEF-BLOCK-IV-DEFINITION.md §12-13. Puramente estructural
// (esquema/constraints/triggers/repositorios, sin selección de preguntas,
// sin corrección, sin transacción de negocio real, sin publicación, sin
// HTTP -- eso llega en 4.b/4.c). Verifica Gates 1, 2 (parcial -- solo
// restricción de base de datos), 9 (parcial -- solo trigger) de §13.5.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { QuickQuestionSessionRepository } from '../src/gamification/quick-question-session.repository';
import { QuickQuestionAttemptRepository } from '../src/gamification/quick-question-attempt.repository';
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

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const sessionRepo = new QuickQuestionSessionRepository(prisma);
  const attemptRepo = new QuickQuestionAttemptRepository(prisma);

  const suffix = Date.now();
  const now = new Date();

  console.log('--- 0. Fixtures: dos QuestionVersion/AnswerOption publicadas (mismo criterio que verify-progress-gate) ---');
  const topicRow = await pg.query(`SELECT id, subject_id FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
  if (topicRow.rowCount === 0) throw new Error('Fixture de currículo no encontrada -- ¿seed ejecutado?');
  const topicId = topicRow.rows[0].id as string;
  const subjectId = topicRow.rows[0].subject_id as string;

  async function makePublishedQuestion(): Promise<{ questionVersionId: string; answerOptionId: string }> {
    const questionId = randomUUID();
    const questionVersionId = randomUUID();
    const answerOptionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [questionId, `GATE.QQ.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'PUBLISHED', now(), now(), now())`,
      [questionVersionId, questionId, topicId],
    );
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"x"}', 0, true, now())`,
      [answerOptionId, questionVersionId],
    );
    return { questionVersionId, answerOptionId };
  }

  const q1 = await makePublishedQuestion();
  const q2 = await makePublishedQuestion();

  console.log('--- 1. quick_question_session: creación, nace ACTIVE, sin pregunta pendiente ---');
  const accountAlice = randomUUID();
  const session1 = await sessionRepo.create(accountAlice);
  check('nace ACTIVE', session1.status === 'ACTIVE');
  check('currentQuestionVersionId nace null (estado inicial de la máquina de estados, §13)', session1.currentQuestionVersionId === null);
  check('closedAt nace null', session1.closedAt === null);

  console.log('--- 2. GET /next (simulado): fijar la pregunta pendiente en la sesión ---');
  const presentedAt1 = new Date();
  const sessionWithQuestion = await sessionRepo.setCurrentQuestion(session1.id, q1.questionVersionId, presentedAt1);
  check('currentQuestionVersionId queda fijado tras seleccionar (server-side)', sessionWithQuestion.currentQuestionVersionId === q1.questionVersionId);

  console.log('--- 2b. Doble /next (simulado): repetir la fijación de la MISMA pregunta no rompe nada -- el servicio de 4.b decide idempotencia real, aquí solo se prueba que el primitivo de persistencia lo permite ---');
  const sessionSameQuestionAgain = await sessionRepo.setCurrentQuestion(session1.id, q1.questionVersionId, presentedAt1);
  check('re-fijar la misma pregunta pendiente es un no-op observable (misma questionVersionId)', sessionSameQuestionAgain.currentQuestionVersionId === q1.questionVersionId);

  console.log('--- 3. quick_question_attempt: creación dentro de transacción + limpieza de currentQuestionVersionId (§13.3 punto 4, corregido) ---');
  const operationId1 = randomUUID();
  const attempt1 = await prisma.$transaction(async (tx) => {
    const created = await attemptRepo.create(tx, {
      sessionId: session1.id,
      accountId: accountAlice,
      questionVersionId: q1.questionVersionId,
      answerOptionId: q1.answerOptionId,
      isCorrect: true,
      presentedAt: presentedAt1,
      operationId: operationId1,
    });
    await sessionRepo.clearCurrentQuestion(tx, session1.id);
    return created;
  });
  check('quick_question_attempt creado', attempt1.sessionId === session1.id && attempt1.questionVersionId === q1.questionVersionId);
  const sessionAfterAnswer = await sessionRepo.findById(session1.id);
  check('currentQuestionVersionId vuelve a null tras responder (lista para la siguiente)', sessionAfterAnswer?.currentQuestionVersionId === null);

  console.log('--- 4. Idempotencia por operationId (mismo patrón que StudentResponse) ---');
  const byOperation = await attemptRepo.findByOperationId(operationId1);
  check('findByOperationId devuelve el intento ya creado', byOperation?.id === attempt1.id);

  let duplicateOperationRejected = false;
  try {
    await prisma.$transaction(async (tx) => {
      await attemptRepo.create(tx, {
        sessionId: session1.id,
        accountId: accountAlice,
        questionVersionId: q2.questionVersionId,
        answerOptionId: q2.answerOptionId,
        isCorrect: false,
        presentedAt: new Date(),
        operationId: operationId1, // MISMO operationId, pregunta distinta
      });
    });
  } catch (error) {
    duplicateOperationRejected = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
  check('@@unique([operationId]) rechaza un segundo intento con el mismo operationId (reintento de red no duplica)', duplicateOperationRejected);

  console.log('--- 5. Gate 2 (parcial): @@unique([sessionId, questionVersionId]) -- sin repetición DENTRO de una sesión, a nivel de base de datos ---');
  let sameSessionSameQuestionRejected = false;
  try {
    await prisma.$transaction(async (tx) => {
      await attemptRepo.create(tx, {
        sessionId: session1.id,
        accountId: accountAlice,
        questionVersionId: q1.questionVersionId, // MISMA pregunta ya respondida en session1
        answerOptionId: q1.answerOptionId,
        isCorrect: true,
        presentedAt: new Date(),
        operationId: randomUUID(),
      });
    });
  } catch (error) {
    sameSessionSameQuestionRejected = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
  check(
    'un segundo intento en la MISMA sesión sobre la MISMA questionVersionId es rechazado por Postgres (defensa en profundidad)',
    sameSessionSameQuestionRejected,
  );

  console.log('--- 6. Gate 1: repetible ENTRE sesiones -- sin UNIQUE(accountId, questionVersionId) global (a diferencia de student_response) ---');
  // Precisión obligatoria del Product Owner añadida en 4.b: una sola
  // QuickQuestionSession ACTIVE por cuenta (índice único parcial
  // quick_question_session_one_active_per_account) -- session1 debe
  // cerrarse antes de poder abrir session2 para la MISMA cuenta. La
  // repetibilidad entre sesiones (Gate 1) no depende de que ambas estén
  // ACTIVE simultáneamente, solo de que no exista UNIQUE(accountId,
  // questionVersionId) global -- sigue intacta.
  await sessionRepo.close(session1.id, new Date());
  const session2 = await sessionRepo.create(accountAlice);
  await sessionRepo.setCurrentQuestion(session2.id, q1.questionVersionId, new Date());
  const attempt2 = await prisma.$transaction(async (tx) => {
    const created = await attemptRepo.create(tx, {
      sessionId: session2.id,
      accountId: accountAlice,
      questionVersionId: q1.questionVersionId, // MISMA pregunta que en session1, sesión DISTINTA
      answerOptionId: q1.answerOptionId,
      isCorrect: true,
      presentedAt: new Date(),
      operationId: randomUUID(),
    });
    await sessionRepo.clearCurrentQuestion(tx, session2.id);
    return created;
  });
  check('la MISMA cuenta responde la MISMA pregunta en una sesión distinta -- ambos intentos existen, sin error', attempt2.questionVersionId === q1.questionVersionId);
  const attemptCountForQ1 = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE question_version_id = $1', [q1.questionVersionId]);
  check('exactamente 2 filas de intento para esa questionVersionId (una por sesión)', attemptCountForQ1.rows[0].n === 2);

  console.log('--- 7. Máquina de estados forward-only (trigger enforce_quick_question_session_status_transition) ---');
  const closeTimestamp = new Date();
  await pg.query("UPDATE quick_question_session SET status = 'CLOSED', closed_at = $2 WHERE id = $1", [session2.id, closeTimestamp]);
  let backwardRejected = false;
  try {
    await pg.query("UPDATE quick_question_session SET status = 'ACTIVE' WHERE id = $1", [session2.id]);
  } catch (error) {
    backwardRejected = String((error as Error).message ?? '').includes('no admite la transición');
  }
  check('trigger rechaza CLOSED -> ACTIVE (nunca retrocede, forward-only)', backwardRejected);

  console.log('--- 8. Gate 9 (parcial): sesión CLOSED nunca acepta nuevas respuestas -- respaldo de base de datos ---');
  let insertOnClosedSessionRejected = false;
  try {
    await pg.query(
      `INSERT INTO quick_question_attempt (id, session_id, account_id, question_version_id, answer_option_id, is_correct, presented_at, responded_at, operation_id, created_at)
       VALUES ($1, $2, $3, $4, $5, true, now(), now(), $6, now())`,
      [randomUUID(), session2.id, accountAlice, q2.questionVersionId, q2.answerOptionId, randomUUID()],
    );
  } catch (error) {
    insertOnClosedSessionRejected = String((error as Error).message ?? '').includes('ya no está ACTIVE');
  }
  check('trigger enforce_quick_question_attempt_session_active rechaza un INSERT directo sobre una sesión CLOSED', insertOnClosedSessionRejected);

  console.log('--- 9. close(): descarta cualquier pregunta pendiente, NO crea intento, NO publica actividad (§13.4) ---');
  const session3 = await sessionRepo.create(accountAlice);
  await sessionRepo.setCurrentQuestion(session3.id, q2.questionVersionId, new Date());
  const attemptCountBeforeClose = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [session3.id]);
  const closedSession3 = await sessionRepo.close(session3.id, new Date());
  check('close() transiciona a CLOSED', closedSession3.status === 'CLOSED');
  check('close() descarta la pregunta pendiente (currentQuestionVersionId -> null)', closedSession3.currentQuestionVersionId === null);
  check('closedAt queda fijado', closedSession3.closedAt !== null);
  const attemptCountAfterClose = await pg.query('SELECT count(*)::int AS n FROM quick_question_attempt WHERE session_id = $1', [session3.id]);
  check('cerrar una sesión con pregunta pendiente NO crea ningún quick_question_attempt', attemptCountBeforeClose.rows[0].n === 0 && attemptCountAfterClose.rows[0].n === 0);
  const outboxCountAfterClose = await pg.query(
    `SELECT count(*)::int AS n FROM outbox_event WHERE event_key = 'quick_question_answered' AND payload->>'quickQuestionSessionId' = $1`,
    [session3.id],
  );
  check('cerrar una sesión NO publica ningún outbox_event (sin actividad, §13.4)', outboxCountAfterClose.rows[0].n === 0);

  console.log('--- 10. Repositorio: findQuestionVersionIdsBySession / findBySessionAndQuestionVersion / findBySessionId ---');
  const usedQuestionIds = await attemptRepo.findQuestionVersionIdsBySession(session1.id);
  check('findQuestionVersionIdsBySession devuelve las preguntas ya usadas en la sesión (insumo de exclusión de 4.b)', usedQuestionIds.length === 1 && usedQuestionIds[0] === q1.questionVersionId);
  const foundBySessionAndQuestion = await attemptRepo.findBySessionAndQuestionVersion(session1.id, q1.questionVersionId);
  check('findBySessionAndQuestionVersion localiza el intento exacto', foundBySessionAndQuestion?.id === attempt1.id);
  const allInSession1 = await attemptRepo.findBySessionId(session1.id);
  check('findBySessionId devuelve todos los intentos de la sesión, en orden', allInSession1.length === 1 && allInSession1[0].id === attempt1.id);

  console.log('--- 11. FK Restrict: quick_question_attempt exige questionVersionId/answerOptionId existentes en EDUCATION ---');
  // session1/session2/session3 ya están CLOSED a esta altura -- el trigger
  // enforce_quick_question_attempt_session_active dispararía primero
  // ("ya no está ACTIVE") y enmascararía el error de FK que este paso
  // quiere probar. Sesión dedicada, ACTIVE, exclusivamente para esto.
  const session4 = await sessionRepo.create(accountAlice);
  let unknownQuestionVersionRejected = false;
  try {
    await pg.query(
      `INSERT INTO quick_question_attempt (id, session_id, account_id, question_version_id, answer_option_id, is_correct, presented_at, responded_at, operation_id, created_at)
       VALUES ($1, $2, $3, $4, $5, true, now(), now(), $6, now())`,
      [randomUUID(), session4.id, accountAlice, randomUUID() /* questionVersionId inexistente */, q1.answerOptionId, randomUUID()],
    );
  } catch (error) {
    unknownQuestionVersionRejected = (error as { code?: string }).code === '23503';
  }
  check('FK rechaza un questionVersionId que no existe en question_version', unknownQuestionVersionRejected);
  // Nota de diseño para 4.b: el esquema NO valida que answerOptionId
  // pertenezca a ESA questionVersionId (ambas FK son válidas de forma
  // independiente) -- esa validación semántica es responsabilidad de
  // QuickQuestionService (§13.3 punto 3), no de este constraint.

  console.log('--- 12. Frontera de dominio (Gate 5 estático): cero referencia a PROGRESS en los archivos de este incremento ---');
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const sessionRepoSource = readFileSync(join(gamificationDir, 'quick-question-session.repository.ts'), 'utf8');
  const attemptRepoSource = readFileSync(join(gamificationDir, 'quick-question-attempt.repository.ts'), 'utf8');
  const forbidden = ['StudentResponse', 'CurriculumTopicProgress', 'ProgressService'];
  const violation = forbidden.some((symbol) => sessionRepoSource.includes(symbol) || attemptRepoSource.includes(symbol));
  check('ni QuickQuestionSessionRepository ni QuickQuestionAttemptRepository referencian StudentResponse/CurriculumTopicProgress/ProgressService', !violation);

  console.log('--- 13. Fuera de alcance de 4.a: sin HTTP, sin selección, sin corrección, sin publicación ---');
  const controllerFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.controller.ts'));
  let publicExposureFound = false;
  for (const file of controllerFiles) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    if (contents.includes('QuickQuestionSessionRepository') || contents.includes('QuickQuestionAttemptRepository')) {
      publicExposureFound = true;
      console.error(`  ${file} expone quick_question_session/quick_question_attempt públicamente`);
    }
  }
  check('ningún controller expone quick_question_session/quick_question_attempt (sin endpoints en 4.a)', !publicExposureFound);
  // Nota: la ausencia de quick-question.service.ts fue verificada mientras
  // 4.a era el último sub-incremento construido -- una vez completado 4.b
  // (ver verify-quick-question-engine-gate.ts), ese archivo existe
  // legítimamente y esta comprobación ya no aplica. Lo que sigue siendo
  // permanente es que los REPOSITORIOS de 4.a nunca publican al outbox
  // directamente -- verificado abajo.
  const outboxUsage = sessionRepoSource.includes('OutboxService') || attemptRepoSource.includes('OutboxService');
  check('ningún repositorio de 4.a publica al outbox directamente (publicación es responsabilidad de 4.b, fuera de la transacción de escritura)', !outboxUsage);

  console.log('--- 14. Limpieza de fixtures de este gate (mismo criterio que verify-progress-gate: nunca dejar contaminación en curriculum_topic compartido) ---');
  await pg.query('DELETE FROM quick_question_attempt WHERE session_id IN ($1, $2, $3, $4)', [session1.id, session2.id, session3.id, session4.id]);
  await pg.query('DELETE FROM quick_question_session WHERE id IN ($1, $2, $3, $4)', [session1.id, session2.id, session3.id, session4.id]);
  await pg.query('DELETE FROM answer_option WHERE question_version_id IN ($1, $2)', [q1.questionVersionId, q2.questionVersionId]);
  await pg.query('DELETE FROM question_version WHERE id IN ($1, $2)', [q1.questionVersionId, q2.questionVersionId]);
  await pg.query(`DELETE FROM question WHERE question_key LIKE 'GATE.QQ.%'`);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundación de Persistencia de Pregunta Rápida (Bloque IV, Incremento 4, sub-incremento 4.a) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
