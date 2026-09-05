// STABILIZATION-B6 (Finding I) -- gate PURO. Prueba la NUEVA semántica de
// completitud de recurso: ya NO hay acción manual "Completar recurso"; un
// recurso se completa AUTOMÁTICAMENTE al terminar su flujo de preguntas
// (`ProgressService.submitResponse`, cuando el tema-recurso transiciona a
// COMPLETED por primera vez -> mismo núcleo idempotente
// `recordResourceCompletion` que el endpoint legacy).
//
// Fixtures 100% sintéticos y namespaced (`B6RQF.<runId>`), borrados en un
// `finally`. Se ejecuta vía run-gate.ts -> .env.gates -> axioma_gates_dev.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { CurriculumTopicProgressRepository } from '../src/progress/curriculum-topic-progress.repository';
import { StudentResponseRepository } from '../src/progress/student-response.repository';
import { LearningResourceProgressRepository } from '../src/progress/learning-resource-progress.repository';
import { CurriculumTopicRepository } from '../src/education/curriculum-topic.repository';
import { LearningResourceVersionRepository } from '../src/education/learning-resource-version.repository';
import { QuestionVersionRepository } from '../src/education/question-version.repository';
import { AnswerOptionRepository } from '../src/education/answer-option.repository';
import { SubjectRepository } from '../src/education/subject.repository';
import { PremiumContentPolicy } from '../src/education/premium-content-policy.service';
import { EntitlementService } from '../src/entitlement/entitlement.service';
import { OutboxService } from '../src/platform/outbox/outbox.service';
import { OutboxEventRepository } from '../src/platform/outbox/outbox-event.repository';
import { ProgressService } from '../src/progress/progress.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? '  OK' : 'FALLO'}  ${label}`);
  if (!ok) failures++;
}

class ConfigServiceStub {
  get(): undefined {
    return undefined;
  }
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const svcPrisma = prisma as unknown as PrismaService;
  const raw = svcPrisma as unknown as { $queryRawUnsafe: <T>(q: string, ...v: unknown[]) => Promise<T> };

  const dbCheck = await raw.$queryRawUnsafe<{ current_database: string }[]>('SELECT current_database()');
  if (dbCheck[0]?.current_database === 'axioma_dev') throw new Error('ABORTA: apunta a axioma_dev.');
  console.log(`Target: ${dbCheck[0]?.current_database}`);

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const QUESTIONS_PER_RESOURCE = 3;

  // Subject sintético PROPIO -- así las unidades del gate quedan en las
  // primeras posiciones canónicas de SU materia (FREE_UNIT), sin depender
  // de cuántas unidades tenga ya cualquier materia real de la gate DB.
  const subject = await prisma.subject.create({
    data: { id: randomUUID(), subjectKey: `b6rqf-subj-${runId}`, name: `Materia B6RQF ${runId}`, shortName: 'B6RQF', displayOrder: 950, status: 'ACTIVE' },
  });

  const createdTopicIds: string[] = [];
  const createdResourceIds: string[] = [];
  const createdQuestionIds: string[] = [];

