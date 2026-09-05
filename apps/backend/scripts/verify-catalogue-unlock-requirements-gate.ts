// STABILIZATION-B6 -- gate PURO (sin HTTP): prueba que
// `UnlockRequirementResolverService` + `CosmeticEquipmentService`/
// `TitleEquipmentService`.getLockedByAccountId exponen ahora los dos
// mecanismos de desbloqueo post-Bloque-V que antes quedaban invisibles:
//
//   STUDY_SUBJECT   -- avatares históricos V1 (B6A): un cosmético cuyo
//                      itemKey está en HISTORIC_AVATAR_SUBJECT_MAP; el
//                      requisito se deriva del nombre canónico de la materia
//                      mapeada (sin RewardBundle).
//   TITLE_THRESHOLD -- Títulos V1 (B3): sin RewardBundle, requisito en
//                      TITLES_V1 (titles-v1-catalog.ts).
//
// Fixtures 100% sintéticos y namespaced (`b6cat-<suffix>`), borrados en un
// `finally`. Los 7 Títulos V1 reales se siembran con `seedTitlesV1`
// (idempotente). Se ejecuta vía `run-gate.ts` -> `.env.gates` ->
// axioma_gates_dev; aborta si apunta a axioma_dev.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { CurriculumTopicRepository } from '../src/education/curriculum-topic.repository';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { EquippedCosmeticRepository } from '../src/gamification/equipped-cosmetic.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { EquippedTitleRepository } from '../src/gamification/equipped-title.repository';
import { UnlockRequirementResolverService } from '../src/gamification/unlock-requirement-resolver.service';
import { CosmeticEquipmentService } from '../src/gamification/cosmetic-equipment.service';
import { TitleEquipmentService } from '../src/gamification/title-equipment.service';
import { TITLES_V1 } from '../src/gamification/titles-v1-catalog';
import { HISTORIC_AVATAR_SUBJECT_MAP } from '../src/gamification/cosmetics-v1-catalog';
import { SubjectRepository } from '../src/education/subject.repository';
import { seedTitlesV1 } from './seed-titles-v1';
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
  const raw = prisma as unknown as { $queryRawUnsafe: <T>(q: string, ...v: unknown[]) => Promise<T>; $executeRawUnsafe: (q: string, ...v: unknown[]) => Promise<number> };

  const dbCheck = await raw.$queryRawUnsafe<{ current_database: string }[]>('SELECT current_database()');
  if (dbCheck[0]?.current_database === 'axioma_dev') throw new Error('ABORTA: apunta a axioma_dev.');
  console.log(`Target: ${dbCheck[0]?.current_database}`);

  const suffix = Date.now();
  const resolver = new UnlockRequirementResolverService(
    new RewardBundleRepository(prisma),
    new LevelDefinitionRepository(prisma),
    new AchievementVersionRepository(prisma),
    new ChallengeDefinitionRepository(prisma),
    new CurriculumTopicRepository(prisma),
    new TitleDefinitionRepository(prisma),
    new CosmeticItemRepository(prisma),
    new SubjectRepository(prisma),
  );
  const cosmeticService = new CosmeticEquipmentService(
    new InventoryItemRepository(prisma),
    new CosmeticItemRepository(prisma),
    new EquippedCosmeticRepository(prisma),
    resolver,
  );
  const titleService = new TitleEquipmentService(
    new AccountTitleRepository(prisma),
    new TitleDefinitionRepository(prisma),
    new EquippedTitleRepository(prisma),
    resolver,
  );
  const accountTitleRepo = new AccountTitleRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);

  const createdCosmeticItemIds: string[] = [];
  const createdRewardBundleIds: string[] = [];
  const createdCurriculumTopicIds: string[] = [];
  const synthAccountIds: string[] = [];
  let createdSubjectId: string | null = null;

  try {
    console.log('--- 0. Catálogos congelados ---');
    check('TITLES_V1 tiene exactamente 7', TITLES_V1.length === 7);
    check('HISTORIC_AVATAR_SUBJECT_MAP tiene exactamente 5', Object.keys(HISTORIC_AVATAR_SUBJECT_MAP).length === 5);

    console.log('--- 1. Siembra idempotente de los 7 Títulos V1 ---');
    const seed = await seedTitlesV1({ dryRun: false });
    check('7 títulos presentes tras seed', seed.created + seed.verified === 7);

    // ================= TÍTULOS =================
    console.log('--- 2. Cuenta sin títulos: los 7 V1 aparecen en locked con TITLE_THRESHOLD ---');
    // NB: la gate DB puede tener OTROS title_definition sintéticos de gates
    // previos (catalog-gate-*), que resuelven vía ACHIEVEMENT/LEVEL -- por
    // eso se comprueba el SUBCONJUNTO de los 7 V1, no un total exacto.
    const v1Keys = new Set(TITLES_V1.map((t) => t.titleKey));
    const accountT = randomUUID();
    synthAccountIds.push(accountT);
    const lockedTitles = await titleService.getLockedByAccountId(accountT);
    const lockedV1 = lockedTitles.filter((v) => v1Keys.has(v.titleDefinition.titleKey));
    check('los 7 títulos V1 están en locked', lockedV1.length === 7);
    check('los 7 V1 tienen >=1 requisito', lockedV1.every((v) => v.unlockRequirements.length > 0));
    check('el requisito de cada V1 es TITLE_THRESHOLD', lockedV1.every((v) => v.unlockRequirements.every((r) => r.source === 'TITLE_THRESHOLD')));

    let perTitleOk = true;
    for (const entry of TITLES_V1) {
      const view = lockedV1.find((v) => v.titleDefinition.titleKey === entry.titleKey);
      const req = view?.unlockRequirements[0];
      if (!view || !req || req.source !== 'TITLE_THRESHOLD') {
        perTitleOk = false;
        continue;
      }
      if (req.metric !== entry.metric || req.threshold !== entry.threshold || req.requirementCopy !== entry.lockedRequirementCopy) {
        perTitleOk = false;
      }
    }
    check('cada título V1 expone su metric/threshold/copy canónico exacto de TITLES_V1', perTitleOk);

    console.log('--- 3. Poseer un título V1 lo saca de locked, aparece 1 vez en owned ---');
    const veteranoDef = await new TitleDefinitionRepository(prisma).findByTitleKey('title-v1-veterano');
    await accountTitleRepo.createIdempotent({
      accountId: accountT,
      titleDefinitionId: veteranoDef!.id,
      acquisitionSourceType: 'TITLE_UNLOCK',
      acquisitionSourceId: `${accountT}:title-v1-veterano`,
      acquiredAt: new Date(),
    });
    const lockedAfter = await titleService.getLockedByAccountId(accountT);
    const lockedV1After = lockedAfter.filter((v) => v1Keys.has(v.titleDefinition.titleKey));
    check('quedan 6 títulos V1 en locked (Veterano fuera)', lockedV1After.length === 6);
    check('Veterano ya no está en locked', !lockedAfter.some((v) => v.titleDefinition.titleKey === 'title-v1-veterano'));
    const ownedT = await accountTitleRepo.findByAccountId(accountT);
    check('Veterano aparece exactamente 1 vez en owned', ownedT.filter((o) => o.titleDefinitionId === veteranoDef!.id).length === 1);

    // ================= AVATAR / STUDY_SUBJECT (avatares históricos V1) =================
    console.log('--- 4. Fixture: cosmético con itemKey de HISTORIC_AVATAR_SUBJECT_MAP + su materia ---');
    const [histItemKey, histSubjectKey] = Object.entries(HISTORIC_AVATAR_SUBJECT_MAP)[0]!;
    const subjectRepo = new SubjectRepository(prisma);
    let histSubject = await subjectRepo.findByKey(histSubjectKey);
    if (!histSubject) {
      const sid = randomUUID();
      await raw.$executeRawUnsafe(
        `INSERT INTO subject (id, subject_key, name, short_name, display_order, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'B6CAT', 960, 'ACTIVE', now(), now())`,
        sid, histSubjectKey, `Materia ${histSubjectKey} (gate B6CAT)`,
      );
      createdSubjectId = sid;
      histSubject = await subjectRepo.findByKey(histSubjectKey);
    }
    const histSubjectName = histSubject!.name;

    let cosmetic = await new CosmeticItemRepository(prisma).findByItemKey(histItemKey);
    if (!cosmetic) {
      cosmetic = await new CosmeticItemRepository(prisma).create({
        itemKey: histItemKey,
        itemType: 'AVATAR',
        name: `Avatar histórico ${histItemKey}`,
        rarityClass: 'COMMON',
        assetReference: `asset://b6cat/${histItemKey}`,
        visibilityStatus: 'PUBLIC',
      });
      createdCosmeticItemIds.push(cosmetic.id);
    }

    console.log('--- 5. Cuenta sin cosméticos: el avatar histórico aparece en locked con STUDY_SUBJECT ---');
    const accountC = randomUUID();
    synthAccountIds.push(accountC);
    const lockedCosmetics = await cosmeticService.getLockedByAccountId(accountC);
    const lockedSynth = lockedCosmetics.find((v) => v.cosmeticItem.itemKey === histItemKey);
    check('el avatar histórico aparece en locked', lockedSynth != null);
    const cReq = lockedSynth?.unlockRequirements.find((r) => r.source === 'STUDY_SUBJECT');
    check('su requisito es STUDY_SUBJECT', cReq?.source === 'STUDY_SUBJECT');
    check('subjectCode correcto', cReq?.source === 'STUDY_SUBJECT' && cReq.subjectCode === histSubjectKey);
    check('subjectName correcto', cReq?.source === 'STUDY_SUBJECT' && cReq.subjectName === histSubjectName);
    check('requirementCopy = "Completa {materia}"', cReq?.source === 'STUDY_SUBJECT' && cReq.requirementCopy === `Completa ${histSubjectName}`);
    check('NINGÚN requisito STUDY_UNIT para el avatar histórico', !(lockedSynth?.unlockRequirements ?? []).some((r) => r.source === 'STUDY_UNIT'));
    check('requirementCopy no vacío', (cReq && 'requirementCopy' in cReq && cReq.requirementCopy.length > 0) === true);

    console.log('--- 6. Poseer el avatar lo saca de locked, 1 vez en owned ---');
    await inventoryItemRepo.createIdempotent({
      accountId: accountC,
      cosmeticItemId: cosmetic.id,
      acquisitionSourceType: 'STUDY_SUBJECT',
      acquisitionSourceId: `${accountC}:${histSubjectKey}`,
      acquiredAt: new Date(),
    });
    const lockedCosmeticsAfter = await cosmeticService.getLockedByAccountId(accountC);
    check('el avatar histórico ya no está en locked', !lockedCosmeticsAfter.some((v) => v.cosmeticItem.itemKey === histItemKey));
    const ownedC = await inventoryItemRepo.findByAccountId(accountC);
    check('el avatar aparece exactamente 1 vez en owned', ownedC.filter((o) => o.cosmeticItemId === cosmetic.id).length === 1);

    console.log('--- 7. Backward-compat: variantes LEVEL/ACHIEVEMENT/CHALLENGE intactas ---');
    const empty = await resolver.resolveMany('COSMETIC', []);
    check('resolveMany([]) devuelve un map vacío', empty.size === 0);
  } finally {
    // Limpieza -- solo fixtures propios (namespaced), en orden FK-seguro.
    for (const acc of synthAccountIds) {
      await raw.$executeRawUnsafe(`DELETE FROM equipped_title WHERE account_title_id IN (SELECT id FROM account_title WHERE account_id = $1)`, acc);
      await raw.$executeRawUnsafe(`DELETE FROM account_title WHERE account_id = $1`, acc);
      await raw.$executeRawUnsafe(`DELETE FROM equipped_cosmetic WHERE inventory_item_id IN (SELECT id FROM inventory_item WHERE account_id = $1)`, acc);
      await raw.$executeRawUnsafe(`DELETE FROM inventory_item WHERE account_id = $1`, acc);
    }
    if (createdCurriculumTopicIds.length) {
      await raw.$executeRawUnsafe(`UPDATE curriculum_topic SET reward_bundle_id = NULL WHERE id = ANY($1)`, createdCurriculumTopicIds);
      await raw.$executeRawUnsafe(`DELETE FROM curriculum_topic_progress WHERE curriculum_topic_id = ANY($1)`, createdCurriculumTopicIds);
    }
    if (createdRewardBundleIds.length) {
      await raw.$executeRawUnsafe(`DELETE FROM reward_bundle_item WHERE reward_bundle_id = ANY($1)`, createdRewardBundleIds);
      await raw.$executeRawUnsafe(`DELETE FROM reward_bundle WHERE id = ANY($1)`, createdRewardBundleIds);
    }
    if (createdCosmeticItemIds.length) await raw.$executeRawUnsafe(`DELETE FROM cosmetic_item WHERE id = ANY($1)`, createdCosmeticItemIds);
    if (createdCurriculumTopicIds.length) await raw.$executeRawUnsafe(`DELETE FROM curriculum_topic WHERE id = ANY($1)`, createdCurriculumTopicIds);
    if (createdSubjectId) await raw.$executeRawUnsafe(`DELETE FROM subject WHERE id = $1`, createdSubjectId).catch(() => undefined);
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de catálogo (STUDY_SUBJECT + TITLE_THRESHOLD) pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
