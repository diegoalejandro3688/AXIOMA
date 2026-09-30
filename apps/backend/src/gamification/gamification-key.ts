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

/**
 * VC4 MICROBLOQUE 12 -- Gamification Secret Exposure Continuity.
 *
 * `secrets` es SIEMPRE `[current]` o `[current, previous]` (ver
 * `secretCandidatesFor` más abajo) -- NUNCA un arreglo arbitrario. Aplica la
 * MISMA fórmula `buildActivityDedupKeyV2` una vez por secreto candidato,
 * de-duplicando el resultado (si `current === previous`, produce un único
 * candidato, nunca dos idénticos). El PRIMER elemento de `secrets` es
 * SIEMPRE el secreto CANÓNICO/actual -- el llamador usa
 * `candidates[0]` (o mejor, `buildActivityDedupKeyV2` directo con el
 * secreto actual) para decidir qué persistir en una escritura NUEVA; esta
 * función es EXCLUSIVAMENTE para el lado de LECTURA/deduplicación
 * ("¿ya existe esta actividad, bajo cualquier secreto válido hoy?").
 *
 * Para `student_response_recorded`/`quick_question_answered` (que nunca
 * embebieron accountId) cada candidato produce la MISMA clave sin importar
 * el secreto (la función ni siquiera invoca `getSecret()` para esos dos
 * tipos, ver `buildActivityDedupKeyV2`) -- el de-duplicado por `Set` colapsa
 * esto a un único candidato automáticamente, sin necesitar una rama
 * especial aquí.
 */
export function buildActivityDedupKeyV2Candidates(
  eventKey: GamificationEventKey,
  accountId: string,
  secrets: readonly string[],
  payload: Record<string, unknown>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const secret of secrets) {
    const key = buildActivityDedupKeyV2(eventKey, accountId, () => secret, payload);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/**
 * VC4 MICROBLOQUE 12 -- resolución CENTRALIZADA de qué secretos participan
 * en una búsqueda de continuidad, usada por TODO llamador de
 * `buildActivityDedupKeyV2Candidates` (nunca reimplementada por separado en
 * cada servicio -- ver §12 del bloque). Reglas congeladas:
 *   - `previous` ausente/vacío -> `[current]` (comportamiento EXISTENTE sin
 *     cambios, cero candidatos extra);
 *   - `previous === current` -> `[current]` (de-duplicado explícito, nunca
 *     dos búsquedas idénticas ni una falsa sensación de "dos secretos
 *     activos" cuando en realidad hay uno solo);
 *   - en cualquier otro caso -> `[current, previous]`, SIEMPRE con
 *     `current` primero (el orden importa para el llamador: el primer
 *     elemento es el que se usa para escrituras NUEVAS).
 *
 * `current` es SIEMPRE requerido (el llamador ya lo resolvió de forma
 * fail-closed antes de llegar aquí -- esta función nunca decide qué hacer
 * si falta, solo compone la lista de candidatos de LECTURA).
 */
export function secretCandidatesFor(current: string, previous: string | null | undefined): string[] {
  if (!previous || previous === current) return [current];
  return [current, previous];
}

/**
 * WEB-0D.1C-B4 -- las mismas dos formas de arriba (`buildLegacyActivityDedupKey`/
 * `buildActivityDedupKeyV2`), pero reconstruidas desde una fila YA
 * PERSISTIDA (`activityType` + `deduplicationKey` existente) en vez de
 * desde el payload original del evento -- necesario porque B4 pseudonimiza
 * filas históricas, mucho después de que el evento original desapareció.
 * Solo los 3 `activityType` de abajo alguna vez embebieron `accountId`
 * crudo (mismo conjunto exacto que `buildLegacyActivityDedupKey`, ver
 * arriba) -- `RESPUESTA_VALIDADA`/`QUICK_QUESTION_ANSWERED` NUNCA lo
 * embebieron y quedan fuera de este mapa a propósito.
 */
export type LegacyEmbeddingActivityType = 'TEMA_COMPLETADO' | 'ENSAYO_COMPLETADO' | 'RECURSO_COMPLETADO';

const ACTIVITY_LEGACY_PREFIX: Record<LegacyEmbeddingActivityType, string> = {
  TEMA_COMPLETADO: 'topic-completed',
  ENSAYO_COMPLETADO: 'ensayo-completado',
  RECURSO_COMPLETADO: 'resource-completed',
};

export function isLegacyEmbeddingActivityType(activityType: string): activityType is LegacyEmbeddingActivityType {
  return Object.prototype.hasOwnProperty.call(ACTIVITY_LEGACY_PREFIX, activityType);
}

/** Prefijo `{tipo-legacy}:{accountId}:` -- todo lo que sigue es el businessKey (curriculumTopicId/examId/learningResourceId), aislado de forma segura porque accountId (UUID) nunca contiene ':'. */
export function activityLegacyKeyPrefix(activityType: LegacyEmbeddingActivityType, accountId: string): string {
  return `${ACTIVITY_LEGACY_PREFIX[activityType]}:${accountId}:`;
}

/** Forma V2 reconstruida desde una fila persistida -- idéntica en forma a `buildActivityDedupKeyV2`. */
export function buildActivityDedupKeyV2FromRow(activityType: LegacyEmbeddingActivityType, accountId: string, secret: string, businessKey: string): string {
  return `${ACTIVITY_LEGACY_PREFIX[activityType]}:v2:${gamificationActorRef(accountId, secret)}:${businessKey}`;
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

/**
 * VC4 MICROBLOQUE 12.1 -- mismo criterio EXACTO que
 * `buildActivityDedupKeyV2Candidates` (ver su docstring completa arriba),
 * aplicado a `RewardGrant.sourceEntityId` (LEVEL/STUDY_SUBJECT) en vez de
 * `ValidatedGamificationActivity.deduplicationKey`. `secrets` es SIEMPRE
 * `secretCandidatesFor(current, previous)` -- current primero, de-duplicado
 * si coincide con previous. EXCLUSIVAMENTE para el lado de LECTURA/
 * deduplicación ("¿ya existe este RewardGrant bajo cualquier secreto válido
 * hoy?") -- una escritura NUEVA sigue usando únicamente
 * `buildRewardSourceIdV2(accountId, secrets[0], businessKey)` (secreto
 * actual).
 */
export function buildRewardSourceIdV2Candidates(accountId: string, secrets: readonly string[], businessKey: string | number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const secret of secrets) {
    const id = buildRewardSourceIdV2(accountId, secret, businessKey);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
