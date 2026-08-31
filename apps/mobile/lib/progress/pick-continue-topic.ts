import type { CurriculumTopicResponse, SubjectResponse, TopicProgressResponse } from '@axioma/contracts';
import { listChildTopics, listRootTopics, listSubjects } from '../api/education';
import { getTopicsProgressBatch } from '../api/progress';
import { resolveContinuationEntry } from './resolve-continuation';

export type ContinueTarget =
  | { kind: 'topic'; subject: SubjectResponse; topic: CurriculumTopicResponse; entry: 'resource' | 'exercise' }
  | { kind: 'all-completed'; subject: SubjectResponse }
  | { kind: 'no-content' };

export type PickContinueResult = { ok: true; target: ContinueTarget } | { ok: false; message: string };

/**
 * Deriva el destino real de "Continuar estudiando" (Home, Bloque IV) desde
 * EDUCATION/PROGRESS -- nunca hardcodeado.
 *
 * STUDY CONTENT MOBILE REACHABILITY -- el destino debe resolver a un
 * `curriculum_topic` de RECURSO (hijo de una Unidad): son los únicos nodos
 * con recurso publicado + preguntas y contra los que PROGRESS registra
 * respuestas. Antes esto devolvía el id de una Unidad raíz, que llevaba a
 * `topic/[unitId]/recurso` -- una pantalla sin contenido alcanzable.
 *
 * Prioriza el primer Recurso con respuestas pendientes (`entry: 'exercise'`);
 * si no hay ninguno, el primer Recurso sin comenzar (`entry: 'resource'`); si
 * todos están completados, lo señala explícitamente.
 */
export async function pickContinueTarget(): Promise<PickContinueResult> {
  const subjectsResult = await listSubjects();
  if (!subjectsResult.ok) return { ok: false, message: subjectsResult.message };

  const subject = subjectsResult.data[0];
  if (!subject) return { ok: true, target: { kind: 'no-content' } };

  // `listRootTopics` ya devuelve solo Unidades canónicas (filtro de superficie
  // en EDUCATION). Sus hijos son los Recursos reales.
  const unitsResult = await listRootTopics(subject.id);
  if (!unitsResult.ok) return { ok: false, message: unitsResult.message };
  if (unitsResult.data.length === 0) return { ok: true, target: { kind: 'no-content' } };

  const childrenLists = await Promise.all(unitsResult.data.map((unit) => listChildTopics(unit.id)));
  const firstChildrenError = childrenLists.find((result) => !result.ok);
  if (firstChildrenError && !firstChildrenError.ok) return { ok: false, message: firstChildrenError.message };

  // Recursos en orden canónico: unidades por `order`, y dentro de cada unidad
  // los hijos en el orden que devuelve la API (ya ordenado por `order`).
  const resources = childrenLists.flatMap((result) => (result.ok ? result.data : []));
  if (resources.length === 0) return { ok: true, target: { kind: 'no-content' } };

  // Una sola solicitud batch para TODOS los Recursos -- nunca un
  // `GET /progress/topics/:id` por Recurso (fan-out N+1).
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

  return { ok: true, target: { kind: 'all-completed', subject } };
}
