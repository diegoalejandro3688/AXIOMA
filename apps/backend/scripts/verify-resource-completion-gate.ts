// Gate de XP-V1B-2 -- "Persistencia de completitud de LearningResource".
// Instancia directamente ProgressService (y sus dependencias reales) contra
// DATABASE_URL -- NUNCA producción. Mismo patrón que
// verify-xp-v1-implementation-gate.ts (sin start-gates-server.ts: no ejercita
// HTTP, ejercita el servicio de dominio real).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
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
import { OutboxEventDeliveryRepository } from '../src/platform/outbox/outbox-event-delivery.repository';
import { ProgressService } from '../src/progress/progress.service';
import { GamificationService } from '../src/gamification/gamification.service';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { GamificationProgramRepository } from '../src/gamification/gamification-program.repository';
import { XpRuleRepository } from '../src/gamification/xp-rule.repository';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { XpGrantAttemptRepository } from '../src/gamification/xp-grant-attempt.repository';
import { XpGrantService } from '../src/gamification/xp-grant.service';
import { seedXpV1 } from './seed-xp-v1';

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

  // --- Fixtures: subject + 3 unidades raíz canónicas (unit0/unit1 FREE, unit2 PREMIUM) ---
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const subjectId = randomUUID();
  await prisma.subject.create({
    data: { id: subjectId, subjectKey: `gate-res-${runId}`, name: 'Materia del gate', shortName: 'GATE', displayOrder: 900, status: 'ACTIVE' },
  });

  async function makeCanonicalUnit(order: number): Promise<{ childTopicId: string; learningResourceId: string }> {
    const rootId = randomUUID();
    const childId = randomUUID();
    const resourceId = randomUUID();
    const versionId = randomUUID();
    await prisma.curriculumTopic.create({
      data: { id: rootId, code: `GATE.RES.UNIT${order}.${runId}`, name: `Unidad ${order}`, order, subjectId },
    });
    await prisma.curriculumTopic.create({
      data: { id: childId, code: `GATE.RES.UNIT${order}.C1.${runId}`, name: `Recurso ${order}`, order: 0, subjectId, parentId: rootId },
    });
    await prisma.learningResource.create({
      data: { id: resourceId, resourceKey: `gate-res-${order}-${runId}`, primarySubjectId: subjectId, resourceType: 'LESSON' },
    });
    await prisma.learningResourceVersion.create({
      data: {
        id: versionId,
        learningResourceId: resourceId,
        curriculumTopicId: childId,
        title: `Contenido ${order}`,
        contentBlocks: [{ type: 'paragraph', order: 0, text: 'x' }],
        editorialStatus: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    return { childTopicId: childId, learningResourceId: resourceId };
  }

  const unit0 = await makeCanonicalUnit(0); // FREE_UNIT
  const unit1 = await makeCanonicalUnit(1); // FREE_UNIT (segunda unidad libre)
  const unit2 = await makeCanonicalUnit(2); // PREMIUM_UNIT

  // --- DI manual, mismo patrón que verify-xp-v1-implementation-gate.ts ---
  const topicProgressRepo = new CurriculumTopicProgressRepository(svcPrisma);
  const responseRepo = new StudentResponseRepository(svcPrisma);
  const resourceProgressRepo = new LearningResourceProgressRepository(svcPrisma);
  const topicRepo = new CurriculumTopicRepository(svcPrisma);
  const resourceVersionRepo = new LearningResourceVersionRepository(svcPrisma);
  const questionVersionRepo = new QuestionVersionRepository(svcPrisma);
  const answerOptionRepo = new AnswerOptionRepository(svcPrisma);
  const subjectRepo = new SubjectRepository(svcPrisma);
  const premiumContentPolicy = new PremiumContentPolicy(topicRepo);
  const entitlementService = new EntitlementService();
  const outboxEventRepo = new OutboxEventRepository(svcPrisma);
  const outboxDeliveryRepo = new OutboxEventDeliveryRepository(svcPrisma);
  const outbox = new OutboxService(outboxEventRepo, new ConfigServiceStub() as never);

  const progressService = new ProgressService(
    topicProgressRepo,
    responseRepo,
    topicRepo,
    questionVersionRepo,
    answerOptionRepo,
    subjectRepo,
    premiumContentPolicy,
    entitlementService,
    outbox,
    resourceVersionRepo,
    resourceProgressRepo,
  );

  const activityRepo = new ValidatedGamificationActivityRepository(svcPrisma);
  const gamificationService = new GamificationService(outboxDeliveryRepo, activityRepo);

  // === 1. Primera completitud ===
  const accountA = randomUUID();
  console.log('--- 1. Primera completitud ---');
  const before = await resourceProgressRepo.findByAccountAndResource(accountA, unit0.learningResourceId);
  check('sin fila de progreso antes de completar', before === null);
  const first = await progressService.completeResource(accountA, unit0.childTopicId);
  check('justCompleted = true en la primera llamada', first.justCompleted === true);
  check('completion.status = COMPLETED', first.completion.status === 'COMPLETED');
  const afterRows = await prisma.learningResourceProgress.count({ where: { accountId: accountA, learningResourceId: unit0.learningResourceId } });
  check('exactamente 1 fila de progreso', afterRows === 1);

  const relay1 = await gamificationService.ingestPending();
  check('relay procesó el evento resource_completed', relay1.processed >= 1 && relay1.failed === 0);
  const activities1 = await prisma.validatedGamificationActivity.count({ where: { accountId: accountA, activityType: 'RECURSO_COMPLETADO' } });
  check('exactamente 1 actividad validada RECURSO_COMPLETADO', activities1 === 1);

  // === 2. Repetición idempotente ===
  console.log('--- 2. Repetición idempotente ---');
  const second = await progressService.completeResource(accountA, unit0.childTopicId);
  check('justCompleted = false en el segundo llamado', second.justCompleted === false);
  check('completedAt no cambia', second.completion.completedAt === first.completion.completedAt);
  const rowsAfterRepeat = await prisma.learningResourceProgress.count({ where: { accountId: accountA, learningResourceId: unit0.learningResourceId } });
  check('sigue habiendo exactamente 1 fila', rowsAfterRepeat === 1);
  const relay2 = await gamificationService.ingestPending();
  check('segundo relay: 0 procesados (nada nuevo)', relay2.processed === 0);
  const activities2 = await prisma.validatedGamificationActivity.count({ where: { accountId: accountA, activityType: 'RECURSO_COMPLETADO' } });
  check('sigue habiendo exactamente 1 actividad validada', activities2 === 1);

  // === 3. Doble tap concurrente ===
  console.log('--- 3. Doble tap concurrente ---');
  const accountC = randomUUID();
  const [c1, c2] = await Promise.all([
    progressService.completeResource(accountC, unit1.childTopicId),
    progressService.completeResource(accountC, unit1.childTopicId),
  ]);
  check('ambas solicitudes concurrentes tuvieron éxito (sin 500)', c1.completion.status === 'COMPLETED' && c2.completion.status === 'COMPLETED');
  check('exactamente una de las dos fue justCompleted=true', (c1.justCompleted ? 1 : 0) + (c2.justCompleted ? 1 : 0) === 1);
  const rowsConcurrent = await prisma.learningResourceProgress.count({ where: { accountId: accountC, learningResourceId: unit1.learningResourceId } });
  check('exactamente 1 fila tras la carrera', rowsConcurrent === 1);

  // === 4. Identidad por recurso/cuenta ===
  console.log('--- 4. Identidad (cuenta, recurso) ---');
  const accountB = randomUUID();
  await progressService.completeResource(accountA, unit1.childTopicId); // A completa un segundo recurso
  await progressService.completeResource(accountB, unit0.childTopicId); // B completa el primer recurso
  const totalFacts = await prisma.learningResourceProgress.count({
    where: { accountId: { in: [accountA, accountB, accountC] } },
  });
  check('3 cuentas -> hechos de completitud independientes (>= 3 en total)', totalFacts >= 3);

  // === 5. Independencia de versión editorial ===
  console.log('--- 5. Independencia de versión editorial ---');
  const newVersionId = randomUUID();
  await prisma.learningResourceVersion.update({ where: { id: (await prisma.learningResourceVersion.findFirstOrThrow({ where: { learningResourceId: unit0.learningResourceId } })).id }, data: { editorialStatus: 'DEPRECATED' } });
  await prisma.learningResourceVersion.create({
    data: {
      id: newVersionId,
      learningResourceId: unit0.learningResourceId,
      curriculumTopicId: unit0.childTopicId,
      title: 'Contenido 0 v2',
      contentBlocks: [{ type: 'paragraph', order: 0, text: 'y' }],
      editorialStatus: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
  const compAfterV2 = await progressService.getResourceCompletion(accountA, unit0.childTopicId);
  check('sigue COMPLETED tras nueva versión editorial del mismo recurso', compAfterV2.status === 'COMPLETED');
  const reCompleteAfterV2 = await progressService.completeResource(accountA, unit0.childTopicId);
  check('recompletar tras v2 sigue siendo idempotente (justCompleted=false)', reCompleteAfterV2.justCompleted === false);

  // === 6. Recurso bloqueado (Premium) ===
  console.log('--- 6. Recurso bloqueado (Premium) ---');
  const accountFree = randomUUID();
  let lockedRejected = false;
  try {
    await progressService.completeResource(accountFree, unit2.childTopicId);
  } catch (e) {
    lockedRejected = (e as { getStatus?: () => number }).getStatus?.() === 403;
  }
  check('cuenta FREE no puede completar un recurso de unidad Premium', lockedRejected);
  const lockedRows = await prisma.learningResourceProgress.count({ where: { accountId: accountFree } });
  check('0 filas de progreso para la cuenta bloqueada', lockedRows === 0);

  // === 7. Recurso/tema inexistente ===
  console.log('--- 7. Tema inexistente ---');
  let notFound = false;
  try {
    await progressService.completeResource(accountA, randomUUID());
  } catch (e) {
    notFound = (e as { getStatus?: () => number }).getStatus?.() === 404;
  }
  check('tema inexistente -> 404', notFound);

  // === 8. XP real de extremo a extremo ===
  console.log('--- 8. Recurso real -> +20 XP (camino real, sin actividad falsa) ---');
  // T en el PASADO reciente (no una fecha fija futura): la completitud real
  // de este test ocurre "ahora", así que el cutover debe ser anterior a eso
  // para que sea elegible -- mismo criterio de comparación que producción
  // (activity.occurredAt >= effectiveFrom), nunca al revés.
  const T = new Date(Date.now() - 60_000);
  await seedXpV1({ dryRun: false, effectiveFrom: T });
  const accountXp = randomUUID();
  const xpCompletion = await progressService.completeResource(accountXp, unit0.childTopicId);
  check('completitud real post-cutover', xpCompletion.justCompleted === true);
  await gamificationService.ingestPending();

  const txRunner = new TransactionRunnerService(svcPrisma);
  const programRepo = new GamificationProgramRepository(svcPrisma);
  const ruleRepo = new XpRuleRepository(svcPrisma);
  const ledgerRepo = new XpLedgerEntryRepository(svcPrisma);
  const balanceRepo = new XpBalanceRepository(svcPrisma);
  const attemptRepo = new XpGrantAttemptRepository(svcPrisma);
  const grantService = new XpGrantService(txRunner, programRepo, ruleRepo, activityRepo, ledgerRepo, balanceRepo, attemptRepo);

  const activity = await prisma.validatedGamificationActivity.findFirstOrThrow({
    where: { accountId: accountXp, activityType: 'RECURSO_COMPLETADO' },
  });
  const grantOutcome = await grantService.grantForActivity(activity);
  check('otorgamiento real vía camino real -> XP_GRANTED', grantOutcome.outcome === 'XP_GRANTED');
  let balance = await prisma.xpBalance.findUnique({ where: { accountId: accountXp } });
  check('balance = 20 XP (no 40, no otro valor)', balance?.lifetimeXp === 20);
  const reprocessOutcome = await grantService.grantForActivity(activity);
  check('reprocesar -> sigue XP_GRANTED (idempotente)', reprocessOutcome.outcome === 'XP_GRANTED');
  balance = await prisma.xpBalance.findUnique({ where: { accountId: accountXp } });
  check('balance sigue en 20 XP tras reprocesar (no 40)', balance?.lifetimeXp === 20);

  // === 9. Privacidad / borrado de cuenta ===
  console.log('--- 9. Borrado de cuenta (privacidad) ---');
  await progressService.deleteProgressForAccountClosure(accountXp);
  const rowsAfterDeletion = await prisma.learningResourceProgress.count({ where: { accountId: accountXp } });
  check('0 filas de learning_resource_progress tras el cierre de cuenta', rowsAfterDeletion === 0);

  // === 10. FK / integridad ===
  console.log('--- 10. FK / integridad ---');
  const orphanFk = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT count(*)::int n FROM learning_resource_progress lrp
    LEFT JOIN learning_resource lr ON lr.id = lrp.learning_resource_id
    WHERE lr.id IS NULL`;
  check('0 filas huérfanas learning_resource_progress -> learning_resource', Number(orphanFk[0]!.n) === 0);

  await prisma.$disconnect();
  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de completitud de recursos pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
