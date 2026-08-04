// Gate del Bloque III, Incremento 2, sub-incremento 2.b ("Progreso y
// desbloqueo de logros", BLOCK-III-DEFINITION.md §4.7 excepción A1,
// ADR-0019) -- SIN HTTP: prueba directamente el worker/repositorios reales
// contra Postgres real, mismo criterio que verify-reward-delivery-xp-bonus-gate.ts
// (1.c). ÚNICAMENTE achievement_definition.repeatability = UNIQUE y
// gramática XP_THRESHOLD -- REPEATABLE, logros compuestos, exposición
// pública siguen fuera de alcance, verificado explícitamente al final.
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
 * Inyecta un fallo determinista UNA sola vez para cualquier entrega de
 * componente `XP_BONUS` (idempotencyKey con prefijo `bono:`) -- mismo
 * criterio que `PoisonOnceLedgerRepository` (verify-reward-delivery-xp-bonus-gate.ts,
 * 1.c). Aquí se usa para inyectar el fallo EXACTAMENTE entre la
 * completitud (progress COMPLETED + unlock creado, atómico) y la entrega
 * (reward_grant/componentes) -- precisión obligatoria del Product Owner.
 */
class PoisonOnceLedgerRepository extends XpLedgerEntryRepository {
  private armed = true;

