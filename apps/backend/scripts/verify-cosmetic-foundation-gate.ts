// Gate del Bloque III, Incremento 5, sub-incremento 5.a ("Fundación de
// persistencia y entrega de cosméticos", BLOCK-III-DEFINITION.md §4.19,
// ADR-0019) -- mezcla estructural (esquema/constraints, sin HTTP) y de
// entrega real (worker), mismo criterio combinado que
// verify-title-foundation-gate.ts (3.a). SIN equipped_cosmetic, SIN
// endpoints, SIN superficie móvil -- verificado explícitamente al final
// (eso es 5.b/5.c).
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
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { AccountChallengeRepository } from '../src/gamification/account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from '../src/gamification/account-challenge-daily-progress.repository';
import { AccountChallengeConsumedEventRepository } from '../src/gamification/account-challenge-consumed-event.repository';
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

/**
 * Inyecta un fallo determinista UNA sola vez en `createIdempotent` --
 * mismo criterio que `PoisonOnceLedgerRepository`
 * (verify-reward-delivery-xp-bonus-gate.ts, 1.c) -- para probar que un
 * fallo real de creación de `inventory_item` deja el componente `FAILED`,
 * nunca `DELIVERED`.
 */
class PoisonOnceInventoryItemRepository extends InventoryItemRepository {
  private armed = true;

