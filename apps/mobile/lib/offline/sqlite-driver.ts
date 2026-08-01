/**
 * Interfaz agnóstica de proveedor SQLite -- ver ADR-0011 (fundación de
 * persistencia offline / client outbox). Todo el código de migraciones y
 * del repositorio (`migration-runner.ts`, `outbox-repository.ts`) se
 * escribe contra esta interfaz, nunca contra `expo-sqlite` directamente.
 *
 * Esto permite probar la lógica real (no una reimplementación) con
 * `node:sqlite` en un script de Node (`scripts/verify-offline-outbox-gate.ts`),
 * sin pasar por el binding nativo de Expo -- la validación automatizada
 * principal de este paso. La app real usa `sqlite-driver.expo.ts`.
 *
 * Todos los métodos con datos variables reciben parámetros posicionales
 * (`?`) -- nunca se concatena un valor directamente en el SQL.
 */
export interface SqliteDriver {
  /** Para DDL/PRAGMA sin parámetros variables. */
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: ReadonlyArray<unknown>): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params: ReadonlyArray<unknown>): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: ReadonlyArray<unknown>): Promise<T | null>;
  /** Atómica: si `task` lanza, hace ROLLBACK y propaga el error. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
