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
  {
    /**
     * VC4 (League Reward Reliability) -- `pending_reward`, MISMA
     * infraestructura de persistencia local que `outbox_operation` (ver
     * ADR-0011), pero un concepto DISTINTO: no es una intención de mutación
     * sin enviar (la llamada a Pregunta rápida ya se envió y confirmó server
     * side) -- es el registro local de "el backend me debe confirmar todavía
     * esta recompensa", asociado a `attempt_id` (el `operationId` real de la
     * operación -- ver docstring de `pending-reward-repository.ts`), no a un
     * contador global. Sobrevive el cierre de la app (reemplaza el store
     * puramente en memoria que causaba VC4's bug original).
     *
     * `attempt_id UNIQUE` -- nunca dos filas locales para el mismo intento
     * real (un reintento del mismo `operationId` nunca duplica el pendiente).
     * `status` restringido por CHECK, igual criterio que `sync_status` de
     * arriba. Índice sobre `(status, created_at)` para listar/expirar
     * pendientes en orden sin escanear toda la tabla.
     */
    version: 2,
    up: async (driver) => {
      await driver.execAsync(`
        CREATE TABLE pending_reward (
          id TEXT PRIMARY KEY NOT NULL,
          attempt_id TEXT NOT NULL UNIQUE,
          reward_type TEXT NOT NULL,
          reward_amount INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','EXPIRED')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await driver.execAsync(`
        CREATE INDEX idx_pending_reward_status ON pending_reward (status, created_at);
      `);
    },
  },
];
