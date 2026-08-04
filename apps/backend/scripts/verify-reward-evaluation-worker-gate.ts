// Gate del sub-incremento 1.b del Bloque III (`RewardEvaluationWorker`,
// ADR-0019) -- SIN HTTP: prueba directamente los componentes reales
// (worker, repositorios) contra Postgres real, mismo criterio que
// verify-reward-foundation-gate.ts (1.a). SIN evaluación real de
// niveles/logros/desafíos, SIN creación de reward_grant, SIN entrega de
// XP/títulos/cosméticos, SIN escritura sobre inventario ni public_profile
// -- verificado explícitamente en la sección 6.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { RewardEvaluationCursorRepository } from '../src/gamification/reward-evaluation-cursor.repository';
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
import type { XpLedgerEntry } from '../src/generated/prisma/client';

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
 * Subclase de prueba: mismo patrón de instanciación directa que el resto
 * de gates (sin contenedor de Nest). Captura cuántas entradas recibió cada
 * llamada, permite inyectar demora (para forzar contención real de
 * advisory lock) y fallo determinista por cuenta -- el punto de extensión
 * `evaluateAccount` es exactamente donde los Incrementos 2-4 conectarán
 * evaluación real después; aquí solo se usa para observar/forzar
 * comportamiento del propio worker.
 */
class TestRewardEvaluationWorker extends RewardEvaluationWorker {
  poisonAccounts = new Set<string>();
  delayMsAccounts = new Map<string, number>();
  capturedEntryCounts = new Map<string, number>();
  onEvaluateHook?: (accountId: string) => Promise<void>;

