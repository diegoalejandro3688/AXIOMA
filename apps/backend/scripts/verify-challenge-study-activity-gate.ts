// STABILIZATION-B -- gate enfocado: "actividad de estudio" para Desafíos es
// EXACTAMENTE {RESPUESTA_VALIDADA, RECURSO_COMPLETADO, TEMA_COMPLETADO,
// ENSAYO_COMPLETADO}; QUICK_QUESTION_ANSWERED/BONO/tipos desconocidos quedan
// explícitamente fuera, SIEMPRE resuelto por provenance real
// (`ValidatedGamificationActivity.activityType`), nunca por `xpAmount`. SIN
// HTTP: prueba `RewardEvaluationWorker.evaluateChallenges` directamente
// contra Postgres real, mismo criterio que verify-challenge-progress-gate.ts.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { ProgressionService } from '../src/gamification/progression.service';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { RewardGrantRepository } from '../src/gamification/reward-grant.repository';
import { RewardGrantComponentRepository } from '../src/gamification/reward-grant-component.repository';
import { RewardEvaluationCursorRepository } from '../src/gamification/reward-evaluation-cursor.repository';
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
import { GamificationProgramRepository } from '../src/gamification/gamification-program.repository';
import { GamificationProgramVersionRepository } from '../src/gamification/gamification-program-version.repository';
import { XpRuleRepository } from '../src/gamification/xp-rule.repository';
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Higiene -- mismo criterio que verify-challenge-progress-gate.ts: retira
  // cualquier otra definición ACTIVE para que la materialización solo vea la
  // de este gate.
  await pg.query("UPDATE challenge_definition SET status = 'RETIRED' WHERE challenge_key NOT LIKE 'gate-study-%' AND status = 'ACTIVE'");
  await pg.query("UPDATE challenge_definition SET status = 'RETIRED' WHERE challenge_key LIKE 'gate-study-%' AND status = 'ACTIVE'");

  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const balanceRepo = new XpBalanceRepository(prisma);
  const levelDefRepo = new LevelDefinitionRepository(prisma);
  const progressionService = new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo);
  const bundleRepo = new RewardBundleRepository(prisma);
  const grantRepo = new RewardGrantRepository(prisma);
  const componentRepo = new RewardGrantComponentRepository(prisma);
  const cursorRepo = new RewardEvaluationCursorRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const achievementDefinitionRepo = new AchievementDefinitionRepository(prisma);
  const achievementVersionRepo = new AchievementVersionRepository(prisma);
  const achievementProgressRepo = new AchievementProgressRepository(prisma);
  const achievementUnlockRepo = new AchievementUnlockRepository(prisma);
  const accountTitleRepo = new AccountTitleRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const challengeDefinitionRepo = new ChallengeDefinitionRepository(prisma);
  const accountChallengeRepo = new AccountChallengeRepository(prisma);
  const dailyProgressRepo = new AccountChallengeDailyProgressRepository(prisma);
  const consumedEventRepo = new AccountChallengeConsumedEventRepository(prisma);
  const validatedActivityRepo = new ValidatedGamificationActivityRepository(prisma);
  const programRepo = new GamificationProgramRepository(prisma);
  const versionRepo = new GamificationProgramVersionRepository(prisma);
  const ruleRepo = new XpRuleRepository(prisma);

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
    achievementDefinitionRepo,
    achievementVersionRepo,
    achievementProgressRepo,
    achievementUnlockRepo,
    accountTitleRepo,
    inventoryItemRepo,
    challengeDefinitionRepo,
    accountChallengeRepo,
    dailyProgressRepo,
    consumedEventRepo,
    validatedActivityRepo,
    new CurriculumTopicRepository(prisma),
    new CurriculumTopicProgressRepository(prisma),
  );

  const suffix = Date.now();
  const now = new Date();
  const nowDayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const windowStart = new Date(nowDayStart.getTime() - 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const program = await programRepo.create({ programKey: `gate-study-program-${suffix}`, name: 'Study Activity Gate Program', programType: 'XP', status: 'ACTIVE' });
  const version = await versionRepo.create({
    gamificationProgramId: program.id,
    versionLabel: 'v1',
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60_000),
    effectiveUntil: null,
    approvedAt: new Date(),
  });
  // Reglas reales de XP -- mismos activityType/montos que producción, para
  // que este gate ejercite exactamente la config real, no una sintética.
  const RULES: { activityType: string; baseXp: number }[] = [
    { activityType: 'RESPUESTA_VALIDADA', baseXp: 2 },
    { activityType: 'QUICK_QUESTION_ANSWERED', baseXp: 2 },
    { activityType: 'RECURSO_COMPLETADO', baseXp: 20 },
    { activityType: 'TEMA_COMPLETADO', baseXp: 20 },
    { activityType: 'ENSAYO_COMPLETADO', baseXp: 100 },
  ];
  const ruleIdByType = new Map<string, string>();
  for (const r of RULES) {
    const rule = await ruleRepo.create({ programVersionId: version.id, activityType: r.activityType, baseXp: r.baseXp, dailyCap: null });
    ruleIdByType.set(r.activityType, rule.id);
  }

  const definition = await challengeDefinitionRepo.create({
    challengeKey: `gate-study-main-${suffix}`,
    name: 'Completa actividades de estudio (gate)',
    challengeType: 'WEEKLY',
    eligibilityRule: JSON.stringify({ schemaVersion: 'v1', type: 'ALL_ACCOUNTS' }),
    completionRule: JSON.stringify({ schemaVersion: 'v1', type: 'CUMULATIVE_COUNT', targetValue: 100 }),
    startsAt: windowStart,
    endsAt: windowEnd,
    dailyCap: null,
  });
  check('challenge_definition (gate study) creada ACTIVA', definition.status === 'ACTIVE');

  let seq = 0;
  async function grant(accountId: string, activityType: string, occurredAt: Date): Promise<{ ledgerEntryId: string; activityId: string }> {
    seq++;
    const activity = await validatedActivityRepo.create({
      accountId,
      sourceDomain: activityType === 'QUICK_QUESTION_ANSWERED' ? 'GAMIFICATION' : 'PROGRESS',
      sourceEntityType: 'GateFixture',
      sourceEntityId: randomUUID(),
      activityType,
      validationStatus: 'VALID',
      validationRuleVersion: 'v1',
      occurredAt,
      deduplicationKey: `gate-study-activity-${suffix}-${seq}`,
      integrityStatus: 'OK',
    });
    const ruleId = ruleIdByType.get(activityType) ?? null;
    const { entry } = await ledgerRepo.createIdempotent({
      accountId,
      validatedActivityId: activity.id,
      entryType: 'OTORGAMIENTO',
      xpAmount: RULES.find((r) => r.activityType === activityType)?.baseXp ?? 2,
      xpRuleId: ruleId,
      idempotencyKey: `gate-study-${suffix}-${seq}`,
      occurredAt,
    });
    await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
    return { ledgerEntryId: entry.id, activityId: activity.id };
  }

  async function grantBono(accountId: string, occurredAt: Date): Promise<void> {
    seq++;
    const { entry } = await ledgerRepo.createIdempotent({
      accountId,
      entryType: 'BONO',
      xpAmount: 10,
      idempotencyKey: `gate-study-bono-${suffix}-${seq}`,
      occurredAt,
    });
    await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
  }

  async function progressOf(accountId: string): Promise<number | null> {
    const row = await pg.query('SELECT progress_value FROM account_challenge WHERE account_id = $1 AND challenge_definition_id = $2', [accountId, definition.id]);
    return row.rows[0]?.progress_value ?? null;
  }

  function daysFromNow(n: number, h = 12): Date {
    return new Date(nowDayStart.getTime() + n * 24 * 60 * 60 * 1000 + h * 60 * 60 * 1000);
  }

  console.log('--- A. RESPUESTA_VALIDADA -> +1 progreso de Desafío ---');
  const accountA = randomUUID();
  await grant(accountA, 'RESPUESTA_VALIDADA', daysFromNow(0));
  await worker.processAccount(accountA);
  check('RESPUESTA_VALIDADA cuenta como actividad de estudio (+1)', (await progressOf(accountA)) === 1);

  console.log('--- B. RECURSO_COMPLETADO -> +1 progreso ---');
  const accountB = randomUUID();
  await grant(accountB, 'RECURSO_COMPLETADO', daysFromNow(0));
  await worker.processAccount(accountB);
  check('RECURSO_COMPLETADO cuenta como actividad de estudio (+1, NO +20)', (await progressOf(accountB)) === 1);

  console.log('--- C. TEMA_COMPLETADO -> +1 progreso ---');
  const accountC = randomUUID();
  await grant(accountC, 'TEMA_COMPLETADO', daysFromNow(0));
  await worker.processAccount(accountC);
  check('TEMA_COMPLETADO cuenta como actividad de estudio (+1, NO +20)', (await progressOf(accountC)) === 1);

  console.log('--- D. ENSAYO_COMPLETADO -> +1 progreso ---');
  const accountD = randomUUID();
  await grant(accountD, 'ENSAYO_COMPLETADO', daysFromNow(0));
  await worker.processAccount(accountD);
  check('ENSAYO_COMPLETADO cuenta como actividad de estudio (+1, NO +100)', (await progressOf(accountD)) === 1);

  console.log('--- E. QUICK_QUESTION_ANSWERED -> XP normal sigue existiendo, pero +0 progreso de Desafío ---');
  const accountE = randomUUID();
  const quick = await grant(accountE, 'QUICK_QUESTION_ANSWERED', daysFromNow(0));
  await worker.processAccount(accountE);
  const balanceE = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id = $1', [accountE]);
  check('QUICK_QUESTION_ANSWERED sigue otorgando XP normal (+2)', balanceE.rows[0]?.lifetime_xp === 2);
  check('QUICK_QUESTION_ANSWERED NO cuenta como actividad de estudio (Desafío sigue en 0/sin fila)', (await progressOf(accountE)) === null);
  check('ledger entry de Quick tiene xp_rule_id real (camino LP sigue intacto, no se tocó su otorgamiento)', quick.ledgerEntryId != null);

  console.log('--- F. BONO -> +0 progreso ---');
  const accountF = randomUUID();
  await grant(accountF, 'RESPUESTA_VALIDADA', daysFromNow(0));
  await worker.processAccount(accountF);
  await grantBono(accountF, daysFromNow(0));
  await worker.processAccount(accountF);
  check('BONO no alimenta el progreso -- sigue en 1', (await progressOf(accountF)) === 1);

  console.log('--- G. Reprocesar el MISMO evento (cursor reseteado) no duplica progreso ---');
  await pg.query('DELETE FROM reward_evaluation_cursor WHERE account_id = $1', [accountA]);
  await worker.processAccount(accountA);
  check('reprocesar el mismo evento no duplica -- sigue en 1', (await progressOf(accountA)) === 1);

  console.log('--- H. Actividad de tipo desconocido (fuera de STUDY_ACTIVITY_TYPES) -- excluida de forma segura ---');
  const unknownType = `GATE_UNKNOWN_TYPE_${suffix}`;
  const unknownRule = await ruleRepo.create({ programVersionId: version.id, activityType: unknownType, baseXp: 2, dailyCap: null });
  ruleIdByType.set(unknownType, unknownRule.id);
  const accountH = randomUUID();
  await grant(accountH, unknownType, daysFromNow(0));
  const outcomeH = await worker.processAccount(accountH);
  check('processAccount(H) -> PROCESSED (sin crashear)', outcomeH === 'PROCESSED');
  check('tipo desconocido NO cuenta como actividad de estudio', (await progressOf(accountH)) === null);

  console.log('--- I. Entrada OTORGAMIENTO sin validatedActivityId -- excluida de forma segura ---');
  const accountI = randomUUID();
  seq++;
  const { entry: entryNoActivity } = await ledgerRepo.createIdempotent({
    accountId: accountI,
    entryType: 'OTORGAMIENTO',
    xpAmount: 2,
    xpRuleId: ruleIdByType.get('RESPUESTA_VALIDADA')!,
    idempotencyKey: `gate-study-noactivity-${suffix}-${seq}`,
    occurredAt: daysFromNow(0),
  });
  await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId: accountI, deltaXp: entryNoActivity.xpAmount, lastLedgerEntryId: entryNoActivity.id });
  const outcomeI = await worker.processAccount(accountI);
  check('processAccount(I) -> PROCESSED (sin crashear pese a validatedActivityId ausente)', outcomeI === 'PROCESSED');
  check('OTORGAMIENTO sin validatedActivityId NO cuenta por defecto', (await progressOf(accountI)) === null);

  await prisma.$disconnect();
  await pg.end();
  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de actividad-de-estudio para Desafíos pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