  async createIdempotent(
    input: Parameters<InventoryItemRepository['createIdempotent']>[0],
  ): ReturnType<InventoryItemRepository['createIdempotent']> {
    if (this.armed) {
      this.armed = false;
      throw new Error('fallo simulado para el gate 5.a (entrega de COSMETIC)');
    }
    return super.createIdempotent(input);
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  await pg.query("UPDATE achievement_definition SET status = 'RETIRED' WHERE status = 'ACTIVE'");
  await pg.query("UPDATE challenge_definition SET status = 'RETIRED' WHERE status = 'ACTIVE'");

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
  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const challengeDefinitionRepo = new ChallengeDefinitionRepository(prisma);
  const accountChallengeRepo = new AccountChallengeRepository(prisma);
  const dailyProgressRepo = new AccountChallengeDailyProgressRepository(prisma);
  const consumedEventRepo = new AccountChallengeConsumedEventRepository(prisma);

  function buildWorker(inventoryRepo: InventoryItemRepository) {
    return new RewardEvaluationWorker(
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
      inventoryRepo,
      challengeDefinitionRepo,
      accountChallengeRepo,
      dailyProgressRepo,
      consumedEventRepo,
    );
  }
  const worker = buildWorker(inventoryItemRepo);

  const suffix = Date.now();

  console.log('--- 1. cosmetic_item: creación, UNIQUE(item_key), assetReference opaco (§4.19) ---');
  const cosmeticItem = await cosmeticItemRepo.create({
    itemKey: `gate-5a-badge-${suffix}`,
    itemType: 'BADGE',
    name: 'Insignia de prueba (gate 5.a)',
    description: 'Otorgada al completar el gate.',
    rarityClass: 'EPIC', // valor libre -- Data Model no enumera rareza (§16.33)
    assetReference: 'gate://opaque-reference-not-a-url', // opaco a propósito -- 5.a no lo interpreta
    visibilityStatus: 'PUBLIC',
  });
  check('cosmetic_item creado', cosmeticItem.id !== undefined);
  check('status nace ACTIVE', cosmeticItem.status === 'ACTIVE');
  check('itemType persistido tal cual', cosmeticItem.itemType === 'BADGE');
  check('assetReference persistido tal cual, sin interpretación', cosmeticItem.assetReference === 'gate://opaque-reference-not-a-url');

  let duplicateItemKeyRejected = false;
  try {
    await cosmeticItemRepo.create({
      itemKey: cosmeticItem.itemKey,
      itemType: 'AVATAR',
      name: 'Duplicado',
      rarityClass: 'COMMON',
      assetReference: 'x',
      visibilityStatus: 'PRIVATE',
    });
  } catch (error) {
    duplicateItemKeyRejected = (error as { code?: string }).code === 'P2002';
  }
  check('UNIQUE rechaza item_key duplicado (Gate 48)', duplicateItemKeyRejected);

  console.log('--- 2. Inmutabilidad por diseño de repositorio (§4.19, sin trigger -- mismo criterio que TitleDefinition, Gate 47) ---');
  check('CosmeticItemRepository no expone update/delete', !('update' in cosmeticItemRepo) && !('delete' in cosmeticItemRepo));

  console.log('--- 3. Referencia cosmética inexistente rechazada en AMBAS tablas (Gate 54), sin afectar XP_BONUS/TITLE ---');
  const bundleForBadReference = await bundleRepo.create({
    bundleKey: `gate-5a-bad-ref-${suffix}`,
    name: 'Bundle con referencia inválida (gate 5.a)',
    items: [],
  });
  let bundleItemRejected = false;
  try {
    await pg.query(
      `INSERT INTO reward_bundle_item (id, reward_bundle_id, component_type, xp_amount, reference_id)
       VALUES ($1, $2, 'COSMETIC', NULL, $3)`,
      [randomUUID(), bundleForBadReference.id, randomUUID()],
    );
  } catch (error) {
    bundleItemRejected = String((error as Error).message ?? '').includes('cosmetic_item');
  }
  check('trigger rechaza reward_bundle_item COSMETIC con reference_id inexistente en cosmetic_item', bundleItemRejected);

  let bundleItemNullStillChecked = false;
  try {
    await pg.query(
      `INSERT INTO reward_bundle_item (id, reward_bundle_id, component_type, xp_amount, reference_id)
       VALUES ($1, $2, 'COSMETIC', NULL, NULL)`,
      [randomUUID(), bundleForBadReference.id],
    );
  } catch (error) {
    bundleItemNullStillChecked = (error as { code?: string }).code === '23514';
  }
  check('CHECK de coherencia (1.a) sigue vigente para reference_id NULL, sin interferencia del trigger de COSMETIC', bundleItemNullStillChecked);

  const bundleWithRealCosmetic = await bundleRepo.create({
    bundleKey: `gate-5a-good-ref-${suffix}`,
    name: 'Bundle con referencia real (gate 5.a)',
    items: [{ componentType: 'COSMETIC', referenceId: cosmeticItem.id }],
  });
  const grantForBadComponentRef = await grantRepo.createIdempotent({
    accountId: randomUUID(),
    rewardBundleId: bundleWithRealCosmetic.id,
    sourceEntityType: 'LEVEL',
    sourceEntityId: `gate-5a-fk-${suffix}`,
    idempotencyKey: `reward:LEVEL:gate-5a-fk-${suffix}`,
    components: [{ componentType: 'COSMETIC', referenceId: cosmeticItem.id }],
  });
  let componentUpdateRejected = false;
  try {
    await pg.query('UPDATE reward_grant_component SET reference_id = $1 WHERE id = $2', [
      randomUUID(),
      grantForBadComponentRef.grant.components[0]!.id,
    ]);
  } catch (error) {
    componentUpdateRejected = String((error as Error).message ?? '').includes('cosmetic_item');
  }
  check('trigger rechaza UPDATE de reward_grant_component.reference_id a un valor inexistente en cosmetic_item', componentUpdateRejected);

  // TITLE/XP_BONUS no deben verse afectados por los triggers nuevos de COSMETIC.
  const titleBundleUnaffected = await bundleRepo.create({
    bundleKey: `gate-5a-title-unaffected-${suffix}`,
    name: 'Bundle XP_BONUS, no debe rozar los triggers de COSMETIC',
    items: [{ componentType: 'XP_BONUS', xpAmount: 5 }],
  });
  check('XP_BONUS no interferido por los triggers de referencia COSMETIC', titleBundleUnaffected.id !== undefined);

  console.log('--- 4. inventory_item: adquisición idempotente, UNIQUE(accountId, cosmeticItemId), FK (Gate 49) ---');
  const accountX = randomUUID();
  const firstAcq = await inventoryItemRepo.createIdempotent({
    accountId: accountX,
    cosmeticItemId: cosmeticItem.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${accountX}:2`,
    acquiredAt: new Date(),
  });
  check('primer createIdempotent -> created=true', firstAcq.created === true);
  check('ownershipStatus nace ACTIVE', firstAcq.inventoryItem.ownershipStatus === 'ACTIVE');
  check('revokedAt nace NULL', firstAcq.inventoryItem.revokedAt === null);

  const secondAcq = await inventoryItemRepo.createIdempotent({
    accountId: accountX,
    cosmeticItemId: cosmeticItem.id,
    acquisitionSourceType: 'ACHIEVEMENT_UNLOCK', // deliberadamente distinto -- no debe usarse
    acquisitionSourceId: 'otro-origen',
    acquiredAt: new Date(),
  });
  check('segundo createIdempotent (mismo par) -> created=false', secondAcq.created === false);
  check('devuelve LA MISMA fila (acquisitionSourceType original, no el del segundo intento)', secondAcq.inventoryItem.acquisitionSourceType === 'LEVEL');
  const inventoryCount = await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [
    accountX,
    cosmeticItem.id,
  ]);
  check('sigue existiendo UNA sola inventory_item para ese par', inventoryCount.rows[0].n === 1);

  let fkRejectedForUnknownCosmetic = false;
  try {
    await inventoryItemRepo.createIdempotent({
      accountId: accountX,
      cosmeticItemId: randomUUID(),
      acquisitionSourceType: 'LEVEL',
      acquisitionSourceId: 'x',
      acquiredAt: new Date(),
    });
  } catch (error) {
    fkRejectedForUnknownCosmetic = (error as { code?: string }).code === 'P2003';
  }
  check('FK rechaza inventory_item con cosmetic_item_id inexistente', fkRejectedForUnknownCosmetic);

  console.log('--- 5. Propiedad REVOKED/SUPERSEDED no se reactiva silenciosamente (§4.19, Gate 56) ---');
  await pg.query("UPDATE inventory_item SET ownership_status = 'REVOKED', revoked_at = now() WHERE account_id = $1 AND cosmetic_item_id = $2", [
    accountX,
    cosmeticItem.id,
  ]);
  const revokedBefore = await inventoryItemRepo.findByAccountAndCosmetic(accountX, cosmeticItem.id);
  check('fixture: ownershipStatus quedó REVOKED', revokedBefore?.ownershipStatus === 'REVOKED');

  const thirdAcq = await inventoryItemRepo.createIdempotent({
    accountId: accountX,
    cosmeticItemId: cosmeticItem.id,
    acquisitionSourceType: 'CHALLENGE_CLAIM',
    acquisitionSourceId: 'un-tercer-origen',
    acquiredAt: new Date(),
  });
  check('tercer createIdempotent sobre fila REVOKED -> created=false (misma fila, no una nueva)', thirdAcq.created === false);
  check('ownershipStatus SIGUE REVOKED -- NO se reactivó silenciosamente', thirdAcq.inventoryItem.ownershipStatus === 'REVOKED');
  check('revokedAt SIGUE fijado -- no se limpió', thirdAcq.inventoryItem.revokedAt !== null);

  console.log('--- 6. Inmutabilidad por diseño de repositorio: sin update() genérico en InventoryItemRepository ---');
  check('InventoryItemRepository no expone update() genérico', !('update' in inventoryItemRepo));

  console.log('--- 7. Entrega real vía el worker: fuente LEVEL, componente COSMETIC (Gate 50) ---');
  const levelBundle = await bundleRepo.create({
    bundleKey: `gate-5a-level-bundle-${suffix}`,
    name: 'Recompensa de nivel con cosmético (gate 5.a)',
    items: [{ componentType: 'COSMETIC', referenceId: cosmeticItem.id }],
  });
  const maxThreshold = (await pg.query('SELECT COALESCE(MAX(minimum_lifetime_xp), 0)::int AS n FROM level_definition')).rows[0].n as number;
  const levelThreshold = maxThreshold + 1000;
  const levelNumber = 950_000 + (suffix % 40_000);
  await pg.query("UPDATE level_definition SET status = 'RETIRED' WHERE level_number >= 950000 AND status = 'ACTIVE'");
  const levelDefinition = await levelDefRepo.create({ levelNumber, minimumLifetimeXp: levelThreshold });
  await pg.query('UPDATE level_definition SET reward_bundle_id = $1 WHERE id = $2', [levelBundle.id, levelDefinition.id]);

  const accountL = randomUUID();
  const { entry } = await ledgerRepo.createIdempotent({
    accountId: accountL,
    entryType: 'AJUSTE',
    xpAmount: levelThreshold + 50,
    idempotencyKey: `gate-5a-${suffix}-level-entry`,
    occurredAt: new Date(),
  });
  await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, {
    accountId: accountL,
    deltaXp: entry.xpAmount,
    lastLedgerEntryId: entry.id,
  });

  const outcomeL1 = await worker.processAccount(accountL);
  check('processAccount -> PROCESSED', outcomeL1 === 'PROCESSED');

  const inventoryItemL = await inventoryItemRepo.findByAccountAndCosmetic(accountL, cosmeticItem.id);
  check('inventory_item creada por el worker', inventoryItemL !== null);
  check('acquisitionSourceType == LEVEL (snapshot del grant)', inventoryItemL?.acquisitionSourceType === 'LEVEL');
  check('acquisitionSourceId == {accountId}:{levelNumber}', inventoryItemL?.acquisitionSourceId === `${accountL}:${levelNumber}`);

  const grantL = await grantRepo.findByIdempotencyKey(`reward:LEVEL:${accountL}:${levelNumber}`);
  check('componente COSMETIC quedó DELIVERED', grantL?.components[0]?.deliveryStatus === 'DELIVERED');

  console.log('--- 8. Reintento no duplica (Gate 53) ---');
  const outcomeL2 = await worker.processAccount(accountL);
  check('reintento (sin pendientes nuevas) -> PROCESSED', outcomeL2 === 'PROCESSED');
  const inventoryCountL = await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id = $1', [accountL]);
  check('sigue existiendo UNA sola inventory_item tras el reintento', inventoryCountL.rows[0].n === 1);

  console.log('--- 9. Entrega real vía el worker: fuente ACHIEVEMENT_UNLOCK, componente COSMETIC (Gate 51) ---');
  const achievementBundle = await bundleRepo.create({
    bundleKey: `gate-5a-achievement-bundle-${suffix}`,
    name: 'Recompensa de logro con cosmético (gate 5.a)',
    items: [{ componentType: 'COSMETIC', referenceId: cosmeticItem.id }],
  });
  const achievementDefinition = await achievementDefinitionRepo.create({
    achievementKey: `gate-5a-achievement-${suffix}`,
    name: 'Logro de prueba (gate 5.a)',
    achievementCategory: 'HITO_ACADEMICO',
    visibilityClass: 'PUBLIC',
    repeatability: 'UNIQUE',
    progressTrackingType: 'CUMULATIVE_COUNTER',
  });
  await achievementVersionRepo.create({
    achievementDefinitionId: achievementDefinition.id,
    versionLabel: 'v1',
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 300 },
    rewardBundleId: achievementBundle.id,
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60_000),
    approvedAt: new Date(),
  });

  const accountM = randomUUID();
  const { entry: entryM } = await ledgerRepo.createIdempotent({
    accountId: accountM,
    entryType: 'AJUSTE',
    xpAmount: 400,
    idempotencyKey: `gate-5a-${suffix}-achievement-entry`,
    occurredAt: new Date(),
  });
  await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId: accountM, deltaXp: entryM.xpAmount, lastLedgerEntryId: entryM.id });

  const outcomeM1 = await worker.processAccount(accountM);
  check('processAccount -> PROCESSED', outcomeM1 === 'PROCESSED');

  const inventoryItemM = await inventoryItemRepo.findByAccountAndCosmetic(accountM, cosmeticItem.id);
  check('inventory_item creada vía logro', inventoryItemM !== null);
  check('acquisitionSourceType == ACHIEVEMENT_UNLOCK', inventoryItemM?.acquisitionSourceType === 'ACHIEVEMENT_UNLOCK');
  const unlockM = await achievementUnlockRepo.findByAccountDefinitionInstance(accountM, achievementDefinition.id, 1);
  check('acquisitionSourceId == achievement_unlock.id (§4.4)', inventoryItemM?.acquisitionSourceId === unlockM?.id);

  console.log('--- 10. Entrega real vía deliverBundleComponents con fuente CHALLENGE_CLAIM (Gate 52, mismo mecanismo genérico) ---');
  const challengeBundleHeader = await bundleRepo.create({
    bundleKey: `gate-5a-challenge-bundle-${suffix}`,
    name: 'Recompensa de desafío con cosmético (gate 5.a)',
    items: [{ componentType: 'COSMETIC', referenceId: cosmeticItem.id }],
  });
  const challengeBundle = await bundleRepo.findById(challengeBundleHeader.id); // `create()` no incluye `items` -- deliverBundleComponents los necesita
  const accountN = randomUUID();
  const fakeAccountChallengeId = randomUUID();
  const { allResolved: challengeAllResolved } = await worker.deliverBundleComponents(accountN, challengeBundle!, 'CHALLENGE_CLAIM', fakeAccountChallengeId);
  check('deliverBundleComponents -> allResolved (fuente CHALLENGE_CLAIM)', challengeAllResolved === true);
  const inventoryItemN = await inventoryItemRepo.findByAccountAndCosmetic(accountN, cosmeticItem.id);
  check('inventory_item creada vía CHALLENGE_CLAIM', inventoryItemN !== null);
  check('acquisitionSourceType == CHALLENGE_CLAIM', inventoryItemN?.acquisitionSourceType === 'CHALLENGE_CLAIM');
  check('acquisitionSourceId == account_challenge.id (§4.4/§4.17)', inventoryItemN?.acquisitionSourceId === fakeAccountChallengeId);
  const grantN = await grantRepo.findByIdempotencyKey(`reward:CHALLENGE_CLAIM:${fakeAccountChallengeId}`);
  check('reward_grant con sourceEntityType CHALLENGE_CLAIM creado', grantN?.sourceEntityType === 'CHALLENGE_CLAIM');

  console.log('--- 11. Componente no marcado DELIVERED si falla el inventario (Gate 55) ---');
  const poisonedInventoryRepo = new PoisonOnceInventoryItemRepository(prisma);
  const workerPoisoned = buildWorker(poisonedInventoryRepo);
  const poisonBundleHeader = await bundleRepo.create({
    bundleKey: `gate-5a-poison-bundle-${suffix}`,
    name: 'Bundle para fallo inyectado (gate 5.a)',
    items: [{ componentType: 'COSMETIC', referenceId: cosmeticItem.id }],
  });
  const poisonBundle = await bundleRepo.findById(poisonBundleHeader.id);
  const accountP = randomUUID();
  const { allResolved: poisonedAllResolved, grant: poisonedGrant } = await workerPoisoned.deliverBundleComponents(
    accountP,
    poisonBundle!,
    'CHALLENGE_CLAIM',
    randomUUID(),
  );
  check('deliverBundleComponents -> allResolved=false (fallo inyectado)', poisonedAllResolved === false);
  const poisonedComponent = await componentRepo.findById(poisonedGrant.components[0]!.id);
  check('componente quedó FAILED, nunca DELIVERED', poisonedComponent?.deliveryStatus === 'FAILED');
  const inventoryItemP = await inventoryItemRepo.findByAccountAndCosmetic(accountP, cosmeticItem.id);
  check('ninguna inventory_item creada tras el fallo', inventoryItemP === null);

  // Reintento con el repositorio real (ya "desarmado" tras su único fallo) -- debe resolverse ahora.
  const { allResolved: retryAllResolved } = await worker.deliverBundleComponents(accountP, poisonBundle!, 'CHALLENGE_CLAIM', randomUUID());
  check('reintento posterior (sin el fallo) -> allResolved=true', retryAllResolved === true);

  console.log('--- 12. Componentes COSMETIC/PENDING históricos: documentados, no silenciados (§4.19, Gate 58) ---');
  const historicalPending = await pg.query("SELECT count(*)::int AS n FROM reward_grant_component WHERE component_type = 'COSMETIC' AND delivery_status = 'PENDING'");
  console.log(`  INFO  reward_grant_component COSMETIC en PENDING en toda la base: ${historicalPending.rows[0].n} (limitación conocida, §4.19 -- sin reconciliación automática, no es una falla de este gate)`);
  const pendingFromThisGate = await pg.query(
    `SELECT count(*)::int AS n FROM reward_grant_component rgc
     JOIN reward_grant rg ON rg.id = rgc.reward_grant_id
     WHERE rgc.component_type = 'COSMETIC' AND rgc.delivery_status = 'PENDING' AND rg.account_id = ANY($1)`,
    [[accountL, accountM, accountN]],
  );
  check('ninguno de los componentes COSMETIC entregados por ESTE gate quedó PENDING (5.a sí los entrega)', pendingFromThisGate.rows[0].n === 0);

  console.log('--- 13. Fuera de alcance: sin equipped_cosmetic, sin endpoints, sin tocar public_profile ---');
  const publicProfileTouched = await pg.query('SELECT count(*)::int AS n FROM public_profile WHERE account_id = ANY($1)', [
    [accountX, accountL, accountM, accountN, accountP],
  ]);
  check('ningún public_profile creado/tocado', publicProfileTouched.rows[0].n === 0);
  const studentResponseTouched = await pg.query('SELECT count(*)::int AS n FROM student_response WHERE account_id = ANY($1)', [
    [accountX, accountL, accountM, accountN, accountP],
  ]);
  check('ningún StudentResponse creado/tocado (PROGRESS fuera de alcance)', studentResponseTouched.rows[0].n === 0);

  console.log('--- 14. Frontera de dominio: verificación estática (Gate 57, sin camino de entrega paralelo) ---');
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');

  const filesToCheck = ['cosmetic-item.repository.ts', 'inventory-item.repository.ts'];
  const forbiddenSymbols = ['StudentResponse', 'CurriculumTopicProgress', 'PublicProfile', 'equippedTitle', 'equippedCosmetic', 'RewardEvaluationWorker'];
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
  check('ningún repositorio de 5.a referencia PROGRESS/Public Profile/equipamiento/worker', !boundaryViolationFound);

  // Sin camino de entrega paralelo: ningún archivo de gamification/, aparte
  // del propio repositorio y del worker, crea un inventory_item.
  let parallelPathFound = false;
  const gamificationFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.ts'));
  for (const file of gamificationFiles) {
    if (file === 'inventory-item.repository.ts' || file === 'reward-evaluation.worker.ts') continue;
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    if (contents.includes('.inventoryItem.create(') || contents.includes('prisma.inventoryItem.create')) {
      parallelPathFound = true;
      console.error(`  ${file} crea inventory_item fuera de InventoryItemRepository/deliverCosmeticComponent`);
    }
  }
  check('sin camino de entrega paralelo -- ningún otro archivo crea inventory_item directamente', !parallelPathFound);

  const controllerFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.controller.ts'));
  let publicExposureFound = false;
  for (const file of controllerFiles) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    if (contents.includes('CosmeticItemRepository') || contents.includes('InventoryItemRepository')) {
      publicExposureFound = true;
      console.error(`  ${file} expone cosmetic_item/inventory_item públicamente`);
    }
  }
  check('ningún controller expone cosmetic_item/inventory_item (sin endpoints en 5.a, eso es 5.b)', !publicExposureFound);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundación de Cosméticos (Bloque III, sub-incremento 5.a) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
