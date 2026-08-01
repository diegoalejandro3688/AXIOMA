import { migrations as defaultMigrations, type Migration } from './migrations';
import type { SqliteDriver } from './sqlite-driver';

/** La BD local tiene una versión de esquema más nueva de la que esta build de la app conoce. */
export class FutureSchemaVersionError extends Error {}

interface UserVersionRow {
  user_version: number;
}

async function readSchemaVersion(driver: SqliteDriver): Promise<number> {
  const row = await driver.getFirstAsync<UserVersionRow>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}

/**
 * Runner de migraciones -- ver ADR-0011. Monotónico (nunca aplica una
 * versión ya aplicada) y atómico por migración: cada `up()` corre dentro
 * de `withTransactionAsync`; si lanza, la transacción hace ROLLBACK y
 * `PRAGMA user_version` NUNCA se actualiza para esa versión -- un fallo a
 * mitad de camino dentro de una migración no deja el esquema a medias ni
 * avanza la versión registrada.
 *
 * Si la versión almacenada en la BD es MÁS ALTA que la última que esta
 * build conoce (ej. el usuario instaló una versión anterior de la app
 * sobre una BD ya migrada por una más nueva), falla explícita y
 * controladamente en vez de intentar "desmigrar" o ignorar la diferencia.
 */
export async function runMigrations(driver: SqliteDriver, definitions: Migration[] = defaultMigrations): Promise<void> {
  const sorted = [...definitions].sort((a, b) => a.version - b.version);
  const latestKnownVersion = sorted.length > 0 ? sorted[sorted.length - 1].version : 0;

  const currentVersion = await readSchemaVersion(driver);

  if (currentVersion > latestKnownVersion) {
    throw new FutureSchemaVersionError(
      `La base local tiene una versión de esquema (${currentVersion}) más nueva que la que esta versión de la app conoce (${latestKnownVersion}). Actualiza la app antes de continuar.`,
    );
  }

  const pending = sorted.filter((migration) => migration.version > currentVersion);

  for (const migration of pending) {
    await driver.withTransactionAsync(async () => {
      await migration.up(driver);
      // PRAGMA no admite parámetros enlazados en SQLite -- `migration.version`
      // es un entero literal definido en nuestro propio código (nunca dato
      // de usuario ni de red), por eso se interpola aquí como única
      // excepción documentada a la regla de "siempre parámetros enlazados".
      await driver.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
