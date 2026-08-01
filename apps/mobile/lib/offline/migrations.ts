import type { SqliteDriver } from './sqlite-driver';

export interface Migration {
  version: number;
  up: (driver: SqliteDriver) => Promise<void>;
}

/**
 * Fundación mínima de persistencia offline (client outbox) -- ver
 * ADR-0011. `outbox_operation` es la cola local de INTENCIONES del
 * cliente (Master Context 8.9: "el cliente deberá enviar intenciones, no
 * mutaciones definitivas") -- todavía sin ningún endpoint de servidor que
 * las consuma; eso es trabajo de Fase 1, contra un dominio real
 * (Progress/Education) que hoy no existe.
 *
 * `sync_status` restringido por CHECK a los tres valores válidos.
 * Índice sobre `(sync_status, created_at)` para listar pendientes en
 * orden sin escanear toda la tabla.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    up: async (driver) => {
      await driver.execAsync(`
        CREATE TABLE outbox_operation (
          id TEXT PRIMARY KEY NOT NULL,
          operation_type TEXT NOT NULL,
          aggregate_type TEXT NOT NULL,
          aggregate_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING','SYNCED','FAILED')),
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await driver.execAsync(`
        CREATE INDEX idx_outbox_operation_pending ON outbox_operation (sync_status, created_at);
      `);
    },
  },
];
