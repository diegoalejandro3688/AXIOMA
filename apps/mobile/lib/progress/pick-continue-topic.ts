import type { CurriculumTopicResponse, SubjectResponse, TopicProgressResponse } from '@axioma/contracts';
import { listRootTopics, listSubjects } from '../api/education';
import { getTopicsProgressBatch } from '../api/progress';
import { resolveContinuationEntry } from './resolve-continuation';

export type ContinueTarget =
  | { kind: 'topic'; subject: SubjectResponse; topic: CurriculumTopicResponse; entry: 'resource' | 'exercise' }
  | { kind: 'all-completed'; subject: SubjectResponse }
  | { kind: 'no-content' };

export type PickContinueResult = { ok: true; target: ContinueTarget } | { ok: false; message: string };

/**
 * Deriva el destino real de "Continuar estudiando" (Home, Bloque IV) desde
 * EDUCATION/PROGRESS -- nunca hardcodeado. Prioriza el primer tema con
 * respuestas pendientes (`entry: 'exercise'`); si no hay ninguno, el primer
 * tema sin comenzar (`entry: 'resource'`); si todos están completados, lo
 * señala explícitamente en vez de reutilizar el primero por defecto.
 */
export async function pickContinueTarget(): Promise<PickContinueResult> {
  const subjectsResult = await listSubjects();
  if (!subjectsResult.ok) return { ok: false, message: subjectsResult.message };

  const subject = subjectsResult.data[0];
  if (!subject) return { ok: true, target: { kind: 'no-content' } };

  const topicsResult = await listRootTopics(subject.id);
  if (!topicsResult.ok) return { ok: false, message: topicsResult.message };
  if (topicsResult.data.length === 0) return { ok: true, target: { kind: 'no-content' } };

  // Una sola solicitud batch para TODOS los temas raíz -- antes era un
  // `GET /progress/topics/:id` POR TEMA (fan-out N+1 que llegó a superar el
  // rate limit con un catálogo de prueba contaminado, ver hallazgo de
  // Inicio). El contrato por tema no cambia (`TopicProgressResponse`).
  const progressResult = await getTopicsProgressBatch(topicsResult.data.map((topic) => topic.id));
  if (!progressResult.ok) {
    return { ok: false, message: progressResult.message };
  }

  const progressByTopic = new Map<string, TopicProgressResponse>(
    progressResult.data.map((progress) => [progress.curriculumTopicId, progress]),
  );
  const withProgress = topicsResult.data.map((topic) => ({
    topic,
    progress: progressByTopic.get(topic.id) ?? null,
  }));

  const inProgress = withProgress.find(({ progress }) => progress && resolveContinuationEntry(progress) === 'exercise');
  if (inProgress) return { ok: true, target: { kind: 'topic', subject, topic: inProgress.topic, entry: 'exercise' } };

  const notStarted = withProgress.find(({ progress }) => progress && resolveContinuationEntry(progress) === 'resource');
  if (notStarted) return { ok: true, target: { kind: 'topic', subject, topic: notStarted.topic, entry: 'resource' } };

  return { ok: true, target: { kind: 'all-completed', subject } };
}
