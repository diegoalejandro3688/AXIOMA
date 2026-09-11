// WEB-0D.1C-B2 -- claves pseudonimizadas v2 para escrituras NUEVAS de
// GAMIFICATION + compatibilidad de doble lectura con la forma legacy
// (accountId crudo). Híbrido: HTTP real contra el relay de Outbox para
// ValidatedGamificationActivity.deduplicationKey, y construcción directa
// de RewardEvaluationWorker (mismo patrón que
// verify-reward-delivery-xp-bonus-gate.ts) para RewardGrant/AccountTitle
// -- ambos casos ejercitan el código de PRODUCCIÓN real, nunca un mock.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { assertGateDb } from './gate-db-safety';
import { gamificationActorRef } from '../src/gamification/gamification-actor-ref';
import { analyticsActorRef } from '../src/analytics/analytics-actor-ref';
import { buildActivityDedupKeyV2, buildLegacyActivityDedupKey, buildRewardSourceIdV2, buildLegacyRewardSourceId } from '../src/gamification/gamification-key';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { ProgressionService } from '../src/gamification/progression.service';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { RewardGrantRepository } from '../src/gamification/reward-grant.repository';
import { RewardGrantComponentRepository } from '../src/gamification/reward-grant-component.repository';
import { RewardEvaluationCursorRepository } from '../src/gamification/reward-evaluation-cursor.repository';
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import { AchievementProgressRepository } from '../src/gamification/achievement-progress.repository';
import { AchievementUnlockRepository } from '../src/gamification/achievement-unlock.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { AccountChallengeRepository } from '../src/gamification/account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from '../src/gamification/account-challenge-daily-progress.repository';
import { AccountChallengeConsumedEventRepository } from '../src/gamification/account-challenge-consumed-event.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { CurriculumTopicRepository } from '../src/education/curriculum-topic.repository';
import { CurriculumTopicProgressRepository } from '../src/progress/curriculum-topic-progress.repository';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { TitleEligibilityService } from '../src/gamification/title-eligibility.service';
import { SubjectCompletionService } from '../src/gamification/subject-completion.service';
import { SubjectRepository } from '../src/education/subject.repository';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3001';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    failures++;
    console.error(`FALLO  ${label}`);
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

