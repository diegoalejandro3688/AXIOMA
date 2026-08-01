// Validación AUTOMATIZADA PRINCIPAL de este paso -- ver ADR-0011. Corre la
// lógica REAL de producción (migration-runner.ts, migrations.ts,
// outbox-repository.ts) inyectando un adaptador de `node:sqlite` en vez del
// binding nativo de expo-sqlite -- prueba real contra SQLite real
// (transacciones, constraints, persistencia en archivo), sin necesitar un
// dispositivo/emulador.
//
// Esto NO reemplaza la verificación manual en Android -- ver el checklist
// en docs/adr/0011-fundacion-persistencia-offline.md. La comprobación en
// Browser (expo start --web) es complementaria y solo cubre la pantalla de
// diagnóstico, no esta batería de casos.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runMigrations, FutureSchemaVersionError } from '../lib/offline/migration-runner';
import type { Migration } from '../lib/offline/migrations';
import { MAX_PAYLOAD_BYTES, OutboxRepository, OutboxValidationError } from '../lib/offline/outbox-repository';
import type { SqliteDriver } from '../lib/offline/sqlite-driver';

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

async function main() {
  console.log('--- 1. La migración inicial crea la tabla, el CHECK, y el índice de pendientes ---');
  const db1 = new DatabaseSync(':memory:');
  const driver1 = createNodeSqliteDriver(db1);
  await runMigrations(driver1);
  const tables = await driver1.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='outbox_operation'",
    [],
  );
  check('tabla outbox_operation creada', tables.length === 1);
  const indexes = await driver1.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_outbox_operation_pending'",
    [],
  );
  check('índice de pendientes (sync_status, created_at) creado', indexes.length === 1);
  const version1 = await driver1.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  check('PRAGMA user_version == 1 tras migrar', version1?.user_version === 1);

  console.log('--- 2. Migraciones monotónicas: correr de nuevo no falla ni reaplica ---');
  await runMigrations(driver1);
  const versionAfterSecondRun = await driver1.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  check('la versión sigue en 1 (no se reaplicó)', versionAfterSecondRun?.user_version === 1);

  console.log('--- 3. Una migración fallida NO actualiza la versión (atomicidad real, con ROLLBACK) ---');
  const db2 = new DatabaseSync(':memory:');
  const driver2 = createNodeSqliteDriver(db2);
  const stepOne: Migration = {
    version: 1,
    up: async (d) => {
      await d.execAsync('CREATE TABLE outbox_operation (id TEXT PRIMARY KEY)');
    },
  };
  const stepTwoFails: Migration = {
    version: 2,
    up: async () => {
      throw new Error('fallo deliberado de migración');
    },
  };
  await runMigrations(driver2, [stepOne]);
  let migrationThrew = false;
  try {
    await runMigrations(driver2, [stepOne, stepTwoFails]);
  } catch {
    migrationThrew = true;
  }
  check('la migración fallida propagó el error', migrationThrew);
  const versionAfterFailure = await driver2.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  check('la versión sigue en 1 (la migración fallida NUNCA se registró)', versionAfterFailure?.user_version === 1);

  console.log('--- 4. Una base con versión de esquema futura falla de forma controlada ---');
  const db3 = new DatabaseSync(':memory:');
  const driver3 = createNodeSqliteDriver(db3);
  await driver3.execAsync('PRAGMA user_version = 999');
  let futureError: unknown = null;
  try {
    await runMigrations(driver3);
  } catch (error) {
    futureError = error;
  }
  check('lanza FutureSchemaVersionError (no intenta "desmigrar")', futureError instanceof FutureSchemaVersionError);

  console.log('--- 5. Repositorio: id estable en reintentos; retryCount incrementa; la fila nunca se borra ---');
  const db4 = new DatabaseSync(':memory:');
  const driver4 = createNodeSqliteDriver(db4);
  await runMigrations(driver4);
  const repo = new OutboxRepository(driver4, randomUUID);
  const { id } = await repo.enqueue({
    operationType: 'test_op',
    aggregateType: 'test',
    aggregateId: 'a1',
    payload: { n: 1 },
  });
  await repo.markFailed(id, 'fallo 1');
  let op = await repo.getById(id);
  check('el id no cambió tras el primer fallo', op?.id === id);
  check('retryCount == 1', op?.retryCount === 1);
  check('syncStatus == FAILED (la fila sigue existiendo)', op?.syncStatus === 'FAILED');

  await repo.markFailed(id, 'fallo 2');
  op = await repo.getById(id);
  check('retryCount == 2 tras el segundo fallo', op?.retryCount === 2);
  check('el id sigue igual tras el segundo reintento', op?.id === id);

  await repo.markSynced(id);
  op = await repo.getById(id);
  check('syncStatus == SYNCED tras marcar sincronizado', op?.syncStatus === 'SYNCED');
  check('el id sigue igual tras marcar sincronizado', op?.id === id);

  console.log('--- 6. listPending solo devuelve PENDING ---');
  const { id: idB } = await repo.enqueue({
    operationType: 'test_op',
    aggregateType: 'test',
    aggregateId: 'a2',
    payload: { n: 2 },
  });
  const pending = await repo.listPending();
  check('la operación ya sincronizada NO aparece en pendientes', !pending.some((o) => o.id === id));
  check('la operación recién encolada SÍ aparece en pendientes', pending.some((o) => o.id === idB));

  console.log('--- 7. Rechazo: payload no serializable (referencia circular) ---');
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  let circularError: unknown = null;
  try {
    await repo.enqueue({ operationType: 'x', aggregateType: 'x', aggregateId: 'x', payload: circular });
  } catch (error) {
    circularError = error;
  }
  check('payload circular rechazado con OutboxValidationError', circularError instanceof OutboxValidationError);

  console.log('--- 8. Rechazo: payload que excede el límite de tamaño configurado ---');
  const bigPayload = { blob: 'x'.repeat(MAX_PAYLOAD_BYTES + 1) };
  let sizeError: unknown = null;
  try {
    await repo.enqueue({ operationType: 'x', aggregateType: 'x', aggregateId: 'x', payload: bigPayload });
  } catch (error) {
    sizeError = error;
  }
  check('payload demasiado grande rechazado con OutboxValidationError', sizeError instanceof OutboxValidationError);

  console.log('--- 9. Persistencia real entre "reinicios" (mismo archivo de BD reabierto) ---');
  const tmpDir = mkdtempSync(join(tmpdir(), 'axioma-offline-gate-'));
  const dbPath = join(tmpDir, 'offline.db');

  const dbFile1 = new DatabaseSync(dbPath);
  const driverFile1 = createNodeSqliteDriver(dbFile1);
  await runMigrations(driverFile1);
  const repoFile1 = new OutboxRepository(driverFile1, randomUUID);
  const { id: persistedId } = await repoFile1.enqueue({
    operationType: 'persisted_op',
    aggregateType: 'test',
    aggregateId: 'p1',
    payload: { ok: true },
  });
  dbFile1.close();

  const dbFile2 = new DatabaseSync(dbPath); // simula "cerrar y reabrir la app"
  const driverFile2 = createNodeSqliteDriver(dbFile2);
  await runMigrations(driverFile2); // no debe re-crear nada -- ya está en la última versión
  const repoFile2 = new OutboxRepository(driverFile2, randomUUID);
  const persistedOp = await repoFile2.getById(persistedId);
  check('la operación persiste tras "reabrir" la base', persistedOp?.id === persistedId);
  check('el payload persiste intacto', persistedOp?.payload === JSON.stringify({ ok: true }));
  dbFile2.close();
  rmSync(tmpDir, { recursive: true, force: true });

  console.log('--- 10. Parámetros enlazados: un valor con sintaxis SQL nunca se ejecuta como código ---');
  const db5 = new DatabaseSync(':memory:');
  const driver5 = createNodeSqliteDriver(db5);
  await runMigrations(driver5);
  const repo5 = new OutboxRepository(driver5, randomUUID);
  await repo5.enqueue({
    operationType: 'x',
    aggregateType: "x'); DROP TABLE outbox_operation; --",
    aggregateId: 'x',
    payload: { note: "'); DROP TABLE outbox_operation; --" },
  });
  const tablesAfter = await driver5.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='outbox_operation'",
    [],
  );
  check('la tabla sigue existiendo (el "valor" nunca se interpretó como SQL)', tablesAfter.length === 1);
  const rowsAfter = await repo5.listPending();
  check('la fila con contenido "malicioso" se guardó como dato plano', rowsAfter.length === 1);

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de OFFLINE-OUTBOX (node:sqlite) pasaron.');
  console.log('');
  console.log(
    'RECORDATORIO: esto valida la lógica (migraciones, repositorio, SQL) contra SQLite real, no el binding nativo',
  );
  console.log(
    'de expo-sqlite en Android. La verificación manual en un dispositivo/emulador real sigue pendiente -- ver',
  );
  console.log('el checklist en docs/adr/0011-fundacion-persistencia-offline.md.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
