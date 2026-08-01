import type { SqliteDriver } from './sqlite-driver';

export class OutboxValidationError extends Error {}

/** Límite de tamaño del payload serializado -- ver ADR-0011. Sin dependencia de `Buffer` (no garantizado en Hermes/RN). */
export const MAX_PAYLOAD_BYTES = 32 * 1024;

export type OutboxSyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface OutboxOperation {
  id: string;
  operationType: string;
  aggregateType: string;
  aggregateId: string;
  payload: string;
  syncStatus: OutboxSyncStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OutboxOperationRow {
  id: string;
  operation_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: string;
  sync_status: OutboxSyncStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: OutboxOperationRow): OutboxOperation {
  return {
    id: row.id,
    operationType: row.operation_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    payload: row.payload,
    syncStatus: row.sync_status,
    retryCount: row.retry_count,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Serializa y valida ANTES de tocar la base -- nunca se intenta un INSERT con un payload inválido. */
function serializePayload(payload: unknown): string {
  let serialized: string;
  try {
    serialized = JSON.stringify(payload) ?? '';
  } catch {
    throw new OutboxValidationError('El payload no es serializable a JSON (ej. referencia circular o BigInt).');
  }
  if (serialized === '') {
    throw new OutboxValidationError('El payload no es serializable a JSON (ej. referencia circular o BigInt).');
  }

  const sizeBytes = new TextEncoder().encode(serialized).length;
  if (sizeBytes > MAX_PAYLOAD_BYTES) {
    throw new OutboxValidationError(`El payload excede el límite de tamaño (${MAX_PAYLOAD_BYTES} bytes).`);
  }

  return serialized;
}

/**
 * Cola local de intenciones -- ver ADR-0011. Ningún método de este
 * repositorio habla con ningún servidor: solo persiste localmente. El
 * envío real (Fase 1) leerá `listPending()` y llamará `markSynced`/
 * `markFailed` según la respuesta del backend real, que todavía no existe.
 *
 * Todas las consultas usan parámetros enlazados (`?`) -- nunca se
 * concatena un valor variable directamente en el SQL.
 *
 * `generateId` se inyecta (no se importa `expo-crypto` aquí) por el mismo
 * motivo que `SqliteDriver` es agnóstico de proveedor: mantiene este
 * archivo ejecutable con `tsx`/`node:sqlite` en el gate automatizado, sin
 * arrastrar módulos nativos de React Native al grafo de imports.
 */
export class OutboxRepository {
  constructor(
    private readonly driver: SqliteDriver,
    private readonly generateId: () => string,
  ) {}

  /** El `id` se genera una única vez aquí y nunca cambia en reintentos posteriores (markFailed no crea una fila nueva). */
  async enqueue(input: {
    operationType: string;
    aggregateType: string;
    aggregateId: string;
    payload: unknown;
  }): Promise<{ id: string }> {
    const payloadJson = serializePayload(input.payload);
    const id = this.generateId();
    const now = new Date().toISOString();

    await this.driver.runAsync(
      `INSERT INTO outbox_operation
         (id, operation_type, aggregate_type, aggregate_id, payload, sync_status, retry_count, last_error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', 0, NULL, ?, ?)`,
      [id, input.operationType, input.aggregateType, input.aggregateId, payloadJson, now, now],
    );

    return { id };
  }

  async listPending(): Promise<OutboxOperation[]> {
    const rows = await this.driver.getAllAsync<OutboxOperationRow>(
      `SELECT * FROM outbox_operation WHERE sync_status = ? ORDER BY created_at ASC`,
      ['PENDING'],
    );
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<OutboxOperation | null> {
    const row = await this.driver.getFirstAsync<OutboxOperationRow>(
      `SELECT * FROM outbox_operation WHERE id = ?`,
      [id],
    );
    return row ? mapRow(row) : null;
  }

  async markSynced(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.runAsync(`UPDATE outbox_operation SET sync_status = 'SYNCED', updated_at = ? WHERE id = ?`, [
      now,
      id,
    ]);
  }

  /** Nunca borra la fila -- solo incrementa retry_count y registra el motivo. */
  async markFailed(id: string, error: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.runAsync(
      `UPDATE outbox_operation SET sync_status = 'FAILED', retry_count = retry_count + 1, last_error = ?, updated_at = ? WHERE id = ?`,
      [error, now, id],
    );
  }
}
