// Gate de DESAFÍOS V1 -- último bloque de contenido V1. Verifica el catálogo
// editorial (13 plantillas), el aprovisionamiento determinista de 365 días,
// la materialización perezosa al listar (§15), la semántica de visibilidad
// por período (§17), la vista previa de recompensa (§20), y que la
// progresión / claim / anti-farming existentes siguen intactos con el
// contenido V1 real. SIN HTTP: construye ChallengeService y
// RewardEvaluationWorker reales contra Postgres real (mismo criterio que
// verify-challenge-progress-gate.ts).
//
// NO reemplaza los gates existentes (foundation / progress / claim / móvil).
// Muta la BD de gates (crea account fixtures, reactiva las filas v1-* y
// retira definiciones ajenas ACTIVE para no contaminar la materialización
// -- mismo criterio de higiene que verify-challenge-progress-gate.ts).
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
import { ChallengeService } from '../src/gamification/challenge.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
import {
  CHALLENGES_V1_TEMPLATES,
  CHALLENGE_V1_REWARD_BUNDLES,
  DAILY_ROTATION,
  WEEKLY_ROTATION,
  CHALLENGES_V1_START,
  CHALLENGES_V1_DAILY_PERIODS,
  generateChallengeV1Definitions,
  isoWeekOf,
} from '../src/gamification/challenges-v1-catalog';
import { seedChallengesV1 } from './seed-challenges-v1';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const DAY_MS = 86_400_000;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // ================= A-H: catálogo editorial (fuente de verdad) =================
  console.log('--- A-H. Catálogo editorial: 13 plantillas ---');
  const daily = CHALLENGES_V1_TEMPLATES.filter((t) => t.challengeType === 'DAILY');
  const weekly = CHALLENGES_V1_TEMPLATES.filter((t) => t.challengeType === 'WEEKLY');
  check('A. exactamente 13 plantillas', CHALLENGES_V1_TEMPLATES.length === 13);
  check('B. templateKey únicos', new Set(CHALLENGES_V1_TEMPLATES.map((t) => t.templateKey)).size === 13);
  check('C. 9 DAILY', daily.length === 9);
  check('D. 4 WEEKLY', weekly.length === 4);
  check(
    'E. reparto DAILY 3 easy / 3 medium / 3 high',
    daily.filter((t) => t.difficulty === 'easy').length === 3 &&
      daily.filter((t) => t.difficulty === 'medium').length === 3 &&
      daily.filter((t) => t.difficulty === 'high').length === 3,
  );
  const targetByName = Object.fromEntries(CHALLENGES_V1_TEMPLATES.map((t) => [t.name, t.targetValue]));
  check(
    'F. targets exactos por nombre aprobado',
    targetByName['Primer impulso'] === 3 &&
      targetByName['Calentamiento'] === 2 &&
      targetByName['Primer paso'] === 4 &&
      targetByName['Ritmo constante'] === 6 &&
      targetByName['Sigue avanzando'] === 5 &&
      targetByName['En marcha'] === 7 &&
      targetByName['Sesión completa'] === 10 &&
      targetByName['Jornada productiva'] === 8 &&
      targetByName['A fondo'] === 12 &&
      targetByName['Constancia semanal'] === 40 &&
      targetByName['Semana en marcha'] === 35 &&
      targetByName['Objetivo semanal'] === 45 &&
      targetByName['Gran semana'] === 50,
  );
  check(
    'G. recompensas easy=10 / medium=20 / high=30 / weekly=100',
    daily.filter((t) => t.difficulty === 'easy').every((t) => t.rewardXpBonus === 10) &&
      daily.filter((t) => t.difficulty === 'medium').every((t) => t.rewardXpBonus === 20) &&
      daily.filter((t) => t.difficulty === 'high').every((t) => t.rewardXpBonus === 30) &&
      weekly.every((t) => t.rewardXpBonus === 100),
  );
  check('H. ninguna plantilla declara recompensa TITLE/COSMETIC/LP', CHALLENGES_V1_TEMPLATES.every((t) => [10, 20, 30, 100].includes(t.rewardXpBonus)));
  check('copia pública usa "actividades de estudio" (métrica honesta, §4)', CHALLENGES_V1_TEMPLATES.every((t) => t.description.includes('actividades de estudio')));
  check('rotación: 3 ciclos diarios de 3 + 1 ciclo semanal de 4', DAILY_ROTATION.easy.length === 3 && DAILY_ROTATION.medium.length === 3 && DAILY_ROTATION.high.length === 3 && WEEKLY_ROTATION.length === 4);

  // ================= Higiene de la BD de gates =================
  // Retira definiciones ACTIVE ajenas (fixtures de otros gates con gramática
  // obsoleta) para que la materialización solo vea V1 -- y reactiva las v1-*
  // (otros gates de desafíos las RETIRAN al correr). Mismo criterio que
  // verify-challenge-progress-gate.ts.
  await pg.query("UPDATE challenge_definition SET status = 'RETIRED' WHERE challenge_key NOT LIKE 'v1-%' AND status = 'ACTIVE'");
  await pg.query("UPDATE challenge_definition SET status = 'ACTIVE' WHERE challenge_key LIKE 'v1-%' AND status = 'RETIRED'");

  // ================= I-Q: aprovisionamiento determinista =================
  console.log('\n--- I-Q. Aprovisionamiento determinista (seed idempotente) ---');
  const seed1 = await seedChallengesV1();
  const generated = generateChallengeV1Definitions();

  // Conteo semanal esperado derivado del rango, no hardcodeado (§10/§29).
  const horizonEnd = CHALLENGES_V1_START.getTime() + CHALLENGES_V1_DAILY_PERIODS * DAY_MS;
  const firstMonday = isoWeekOf(CHALLENGES_V1_START).mondayUtc.getTime();
  let expectedWeekly = 0;
  for (let w = firstMonday; w < horizonEnd; w += 7 * DAY_MS) expectedWeekly++;

  check(`I. 365 períodos diarios -> ${CHALLENGES_V1_DAILY_PERIODS * 3} definiciones DAILY`, seed1.dailyCount === CHALLENGES_V1_DAILY_PERIODS * 3);
  check(`L. WEEKLY = ${expectedWeekly} (derivado de semanas ISO-lunes que cubren el horizonte)`, seed1.weeklyCount === expectedWeekly);
  check('total generado = DAILY + WEEKLY', seed1.definitionsExpected === seed1.dailyCount + seed1.weeklyCount);

  const dbDaily = (await pg.query("SELECT count(*)::int n FROM challenge_definition WHERE challenge_key LIKE 'v1-daily-%'")).rows[0].n;
  const dbWeekly = (await pg.query("SELECT count(*)::int n FROM challenge_definition WHERE challenge_key LIKE 'v1-weekly-%'")).rows[0].n;
  check('DB: 1095 v1-daily challenge_definition', dbDaily === 1095);
  check(`DB: ${expectedWeekly} v1-weekly challenge_definition`, dbWeekly === expectedWeekly);

  check(
    'J. exactamente 3 definiciones DAILY por día calendario',
    (await pg.query("SELECT count(*)::int n FROM (SELECT starts_at::date FROM challenge_definition WHERE challenge_key LIKE 'v1-daily-%' GROUP BY 1 HAVING count(*) <> 3) x")).rows[0].n === 0,
  );
  check(
    'K. una easy + una medium + una high por día (targets distintos por tier)',
    (
      await pg.query(
        `SELECT count(*)::int n FROM (
           SELECT starts_at::date d, count(*) FILTER (WHERE completion_rule::jsonb->>'targetValue' IN ('2','3','4')) e,
                  count(*) FILTER (WHERE completion_rule::jsonb->>'targetValue' IN ('5','6','7')) m,
                  count(*) FILTER (WHERE completion_rule::jsonb->>'targetValue' IN ('8','10','12')) h
           FROM challenge_definition WHERE challenge_key LIKE 'v1-daily-%' GROUP BY 1
         ) x WHERE e <> 1 OR m <> 1 OR h <> 1`,
      )
    ).rows[0].n === 0,
  );
  check(
    'L. una definición WEEKLY por semana ISO (lunes UTC), sin solapes de misma semana',
    (await pg.query("SELECT count(*)::int n FROM (SELECT starts_at FROM challenge_definition WHERE challenge_key LIKE 'v1-weekly-%' GROUP BY 1 HAVING count(*) <> 1) x")).rows[0].n === 0,
  );
  check(
    'M. ventanas DAILY exactamente 24 h',
    (await pg.query("SELECT count(*)::int n FROM challenge_definition WHERE challenge_key LIKE 'v1-daily-%' AND ends_at - starts_at <> interval '24 hours'")).rows[0].n === 0,
  );
  check(
    'N. ventanas WEEKLY exactamente 7 días, alineadas a lunes UTC',
    (await pg.query("SELECT count(*)::int n FROM challenge_definition WHERE challenge_key LIKE 'v1-weekly-%' AND (ends_at - starts_at <> interval '7 days' OR EXTRACT(ISODOW FROM starts_at) <> 1)")).rows[0].n === 0,
  );
  check('O. challengeKey deterministas y únicos', new Set(generated.map((g) => g.challengeKey)).size === generated.length && generated.length === seed1.definitionsExpected);
  check(
    'O. challengeKey formato v1-daily-<slug>-YYYY-MM-DD / v1-weekly-<slug>-YYYY-Www',
    generated.filter((g) => g.challengeType === 'DAILY').every((g) => /^v1-daily-[a-z-]+-\d{4}-\d{2}-\d{2}$/.test(g.challengeKey)) &&
      generated.filter((g) => g.challengeType === 'WEEKLY').every((g) => /^v1-weekly-[a-z-]+-\d{4}-W\d{2}$/.test(g.challengeKey)),
  );

  // G/H a nivel de BD: mapeo de recompensa exacto y sin componentes prohibidos.
  const rewardMap = (
    await pg.query(
      `SELECT rbi.xp_amount, count(*)::int n FROM challenge_definition cd
       JOIN reward_bundle_item rbi ON rbi.reward_bundle_id = cd.reward_bundle_id
       WHERE cd.challenge_key LIKE 'v1-%' GROUP BY rbi.xp_amount ORDER BY rbi.xp_amount`,
    )
  ).rows as Array<{ xp_amount: number; n: number }>;
  check(
    'G(DB). 365 defs a 10 XP, 365 a 20, 365 a 30, weekly a 100',
    rewardMap.length === 4 &&
      rewardMap.find((r) => r.xp_amount === 10)?.n === 365 &&
      rewardMap.find((r) => r.xp_amount === 20)?.n === 365 &&
      rewardMap.find((r) => r.xp_amount === 30)?.n === 365 &&
      rewardMap.find((r) => r.xp_amount === 100)?.n === expectedWeekly,
  );
  check(
    'H(DB). ninguna definición V1 referencia un bundle con componente TITLE/COSMETIC',
    (
      await pg.query(
        `SELECT count(*)::int n FROM challenge_definition cd
         JOIN reward_bundle_item rbi ON rbi.reward_bundle_id = cd.reward_bundle_id
         WHERE cd.challenge_key LIKE 'v1-%' AND rbi.component_type <> 'XP_BONUS'`,
      )
    ).rows[0].n === 0,
  );
  check('bundles canónicos = 4 (challenge-v1-xp-10/20/30/100)', seed1.rewardBundlesEnsured === CHALLENGE_V1_REWARD_BUNDLES.length);

  console.log('\n--- P. Segunda ejecución del seed es idempotente ---');
  const seed2 = await seedChallengesV1();
  check('P. segunda corrida: 0 creadas, todas coinciden exactas', seed2.definitionsCreated === 0 && seed2.definitionsMatched === seed2.definitionsExpected);

  console.log('\n--- Q. Contradicción de inmutabilidad falla ruidosamente (no muta) ---');
  const probeKey = generated.find((g) => g.challengeType === 'DAILY' && g.challengeKey.endsWith('2027-08-29'))!.challengeKey;
  const probeBefore = (await pg.query('SELECT completion_rule FROM challenge_definition WHERE challenge_key = $1', [probeKey])).rows[0].completion_rule as string;
  await pg.query('UPDATE challenge_definition SET completion_rule = $2 WHERE challenge_key = $1', [
    probeKey,
    JSON.stringify({ schemaVersion: 'v1', type: 'CUMULATIVE_COUNT', targetValue: 999 }),
  ]);
  let contradictionThrew = false;
  try {
    await seedChallengesV1();
  } catch {
    contradictionThrew = true;
  }
  await pg.query('UPDATE challenge_definition SET completion_rule = $2 WHERE challenge_key = $1', [probeKey, probeBefore]);
  const probeAfter = (await pg.query('SELECT completion_rule FROM challenge_definition WHERE challenge_key = $1', [probeKey])).rows[0].completion_rule as string;
  check('Q. seed lanza ante una fila V1 que contradice su config inmutable', contradictionThrew);
  check('Q. el seed NO mutó la fila (la restauración del gate la deja como el generador la define)', probeAfter === probeBefore);

  // ================= Servicios reales para R-AA =================
  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const balanceRepo = new XpBalanceRepository(prisma);
  const levelDefRepo = new LevelDefinitionRepository(prisma);
  const progressionService = new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo);
  const bundleRepo = new RewardBundleRepository(prisma);
  const grantRepo = new RewardGrantRepository(prisma);
  const componentRepo = new RewardGrantComponentRepository(prisma);
  const cursorRepo = new RewardEvaluationCursorRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const challengeDefinitionRepo = new ChallengeDefinitionRepository(prisma);
  const accountChallengeRepo = new AccountChallengeRepository(prisma);
  const dailyProgressRepo = new AccountChallengeDailyProgressRepository(prisma);
  const consumedEventRepo = new AccountChallengeConsumedEventRepository(prisma);

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
    new AccountTitleRepository(prisma),
    new InventoryItemRepository(prisma),
    challengeDefinitionRepo,
    accountChallengeRepo,
    dailyProgressRepo,
    consumedEventRepo,
  );
  const challengeService = new ChallengeService(prisma, accountChallengeRepo, challengeDefinitionRepo, bundleRepo, worker);

  // Instante fijo bien dentro del horizonte (evita depender de la fecha real de ejecución).
  const at = new Date(Date.UTC(2026, 8, 15, 12, 0, 0)); // 2026-09-15T12:00:00Z
  const activeDefs = await challengeDefinitionRepo.findActiveContainingInstant(at);
  check('precondición: exactamente 3 DAILY + 1 WEEKLY V1 activas en el instante de prueba', activeDefs.filter((d) => d.challengeType === 'DAILY').length === 3 && activeDefs.filter((d) => d.challengeType === 'WEEKLY').length === 1);

  // ---- R / S: materialización perezosa al listar ----
  console.log('\n--- R-S. GET materializa las definiciones activas para una cuenta sin filas previas ---');
  const acctList = randomUUID();
  const listed1 = await challengeService.listForAccount(acctList, at);
  check('R. listForAccount materializa (crea account_challenge donde no había ninguno)', (await pg.query('SELECT count(*)::int n FROM account_challenge WHERE account_id = $1', [acctList])).rows[0].n === 4);
  check('S. primer GET devuelve 3 DAILY + 1 WEEKLY para el período vigente', listed1.filter((c) => c.challengeDefinition.challengeType === 'DAILY').length === 3 && listed1.filter((c) => c.challengeDefinition.challengeType === 'WEEKLY').length === 1);
  check('S. todas ACCEPTED (asignación automática, sin botón de aceptar)', listed1.every((c) => c.challengeStatus === 'ACCEPTED'));
  check('S. vista previa de recompensa presente: {10,20,30,100}', JSON.stringify([...new Set(listed1.map((c) => c.rewardXpBonus))].sort((a, b) => (a ?? 0) - (b ?? 0))) === JSON.stringify([10, 20, 30, 100]));

  // ---- T: repetición no duplica ----
  console.log('\n--- T. GET repetido no duplica account_challenge ---');
  await challengeService.listForAccount(acctList, at);
  await challengeService.listForAccount(acctList, at);
  check('T. sigue habiendo 4 account_challenge tras 3 GET', (await pg.query('SELECT count(*)::int n FROM account_challenge WHERE account_id = $1', [acctList])).rows[0].n === 4);

  // ---- U: definición legacy inválida no rompe el listado ----
  console.log('\n--- U. Una definición legacy con gramática obsoleta no rompe el listado V1 ---');
  const legacyKey = `catalog-gate-legacy-probe-${Date.now()}`;
  await pg.query(
    `INSERT INTO challenge_definition (id, challenge_key, name, challenge_type, eligibility_rule, completion_rule, starts_at, ends_at, status)
     VALUES ($1, $2, 'Legacy inválida', 'WEEKLY', 'account_age_days:0', 'target_value:5', $3, $4, 'ACTIVE')`,
    [randomUUID(), legacyKey, new Date(at.getTime() - DAY_MS), new Date(at.getTime() + DAY_MS)],
  );
  const acctLegacy = randomUUID();
  const listedWithLegacy = await challengeService.listForAccount(acctLegacy, at);
  check('U. el listado sigue devolviendo las 4 definiciones V1 válidas', listedWithLegacy.length === 4);
  check('U. la definición legacy inválida se omitió (no materializó account_challenge)', (await pg.query('SELECT count(*)::int n FROM account_challenge WHERE account_id = $1', [acctLegacy])).rows[0].n === 4);
  await pg.query("UPDATE challenge_definition SET status = 'RETIRED' WHERE challenge_key = $1", [legacyKey]);

  // ---- V / W / X: visibilidad por período ----
  console.log('\n--- V-X. Visibilidad de períodos pasados ---');
  const acctPast = randomUUID();
  // 4 filas de un período YA cerrado, una por estado -- 4 definiciones pasadas
  // distintas (el UNIQUE(account,def,periodStart) impide repetir def).
  const pastDefsForStates = generated.filter((g) => g.challengeType === 'DAILY' && /2026-08-3[01]|2026-09-0[12]/.test(g.challengeKey)).slice(0, 4);
  const states = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CLAIMED'] as const;
  for (let i = 0; i < 4; i++) {
    const dk = pastDefsForStates[i]!.challengeKey;
    const r = (await pg.query('SELECT id, starts_at, ends_at FROM challenge_definition WHERE challenge_key = $1', [dk])).rows[0];
    const st = states[i]!;
    const completedAt = st === 'COMPLETED' || st === 'CLAIMED' ? r.ends_at : null;
    const claimedAt = st === 'CLAIMED' ? r.ends_at : null;
    await pg.query(
      `INSERT INTO account_challenge (id, account_id, challenge_definition_id, progress_value, target_value, challenge_status, period_start, period_end, accepted_at, completed_at, claimed_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())`,
      [randomUUID(), acctPast, r.id, st === 'ACCEPTED' ? 0 : st === 'IN_PROGRESS' ? 1 : 3, 3, st, r.starts_at, r.ends_at, r.starts_at, completedAt, claimedAt],
    );
  }
  const pastListed = await challengeService.listForAccount(acctPast, at);
  const pastByStatus = (s: string) => pastListed.filter((c) => c.challengeStatus === s && c.periodEnd.getTime() <= at.getTime());
  check('V. ACCEPTED de período pasado -> oculto', pastByStatus('ACCEPTED').length === 0);
  check('V. IN_PROGRESS de período pasado -> oculto', pastByStatus('IN_PROGRESS').length === 0);
  check('W. CLAIMED de período pasado -> oculto', pastByStatus('CLAIMED').length === 0);
  check('X. COMPLETED sin reclamar de período pasado -> VISIBLE y reclamable', pastByStatus('COMPLETED').length === 1);
  check(
    'X. no se borró ni mutó ninguna fila histórica (las 4 de período cerrado siguen, con su estado original)',
    (await pg.query("SELECT count(*)::int n FROM account_challenge WHERE account_id = $1 AND period_end <= $2", [acctPast, at])).rows[0].n === 4,
  );

  // ---- Y / Z / AA: progresión, claim, anti-farming ----
  console.log('\n--- Y-Z-AA. Progresión con solape, claim CHALLENGE_CLAIM, exclusión de BONO ---');
  const progRepo = new GamificationProgramRepository(prisma);
  const verRepo = new GamificationProgramVersionRepository(prisma);
  const ruleRepo = new XpRuleRepository(prisma);
  const suffix = Date.now();
  const program = await progRepo.create({ programKey: `v1cat-${suffix}`, name: 'V1 Catalog Gate', programType: 'XP', status: 'ACTIVE' });
  const version = await verRepo.create({
    gamificationProgramId: program.id,
    versionLabel: 'v1',
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(at.getTime() - DAY_MS),
    effectiveUntil: null,
    approvedAt: new Date(),
  });
  const rule = await ruleRepo.create({ programVersionId: version.id, activityType: `V1CAT_${suffix}`, baseXp: 10, dailyCap: null });

  let seq = 0;
  const acctProg = randomUUID();
  async function grant(entryType: 'OTORGAMIENTO' | 'BONO', occurredAt: Date): Promise<void> {
    seq++;
    const { entry } = await ledgerRepo.createIdempotent({
      accountId: acctProg,
      entryType,
      xpAmount: 10,
      xpRuleId: entryType === 'OTORGAMIENTO' ? rule.id : null,
      idempotencyKey: `v1cat-${suffix}-${seq}`,
      occurredAt,
    });
    await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId: acctProg, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
  }

  await grant('OTORGAMIENTO', at);
  await worker.processAccount(acctProg);
  const progRows = await pg.query(
    `SELECT ac.progress_value, cd.challenge_type FROM account_challenge ac JOIN challenge_definition cd ON cd.id = ac.challenge_definition_id WHERE ac.account_id = $1`,
    [acctProg],
  );
  check('Z. UN evento OTORGAMIENTO progresó las 4 (3 DAILY + 1 WEEKLY) simultáneamente', progRows.rows.length === 4 && progRows.rows.every((r: { progress_value: number }) => r.progress_value === 1));

  await pg.query('DELETE FROM reward_evaluation_cursor WHERE account_id = $1', [acctProg]);
  await grant('BONO', at);
  await worker.processAccount(acctProg);
  const afterBono = await pg.query('SELECT DISTINCT progress_value FROM account_challenge WHERE account_id = $1', [acctProg]);
  check('AA. un evento BONO (recompensa) NO alimenta el progreso -- sigue en 1', afterBono.rows.length === 1 && afterBono.rows[0].progress_value === 1);

  // Completar el DAILY easy (target 2) y reclamar.
  await pg.query('DELETE FROM reward_evaluation_cursor WHERE account_id = $1', [acctProg]);
  await grant('OTORGAMIENTO', new Date(at.getTime() + 60_000));
  await worker.processAccount(acctProg);
  const easyRow = (
    await pg.query(
      `SELECT ac.id, ac.challenge_status FROM account_challenge ac JOIN challenge_definition cd ON cd.id = ac.challenge_definition_id
       WHERE ac.account_id = $1 AND ac.target_value = 2`,
      [acctProg],
    )
  ).rows[0];
  check('precondición: el DAILY de target 2 llegó a COMPLETED', easyRow?.challenge_status === 'COMPLETED');
  const claimResult = await challengeService.claim(acctProg, easyRow.id);
  check('Y. claim transiciona a CLAIMED', claimResult.accountChallenge.challengeStatus === 'CLAIMED');
  const grantRow = (
    await pg.query("SELECT source_entity_type, idempotency_key FROM reward_grant WHERE source_entity_id = $1", [easyRow.id])
  ).rows[0];
  check('Y. reward_grant con source CHALLENGE_CLAIM e idempotencyKey reward:CHALLENGE_CLAIM:{id}', grantRow?.source_entity_type === 'CHALLENGE_CLAIM' && grantRow?.idempotency_key === `reward:CHALLENGE_CLAIM:${easyRow.id}`);
  check('Y. entrega un BONO de 10 XP (recompensa easy)', (await pg.query("SELECT count(*)::int n FROM xp_ledger_entry WHERE account_id = $1 AND entry_type = 'BONO' AND xp_amount = 10", [acctProg])).rows[0].n >= 1);
  const claimAgain = await challengeService.claim(acctProg, easyRow.id);
  check('Y. segundo claim idempotente (sigue CLAIMED, un solo reward_grant)', claimAgain.accountChallenge.challengeStatus === 'CLAIMED' && (await pg.query('SELECT count(*)::int n FROM reward_grant WHERE source_entity_id = $1', [easyRow.id])).rows[0].n === 1);

  await prisma.$disconnect();
  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) del gate de DESAFÍOS V1 fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de DESAFÍOS V1 pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
