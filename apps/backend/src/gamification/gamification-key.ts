import type { GamificationEventKey } from '@axioma/contracts';
import { gamificationActorRef } from './gamification-actor-ref';

/**
 * WEB-0D.1C-B2 -- construcción CENTRALIZADA de las claves persistidas de
 * GAMIFICATION que antes embebían `accountId` crudo como texto literal.
 * Antes de este bloque, `deduplicationKeyFor` (gamification.service.ts) y
 * los `sourceEntityId` de LEVEL/STUDY_SUBJECT/TITLE_UNLOCK
 * (reward-evaluation.worker.ts) construían el string inline, cada uno con
 * su propio template -- centralizado aquí ÚNICAMENTE porque B2 necesita
 * la MISMA construcción en dos formas (v2 nueva + legacy transitoria para
 * lookup de compatibilidad) en más de un llamador, y duplicar esa lógica
 * en cada sitio sería el riesgo real de migración que este bloque busca
 * evitar (un llamador actualizado a v2 y otro olvidado).
 *
 * `v2:{actorRef}:...` es DELIBERADAMENTE distinguible de la forma legacy
 * (que nunca tiene el marcador `v2:` ni un ref de 64 hex chars en esa
 * posición) -- nunca hay ambigüedad entre ambas.
 */

// ============================================================================
// ValidatedGamificationActivity.deduplicationKey
// ============================================================================

/**
 * Forma LEGACY -- SOLO para lookup de compatibilidad transitoria (§8 de la
 * tarea). NUNCA se persiste de nuevo tras B2; los tres tipos de evento de
 * abajo son los ÚNICOS que alguna vez embebieron `accountId` crudo aquí.
 * `student_response_recorded`/`quick_question_answered` nunca lo
 * embebieron -- se omiten deliberadamente (no tienen forma "legacy"
 * distinta de su forma actual, ver `buildActivityDedupKeyV2`).
 */
export function buildLegacyActivityDedupKey(eventKey: GamificationEventKey, payload: Record<string, unknown>): string | null {
  switch (eventKey) {
    case 'curriculum_topic_completed':
      return `topic-completed:${payload.accountId as string}:${payload.curriculumTopicId as string}`;
    case 'exam_completed':
      return `ensayo-completado:${payload.accountId as string}:${payload.examId as string}`;
    case 'resource_completed':
      return `resource-completed:${payload.accountId as string}:${payload.learningResourceId as string}`;
    default:
      return null;
  }
}

/**
 * Forma V2 -- la ÚNICA que este bloque persiste de aquí en adelante.
 * `student_response_recorded`/`quick_question_answered` mantienen su
 * forma EXACTA sin cambios (nunca embebieron accountId, sin necesidad de
 * marcador de versión ni de secreto).
 */
export function buildActivityDedupKeyV2(
  eventKey: GamificationEventKey,
  accountId: string,
  getSecret: () => string,
  payload: Record<string, unknown>,
): string {
  switch (eventKey) {
    case 'student_response_recorded':
      return `response:${payload.studentResponseId as string}`;
    case 'quick_question_answered':
      return `quick-question:${payload.quickQuestionAttemptId as string}`;
    case 'curriculum_topic_completed':
      return `topic-completed:v2:${gamificationActorRef(accountId, getSecret())}:${payload.curriculumTopicId as string}`;
    case 'exam_completed':
      return `ensayo-completado:v2:${gamificationActorRef(accountId, getSecret())}:${payload.examId as string}`;
    case 'resource_completed':
      return `resource-completed:v2:${gamificationActorRef(accountId, getSecret())}:${payload.learningResourceId as string}`;
  }
}

// ============================================================================
// RewardGrant.sourceEntityId / AccountTitle.acquisitionSourceId
// (LEVEL, STUDY_SUBJECT, TITLE_UNLOCK -- los únicos tres que embebían
// accountId crudo; ACHIEVEMENT_UNLOCK/CHALLENGE_CLAIM/LEAGUE ya usan un id
// de fila opaco (UUID) y quedan fuera de alcance de B2, sin cambios).
// ============================================================================

export type PseudonymousRewardSourceKind = 'LEVEL' | 'STUDY_SUBJECT' | 'TITLE_UNLOCK';

/** Forma LEGACY -- SOLO para lookup de compatibilidad transitoria. */
export function buildLegacyRewardSourceId(accountId: string, businessKey: string | number): string {
  return `${accountId}:${businessKey}`;
}

/** Forma V2 -- la ÚNICA que este bloque persiste de aquí en adelante. */
export function buildRewardSourceIdV2(accountId: string, secret: string, businessKey: string | number): string {
  return `v2:${gamificationActorRef(accountId, secret)}:${businessKey}`;
}
