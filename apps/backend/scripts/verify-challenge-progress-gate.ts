// Gate del Bloque III, Incremento 4, sub-incremento 4.b ("Consumo de
// eventos y progresión de desafíos", BLOCK-III-DEFINITION.md §4.16,
// ADR-0019) -- SIN HTTP: prueba directamente el worker/repositorios reales
// contra Postgres real, mismo criterio que verify-achievement-progress-unlock-gate.ts
// (2.b). Reclamación (CLAIMED), endpoints y superficie móvil quedan fuera,
// verificado explícitamente al final.
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
import { GamificationProgramRepository } from '../src/gamification/gamification-program.repository';
import { GamificationProgramVersionRepository } from '../src/gamification/gamification-program-version.repository';
import { XpRuleRepository } from '../src/gamification/xp-rule.repository';
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
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

  // Higiene entre corridas -- mismo criterio que 2.a/2.b con
  // achievement_definition. Este gate ejecuta evaluación REAL
  // (RewardEvaluationWorker.evaluateChallenges lee TODAS las
  // challenge_definition ACTIVAS) -- cualquier fila ACTIVA con
  // eligibility_rule/completion_rule no-JSON de OTRO gate (p. ej.
  // verify-challenge-foundation-gate.ts, 4.a) interferiría. Se retira
  // cualquier definición ACTIVA que no siga la convención de nombres de
  // ESTE gate, además de las propias de corridas anteriores.
  await pg.query("UPDATE challenge_definition SET status = 'RETIRED' WHERE challenge_key NOT LIKE 'gate-4b-%' AND status = 'ACTIVE'");
  await pg.query("UPDATE challenge_definition SET status = 'RETIRED' WHERE challenge_key LIKE 'gate-4b-%' AND status = 'ACTIVE'");

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
  );

  const suffix = Date.now();
  const now = new Date();

  console.log('--- 0. Fixtures: xp_rule real (OTORGAMIENTO exige xp_rule_id) y challenge_definition CUMULATIVE_COUNT/ALL_ACCOUNTS ---');
  const program = await programRepo.create({ programKey: `gate-4b-program-${suffix}`, name: 'Challenge Gate Program', programType: 'XP', status: 'ACTIVE' });
  const version = await versionRepo.create({
    gamificationProgramId: program.id,
    versionLabel: 'v1',
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60_000),
    effectiveUntil: null,
    approvedAt: new Date(),
  });
  const rule = await ruleRepo.create({ programVersionId: version.id, activityType: `GATE_4B_ACTIVITY_${suffix}`, baseXp: 10, dailyCap: null });

  let entrySeq = 0;
  async function grantOtorgamiento(accountId: string, occurredAt: Date): Promise<{ id: string }> {
    entrySeq++;
    const { entry } = await ledgerRepo.createIdempotent({
      accountId,
      entryType: 'OTORGAMIENTO',
      xpAmount: 10,
      xpRuleId: rule.id,
      idempotencyKey: `gate-4b-${suffix}-${entrySeq}`,
      occurredAt,
    });
    await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
    return entry;
  }
  async function grantNonEligible(accountId: string, entryType: 'BONO' | 'AJUSTE', occurredAt: Date): Promise<void> {
    entrySeq++;
    const { entry } = await ledgerRepo.createIdempotent({
      accountId,
      entryType,
      xpAmount: 5,
      idempotencyKey: `gate-4b-${suffix}-${entrySeq}`,
      occurredAt,
    });
    await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
  }

  const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const definition = await challengeDefinitionRepo.create({
    challengeKey: `gate-4b-main-${suffix}`,
    name: 'Completa 3 actividades (gate 4.b)',
    challengeType: 'WEEKLY',
    eligibilityRule: JSON.stringify({ schemaVersion: 'v1', type: 'ALL_ACCOUNTS' }),
    completionRule: JSON.stringify({ schemaVersion: 'v1', type: 'CUMULATIVE_COUNT', targetValue: 3 }),
    startsAt: windowStart,
    endsAt: windowEnd,
    dailyCap: 2,
  });
  check('challenge_definition (gate 4.b) creada ACTIVA', definition.status === 'ACTIVE');

  // Días calendario UTC relativos a "ahora" -- la ventana del desafío es
  // [now-1h, now+7d), así que los eventos de prueba deben caer ahí dentro,
  // nunca en fechas absolutas fijas que podrían quedar fuera de ventana.
  const nowDayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  function daysFromNow(n: number, h = 12): Date {
    return new Date(nowDayStart.getTime() + n * 24 * 60 * 60 * 1000 + h * 60 * 60 * 1000);
  }

  console.log('--- 1. Materialización perezosa + progresión ACCEPTED -> IN_PROGRESS por el primer evento elegible ---');
  const accountA = randomUUID();
  await grantOtorgamiento(accountA, daysFromNow(0));
  const outcomeA1 = await worker.processAccount(accountA);
  check('processAccount(A) -> PROCESSED', outcomeA1 === 'PROCESSED');

  const accountChallengeA = await accountChallengeRepo.findByAccountAndChallenge(accountA, definition.id, definition.startsAt);
  check('account_challenge materializada perezosamente (sin acción explícita del estudiante)', accountChallengeA !== null);
  check('acceptedAt fijado automáticamente', accountChallengeA?.acceptedAt != null);
  check('challengeStatus avanzó ACCEPTED -> IN_PROGRESS tras la primera contribución', accountChallengeA?.challengeStatus === 'IN_PROGRESS');
  check('progressValue == 1', accountChallengeA?.progressValue === 1);

  console.log('--- 2. Segunda y tercera contribución (días distintos) completan el desafío ---');
  await grantOtorgamiento(accountA, daysFromNow(1));
  await grantOtorgamiento(accountA, daysFromNow(2));
  const outcomeA2 = await worker.processAccount(accountA);
  check('processAccount(A) -> PROCESSED', outcomeA2 === 'PROCESSED');

  const accountChallengeACompleted = await accountChallengeRepo.findById(accountChallengeA!.id);
  check('progressValue == 3 (targetValue)', accountChallengeACompleted?.progressValue === 3);
  check('challengeStatus == COMPLETED', accountChallengeACompleted?.challengeStatus === 'COMPLETED');
  check('completedAt fijado', accountChallengeACompleted?.completedAt != null);
  check('claimedAt SIGUE null -- 4.b nunca reclama (fuera de alcance)', accountChallengeACompleted?.claimedAt == null);

  console.log('--- 3. Idempotencia de lote: reprocesar los MISMOS eventos (cursor reseteado) no duplica progreso ni consumo ---');
  const consumedCountBefore = await pg.query('SELECT count(*)::int AS n FROM account_challenge_consumed_event WHERE account_challenge_id = $1', [
    accountChallengeA!.id,
  ]);
  await pg.query('DELETE FROM reward_evaluation_cursor WHERE account_id = $1', [accountA]);
  const outcomeA3 = await worker.processAccount(accountA);
  check('reintento (cursor reseteado) -> PROCESSED', outcomeA3 === 'PROCESSED');
  const accountChallengeARetried = await accountChallengeRepo.findById(accountChallengeA!.id);
  check('progressValue SIGUE en 3 (no se duplicó)', accountChallengeARetried?.progressValue === 3);
  check('completedAt SIN CAMBIOS (mismo valor, no se re-disparó)', accountChallengeARetried?.completedAt?.getTime() === accountChallengeACompleted?.completedAt?.getTime());
  const consumedCountAfter = await pg.query('SELECT count(*)::int AS n FROM account_challenge_consumed_event WHERE account_challenge_id = $1', [
    accountChallengeA!.id,
  ]);
  check('CERO filas nuevas de consumo (los 3 eventos ya estaban marcados)', consumedCountAfter.rows[0].n === consumedCountBefore.rows[0].n);

  console.log('--- 4. daily_cap real: 3 eventos el MISMO día calendario UTC, tope = 2 -> solo 2 contribuyen, los 3 quedan CONSUMIDOS ---');
  const accountB = randomUUID();
  const sameDayIndex = 4; // dentro de la ventana (windowEnd = now+7d)
  await grantOtorgamiento(accountB, daysFromNow(sameDayIndex, 6));
  await grantOtorgamiento(accountB, daysFromNow(sameDayIndex, 14));
  await grantOtorgamiento(accountB, daysFromNow(sameDayIndex, 20));
  const outcomeB = await worker.processAccount(accountB);
  check('processAccount(B) -> PROCESSED', outcomeB === 'PROCESSED');

  const accountChallengeB = await accountChallengeRepo.findByAccountAndChallenge(accountB, definition.id, definition.startsAt);
  check('progressValue == 2 (tope diario, no 3)', accountChallengeB?.progressValue === 2);
  check('challengeStatus == IN_PROGRESS (NO completado -- el tope se lo impidió)', accountChallengeB?.challengeStatus === 'IN_PROGRESS');
  const dailyRowB = await dailyProgressRepo.findByAccountChallengeAndDate(accountChallengeB!.id, new Date(nowDayStart.getTime() + sameDayIndex * 24 * 60 * 60 * 1000));
  check('account_challenge_daily_progress.contributionCount == 2 (tope respetado)', dailyRowB?.contributionCount === 2);
  const consumedCountB = await pg.query('SELECT count(*)::int AS n FROM account_challenge_consumed_event WHERE account_challenge_id = $1', [
    accountChallengeB!.id,
  ]);
  check('§4.16(e): los 3 eventos quedaron CONSUMIDOS aunque solo 2 contribuyeron', consumedCountB.rows[0].n === 3);

  console.log('--- 5. Solo OTORGAMIENTO es elegible -- BONO/AJUSTE nunca materializan ni contribuyen ---');
  const accountC = randomUUID();
  await grantNonEligible(accountC, 'BONO', now);
  await grantNonEligible(accountC, 'AJUSTE', now);
  const outcomeC = await worker.processAccount(accountC);
  check('processAccount(C) -> PROCESSED', outcomeC === 'PROCESSED');
  const accountChallengeC = await accountChallengeRepo.findByAccountAndChallenge(accountC, definition.id, definition.startsAt);
  check('NINGÚN account_challenge materializado para C (BONO/AJUSTE no son elegibles)', accountChallengeC === null);

  console.log('--- 6. Evento fuera de la ventana del desafío (Gate 18) -- no materializa, no contribuye ---');
  const accountD = randomUUID();
  await grantOtorgamiento(accountD, new Date(windowStart.getTime() - 24 * 60 * 60 * 1000)); // 1 día ANTES de startsAt
  const outcomeD = await worker.processAccount(accountD);
  check('processAccount(D) -> PROCESSED', outcomeD === 'PROCESSED');
  const accountChallengeD = await accountChallengeRepo.findByAccountAndChallenge(accountD, definition.id, definition.startsAt);
  check('NINGÚN account_challenge materializado para D (evento antes de starts_at)', accountChallengeD === null);

  console.log('--- 7. Aislamiento: completion_rule/eligibility_rule inválida falla SOLO esa definición, no las demás ---');
  const badCompletionDefinition = await challengeDefinitionRepo.create({
    challengeKey: `gate-4b-bad-completion-${suffix}`,
    name: 'Definición con completion_rule inválida (gate 4.b)',
    challengeType: 'WEEKLY',
    eligibilityRule: JSON.stringify({ schemaVersion: 'v1', type: 'ALL_ACCOUNTS' }),
    completionRule: 'no es JSON válido',
    startsAt: windowStart,
    endsAt: windowEnd,
  });
  const badEligibilityDefinition = await challengeDefinitionRepo.create({
    challengeKey: `gate-4b-bad-eligibility-${suffix}`,
    name: 'Definición con eligibility_rule inválida (gate 4.b)',
    challengeType: 'WEEKLY',
    eligibilityRule: JSON.stringify({ schemaVersion: 'v1', type: 'SOME_UNSUPPORTED_TYPE' }),
    completionRule: JSON.stringify({ schemaVersion: 'v1', type: 'CUMULATIVE_COUNT', targetValue: 1 }),
    startsAt: windowStart,
    endsAt: windowEnd,
  });
  check('definiciones inválidas (gate 4.b) creadas', Boolean(badCompletionDefinition.id) && Boolean(badEligibilityDefinition.id));

  const accountE = randomUUID();
  await grantOtorgamiento(accountE, now); // dentro de la ventana de definition, badCompletionDefinition Y badEligibilityDefinition (todas ACTIVAS y solapadas)
  const outcomeE = await worker.processAccount(accountE);
  check('processAccount(E) -> FAILED (las dos definiciones inválidas hacen fallar el lote)', outcomeE === 'FAILED');

  const accountChallengeEGood = await accountChallengeRepo.findByAccountAndChallenge(accountE, definition.id, definition.startsAt);
  check('la definición VÁLIDA igual progresó para E pese al fallo de las otras dos (aislamiento real)', accountChallengeEGood?.progressValue === 1);
  const accountChallengeEBadCompletion = await accountChallengeRepo.findByAccountAndChallenge(accountE, badCompletionDefinition.id, badCompletionDefinition.startsAt);
  check('NINGÚN account_challenge para la definición con completion_rule inválida', accountChallengeEBadCompletion === null);
  const accountChallengeEBadEligibility = await accountChallengeRepo.findByAccountAndChallenge(accountE, badEligibilityDefinition.id, badEligibilityDefinition.startsAt);
  check('NINGÚN account_challenge para la definición con eligibility_rule inválida (§4.16(c): no se ignora, se valida)', accountChallengeEBadEligibility === null);

  // Retirar las definiciones inválidas para que no interfieran con corridas futuras de este gate.
  await pg.query("UPDATE challenge_definition SET status = 'RETIRED' WHERE id = ANY($1)", [[badCompletionDefinition.id, badEligibilityDefinition.id]]);

  console.log('--- 8. DailyActivitySignalReader: independiente de la racha de presentación (verificación estática) ---');
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const readerContents = readFileSync(join(gamificationDir, 'daily-activity-signal.reader.ts'), 'utf8');
  check('DailyActivitySignalReader NUNCA llama computeStreak()', !readerContents.includes('computeStreak('));
  check('DailyActivitySignalReader SÍ reutiliza utcDayKey (no duplica la noción de día)', readerContents.includes('utcDayKey'));

  console.log('--- 9. Fuera de alcance de 4.b: el WORKER PERIÓDICO nunca reclama (CLAIMED es una acción síncrona de 4.c, §4.17) ---');
  const workerContents = readFileSync(join(gamificationDir, 'reward-evaluation.worker.ts'), 'utf8');
  check('reward-evaluation.worker.ts nunca asigna claimedAt', !workerContents.includes('claimedAt'));
  const claimedAssignmentPattern = /challengeStatus:\s*'CLAIMED'/;
  check('ninguna asignación literal challengeStatus: CLAIMED en el worker', !claimedAssignmentPattern.test(workerContents));
  // Nota (corrección encontrada al implementar 4.c, §4.17): esta sección
  // originalmente también afirmaba que `account-challenge.repository.ts`
  // nunca escribía `claimedAt`/`CLAIMED` -- cierto mientras CLAIMED estaba
  // fuera de alcance (4.b). 4.c añade `AccountChallengeRepository.claim`,
  // la única vía autorizada de esa transición (Gate 17 sigue siendo la
  // barrera real) -- esa aserción se retiró aquí, no se contradice: sigue
  // vigente que el WORKER nunca la produce, verificado arriba.

  const controllerFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.controller.ts'));
  let publicExposureFound = false;
  for (const file of controllerFiles) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    if (contents.includes('ChallengeDefinitionRepository') || contents.includes('AccountChallengeRepository') || contents.includes('AccountChallengeConsumedEventRepository')) {
      publicExposureFound = true;
      console.error(`  ${file} expone las tablas de desafíos públicamente`);
    }
  }
  check('ningún controller expone las tablas de desafíos (sin endpoints en 4.b)', !publicExposureFound);

  console.log('--- 10. Frontera de dominio: verificación estática ---');
  const filesToCheck = [
    'reward-evaluation.worker.ts',
    'challenge-rule.ts',
    'daily-activity-signal.reader.ts',
    'account-challenge-consumed-event.repository.ts',
  ];
  const forbiddenSymbols = ['StudentResponse', 'CurriculumTopicProgress', 'PublicProfile', 'equippedTitle', 'equippedCosmetic'];
  let boundaryViolationFound = false;
  for (const file of filesToCheck) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    for (const symbol of forbiddenSymbols) {
      if (contents.includes(symbol)) {
        boundaryViolationFound = true;
        console.error(`  ${file} referencia el símbolo prohibido "${symbol}"`);
      }
    }
  }
  check('ningún archivo nuevo de 4.b referencia PROGRESS/Public Profile/equipamiento', !boundaryViolationFound);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Consumo de Eventos y Progresión de Desafíos (Bloque III, sub-incremento 4.b) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
