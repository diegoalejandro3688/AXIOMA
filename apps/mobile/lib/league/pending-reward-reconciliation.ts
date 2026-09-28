// Import SOLO de tipo -- se elide en compilación, así este módulo NUNCA
// arrastra en tiempo de ejecución `../offline/database.ts` (que sí importa
// `expo-sqlite`/`expo-crypto`, módulos nativos). Mismo criterio EXACTO que
// `lib/ai/send-outcome.ts` y `lib/quick-question/outcomes.ts`: lógica pura,
// gateable con `tsx` puro, sin arrastrar React Native al grafo de imports.
import type { PendingReward } from '../offline/pending-reward-repository';

/**
 * VC4 (League Reward Reliability) -- lógica PURA de reconciliación de
 * recompensas pendientes, separada de la I/O (SQLite) que vive en
 * `pending-lp-store.ts`. Ninguna función de este archivo toca disco ni red.
 */

export interface ReconcileByDeltaResult {
  /** Recompensas que este delta alcanza a cubrir -- el llamador las marca CONFIRMED. */
  toConfirm: PendingReward[];
  /** El resto, sin tocar -- siguen PENDING. */
  stillPending: PendingReward[];
}

/**
 * FIFO por monto: consume `confirmedDelta` contra las recompensas más
 * ANTIGUAS primero (se asume `pending` ya ordenado `createdAt ASC`, como lo
 * entrega `PendingRewardRepository.listPending()`). Una recompensa solo se
 * confirma si el delta restante alcanza a cubrir su monto COMPLETO -- nunca
 * una confirmación parcial de una fila.
 *
 * Nunca resta más de lo que el delta real permite, nunca marca más
 * recompensas de las que el monto confirmado explica -- la suma de
 * `toConfirm` siempre es <= `confirmedDelta`.
 */
export function reconcileByDelta(pending: readonly PendingReward[], confirmedDelta: number): ReconcileByDeltaResult {
  if (confirmedDelta <= 0 || pending.length === 0) {
    return { toConfirm: [], stillPending: [...pending] };
  }

  let remaining = confirmedDelta;
  const toConfirm: PendingReward[] = [];
  const stillPending: PendingReward[] = [];

  for (const reward of pending) {
    if (remaining >= reward.rewardAmount) {
      toConfirm.push(reward);
      remaining -= reward.rewardAmount;
    } else {
      stillPending.push(reward);
    }
  }

  return { toConfirm, stillPending };
}

export interface ExpireOlderThanResult {
  toExpire: PendingReward[];
  stillPending: PendingReward[];
}

/** Recompensas cuyo `createdAt` es anterior a `cutoffMs` (epoch ms) -- el llamador las marca EXPIRED. */
export function expireOlderThan(pending: readonly PendingReward[], cutoffMs: number): ExpireOlderThanResult {
  const toExpire: PendingReward[] = [];
  const stillPending: PendingReward[] = [];

  for (const reward of pending) {
    if (new Date(reward.createdAt).getTime() < cutoffMs) {
      toExpire.push(reward);
    } else {
      stillPending.push(reward);
    }
  }

  return { toExpire, stillPending };
}

export function sumRewardAmount(pending: readonly PendingReward[]): number {
  return pending.reduce((sum, reward) => sum + reward.rewardAmount, 0);
}