  protected async evaluateAccount(_tx: Prisma.TransactionClient, accountId: string, pendingEntries: XpLedgerEntry[]): Promise<void> {
    this.capturedEntryCounts.set(accountId, pendingEntries.length);
    const delay = this.delayMsAccounts.get(accountId);
    if (delay) await sleep(delay);
    if (this.onEvaluateHook) await this.onEvaluateHook(accountId);
    if (this.poisonAccounts.has(accountId)) {
      throw new Error(`fallo simulado para el gate (cuenta ${accountId})`);
    }
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const cursorRepo = new RewardEvaluationCursorRepository(prisma);
  const worker = new TestRewardEvaluationWorker(prisma, ledgerRepo, cursorRepo);

  // Línea base ANTES de correr este gate -- reward_grant puede tener filas
  // preexistentes de otros gates (p. ej. verify-reward-foundation-gate.ts,
  // 1.a); lo que importa es que ESTE gate no agregue ninguna, no que la
  // tabla esté vacía globalmente.
  const rewardGrantCountBefore = (await pg.query('SELECT count(*)::int AS n FROM reward_grant')).rows[0].n as number;

  const suffix = Date.now();
  let entrySeq = 0;
  async function createEntry(accountId: string, occurredAt: Date): Promise<XpLedgerEntry> {
    entrySeq++;
    // AJUSTE, no OTORGAMIENTO: no exige xp_rule_id (CHECK
    // xp_ledger_entry_otorgamiento_requires_rule, Bloque I) -- estos
    // fixtures solo necesitan EXISTIR para que el worker las descubra,
    // no representar un otorgamiento real con regla.
    const { entry } = await ledgerRepo.createIdempotent({
      accountId,
      entryType: 'AJUSTE',
      xpAmount: 10,
      idempotencyKey: `reward-worker-gate-${suffix}-${entrySeq}`,
      occurredAt,
    });
    return entry;
  }

  console.log('--- 1. Dos entradas con el MISMO recordedAt se procesan ambas (orden compuesto) ---');
  // xp_ledger_entry es INMUTABLE (trigger del Bloque I bloquea UPDATE) --
  // no se puede crear con el repositorio (recordedAt = now() al insertar)
  // y forzar el empate después. Se inserta directamente vía SQL, con
  // recorded_at IDÉNTICO explícito en ambas filas desde el origen --
  // único camino posible para este fixture, no un atajo alrededor de la
  // inmutabilidad (ambas filas nacen ya con el valor final).
  const accountTied = randomUUID();
  const tiedTimestamp = new Date();
  const entryTiedId1 = randomUUID();
  const entryTiedId2 = randomUUID();
  await pg.query(
    `INSERT INTO xp_ledger_entry (id, account_id, entry_type, xp_amount, idempotency_key, occurred_at, recorded_at)
     VALUES ($1, $3, 'AJUSTE', 10, $5, $6, $6), ($2, $3, 'AJUSTE', 10, $4, $6, $6)`,
    [entryTiedId1, entryTiedId2, accountTied, `reward-worker-gate-${suffix}-tied-2`, `reward-worker-gate-${suffix}-tied-1`, tiedTimestamp],
  );
  check(
    'fixture: ambas entradas comparten recorded_at exacto',
    (await pg.query('SELECT count(DISTINCT recorded_at)::int AS n FROM xp_ledger_entry WHERE id IN ($1,$2)', [entryTiedId1, entryTiedId2]))
      .rows[0].n === 1,
  );

  const outcomeTied = await worker.processAccount(accountTied);
  check('processAccount -> PROCESSED', outcomeTied === 'PROCESSED');
  check('AMBAS entradas (no solo una) llegaron juntas a evaluateAccount', worker.capturedEntryCounts.get(accountTied) === 2);

  const cursorAfterTied = await cursorRepo.findByAccountId(accountTied);
  const pendingAfterTied = await ledgerRepo.hasEntryAfter(accountTied, {
    recordedAt: cursorAfterTied!.lastProcessedRecordedAt!,
    entryId: cursorAfterTied!.lastProcessedEntryId!,
  });
  check('no queda ninguna entrada pendiente tras procesar el empate (ninguna omitida)', pendingAfterTied === null);

  console.log('--- 2. Entrada creada DURANTE la ejecución queda pendiente para la siguiente corrida ---');
  const accountMidRun = randomUUID();
  await createEntry(accountMidRun, new Date());
  let midRunEntry: XpLedgerEntry | null = null;
  worker.onEvaluateHook = async (accountId) => {
    if (accountId !== accountMidRun) return;
    // Conexión SEPARADA (pg, no `tx`) -- simula una inserción concurrente
    // real desde OTRO proceso mientras esta evaluación sigue en curso,
    // no una escritura dentro de la misma transacción.
    const insertResult = await pg.query(
      `INSERT INTO xp_ledger_entry (id, account_id, entry_type, xp_amount, idempotency_key, occurred_at, recorded_at)
       VALUES ($1, $2, 'AJUSTE', 10, $3, now(), now() + interval '1 second')
       RETURNING id, recorded_at`,
      [randomUUID(), accountMidRun, `reward-worker-gate-${suffix}-mid-run`],
    );
    midRunEntry = insertResult.rows[0];
  };
  const outcomeMidRun = await worker.processAccount(accountMidRun);
  worker.onEvaluateHook = undefined;
  check('processAccount -> PROCESSED (el lote original, no el concurrente)', outcomeMidRun === 'PROCESSED');
  check('solo 1 entrada procesada en este lote (la concurrente NO se coló)', worker.capturedEntryCounts.get(accountMidRun) === 1);

  const cursorAfterMidRun = await cursorRepo.findByAccountId(accountMidRun);
  check('el cursor NO avanzó hasta la entrada concurrente', cursorAfterMidRun!.lastProcessedEntryId !== (midRunEntry as unknown as XpLedgerEntry | null)?.id);
  const stillPending = await ledgerRepo.hasEntryAfter(accountMidRun, {
    recordedAt: cursorAfterMidRun!.lastProcessedRecordedAt!,
    entryId: cursorAfterMidRun!.lastProcessedEntryId!,
  });
  check('la entrada creada durante la evaluación queda pendiente para la siguiente corrida', stillPending !== null);

  console.log('--- 3. Dos workers concurrentes NO procesan la misma cuenta dos veces (advisory lock real) ---');
  const adapterB = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prismaB = new PrismaClient({ adapter: adapterB }) as unknown as PrismaService;
  const ledgerRepoB = new XpLedgerEntryRepository(prismaB);
  const cursorRepoB = new RewardEvaluationCursorRepository(prismaB);
  const workerB = new TestRewardEvaluationWorker(prismaB, ledgerRepoB, cursorRepoB);

  const accountConcurrent = randomUUID();
  await createEntry(accountConcurrent, new Date());
  // Demora artificial en el worker A -- garantiza que, cuando B intenta
  // adquirir el lock, A todavía lo sostiene (contención real, no una
  // carrera de suerte).
  worker.delayMsAccounts.set(accountConcurrent, 400);

  const [resultA, resultB] = await Promise.all([worker.processAccount(accountConcurrent), sleep(100).then(() => workerB.processAccount(accountConcurrent))]);
  worker.delayMsAccounts.delete(accountConcurrent);

  const outcomes = [resultA, resultB].sort();
  check(
    'exactamente uno de los dos workers procesó (PROCESSED) y el otro fue rechazado (SKIPPED_LOCKED)',
    JSON.stringify(outcomes) === JSON.stringify(['PROCESSED', 'SKIPPED_LOCKED']),
  );
  const ledgerCountConcurrent = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1', [accountConcurrent]);
  check('la cuenta tenía exactamente 1 entrada (no se duplicó nada por la concurrencia)', ledgerCountConcurrent.rows[0].n === 1);
  await prismaB.$disconnect();

  console.log('--- 4. Cuenta fallida conserva su cursor anterior y reaparece tras el backoff ---');
  const accountFailing = randomUUID();
  const batch1Entry = await createEntry(accountFailing, new Date());
  const outcomeBatch1 = await worker.processAccount(accountFailing);
  check('primer lote (sin fallo) -> PROCESSED', outcomeBatch1 === 'PROCESSED');
  const cursorAfterBatch1 = await cursorRepo.findByAccountId(accountFailing);
  check('cursor avanzó a la entrada del primer lote', cursorAfterBatch1?.lastProcessedEntryId === batch1Entry.id);

  await createEntry(accountFailing, new Date());
  worker.poisonAccounts.add(accountFailing);
  const outcomeBatch2Failed = await worker.processAccount(accountFailing);
  check('segundo lote (con fallo inyectado) -> FAILED', outcomeBatch2Failed === 'FAILED');

  const cursorAfterFailure = await cursorRepo.findByAccountId(accountFailing);
  check('el cursor NO avanzó -- sigue en la posición del primer lote', cursorAfterFailure?.lastProcessedEntryId === batch1Entry.id);
  check('attempts == 1 tras el primer fallo', cursorAfterFailure?.attempts === 1);
  check('nextEligibleAt quedó en el futuro (backoff aplicado)', cursorAfterFailure!.nextEligibleAt.getTime() > Date.now());

  const pendingImmediatelyAfterFailure = await worker.discoverPendingAccounts();
  check('la cuenta NO aparece como pendiente todavía (backoff no vencido)', !pendingImmediatelyAfterFailure.includes(accountFailing));

  // Simula que el backoff ya venció -- mismo criterio que el resto de gates del proyecto (manipular tiempo vía SQL en vez de esperar).
  await pg.query("UPDATE reward_evaluation_cursor SET next_eligible_at = now() - interval '1 second' WHERE account_id = $1", [accountFailing]);
  const pendingAfterBackoff = await worker.discoverPendingAccounts();
  check('tras vencer el backoff, la cuenta SÍ reaparece como pendiente', pendingAfterBackoff.includes(accountFailing));

  worker.poisonAccounts.delete(accountFailing);
  const outcomeRetrySuccess = await worker.processAccount(accountFailing);
  check('reintento (sin el fallo) -> PROCESSED', outcomeRetrySuccess === 'PROCESSED');
  const cursorAfterRetry = await cursorRepo.findByAccountId(accountFailing);
  check('el cursor ahora sí avanzó más allá del primer lote', cursorAfterRetry?.lastProcessedEntryId !== batch1Entry.id);
  check('attempts se reseteó a 0 tras el éxito', cursorAfterRetry?.attempts === 0);

  console.log('--- 5. Otra cuenta del lote avanza normalmente pese al fallo (aislamiento en run()) ---');
  const accountPoisonInBatch = randomUUID();
  const accountNormalInBatch = randomUUID();
  await createEntry(accountPoisonInBatch, new Date());
  const normalBatchEntry = await createEntry(accountNormalInBatch, new Date());
  worker.poisonAccounts.add(accountPoisonInBatch);

  const runResult = await worker.run();
  worker.poisonAccounts.delete(accountPoisonInBatch);

  check('run() reporta al menos 1 procesada y al menos 1 fallida', runResult.processed >= 1 && runResult.failed >= 1);
  const cursorPoisonAfterRun = await cursorRepo.findByAccountId(accountPoisonInBatch);
  const cursorNormalAfterRun = await cursorRepo.findByAccountId(accountNormalInBatch);
  check('la cuenta envenenada NO tiene cursor avanzado (nunca se procesó con éxito)', cursorPoisonAfterRun?.lastProcessedRecordedAt == null);
  check('la cuenta normal SÍ avanzó su cursor en el mismo run()', cursorNormalAfterRun?.lastProcessedEntryId === normalBatchEntry.id);

  console.log('--- 6. Sin efecto todavía sobre reward_grant, inventario, equipamiento o PROGRESS ---');
  const rewardGrantCountAfter = (await pg.query('SELECT count(*)::int AS n FROM reward_grant')).rows[0].n as number;
  check('CERO reward_grant NUEVOS creados por este gate (sin evaluación real todavía)', rewardGrantCountAfter === rewardGrantCountBefore);
  const publicProfileTouched = await pg.query('SELECT count(*)::int AS n FROM public_profile WHERE account_id = ANY($1)', [
    [accountTied, accountMidRun, accountConcurrent, accountFailing, accountPoisonInBatch, accountNormalInBatch],
  ]);
  check('ningún public_profile creado/tocado', publicProfileTouched.rows[0].n === 0);
  const studentResponseTouched = await pg.query('SELECT count(*)::int AS n FROM student_response WHERE account_id = ANY($1)', [
    [accountTied, accountMidRun, accountConcurrent, accountFailing, accountPoisonInBatch, accountNormalInBatch],
  ]);
  check('ningún StudentResponse creado/tocado (PROGRESS fuera de alcance)', studentResponseTouched.rows[0].n === 0);

  console.log('--- 7. Frontera de dominio: verificación estática ---');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const filesToCheck = ['reward-evaluation.worker.ts', 'reward-evaluation.scheduler.ts', 'reward-evaluation-cursor.repository.ts'];
  // 'RewardGrantRepository' se retiró de esta lista en el sub-incremento
  // 1.c -- ese sub-incremento extendió, con autorización formal (ver nota
  // histórica en BLOCK-III-DEFINITION.md §4.1), el propio worker para
  // crear reward_grant de fuente LEVEL. La frontera que SIGUE vigente
  // (PROGRESS/Public Profile/equipamiento) no cambió y se verifica igual.
  const forbiddenSymbols = ['StudentResponse', 'CurriculumTopicProgress', 'PublicProfile', 'equippedTitle', 'equippedCosmetic'];
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
  check('el worker no referencia PROGRESS/Public Profile/equipamiento', !boundaryViolationFound);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de RewardEvaluationWorker (Bloque III, sub-incremento 1.b) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