  /** Unidad sintética -> 2 recursos, cada uno con 1 learning_resource_version PUBLISHED + N question_version PUBLISHED (+ 2 alternativas). */
  async function makeUnit(order: number) {
    const rootId = randomUUID();
    await prisma.curriculumTopic.create({ data: { id: rootId, code: `B6RQF.UNIT${order}.${runId}`, name: `Unidad B6RQF ${order}`, order, subjectId: subject!.id } });
    createdTopicIds.push(rootId);

    const resources: { topicId: string; learningResourceId: string; questionVersionIds: string[]; correctByQv: Map<string, string> }[] = [];
    for (let r = 0; r < 2; r++) {
      const childId = randomUUID();
      const resourceId = randomUUID();
      await prisma.curriculumTopic.create({ data: { id: childId, code: `B6RQF.UNIT${order}.R${r}.${runId}`, name: `Recurso ${order}.${r}`, order: r, subjectId: subject!.id, parentId: rootId } });
      createdTopicIds.push(childId);
      await prisma.learningResource.create({ data: { id: resourceId, resourceKey: `b6rqf-${order}-${r}-${runId}`, primarySubjectId: subject!.id, resourceType: 'LESSON' } });
      createdResourceIds.push(resourceId);
      await prisma.learningResourceVersion.create({
        data: { id: randomUUID(), learningResourceId: resourceId, curriculumTopicId: childId, title: `Contenido ${order}.${r}`, contentBlocks: [{ type: 'paragraph', order: 0, text: 'x' }], editorialStatus: 'PUBLISHED', publishedAt: new Date() },
      });

      const questionVersionIds: string[] = [];
      const correctByQv = new Map<string, string>();
      for (let q = 0; q < QUESTIONS_PER_RESOURCE; q++) {
        const questionId = randomUUID();
        const qvId = randomUUID();
        await prisma.question.create({ data: { id: questionId, questionKey: `b6rqf-q-${order}-${r}-${q}-${runId}`, primarySubjectId: subject!.id, questionType: 'SINGLE_CHOICE' } });
        createdQuestionIds.push(questionId);
        // Las alternativas deben crearse mientras la versión está en DRAFT,
        // luego se publica (invariante editorial reforzado por trigger).
        await prisma.questionVersion.create({
          data: { id: qvId, questionId, curriculumTopicId: childId, stemContent: [{ type: 'paragraph', order: 0, text: 'q' }], explanationContent: [{ type: 'paragraph', order: 0, text: 'e' }], editorialStatus: 'DRAFT' },
        });
        const correctOptId = randomUUID();
        await prisma.answerOption.create({ data: { id: correctOptId, questionVersionId: qvId, content: { type: 'paragraph', order: 0, text: 'ok' }, displayOrder: 0, isCorrect: true } });
        await prisma.answerOption.create({ data: { id: randomUUID(), questionVersionId: qvId, content: { type: 'paragraph', order: 0, text: 'no' }, displayOrder: 1, isCorrect: false } });
        await prisma.questionVersion.update({ where: { id: qvId }, data: { editorialStatus: 'PUBLISHED', publishedAt: new Date() } });
        questionVersionIds.push(qvId);
        correctByQv.set(qvId, correctOptId);
      }
      resources.push({ topicId: childId, learningResourceId: resourceId, questionVersionIds, correctByQv });
    }
    return { rootId, resources };
  }

  const topicProgressRepo = new CurriculumTopicProgressRepository(svcPrisma);
  const responseRepo = new StudentResponseRepository(svcPrisma);
  const resourceProgressRepo = new LearningResourceProgressRepository(svcPrisma);
  const topicRepo = new CurriculumTopicRepository(svcPrisma);
  const resourceVersionRepo = new LearningResourceVersionRepository(svcPrisma);
  const questionVersionRepo = new QuestionVersionRepository(svcPrisma);
  const answerOptionRepo = new AnswerOptionRepository(svcPrisma);
  const subjectRepo = new SubjectRepository(svcPrisma);
  const outbox = new OutboxService(new OutboxEventRepository(svcPrisma), new ConfigServiceStub() as never);
  const progressService = new ProgressService(
    topicProgressRepo, responseRepo, topicRepo, questionVersionRepo, answerOptionRepo, subjectRepo,
    new PremiumContentPolicy(topicRepo), new EntitlementService(), outbox, resourceVersionRepo, resourceProgressRepo,
  );