async function createSession(uidSuffix: string): Promise<{ accountId: string }> {
  const uid = `gwck-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return { accountId: session.body.accountId as string };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  const suffix = `${Date.now()}`;
  const now = new Date();

  // Secretos de PRUEBA únicamente -- nunca un valor real, nunca leído de
  // env aquí (el gate construye sus propias claves esperadas de forma
  // independiente al código de producción, que SÍ lee GAMIFICATION_ACTOR_SECRET
  // de `.env.gates`). Deben ser el MISMO valor que `.env.gates` provee
  // para que las claves v2 que este gate construye coincidan con las que
  // el servidor real persiste.
  const gamificationSecret = process.env.GAMIFICATION_ACTOR_SECRET ?? '';
  check('preflight: GAMIFICATION_ACTOR_SECRET presente en el entorno de gates', gamificationSecret.length > 0);
  const analyticsSecret = process.env.ANALYTICS_ACTOR_SECRET ?? '';

  // ==========================================================================
  console.log('--- 1. Separación de dominio de secretos (§17) ---');
  const accountX = randomUUID();
  check('1.a mismo accountId + secreto GAMIFICATION => gamificationActorRef estable', gamificationActorRef(accountX, gamificationSecret) === gamificationActorRef(accountX, gamificationSecret));
  check(
    '1.b mismo accountId + secreto ANALYTICS => analyticsActorRef DISTINTO del gamificationActorRef',
    analyticsActorRef(accountX, analyticsSecret) !== gamificationActorRef(accountX, gamificationSecret),
  );

  // ==========================================================================
  console.log('--- 2. ValidatedGamificationActivity -- claves v2 para los 3 tipos afectados (§14.A) ---');
  const activityRepo = new ValidatedGamificationActivityRepository(prisma);

  async function relayCurriculumTopicCompleted(accountId: string, curriculumTopicId: string): Promise<void> {
    const outboxId = randomUUID();
    await pg.query(
      `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
       VALUES ($1, 'curriculum_topic_completed', 'v1', 'PROGRESS', $2, now(), $3)`,
      [outboxId, accountId, JSON.stringify({ accountId, curriculumTopicId, completedAt: now.toISOString() })],
    );
    const relay = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
    if (relay.status !== 200) throw new Error(`relay falló: ${relay.status} ${relay.raw}`);
  }
  async function relayExamCompleted(accountId: string, examId: string): Promise<void> {
    const outboxId = randomUUID();
    await pg.query(
      `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
       VALUES ($1, 'exam_completed', 'v1', 'EXAMS', $2, now(), $3)`,
      [outboxId, accountId, JSON.stringify({ accountId, examAttemptId: randomUUID(), examId, completedAt: now.toISOString() })],
    );
    const relay = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
    if (relay.status !== 200) throw new Error(`relay falló: ${relay.status} ${relay.raw}`);
  }
  async function relayResourceCompleted(accountId: string, learningResourceId: string): Promise<void> {
    const outboxId = randomUUID();
    await pg.query(
      `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
       VALUES ($1, 'resource_completed', 'v1', 'PROGRESS', $2, now(), $3)`,
      [outboxId, accountId, JSON.stringify({ accountId, learningResourceProgressId: randomUUID(), learningResourceId, completedAt: now.toISOString() })],
    );
    const relay = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
    if (relay.status !== 200) throw new Error(`relay falló: ${relay.status} ${relay.raw}`);
  }

  const accT = await createSession('topic');
  const topicId = randomUUID();
  await relayCurriculumTopicCompleted(accT.accountId, topicId);
  const expectedTopicKeyV2 = buildActivityDedupKeyV2('curriculum_topic_completed', accT.accountId, () => gamificationSecret, { curriculumTopicId: topicId });
  const topicActivity = await activityRepo.findByDeduplicationKey(expectedTopicKeyV2);
  check('2.a curriculum_topic_completed: deduplicationKey persistida usa v2', topicActivity !== null);
  check('2.a deduplicationKey contiene el marcador v2', expectedTopicKeyV2.includes(':v2:'));
  check('2.a deduplicationKey contiene el gamificationActorRef', expectedTopicKeyV2.includes(gamificationActorRef(accT.accountId, gamificationSecret)));
  check('2.a deduplicationKey NO contiene accountId crudo', !expectedTopicKeyV2.includes(accT.accountId));

  const accE = await createSession('exam');
  const examId = randomUUID();
  await relayExamCompleted(accE.accountId, examId);
  const expectedExamKeyV2 = buildActivityDedupKeyV2('exam_completed', accE.accountId, () => gamificationSecret, { examId });
  const examActivity = await activityRepo.findByDeduplicationKey(expectedExamKeyV2);
  check('2.b exam_completed: deduplicationKey persistida usa v2, sin accountId crudo', examActivity !== null && !expectedExamKeyV2.includes(accE.accountId));

  const accR = await createSession('resource');
  const resourceId = randomUUID();
  await relayResourceCompleted(accR.accountId, resourceId);
  const expectedResourceKeyV2 = buildActivityDedupKeyV2('resource_completed', accR.accountId, () => gamificationSecret, { learningResourceId: resourceId });
  const resourceActivity = await activityRepo.findByDeduplicationKey(expectedResourceKeyV2);
  check('2.c resource_completed: deduplicationKey persistida usa v2, sin accountId crudo', resourceActivity !== null && !expectedResourceKeyV2.includes(accR.accountId));

  // ==========================================================================
  console.log('--- 3. Formas seguras existentes SIN CAMBIOS (§14.B / §10) ---');
  const accS = await createSession('response');
  const studentResponseId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'student_response_recorded', 'v1', 'PROGRESS', $2, now(), $3)`,
    [randomUUID(), accS.accountId, JSON.stringify({ accountId: accS.accountId, studentResponseId, questionVersionId: randomUUID(), curriculumTopicId: randomUUID(), isCorrect: true, respondedAt: now.toISOString() })],
  );
  const relayS = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
  check('3.a relay status 200', relayS.status === 200);
  const responseActivity = await activityRepo.findByDeduplicationKey(`response:${studentResponseId}`);
  check('3.a student_response_recorded: forma SIN cambios (`response:{id}`, nunca v2, sin accountId)', responseActivity !== null);

  const accQ = await createSession('quick');
  const quickAttemptId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'quick_question_answered', 'v1', 'GAMIFICATION', $2, now(), $3)`,
    [randomUUID(), accQ.accountId, JSON.stringify({ accountId: accQ.accountId, quickQuestionAttemptId: quickAttemptId, quickQuestionSessionId: randomUUID(), questionVersionId: randomUUID(), isCorrect: true })],
  );
  const relayQ = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
  check('3.b relay status 200', relayQ.status === 200);
  const quickActivity = await activityRepo.findByDeduplicationKey(`quick-question:${quickAttemptId}`);
  check('3.b quick_question_answered: forma SIN cambios (`quick-question:{id}`, nunca v2, sin accountId)', quickActivity !== null);

  // ==========================================================================
  console.log('--- 4. Compatibilidad legacy -- ValidatedGamificationActivity (§15) ---');
  // 4.1: sembrar una fila LEGACY (accountId crudo) para exam_completed,
  // luego relayar el MISMO hecho de negocio -- debe reconocerse, NUNCA
  // crear una segunda fila v2.
  const accLegacyExam = await createSession('legacy-exam');
  const legacyExamId = randomUUID();
  const legacyExamKey = buildLegacyActivityDedupKey('exam_completed', { accountId: accLegacyExam.accountId, examId: legacyExamId }) as string;
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'EXAMS', 'ExamAttempt', $3, 'ENSAYO_COMPLETADO', 'PENDING', now(), 'v1', $4, 'NOT_EVALUATED')`,
    [randomUUID(), accLegacyExam.accountId, randomUUID(), legacyExamKey],
  );
  await relayExamCompleted(accLegacyExam.accountId, legacyExamId);
  const legacyExamV2Key = buildActivityDedupKeyV2('exam_completed', accLegacyExam.accountId, () => gamificationSecret, { examId: legacyExamId });
  const v2AfterLegacyExam = await activityRepo.findByDeduplicationKey(legacyExamV2Key);
  const countExamRowsForAccount = await pg.query(
    `SELECT count(*)::int AS n FROM validated_gamification_activity WHERE account_id = $1 AND activity_type = 'ENSAYO_COMPLETADO'`,
    [accLegacyExam.accountId],
  );
  check('4.1.a fila legacy reconocida -- NINGUNA fila v2 nueva se creó', v2AfterLegacyExam === null);
  check('4.1.b exactamente 1 fila total para esta cuenta (la legacy, sin duplicar)', countExamRowsForAccount.rows[0].n === 1);

  // 4.2: repetir el MISMO hecho una segunda vez -- debe seguir
  // reconociendo la legacy (idempotencia sostenida, no solo la primera vez).
  await relayExamCompleted(accLegacyExam.accountId, legacyExamId);
  const countExamRowsAfterRetry = await pg.query(
    `SELECT count(*)::int AS n FROM validated_gamification_activity WHERE account_id = $1 AND activity_type = 'ENSAYO_COMPLETADO'`,
    [accLegacyExam.accountId],
  );
  check('4.2 reintento del mismo hecho -- sigue en exactamente 1 fila', countExamRowsAfterRetry.rows[0].n === 1);

  // 4.3: cuenta NUEVA para el MISMO examId (accountId distinto) -- v2 SÍ debe crearse (dedup es por cuenta, no global).
  const accFreshExam = await createSession('fresh-exam');
  await relayExamCompleted(accFreshExam.accountId, legacyExamId);
  const freshExamV2Key = buildActivityDedupKeyV2('exam_completed', accFreshExam.accountId, () => gamificationSecret, { examId: legacyExamId });
  const freshExamActivity = await activityRepo.findByDeduplicationKey(freshExamV2Key);
  check('4.3 cuenta NUEVA sin fila legacy -> v2 dedup normal SÍ funciona (crea la fila v2)', freshExamActivity !== null);

  // 4.4: retry del MISMO hecho v2 fresco -- debe seguir deduplicando sobre v2 (sin duplicar).
  await relayExamCompleted(accFreshExam.accountId, legacyExamId);
  const countFreshExamRows = await pg.query(
    `SELECT count(*)::int AS n FROM validated_gamification_activity WHERE account_id = $1 AND activity_type = 'ENSAYO_COMPLETADO'`,
    [accFreshExam.accountId],
  );
  check('4.4 retry sobre fila v2 fresca -- sigue en exactamente 1 fila (dedup v2 normal)', countFreshExamRows.rows[0].n === 1);

  // Repetir para topic-completed (segunda familia migrada, §15 "prefer all migrated families if practical").
  const accLegacyTopic = await createSession('legacy-topic');
  const legacyTopicId = randomUUID();
  const legacyTopicKey = buildLegacyActivityDedupKey('curriculum_topic_completed', { accountId: accLegacyTopic.accountId, curriculumTopicId: legacyTopicId }) as string;
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'PROGRESS', 'CurriculumTopicProgress', $3, 'TEMA_COMPLETADO', 'PENDING', now(), 'v1', $4, 'NOT_EVALUATED')`,
    [randomUUID(), accLegacyTopic.accountId, legacyTopicId, legacyTopicKey],
  );
  await relayCurriculumTopicCompleted(accLegacyTopic.accountId, legacyTopicId);
  const legacyTopicV2Key = buildActivityDedupKeyV2('curriculum_topic_completed', accLegacyTopic.accountId, () => gamificationSecret, { curriculumTopicId: legacyTopicId });
  const v2AfterLegacyTopic = await activityRepo.findByDeduplicationKey(legacyTopicV2Key);
  const countTopicRows = await pg.query(
    `SELECT count(*)::int AS n FROM validated_gamification_activity WHERE account_id = $1 AND activity_type = 'TEMA_COMPLETADO'`,
    [accLegacyTopic.accountId],
  );
  check('4.5 topic-completed: fila legacy reconocida -- ninguna v2 nueva, exactamente 1 fila total', v2AfterLegacyTopic === null && countTopicRows.rows[0].n === 1);

  // ==========================================================================
  console.log('--- 5. RewardGrant (LEVEL) -- v2 + compatibilidad legacy, worker real (§14.C / §15) ---');

  await pg.query("UPDATE achievement_definition SET status = 'RETIRED' WHERE status = 'ACTIVE'");
  await pg.query("UPDATE level_definition SET status = 'RETIRED' WHERE level_number >= 950000 AND status = 'ACTIVE'");

  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const balanceRepo = new XpBalanceRepository(prisma);
  const levelDefRepo = new LevelDefinitionRepository(prisma);
  const progressionService = new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo);
  const bundleRepo = new RewardBundleRepository(prisma);
  const grantRepo = new RewardGrantRepository(prisma);
  const componentRepo = new RewardGrantComponentRepository(prisma);
  const cursorRepo = new RewardEvaluationCursorRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const accountTitleRepo = new AccountTitleRepository(prisma);
  const worker = new RewardEvaluationWorker(
    prisma,
    ledgerRepo,
    cursorRepo,
    balanceRepo,
    progressionService,
    levelDefRepo,
    bundleRepo,
    grantRepo,
    componentRepo,
    txRunner,
    new AchievementDefinitionRepository(prisma),
    new AchievementVersionRepository(prisma),
    new AchievementProgressRepository(prisma),
    new AchievementUnlockRepository(prisma),
    accountTitleRepo,
    new InventoryItemRepository(prisma),
    new ChallengeDefinitionRepository(prisma),
    new AccountChallengeRepository(prisma),
    new AccountChallengeDailyProgressRepository(prisma),
    new AccountChallengeConsumedEventRepository(prisma),
    new ValidatedGamificationActivityRepository(prisma),
    new CurriculumTopicRepository(prisma),
    new CurriculumTopicProgressRepository(prisma),
    new TitleDefinitionRepository(prisma),
    new TitleEligibilityService(prisma, new SubjectRepository(prisma), new CurriculumTopicRepository(prisma), new CurriculumTopicProgressRepository(prisma), progressionService),
    new SubjectCompletionService(new CurriculumTopicRepository(prisma), new CurriculumTopicProgressRepository(prisma), new SubjectRepository(prisma)),
    undefined, // accountRepo (WEB-0D.1C-B0R) -- no exercitado por este gate
    { get: () => gamificationSecret } as unknown as import('@nestjs/config').ConfigService, // WEB-0D.1C-B2
  );

  let entrySeq = 0;
  async function createEntry(accountId: string, xpAmount: number): Promise<void> {
    entrySeq++;
    const { entry } = await ledgerRepo.createIdempotent({
      accountId,
      entryType: 'AJUSTE',
      xpAmount,
      idempotencyKey: `gwck-gate-${suffix}-${entrySeq}`,
      occurredAt: new Date(),
    });
    await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
  }

  const maxSeededThreshold = (await pg.query('SELECT COALESCE(MAX(minimum_lifetime_xp), 0)::int AS n FROM level_definition')).rows[0].n as number;
  const thresholdBase = maxSeededThreshold + 1000;
  const levelBase = 950_000 + (Date.now() % 40_000);
  const bundleLevel = await bundleRepo.create({
    bundleKey: `gwck-gate-lvl-${suffix}`,
    name: 'Recompensa de gate B2 -- nivel',
    items: [{ componentType: 'XP_BONUS', xpAmount: 15 }],
  });
  await levelDefRepo.create({ levelNumber: levelBase + 1, minimumLifetimeXp: thresholdBase });
  await levelDefRepo.create({ levelNumber: levelBase + 2, minimumLifetimeXp: thresholdBase + 100 });
  await pg.query('UPDATE level_definition SET reward_bundle_id = $1 WHERE level_number = $2', [bundleLevel.id, levelBase + 2]);

  const accLevel = randomUUID();
  await createEntry(accLevel, thresholdBase + 150);
  const levelOutcome = await worker.processAccount(accLevel);
  check('5.a processAccount -> PROCESSED', levelOutcome === 'PROCESSED');

  const expectedLevelSourceId = buildRewardSourceIdV2(accLevel, gamificationSecret, levelBase + 2);
  const expectedLevelIdempotencyKey = `reward:LEVEL:${expectedLevelSourceId}`;
  const levelGrant = await grantRepo.findByIdempotencyKey(expectedLevelIdempotencyKey);
  check('5.b RewardGrant creado con idempotencyKey v2', levelGrant !== null);
  check('5.c sourceEntityId contiene el marcador v2 + gamificationActorRef', expectedLevelSourceId.startsWith('v2:') && expectedLevelSourceId.includes(gamificationActorRef(accLevel, gamificationSecret)));
  check('5.d sourceEntityId NUNCA contiene accountId crudo', !expectedLevelSourceId.includes(accLevel));
  check('5.e idempotencyKey NUNCA contiene accountId crudo', !expectedLevelIdempotencyKey.includes(accLevel));

  // Compatibilidad legacy: sembrar un reward_grant LEGACY para OTRA cuenta
  // en el MISMO nivel, luego procesar esa cuenta -- debe reconocer el
  // grant legacy, NUNCA crear un segundo grant v2 para el mismo hecho.
  const accLegacyLevel = randomUUID();
  const legacySourceId = buildLegacyRewardSourceId(accLegacyLevel, levelBase + 2);
  const legacyIdempotencyKey = `reward:LEVEL:${legacySourceId}`;
  await pg.query(
    `INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key)
     VALUES ($1, $2, $3, 'LEVEL', $4, $5)`,
    [randomUUID(), accLegacyLevel, bundleLevel.id, legacySourceId, legacyIdempotencyKey],
  );
  await createEntry(accLegacyLevel, thresholdBase + 150);
  const legacyLevelOutcome = await worker.processAccount(accLegacyLevel);
  check('5.f processAccount (cuenta con grant LEVEL legacy) -> PROCESSED', legacyLevelOutcome === 'PROCESSED');
  const legacyLevelV2Key = `reward:LEVEL:${buildRewardSourceIdV2(accLegacyLevel, gamificationSecret, levelBase + 2)}`;
  const v2AfterLegacyLevel = await grantRepo.findByIdempotencyKey(legacyLevelV2Key);
  // NUNCA "exactamente 1 reward_grant en TOTAL para la cuenta": el XP de
  // fixture (thresholdBase+150, deliberadamente por encima de TODO umbral
  // real sembrado) también cruza legítimamente los niveles REALES de
  // producción (10, 15, 20...) que ya tienen su propio reward_bundle --
  // esta cuenta gana esos grants igual que ganaría en producción real. La
  // prueba de "sin duplicar" se acota a la clave de negocio bajo prueba
  // (levelBase+2) exclusivamente, nunca al total de la cuenta.
  const countForThisLevel = await pg.query(
    `SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1 AND source_entity_type = 'LEVEL' AND idempotency_key = $2`,
    [accLegacyLevel, legacyIdempotencyKey],
  );
  check('5.g grant LEVEL legacy reconocido -- NINGÚN grant v2 nuevo se creó', v2AfterLegacyLevel === null);
  check('5.h exactamente 1 reward_grant para ESTE nivel de negocio (la legacy, sin duplicar hacia v2)', countForThisLevel.rows[0].n === 1);

  // ==========================================================================
  console.log('--- 6. AccountTitle (TITLE_UNLOCK) -- formato v2 en el mismo repositorio real (§14.C / §11) ---');
  // La idempotencia REAL de account_title es UNIQUE(accountId,
  // titleDefinitionId) -- nunca acquisitionSourceId (ver
  // AccountTitleRepository.createIdempotent) -- así que no hay lectura
  // legacy que probar aquí, solo el FORMATO del valor persistido, con el
  // repositorio de producción real.
  const titleDefRepo = new TitleDefinitionRepository(prisma);
  const titleDef = await titleDefRepo.create({
    titleKey: `gwck-gate-title-${suffix}`,
    displayText: 'Gate Title',
    rarityClass: 'COMMON',
    unlockSourceType: 'TITLE_UNLOCK',
    visibilityStatus: 'PRIVATE',
  });
  const accTitle = randomUUID();
  const titleKey = `gwck-gate-title-${suffix}`;
  const expectedTitleSourceId = buildRewardSourceIdV2(accTitle, gamificationSecret, titleKey);
  await accountTitleRepo.createIdempotent({
    accountId: accTitle,
    titleDefinitionId: titleDef.id,
    acquisitionSourceType: 'TITLE_UNLOCK',
    acquisitionSourceId: expectedTitleSourceId,
    acquiredAt: now,
  });
  const persistedTitle = await accountTitleRepo.findByAccountAndTitle(accTitle, titleDef.id);
  check('6.a AccountTitle creado', persistedTitle !== null);
  check('6.b acquisitionSourceId contiene el marcador v2 + gamificationActorRef', persistedTitle?.acquisitionSourceId.startsWith('v2:') === true && persistedTitle.acquisitionSourceId.includes(gamificationActorRef(accTitle, gamificationSecret)));
  check('6.c acquisitionSourceId NUNCA contiene accountId crudo', persistedTitle?.acquisitionSourceId.includes(accTitle) === false);

  // ==========================================================================
  console.log('--- 7. Barrido: ninguna fila NUEVA de este gate persiste accountId crudo (§16) ---');
  const rawIdSweeps: Array<{ label: string; hasRaw: boolean }> = [
    { label: 'topic activity', hasRaw: expectedTopicKeyV2.includes(accT.accountId) },
    { label: 'exam activity', hasRaw: expectedExamKeyV2.includes(accE.accountId) },
    { label: 'resource activity', hasRaw: expectedResourceKeyV2.includes(accR.accountId) },
    { label: 'fresh exam v2 activity', hasRaw: freshExamV2Key.includes(accFreshExam.accountId) },
    { label: 'level RewardGrant sourceEntityId', hasRaw: expectedLevelSourceId.includes(accLevel) },
    { label: 'level RewardGrant idempotencyKey', hasRaw: expectedLevelIdempotencyKey.includes(accLevel) },
    { label: 'AccountTitle acquisitionSourceId', hasRaw: persistedTitle?.acquisitionSourceId.includes(accTitle) ?? true },
  ];
  for (const { label, hasRaw } of rawIdSweeps) {
    check(`7. ${label}: ninguna clave nueva contiene accountId crudo`, !hasRaw);
  }

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de claves pseudonimizadas de GAMIFICATION (WEB-0D.1C-B2) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
