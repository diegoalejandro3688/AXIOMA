// Gate del Bloque IV, Incremento 3, sub-incremento 3.a ("Fundación de
// resolución de identidad", ADR-0021 §2/§3) -- SIN HTTP: prueba
// directamente `CompetitiveProfileIdentityService` contra Postgres real,
// mismo criterio que verify-reward-delivery-xp-bonus-gate.ts. Cubre
// EXCLUSIVAMENTE presentabilidad + lista blanca de identidad -- ningún
// contexto competitivo (rankPosition/metricValue/liga), que es
// responsabilidad de 3.b, deliberadamente fuera de alcance aquí.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PublicProfileRepository } from '../src/user/public-profile.repository';
import { EquippedTitleRepository } from '../src/gamification/equipped-title.repository';
import { EquippedCosmeticRepository } from '../src/gamification/equipped-cosmetic.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { AchievementUnlockRepository } from '../src/gamification/achievement-unlock.repository';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import { FeaturedAchievementRepository } from '../src/gamification/featured-achievement.repository';
import { CompetitiveProfileIdentityService } from '../src/user/competitive-profile-identity.service';
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
  // `log` con `emit: 'event'` -- necesario para el gate anti-N+1 (sección 5):
  // cuenta consultas SQL reales emitidas por Prisma, no una aproximación.
  const prisma = new PrismaClient({ adapter, log: [{ emit: 'event', level: 'query' }] }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  let queryCount = 0;
  (prisma as unknown as { $on: (event: 'query', cb: () => void) => void }).$on('query', () => {
    queryCount++;
  });

  const publicProfileRepo = new PublicProfileRepository(prisma);
  const equippedTitleRepo = new EquippedTitleRepository(prisma);
  const equippedCosmeticRepo = new EquippedCosmeticRepository(prisma);
  const xpBalanceRepo = new XpBalanceRepository(prisma);
  const levelDefinitionRepo = new LevelDefinitionRepository(prisma);
  const achievementUnlockRepo = new AchievementUnlockRepository(prisma);
  const titleDefinitionRepo = new TitleDefinitionRepository(prisma);
  const accountTitleRepo = new AccountTitleRepository(prisma);
  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const achievementDefinitionRepo = new AchievementDefinitionRepository(prisma);
  const achievementVersionRepo = new AchievementVersionRepository(prisma);
  const featuredAchievementRepo = new FeaturedAchievementRepository(prisma);

  const service = new CompetitiveProfileIdentityService(
    publicProfileRepo,
    equippedTitleRepo,
    equippedCosmeticRepo,
    xpBalanceRepo,
    levelDefinitionRepo,
    achievementUnlockRepo,
    featuredAchievementRepo,
  );

  const suffix = Date.now();

  async function createPresentableProfile(label: string, lifetimeXp: number) {
    const accountId = randomUUID();
    await pg.query(
      `INSERT INTO public_profile (id, account_id, username_normalized, avatar_reference, visibility_status, lifecycle_status, username_changed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'VISIBLE', 'ACTIVE', now(), now(), now())`,
      [randomUUID(), accountId, `${label}-${suffix}`.toLowerCase(), `avatar-${label}`],
    );
    if (lifetimeXp > 0) {
      await xpBalanceRepo.create({ accountId, lifetimeXp });
    }
    return accountId;
  }

  async function createNonPresentableProfile(label: string, lifecycleStatus: 'ACTIVE' | 'RETIRED' | 'ANONYMIZED', visibilityStatus: 'PRIVATE' | 'VISIBLE') {
    const accountId = randomUUID();
    await pg.query(
      `INSERT INTO public_profile (id, account_id, username_normalized, visibility_status, lifecycle_status, username_changed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now(), now())`,
      [randomUUID(), accountId, `${label}-${suffix}`.toLowerCase(), visibilityStatus, lifecycleStatus],
    );
    return accountId;
  }

  console.log('--- 0. Fixtures: catálogo compartido (título, cosmético, logro PÚBLICO, logro PRIVADO) ---');
  const title = await titleDefinitionRepo.create({
    titleKey: `cpi-gate-title-${suffix}`,
    displayText: 'Explorador de la fundación',
    rarityClass: 'RARE',
    unlockSourceType: 'LEVEL',
    visibilityStatus: 'PUBLIC',
  });
  const cosmetic = await cosmeticItemRepo.create({
    itemKey: `cpi-gate-cosmetic-${suffix}`,
    itemType: 'AVATAR_FRAME',
    name: 'Marco dorado',
    rarityClass: 'RARE',
    assetReference: 'asset://cpi-gate/frame',
    visibilityStatus: 'PUBLIC',
  });
  // AVATAR-RECON -- cosmético AVATAR de fixture: la fuente de verdad del
  // avatar visible ahora es el cosmético EQUIPADO en este slot, nunca
  // `public_profile.avatar_reference` (que las fixtures de abajo siguen
  // insertando deliberadamente, para probar que ya NO se lee).
  const avatarCosmetic = await cosmeticItemRepo.create({
    itemKey: `cpi-gate-avatar-${suffix}`,
    itemType: 'AVATAR',
    name: 'Avatar de fixture',
    rarityClass: 'COMMON',
    assetReference: 'asset://cpi-gate/avatar-equipped',
    visibilityStatus: 'PUBLIC',
  });
  const publicAchievementDef = await achievementDefinitionRepo.create({
    achievementKey: `cpi-gate-public-${suffix}`,
    name: 'Logro público de prueba',
    achievementCategory: 'XP',
    visibilityClass: 'PUBLIC',
    repeatability: 'UNIQUE',
    progressTrackingType: 'XP_THRESHOLD',
  });
  const publicAchievementVersion = await achievementVersionRepo.create({
    achievementDefinitionId: publicAchievementDef.id,
    versionLabel: `v1-${suffix}`,
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 1 },
  });
  const privateAchievementDef = await achievementDefinitionRepo.create({
    achievementKey: `cpi-gate-private-${suffix}`,
    name: 'Logro privado de prueba',
    achievementCategory: 'XP',
    visibilityClass: 'PRIVATE',
    repeatability: 'UNIQUE',
    progressTrackingType: 'XP_THRESHOLD',
  });
  const privateAchievementVersion = await achievementVersionRepo.create({
    achievementDefinitionId: privateAchievementDef.id,
    versionLabel: `v1-${suffix}`,
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 1 },
  });
  check('catálogo de fixtures creado', Boolean(title.id && cosmetic.id && publicAchievementDef.id && privateAchievementDef.id));

  console.log('--- 1. Perfil presentable COMPLETO: título, cosmético, nivel derivado, logro público (nunca el privado ni el revocado) ---');
  const accountFull = await createPresentableProfile('full', 150); // nivel 2 (minimumLifetimeXp=100)
  const profileFull = await publicProfileRepo.findByAccountId(accountFull);
  const { accountTitle } = await accountTitleRepo.createIdempotent({
    accountId: accountFull,
    titleDefinitionId: title.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${accountFull}:2`,
    acquiredAt: new Date(),
  });
  await equippedTitleRepo.upsert(profileFull!.id, accountTitle.id);
  const { inventoryItem } = await inventoryItemRepo.createIdempotent({
    accountId: accountFull,
    cosmeticItemId: cosmetic.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${accountFull}:2`,
    acquiredAt: new Date(),
  });
  await equippedCosmeticRepo.upsert(profileFull!.id, 'AVATAR_FRAME', inventoryItem.id);
  const { inventoryItem: avatarInventoryItem } = await inventoryItemRepo.createIdempotent({
    accountId: accountFull,
    cosmeticItemId: avatarCosmetic.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${accountFull}:2`,
    acquiredAt: new Date(),
  });
  await equippedCosmeticRepo.upsert(profileFull!.id, 'AVATAR', avatarInventoryItem.id);
  // Logro público ACTIVE -- debe aparecer.
  await pg.query(
    `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at, status)
     VALUES ($1, $2, $3, $4, 1, now(), 'ACTIVE')`,
    [randomUUID(), accountFull, publicAchievementDef.id, publicAchievementVersion.id],
  );
  // Logro privado ACTIVE -- NUNCA debe aparecer.
  await pg.query(
    `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at, status)
     VALUES ($1, $2, $3, $4, 1, now(), 'ACTIVE')`,
    [randomUUID(), accountFull, privateAchievementDef.id, privateAchievementVersion.id],
  );
  // Segundo logro público, pero REVERSED -- NUNCA debe aparecer (Decision Gate 8, ADR-0021).
  const revocablePublicDef = await achievementDefinitionRepo.create({
    achievementKey: `cpi-gate-public-reversed-${suffix}`,
    name: 'Logro público revocado',
    achievementCategory: 'XP',
    visibilityClass: 'PUBLIC',
    repeatability: 'UNIQUE',
    progressTrackingType: 'XP_THRESHOLD',
  });
  const revocablePublicVersion = await achievementVersionRepo.create({
    achievementDefinitionId: revocablePublicDef.id,
    versionLabel: `v1-${suffix}`,
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 1 },
  });
  await pg.query(
    `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at, status, reversed_at)
     VALUES ($1, $2, $3, $4, 1, now(), 'REVERSED', now())`,
    [randomUUID(), accountFull, revocablePublicDef.id, revocablePublicVersion.id],
  );

  const resolvedFull = await service.resolveByAccountId(accountFull);
  check('perfil completo resuelve presentable=true', resolvedFull.presentable === true);
  if (resolvedFull.presentable) {
    const identity = resolvedFull.identity;
    check('username correcto', identity.username === `full-${suffix}`.toLowerCase());
    check(
      'avatar resuelve desde el cosmético AVATAR equipado, NO desde public_profile.avatar_reference (AVATAR-RECON)',
      identity.avatar === avatarCosmetic.assetReference && identity.avatar !== `avatar-full`,
    );
    check('equippedTitle presente con los campos esperados', identity.equippedTitle?.titleKey === title.titleKey && identity.equippedTitle?.displayText === title.displayText);
    check(
      'equippedCosmetics contiene exactamente los dos cosméticos equipados (AVATAR_FRAME + AVATAR)',
      identity.equippedCosmetics.length === 2 && identity.equippedCosmetics.some((c) => c.itemKey === cosmetic.itemKey) && identity.equippedCosmetics.some((c) => c.itemKey === avatarCosmetic.itemKey),
    );
    check('levelNumber derivado correctamente (150 XP -> nivel 2)', identity.levelNumber === 2);
    check('publicAchievements contiene EXACTAMENTE el logro público ACTIVE (ni el privado ni el revocado)', identity.publicAchievements.length === 1 && identity.publicAchievements[0]?.achievementKey === publicAchievementDef.achievementKey);
    check('la respuesta NUNCA expone lifetimeXp/XP en crudo', !('lifetimeXp' in identity) && !('xpAmount' in identity));
  }

  console.log('--- 2. Perfil presentable MÍNIMO: sin título/cosmético/logros, nivel 1 por defecto ---');
  const accountMinimal = await createPresentableProfile('minimal', 0);
  const resolvedMinimal = await service.resolveByAccountId(accountMinimal);
  check('perfil mínimo resuelve presentable=true', resolvedMinimal.presentable === true);
  if (resolvedMinimal.presentable) {
    const identity = resolvedMinimal.identity;
    check('avatar es null sin ningún cosmético AVATAR equipado (corte limpio AVATAR-RECON, sin coalesce a avatar_reference)', identity.avatar === null);
    check('equippedTitle es null (campo vacío legítimo, no redacción)', identity.equippedTitle === null);
    check('equippedCosmetics es un arreglo vacío', identity.equippedCosmetics.length === 0);
    check('publicAchievements es un arreglo vacío', identity.publicAchievements.length === 0);
    check('levelNumber == 1 sin XP', identity.levelNumber === 1);
  }

  console.log('--- 3. Perfiles NO presentables: PRIVATE, RETIRED, ANONYMIZED, inexistente -- todos resuelven EXACTAMENTE {presentable:false} ---');
  const accountPrivate = await createNonPresentableProfile('private', 'ACTIVE', 'PRIVATE');
  const accountRetired = await createNonPresentableProfile('retired', 'RETIRED', 'PRIVATE');
  const accountAnonymized = await createNonPresentableProfile('anonymized', 'ANONYMIZED', 'PRIVATE');
  const accountNonexistent = randomUUID(); // sin fila public_profile en absoluto

  // AVATAR-RECON, comportamiento protegido #8: un perfil ANONYMIZED con un
  // AVATAR todavía equipado (la anonimización histórica limpia
  // avatar_reference, pero ya NO controla el avatar visible) nunca debe
  // exponerlo -- isPresentable() exige ACTIVE+VISIBLE, así que ANONYMIZED
  // jamás llega a assembleIdentitiesForProfiles.
  // El trigger `enforce_equipped_cosmetic_account_consistency` exige
  // lifecycle_status=ACTIVE para equipar -- se equipa mientras el perfil
  // está ACTIVE y LUEGO se pasa a ANONYMIZED, reflejando cómo llegaría un
  // caso real a este estado (cuenta activa con avatar equipado, cerrada después).
  const profileAnonymized = await publicProfileRepo.findByAccountId(accountAnonymized);
  await pg.query("UPDATE public_profile SET lifecycle_status = 'ACTIVE' WHERE account_id = $1", [accountAnonymized]);
  const { inventoryItem: anonAvatarInventory } = await inventoryItemRepo.createIdempotent({
    accountId: accountAnonymized,
    cosmeticItemId: avatarCosmetic.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${accountAnonymized}:anon`,
    acquiredAt: new Date(),
  });
  await equippedCosmeticRepo.upsert(profileAnonymized!.id, 'AVATAR', anonAvatarInventory.id);
  await pg.query("UPDATE public_profile SET lifecycle_status = 'ANONYMIZED' WHERE account_id = $1", [accountAnonymized]);

  for (const [label, accountId] of [
    ['PRIVATE', accountPrivate],
    ['RETIRED', accountRetired],
    ['ANONYMIZED', accountAnonymized],
    ['inexistente', accountNonexistent],
  ] as const) {
    const resolved = await service.resolveByAccountId(accountId);
    check(`${label} -> presentable=false`, resolved.presentable === false);
    check(`${label} -> EXACTAMENTE la clave "presentable", ninguna otra (sin identidad filtrada)`, Object.keys(resolved).length === 1 && 'presentable' in resolved);
  }

  console.log('--- 4. Resolución por lote: coincide exactamente con N resoluciones individuales ---');
  const mixedAccountIds = [accountFull, accountMinimal, accountPrivate, accountRetired, accountAnonymized, accountNonexistent];
  const batchResults = await service.resolveManyByAccountIds(mixedAccountIds);
  check('el lote devuelve una entrada por cada accountId solicitado', batchResults.size === mixedAccountIds.length);
  for (const accountId of mixedAccountIds) {
    const individual = await service.resolveByAccountId(accountId);
    const batched = batchResults.get(accountId);
    check(`lote == individual para ${accountId}`, JSON.stringify(individual) === JSON.stringify(batched));
  }

  console.log('--- 5. Sin patrón N+1: el número de consultas SQL del lote NO escala con la cantidad de cuentas ---');
  const manyAccountIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const accountId = await createPresentableProfile(`bulk${i}`, 50 * i);
    manyAccountIds.push(accountId);
  }

  queryCount = 0;
  await service.resolveManyByAccountIds(manyAccountIds.slice(0, 5));
  const queriesForFive = queryCount;

  queryCount = 0;
  await service.resolveManyByAccountIds(manyAccountIds);
  const queriesForFifteen = queryCount;

  check(
    `el lote de 5 cuentas emitió ${queriesForFive} consulta(s) SQL, el de 15 emitió ${queriesForFifteen} -- deben ser IGUALES (mismo número fijo de consultas, independiente de la cantidad de cuentas)`,
    queriesForFive === queriesForFifteen && queriesForFive > 0,
  );
  check(`el número de consultas del lote es pequeño y acotado (${queriesForFive} <= 20, muy por debajo de 15 cuentas x ~11 consultas si fuera N+1)`, queriesForFive <= 20);

  console.log('--- 6. Frontera de dominio: ningún archivo de GAMIFICATION importa de USER ---');
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const gamificationFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.ts'));
  let boundaryViolationFound = false;
  for (const file of gamificationFiles) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    if (contents.includes("from '../user/") || contents.includes('from "../user/')) {
      boundaryViolationFound = true;
      console.error(`  ${file} importa de src/user/ -- ciclo de módulos introducido`);
    }
  }
  check('ningún archivo de src/gamification/ importa de src/user/ (ADR-0021 §4, Decision Gate 7)', !boundaryViolationFound);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundación de Perfil Competitivo (Bloque IV, Incremento 3, sub-incremento 3.a) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
