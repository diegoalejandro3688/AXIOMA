import { useEffect, useRef, useState } from 'react';
import {
  clearStudyProgressReconciliation,
  getStudyProgressArmedAt,
  STUDY_RECONCILE_REFETCH_OFFSETS_MS,
  STUDY_RECONCILE_WINDOW_MS,
  subscribeStudyProgressReconciliation,
} from './study-progress-reconciliation';

/**
 * STABILIZATION-B8 (Polish F, §22) -- hook COMPARTIDO de reconciliación
 * ACOTADA para las tarjetas de progreso (XP en Inicio, Desafíos en Competir).
 *
 * Mientras haya una ventana de reconciliación armada por una actividad de
 * estudio (`study-progress-reconciliation`) y el valor autoritativo NO haya
 * cambiado todavía:
 *   - `processing = true`  -> la tarjeta muestra "Actualizando progreso…"
 *   - se programan refetch silenciosos ESPACIADOS (`STUDY_RECONCILE_REFETCH_OFFSETS_MS`)
 *     hasta la ventana máxima (`STUDY_RECONCILE_WINDOW_MS`)
 *
 * Se detiene (`processing = false`, timers cancelados) en cuanto:
 *   - `signature` cambia respecto al valor que tenía al armarse (el backend
 *     ya se puso al día), o
 *   - expira la ventana.
 *
 * NUNCA fabrica valores. NUNCA lanza timers duplicados (un solo `useEffect`
 * por ciclo de armado). Cancela todo al desmontar.
 */
export function useBoundedReconciliation(
  refresh: () => void,
  signature: string | number | null,
): { processing: boolean } {
  const [armedAt, setArmedAt] = useState<number | null>(() => getStudyProgressArmedAt());
  const baselineRef = useRef<string | number | null>(null);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => subscribeStudyProgressReconciliation(() => setArmedAt(getStudyProgressArmedAt())), []);

  // Captura la firma del valor autoritativo en el instante del armado.
  useEffect(() => {
    if (armedAt != null && baselineRef.current === null) {
      baselineRef.current = signature;
    }
    if (armedAt == null) {
      baselineRef.current = null;
    }
  }, [armedAt, signature]);

  const changed = armedAt != null && baselineRef.current !== null && signature !== baselineRef.current;
  const processing = armedAt != null && !changed;

  // El backend ya se puso al día -> limpiar la ventana (una vez).
  useEffect(() => {
    if (changed) {
      clearStudyProgressReconciliation();
    }
  }, [changed]);

  // Refetch espaciado + cierre de ventana. Un único efecto por `armedAt`;
  // su cleanup cancela TODOS los timers -> nunca hay bucles solapados, y el
  // desmontaje los cancela también.
  useEffect(() => {
    if (!processing || armedAt == null) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const offset of STUDY_RECONCILE_REFETCH_OFFSETS_MS) {
      const delay = armedAt + offset - Date.now();
      if (delay > 0) timers.push(setTimeout(() => refreshRef.current(), delay));
    }
    const endDelay = armedAt + STUDY_RECONCILE_WINDOW_MS - Date.now();
    timers.push(setTimeout(() => clearStudyProgressReconciliation(), Math.max(0, endDelay)));
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [processing, armedAt]);

  return { processing };
}
