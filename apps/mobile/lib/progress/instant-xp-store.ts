import type { LevelProgressResponse } from '@axioma/contracts';

/**
 * VC4 (Instant Progress) -- overlay OPTIMISTA de XP, puramente en memoria
 * (a propósito: a diferencia de `pending-lp-store`, XP NO necesita
 * sobrevivir un cierre completo de la app -- ver el bloque de la tarea:
 * "no convertir un estado puramente optimista de XP en progreso permanente
 * si la arquitectura actual no lo permite"). El backend sigue siendo la
 * ÚNICA autoridad real (`GET /gamification/me/level`, otorgado de forma
 * asíncrona por `XpGrantScheduler`); este store solo evita el delay VISUAL
 * entre completar una actividad y ver la barra de Inicio reaccionar.
 *
 * Mismo patrón singleton/subscribe que `pending-lp-store.ts`/
 * `study-progress-reconciliation.ts` -- ningún store nuevo, ninguna
 * arquitectura paralela.
 *
 * `XP_REWARD_BY_ACTIVITY_TYPE` es la MISMA clase de "eco" documentado que ya
 * usa `QUICK_QUESTION_CORRECT_LP` (`lib/quick-question/quick-question-feedback.ts`):
 * un valor conocido HOY (los 5 `XpRule` sembrados, ver
 * `apps/backend/scripts/seed-xp-v1.ts`, todos con `dailyCap: null` --
 * ninguna incertidumbre de tope), nunca una reimplementación del cálculo de
 * otorgamiento (que sigue siendo 100% del backend: elegibilidad, ventana de
 * temporada/cuenta, idempotencia, el propio otorgamiento). Si un operador
 * cambia estos valores vía la CLI de reglas SIN actualizar esta constante,
 * el overlay optimista mostraría un número momentáneamente desalineado --
 * nunca incorrecto de forma permanente, porque `reconcileXp` siempre
 * corrige contra el valor autoritativo real en cuanto llega.
 */
export const XP_REWARD_BY_ACTIVITY_TYPE = {
  RESPUESTA_VALIDADA: 2,
  RECURSO_COMPLETADO: 20,
  TEMA_COMPLETADO: 20,
  ENSAYO_COMPLETADO: 100,
} as const;

export type XpActivityType = keyof typeof XP_REWARD_BY_ACTIVITY_TYPE;

type Listener = () => void;

let optimisticDelta = 0;
/** Último `lifetimeXp` autoritativo visto -- `null` hasta el primer `reconcileXp`. */
let baselineLifetimeXp: number | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Llamado tras una actividad ACEPTADA por el servidor (mismo criterio que `armStudyProgressReconciliation` -- nunca en cola offline, nunca especulativo). */
export function addOptimisticXp(amount: number): void {
  if (amount <= 0) return;
  optimisticDelta += amount;
  notify();
}

export function getOptimisticXpDelta(): number {
  return optimisticDelta;
}

/**
 * El hub (Inicio) llama esto con CADA `lifetimeXp` autoritativo fresco
 * (carga inicial, foco, o el refresco acotado de `useBoundedReconciliation`)
 * -- nunca solo una vez. Reduce el delta optimista por el incremento REAL
 * observado desde el último baseline, nunca por debajo de 0, y nunca resta
 * más de lo que el propio delta tiene disponible (invariante anti-doble-
 * resta, mismo criterio que `reconcileByDelta` de LP).
 */
export function reconcileXp(authoritativeLifetimeXp: number): void {
  const previousBaseline = baselineLifetimeXp;
  baselineLifetimeXp = authoritativeLifetimeXp;

  if (previousBaseline == null) {
    notify();
    return;
  }

  const confirmedDelta = authoritativeLifetimeXp - previousBaseline;
  if (confirmedDelta <= 0 || optimisticDelta === 0) {
    notify();
    return;
  }

  const next = Math.max(0, optimisticDelta - confirmedDelta);
  optimisticDelta = next;
  notify();
}

export function subscribeInstantXp(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Superpone el delta optimista sobre una respuesta REAL de
 * `GET /gamification/me/level` -- lógica PURA (sin tocar el store), para
 * poder gatearla sin necesitar node:sqlite ni módulos nativos.
 *
 * NUNCA inventa un nivel nuevo ni recalcula `xpForNextLevel`/thresholds --
 * esos siguen siendo 100% del backend. `xpIntoLevel` (y `progressRatio`) se
 * ACOTAN al techo del nivel actual (`xpForNextLevel`) para nunca mostrar un
 * valor que se salga de la barra ni implique un level-up que el backend
 * todavía no confirmó -- un "level up" visible SIEMPRE espera al refetch
 * real. `lifetimeXp` (sin techo -- nivel máximo, `xpForNextLevel === null`)
 * se superpone sin acotar, porque no hay barra que desborde.
 */
export function applyOptimisticXpOverlay(level: LevelProgressResponse, optimisticXpDelta: number): LevelProgressResponse {
  if (optimisticXpDelta <= 0) return level;

  if (level.xpForNextLevel === null) {
    return { ...level, lifetimeXp: level.lifetimeXp + optimisticXpDelta };
  }

  const overlaidXpIntoLevel = Math.min(level.xpIntoLevel + optimisticXpDelta, level.xpForNextLevel);
  const overlaidProgressRatio = level.xpForNextLevel > 0 ? Math.min(1, overlaidXpIntoLevel / level.xpForNextLevel) : level.progressRatio;

  return {
    ...level,
    lifetimeXp: level.lifetimeXp + optimisticXpDelta,
    xpIntoLevel: overlaidXpIntoLevel,
    progressRatio: overlaidProgressRatio,
  };
}
