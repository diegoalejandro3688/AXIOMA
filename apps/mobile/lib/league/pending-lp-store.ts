import { getPendingRewardRepository } from '../offline/database';
import type { PendingReward } from '../offline/pending-reward-repository';
import { reconcileByDelta, expireOlderThan, sumRewardAmount } from './pending-reward-reconciliation';

/**
 * VC4 (League Reward Reliability) -- reemplaza el store puramente en
 * memoria (`let pendingLp = 0`) que causaba el bug original: un cierre
 * completo de la app perdía el indicador "N LP pendiente" sin ninguna
 * persistencia, sin relación con si el backend ya había otorgado el LP o
 * no. Ver docs/adr (diagnóstico previo, League Points Persistence).
 *
 * Ahora cada recompensa pendiente es una fila real en SQLite
 * (`pending_reward`, ver `lib/offline/pending-reward-repository.ts`),
 * asociada al `operationId` REAL de la operación (el `attemptId` de esta
 * interfaz) -- nunca un contador global. Este módulo mantiene un CACHÉ en
 * memoria (para que `getPendingLp()` siga siendo síncrono, como antes, para
 * no romper el render de la UI) que se hidrata desde SQLite al arrancar y se
 * mantiene en sync con cada escritura (write-through).
 *
 * El total AUTORITATIVO sigue sin mutarse aquí -- este store solo lleva la
 * cuenta de cuánto LP se espera que el backend confirme todavía. Backend
 * sigue siendo la ÚNICA fuente de verdad (`view.leaguePoints`, ver
 * `app/(tabs)/competir/index.tsx`).
 */

type Listener = () => void;

const REWARD_TYPE_LEAGUE_POINTS = 'LEAGUE_POINTS';

/** Ventana de gracia antes de dejar de mostrar una recompensa como pendiente -- ampliamente mayor que el ciclo real de otorgamiento (~1-2 min, dos crons @EVERY_MINUTE) para no expirar de más por latencia normal. Ver docstring de `expireStalePendingRewards`. */
export const PENDING_REWARD_MAX_AGE_MS = 30 * 60 * 1000;

let cache: PendingReward[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

async function ensureHydrated(): Promise<void> {
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const repo = await getPendingRewardRepository();
      cache = await repo.listPending();
      hydrated = true;
      notify();
    })();
  }
  return hydratePromise;
}

/** Llamado una vez al arrancar la app (ver `app/(tabs)/competir/index.tsx`) -- recupera los pendientes persistidos tras un reinicio. Seguro de llamar más de una vez (idempotente, comparte la misma promesa). */
export function initPendingRewardStore(): Promise<void> {
  return ensureHydrated();
}

/** Síncrono a propósito (como antes de VC4) -- lee el caché en memoria, ya hidratado por `initPendingRewardStore`/`ensureHydrated`. Antes de hidratar devuelve 0 (nunca un valor inventado); el primer `notify()` tras hidratar corrige la UI vía `subscribePendingLp`. */
export function getPendingLp(): number {
  return sumRewardAmount(cache);
}

/**
 * Pregunta rápida llama esto tras una respuesta correcta y elegible para LP
 * -- nunca toca el total autoritativo. `attemptId` es el `operationId` REAL
 * de la respuesta (idempotente: reintentar con el mismo `attemptId` nunca
 * duplica la fila, ver `PendingRewardRepository.create`).
 */
export async function addPendingReward(attemptId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await ensureHydrated();
  const repo = await getPendingRewardRepository();
  const reward = await repo.create({ attemptId, rewardType: REWARD_TYPE_LEAGUE_POINTS, rewardAmount: amount });
  if (reward.status === 'PENDING' && !cache.some((r) => r.id === reward.id)) {
    cache = [...cache, reward];
    notify();
  }
}

/**
 * El hub llama esto cuando el saldo autoritativo sube -- reduce lo
 * pendiente por el delta realmente confirmado, marcando CONFIRMED (nunca
 * borrando) las recompensas pendientes más ANTIGUAS primero (FIFO) hasta
 * agotar el delta.
 *
 * LIMITACIÓN DOCUMENTADA (ver reporte VC4, sección C): el backend hoy no
 * expone qué `attempt`/`operationId` específico generó cada incremento del
 * saldo -- no existe un endpoint que reconstruya esa asociación exacta sin
 * inventar uno nuevo (fuera de alcance de este bloque, que reutiliza
 * mecanismos existentes). Este heurístico FIFO por monto puede, en el caso
 * borde de varias recompensas pendientes de igual monto confirmándose en un
 * orden distinto al real, atribuir la confirmación a la fila local
 * incorrecta -- pero la SUMA total nunca se equivoca (nunca resta más de lo
 * que el backend confirmó, nunca doble-cuenta) y ninguna recompensa se
 * pierde ni se otorga dos veces localmente.
 */
export async function reconcilePendingRewards(confirmedDelta: number): Promise<void> {
  await ensureHydrated();
  if (confirmedDelta <= 0 || cache.length === 0) return;

  const { toConfirm, stillPending } = reconcileByDelta(cache, confirmedDelta);
  if (toConfirm.length === 0) return;

  const repo = await getPendingRewardRepository();
  for (const reward of toConfirm) {
    await repo.markConfirmed(reward.id);
  }

  cache = stillPending;
  notify();
}

/**
 * Recompensas pendientes más viejas que `PENDING_REWARD_MAX_AGE_MS` dejan
 * de mostrarse como pendientes (EXPIRED) -- evita que un pendiente quede
 * visible indefinidamente si nunca llega a reconciliarse (backend lo
 * rechazó silenciosamente por elegibilidad, o cualquier otra causa). Esto
 * NUNCA resta del saldo autoritativo real ni afirma que el LP se perdió --
 * solo dejar de anunciar como "pendiente" algo que ya no se puede seguir
 * esperando con confianza. Llamado periódicamente desde el hub (ver
 * `app/(tabs)/competir/index.tsx`), nunca bloqueante para el render.
 */
export async function expireStalePendingRewards(maxAgeMs: number = PENDING_REWARD_MAX_AGE_MS): Promise<void> {
  await ensureHydrated();
  if (cache.length === 0) return;

  const { toExpire, stillPending } = expireOlderThan(cache, Date.now() - maxAgeMs);
  if (toExpire.length === 0) return;

  const repo = await getPendingRewardRepository();
  for (const reward of toExpire) {
    await repo.markExpired(reward.id);
  }

  cache = stillPending;
  notify();
}

export function subscribePendingLp(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
