// Gate del Bloque III, Incremento 3, sub-incremento 3.a ("Fundación de
// persistencia y entrega de títulos", BLOCK-III-DEFINITION.md, ADR-0019) --
// mezcla estructural (esquema/constraints, sin HTTP) y de entrega real
// (worker), mismo criterio combinado que verify-reward-foundation-gate.ts
// (1.a) + verify-reward-delivery-xp-bonus-gate.ts (1.c). SIN
// equipped_title, SIN endpoints, SIN tocar public_profile -- verificado
// explícitamente al final (eso es 3.b).
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
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
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

  // achievement_definition no admite DELETE -- mismo criterio de higiene
  // ya establecido en 2.a/2.b/1.c: retirar filas de prueba de corridas
  // anteriores para que no interfieran con las cuentas nuevas de este gate.
  await pg.query("UPDATE achievement_definition SET status = 'RETIRED' WHERE status = 'ACTIVE'");

  const titleDefinitionRepo = new TitleDefinitionRepository(prisma);
  const accountTitleRepo = new AccountTitleRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const grantRepo = new RewardGrantRepository(prisma);
  const componentRepo = new RewardGrantComponentRepository(prisma);
  const cursorRepo = new RewardEvaluationCursorRepository(prisma);
  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const balanceRepo = new XpBalanceRepository(prisma);
  const levelDefRepo = new LevelDefinitionRepository(prisma);
  const progressionService = new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo);
  const txRunner = new TransactionRunnerService(prisma);
  const achievementDefinitionRepo = new AchievementDefinitionRepository(prisma);
  const achievementVersionRepo = new AchievementVersionRepository(prisma);
  const achievementProgressRepo = new AchievementProgressRepository(prisma);
  const achievementUnlockRepo = new AchievementUnlockRepository(prisma);
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
  );

  const suffix = Date.now();

  console.log('--- 1. title_definition: creación, rarityClass/unlockSourceType abiertos, UNIQUE(titleKey) ---');
  const titleDefinition = await titleDefinitionRepo.create({
    titleKey: `first-unit-mastered-title-${suffix}`,
    displayText: 'Maestro de la primera unidad',
    description: 'Otorgado al dominar la primera unidad.',
    rarityClass: 'EPIC', // valor libre -- Data Model no enumera rareza (§16.33: "clasificación visual... no implica probabilidades ocultas")
    unlockSourceType: 'ACHIEVEMENT_UNLOCK', // metadato descriptivo -- NO gatea la entrega
    visibilityStatus: 'PUBLIC',
  });
  check('title_definition creado', titleDefinition.id !== undefined);
  check('status nace ACTIVE', titleDefinition.status === 'ACTIVE');
  check('rarityClass persistida tal cual (sin coerción a enum)', titleDefinition.rarityClass === 'EPIC');

  let duplicateTitleKeyRejected = false;
  try {
    await titleDefinitionRepo.create({
      titleKey: titleDefinition.titleKey,
      displayText: 'Duplicado',
      rarityClass: 'COMMON',
      unlockSourceType: 'LEVEL',
      visibilityStatus: 'PRIVATE',
    });
  } catch (error) {
    duplicateTitleKeyRejected = (error as { code?: string }).code === 'P2002';
  }
  check('UNIQUE rechaza title_key duplicado', duplicateTitleKeyRejected);

  console.log('--- 2. Cierra la promesa de 1.a: TITLE con reference_id inexistente rechazado por trigger, en AMBAS tablas ---');
  const bundleForBadReference = await bundleRepo.create({
    bundleKey: `title-gate-bad-ref-${suffix}`,
    name: 'Bundle con referencia inválida (gate)',
    items: [],
  });

  let bundleItemRejected = false;
  try {
    await pg.query(
      `INSERT INTO reward_bundle_item (id, reward_bundle_id, component_type, xp_amount, reference_id)
       VALUES ($1, $2, 'TITLE', NULL, $3)`,
      [randomUUID(), bundleForBadReference.id, randomUUID()],
    );
  } catch (error) {
    bundleItemRejected = String((error as Error).message ?? '').includes('title_definition');
  }
  check('trigger rechaza reward_bundle_item TITLE con reference_id inexistente en title_definition', bundleItemRejected);

  // El CHECK de coherencia (1.a) sigue teniendo prioridad cuando
  // reference_id es NULL -- el trigger nuevo no lo enmascara.
  let bundleItemNullStillChecked = false;
  try {
    await pg.query(
      `INSERT INTO reward_bundle_item (id, reward_bundle_id, component_type, xp_amount, reference_id)
       VALUES ($1, $2, 'TITLE', NULL, NULL)`,
      [randomUUID(), bundleForBadReference.id],
    );
  } catch (error) {
    bundleItemNullStillChecked = (error as { code?: string }).code === '23514';
  }
  check('CHECK de coherencia (1.a) sigue vigente para reference_id NULL, sin interferencia del trigger nuevo', bundleItemNullStillChecked);

  const bundleWithRealTitle = await bundleRepo.create({
    bundleKey: `title-gate-good-ref-${suffix}`,
    name: 'Bundle con referencia real (gate)',
    items: [{ componentType: 'TITLE', referenceId: titleDefinition.id }],
  });
  const grantForBadComponentRef = await grantRepo.createIdempotent({
    accountId: randomUUID(),
    rewardBundleId: bundleWithRealTitle.id,
    sourceEntityType: 'LEVEL',
    sourceEntityId: `title-gate-fk-${suffix}`,
    idempotencyKey: `reward:LEVEL:title-gate-fk-${suffix}`,
    components: [{ componentType: 'TITLE', referenceId: titleDefinition.id }],
  });
  let componentUpdateRejected = false;
  try {
    await pg.query('UPDATE reward_grant_component SET reference_id = $1 WHERE id = $2', [
      randomUUID(),
      grantForBadComponentRef.grant.components[0]!.id,
    ]);
  } catch (error) {
    componentUpdateRejected = String((error as Error).message ?? '').includes('title_definition');
  }
  check('trigger rechaza UPDATE de reward_grant_component.reference_id a un valor inexistente en title_definition', componentUpdateRejected);

  console.log('--- 3. account_title: idempotencia, UNIQUE(accountId, titleDefinitionId), FK ---');
  const accountX = randomUUID();
  const firstGrant = await accountTitleRepo.createIdempotent({
    accountId: accountX,
    titleDefinitionId: titleDefinition.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${accountX}:2`,
    acquiredAt: new Date(),
  });
  check('primer createIdempotent -> created=true', firstGrant.created === true);
  check('ownershipStatus nace ACTIVE', firstGrant.accountTitle.ownershipStatus === 'ACTIVE');
  check('revokedAt nace NULL', firstGrant.accountTitle.revokedAt === null);

  const secondGrant = await accountTitleRepo.createIdempotent({
    accountId: accountX,
    titleDefinitionId: titleDefinition.id,
    acquisitionSourceType: 'ACHIEVEMENT_UNLOCK', // deliberadamente distinto -- no debe usarse
    acquisitionSourceId: 'otro-origen',
    acquiredAt: new Date(),
  });
  check('segundo createIdempotent (mismo par) -> created=false', secondGrant.created === false);
  check('devuelve LA MISMA fila (acquisitionSourceType original, no el del segundo intento)', secondGrant.accountTitle.acquisitionSourceType === 'LEVEL');
  const accountTitleCount = await pg.query('SELECT count(*)::int AS n FROM account_title WHERE account_id = $1 AND title_definition_id = $2', [
    accountX,
    titleDefinition.id,
  ]);
  check('sigue existiendo UNA sola account_title para ese par', accountTitleCount.rows[0].n === 1);

  let fkRejectedForUnknownTitle = false;
  try {
    await accountTitleRepo.createIdempotent({
      accountId: accountX,
      titleDefinitionId: randomUUID(),
      acquisitionSourceType: 'LEVEL',
      acquisitionSourceId: 'x',
      acquiredAt: new Date(),
    });
  } catch (error) {
    fkRejectedForUnknownTitle = (error as { code?: string }).code === 'P2003';
  }
  check('FK rechaza account_title con title_definition_id inexistente', fkRejectedForUnknownTitle);

  console.log('--- 4. Inmutabilidad por diseño de repositorio (sin update genérico expuesto) ---');
  check('TitleDefinitionRepository no expone update/delete', !('update' in titleDefinitionRepo) && !('delete' in titleDefinitionRepo));
  check('AccountTitleRepository no expone update() genérico', !('update' in accountTitleRepo));

  console.log('--- 5. Entrega real vía el worker: fuente LEVEL, componente TITLE ---');
  const levelBundle = await bundleRepo.create({
    bundleKey: `title-gate-level-bundle-${suffix}`,
    name: 'Recompensa de nivel con título (gate)',
    items: [{ componentType: 'TITLE', referenceId: titleDefinition.id }],
  });
  const maxThreshold = (await pg.query('SELECT COALESCE(MAX(minimum_lifetime_xp), 0)::int AS n FROM level_definition')).rows[0].n as number;
  const levelThreshold = maxThreshold + 1000;
  const levelNumber = 800_000 + (suffix % 100_000);
  await pg.query("UPDATE level_definition SET status = 'RETIRED' WHERE level_number >= 800000 AND status = 'ACTIVE'");
  const levelDefinition = await levelDefRepo.create({ levelNumber, minimumLifetimeXp: levelThreshold });
  await pg.query('UPDATE level_definition SET reward_bundle_id = $1 WHERE id = $2', [levelBundle.id, levelDefinition.id]);

  const accountL = randomUUID();
  const { entry } = await ledgerRepo.createIdempotent({
    accountId: accountL,
    entryType: 'AJUSTE',
    xpAmount: levelThreshold + 50,
    idempotencyKey: `title-gate-${suffix}-level-entry`,
    occurredAt: new Date(),
  });
  await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, {
    accountId: accountL,
    deltaXp: entry.xpAmount,
    lastLedgerEntryId: entry.id,
  });

  const outcomeL1 = await worker.processAccount(accountL);
  check('processAccount -> PROCESSED', outcomeL1 === 'PROCESSED');

  const accountTitleL = await accountTitleRepo.findByAccountAndTitle(accountL, titleDefinition.id);
  check('account_title creada por el worker', accountTitleL !== null);
  check('acquisitionSourceType == LEVEL (snapshot del grant, no de TitleDefinition.unlockSourceType)', accountTitleL?.acquisitionSourceType === 'LEVEL');
  check('acquisitionSourceId == {accountId}:{levelNumber}', accountTitleL?.acquisitionSourceId === `${accountL}:${levelNumber}`);

  const grantL = await grantRepo.findByIdempotencyKey(`reward:LEVEL:${accountL}:${levelNumber}`);
  check('componente TITLE quedó DELIVERED', grantL?.components[0]?.deliveryStatus === 'DELIVERED');

  console.log('--- 6. Reintento no duplica (idempotencia real, no solo por construcción) ---');
  const outcomeL2 = await worker.processAccount(accountL);
  check('reintento (sin pendientes nuevas) -> PROCESSED', outcomeL2 === 'PROCESSED');
  const accountTitleCountL = await pg.query('SELECT count(*)::int AS n FROM account_title WHERE account_id = $1', [accountL]);
  check('sigue existiendo UNA sola account_title tras el reintento', accountTitleCountL.rows[0].n === 1);

  console.log('--- 7. Entrega real vía el worker: fuente ACHIEVEMENT_UNLOCK, componente TITLE (reutiliza el mismo mecanismo) ---');
  const achievementBundle = await bundleRepo.create({
    bundleKey: `title-gate-achievement-bundle-${suffix}`,
    name: 'Recompensa de logro con título (gate)',
    items: [{ componentType: 'TITLE', referenceId: titleDefinition.id }],
  });
  const achievementDefinition = await achievementDefinitionRepo.create({
    achievementKey: `title-gate-achievement-${suffix}`,
    name: 'Logro de prueba (gate 3.a)',
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
    idempotencyKey: `title-gate-${suffix}-achievement-entry`,
    occurredAt: new Date(),
  });
  await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId: accountM, deltaXp: entryM.xpAmount, lastLedgerEntryId: entryM.id });

  const outcomeM1 = await worker.processAccount(accountM);
  check('processAccount -> PROCESSED', outcomeM1 === 'PROCESSED');

  const accountTitleM = await accountTitleRepo.findByAccountAndTitle(accountM, titleDefinition.id);
  check('account_title creada vía logro', accountTitleM !== null);
  check('acquisitionSourceType == ACHIEVEMENT_UNLOCK', accountTitleM?.acquisitionSourceType === 'ACHIEVEMENT_UNLOCK');
  const unlockM = await achievementUnlockRepo.findByAccountDefinitionInstance(accountM, achievementDefinition.id, 1);
  check('acquisitionSourceId == achievement_unlock.id (§4.4)', accountTitleM?.acquisitionSourceId === unlockM?.id);

  console.log('--- 8. Fuera de alcance: sin uso de equipped_title, sin endpoints, sin tocar public_profile ---');
  // equipped_title ya existe desde el sub-incremento 3.b (autorizado) --
  // este gate (3.a) no la crea NI la usa: la comprobación relevante es
  // que ninguna fila referencia los account_title de ESTE gate.
  const equippedTitleRowsForAccounts = await pg.query(
    'SELECT count(*)::int AS n FROM equipped_title WHERE account_title_id IN (SELECT id FROM account_title WHERE account_id = ANY($1))',
    [[accountX, accountL, accountM]],
  );
  check('ningún equipped_title creado a partir de las account_title de este gate (3.a no equipa nada)', equippedTitleRowsForAccounts.rows[0].n === 0);
  const accountsTouched = [accountX, accountL, accountM];
  const publicProfileTouched = await pg.query('SELECT count(*)::int AS n FROM public_profile WHERE account_id = ANY($1)', [accountsTouched]);
  check('ningún public_profile creado/tocado', publicProfileTouched.rows[0].n === 0);
  const studentResponseTouched = await pg.query('SELECT count(*)::int AS n FROM student_response WHERE account_id = ANY($1)', [accountsTouched]);
  check('ningún StudentResponse creado/tocado (PROGRESS fuera de alcance)', studentResponseTouched.rows[0].n === 0);

  console.log('--- 9. Frontera de dominio: verificación estática ---');
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const filesToCheck = ['title-definition.repository.ts', 'account-title.repository.ts'];
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
  check('ningún repositorio de 3.a referencia PROGRESS/Public Profile/equipamiento/worker', !boundaryViolationFound);

  const controllerFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.controller.ts'));
  let publicExposureFound = false;
  for (const file of controllerFiles) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    if (contents.includes('TitleDefinitionRepository') || contents.includes('AccountTitleRepository')) {
      publicExposureFound = true;
      console.error(`  ${file} expone title_definition/account_title públicamente`);
    }
  }
  check('ningún controller expone title_definition/account_title (sin endpoints en 3.a, eso es 3.b)', !publicExposureFound);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundación de Títulos (Bloque III, sub-incremento 3.a) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
