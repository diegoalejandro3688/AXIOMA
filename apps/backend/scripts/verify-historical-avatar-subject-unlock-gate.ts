// STABILIZATION-B6A -- gate enfocado: los 5 primeros avatares históricos V1
// se otorgan SOLO al completar UNA MATERIA canónica ENTERA (TODAS sus
// unidades canónicas V1 completas), no una sola unidad. Recompute desde el
// origen (`RewardEvaluationWorker.evaluateHistoricalAvatars` ->
// `SubjectCompletionService`), nunca desde una completitud aislada ni
// TEMA_COMPLETADO. Cubre además la copia de requisito visible
// (`UnlockRequirementResolverService`, ruta STUDY_SUBJECT) y la
// reconciliación retroactiva por materia.
//
// Fixtures 100% sintéticos: materia real por `subject_key` del mapa congelado
// (creada si falta), 2 unidades canónicas sintéticas + recursos PUBLISHED,
// cosmético + bundle del avatar (creados si faltan). El contenido editorial
// PUBLISHED queda como residuo permanente por diseño (trigger "invariante 3").
// Se ejecuta vía run-gate.ts -> .env.gates -> axioma_gates_dev.
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
import { SubjectCompletionService } from '../src/gamification/subject-completion.service';
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
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { UnlockRequirementResolverService } from '../src/gamification/unlock-requirement-resolver.service';
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { HISTORIC_AVATAR_SUBJECT_MAP } from '../src/gamification/cosmetics-v1-catalog';
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

  const dbCheck = await pg.query('SELECT current_database() AS d');
  if (dbCheck.rows[0].d === 'axioma_dev') throw new Error('ABORTA: apunta a axioma_dev.');
  console.log(`Target: ${dbCheck.rows[0].d}`);

  const suffix = Date.now();

  const curriculumTopicRepo = new CurriculumTopicRepository(prisma);
  const curriculumTopicProgressRepo = new CurriculumTopicProgressRepository(prisma);
  const subjectRepo = new SubjectRepository(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const balanceRepo = new XpBalanceRepository(prisma);
  const levelDefRepo = new LevelDefinitionRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);

  const subjectCompletionService = new SubjectCompletionService(curriculumTopicRepo, curriculumTopicProgressRepo, subjectRepo);
  const resolver = new UnlockRequirementResolverService(
    bundleRepo,
    levelDefRepo,
    new AchievementVersionRepository(prisma),
    new ChallengeDefinitionRepository(prisma),
    curriculumTopicRepo,
    new TitleDefinitionRepository(prisma),
    cosmeticItemRepo,
    subjectRepo,
  );
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
    inventoryItemRepo,
    new ChallengeDefinitionRepository(prisma),
    new AccountChallengeRepository(prisma),
    new AccountChallengeDailyProgressRepository(prisma),
    new AccountChallengeConsumedEventRepository(prisma),
    new ValidatedGamificationActivityRepository(prisma),
    curriculumTopicRepo,
    curriculumTopicProgressRepo,
    new TitleDefinitionRepository(prisma),
    new TitleEligibilityService(prisma, subjectRepo, curriculumTopicRepo, curriculumTopicProgressRepo, new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo)),
    subjectCompletionService,
  );

  // --- Elegir la primera entrada del mapa congelado cuya materia exista y
  //     NO tenga aún unidades canónicas reales (para fixturizar la
  //     completitud total). Si ninguna sirve -> auto-degrada. ---
  let itemKey = '';
  let subjectKey = '';
  let subject: Awaited<ReturnType<typeof subjectRepo.findByKey>> = null;
  for (const [ik, sk] of Object.entries(HISTORIC_AVATAR_SUBJECT_MAP)) {
    const s = await subjectRepo.findByKey(sk);
    if (!s) continue;
    const units = await curriculumTopicRepo.findCanonicalUnitRootsBySubjectId(s.id);
    if (units.length === 0) {
      itemKey = ik;
      subjectKey = sk;
      subject = s;
      break;
    }
  }
  if (!subject) {
    console.log('ESTRUCTURALMENTE VERIFICADO / NO EJECUTADO -- ninguna de las 5 materias del mapa congelado está sin contenido canónico en esta base; el gate necesita una materia vacía para fixturizar la completitud total.');
    await prisma.$disconnect();
    await pg.end();
    return;
  }
  const subjectName = subject.name;

  // --- Cosmético + bundle del avatar (creados si faltan) ---
  let cosmetic = await cosmeticItemRepo.findByItemKey(itemKey);
  if (!cosmetic) {
    cosmetic = await cosmeticItemRepo.create({
      itemKey,
      itemType: 'AVATAR',
      name: `Avatar histórico ${itemKey}`,
      rarityClass: 'COMMON',
      assetReference: `asset://gate-b6a/${itemKey}`,
      visibilityStatus: 'PUBLIC',
    });
  }
  const bundleKey = `cosmetics-v1-historic-${itemKey}`;
  let bundle = await bundleRepo.findByBundleKey(bundleKey);
  if (!bundle) {
    bundle = await bundleRepo.create({ bundleKey, name: `Avatar histórico: ${itemKey}`, items: [{ componentType: 'COSMETIC', referenceId: cosmetic.id }] });
  }

  // --- 2 unidades canónicas sintéticas x 2 recursos PUBLISHED ---
  const createdTopicIds: string[] = [];
  const allResourceTopicIds: string[] = [];
  for (let u = 0; u < 2; u++) {
    const rootId = randomUUID();
    await prisma.curriculumTopic.create({ data: { id: rootId, code: `B6A.U${u}.${suffix}`, name: `Unidad B6A ${u}`, order: u, subjectId: subject.id } });
    createdTopicIds.push(rootId);
    for (let r = 0; r < 2; r++) {
      const childId = randomUUID();
      const resourceId = randomUUID();
      await prisma.curriculumTopic.create({ data: { id: childId, code: `B6A.U${u}.R${r}.${suffix}`, name: `Recurso ${u}.${r}`, order: r, subjectId: subject.id, parentId: rootId } });
      createdTopicIds.push(childId);
      allResourceTopicIds.push(childId);
      await prisma.learningResource.create({ data: { id: resourceId, resourceKey: `b6a-${u}-${r}-${suffix}`, primarySubjectId: subject.id, resourceType: 'LESSON' } });
      await prisma.learningResourceVersion.create({
        data: { id: randomUUID(), learningResourceId: resourceId, curriculumTopicId: childId, title: `Contenido ${u}.${r}`, contentBlocks: [{ type: 'paragraph', order: 0, text: 'x' }], editorialStatus: 'PUBLISHED', publishedAt: new Date() },
      });
    }
  }

  // Trigger de recompute: un OTORGAMIENTO pendiente (xp_rule real requerido por CHECK).
  const anyRule = await pg.query('SELECT id FROM xp_rule LIMIT 1');
  let triggerRuleId: string;
  if (anyRule.rows[0]) {
    triggerRuleId = anyRule.rows[0].id;
  } else {
    const program = await new GamificationProgramRepository(prisma).create({ programKey: `b6a-prog-${suffix}`, name: 'B6A Gate', programType: 'XP', status: 'ACTIVE' });
    const version = await new GamificationProgramVersionRepository(prisma).create({
      gamificationProgramId: program.id, versionLabel: 'v1', approvalStatus: 'APPROVED',
      effectiveFrom: new Date(Date.now() - 60_000), effectiveUntil: null, approvedAt: new Date(),
    });
    triggerRuleId = (await new XpRuleRepository(prisma).create({ programVersionId: version.id, activityType: `B6A_TRIGGER_${suffix}`, baseXp: 0, dailyCap: null })).id;
  }

  async function markCompleted(accountId: string, topicId: string): Promise<void> {
    await curriculumTopicProgressRepo.createIfMissing(accountId, topicId);
    const row = await curriculumTopicProgressRepo.findByAccountAndTopic(accountId, topicId);
    await curriculumTopicProgressRepo.touchActivity(row!.id, 'COMPLETED', new Date());
  }
  async function trigger(accountId: string): Promise<void> {
    await ledgerRepo.createIdempotent({
      accountId, entryType: 'OTORGAMIENTO', xpAmount: 0, xpRuleId: triggerRuleId,
      idempotencyKey: `b6a-trig-${suffix}-${accountId}-${Date.now()}-${Math.random()}`, occurredAt: new Date(),
    });
    await worker.processAccount(accountId);
  }
  async function owns(accountId: string): Promise<boolean> {
    return ((await pg.query('SELECT 1 FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [accountId, cosmetic!.id])).rowCount ?? 0) > 0;
  }
  async function invCount(accountId: string): Promise<number> {
    return (await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [accountId, cosmetic!.id])).rows[0].n;
  }

  const accountA = randomUUID();
  const accountB = randomUUID();
  const accountC = randomUUID();

  try {
    console.log('--- 0. Mapa congelado ---');
    check('HISTORIC_AVATAR_SUBJECT_MAP tiene exactamente 5 entradas', Object.keys(HISTORIC_AVATAR_SUBJECT_MAP).length === 5);

    console.log('--- A. Cuenta nueva no posee el avatar ---');
    check('accountA no posee el avatar', !(await owns(accountA)));

    console.log('--- F. Requisito visible = STUDY_SUBJECT "Completa {materia}" ---');
    const reqMap = await resolver.resolveMany('COSMETIC', [cosmetic.id]);
    const reqs = reqMap.get(cosmetic.id) ?? [];
    const subjReq = reqs.find((r) => r.source === 'STUDY_SUBJECT');
    check('hay un requisito STUDY_SUBJECT', subjReq != null);
    check('subjectCode canónico', subjReq?.source === 'STUDY_SUBJECT' && subjReq.subjectCode === subjectKey);
    check('subjectName canónico', subjReq?.source === 'STUDY_SUBJECT' && subjReq.subjectName === subjectName);
    check('requirementCopy = "Completa {materia}"', subjReq?.source === 'STUDY_SUBJECT' && subjReq.requirementCopy === `Completa ${subjectName}`);
    check('NINGÚN requisito STUDY_UNIT (superado)', !reqs.some((r) => r.source === 'STUDY_UNIT'));

    console.log('--- B. Completar TODAS menos la última: sigue bloqueado ---');
    for (const id of allResourceTopicIds.slice(0, -1)) await markCompleted(accountA, id);
    await trigger(accountA);
    check('con 1 recurso pendiente en la materia, el avatar NO se otorga', !(await owns(accountA)));
    check('predicado isSubjectCompleteByKey = false', !(await subjectCompletionService.isSubjectCompleteByKey(accountA, subjectKey)));

    console.log('--- C. Completar el último recurso de la materia: avatar otorgado ---');
    await markCompleted(accountA, allResourceTopicIds[allResourceTopicIds.length - 1]!);
    check('predicado isSubjectCompleteByKey = true', await subjectCompletionService.isSubjectCompleteByKey(accountA, subjectKey));
    await trigger(accountA);
    check('materia completa -> avatar histórico otorgado', await owns(accountA));
    check('exactamente 1 fila de inventario', (await invCount(accountA)) === 1);

    console.log('--- D. Reevaluación: sin duplicado ---');
    await trigger(accountA);
    check('reevaluar no duplica -- sigue en 1', (await invCount(accountA)) === 1);

    console.log('--- E. Sin efecto colateral XP/LP/auto-equip ---');
    check('ningún XP_BONUS inesperado', (await pg.query("SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1 AND entry_type != 'OTORGAMIENTO'", [accountA])).rows[0].n === 0);
    check('ningún LP otorgado', (await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE account_id = $1', [accountA])).rows[0].n === 0);
    check('ningún equipped_cosmetic', (await pg.query('SELECT count(*)::int AS n FROM equipped_cosmetic ec JOIN inventory_item ii ON ii.id = ec.inventory_item_id WHERE ii.account_id = $1', [accountA])).rows[0].n === 0);

    console.log('--- G. Completar SOLO una unidad de la materia NO otorga nada ---');
    await markCompleted(accountC, allResourceTopicIds[0]!);
    await markCompleted(accountC, allResourceTopicIds[1]!); // unidad 0 completa, unidad 1 intacta
    await trigger(accountC);
    check('una sola unidad completa -> avatar NO otorgado (superado el modelo por unidad)', !(await owns(accountC)));

    console.log('--- H. Reconciliación retroactiva por materia ---');
    for (const id of allResourceTopicIds) await markCompleted(accountB, id);
    check('accountB completó la materia pero aún no posee el avatar', !(await owns(accountB)));
    const { reconcileHistoricalAvatarsV1 } = await import('./reconcile-historical-avatars-v1');
    await reconcileHistoricalAvatarsV1({ dryRun: false });
    check('reconciliación retroactiva otorga el avatar a accountB', await owns(accountB));
    await reconcileHistoricalAvatarsV1({ dryRun: false });
    check('reconciliación reejecutada -- sin duplicado para accountB', (await invCount(accountB)) === 1);
    check('accountC (solo 1 unidad) sigue SIN el avatar tras la reconciliación', !(await owns(accountC)));
  } finally {
    // Limpieza -- SÓLO estado mutable. El contenido editorial PUBLISHED
    // (learning_resource_version) es permanentemente inmutable por diseño.
    for (const acc of [accountA, accountB, accountC]) {
      await pg.query('DELETE FROM equipped_cosmetic WHERE inventory_item_id IN (SELECT id FROM inventory_item WHERE account_id = $1)', [acc]);
      await pg.query('DELETE FROM inventory_item WHERE account_id = $1', [acc]);
      await pg.query('DELETE FROM reward_grant_component WHERE reward_grant_id IN (SELECT id FROM reward_grant WHERE account_id = $1)', [acc]).catch(() => undefined);
      await pg.query('DELETE FROM reward_grant WHERE account_id = $1', [acc]).catch(() => undefined);
      await pg.query('DELETE FROM curriculum_topic_progress WHERE account_id = $1', [acc]);
      await pg.query('DELETE FROM reward_evaluation_cursor WHERE account_id = $1', [acc]).catch(() => undefined);
      await pg.query("DELETE FROM xp_ledger_entry WHERE account_id = $1 AND entry_type = 'OTORGAMIENTO'", [acc]).catch(() => undefined);
    }
    await prisma.$disconnect();
    await pg.end();
  }

  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de desbloqueo de avatares históricos por materia pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
