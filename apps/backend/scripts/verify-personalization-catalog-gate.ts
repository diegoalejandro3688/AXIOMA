// Gate del LEF Bloque V, Incremento 6 ("Personalización con elementos
// bloqueados y requisito de desbloqueo visible") -- ver
// docs/adr/LEF-BLOCK-V-DEFINITION.md §14. Prueba contra el servidor real
// (GET /gamification/me/cosmetics, GET /gamification/me/titles) más un
// `RewardEvaluationWorker` real (mismo patrón que
// verify-reward-delivery-xp-bonus-gate.ts) para demostrar que "desbloquear"
// es SIEMPRE el flujo real de entrega, nunca una mutación artificial.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
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
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
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

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `catalog-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Higiene entre corridas -- mismo criterio que verify-reward-delivery-xp-bonus-gate.ts.
  await pg.query("UPDATE achievement_definition SET status = 'RETIRED' WHERE status = 'ACTIVE'");
  await pg.query("UPDATE level_definition SET status = 'RETIRED' WHERE level_number >= 900000 AND status = 'ACTIVE'");

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
  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const titleDefinitionRepo = new TitleDefinitionRepository(prisma);
  const challengeDefinitionRepo = new ChallengeDefinitionRepository(prisma);
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
  const now = new Date();

  console.log('--- 0. Fixtures: catálogo con requisitos reales (LEVEL/ACHIEVEMENT/CHALLENGE/sin-origen), PRIVATE, RETIRED ---');
  const alice = await createSession('alice');
  await req('POST', '/user/public-profile', alice.headers, { username: `catalog${suffix}`.slice(0, 20) });

  // --- Cosmético bloqueado por NIVEL (será el que realmente desbloqueamos, punto 7) ---
  const maxSeededThreshold = (await pg.query('SELECT COALESCE(MAX(minimum_lifetime_xp), 0)::int AS n FROM level_definition')).rows[0].n as number;
  const thresholdBase = maxSeededThreshold + 1000;
  const levelBase = 900_000 + (suffix % 100_000);
  const cosmeticByLevel = await cosmeticItemRepo.create({
    itemKey: `catalog-gate-level-cosmetic-${suffix}`,
    itemType: 'BADGE',
    name: 'Insignia por nivel',
    rarityClass: 'RARE',
    assetReference: `asset://catalog-gate/level-badge-${suffix}`,
    visibilityStatus: 'PUBLIC',
  });
  const bundleLevel = await bundleRepo.create({
    bundleKey: `catalog-gate-level-bundle-${suffix}`,
    name: 'Recompensa de gate -- nivel',
    items: [{ componentType: 'COSMETIC', referenceId: cosmeticByLevel.id }],
  });
  await levelDefRepo.create({ levelNumber: levelBase + 1, minimumLifetimeXp: thresholdBase });
  const unlockLevel = await levelDefRepo.create({ levelNumber: levelBase + 2, minimumLifetimeXp: thresholdBase + 100 });
  await pg.query('UPDATE level_definition SET reward_bundle_id = $1 WHERE id = $2', [bundleLevel.id, unlockLevel.id]);

  // --- Título bloqueado por LOGRO (ACHIEVEMENT) ---
  const titleByAchievement = await titleDefinitionRepo.create({
    titleKey: `catalog-gate-ach-title-${suffix}`,
    displayText: 'Erudito consolidado',
    rarityClass: 'EPIC',
    unlockSourceType: 'ACHIEVEMENT',
    visibilityStatus: 'PUBLIC',
  });
  const bundleAchievement = await bundleRepo.create({
    bundleKey: `catalog-gate-ach-bundle-${suffix}`,
    name: 'Recompensa de gate -- logro',
    items: [{ componentType: 'TITLE', referenceId: titleByAchievement.id }],
  });
  const achievementDef = await achievementDefinitionRepo.create({
    achievementKey: `catalog-gate-ach-${suffix}`,
    name: 'Logro de catálogo',
    achievementCategory: 'XP',
    visibilityClass: 'PUBLIC',
    repeatability: 'UNIQUE',
    progressTrackingType: 'XP_THRESHOLD',
  });
  const achievementVersion = await achievementVersionRepo.create({
    achievementDefinitionId: achievementDef.id,
    versionLabel: `v1-${suffix}`,
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 12345 },
    rewardBundleId: bundleAchievement.id,
    approvalStatus: 'APPROVED',
  });

  // --- Cosmético bloqueado por DESAFÍO (CHALLENGE) -- solo para verificar el requisito mostrado, sin ejecutar el flujo de claim completo. ---
  const cosmeticByChallenge = await cosmeticItemRepo.create({
    itemKey: `catalog-gate-challenge-cosmetic-${suffix}`,
    itemType: 'AVATAR_FRAME',
    name: 'Marco por desafío',
    rarityClass: 'COMMON',
    assetReference: `asset://catalog-gate/challenge-frame-${suffix}`,
    visibilityStatus: 'PUBLIC',
  });
  const bundleChallenge = await bundleRepo.create({
    bundleKey: `catalog-gate-challenge-bundle-${suffix}`,
    name: 'Recompensa de gate -- desafío',
    items: [{ componentType: 'COSMETIC', referenceId: cosmeticByChallenge.id }],
  });
  const challengeDef = await challengeDefinitionRepo.create({
    challengeKey: `catalog-gate-challenge-${suffix}`,
    name: 'Desafío de catálogo',
    challengeType: 'WEEKLY',
    eligibilityRule: 'account_age_days:0',
    completionRule: 'target_value:5',
    rewardBundleId: bundleChallenge.id,
    startsAt: new Date(now.getTime() - 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  });

  // --- Corrección del Product Owner (revisión de cierre): un CosmeticItem/
  // TitleDefinition ACTIVE y elegible para catálogo, PERO sin ningún
  // RewardBundleItem que lo referencie, NUNCA debe aparecer en `locked` --
  // ni con un requisito fabricado ni con `unlockRequirements: []`. Queda
  // fuera del catálogo descubrible por completo hasta que exista un vínculo
  // real. Deliberadamente SIN crear ningún RewardBundleItem para este ítem.
  const cosmeticNoSource = await cosmeticItemRepo.create({
    itemKey: `catalog-gate-nosource-cosmetic-${suffix}`,
    itemType: 'PROFILE_BANNER',
    name: 'Banner sin origen conocido',
    rarityClass: 'COMMON',
    assetReference: `asset://catalog-gate/nosource-${suffix}`,
    visibilityStatus: 'PUBLIC',
  });
  const titleNoSource = await titleDefinitionRepo.create({
    titleKey: `catalog-gate-nosource-title-${suffix}`,
    displayText: 'Título sin origen conocido',
    rarityClass: 'COMMON',
    unlockSourceType: 'LEVEL',
    visibilityStatus: 'PUBLIC',
  });

  // --- PRIVATE / RETIRED -- nunca deben aparecer, ni siquiera como bloqueados. ---
  const cosmeticPrivate = await cosmeticItemRepo.create({
    itemKey: `catalog-gate-private-cosmetic-${suffix}`,
    itemType: 'BADGE',
    name: 'Insignia privada (nunca visible)',
    rarityClass: 'COMMON',
    assetReference: `asset://catalog-gate/private-${suffix}`,
    visibilityStatus: 'PRIVATE',
  });
  const cosmeticRetiredId = randomUUID();
  await pg.query(
    `INSERT INTO cosmetic_item (id, item_key, item_type, name, rarity_class, asset_reference, visibility_status, status, created_at, retired_at)
     VALUES ($1, $2, 'BADGE', 'Insignia retirada', 'COMMON', $3, 'PUBLIC', 'RETIRED', now(), now())`,
    [cosmeticRetiredId, `catalog-gate-retired-cosmetic-${suffix}`, `asset://catalog-gate/retired-${suffix}`],
  );
  const titlePrivate = await titleDefinitionRepo.create({
    titleKey: `catalog-gate-private-title-${suffix}`,
    displayText: 'Título privado (nunca visible)',
    rarityClass: 'COMMON',
    unlockSourceType: 'LEVEL',
    visibilityStatus: 'PRIVATE',
  });

  check('fixtures creados sin errores', true);

  console.log('--- 4/5. Elementos no obtenidos VISIBLES aparecen bloqueados con requisito EXACTO ---');
  const cosmeticsBefore = await req('GET', '/gamification/me/cosmetics', alice.headers);
  check('GET /gamification/me/cosmetics -> 200', cosmeticsBefore.status === 200);
  const lockedByKey = new Map((cosmeticsBefore.body?.locked ?? []).map((l: { itemKey: string }) => [l.itemKey, l]));

  const lockedLevel = lockedByKey.get(cosmeticByLevel.itemKey) as { unlockRequirements: unknown[] } | undefined;
  check('4. cosmético bloqueado por NIVEL aparece en locked', lockedLevel !== undefined);
  check(
    '5. requisito LEVEL coincide EXACTAMENTE con level_definition real (levelNumber, minimumLifetimeXp)',
    JSON.stringify(lockedLevel?.unlockRequirements) === JSON.stringify([{ source: 'LEVEL', levelNumber: unlockLevel.levelNumber, minimumLifetimeXp: unlockLevel.minimumLifetimeXp }]),
  );

  const lockedChallenge = lockedByKey.get(cosmeticByChallenge.itemKey) as { unlockRequirements: unknown[] } | undefined;
  check('4. cosmético bloqueado por DESAFÍO aparece en locked', lockedChallenge !== undefined);
  check(
    '5. requisito CHALLENGE coincide EXACTAMENTE con challenge_definition real (challengeKey, name, type, completionRule)',
    JSON.stringify(lockedChallenge?.unlockRequirements) ===
      JSON.stringify([{ source: 'CHALLENGE', challengeKey: challengeDef.challengeKey, challengeName: challengeDef.name, challengeType: 'WEEKLY', completionRule: 'target_value:5' }]),
  );

  console.log('--- CASO NUEVO (revisión Product Owner): elemento ACTIVE/visible SIN ningún RewardBundleItem -- NUNCA en locked, NUNCA fabricado, sigue inequipable ---');
  check('1/2. cosmeticNoSource es ACTIVE y PUBLIC (elegible para catálogo)', cosmeticNoSource.status === 'ACTIVE' && cosmeticNoSource.visibilityStatus === 'PUBLIC');
  check('3. cosmético SIN ningún RewardBundleItem -> AUSENTE de locked (no aparece, ni con requisito vacío)', !lockedByKey.has(cosmeticNoSource.itemKey));
  check('4. no se fabrica ningún unlockRequirement -- confirmado por la ausencia total del ítem en la respuesta cruda', !cosmeticsBefore.raw.includes(cosmeticNoSource.itemKey));
  const equipNoSourceAttempt = await req('PUT', '/gamification/me/cosmetics/equipped/PROFILE_BANNER', alice.headers, { inventoryItemId: cosmeticNoSource.id });
  check('5. sigue siendo IMPOSIBLE equiparlo al no poseerlo (404, igual que cualquier ítem no poseído)', equipNoSourceAttempt.status === 404);

  const titlesBeforeForNoSourceCheck = await req('GET', '/gamification/me/titles', alice.headers);
  const lockedTitleKeysForNoSource = (titlesBeforeForNoSourceCheck.body?.locked ?? []).map((l: { titleKey: string }) => l.titleKey);
  check('3b. título SIN ningún RewardBundleItem -> AUSENTE de locked (mismo criterio, ambos tipos)', !lockedTitleKeysForNoSource.includes(titleNoSource.titleKey));
  check('4b. no se fabrica ningún unlockRequirement para el título tampoco', !titlesBeforeForNoSourceCheck.raw.includes(titleNoSource.titleKey));

  console.log('--- 8. PRIVATE/RETIRED nunca aparecen, ni siquiera como bloqueados ---');
  const lockedKeys = [...lockedByKey.keys()];
  check('cosmético PRIVATE ausente de locked', !lockedKeys.includes(cosmeticPrivate.itemKey));
  check('cosmético RETIRED ausente de locked', !lockedKeys.includes(`catalog-gate-retired-cosmetic-${suffix}`));

  console.log('--- 4/5/8/9. Mismas verificaciones para TÍTULOS (ownership separado de cosméticos) ---');
  const titlesBefore = await req('GET', '/gamification/me/titles', alice.headers);
  check('GET /gamification/me/titles -> 200', titlesBefore.status === 200);
  const lockedTitleByKey = new Map((titlesBefore.body?.locked ?? []).map((l: { titleKey: string }) => [l.titleKey, l]));
  const lockedAchievementTitle = lockedTitleByKey.get(titleByAchievement.titleKey) as { unlockRequirements: unknown[] } | undefined;
  check('4. título bloqueado por LOGRO aparece en locked', lockedAchievementTitle !== undefined);
  check(
    '5. requisito ACHIEVEMENT coincide EXACTAMENTE con achievement_version real (achievementKey, name, unlockRule)',
    JSON.stringify(lockedAchievementTitle?.unlockRequirements) ===
      JSON.stringify([{ source: 'ACHIEVEMENT', achievementKey: achievementDef.achievementKey, achievementName: achievementDef.name, unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 12345 } }]),
  );
  check('8. título PRIVATE ausente de locked', ![...lockedTitleByKey.keys()].includes(titlePrivate.titleKey));
  check('9. ownership separado: el título bloqueado NO aparece en el catálogo de cosméticos ni viceversa', !lockedKeys.includes(titleByAchievement.titleKey) && !lockedTitleByKey.has(cosmeticByLevel.itemKey));

  console.log('--- 6. Elemento bloqueado NO puede equiparse ---');
  const equipLockedAttempt = await req('PUT', '/gamification/me/cosmetics/equipped/BADGE', alice.headers, { inventoryItemId: cosmeticByLevel.id });
  check('intentar equipar un cosmético bloqueado (usando su cosmeticItemId como si fuera inventoryItemId) -> 404 (nunca existe inventory_item)', equipLockedAttempt.status === 404);

  console.log('--- 10. Ninguna tienda/economía aparece ---');
  const forbiddenEconomyKeys = ['price', 'cost', 'currency', 'coins', 'gems', 'purchase', 'buy'];
  let economyLeak: string | null = null;
  for (const key of forbiddenEconomyKeys) {
    if (cosmeticsBefore.raw.includes(`"${key}"`) || titlesBefore.raw.includes(`"${key}"`)) economyLeak = key;
  }
  check('ninguna clave de precio/moneda/compra aparece en ninguna respuesta', economyLeak === null);

  console.log('--- 7. Desbloquear REALMENTE (flujo real: XP -> nivel -> RewardEvaluationWorker) mueve el ítem de locked a owned ---');
  let entrySeq = 0;
  async function createXpEntry(accountId: string, xpAmount: number): Promise<void> {
    entrySeq++;
    const { entry } = await ledgerRepo.createIdempotent({
      accountId,
      entryType: 'AJUSTE',
      xpAmount,
      idempotencyKey: `catalog-gate-xp-${suffix}-${entrySeq}`,
      occurredAt: new Date(),
    });
    await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
  }
  await createXpEntry(alice.accountId, thresholdBase + 150); // cruza el umbral del nivel que entrega cosmeticByLevel
  const outcome = await worker.processAccount(alice.accountId);
  check('processAccount -> PROCESSED (entrega real, no mutación artificial)', outcome === 'PROCESSED');

  const cosmeticsAfter = await req('GET', '/gamification/me/cosmetics', alice.headers);
  const lockedAfterKeys = (cosmeticsAfter.body?.locked ?? []).map((l: { itemKey: string }) => l.itemKey);
  const ownedAfterKeys = (cosmeticsAfter.body?.owned ?? []).map((o: { itemKey: string }) => o.itemKey);
  check('7. el ítem YA NO aparece en locked tras desbloquearse de verdad', !lockedAfterKeys.includes(cosmeticByLevel.itemKey));
  check('7. el ítem SÍ aparece en owned (obtained=true real, vía inventory_item creado por el worker)', ownedAfterKeys.includes(cosmeticByLevel.itemKey));

  // Verificación cruzada directa contra la fuente real.
  const sourceInventory = await pg.query('SELECT ownership_status FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [alice.accountId, cosmeticByLevel.id]);
  check('7. inventory_item real ACTIVE (fuente de verdad, no una respuesta fabricada)', sourceInventory.rows[0]?.ownership_status === 'ACTIVE');

  console.log('--- 2/3. Obtenido+equipado vs. obtenido+no-equipado siguen siendo distinguibles (propiedad != equipamiento) ---');
  const ownedRow = (cosmeticsAfter.body?.owned ?? []).find((o: { itemKey: string }) => o.itemKey === cosmeticByLevel.itemKey);
  check('2. el ítem recién obtenido existe en owned con su inventoryItemId real', ownedRow?.inventoryItemId !== undefined);
  check('3. el ítem obtenido NO aparece como equipado todavía (equipped.BADGE distinto de este ítem)', cosmeticsAfter.body?.equipped?.BADGE?.itemKey !== cosmeticByLevel.itemKey);
  await req('PUT', '/gamification/me/cosmetics/equipped/BADGE', alice.headers, { inventoryItemId: ownedRow.inventoryItemId });
  const cosmeticsAfterEquip = await req('GET', '/gamification/me/cosmetics', alice.headers);
  check('2. tras equipar, equipped.BADGE == el ítem recién obtenido', cosmeticsAfterEquip.body?.equipped?.BADGE?.itemKey === cosmeticByLevel.itemKey);

  console.log('--- 1. Elemento obtenido -> obtained=true (presente en owned, verificado contra la fuente) ---');
  const sourceInventoryFinal = await pg.query('SELECT id FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [alice.accountId, cosmeticByLevel.id]);
  check('1. inventory_item real existe -- el catálogo lo refleja como obtenido', sourceInventoryFinal.rows.length === 1 && ownedAfterKeys.includes(cosmeticByLevel.itemKey));

  console.log('--- 11. Sin identidad requerida: 401 en ambos catálogos ---');
  const noSessionCosmetics = await req('GET', '/gamification/me/cosmetics');
  const noSessionTitles = await req('GET', '/gamification/me/titles');
  check('GET cosmetics sin sesión -> 401', noSessionCosmetics.status === 401);
  check('GET titles sin sesión -> 401', noSessionTitles.status === 401);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Personalización con Elementos Bloqueados (LEF Bloque V, Incremento 6) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
