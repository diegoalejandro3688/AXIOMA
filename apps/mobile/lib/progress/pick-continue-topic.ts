import { isFreeUnitPosition, type CurriculumTopicResponse, type StudentResponseSummary, type SubjectResponse, type TopicProgressResponse } from '@axioma/contracts';
import { listChildTopics, listRootTopics, listSubjects } from '../api/education';
import { getTopicsProgressBatch } from '../api/progress';
import { isPremiumRequiredError } from '../entitlement/premium-error';
import { resolveContinuationEntry } from './resolve-continuation';

export type ContinueTarget =
  | { kind: 'topic'; subject: SubjectResponse; topic: CurriculumTopicResponse; entry: 'resource' | 'exercise' }
  /** Todas las materias con contenido están completadas (catálogo global, no una sola materia). */
  | { kind: 'all-completed' }
  | { kind: 'no-content' };

export type PickContinueResult = { ok: true; target: ContinueTarget } | { ok: false; message: string };

export interface PickContinueOptions {
  /**
   * PREMIUM V1 -- Capa 2 (C2.2). Con FREE CONFIRMADO, las unidades en
   * posición Premium (`!isFreeUnitPosition(index)`) devuelven `403
   * PREMIUM_REQUIRED` en `children` desde C1.3. Inicio NO las recorre --
   * misma regla compartida `isFreeUnitPosition(index)` que `unidades.tsx`,
   * nunca códigos hardcodeados. Inicio sigue 100% disponible para FREE: la
   * continuidad refleja el progreso ACCESIBLE (U1-U2), no falla porque haya
   * contenido Premium. `null`/PREMIUM/entitlement no resuelto -> se recorren
   * todas (y un `403` en `children` se trata como no-fatal, ver abajo).
   */
  freeUnitsOnly?: boolean;
}

/**
 * Recencia AUTORITATIVA de un recurso EN CURSO -- máximo `respondedAt` de sus
 * respuestas (ms epoch). El backend YA ordena `responses` ASC por
 * `respondedAt` (`student-response.repository.ts`), pero aquí NO se confía en
 * la posición del array (HOTFIX 2.1 §H): se toma el máximo timestamp
 * explícito. Un recurso con `responses.length > 0` y `status != COMPLETED`
 * siempre tiene al menos un `respondedAt` parseable -> nunca devuelve 0 para
 * un candidato real.
 */
function latestResponseAt(responses: StudentResponseSummary[]): number {
  let max = 0;
  for (const response of responses) {
    const parsed = Date.parse(response.respondedAt);
    if (Number.isFinite(parsed) && parsed > max) max = parsed;
  }
  return max;
}

/**
 * Deriva el destino real de "Continuar estudiando" (Home) desde
 * EDUCATION/PROGRESS -- nunca hardcodeado.
 *
 * STUDY CONTENT MOBILE REACHABILITY -- el destino resuelve a un
 * `curriculum_topic` de RECURSO (hijo de una Unidad): los únicos nodos con
 * recurso publicado + preguntas y contra los que PROGRESS registra respuestas.
 *
 * HOTFIX 2.1 -- la tarjeta principal sigue la ACTIVIDAD DE ESTUDIO MÁS
 * RECIENTE, no el orden de materia. Regla:
 *
 *   1. Recorre TODAS las materias canónicas (orden `GET /education/subjects`,
 *      = `displayOrder` ASC) y, dentro de cada una, unidades y recursos en
 *      orden canónico. Reúne cada recurso EN CURSO: `status != COMPLETED` y
 *      `responses.length > 0` (semántica ADR-0014, `resolveContinuationEntry`).
 *      PREMIUM V1 (C2.2): con `freeUnitsOnly` (FREE confirmado) sólo se
 *      recorren las unidades en posición Free -- Inicio NUNCA pide los
 *      `children` de una unidad Premium, y un `403 PREMIUM_REQUIRED` que
 *      llegase igual (tier stale) no es fatal.
 *   2. Entre los recursos en curso, elige el de `max(respondedAt)` más
 *      reciente. Empate exacto -> el primero en el recorrido canónico.
 *      `entry: 'exercise'`.
 *   3. Si NO hay ningún recurso en curso en ninguna materia -> el PRIMER
 *      recurso SIN COMENZAR en orden canónico (materia -> unidad -> recurso).
 *      `entry: 'resource'`.
 *   4. Todas las materias con contenido completadas -> `all-completed` GLOBAL.
 *   5. Sin contenido en ninguna materia -> `no-content`.
 *   6. Un fallo real de EDUCATION/PROGRESS -> `ok: false`. NUNCA se
 *      reinterpreta una materia no consultada o fallida como "completada".
 *
 * Esto REEMPLAZA la regla del Incremento 2 (orden de materia primero). Al
 * requerir comparar recencia GLOBALMENTE, se inspeccionan todas las materias
 * antes de decidir (coste reportado en el informe del hotfix).
 *
 * Disciplina de red: el progreso se pide en UNA sola llamada batch
 * (`GET /progress/topics?topicIds=...`) POR MATERIA con recursos -- nunca
 * `GET /progress/topics/:id` por recurso, nunca un endpoint nuevo.
 */
