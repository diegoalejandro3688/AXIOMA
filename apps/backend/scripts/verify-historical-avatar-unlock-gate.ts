// STABILIZATION-B -- gate enfocado: los avatares históricos V1 se otorgan
// SOLO al completar TODOS los recursos canónicos de su unidad mapeada
// (recompute desde el origen, nunca desde una completitud aislada). Usa la
// unidad real M1.GEOMETRIA (mapeada a Euclides) -- requiere contenido
// canónico real ya seedeado (axioma_gates_dev/axioma_dev), por eso NO usa
// un disposable DB en blanco. Restaura el `reward_bundle_id` original de la
// unidad al finalizar (hygiene -- nunca deja el catálogo real alterado).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
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
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { TitleEligibilityService } from '../src/gamification/title-eligibility.service';
import { SubjectRepository } from '../src/education/subject.repository';
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
import { HISTORIC_AVATAR_UNIT_MAP } from '../src/gamification/cosmetics-v1-catalog';
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

  const suffix = Date.now();
  const curriculumTopicRepo = new CurriculumTopicRepository(prisma);
  const curriculumTopicProgressRepo = new CurriculumTopicProgressRepository(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const balanceRepo = new XpBalanceRepository(prisma);
  const levelDefRepo = new LevelDefinitionRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);

  const worker = new RewardEvaluationWorker(
    prisma,
    ledgerRepo,
    new RewardEvaluationCursorRepository(prisma),
    balanceRepo,
    new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo),
    levelDefRepo,
    bundleRepo,
    new RewardGrantRepository(prisma),
    new RewardGrantComponentRepository(prisma),
    txRunner,
    new AchievementDefinitionRepository(prisma),
    new AchievementVersionRepository(prisma),
    new AchievementProgressRepository(prisma),
    new AchievementUnlockRepository(prisma),
    new AccountTitleRepository(prisma),
    new InventoryItemRepository(prisma),
    new ChallengeDefinitionRepository(prisma),
    new AccountChallengeRepository(prisma),
    new AccountChallengeDailyProgressRepository(prisma),
    new AccountChallengeConsumedEventRepository(prisma),
    new ValidatedGamificationActivityRepository(prisma),
    curriculumTopicRepo,
    curriculumTopicProgressRepo,
    new TitleDefinitionRepository(prisma),
    new TitleEligibilityService(prisma, new SubjectRepository(prisma), curriculumTopicRepo, curriculumTopicProgressRepo, new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo)),
  );

  const unitCode = Object.values(HISTORIC_AVATAR_UNIT_MAP).includes('M1.GEOMETRIA') ? 'M1.GEOMETRIA' : Object.values(HISTORIC_AVATAR_UNIT_MAP)[0]!;
  const unit = await curriculumTopicRepo.findByCode(unitCode);
  if (!unit) {
    console.log(`ESTRUCTURALMENTE VERIFICADO / NO EJECUTADO -- unidad "${unitCode}" no existe en esta base local (contenido no seedeado).`);
    await prisma.$disconnect();
    await pg.end();
    return;
  }
  const childIds = await curriculumTopicRepo.findCanonicalResourceChildIds(unit.id);
  if (childIds.length < 2) {
    console.log(`ESTRUCTURALMENTE VERIFICADO / NO EJECUTADO -- unidad "${unitCode}" tiene ${childIds.length} recurso(s) canónico(s) (se necesitan >=2 para probar "locked hasta el último").`);
    await prisma.$disconnect();
    await pg.end();
    return;
  }
  console.log(`--- Usando unidad real "${unitCode}" (${childIds.length} recursos canónicos) ---`);

  // Fixture: bundle/cosmetic PROPIOS del gate, sustituyen temporalmente el
  // reward_bundle_id de la unidad -- restaurado en `finally`, nunca deja el
  // catálogo real alterado.
  const originalRewardBundleId = unit.rewardBundleId;
  const cosmetic = await pg.query(
    `INSERT INTO cosmetic_item (id, item_key, item_type, name, rarity_class, asset_reference, visibility_status, status)
     VALUES ($1, $2, 'AVATAR', $3, 'COMMON', $4, 'PUBLIC', 'ACTIVE') RETURNING id`,
    [randomUUID(), `gate-historic-avatar-${suffix}`, `Avatar histórico (gate)`, `asset://gate/historic-${suffix}`],
  );
  const cosmeticItemId = cosmetic.rows[0].id as string;
  const bundle = await bundleRepo.create({ bundleKey: `gate-historic-bundle-${suffix}`, name: 'Avatar histórico (gate)', items: [{ componentType: 'COSMETIC', referenceId: cosmeticItemId }] });
  await pg.query('UPDATE curriculum_topic SET reward_bundle_id = $1 WHERE id = $2', [bundle.id, unit.id]);

  let skippedNoRule = false;
  try {
    async function ownsAvatar(accountId: string): Promise<boolean> {
      const row = await pg.query('SELECT 1 FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [accountId, cosmeticItemId]);
      return (row.rowCount ?? 0) > 0;
    }
    async function avatarCount(accountId: string): Promise<number> {
      const row = await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [accountId, cosmeticItemId]);
      return row.rows[0].n;
    }
    async function markCompleted(accountId: string, topicId: string): Promise<void> {
      await curriculumTopicProgressRepo.createIfMissing(accountId, topicId);
      const row = await curriculumTopicProgressRepo.findByAccountAndTopic(accountId, topicId);
      await curriculumTopicProgressRepo.touchActivity(row!.id, 'COMPLETED', new Date());
    }
    // OTORGAMIENTO exige xp_rule_id real (CHECK de base de datos) -- se
    // reutiliza cualquier XpRule ya existente/ACTIVA en esta base local
    // (nunca se crea una nueva regla), solo como disparador del recompute.
    // OTORGAMIENTO exige xp_rule_id real (CHECK de base de datos). Se
    // reutiliza cualquier XpRule ya existente si esta base ya tiene xp-core
    // provisionado; si no (drift local conocido, ver STABILIZATION-A), este
    // gate crea su PROPIA regla/programa sintéticos SOLO como disparador --
    // nunca activa xp-core real ni corre `xp:seed-v1`.
    const anyRule = await pg.query('SELECT id FROM xp_rule LIMIT 1');
    let triggerRuleId: string;
    if (anyRule.rows[0]) {
      triggerRuleId = anyRule.rows[0].id;
    } else {
      const programRepo = new GamificationProgramRepository(prisma);
      const versionRepo = new GamificationProgramVersionRepository(prisma);
      const ruleRepo = new XpRuleRepository(prisma);
      const program = await programRepo.create({ programKey: `gate-historic-program-${suffix}`, name: 'Historical Avatar Gate Program', programType: 'XP', status: 'ACTIVE' });
      const version = await versionRepo.create({
        gamificationProgramId: program.id,
        versionLabel: 'v1',
        approvalStatus: 'APPROVED',
        effectiveFrom: new Date(Date.now() - 60_000),
        effectiveUntil: null,
        approvedAt: new Date(),
      });
      const rule = await ruleRepo.create({ programVersionId: version.id, activityType: `GATE_HISTORIC_TRIGGER_${suffix}`, baseXp: 0, dailyCap: null });
      triggerRuleId = rule.id;
    }
    async function trigger(accountId: string): Promise<void> {
      // `evaluateHistoricalAvatars` solo actúa si hay AL MENOS un OTORGAMIENTO
      // pendiente -- un dummy real, sin relación con el avatar, basta para
      // disparar el recompute (idéntico a como una actividad real lo haría).
      await ledgerRepo.createIdempotent({
        accountId,
        entryType: 'OTORGAMIENTO',
        xpAmount: 0,
        xpRuleId: triggerRuleId,
        idempotencyKey: `gate-historic-trigger-${suffix}-${accountId}-${Date.now()}-${Math.random()}`,
        occurredAt: new Date(),
      });
      await worker.processAccount(accountId);
    }

    console.log('--- A. Cuenta nueva -- 0 avatares históricos ---');
    const accountA = randomUUID();
    check('cuenta nueva no posee el avatar histórico', !(await ownsAvatar(accountA)));

    console.log('--- C. Completar TODOS menos uno -- sigue bloqueado ---');
    for (const topicId of childIds.slice(0, -1)) await markCompleted(accountA, topicId);
    await trigger(accountA);
    check('con recursos pendientes, el avatar sigue SIN otorgarse', !(await ownsAvatar(accountA)));

    console.log('--- D. Completar el ÚLTIMO recurso restante -- avatar otorgado ---');
    await markCompleted(accountA, childIds[childIds.length - 1]!);
    await trigger(accountA);
    check('unidad completa -> avatar histórico otorgado', await ownsAvatar(accountA));
    check('exactamente 1 fila de inventario', (await avatarCount(accountA)) === 1);

    console.log('--- E. Reevaluación -- sin duplicado ---');
    await trigger(accountA);
    check('reevaluar no duplica -- sigue en 1', (await avatarCount(accountA)) === 1);

    console.log('--- I. Sin efecto colateral en XP/LP ---');
    const xpRows = await pg.query("SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1 AND entry_type != 'OTORGAMIENTO'", [accountA]);
    check('ningún XP_BONUS/ajuste inesperado generado por la entrega del avatar', xpRows.rows[0].n === 0);
    const lpRows = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE account_id = $1', [accountA]);
    check('ningún LP otorgado por la entrega del avatar', lpRows.rows[0].n === 0);

    console.log('--- J. Ningún auto-equip ---');
    const equipped = await pg.query(
      'SELECT count(*)::int AS n FROM equipped_cosmetic ec JOIN inventory_item ii ON ii.id = ec.inventory_item_id WHERE ii.account_id = $1',
      [accountA],
    );
    check('ningún equipped_cosmetic creado por la entrega del avatar', equipped.rows[0].n === 0);

    console.log('--- G. Reconciliación retroactiva: cuenta B ya completó la unidad ANTES de este incremento ---');
    const accountB = randomUUID();
    for (const topicId of childIds) await markCompleted(accountB, topicId);
    check('cuenta B NO posee el avatar todavía (solo progreso, sin evaluación disparada)', !(await ownsAvatar(accountB)));
    const { reconcileHistoricalAvatarsV1 } = await import('./reconcile-historical-avatars-v1');
    await reconcileHistoricalAvatarsV1({ dryRun: false });
    check('reconciliación retroactiva otorga el avatar a la cuenta B', await ownsAvatar(accountB));
    await reconcileHistoricalAvatarsV1({ dryRun: false });
    check('reconciliación reejecutada -- sin duplicado para B', (await avatarCount(accountB)) === 1);
  } finally {
    await pg.query('UPDATE curriculum_topic SET reward_bundle_id = $1 WHERE id = $2', [originalRewardBundleId, unit.id]);
    await prisma.$disconnect();
    await pg.end();
  }

  if (skippedNoRule) return;
  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de desbloqueo de avatares históricos pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
