import type { CurriculumTopicResponse } from '@axioma/contracts';
import type { ContinuationEntry } from '../progress/resolve-continuation';

/**
 * STUDY CONTENT MOBILE REACHABILITY -- construcción PURA de los parámetros de
 * navegación de Estudio, extraída de los componentes para poder verificarla
 * de forma aislada (los componentes React no montan en el gate de Node puro).
 *
 * Invariante central verificado por `verify-study-navigation-gate.ts`: el
 * `topicId` que llega a `topic/[topicId]/{recurso,ejercicio}` es SIEMPRE el
 * del `curriculum_topic` de RECURSO (hijo), nunca el de la Unidad. El id de
 * la Unidad viaja aparte, en `unitId`, solo para la navegación de vuelta.
 *
 * Devuelven solo `params` (y el `screen` derivado) -- el `pathname` literal
 * se mantiene en cada componente para no perder el tipado de rutas de Expo
 * Router.
 */

/** Params para `estudio/[subjectId]/unidad/[unitId]` (Unidad -> Recursos). */
export function unitResourceListParams(
  subjectId: string,
  unit: CurriculumTopicResponse,
  subjectName: string | undefined,
): { subjectId: string; unitId: string; name: string; unitName: string } {
  return { subjectId, unitId: unit.id, name: subjectName ?? '', unitName: unit.name };
}

/**
 * Pantalla + params para el flujo canónico recurso/ejercicio. `topicId` es
 * SIEMPRE `resource.id`. `entry === 'resource'` -> pantalla `recurso`;
 * cualquier otro valor (`exercise`/`completed`) -> `ejercicio`.
 */
export function resourceFlowNav(
  subjectId: string,
  resource: CurriculumTopicResponse,
  entry: ContinuationEntry,
  subjectName: string | undefined,
  unit: { id: string; name?: string } | undefined,
): {
  screen: 'recurso' | 'ejercicio';
  params: { topicId: string; subjectId: string; name: string; unitId: string; unitName: string };
} {
  return {
    screen: entry === 'resource' ? 'recurso' : 'ejercicio',
    params: {
      topicId: resource.id,
      subjectId,
      name: subjectName ?? '',
      unitId: unit?.id ?? '',
      unitName: unit?.name ?? '',
    },
  };
}
