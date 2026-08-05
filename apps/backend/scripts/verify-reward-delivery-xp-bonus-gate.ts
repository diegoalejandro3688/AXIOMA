// Gate del sub-incremento 1.c del Bloque III ("Entrega de XP_BONUS y
// convergencia", ADR-0019, BLOCK-III-DEFINITION.md §4.1) -- SIN HTTP: prueba
// directamente los componentes reales (worker, repositorios) contra
// Postgres real, mismo criterio que verify-reward-foundation-gate.ts (1.a)
// y verify-reward-evaluation-worker-gate.ts (1.b). ÚNICAMENTE fuente LEVEL
// y componente XP_BONUS -- desafíos/cosméticos siguen fuera de alcance
// (logros y títulos ya se sumaron en 2.b/3.a, sin tocar esta prueba),
// verificado explícitamente en la sección final.
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
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import { AchievementProgressRepository } from '../src/gamification/achievement-progress.repository';
import { AchievementUnlockRepository } from '../src/gamification/achievement-unlock.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
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
 * componente (idempotencyKey con prefijo `bono:`, el único que este
 * sub-incremento produce) -- mismo criterio que
 * `TestRewardEvaluationWorker` (verify-reward-evaluation-worker-gate.ts,
 * 1.b). El fallo ocurre DENTRO de la transacción real de entrega, antes de
 * `xp_balance.upsertIncrement` -- fuerza el camino real de
 * `RewardGrantComponentRepository.markFailed` y el rollback completo de la
 * transacción SERIALIZABLE, no una simulación por fuera de ella.
 */
class PoisonOnceLedgerRepository extends XpLedgerEntryRepository {
  private armed = true;

  async createIdempotent(
    input: Parameters<XpLedgerEntryRepository['createIdempotent']>[0],
    tx?: Prisma.TransactionClient,
  ): ReturnType<XpLedgerEntryRepository['createIdempotent']> {
    if (this.armed && input.idempotencyKey.startsWith('bono:')) {
      this.armed = false;
      throw new Error('fallo simulado para el gate 1.c (entrega de XP_BONUS)');
    }
    return super.createIdempotent(input, tx);
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

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
  );

  // Este gate no ejercita logros -- pero desde 2.b, RewardEvaluationWorker
  // evalúa TODO achievement_definition ACTIVO para CUALQUIER cuenta con
  // actividad de XP, sin importar qué gate la creó. Una fila ACTIVE
  // dejada por otro gate (achievement_definition no admite DELETE) con un
  // unlockRule inválido rompería la evaluación de CADA cuenta de este
  // gate -- se retira defensivamente antes de empezar, mismo criterio que
  // el retiro de level_definition de prueba (§ más abajo).
  await pg.query("UPDATE achievement_definition SET status = 'RETIRED' WHERE status = 'ACTIVE'");

  const suffix = Date.now();
  let entrySeq = 0;
  /**
   * Crea la xp_ledger_entry de fixture Y actualiza xp_balance en el mismo
   * paso -- a diferencia del gate de 1.b (que nunca leía xp_balance),
   * `ProgressionService.getLevelProgress` (reutilizado por
   * `evaluateAccount`) lee la PROYECCIÓN `xp_balance`, no la suma del
   * ledger -- sin este paso, el nivel actual calculado sería siempre el
   * nivel base (0 XP), mismo criterio que XpGrantService/RewardEvaluationWorker.
   */
  async function createEntry(accountId: string, xpAmount: number): Promise<void> {
    entrySeq++;
    const { entry } = await ledgerRepo.createIdempotent({
      accountId,
      entryType: 'AJUSTE',
      xpAmount,
      idempotencyKey: `reward-xp-bonus-gate-${suffix}-${entrySeq}`,
      occurredAt: new Date(),
    });
    await balanceRepo.upsertIncrement(prisma as unknown as Prisma.TransactionClient, { accountId, deltaXp: entry.xpAmount, lastLedgerEntryId: entry.id });
  }

