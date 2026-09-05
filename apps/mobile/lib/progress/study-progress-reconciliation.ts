/**
 * STABILIZATION-B8 (Polish F) -- estado mínimo, sin librería nueva (mismo
 * patrón que `pending-lp-store`), para comunicar "hay progreso de estudio
 * procesándose en el backend" entre las pantallas de Estudio (donde se
 * origina una actividad calificable) e Inicio / Competir (donde se muestran
 * XP y Desafíos).
 *
 * B5A probó la latencia real: acción de estudio -> GamificationScheduler ->
 * otorgamiento de XP -> evaluación de Desafíos, ~1.5-2.5 min. El defecto de
 * UX era que el usuario no tenía NINGUNA señal de que el progreso seguía
 * llegando. Este store NO fabrica XP ni contadores -- sólo "arma" una
 * ventana ACOTADA tras la que las tarjetas de progreso muestran un estado
 * honesto ("Actualizando progreso…") y hacen refetch espaciado.
 *
 * Sólo actividades de ESTUDIO arman esto (RESPUESTA_VALIDADA /
 * RECURSO_COMPLETADO / TEMA_COMPLETADO / ENSAYO_COMPLETADO).
 * QUICK_QUESTION_ANSWERED NUNCA -- Quick es Competir, no Estudio; su XP se
 * reconcilia por su propio camino y nunca implica progreso de Desafío de
 * estudio (filtro de B2 intacto).
 */
type Listener = () => void;

/** Ventana ACOTADA de reconciliación -- cubre con margen la latencia backend conocida (~1.5-2.5 min). */
export const STUDY_RECONCILE_WINDOW_MS = 180_000;

/**
 * Momentos (ms desde el "arm") en los que las tarjetas hacen un refetch
 * silencioso. Cadencia contenida -- 5 intentos espaciados en ~3 min, nunca
 * un poll por segundo, nunca indefinido.
 */
export const STUDY_RECONCILE_REFETCH_OFFSETS_MS: readonly number[] = [12_000, 40_000, 80_000, 130_000, 175_000];

let armedAt: number | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Una pantalla de Estudio llama esto tras una actividad calificable ACEPTADA por el servidor (nunca en cola offline). */
export function armStudyProgressReconciliation(now: number = Date.now()): void {
  armedAt = now;
  notify();
}

/** `null` si nada está armado o la ventana ya expiró (auto-limpieza perezosa). */
export function getStudyProgressArmedAt(now: number = Date.now()): number | null {
  if (armedAt != null && now - armedAt > STUDY_RECONCILE_WINDOW_MS) {
    armedAt = null;
  }
  return armedAt;
}

/** Se llama cuando el valor autoritativo ya se puso al día, o al expirar la ventana. */
export function clearStudyProgressReconciliation(): void {
  if (armedAt !== null) {
    armedAt = null;
    notify();
  }
}

export function subscribeStudyProgressReconciliation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
