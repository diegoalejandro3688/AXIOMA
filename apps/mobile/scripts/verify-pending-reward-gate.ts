// VC4 (League Reward Reliability) -- gate de la persistencia local de
// recompensas pendientes (`pending_reward`, migración `version: 2`) y de la
// lógica pura de reconciliación (`pending-reward-reconciliation.ts`). Mismo
// criterio EXACTO que `verify-offline-outbox-gate.ts`: corre la lógica REAL
// de producción (migration-runner.ts, migrations.ts,
// pending-reward-repository.ts) inyectando un adaptador de `node:sqlite`.
//
// Cubre específicamente:
//   1. Quick Question -> pending reward persisted.
//   2. "Reinicio de app" (reabrir el mismo archivo de BD) -> el pendiente sobrevive.
//   3. Confirmación del backend -> el pendiente pasa a CONFIRMED.
//   4. Backend no confirma dentro de la ventana -> se puede expirar (EXPIRED).
//   5. El MISMO attemptId procesado dos veces -> nunca duplica la fila (sin doble LP local).
//   6. Reconciliación FIFO por delta -- exacta, parcial e insuficiente.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runMigrations } from '../lib/offline/migration-runner';
import { PendingRewardRepository } from '../lib/offline/pending-reward-repository';
import type { SqliteDriver } from '../lib/offline/sqlite-driver';
import { reconcileByDelta, expireOlderThan, sumRewardAmount } from '../lib/league/pending-reward-reconciliation';
import type { PendingReward } from '../lib/offline/pending-reward-repository';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function createNodeSqliteDriver(db: DatabaseSync): SqliteDriver {
  return {
    execAsync: async (sql) => {
      db.exec(sql);
    },
    runAsync: async (sql, params) => {
      const result = db.prepare(sql).run(...(params as never[]));
      return { changes: Number(result.changes) };
    },
    getAllAsync: async (sql, params) => {
      return db.prepare(sql).all(...(params as never[])) as never[];
    },
    getFirstAsync: async (sql, params) => {
      const row = db.prepare(sql).get(...(params as never[]));
      return (row ?? null) as never;
    },
    withTransactionAsync: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

function reward(overrides: Partial<PendingReward> & Pick<PendingReward, 'id' | 'rewardAmount' | 'createdAt'>): PendingReward {
  return {
    attemptId: overrides.id,
    rewardType: 'LEAGUE_POINTS',
    status: 'PENDING',
    updatedAt: overrides.createdAt,
    ...overrides,
  };
}

async function main() {
  console.log('--- 1. La migración v2 crea pending_reward, su CHECK, y el índice de estado ---');
  const db1 = new DatabaseSync(':memory:');
  const driver1 = createNodeSqliteDriver(db1);
  await runMigrations(driver1);
  const tables = await driver1.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_reward'", []);
  check('tabla pending_reward creada', tables.length === 1);
  const indexes = await driver1.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_pending_reward_status'", []);
  check('índice de estado (status, created_at) creado', indexes.length === 1);
  const version1 = await driver1.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  check('PRAGMA user_version == 2 tras migrar (v1 + v2)', version1?.user_version === 2);
  // outbox_operation (v1) sigue existiendo -- v2 es aditiva, nunca reemplaza v1.
  const outboxTableStillThere = await driver1.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='outbox_operation'", []);
  check('outbox_operation (v1) sigue existiendo -- v2 es puramente aditiva', outboxTableStillThere.length === 1);

  console.log('--- 2. Quick Question -> pending reward persisted (create) ---');
  const repo1 = new PendingRewardRepository(driver1, randomUUID);
  const attemptId1 = randomUUID();
  const created1 = await repo1.create({ attemptId: attemptId1, rewardType: 'LEAGUE_POINTS', rewardAmount: 2 });
  check('status inicial PENDING', created1.status === 'PENDING');
  check('attemptId persistido tal cual (el operationId real)', created1.attemptId === attemptId1);
  check('rewardAmount persistido tal cual', created1.rewardAmount === 2);
  const listedAfterCreate = await repo1.listPending();
  check('aparece en listPending()', listedAfterCreate.some((r) => r.id === created1.id));

  console.log('--- 3. El MISMO attemptId procesado dos veces -> nunca duplica la fila (sin doble LP local) ---');
  const createdAgain = await repo1.create({ attemptId: attemptId1, rewardType: 'LEAGUE_POINTS', rewardAmount: 2 });
  check('devuelve la MISMA fila (mismo id), no crea una segunda', createdAgain.id === created1.id);
  const countForAttempt = await driver1.getAllAsync<{ n: number }>('SELECT count(*) AS n FROM pending_reward WHERE attempt_id = ?', [attemptId1]);
  check('exactamente UNA fila en la base para este attemptId', Number(countForAttempt[0].n) === 1);
  // Incluso con un monto DISTINTO en el segundo intento (nunca debería poder pasar en la práctica -- el
  // monto lo decide el mismo cliente que generó el operationId -- pero la garantía de unicidad es por
  // attempt_id, no por monto, así que se verifica explícitamente que no se sobreescribe silenciosamente).
  const createdWithDifferentAmount = await repo1.create({ attemptId: attemptId1, rewardType: 'LEAGUE_POINTS', rewardAmount: 999 });
  check('un create() posterior con monto distinto para el MISMO attemptId sigue devolviendo la fila original (999 nunca se aplicó)', createdWithDifferentAmount.rewardAmount === 2);

  console.log('--- 4. Confirmación del backend -> el pendiente pasa a CONFIRMED (markConfirmed) ---');
  await repo1.markConfirmed(created1.id);
  const afterConfirm = await repo1.findByAttemptId(attemptId1);
  check('status == CONFIRMED', afterConfirm?.status === 'CONFIRMED');
  const listedAfterConfirm = await repo1.listPending();
  check('ya NO aparece en listPending() (solo PENDING)', !listedAfterConfirm.some((r) => r.id === created1.id));
  check('la fila NO se borró -- sigue existiendo como historial local', afterConfirm !== null);

  console.log('--- 5. Backend no confirma dentro de la ventana -> se puede expirar (markExpired) ---');
  const attemptId2 = randomUUID();
  const created2 = await repo1.create({ attemptId: attemptId2, rewardType: 'LEAGUE_POINTS', rewardAmount: 2 });
  await repo1.markExpired(created2.id);
  const afterExpire = await repo1.findByAttemptId(attemptId2);
  check('status == EXPIRED', afterExpire?.status === 'EXPIRED');
  const listedAfterExpire = await repo1.listPending();
  check('ya NO aparece en listPending()', !listedAfterExpire.some((r) => r.id === created2.id));

  console.log('--- 6. listPending() ordena FIFO (created_at ASC) ---');
  const db2 = new DatabaseSync(':memory:');
  const driver2 = createNodeSqliteDriver(db2);
  await runMigrations(driver2);
  const repo2 = new PendingRewardRepository(driver2, randomUUID);
  const idA = randomUUID();
  const idB = randomUUID();
  const idC = randomUUID();
  // Inserta fuera de orden temporal explícito vía SQL directo (para no depender de sleeps reales)
  // -- created_at controlado a mano, mismo criterio que un test de ordenamiento determinista.
  await driver2.runAsync(
    `INSERT INTO pending_reward (id, attempt_id, reward_type, reward_amount, status, created_at, updated_at) VALUES (?, ?, 'LEAGUE_POINTS', 2, 'PENDING', ?, ?)`,
    [idB, `attempt-${idB}`, '2026-01-01T00:00:02.000Z', '2026-01-01T00:00:02.000Z'],
  );
  await driver2.runAsync(
    `INSERT INTO pending_reward (id, attempt_id, reward_type, reward_amount, status, created_at, updated_at) VALUES (?, ?, 'LEAGUE_POINTS', 2, 'PENDING', ?, ?)`,
    [idA, `attempt-${idA}`, '2026-01-01T00:00:01.000Z', '2026-01-01T00:00:01.000Z'],
  );
  await driver2.runAsync(
    `INSERT INTO pending_reward (id, attempt_id, reward_type, reward_amount, status, created_at, updated_at) VALUES (?, ?, 'LEAGUE_POINTS', 2, 'PENDING', ?, ?)`,
    [idC, `attempt-${idC}`, '2026-01-01T00:00:03.000Z', '2026-01-01T00:00:03.000Z'],
  );
  const orderedPending = await repo2.listPending();
  check('orden FIFO real: A (t=1) antes que B (t=2) antes que C (t=3)', orderedPending.map((r) => r.id).join(',') === [idA, idB, idC].join(','));

  console.log('--- 7. Persistencia real entre "reinicios de la app" (mismo archivo de BD reabierto) ---');
  const tmpDir = mkdtempSync(join(tmpdir(), 'axioma-pending-reward-gate-'));
  const dbPath = join(tmpDir, 'offline.db');

  const dbFile1 = new DatabaseSync(dbPath);
  const driverFile1 = createNodeSqliteDriver(dbFile1);
  await runMigrations(driverFile1);
  const repoFile1 = new PendingRewardRepository(driverFile1, randomUUID);
  const persistedAttemptId = randomUUID();
  const persisted = await repoFile1.create({ attemptId: persistedAttemptId, rewardType: 'LEAGUE_POINTS', rewardAmount: 2 });
  dbFile1.close();

  const dbFile2 = new DatabaseSync(dbPath); // simula "cerrar y reabrir la app"
  const driverFile2 = createNodeSqliteDriver(dbFile2);
  await runMigrations(driverFile2); // no debe re-crear nada -- ya está en la última versión
  const repoFile2 = new PendingRewardRepository(driverFile2, randomUUID);
  const persistedAfterReopen = await repoFile2.findByAttemptId(persistedAttemptId);
  check('el pendiente SOBREVIVE el cierre/reapertura de la app (bug original VC4)', persistedAfterReopen?.id === persisted.id);
  check('status sigue PENDING tras reabrir', persistedAfterReopen?.status === 'PENDING');
  check('rewardAmount intacto tras reabrir', persistedAfterReopen?.rewardAmount === 2);
  dbFile2.close();
  rmSync(tmpDir, { recursive: true, force: true });

  console.log('--- 8. Reconciliación FIFO por delta -- lógica PURA (reconcileByDelta) ---');
  const pendingSet: PendingReward[] = [
    reward({ id: 'r1', rewardAmount: 2, createdAt: '2026-01-01T00:00:01.000Z' }),
    reward({ id: 'r2', rewardAmount: 2, createdAt: '2026-01-01T00:00:02.000Z' }),
    reward({ id: 'r3', rewardAmount: 5, createdAt: '2026-01-01T00:00:03.000Z' }),
  ];

  const exactMatch = reconcileByDelta(pendingSet, 2);
  check('delta EXACTO al monto más antiguo -> confirma solo r1', exactMatch.toConfirm.map((r) => r.id).join(',') === 'r1');
  check('r2/r3 siguen pendientes', exactMatch.stillPending.map((r) => r.id).join(',') === 'r2,r3');

  const cumulativeMatch = reconcileByDelta(pendingSet, 4);
  check('delta cubre r1+r2 (2+2=4) -> confirma ambas, en orden FIFO', cumulativeMatch.toConfirm.map((r) => r.id).join(',') === 'r1,r2');
  check('r3 sigue pendiente', cumulativeMatch.stillPending.map((r) => r.id).join(',') === 'r3');

  const insufficientMatch = reconcileByDelta(pendingSet, 1);
  check('delta INSUFICIENTE para cubrir ni la más antigua (1 < 2) -> nada se confirma', insufficientMatch.toConfirm.length === 0);
  check('las 3 siguen pendientes tal cual', insufficientMatch.stillPending.length === 3);

  const partialCoverMatch = reconcileByDelta(pendingSet, 3);
  check(
    'delta cubre r1 (2) pero no alcanza para r2 (2 más, total 4>3) -> solo confirma r1, NUNCA confirma parcialmente r2',
    partialCoverMatch.toConfirm.map((r) => r.id).join(',') === 'r1',
  );

  const zeroDelta = reconcileByDelta(pendingSet, 0);
  check('delta <= 0 -> no-op total', zeroDelta.toConfirm.length === 0 && zeroDelta.stillPending.length === 3);

  const overCoverMatch = reconcileByDelta(pendingSet, 999);
  check('delta que sobra de más -> confirma TODAS igual (nunca se rechaza por "exceso")', overCoverMatch.toConfirm.length === 3);
  check(
    'la suma de lo confirmado NUNCA excede lo que había pendiente (invariante anti-doble-conteo)',
    sumRewardAmount(overCoverMatch.toConfirm) === sumRewardAmount(pendingSet),
  );

  console.log('--- 9. Expiración por antigüedad -- lógica PURA (expireOlderThan) ---');
  const cutoff = new Date('2026-01-01T00:00:02.500Z').getTime();
  const expiryResult = expireOlderThan(pendingSet, cutoff);
  check('r1 y r2 (más viejas que el corte) se marcan para expirar', expiryResult.toExpire.map((r) => r.id).join(',') === 'r1,r2');
  check('r3 (más nueva que el corte) sigue pendiente', expiryResult.stillPending.map((r) => r.id).join(',') === 'r3');

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de PENDING-REWARD (node:sqlite) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
