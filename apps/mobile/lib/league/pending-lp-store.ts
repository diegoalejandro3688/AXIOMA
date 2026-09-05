/**
 * STABILIZATION-B (Finding 3B) -- estado mínimo, sin librería nueva, para
 * comunicar "LP pendiente" entre Pregunta rápida (donde se origina) y el hub
 * de Competir (donde se muestra/reconcilia). El total AUTORITATIVO nunca se
 * muta aquí -- este store solo lleva la cuenta de cuánto LP se espera que el
 * backend confirme todavía, para nunca mostrar un total falso mientras el
 * otorgamiento real (asíncrono, ver LeaguePointGrantScheduler) no ha ocurrido.
 */
type Listener = () => void;

let pendingLp = 0;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) listener();
}

export function getPendingLp(): number {
  return pendingLp;
}

/** Pregunta rápida llama esto tras una respuesta correcta -- nunca toca el total autoritativo. */
export function addPendingLp(amount: number): void {
  if (amount <= 0) return;
  pendingLp += amount;
  notify();
}

/** El hub llama esto cuando el saldo autoritativo sube -- reduce lo pendiente por el delta realmente confirmado, nunca por debajo de 0. */
export function reconcilePendingLp(confirmedDelta: number): void {
  if (confirmedDelta <= 0 || pendingLp === 0) return;
  const next = Math.max(0, pendingLp - confirmedDelta);
  if (next !== pendingLp) {
    pendingLp = next;
    notify();
  }
}

export function subscribePendingLp(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
