import type { CurriculumTopicResponse, SubjectResponse, TopicProgressResponse } from '@axioma/contracts';
import { listChildTopics, listRootTopics, listSubjects } from '../api/education';
import { getTopicsProgressBatch } from '../api/progress';
import { resolveContinuationEntry } from './resolve-continuation';

export type ContinueTarget =
  | { kind: 'topic'; subject: SubjectResponse; topic: CurriculumTopicResponse; entry: 'resource' | 'exercise' }
  /** Todas las materias con contenido están completadas (catálogo global, no una sola materia). */
  | { kind: 'all-completed' }
  | { kind: 'no-content' };

export type PickContinueResult = { ok: true; target: ContinueTarget } | { ok: false; message: string };

/**
 * Deriva el destino real de "Continuar estudiando" (Home) desde
 * EDUCATION/PROGRESS -- nunca hardcodeado.
 *
 * STUDY CONTENT MOBILE REACHABILITY -- el destino resuelve a un
 * `curriculum_topic` de RECURSO (hijo de una Unidad): son los únicos nodos
 * con recurso publicado + preguntas y contra los que PROGRESS registra
 * respuestas.
 *
 * INICIO Increment 2 -- recorre TODAS las materias canónicas, no sólo la
 * primera. El orden de materia tiene prioridad ENTRE materias: se usa el
 * orden canónico que ya devuelve `GET /education/subjects` (`displayOrder`
 * ASC en el backend) y, dentro de cada materia, la semántica de continuidad
 * existente (ADR-0014):
 *
 *   1. primer Recurso EN CURSO  (`status != COMPLETED` y `responses > 0`) -> `entry: 'exercise'`
 *   2. si no, primer Recurso SIN COMENZAR (sin progreso o `responses == 0`) -> `entry: 'resource'`
 *
 * Sólo si la materia actual está completamente terminada (o no tiene
 * destino accionable) se pasa a la siguiente. Materias sin unidades o sin
 * recursos se saltan. Si TODAS las materias con contenido están
 * completadas -> `all-completed` GLOBAL. Sin contenido en ninguna -> `no-content`.
 *
 * Correctitud ante fallo (Increment 2): un fallo real de EDUCATION/PROGRESS
 * (materias, unidades, hijos o progreso) devuelve `ok: false` -- NUNCA se
 * interpreta una materia no consultada como "completada" ni se recomienda
 * un destino con datos incompletos.
 *
 * Disciplina de red: el progreso se pide en UNA sola llamada batch
 * (`GET /progress/topics?topicIds=...`) POR MATERIA inspeccionada -- nunca
 * `GET /progress/topics/:id` por recurso.
 */
export async function pickContinueTarget(): Promise<PickContinueResult> {
  const subjectsResult = await listSubjects();
  if (!subjectsResult.ok) return { ok: false, message: subjectsResult.message };

  // Orden canónico: el backend ya ordena por `displayOrder` ASC.
  const subjects = subjectsResult.data;
  if (subjects.length === 0) return { ok: true, target: { kind: 'no-content' } };

  let anyContent = false;

  for (const subject of subjects) {
    // `listRootTopics` devuelve sólo Unidades canónicas (filtro de superficie
    // en EDUCATION). Sus hijos son los Recursos reales.
    const unitsResult = await listRootTopics(subject.id);
    if (!unitsResult.ok) return { ok: false, message: unitsResult.message };
    if (unitsResult.data.length === 0) continue; // materia sin unidades -> siguiente

    const childrenLists = await Promise.all(unitsResult.data.map((unit) => listChildTopics(unit.id)));
    const firstChildrenError = childrenLists.find((result) => !result.ok);
    if (firstChildrenError && !firstChildrenError.ok) return { ok: false, message: firstChildrenError.message };

    // Recursos en orden canónico: unidades por `order`, y dentro de cada
    // unidad los hijos en el orden que devuelve la API (ya por `order`).
    const resources = childrenLists.flatMap((result) => (result.ok ? result.data : []));
    if (resources.length === 0) continue; // materia con unidades pero sin recursos -> siguiente

    anyContent = true;

    // Una sola solicitud batch para TODOS los recursos de ESTA materia --
    // nunca un `GET /progress/topics/:id` por recurso (fan-out N+1).
    const progressResult = await getTopicsProgressBatch(resources.map((topic) => topic.id));
    if (!progressResult.ok) return { ok: false, message: progressResult.message };

    const progressByTopic = new Map<string, TopicProgressResponse>(
      progressResult.data.map((progress) => [progress.curriculumTopicId, progress]),
    );
    const withProgress = resources.map((topic) => ({
      topic,
      progress: progressByTopic.get(topic.id) ?? null,
    }));

    const inProgress = withProgress.find(({ progress }) => progress && resolveContinuationEntry(progress) === 'exercise');
    if (inProgress) return { ok: true, target: { kind: 'topic', subject, topic: inProgress.topic, entry: 'exercise' } };

    const notStarted = withProgress.find(({ progress }) => !progress || resolveContinuationEntry(progress) === 'resource');
    if (notStarted) return { ok: true, target: { kind: 'topic', subject, topic: notStarted.topic, entry: 'resource' } };

    // Materia completamente terminada -> continuar con la siguiente materia.
  }

  return { ok: true, target: anyContent ? { kind: 'all-completed' } : { kind: 'no-content' } };
}
