import type { SqliteDriver } from './sqlite-driver';

export type PendingRewardStatus = 'PENDING' | 'CONFIRMED' | 'EXPIRED';

export interface PendingReward {
  id: string;
  /** VC4 MICROBLOQUE 10.1 -- `null` SÓLO en filas legacy previas a la
   * migración `version: 3` (owner no reconstruible, ver migrations.ts).
   * Toda fila creada desde esta versión SIEMPRE trae un valor real. */
  accountId: string | null;
  /**
   * El `operationId` REAL de la operación que originó la recompensa (ej. la
   * Pregunta rápida respondida) -- nunca un id sintético del cliente. Es el
   * mismo valor que el backend usa como clave de idempotencia del intento
   * (`quick_question_attempt.operation_id`), así que ya identifica la
   * operación real sin necesitar que el backend devuelva un `attempt.id`
   * propio en la respuesta.
   */
  attemptId: string;
  rewardType: string;
  rewardAmount: number;
  status: PendingRewardStatus;
  createdAt: string;
  updatedAt: string;
}

interface PendingRewardRow {
  id: string;
  account_id: string | null;
  attempt_id: string;
  reward_type: string;
  reward_amount: number;
  status: PendingRewardStatus;
  created_at: string;
  updated_at: string;
}

function mapRow(row: PendingRewardRow): PendingReward {
  return {
    id: row.id,
    accountId: row.account_id,
    attemptId: row.attempt_id,
    rewardType: row.reward_type,
    rewardAmount: row.reward_amount,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Persistencia local de recompensas pendientes (VC4 -- League Reward
 * Reliability) -- ver ADR-0011 y el docstring de la migración `version: 2`
 * en `migrations.ts`. Mismo criterio de diseño que `OutboxRepository`:
 * interfaz agnóstica de proveedor (`SqliteDriver`), parámetros SIEMPRE
 * enlazados, `id` inyectado (`generateId`) para mantener este archivo
 * ejecutable con `node:sqlite` en el gate automatizado.
 *
 * Ningún método de este repositorio habla con el backend -- solo persiste y
 * lee localmente. La reconciliación real (¿ya se confirmó?) la decide
 * `lib/league/pending-lp-store.ts` comparando esto contra el saldo
 * autoritativo real, nunca aquí.
 */
export class PendingRewardRepository {
  constructor(
    private readonly driver: SqliteDriver,
    private readonly generateId: () => string,
  ) {}

  /**
   * Idempotente por `attempt_id` (UNIQUE): si ya existe una fila para este
   * intento (ej. el mismo `operationId` reintentado), devuelve la fila
   * EXISTENTE sin crear una segunda -- nunca duplica el pendiente. El `id`
   * generado en un intento de creación descartado por el conflicto se
   * descarta también, nunca queda huérfano en ningún lado (no se inserta
   * nada más que la fila ganadora).
   */
  /** `accountId` OBLIGATORIO (VC4 MICROBLOQUE 10.1) -- nunca inferido implícitamente dentro del repositorio; el llamador (el store, que sabe la identidad ligada) siempre lo pasa explícito. */
  async create(input: { accountId: string; attemptId: string; rewardType: string; rewardAmount: number }): Promise<PendingReward> {
    const existing = await this.findByAttemptId(input.attemptId);
    if (existing) return existing;

    const id = this.generateId();
    const now = new Date().toISOString();
    try {
      await this.driver.runAsync(
        `INSERT INTO pending_reward (id, account_id, attempt_id, reward_type, reward_amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
        [id, input.accountId, input.attemptId, input.rewardType, input.rewardAmount, now, now],
      );
    } catch {
      // Carrera real: otra llamada concurrente ganó el INSERT para el MISMO
      // attempt_id (UNIQUE) entre el findByAttemptId de arriba y este
      // INSERT -- nunca un error real, se relee y se devuelve la fila
      // ganadora (mismo criterio que la admisión atómica del backend).
      const winner = await this.findByAttemptId(input.attemptId);
      if (winner) return winner;
      throw new Error('No se pudo crear la recompensa pendiente y no se encontró ninguna fila existente tras la carrera.');
    }

    const created = await this.findByAttemptId(input.attemptId);
    if (!created) throw new Error('La recompensa pendiente no se pudo leer inmediatamente después de crearla.');
    return created;
  }

  async findByAttemptId(attemptId: string): Promise<PendingReward | null> {
    const row = await this.driver.getFirstAsync<PendingRewardRow>(`SELECT * FROM pending_reward WHERE attempt_id = ?`, [attemptId]);
    return row ? mapRow(row) : null;
  }

  /**
   * `accountId` OBLIGATORIO (VC4 MICROBLOQUE 10.1) -- NUNCA un SELECT
   * global. `account_id = ?` con un valor no-nulo jamás hace match con una
   * fila `account_id IS NULL` (filas legacy pre-migración, ver
   * `migrations.ts` versión 3) -- quedan excluidas estructuralmente de
   * cualquier cuenta, nunca atribuidas a la incorrecta. Orden
   * `created_at ASC` -- FIFO, la base de la reconciliación por delta (ver
   * `pending-lp-store.ts`).
   */
  async listPending(accountId: string): Promise<PendingReward[]> {
    const rows = await this.driver.getAllAsync<PendingRewardRow>(
      `SELECT * FROM pending_reward WHERE account_id = ? AND status = ? ORDER BY created_at ASC`,
      [accountId, 'PENDING'],
    );
    return rows.map(mapRow);
  }

  /** Nunca borra la fila -- mismo criterio que `OutboxRepository.markFailed` (queda como historial local, consultable en diagnóstico). */
  async markConfirmed(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.runAsync(`UPDATE pending_reward SET status = 'CONFIRMED', updated_at = ? WHERE id = ?`, [now, id]);
  }

  /** La recompensa dejó de poder reconciliarse con confianza (ventana de gracia agotada) -- ver `expirePendingRewardsOlderThan` en el store. */
  async markExpired(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.driver.runAsync(`UPDATE pending_reward SET status = 'EXPIRED', updated_at = ? WHERE id = ?`, [now, id]);
  }

  /**
   * VC4 MICROBLOQUE 10.1 (FINAL EDGE-CASE FIX) -- única operación de este
   * repositorio que NO está scopeada por `accountId`, a propósito: las filas
   * legacy pre-migración `version: 3` tienen `account_id IS NULL` y por eso
   * `listPending(accountId)` nunca las carga en ningún caché (quedan en
   * cuarentena -- invisibles para toda cuenta, ver docstring de
   * `listPending`), pero eso mismo significa que `expireStalePendingRewards`
   * tampoco las ve nunca a través del caché, así que sin esto se quedarían
   * `PENDING` en SQLite para siempre. Este método NO adopta ninguna fila (no
   * las asocia a ninguna cuenta, no las toca salvo para expirarlas) -- solo
   * aplica la misma política de TTL general a las filas sin owner
   * reconstruible, igual que ya se aplica a las filas con owner.
   */
  async expireOrphanedLegacyRewards(cutoffIso: string): Promise<number> {
    const result = await this.driver.runAsync(
      `UPDATE pending_reward SET status = 'EXPIRED', updated_at = ? WHERE account_id IS NULL AND status = 'PENDING' AND created_at < ?`,
      [new Date().toISOString(), cutoffIso],
    );
    return result.changes;
  }
}