  // --- Escalera de niveles de prueba, aislada por sufijo (levelNumber es
  // globalmente único -- no se reutilizan los niveles reales del seed).
  // `ProgressionService.getLevelProgress` (Bloque II, reutilizado sin
  // modificar) recorre TODOS los niveles ACTIVOS ordenados por
  // levelNumber y se detiene en el primero cuyo minimumLifetimeXp exceda
  // el XP actual -- los umbrales de este fixture deben quedar POR ENCIMA
  // del máximo umbral real ya sembrado (level_definition del seed de
  // Bloque II), o el recorrido se detendría antes de llegar a estos
  // niveles de prueba. Se consulta el máximo real en vez de asumir un
  // valor fijo -- no depende de cuántos niveles tenga el seed hoy. ---
  // reward_grant_component es INMUTABLE incluso para DELETE (trigger de
  // 1.a) -- una vez que un reward_grant referencia un reward_bundle, ese
  // bundle nunca puede borrarse (RESTRICT), así que los level_definition
  // de prueba de corridas anteriores de ESTE gate no pueden eliminarse.
  // Se RETIRAN en su lugar (nunca ACTIVE fuera de esta corrida) -- mismo
  // campo `status` que ya existe para este propósito -- para que
  // `findAllActiveOrderedByLevelNumber()` deje de considerarlos elegibles
  // para las cuentas NUEVAS de esta corrida (de lo contrario, niveles de
  // prueba viejos con umbrales bajos seguirían otorgando de más). El rango
  // >= 900000 es exclusivo de este gate -- nunca colisiona con el seed real.
  await pg.query("UPDATE level_definition SET status = 'RETIRED' WHERE level_number >= 900000 AND status = 'ACTIVE'");

  const maxSeededThreshold = (await pg.query('SELECT COALESCE(MAX(minimum_lifetime_xp), 0)::int AS n FROM level_definition')).rows[0].n as number;
  const thresholdBase = maxSeededThreshold + 1000;
  const levelBase = 900_000 + (suffix % 100_000);
  const bundleLevel2 = await bundleRepo.create({
    bundleKey: `xp-bonus-gate-lvl2-${suffix}`,
    name: 'Recompensa de gate -- nivel 2',
    items: [{ componentType: 'XP_BONUS', xpAmount: 30 }],
  });
  const bundleLevel3 = await bundleRepo.create({
    bundleKey: `xp-bonus-gate-lvl3-${suffix}`,
    name: 'Recompensa de gate -- nivel 3 (dos componentes)',
    items: [
      { componentType: 'XP_BONUS', xpAmount: 20 },
      { componentType: 'COSMETIC', referenceId: randomUUID() }, // fuera de alcance hasta el Incremento 5 -- debe quedar PENDING
    ],
  });
  await levelDefRepo.create({ levelNumber: levelBase + 1, minimumLifetimeXp: thresholdBase });
  await levelDefRepo.create({ levelNumber: levelBase + 2, minimumLifetimeXp: thresholdBase + 100 });
  await levelDefRepo.create({ levelNumber: levelBase + 3, minimumLifetimeXp: thresholdBase + 200 });
  await pg.query('UPDATE level_definition SET reward_bundle_id = $1 WHERE level_number = $2', [bundleLevel2.id, levelBase + 2]);
  await pg.query('UPDATE level_definition SET reward_bundle_id = $1 WHERE level_number = $2', [bundleLevel3.id, levelBase + 3]);

  console.log('--- 1. Cruzar el umbral de nivel 2 otorga XP_BONUS, marca DELIVERED, avanza xp_balance ---');
  const accountA = randomUUID();
  await createEntry(accountA, thresholdBase + 150); // cruza el umbral de nivel 2 (+100), no el de nivel 3 (+200)

  const outcomeA1 = await worker.processAccount(accountA);
  check('processAccount -> PROCESSED', outcomeA1 === 'PROCESSED');

  const grantA = await grantRepo.findByIdempotencyKey(`reward:LEVEL:${accountA}:${levelBase + 2}`);
  check('reward_grant creado para el nivel cruzado', grantA !== null);
  check('exactamente 1 componente (XP_BONUS, el único item del bundle)', grantA?.components.length === 1);
  check('el componente quedó DELIVERED', grantA?.components[0]?.deliveryStatus === 'DELIVERED');
  check('deliveredAt registrado', grantA?.components[0]?.deliveredAt != null);

