// PROD-SYNC-2B.1 -- gate enfocado del comando NARROW
// `avatars:seed-historical-bundles-v1` (`seed-historical-avatar-bundles-v1.ts`).
//
// El comando crea EXCLUSIVAMENTE las 5 `reward_bundle` canónicas de avatar
// histórico (`cosmetics-v1-historic-*`) que `avatars:reconcile-historical-v1`
// resuelve por `bundleKey`. Este gate prueba: dry-run sin escrituras,
// primera corrida (exactamente 5 bundles + 5 items, cero efecto colateral en
// cosmetic_item / league_definition / level_definition / inventory_item /
// reward_grant), idempotencia, estado parcial, fail-closed ante divergencia,
// e integración con la entrega real (`RewardEvaluationWorker.deliverBundleComponents`).
//
// Fixtures 100% sintéticos salvo las 5 materias del mapa congelado (creadas
// si faltan por `subject_key`) y los 5 cosmetic_item de avatar histórico
// (creados si faltan). No sube nada a object storage. Se ejecuta vía
// run-gate.ts -> .env.gates -> axioma_gates_dev.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { assertGateDb } from './gate-db-safety';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { SubjectRepository } from '../src/education/subject.repository';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { ProgressionService } from '../src/gamification/progression.service';
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
import { SubjectCompletionService } from '../src/gamification/subject-completion.service';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { AccountChallengeRepository } from '../src/gamification/account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from '../src/gamification/account-challenge-daily-progress.repository';
import { AccountChallengeConsumedEventRepository } from '../src/gamification/account-challenge-consumed-event.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { CurriculumTopicRepository } from '../src/education/curriculum-topic.repository';
import { CurriculumTopicProgressRepository } from '../src/progress/curriculum-topic-progress.repository';
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { HISTORIC_AVATAR_SUBJECT_MAP } from '../src/gamification/cosmetics-v1-catalog';
import { seedHistoricalAvatarBundlesV1 } from './seed-historical-avatar-bundles-v1';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const BUNDLE_KEY_PREFIX = 'cosmetics-v1-historic-';
/** Las 5 claves canónicas exactas -- fuente de verdad = el mapa congelado. */
const CANONICAL_BUNDLE_KEYS = Object.keys(HISTORIC_AVATAR_SUBJECT_MAP).map((k) => `${BUNDLE_KEY_PREFIX}${k}`);

interface Fingerprint {
  leagueDefinition: number;
  levelDefinition: number;
  cosmeticItem: number;
  inventoryItem: number;
  rewardGrant: number;
}
async function fingerprint(pg: Client): Promise<Fingerprint> {
  const one = async (sql: string) => (await pg.query(sql)).rows[0].n as number;
  return {
    leagueDefinition: await one('SELECT count(*)::int AS n FROM league_definition'),
    levelDefinition: await one('SELECT count(*)::int AS n FROM level_definition'),
    cosmeticItem: await one('SELECT count(*)::int AS n FROM cosmetic_item'),
    inventoryItem: await one('SELECT count(*)::int AS n FROM inventory_item'),
    rewardGrant: await one('SELECT count(*)::int AS n FROM reward_grant'),
  };
}
function sameFingerprint(a: Fingerprint, b: Fingerprint): boolean {
  return (
    a.leagueDefinition === b.leagueDefinition &&
    a.levelDefinition === b.levelDefinition &&
    a.cosmeticItem === b.cosmeticItem &&
    a.inventoryItem === b.inventoryItem &&
    a.rewardGrant === b.rewardGrant
  );
}
async function historicBundleRows(pg: Client) {
  return (
    await pg.query(
      `SELECT rb.bundle_key, rb.name, rb.status,
              count(rbi.id)::int AS item_count,
              min(rbi.component_type::text) AS component_type,
              min(rbi.reference_id::text) AS reference_id,
              bool_or(rbi.xp_amount IS NOT NULL) AS any_xp
       FROM reward_bundle rb
       LEFT JOIN reward_bundle_item rbi ON rbi.reward_bundle_id = rb.id
       WHERE rb.bundle_key = ANY($1)
       GROUP BY rb.bundle_key, rb.name, rb.status
       ORDER BY rb.bundle_key`,
      [CANONICAL_BUNDLE_KEYS],
    )
  ).rows as Array<{ bundle_key: string; name: string; status: string; item_count: number; component_type: string | null; reference_id: string | null; any_xp: boolean }>;
}
/**
 * Higiene entre corridas: borra los 5 bundles canónicos, sus items, y
 * cualquier grant/inventory que una corrida PREVIA de este mismo gate (§6,
 * entrega real) haya dejado apuntando a ellos. `reward_grant` /
 * `reward_grant_component` tienen triggers de inmutabilidad append-only --
 * se saltan SÓLO aquí, sólo para filas de fixture de este gate, con
 * `session_replication_role = replica` (mismo criterio que la higiene de
 * temporadas de fixture en gate-db-safety). Nunca toca `axioma_dev`
 * (`assertGateDb` ya falló si lo fuera).
 */