  async function countOutbox(accountId: string, eventKey: string): Promise<number> {
    const rows = await raw.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM outbox_event WHERE aggregate_id = $1 AND event_key = $2`,
      accountId, eventKey,
    );
    return rows[0]?.n ?? 0;
  }
  async function answer(accountId: string, res: { topicId: string; questionVersionIds: string[]; correctByQv: Map<string, string> }, index: number) {
    const qvId = res.questionVersionIds[index]!;
    return progressService.submitResponse(accountId, res.topicId, { questionVersionId: qvId, answerOptionId: res.correctByQv.get(qvId)!, operationId: randomUUID() });
  }

  try {
    const unit = await makeUnit(0);
    const [res0, res1] = unit.resources;

    console.log('--- 1. Abrir/leer un recurso NO lo completa ---');
    const accountA = randomUUID();
    check('sin learning_resource_progress antes de responder', (await resourceProgressRepo.findByAccountAndResource(accountA, res0!.learningResourceId)) == null);
    check('sin evento resource_completed antes de responder', (await countOutbox(accountA, 'resource_completed')) === 0);

    console.log('--- 2. Responder SOLO parte de las preguntas NO completa el recurso ---');
    await answer(accountA, res0!, 0);
    await answer(accountA, res0!, 1);
    check(`con ${QUESTIONS_PER_RESOURCE - 1}/${QUESTIONS_PER_RESOURCE} respondidas: sin learning_resource_progress`, (await resourceProgressRepo.findByAccountAndResource(accountA, res0!.learningResourceId)) == null);
    check('sin evento resource_completed todavía', (await countOutbox(accountA, 'resource_completed')) === 0);
    const partialStatus = await progressService.getTopicProgress(accountA, res0!.topicId);
    check('tema-recurso aún IN_PROGRESS / NOT_STARTED', partialStatus.status !== 'COMPLETED');

    console.log('--- 3. Responder la ÚLTIMA pregunta completa el recurso automáticamente ---');
    await answer(accountA, res0!, QUESTIONS_PER_RESOURCE - 1);
    const lrp = await resourceProgressRepo.findByAccountAndResource(accountA, res0!.learningResourceId);
    check('learning_resource_progress creado (COMPLETED)', lrp != null);
    check('exactamente 1 evento resource_completed', (await countOutbox(accountA, 'resource_completed')) === 1);
    check('exactamente 1 evento curriculum_topic_completed', (await countOutbox(accountA, 'curriculum_topic_completed')) === 1);
    const finalStatus = await progressService.getTopicProgress(accountA, res0!.topicId);
    check('tema-recurso ahora COMPLETED', finalStatus.status === 'COMPLETED');

    console.log('--- 4. Completar un recurso NO completa el otro recurso de la misma unidad ---');
    const res1Progress = await topicProgressRepo.findByAccountAndTopic(accountA, res1!.topicId);
    check('el segundo recurso NO tiene curriculum_topic_progress COMPLETED', res1Progress == null || res1Progress.status !== 'COMPLETED');
    check('el segundo recurso NO tiene learning_resource_progress', (await resourceProgressRepo.findByAccountAndResource(accountA, res1!.learningResourceId)) == null);

    console.log('--- 5. Re-enviar una respuesta ya dada: idempotente, sin duplicar completitud ---');
    const qv0 = res0!.questionVersionIds[0]!;
    await progressService.submitResponse(accountA, res0!.topicId, { questionVersionId: qv0, answerOptionId: res0!.correctByQv.get(qv0)!, operationId: randomUUID() });
    check('sigue habiendo exactamente 1 evento resource_completed', (await countOutbox(accountA, 'resource_completed')) === 1);
    check('sigue habiendo exactamente 1 evento curriculum_topic_completed', (await countOutbox(accountA, 'curriculum_topic_completed')) === 1);
    const lrpCount = await raw.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM learning_resource_progress WHERE account_id = $1 AND learning_resource_id = $2`,
      accountA, res0!.learningResourceId,
    );
    check('exactamente 1 fila learning_resource_progress', (lrpCount[0]?.n ?? 0) === 1);
  } finally {
    // Limpieza -- SÓLO el estado mutable (respuestas, progreso, eventos). El
    // contenido editorial PUBLISHED (`question_version`/`learning_resource_
    // version`) es PERMANENTEMENTE inmutable por diseño (trigger
    // "invariante 3: borrar es la forma más destructiva de modificar") --
    // mismo criterio que `verify-resource-completion-gate.ts` y
    // `verify-catalogue-unlock-requirements-gate.ts`: los fixtures de
    // contenido quedan como residuo PERMANENTE en la gate DB, identificables
    // por el prefijo `B6RQF.*` / `b6rqf-*`.
    const allTopics = createdTopicIds;
    await raw.$queryRawUnsafe(`DELETE FROM student_response WHERE question_version_id IN (SELECT id FROM question_version WHERE curriculum_topic_id = ANY($1))`, allTopics);
    await raw.$queryRawUnsafe(`DELETE FROM curriculum_topic_progress WHERE curriculum_topic_id = ANY($1)`, allTopics);
    await raw.$queryRawUnsafe(`DELETE FROM learning_resource_progress WHERE learning_resource_id = ANY($1)`, createdResourceIds);
    await raw.$queryRawUnsafe(`DELETE FROM outbox_event WHERE payload->>'curriculumTopicId' = ANY($1) OR payload->>'learningResourceId' = ANY($2)`, allTopics, createdResourceIds);
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de completitud-de-recurso-por-flujo-de-preguntas pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
