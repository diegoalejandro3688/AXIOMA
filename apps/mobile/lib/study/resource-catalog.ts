import type { CurriculumTopicResponse, TopicProgressResponse } from '@axioma/contracts';
import { listRootTopics, listChildTopics } from '../api/education';
import { getTopicsProgressBatch } from '../api/progress';

/**
 * ESTUDIO R -- ensamblado del "catálogo de Recursos" de una materia para el
 * modo independiente `estudio/[subjectId]/recursos`: TODOS los Recursos de la
 * materia, agrupados por Unidad.
 *
 * Orquestación PURA (sin JSX ni componentes React) para poder verificarla en
 * Node aislado (`scripts/verify-recursos-catalog-gate.ts`). Reutiliza
 * EXACTAMENTE los 3 helpers de producción que ya usa `unidades.tsx`, con el
 * mismo patrón de requests `1 + N + 1` (1 `listRootTopics` + N
 * `listChildTopics` + 1 `getTopicsProgressBatch`) y el mismo criterio "id
 * ausente del batch -> NOT_STARTED" (resuelto en el call-site). NUNCA un
 * `GET /progress/topics/:id` por recurso.
 *
 * Coste real (auditado bajo el límite 300/60s por IP): M1/M2 = 6 requests,
 * Lenguaje/Ciencias/Historia = 5. Progress batch: máx. ~33 ids (Ciencias) ≪
 * `MAX_TOPIC_PROGRESS_BATCH_IDS` (300).
 *
 * Resiliencia: un fallo de `listRootTopics`, de CUALQUIER `listChildTopics` o
 * del batch de progreso se propaga como `{ ok: false }` -> la pantalla
 * muestra `ErrorState` completo (mismo criterio global que `unidades.tsx`,
 * sin resiliencia por sección en V1). Una Unidad sin Recursos se OMITE de
 * las secciones (no rompe la carga).
 */
export interface ResourceCatalogSection {
  unit: CurriculumTopicResponse;
  resources: CurriculumTopicResponse[];
}

export interface ResourceCatalog {
  sections: ResourceCatalogSection[];
  progressByResource: Record<string, TopicProgressResponse>;
}

export type ResourceCatalogResult =
  | { ok: true; catalog: ResourceCatalog }
  | { ok: false; message: string };

export async function assembleResourceCatalog(subjectId: string): Promise<ResourceCatalogResult> {
  const unitsResult = await listRootTopics(subjectId);
  if (!unitsResult.ok) {
    return { ok: false, message: unitsResult.message };
  }

  // N llamadas (una por Unidad canónica, hoy 3-4) -- mismo tradeoff que
  // `unidades.tsx`: no hay endpoint batch de hijos y crear uno para 3-4
  // llamadas no se justifica.
  const childrenLists = await Promise.all(unitsResult.data.map((unit) => listChildTopics(unit.id)));
  const firstChildrenError = childrenLists.find((result) => !result.ok);
  if (firstChildrenError && !firstChildrenError.ok) {
    return { ok: false, message: firstChildrenError.message };
  }

  // Orden de Unidades y de Recursos = el que devuelve el backend
  // (`orderBy: { order: 'asc' }` en ambos). No se reordena en el cliente.
  // Las Unidades sin Recursos se omiten (no se renderiza un header huérfano).
  const sections: ResourceCatalogSection[] = unitsResult.data
    .map((unit, index) => ({
      unit,
      resources: childrenLists[index].ok ? childrenLists[index].data : [],
    }))
    .filter((section) => section.resources.length > 0);

  // UNA sola solicitud batch para TODOS los recursos de TODAS las secciones.
  const allResourceIds = sections.flatMap((section) => section.resources.map((resource) => resource.id));
  const progressByResource: Record<string, TopicProgressResponse> = {};
  if (allResourceIds.length > 0) {
    const progressResult = await getTopicsProgressBatch(allResourceIds);
    if (!progressResult.ok) {
      return { ok: false, message: progressResult.message };
    }
    for (const progress of progressResult.data) {
      progressByResource[progress.curriculumTopicId] = progress;
    }
  }

  return { ok: true, catalog: { sections, progressByResource } };
}

/** Etiqueta de conteo de una sección, con singular/plural correcto. */
export function resourceCountLabel(count: number): string {
  return count === 1 ? '1 recurso' : `${count} recursos`;
}