  async createIdempotent(
    input: Parameters<XpLedgerEntryRepository['createIdempotent']>[0],
    tx?: Prisma.TransactionClient,
  ): ReturnType<XpLedgerEntryRepository['createIdempotent']> {
    if (this.armed && input.idempotencyKey.startsWith('bono:')) {
      this.armed = false;
      throw new Error('fallo simulado para el gate 2.b (entrega de XP_BONUS de logro)');
    }
    return super.createIdempotent(input, tx);
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // achievement_definition no admite DELETE -- se retiran las de corridas
  // anteriores de ESTE gate (mismo criterio que 2.a) para que no se
  // acumulen evaluándose para cada cuenta nueva en corridas futuras.
  await pg.query("UPDATE achievement_definition SET status = 'RETIRED' WHERE achievement_key LIKE 'gate-2b-%'");

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

  function buildWorker(ledger: XpLedgerEntryRepository) {
    return new RewardEvaluationWorker(
      prisma,
      ledger,
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
    );
  }
  const worker = buildWorker(ledgerRepo);

  const suffix = Date.now();
  let entrySeq = 0;
  async function createEntry(accountId: string, xpAmount: number, ledger: XpLedgerEntryRepository = ledgerRepo): Promise<void> {
    entrySeq++;
    const { entry } = await ledger.createIdempotent({
      accountId,
      entryType: 'AJUSTE',
      xpAmount,
      idempotencyKey: `achievement-gate-${suffix}-${entrySeq}`,
      occurredAt: new Date(),
    });
    await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
  }

  console.log('--- 0. Fixtures: un logro UNIQUE con recompensa XP_BONUS ---');
  const bundle = await bundleRepo.create({
    bundleKey: `gate-2b-bundle-${suffix}`,
    name: 'Recompensa de logro (gate 2.b)',
    items: [{ componentType: 'XP_BONUS', xpAmount: 75 }],
  });
  const definition = await achievementDefinitionRepo.create({
    achievementKey: `gate-2b-unique-${suffix}`,
    name: 'Logro de prueba (gate 2.b)',
    achievementCategory: 'HITO_ACADEMICO',
    visibilityClass: 'PUBLIC',
    repeatability: 'UNIQUE',
    progressTrackingType: 'CUMULATIVE_COUNTER',
  });
  const v1 = await achievementVersionRepo.create({
    achievementDefinitionId: definition.id,
    versionLabel: 'v1',
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 500 },
    rewardBundleId: bundle.id,
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60_000),
    approvedAt: new Date(),
  });
  check('achievement_version v1 creada y APPROVED', v1.approvalStatus === 'APPROVED');

  console.log('--- 1. Progreso parcial: NO completa, sin unlock, currentValue recalculado ---');
  const accountA = randomUUID();
  await createEntry(accountA, 200); // por debajo del umbral (500)
  const outcomeA1 = await worker.processAccount(accountA);
  check('processAccount -> PROCESSED', outcomeA1 === 'PROCESSED');

  const progressA1 = await achievementProgressRepo.findByAccountAndDefinition(accountA, definition.id);
  check('achievement_progress creada', progressA1 !== null);
  check('progressStatus == IN_PROGRESS (200 < 500)', progressA1?.progressStatus === 'IN_PROGRESS');
  check('currentValue == 200 (recompute puro desde xp_balance)', progressA1?.currentValue === 200);
  check('targetValue == 500 (snapshot de rule.value)', progressA1?.targetValue === 500);
  check('achievementVersionId fijado a v1', progressA1?.achievementVersionId === v1.id);
  const unlockA1 = await achievementUnlockRepo.findByAccountDefinitionInstance(accountA, definition.id, 1);
  check('SIN achievement_unlock todavía (no se cruzó el umbral)', unlockA1 === null);

  console.log('--- 2. Cruzar el umbral completa atómicamente: progress COMPLETED + unlock + entrega ---');
  await createEntry(accountA, 400); // 200 + 400 = 600 >= 500
  const outcomeA2 = await worker.processAccount(accountA);
  check('processAccount -> PROCESSED', outcomeA2 === 'PROCESSED');

  const progressA2 = await achievementProgressRepo.findByAccountAndDefinition(accountA, definition.id);
  check('progressStatus == COMPLETED', progressA2?.progressStatus === 'COMPLETED');
  check('currentValue == 600 (valor real en el momento de completar)', progressA2?.currentValue === 600);

  const unlockA2 = await achievementUnlockRepo.findByAccountDefinitionInstance(accountA, definition.id, 1);
  check('achievement_unlock creado (unlockInstance = 1)', unlockA2 !== null && unlockA2.unlockInstance === 1);
  check('achievement_unlock.status == ACTIVE (nunca REVERSED desde este mecanismo)', unlockA2?.status === 'ACTIVE');
  check('rewardGrantId fijado', unlockA2?.rewardGrantId != null);

  const grantA2 = await grantRepo.findById(unlockA2!.rewardGrantId!);
  check('reward_grant idempotencyKey == reward:ACHIEVEMENT_UNLOCK:{unlock.id} (§4.4)', grantA2?.idempotencyKey === `reward:ACHIEVEMENT_UNLOCK:${unlockA2!.id}`);
  check('componente XP_BONUS DELIVERED', grantA2?.components[0]?.deliveryStatus === 'DELIVERED');
  const balanceA2 = await balanceRepo.findByAccountId(accountA);
  check('xp_balance.lifetimeXp == 600 + 75 (BONO del logro)', balanceA2?.lifetimeXp === 675);

  console.log('--- 3. Convergencia: el BONO dispara una pasada más, pero no escribe nada nuevo (fila ya COMPLETED, congelada) ---');
  const pendingAfterA2 = await worker.discoverPendingAccounts();
  check('la cuenta SÍ aparece pendiente -- el propio BONO del logro dispara la pasada siguiente', pendingAfterA2.includes(accountA));

  const progressCountBefore = (await pg.query('SELECT count(*)::int AS n FROM achievement_progress WHERE account_id = $1', [accountA])).rows[0].n as number;
  const unlockCountBefore = (await pg.query('SELECT count(*)::int AS n FROM achievement_unlock WHERE account_id = $1', [accountA])).rows[0].n as number;
  const outcomeA3 = await worker.processAccount(accountA);
  check('pasada disparada por el BONO -> PROCESSED, sin nada nuevo que otorgar', outcomeA3 === 'PROCESSED');
  const progressCountAfter = (await pg.query('SELECT count(*)::int AS n FROM achievement_progress WHERE account_id = $1', [accountA])).rows[0].n as number;
  const unlockCountAfter = (await pg.query('SELECT count(*)::int AS n FROM achievement_unlock WHERE account_id = $1', [accountA])).rows[0].n as number;
  check('CERO achievement_progress nuevas (converge)', progressCountAfter === progressCountBefore);
  check('CERO achievement_unlock nuevos (converge)', unlockCountAfter === unlockCountBefore);

  console.log('--- 4. No punitividad: un REVERSO que baja el XP por debajo del umbral NO revoca el logro ---');
  await pg.query(
    `INSERT INTO xp_ledger_entry (id, account_id, entry_type, xp_amount, idempotency_key, occurred_at, recorded_at)
     VALUES ($1, $2, 'AJUSTE', -600, $3, now(), now())`,
    [randomUUID(), accountA, `achievement-gate-${suffix}-reverso`],
  );
  await pg.query('UPDATE xp_balance SET lifetime_xp = lifetime_xp - 600 WHERE account_id = $1', [accountA]);
  const outcomeA4 = await worker.processAccount(accountA);
  check('processAccount tras el reverso -> PROCESSED', outcomeA4 === 'PROCESSED');
  const progressA4 = await achievementProgressRepo.findByAccountAndDefinition(accountA, definition.id);
  check('progressStatus SIGUE COMPLETED pese al reverso (congelado, no punitivo)', progressA4?.progressStatus === 'COMPLETED');
  check('currentValue NO se tocó (sigue en 600, no bajó a 75)', progressA4?.currentValue === 600);
  const unlockA4 = await achievementUnlockRepo.findByAccountDefinitionInstance(accountA, definition.id, 1);
  check('achievement_unlock.status SIGUE ACTIVE (nunca se revoca)', unlockA4?.status === 'ACTIVE');
  check('reversedAt sigue NULL', unlockA4?.reversedAt === null);

  let directUpdateOnCompletedRejected = false;
  try {
    await pg.query("UPDATE achievement_progress SET current_value = 1 WHERE id = $1", [progressA4!.id]);
  } catch (error) {
    directUpdateOnCompletedRejected = String((error as Error).message ?? '').includes('inmutable');
  }
  check('trigger rechaza UPDATE directo sobre achievement_progress ya COMPLETED', directUpdateOnCompletedRejected);

  console.log('--- 5. Versión fijada: una versión nueva no reinterpreta progreso ya en curso ---');
  const accountB = randomUUID();
  await createEntry(accountB, 100); // crea achievement_progress bajo v1 (umbral 500)
  await worker.processAccount(accountB);
  const progressB = await achievementProgressRepo.findByAccountAndDefinition(accountB, definition.id);
  check('cuenta B: achievement_progress fijada a v1', progressB?.achievementVersionId === v1.id);

  const v2 = await achievementVersionRepo.create({
    achievementDefinitionId: definition.id,
    versionLabel: 'v2',
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 150 }, // umbral MÁS BAJO -- si B se reinterpretara, completaría de inmediato
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(),
    approvedAt: new Date(),
  });

  const outcomeBAfterV2 = await worker.processAccount(accountB);
  check('cuenta B: processAccount -> PROCESSED', outcomeBAfterV2 === 'PROCESSED');
  const progressBAfterV2 = await achievementProgressRepo.findByAccountAndDefinition(accountB, definition.id);
  check('cuenta B SIGUE en v1 (nunca migró a v2)', progressBAfterV2?.achievementVersionId === v1.id);
  check('cuenta B SIGUE IN_PROGRESS (100 < 500 de v1 -- si usara v2 (150) tampoco completaría, umbral elegido para no coincidir)', progressBAfterV2?.progressStatus === 'IN_PROGRESS');

  const accountC = randomUUID();
  await createEntry(accountC, 200); // 200 >= 150 (v2), pero < 500 (v1)
  await worker.processAccount(accountC);
  const progressC = await achievementProgressRepo.findByAccountAndDefinition(accountC, definition.id);
  check('cuenta C (nueva, después de aprobar v2) usa v2 desde el principio', progressC?.achievementVersionId === v2.id);
  check('cuenta C: 200 >= 150 (umbral de v2) -> COMPLETED de inmediato', progressC?.progressStatus === 'COMPLETED');

  console.log('--- 6. Fallo real ENTRE completitud y entrega: progress COMPLETED + unlock existen, componente FAILED; retry repara sin duplicar ---');
  // Logro/versión DEDICADOS y aislados de la Sección 5 -- `definition`
  // arriba ya tiene una v2 más reciente (sin reward_bundle_id) desde la
  // Sección 5, y `findApprovedEffectiveAt` resolvería esa v2 para una
  // cuenta NUEVA, no v1 -- este escenario necesita, sin ambigüedad, una
  // versión con recompensa configurada para poder inyectar el fallo en la
  // entrega.
  const bundleFailure = await bundleRepo.create({
    bundleKey: `gate-2b-failure-bundle-${suffix}`,
    name: 'Recompensa de logro (gate 2.b, escenario de fallo)',
    items: [{ componentType: 'XP_BONUS', xpAmount: 75 }],
  });
  const definitionFailure = await achievementDefinitionRepo.create({
    achievementKey: `gate-2b-failure-${suffix}`,
    name: 'Logro de prueba -- escenario de fallo (gate 2.b)',
    achievementCategory: 'HITO_ACADEMICO',
    visibilityClass: 'PUBLIC',
    repeatability: 'UNIQUE',
    progressTrackingType: 'CUMULATIVE_COUNTER',
  });
  await achievementVersionRepo.create({
    achievementDefinitionId: definitionFailure.id,
    versionLabel: 'v1',
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 500 },
    rewardBundleId: bundleFailure.id,
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60_000),
    approvedAt: new Date(),
  });

  const poisonedLedgerRepo = new PoisonOnceLedgerRepository(prisma);
  const workerPoisoned = buildWorker(poisonedLedgerRepo);

  const accountD = randomUUID();
  await createEntry(accountD, 600, poisonedLedgerRepo); // cruza el umbral (500) directamente
  const outcomeD1 = await workerPoisoned.processAccount(accountD);
  check('primera pasada (con fallo inyectado en la entrega) -> FAILED', outcomeD1 === 'FAILED');

  const progressD1 = await achievementProgressRepo.findByAccountAndDefinition(accountD, definitionFailure.id);
  check('achievement_progress SÍ quedó COMPLETED pese al fallo en la entrega (atomicidad: completar + unlock ya se confirmaron)', progressD1?.progressStatus === 'COMPLETED');
  const unlockD1 = await achievementUnlockRepo.findByAccountDefinitionInstance(accountD, definitionFailure.id, 1);
  check('achievement_unlock SÍ existe -- nunca queda COMPLETED sin su unlock', unlockD1 !== null);
  // rewardGrantId YA está fijado tras esta primera pasada -- la creación
  // del reward_grant (snapshot) y su asociación al unlock NO dependen de
  // que la entrega del componente tenga éxito (§4.5/§4.6 de este
  // repositorio); lo que falló fue ÚNICAMENTE la escritura de la
  // xp_ledger_entry BONO, reflejada en el `deliveryStatus` del componente,
  // no en el propio grant.
  check('rewardGrantId YA fijado (la asociación al grant no depende de que el componente se entregue)', unlockD1?.rewardGrantId != null);

  const grantRowD1 = await pg.query('SELECT id FROM reward_grant WHERE source_entity_type = $1 AND source_entity_id = $2', [
    'ACHIEVEMENT_UNLOCK',
    unlockD1!.id,
  ]);
  check('reward_grant SÍ se creó (snapshot no depende de la entrega)', grantRowD1.rows.length === 1);
  const componentRowsD1 = await pg.query('SELECT delivery_status FROM reward_grant_component WHERE reward_grant_id = $1', [grantRowD1.rows[0].id]);
  check('el componente XP_BONUS quedó FAILED', componentRowsD1.rows[0]?.delivery_status === 'FAILED');

  const cursorD1 = await cursorRepo.findByAccountId(accountD);
  check('el cursor NO avanzó (la cuenta sigue pendiente de esta misma pasada)', cursorD1?.lastProcessedRecordedAt == null);

  const outcomeD2 = await workerPoisoned.processAccount(accountD);
  check('reintento (sin el fallo -- ya se desarmó) -> PROCESSED', outcomeD2 === 'PROCESSED');

  const progressCountD = (await pg.query('SELECT count(*)::int AS n FROM achievement_progress WHERE account_id = $1 AND achievement_definition_id = $2', [accountD, definitionFailure.id])).rows[0].n as number;
  const unlockCountD = (await pg.query('SELECT count(*)::int AS n FROM achievement_unlock WHERE account_id = $1 AND achievement_definition_id = $2', [accountD, definitionFailure.id])).rows[0].n as number;
  const grantCountD = (await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE source_entity_type = $1 AND source_entity_id = $2', ['ACHIEVEMENT_UNLOCK', unlockD1!.id])).rows[0].n as number;
  check('exactamente UNA fila de achievement_progress (sin duplicar)', progressCountD === 1);
  check('exactamente UN achievement_unlock (sin duplicar)', unlockCountD === 1);
  check('exactamente UN reward_grant (sin duplicar)', grantCountD === 1);

  const unlockD2 = await achievementUnlockRepo.findByAccountDefinitionInstance(accountD, definitionFailure.id, 1);
  check('rewardGrantId ahora sí fijado', unlockD2?.rewardGrantId != null);
  const grantD2 = await grantRepo.findById(unlockD2!.rewardGrantId!);
  check('MISMO reward_grant que el creado durante el fallo (no uno nuevo)', grantD2?.id === grantRowD1.rows[0].id);
  check('componente ahora DELIVERED', grantD2?.components[0]?.deliveryStatus === 'DELIVERED');
  const componentCountD = (await pg.query('SELECT count(*)::int AS n FROM reward_grant_component WHERE reward_grant_id = $1', [grantD2!.id])).rows[0].n as number;
  check('exactamente UN componente (sin duplicar por el reintento)', componentCountD === 1);
  const balanceD = await balanceRepo.findByAccountId(accountD);
  check('xp_balance incrementado UNA sola vez por el BONO (600 + 75)', balanceD?.lifetimeXp === 675);

  console.log('--- 7. attachRewardGrant valida coherencia (cuenta, sourceEntityType, sourceEntityId) ---');
  const foreignUnlock = await achievementUnlockRepo.findByAccountDefinitionInstance(accountA, definition.id, 1);
  let coherenceRejected = false;
  try {
    await achievementUnlockRepo.attachRewardGrant(unlockD2!, {
      id: grantD2!.id,
      accountId: foreignUnlock!.accountId, // cuenta DISTINTA a la del unlock real
      sourceEntityType: 'ACHIEVEMENT_UNLOCK',
      sourceEntityId: unlockD2!.id,
    });
  } catch {
    coherenceRejected = true;
  }
  check('attachRewardGrant rechaza un grant de OTRA cuenta', coherenceRejected);

  let sourceCoherenceRejected = false;
  try {
    await achievementUnlockRepo.attachRewardGrant(unlockD2!, {
      id: grantD2!.id,
      accountId: unlockD2!.accountId,
      sourceEntityType: 'LEVEL', // sourceEntityType incorrecto
      sourceEntityId: unlockD2!.id,
    });
  } catch {
    sourceCoherenceRejected = true;
  }
  check('attachRewardGrant rechaza un grant que no declara sourceEntityType=ACHIEVEMENT_UNLOCK', sourceCoherenceRejected);

  let secondAttachRejected = false;
  try {
    await achievementUnlockRepo.attachRewardGrant(unlockD2!, {
      id: grantD2!.id,
      accountId: unlockD2!.accountId,
      sourceEntityType: 'ACHIEVEMENT_UNLOCK',
      sourceEntityId: unlockD2!.id,
    });
  } catch (error) {
    secondAttachRejected = String((error as Error).message ?? '').includes('inmutable');
  }
  check('trigger rechaza un SEGUNDO intento de fijar reward_grant_id (ya fijado)', secondAttachRejected);

  console.log('--- 8. REPEATABLE queda fuera de 2.b: nunca se evalúa, nunca crea achievement_progress ---');
  const repeatableBundle = await bundleRepo.create({
    bundleKey: `gate-2b-repeatable-bundle-${suffix}`,
    name: 'Recompensa repetible (gate 2.b, no debe entregarse)',
    items: [{ componentType: 'XP_BONUS', xpAmount: 10 }],
  });
  const repeatableDefinition = await achievementDefinitionRepo.create({
    achievementKey: `gate-2b-repeatable-${suffix}`,
    name: 'Logro repetible (gate 2.b)',
    achievementCategory: 'CONSTANCIA',
    visibilityClass: 'PUBLIC',
    repeatability: 'REPEATABLE',
    progressTrackingType: 'STREAK_DAYS',
  });
  await achievementVersionRepo.create({
    achievementDefinitionId: repeatableDefinition.id,
    versionLabel: 'v1',
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 50 },
    rewardBundleId: repeatableBundle.id,
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60_000),
    approvedAt: new Date(),
  });
  const accountE = randomUUID();
  await createEntry(accountE, 1000); // muy por encima de CUALQUIER umbral, incluido el del logro repetible
  await worker.processAccount(accountE);
  const progressE = await achievementProgressRepo.findByAccountAndDefinition(accountE, repeatableDefinition.id);
  check('NINGÚN achievement_progress creado para un logro REPEATABLE (fuera de alcance de 2.b)', progressE === null);

  console.log('--- 9. Frontera de dominio y Gate 12 (registrado PASS por ausencia de superficie pública en este incremento) ---');
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const filesToCheck = ['reward-evaluation.worker.ts', 'achievement-progress.repository.ts', 'achievement-unlock.repository.ts'];
  const forbiddenSymbols = ['StudentResponse', 'CurriculumTopicProgress', 'PublicProfile', 'equippedTitle', 'equippedCosmetic', 'ChallengeDefinition', 'inventoryItem', 'accountTitle'];
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
  check('ningún archivo de 2.b referencia PROGRESS/Public Profile/equipamiento/desafíos/inventario', !boundaryViolationFound);

  const controllerFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.controller.ts'));
  let publicExposureFound = false;
  for (const file of controllerFiles) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    if (contents.includes('AchievementProgressRepository') || contents.includes('AchievementUnlockRepository') || contents.includes('achievement-progress') || contents.includes('achievement-unlock')) {
      publicExposureFound = true;
      console.error(`  ${file} expone achievement_progress/achievement_unlock públicamente`);
    }
  }
  check(
    'Gate 12 (privacidad de logros públicos): PASS por ausencia de superficie pública -- ningún controller referencia achievement_progress/achievement_unlock (validación funcional completa queda para el incremento que exponga logros)',
    !publicExposureFound,
  );

  console.log('--- 10. Sin efecto sobre PROGRESS ni Public Profile ---');
  const accounts = [accountA, accountB, accountC, accountD, accountE];
  const publicProfileTouched = await pg.query('SELECT count(*)::int AS n FROM public_profile WHERE account_id = ANY($1)', [accounts]);
  check('ningún public_profile creado/tocado', publicProfileTouched.rows[0].n === 0);
  const studentResponseTouched = await pg.query('SELECT count(*)::int AS n FROM student_response WHERE account_id = ANY($1)', [accounts]);
  check('ningún StudentResponse creado/tocado (PROGRESS fuera de alcance)', studentResponseTouched.rows[0].n === 0);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Progreso y Desbloqueo de Logros (Bloque III, sub-incremento 2.b) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
