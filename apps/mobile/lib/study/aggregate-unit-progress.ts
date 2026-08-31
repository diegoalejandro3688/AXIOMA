import type { TopicProgressStatus } from '@axioma/contracts';

/**
 * STUDY CONTENT MOBILE REACHABILITY -- el progreso de una Unidad se DERIVA
 * del progreso de sus Recursos hijos (los `curriculum_topic` que realmente
 * llevan recurso + preguntas y contra los que PROGRESS registra respuestas).
 * La Unidad raíz nunca tiene progreso propio en el catálogo canónico, así
 * que preguntarlo directamente devolvía siempre `NOT_STARTED` -- ver
 * auditoría STUDY CONTENT.
 *
 * Semántica mínima, compatible con los 3 estados existentes
 * (`topicProgressStatusSchema`), sin inventar porcentajes ni un enum nuevo:
 *
 *   - sin hijos conocidos              -> NOT_STARTED (defensivo; una unidad
 *                                        canónica siempre tiene hijos)
 *   - todos los hijos COMPLETED        -> COMPLETED
 *   - todos los hijos NOT_STARTED      -> NOT_STARTED
 *   - cualquier otra combinación       -> IN_PROGRESS (al menos un hijo
 *                                        empezado o completado, pero no todos)
 *
 * Un hijo ausente del batch de progreso (p. ej. borrado entre la lectura de
 * hijos y la del progreso) se trata como `NOT_STARTED` en el call-site,
 * mismo criterio que ya usa `unidades.tsx` -- este helper solo recibe la
 * lista de estados ya resuelta.
 */
export function aggregateUnitProgressStatus(childStatuses: readonly TopicProgressStatus[]): TopicProgressStatus {
  if (childStatuses.length === 0) return 'NOT_STARTED';
  if (childStatuses.every((status) => status === 'COMPLETED')) return 'COMPLETED';
  if (childStatuses.every((status) => status === 'NOT_STARTED')) return 'NOT_STARTED';
  return 'IN_PROGRESS';
}