async function resetCanonicalBundleState(pg: Client): Promise<void> {
  await pg.query('SET session_replication_role = replica');
  try {
    const grantIds = (
      await pg.query(
        `SELECT rg.id FROM reward_grant rg JOIN reward_bundle rb ON rb.id = rg.reward_bundle_id WHERE rb.bundle_key = ANY($1)`,
        [CANONICAL_BUNDLE_KEYS],
      )
    ).rows.map((r) => r.id as string);
    if (grantIds.length > 0) {
      await pg.query(`DELETE FROM reward_grant_component WHERE reward_grant_id = ANY($1)`, [grantIds]);
      await pg.query(`DELETE FROM inventory_item WHERE account_id IN (SELECT account_id FROM reward_grant WHERE id = ANY($1))`, [grantIds]);
      await pg.query(`DELETE FROM reward_grant WHERE id = ANY($1)`, [grantIds]);
    }
    await pg.query(
      `DELETE FROM reward_bundle_item WHERE reward_bundle_id IN (SELECT id FROM reward_bundle WHERE bundle_key = ANY($1))`,
      [CANONICAL_BUNDLE_KEYS],
    );
    await pg.query(`DELETE FROM reward_bundle WHERE bundle_key = ANY($1)`, [CANONICAL_BUNDLE_KEYS]);
  } finally {
    await pg.query('SET session_replication_role = origin');
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const subjectRepo = new SubjectRepository(prisma);
  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const balanceRepo = new XpBalanceRepository(prisma);
  const levelDefRepo = new LevelDefinitionRepository(prisma);
  const curriculumTopicRepo = new CurriculumTopicRepository(prisma);
  const curriculumTopicProgressRepo = new CurriculumTopicProgressRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const progressionService = new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo);
  const worker = new RewardEvaluationWorker(
    prisma,
    ledgerRepo,
    new RewardEvaluationCursorRepository(prisma),
    balanceRepo,
    progressionService,
    levelDefRepo,
    bundleRepo,
    new RewardGrantRepository(prisma),
    new RewardGrantComponentRepository(prisma),
    new TransactionRunnerService(prisma),
    new AchievementDefinitionRepository(prisma),
    new AchievementVersionRepository(prisma),
    new AchievementProgressRepository(prisma),
    new AchievementUnlockRepository(prisma),
    new AccountTitleRepository(prisma),
    inventoryItemRepo,
    new ChallengeDefinitionRepository(prisma),
    new AccountChallengeRepository(prisma),
    new AccountChallengeDailyProgressRepository(prisma),
    new AccountChallengeConsumedEventRepository(prisma),
    new ValidatedGamificationActivityRepository(prisma),
    curriculumTopicRepo,
    curriculumTopicProgressRepo,
    new TitleDefinitionRepository(prisma),
    new TitleEligibilityService(prisma, subjectRepo, curriculumTopicRepo, curriculumTopicProgressRepo, progressionService),
    new SubjectCompletionService(curriculumTopicRepo, curriculumTopicProgressRepo, subjectRepo),
  );

  const map = Object.entries(HISTORIC_AVATAR_SUBJECT_MAP);
  const cosmeticIdByItemKey = new Map<string, string>();

  try {
    console.log('--- 0. Pre-estado production-like ---');
    check('HISTORIC_AVATAR_SUBJECT_MAP tiene exactamente 5 entradas', map.length === 5);

    // Materias del mapa congelado (creadas si faltan).
    for (const [, subjectKey] of map) {
      const existing = await subjectRepo.findByKey(subjectKey);
      if (!existing) {
        await prisma.subject.create({ data: { id: randomUUID(), subjectKey, name: `Materia ${subjectKey}`, shortName: subjectKey, displayOrder: 99 } });
      }
    }
    // 5 cosmetic_item de avatar histórico (creados si faltan, ACTIVE/PUBLIC/AVATAR).
    for (const [itemKey] of map) {
      let cosmetic = await cosmeticItemRepo.findByItemKey(itemKey);
      if (!cosmetic) {
        cosmetic = await cosmeticItemRepo.create({
          itemKey,
          itemType: 'AVATAR',
          name: `Avatar histórico ${itemKey}`,
          rarityClass: 'COMMON',
          assetReference: `asset://gate-2b1/${itemKey}`,
          visibilityStatus: 'PUBLIC',
        });
      }
      cosmeticIdByItemKey.set(itemKey, cosmetic.id);
    }
    // Estado inicial: NINGÚN bundle canónico (limpia residuo de corridas previas).
    await resetCanonicalBundleState(pg);
    check('pre-estado: 0 reward_bundle canónicos', (await historicBundleRows(pg)).length === 0);

    // Bundle no relacionado presente (no debe ser tocado).
    const unrelatedKey = `gate-2b1-unrelated-${Date.now()}`;
    const unrelated = await bundleRepo.create({ bundleKey: unrelatedKey, name: 'No relacionado', items: [{ componentType: 'XP_BONUS', xpAmount: 50 }] });

    const fpStart = await fingerprint(pg);

    // ---------------------------------------------------------------
    console.log('\n--- CASE A: DRY RUN ---');
    const dry = await seedHistoricalAvatarBundlesV1({ dryRun: true });
    check('dry-run: 5 WOULD_CREATE', dry.entries.filter((e) => e.outcome === 'WOULD_CREATE').length === 5);
    check('dry-run: created === 0', dry.created === 0);
    check('dry-run: 0 reward_bundle cosmetics-v1-historic-* escritos', (await historicBundleRows(pg)).length === 0);
    check('dry-run: fingerprint (league/level/cosmetic/inventory/grant) sin cambios', sameFingerprint(fpStart, await fingerprint(pg)));

    // ---------------------------------------------------------------
    console.log('\n--- CASE B: PRIMERA CORRIDA REAL ---');
    const run1 = await seedHistoricalAvatarBundlesV1({ dryRun: false });
    check('run1: created === 5', run1.created === 5);
    check('run1: alreadyOk === 0', run1.alreadyOk === 0);
    const rowsB = await historicBundleRows(pg);
    check('run1: exactamente 5 reward_bundle cosmetics-v1-historic-*', rowsB.length === 5);
    check('run1: cada bundle status=ACTIVE', rowsB.every((r) => r.status === 'ACTIVE'));
    check('run1: cada bundle name = "Avatar histórico: <itemKey>"', rowsB.every((r) => r.name === `Avatar histórico: ${r.bundle_key.slice(BUNDLE_KEY_PREFIX.length)}`));
    check('run1: cada bundle con exactamente 1 item', rowsB.every((r) => r.item_count === 1));
    check('run1: cada item componentType=COSMETIC, sin xpAmount', rowsB.every((r) => r.component_type === 'COSMETIC' && r.any_xp === false));
    check(
      'run1: cada item.reference_id apunta al cosmetic_item canónico correcto',
      rowsB.every((r) => r.reference_id === cosmeticIdByItemKey.get(r.bundle_key.slice(BUNDLE_KEY_PREFIX.length))),
    );
    const fpB = await fingerprint(pg);
    check('run1: 0 cosmetic_item creados/borrados', fpB.cosmeticItem === fpStart.cosmeticItem);
    check('run1: 0 league_definition modificadas', fpB.leagueDefinition === fpStart.leagueDefinition);
    check('run1: 0 level_definition modificadas', fpB.levelDefinition === fpStart.levelDefinition);
    check('run1: 0 inventory_item modificados', fpB.inventoryItem === fpStart.inventoryItem);
    check('run1: 0 reward_grant modificados', fpB.rewardGrant === fpStart.rewardGrant);
    const unrelatedAfter = await bundleRepo.findByBundleKey(unrelatedKey);
    check('run1: bundle no relacionado intacto', unrelatedAfter?.id === unrelated.id && unrelatedAfter?.items.length === 1 && unrelatedAfter?.items[0]?.xpAmount === 50);

    // ---------------------------------------------------------------
    console.log('\n--- CASE C: SEGUNDA CORRIDA REAL (idempotencia) ---');
    const idsBeforeC = new Set((await pg.query(`SELECT id FROM reward_bundle WHERE bundle_key LIKE $1`, [`${BUNDLE_KEY_PREFIX}%`])).rows.map((r) => r.id));
    const run2 = await seedHistoricalAvatarBundlesV1({ dryRun: false });
    check('run2: created === 0', run2.created === 0);
    check('run2: alreadyOk === 5', run2.alreadyOk === 5);
    check('run2: sigue habiendo exactamente 5 bundles', (await historicBundleRows(pg)).length === 5);
    const idsAfterC = new Set((await pg.query(`SELECT id FROM reward_bundle WHERE bundle_key LIKE $1`, [`${BUNDLE_KEY_PREFIX}%`])).rows.map((r) => r.id));
    check('run2: mismos IDs de bundle (no recreados)', idsBeforeC.size === idsAfterC.size && [...idsBeforeC].every((id) => idsAfterC.has(id)));
    check('run2: fingerprint global sin cambios', sameFingerprint(fpB, await fingerprint(pg)));

    // ---------------------------------------------------------------
    console.log('\n--- CASE D: ESTADO PARCIAL ---');
    const [victimItemKey] = map[3];
    const victimBundleKey = `${BUNDLE_KEY_PREFIX}${victimItemKey}`;
    await pg.query(`DELETE FROM reward_bundle_item WHERE reward_bundle_id IN (SELECT id FROM reward_bundle WHERE bundle_key = $1)`, [victimBundleKey]);
    await pg.query(`DELETE FROM reward_bundle WHERE bundle_key = $1`, [victimBundleKey]);
    check('parcial: ahora hay 4 bundles', (await historicBundleRows(pg)).length === 4);
    const run3 = await seedHistoricalAvatarBundlesV1({ dryRun: false });
    check('parcial: created === 1', run3.created === 1);
    check('parcial: alreadyOk === 4', run3.alreadyOk === 4);
    check('parcial: de vuelta a 5 bundles', (await historicBundleRows(pg)).length === 5);
    check('parcial: el bundle recreado apunta al cosmetic correcto', (await bundleRepo.findByBundleKey(victimBundleKey))?.items[0]?.referenceId === cosmeticIdByItemKey.get(victimItemKey));

    // ---------------------------------------------------------------
    console.log('\n--- CASE E: DIVERGENCIA (fail-closed) ---');
    const [divItemKey] = map[1];
    const divBundleKey = `${BUNDLE_KEY_PREFIX}${divItemKey}`;
    const divBundleId = (await bundleRepo.findByBundleKey(divBundleKey))!.id;
    await pg.query(`UPDATE reward_bundle SET name = 'NOMBRE CONFLICTIVO' WHERE id = $1`, [divBundleId]);
    const fpE = await fingerprint(pg);
    const bundlesBeforeE = await historicBundleRows(pg);
    let threw = false;
    try {
      await seedHistoricalAvatarBundlesV1({ dryRun: false });
    } catch {
      threw = true;
    }
    check('divergencia: el comando FALLA (throw)', threw);
    check('divergencia: el nombre conflictivo NO fue sobrescrito', (await bundleRepo.findByBundleKey(divBundleKey))?.name === 'NOMBRE CONFLICTIVO');
    check('divergencia: sin escrituras parciales (mismo set de bundles)', JSON.stringify(await historicBundleRows(pg)) === JSON.stringify(bundlesBeforeE));
    check('divergencia: fingerprint global sin cambios', sameFingerprint(fpE, await fingerprint(pg)));
    // dry-run también debe fallar ante divergencia
    let dryThrew = false;
    try {
      await seedHistoricalAvatarBundlesV1({ dryRun: true });
    } catch {
      dryThrew = true;
    }
    check('divergencia: dry-run también FALLA (exit != 0)', dryThrew);
    // restaurar para el resto del gate
    await pg.query(`UPDATE reward_bundle SET name = $2 WHERE id = $1`, [divBundleId, `Avatar histórico: ${divItemKey}`]);
    check('post-restauración: 5 bundles OK', (await seedHistoricalAvatarBundlesV1({ dryRun: true })).alreadyOk === 5);

    // ---------------------------------------------------------------
    console.log('\n--- §6. Integración con la entrega real (deliverBundleComponents) ---');
    const [intItemKey, intSubjectKey] = map[0];
    const [otherItemKey] = map[1];
    const intBundle = await bundleRepo.findByBundleKey(`${BUNDLE_KEY_PREFIX}${intItemKey}`);
    check('integración: reconcile-path resuelve el bundle canónico (ya no SIN-BUNDLE)', intBundle != null && intBundle.items.length === 1);
    const acct = randomUUID();
    const intCosmeticId = cosmeticIdByItemKey.get(intItemKey)!;
    const otherCosmeticId = cosmeticIdByItemKey.get(otherItemKey)!;
    const owns = async (cid: string) =>
      ((await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [acct, cid])).rows[0].n as number);

    const d1 = await worker.deliverBundleComponents(acct, intBundle!, 'STUDY_SUBJECT', `${acct}:${intSubjectKey}`);
    check('integración: allResolved === true', d1.allResolved === true);
    check('integración: el avatar histórico correcto fue otorgado (1 inventory_item)', (await owns(intCosmeticId)) === 1);
    check('integración: NINGÚN avatar no relacionado otorgado', (await owns(otherCosmeticId)) === 0);

    const grantsBefore = (await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1', [acct])).rows[0].n as number;
    const d2 = await worker.deliverBundleComponents(acct, intBundle!, 'STUDY_SUBJECT', `${acct}:${intSubjectKey}`);
    check('integración: 2da entrega idempotente -- sigue en 1 inventory_item', (await owns(intCosmeticId)) === 1);
    check('integración: 2da entrega no duplica reward_grant', ((await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1', [acct])).rows[0].n as number) === grantsBefore);
    check('integración: allResolved sigue true', d2.allResolved === true);

    const fpAfterIntegration = await fingerprint(pg);
    check('integración: 0 mutación de league_definition', fpAfterIntegration.leagueDefinition === fpStart.leagueDefinition);
    check('integración: 0 mutación de level_definition', fpAfterIntegration.levelDefinition === fpStart.levelDefinition);
    check('integración: 0 mutación de cosmetic_item', fpAfterIntegration.cosmeticItem === fpStart.cosmeticItem);
    check(
      'integración: ningún XP/LP colateral',
      ((await pg.query("SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1", [acct])).rows[0].n as number) === 0 &&
        ((await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE account_id = $1', [acct])).rows[0].n as number) === 0,
    );

    // La cuenta sintética de integración (`acct`, un UUID aleatorio) y su
    // grant/inventory quedan como residuo permanente por diseño: reward_grant
    // / reward_grant_component son append-only (triggers de inmutabilidad,
    // mismo criterio que el resto de gates de gamificación). El bundle no
    // relacionado también se conserva -- ninguna aserción posterior depende
    // de su ausencia.
  } finally {
    await prisma.$disconnect();
    await pg.end();
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de seed de bundles de avatar histórico pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