export async function pickContinueTarget(options?: PickContinueOptions): Promise<PickContinueResult> {
  const freeUnitsOnly = options?.freeUnitsOnly ?? false;
  const subjectsResult = await listSubjects();
  if (!subjectsResult.ok) return { ok: false, message: subjectsResult.message };

  // Orden canónico: el backend ya ordena por `displayOrder` ASC.
  const subjects = subjectsResult.data;
  if (subjects.length === 0) return { ok: true, target: { kind: 'no-content' } };

  // Candidatos, recogidos en orden de recorrido canónico.
  const inProgress: Array<{ subject: SubjectResponse; topic: CurriculumTopicResponse; recency: number; order: number }> = [];
  let firstUntouched: { subject: SubjectResponse; topic: CurriculumTopicResponse } | null = null;
  let anyContent = false;
  let canonicalOrder = 0;

  for (const subject of subjects) {
    // `listRootTopics` devuelve sólo Unidades canónicas (filtro de superficie
    // en EDUCATION). Sus hijos son los Recursos reales.
    const unitsResult = await listRootTopics(subject.id);
    if (!unitsResult.ok) return { ok: false, message: unitsResult.message };
    if (unitsResult.data.length === 0) continue; // materia sin unidades

    // FREE confirmado: sólo se recorren las unidades en posición Free (misma
    // regla que `unidades.tsx`). El backend ya ordena las raíces por `order`
    // ASC, así que el índice ES la posición canónica.
    const units = freeUnitsOnly
      ? unitsResult.data.filter((_unit, index) => isFreeUnitPosition(index))
      : unitsResult.data;
    if (units.length === 0) continue;

    const childrenLists = await Promise.all(units.map((unit) => listChildTopics(unit.id)));
    // Un `403 PREMIUM_REQUIRED` en `children` NO es fatal para Inicio: esa
    // unidad simplemente no aporta recursos accesibles (esto cubre una
    // carrera de entitlement / `freeUnitsOnly` con tier stale). Cualquier
    // OTRO error sí aborta -- nunca se reinterpreta como "completada".
    const firstBlockingError = childrenLists.find((result) => !result.ok && !isPremiumRequiredError(result));
    if (firstBlockingError && !firstBlockingError.ok) return { ok: false, message: firstBlockingError.message };

    // Recursos en orden canónico: unidades por `order`, y dentro de cada
    // unidad los hijos en el orden que devuelve la API (ya por `order`).
    const resources = childrenLists.flatMap((result) => (result.ok ? result.data : []));
    if (resources.length === 0) continue; // unidades sin recursos

    anyContent = true;

    // Una sola solicitud batch para TODOS los recursos de ESTA materia --
    // nunca un `GET /progress/topics/:id` por recurso (fan-out N+1).
    const progressResult = await getTopicsProgressBatch(resources.map((topic) => topic.id));
    if (!progressResult.ok) return { ok: false, message: progressResult.message };

    const progressByTopic = new Map<string, TopicProgressResponse>(
      progressResult.data.map((progress) => [progress.curriculumTopicId, progress]),
    );

    for (const topic of resources) {
      canonicalOrder += 1;
      const progress = progressByTopic.get(topic.id) ?? null;
      const entry = progress ? resolveContinuationEntry(progress) : 'resource';

      if (entry === 'completed') continue; // un recurso COMPLETED nunca se selecciona
      if (entry === 'exercise' && progress) {
        inProgress.push({ subject, topic, recency: latestResponseAt(progress.responses), order: canonicalOrder });
        continue;
      }
      // Sin progreso, o `entry === 'resource'` -> SIN COMENZAR.
      if (!firstUntouched) firstUntouched = { subject, topic };
    }
  }

  if (inProgress.length > 0) {
    // Recencia máxima; empate exacto -> menor `order` (primero en el recorrido).
    const best = inProgress.reduce((current, candidate) =>
      candidate.recency > current.recency || (candidate.recency === current.recency && candidate.order < current.order)
        ? candidate
        : current,
    );
    return { ok: true, target: { kind: 'topic', subject: best.subject, topic: best.topic, entry: 'exercise' } };
  }

  if (firstUntouched) {
    return { ok: true, target: { kind: 'topic', subject: firstUntouched.subject, topic: firstUntouched.topic, entry: 'resource' } };
  }

  return { ok: true, target: anyContent ? { kind: 'all-completed' } : { kind: 'no-content' } };
}
