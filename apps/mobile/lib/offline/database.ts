import { openDatabaseAsync } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { createExpoSqliteDriver } from './sqlite-driver.expo';
import { runMigrations } from './migration-runner';
import { OutboxRepository } from './outbox-repository';
import type { SqliteDriver } from './sqlite-driver';

const DATABASE_NAME = 'axioma-offline.db';

let cachedDriver: SqliteDriver | null = null;
let initPromise: Promise<SqliteDriver> | null = null;

/** Abre la BD real (expo-sqlite) y corre las migraciones una sola vez -- cacheado durante la vida del proceso. */
async function getDriver(): Promise<SqliteDriver> {
  if (cachedDriver) return cachedDriver;
  if (!initPromise) {
    initPromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      const driver = createExpoSqliteDriver(db);
      await runMigrations(driver);
      cachedDriver = driver;
      return driver;
    })();
  }
  return initPromise;
}

export async function getOutboxRepository(): Promise<OutboxRepository> {
  const driver = await getDriver();
  return new OutboxRepository(driver, randomUUID);
}
