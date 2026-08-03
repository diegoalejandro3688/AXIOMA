import type { TopicProgressResponse } from '@axioma/contracts';

export type ContinuationEntry = 'resource' | 'exercise' | 'completed';

/**
 * Semántica de continuidad de Bloque IV -- ver ADR-0014. ADR-0014 no
 * persiste ningún checkpoint de "recurso visto"; por eso la continuidad se
 * deriva únicamente de `status`/`responses`, con solo 3 estados posibles:
 *
 *   - sin respuestas registradas           -> 'resource'
 *   - con respuestas, unidad no completada -> 'exercise' (primera pregunta
 *                                              no respondida, resuelta por
 *                                              la propia pantalla Ejercicio)
 *   - todas las preguntas respondidas      -> 'completed'
 *
 * Si un estado adicional (ej. "recurso visto sin responder") resultara
 * necesario, requiere una enmienda a ADR-0014 antes de tocar este archivo --
 * no se amplía aquí silenciosamente.
 */
export function resolveContinuationEntry(progress: TopicProgressResponse): ContinuationEntry {
  if (progress.status === 'COMPLETED') return 'completed';
  if (progress.responses.length === 0) return 'resource';
  return 'exercise';
}