  const ledgerBonoA = await pg.query("SELECT xp_amount FROM xp_ledger_entry WHERE account_id = $1 AND entry_type = 'BONO'", [accountA]);
  check('exactamente 1 xp_ledger_entry BONO creada', ledgerBonoA.rows.length === 1);
  check('xp_amount del BONO == xp_amount del bundle (30)', ledgerBonoA.rows[0]?.xp_amount === 30);

  const balanceA1 = await balanceRepo.findByAccountId(accountA);
  check('xp_balance.lifetimeXp == AJUSTE + 30 (BONO)', balanceA1?.lifetimeXp === thresholdBase + 150 + 30);

  console.log('--- 2. Convergencia: reintentar el worker sin XP nuevo no escribe nada más (idempotencia de lote) ---');
  const grantCountBeforeRerun = (await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1', [accountA])).rows[0].n as number;
  const ledgerCountBeforeRerun = (await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1', [accountA])).rows[0].n as number;

  // La propia xp_ledger_entry BONO es una entrada NUEVA por encima del
  // cursor recién avanzado (ADR-0019 §2: dispara una pasada más, por
  // diseño) -- la cuenta SÍ debe seguir apareciendo como pendiente. La
  // convergencia no se demuestra por "ya no está pendiente" sino por lo
  // que se prueba abajo: esa pasada siguiente no escribe NADA nuevo.
  const pendingAfterA1 = await worker.discoverPendingAccounts();
  check('la cuenta SÍ aparece como pendiente -- el propio BONO es la entrada que dispara la pasada siguiente', pendingAfterA1.includes(accountA));

  const outcomeA2 = await worker.processAccount(accountA);
  check('segunda pasada (dispara por el BONO) -> PROCESSED, sin encontrar nada nuevo que otorgar', outcomeA2 === 'PROCESSED');

  const grantCountAfterRerun = (await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1', [accountA])).rows[0].n as number;
  const ledgerCountAfterRerun = (await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1', [accountA])).rows[0].n as number;
  check('CERO reward_grant nuevos en el reintento', grantCountAfterRerun === grantCountBeforeRerun);
  check('CERO xp_ledger_entry nuevas en el reintento (converge a punto fijo)', ledgerCountAfterRerun === ledgerCountBeforeRerun);

  console.log('--- 3. Cascada: un solo otorgamiento que cruza DOS niveles otorga AMBOS, y el segundo bundle deja el COSMETIC fuera de alcance en PENDING ---');
  const accountB = randomUUID();
  await createEntry(accountB, thresholdBase + 250); // cruza nivel 2 (+100) Y nivel 3 (+200) en una sola pasada

  const outcomeB1 = await worker.processAccount(accountB);
  check('processAccount -> PROCESSED', outcomeB1 === 'PROCESSED');

  const grantB2 = await grantRepo.findByIdempotencyKey(`reward:LEVEL:${accountB}:${levelBase + 2}`);
  const grantB3 = await grantRepo.findByIdempotencyKey(`reward:LEVEL:${accountB}:${levelBase + 3}`);
  check('reward_grant del nivel 2 creado', grantB2 !== null);
  check('reward_grant del nivel 3 creado (ambos niveles cruzados en la misma pasada, ninguno se saltó)', grantB3 !== null);
  check('nivel 2: componente XP_BONUS DELIVERED', grantB2?.components[0]?.deliveryStatus === 'DELIVERED');

  const xpBonusComponentB3 = grantB3?.components.find((c) => c.componentType === 'XP_BONUS');
  const cosmeticComponentB3 = grantB3?.components.find((c) => c.componentType === 'COSMETIC');
  check('nivel 3: componente XP_BONUS DELIVERED', xpBonusComponentB3?.deliveryStatus === 'DELIVERED');
  check('nivel 3: componente COSMETIC sigue PENDING -- fuera de alcance hasta el Incremento 5, no lo entrega este worker', cosmeticComponentB3?.deliveryStatus === 'PENDING');

  const balanceB1 = await balanceRepo.findByAccountId(accountB);
  check('xp_balance.lifetimeXp == AJUSTE + 30 (nivel 2) + 20 (nivel 3)', balanceB1?.lifetimeXp === thresholdBase + 250 + 30 + 20);

  // Dos BONO nuevos (nivel 2 + nivel 3) quedan por encima del cursor --
  // la cuenta reaparece pendiente por ELLOS, no por el COSMETIC (que nunca
  // escribe xp_ledger_entry). Una pasada más sobre esos BONO no encuentra
  // XP_BONUS nuevo que otorgar (ya entregados, idempotentes) y el
  // COSMETIC sigue PENDING para siempre en este incremento -- correcto
  // (Incremento 5), no bloquea la convergencia de XP_BONUS.
  const pendingAfterB1 = await worker.discoverPendingAccounts();
  check('la cuenta B SÍ aparece pendiente -- por los BONO propios, no por el COSMETIC (que no escribe ledger)', pendingAfterB1.includes(accountB));

  const grantCountBeforeRerunB = (await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1', [accountB])).rows[0].n as number;
  const outcomeB2 = await worker.processAccount(accountB);
  check('pasada disparada por los BONO -> PROCESSED, sin nada nuevo que otorgar', outcomeB2 === 'PROCESSED');
  const grantCountAfterRerunB = (await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1', [accountB])).rows[0].n as number;
  check('CERO reward_grant nuevos (el COSMETIC PENDING no genera reintentos infinitos ni bloquea la convergencia de XP_BONUS)', grantCountAfterRerunB === grantCountBeforeRerunB);

  console.log('--- 4. Fallo real de entrega: cursor NO avanza, componente FAILED, retry entrega sin re-incrementar balance ---');
  const poisonedLedgerRepo = new PoisonOnceLedgerRepository(prisma);
  const workerPoisoned = new RewardEvaluationWorker(
    prisma,
    poisonedLedgerRepo,
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
  );

  const accountC = randomUUID();
  await createEntry(accountC, thresholdBase + 100); // cruza nivel 2 (+100) únicamente

  const outcomeC1 = await workerPoisoned.processAccount(accountC);
  check('primera pasada (con fallo inyectado en la entrega) -> FAILED', outcomeC1 === 'FAILED');

  const grantCAfterFailure = await grantRepo.findByIdempotencyKey(`reward:LEVEL:${accountC}:${levelBase + 2}`);
  check('reward_grant SÍ se creó (la cabecera/snapshot no depende de la entrega)', grantCAfterFailure !== null);
  check('el componente XP_BONUS quedó FAILED, no DELIVERED', grantCAfterFailure?.components[0]?.deliveryStatus === 'FAILED');

  const ledgerBonoCAfterFailure = await pg.query("SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1 AND entry_type = 'BONO'", [accountC]);
  check('CERO xp_ledger_entry BONO creada (la transacción de entrega revirtió por completo)', ledgerBonoCAfterFailure.rows[0].n === 0);
  const balanceCAfterFailure = await balanceRepo.findByAccountId(accountC);
  check(
    'xp_balance.lifetimeXp == SOLO el AJUSTE (el BONO fallido nunca incrementó nada)',
    balanceCAfterFailure?.lifetimeXp === thresholdBase + 100,
  );

  const cursorCAfterFailure = await cursorRepo.findByAccountId(accountC);
  check('el cursor NO avanzó (sigue en null -- nunca se procesó con éxito)', cursorCAfterFailure?.lastProcessedRecordedAt == null);
  check('attempts == 1 tras el fallo', cursorCAfterFailure?.attempts === 1);

  // Mismo criterio que el gate de 1.b: justo tras el fallo, el backoff
  // recién armado (FAILURE_BACKOFF_MS[0]) oculta la cuenta de
  // discoverPendingAccounts -- NO significa que la actividad se perdió
  // (sigue ahí, ver check de arriba), solo que no se reintenta en un
  // bucle apretado. processAccount(accountId) directo (como hace este
  // gate) no depende de discoverPendingAccounts para funcionar.
  const pendingImmediatelyAfterFailure = await workerPoisoned.discoverPendingAccounts();
  check('inmediatamente tras el fallo, la cuenta NO aparece pendiente todavía (backoff no vencido)', !pendingImmediatelyAfterFailure.includes(accountC));

  await pg.query("UPDATE reward_evaluation_cursor SET next_eligible_at = now() - interval '1 second' WHERE account_id = $1", [accountC]);
  const pendingAfterBackoffExpires = await workerPoisoned.discoverPendingAccounts();
  check('tras vencer el backoff, la cuenta SÍ reaparece como pendiente (la actividad nunca se perdió)', pendingAfterBackoffExpires.includes(accountC));

  const outcomeC2 = await workerPoisoned.processAccount(accountC);
  check('reintento (sin el fallo -- ya se desarmó tras el primer uso) -> PROCESSED', outcomeC2 === 'PROCESSED');

  const grantCAfterRetry = await grantRepo.findByIdempotencyKey(`reward:LEVEL:${accountC}:${levelBase + 2}`);
  check('MISMO reward_grant (no se duplicó la cabecera)', grantCAfterRetry?.id === grantCAfterFailure?.id);
  check('el componente ahora sí quedó DELIVERED', grantCAfterRetry?.components[0]?.deliveryStatus === 'DELIVERED');

  const ledgerBonoCAfterRetry = await pg.query("SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1 AND entry_type = 'BONO'", [accountC]);
  check('exactamente 1 xp_ledger_entry BONO tras el retry (no 2 -- sin duplicar por el intento fallido)', ledgerBonoCAfterRetry.rows[0].n === 1);
  const balanceCAfterRetry = await balanceRepo.findByAccountId(accountC);
  check('xp_balance.lifetimeXp == AJUSTE + 30, incrementado UNA sola vez', balanceCAfterRetry?.lifetimeXp === thresholdBase + 100 + 30);

  const cursorCAfterRetry = await cursorRepo.findByAccountId(accountC);
  check('el cursor ahora sí avanzó tras el éxito', cursorCAfterRetry?.lastProcessedRecordedAt != null);
  check('attempts se reseteó a 0 tras el éxito', cursorCAfterRetry?.attempts === 0);

  console.log('--- 5. Frontera de dominio: verificación estática ---');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const filesToCheck = ['reward-evaluation.worker.ts'];
  // 'AchievementDefinition' se retiró en 2.b (evalúa logros UNIQUE),
  // 'accountTitle' se retiró en 3.a (entrega componentes TITLE), y
  // 'ChallengeDefinition' se retira en 4.b (evalúa desafíos, §4.16) --
  // los tres sub-incrementos extendieron el worker con autorización
  // formal. La frontera que SIGUE vigente (equipamiento, cosméticos,
  // inventario -- Incrementos 3.b/5, y reclamación de desafíos, 4.c/+) no
  // cambió y se verifica igual.
  const forbiddenSymbols = ['StudentResponse', 'CurriculumTopicProgress', 'PublicProfile', 'equippedTitle', 'equippedCosmetic', 'inventoryItem'];
  let boundaryViolationFound = false;
  for (const file of filesToCheck) {
    const contents = readFileSync(join(__dirname, '..', 'src', 'gamification', file), 'utf8');
    for (const symbol of forbiddenSymbols) {
      if (contents.includes(symbol)) {
        boundaryViolationFound = true;
        console.error(`  ${file} referencia el símbolo prohibido "${symbol}"`);
      }
    }
  }
  check('el worker no referencia PROGRESS/Public Profile/equipamiento/inventario (fuera de alcance de 1.c, 2.b, 3.a y 4.b)', !boundaryViolationFound);

  console.log('--- 6. Sin efecto sobre PROGRESS ni Public Profile ---');
  const accounts = [accountA, accountB, accountC];
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
  console.log('Todas las verificaciones del gate de Entrega de XP_BONUS y Convergencia (Bloque III, sub-incremento 1.c) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
