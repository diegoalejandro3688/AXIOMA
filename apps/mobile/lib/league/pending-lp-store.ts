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

/**
 * VC4 MICROBLOQUE 10.1 -- identidad de cuenta ligada al caché actual.
 * Mismo patrón que `instant-xp-store.ts#boundAccountId` (ver su docstring
 * para el razonamiento completo de "reset explícito en cambio de
 * identidad" vs. store keyed por cuenta). `generation` protege contra la
 * carrera donde una hidratación en vuelo para la cuenta ANTERIOR resuelve
 * DESPUÉS de que ya se ligó una cuenta nueva -- sin esto, esa promesa
 * tardía sobreescribiría el caché de la cuenta nueva con filas de la
 * vieja.
 */
let boundAccountId: string | null = null;
let generation = 0;

function notify(): void {
  for (const listener of listeners) listener();
}

async function ensureHydrated(): Promise<void> {
  const accountId = boundAccountId;
  const myGeneration = generation;
  if (!accountId) {
    // Sin cuenta ligada -- caché vacío, nunca se hidrata nada "genérico".
    cache = [];
    hydrated = true;
    notify();
    return;
  }
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const repo = await getPendingRewardRepository();
      const rows = await repo.listPending(accountId);
      if (myGeneration !== generation) return; // la cuenta cambió mientras esto estaba en vuelo -- descartar, ya no es vigente.
      cache = rows;
      hydrated = true;
      notify();
    })();
  }
  return hydratePromise;
}

/**
 * Liga el store a `accountId` (o a "ninguna cuenta" si `null`), llamado
 * desde `AuthProvider#updateAccountId` en CADA transición real de
 * identidad -- mismo punto central que `bindInstantXpAccount`
 * (Microbloque 10), nunca un segundo listener de auth duplicado (§14).
 * No-op determinista si la identidad no cambió (reautenticación de la
 * MISMA cuenta, §15). Invalida el caché SÍNCRONAMENTE (nunca se expone el
 * LP pendiente de la cuenta anterior, ni por un instante -- §13) y dispara
 * la rehidratación para la cuenta nueva de inmediato, sin esperar a que
 * algún consumidor llame `initPendingRewardStore()` de nuevo.
 */
export function bindPendingLpAccount(accountId: string | null): void {
  if (accountId === boundAccountId) return;
  boundAccountId = accountId;
  generation++;
  cache = [];
  hydrated = false;
  hydratePromise = null;
  notify();
  void ensureHydrated();
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
  const accountId = boundAccountId;
  // VC4 MICROBLOQUE 10.1 -- sin cuenta ligada, no se crea NINGUNA fila
  // (nunca una fila legacy nueva sin owner) -- en la práctica inalcanzable
  // (Quick sólo es accesible autenticado), pero explícito en vez de
  // asumido silenciosamente.
  if (!accountId) return;
  const myGeneration = generation;
  await ensureHydrated();
  if (myGeneration !== generation) return; // la cuenta cambió mientras se hidrataba -- no mezclar con la cuenta nueva.
  const repo = await getPendingRewardRepository();
  const reward = await repo.create({ accountId, attemptId, rewardType: REWARD_TYPE_LEAGUE_POINTS, rewardAmount: amount });
  if (myGeneration !== generation) return; // la cuenta cambió mientras se creaba -- el resultado ya no es vigente para el caché actual.
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
  const myGeneration = generation;
  await ensureHydrated();
  if (myGeneration !== generation) return; // la cuenta cambió mientras se hidrataba -- este delta pertenecía a la cuenta anterior.
  if (confirmedDelta <= 0 || cache.length === 0) return;

  const { toConfirm, stillPending } = reconcileByDelta(cache, confirmedDelta);
  if (toConfirm.length === 0) return;

  const repo = await getPendingRewardRepository();
  for (const reward of toConfirm) {
    await repo.markConfirmed(reward.id);
  }

  if (myGeneration !== generation) return; // la cuenta cambió mientras se confirmaba -- no pisar el caché de la cuenta nueva.
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
  const cutoffIso = new Date(Date.now() - maxAgeMs).toISOString();

  // VC4 MICROBLOQUE 10.1 (FINAL EDGE-CASE FIX) -- barrido de filas legacy
  // huérfanas (`account_id IS NULL`), independiente de la cuenta ligada y
  // del caché en memoria (nunca las carga ninguna cuenta, ver
  // `listPending`/`expireOrphanedLegacyRewards`). No adopta ninguna fila, no
  // depende de `boundAccountId`, no participa del guard de `generation`
  // (no hay caché de ninguna cuenta que pueda pisarse) -- solo aplica la
  // misma política de TTL general que ya corre para las filas con owner.
  const repo = await getPendingRewardRepository();
  await repo.expireOrphanedLegacyRewards(cutoffIso);

  const myGeneration = generation;
  await ensureHydrated();
  if (myGeneration !== generation) return; // la cuenta cambió mientras se hidrataba.
  if (cache.length === 0) return;

  const { toExpire, stillPending } = expireOlderThan(cache, Date.now() - maxAgeMs);
  if (toExpire.length === 0) return;

  for (const reward of toExpire) {
    await repo.markExpired(reward.id);
  }

  if (myGeneration !== generation) return; // la cuenta cambió mientras se expiraba -- no pisar el caché de la cuenta nueva.
  cache = stillPending;
  notify();
}

export function subscribePendingLp(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
