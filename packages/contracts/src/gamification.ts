import { z } from 'zod';
import { entityId, isoDateTime } from './common';

/**
 * Contratos de los eventos que GAMIFICATION consume del Outbox de
 * plataforma -- ver docs/adr/0016-gamificacion-fundacion.md y
 * docs/adr/0017-entrega-multiconsumidor-outbox.md.
 *
 * GAMIFICATION no produce estos eventos: PROGRESS los publica. `.strict()`
 * en cada payload es el mismo principio de payload mínimo que ANALYTICS
 * (ADR-0006) -- cualquier propiedad no declarada hace fallar la validación
 * en vez de colarse silenciosamente.
 */

export const GAMIFICATION_EVENT_KEYS = [
  'student_response_recorded',
  'curriculum_topic_completed',
  'quick_question_answered',
  'exam_completed',
  'resource_completed',
] as const;

export type GamificationEventKey = (typeof GAMIFICATION_EVENT_KEYS)[number];

/** Versión de esquema única hoy -- se incrementa si algún payload cambia de forma incompatible. */
export const GAMIFICATION_SCHEMA_VERSION = 'v1' as const;

/**
 * Publicado por PROGRESS únicamente al CREAR un StudentResponse por primera
 * vez -- nunca en el camino de replay (mismo operationId), ni en el de
 * idempotencia de negocio (misma alternativa ya registrada), ni en el de
 * conflicto (409). `studentResponseId` es la clave del hecho académico
 * estable -- base de la deduplicación de negocio de GAMIFICATION,
 * independiente de la idempotencia de transporte del Outbox.
 */
export const studentResponseRecordedPayloadSchema = z
  .object({
    accountId: entityId,
    studentResponseId: entityId,
    questionVersionId: entityId,
    curriculumTopicId: entityId,
    isCorrect: z.boolean(),
    respondedAt: isoDateTime,
  })
  .strict();

export type StudentResponseRecordedPayload = z.infer<typeof studentResponseRecordedPayloadSchema>;

/**
 * Publicado por PROGRESS únicamente en la llamada que transiciona
 * CurriculumTopicProgress.status a COMPLETED por primera vez -- nunca en
 * llamadas posteriores mientras el tema ya estaba COMPLETED. Sin un
 * identificador propio de "transición" en el modelo actual -- la
 * deduplicación de negocio de GAMIFICATION usa (accountId, curriculumTopicId).
 */
export const curriculumTopicCompletedPayloadSchema = z
  .object({
    accountId: entityId,
    curriculumTopicId: entityId,
    completedAt: isoDateTime,
  })
  .strict();

export type CurriculumTopicCompletedPayload = z.infer<typeof curriculumTopicCompletedPayloadSchema>;

/**
 * Publicado por GAMIFICATION (QuickQuestionService, Bloque IV Incremento 4)
 * únicamente al CREAR un QuickQuestionAttempt por primera vez -- nunca en
 * el camino de replay (mismo operationId) ni en el de conflicto (sin
 * pregunta pendiente, sesión cerrada). Mismo criterio que
 * `studentResponseRecordedPayloadSchema`: `quickQuestionAttemptId` es la
 * clave del hecho estable, base de la deduplicación de negocio -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.3. Publicación BEST-EFFORT,
 * post-commit (ADR-0006, §"Publicación best-effort") -- nunca dentro de la
 * transacción que crea el intento.
 */
export const quickQuestionAnsweredPayloadSchema = z
  .object({
    accountId: entityId,
    quickQuestionAttemptId: entityId,
    quickQuestionSessionId: entityId,
    questionVersionId: entityId,
    isCorrect: z.boolean(),
  })
  .strict();

export type QuickQuestionAnsweredPayload = z.infer<typeof quickQuestionAnsweredPayloadSchema>;

/**
 * XP-V1B -- publicado por EXAMS únicamente cuando `submitAttempt` transiciona
 * un `ExamAttempt` de ACTIVE a COMPLETED por primera vez (nunca en una
 * relectura de un intento ya COMPLETED, nunca en EXPIRED). La identidad
 * estable para deduplicación de negocio de GAMIFICATION es (accountId,
 * examId) -- NO examAttemptId -- porque la recompensa de XP es única por
 * cuenta+Ensayo canónico, no por intento; un reintento del mismo Ensayo
 * nunca debe producir una segunda actividad validada. `examAttemptId` viaja
 * solo para trazabilidad.
 */
export const examCompletedPayloadSchema = z
  .object({
    accountId: entityId,
    examAttemptId: entityId,
    examId: entityId,
    completedAt: isoDateTime,
  })
  .strict();

export type ExamCompletedPayload = z.infer<typeof examCompletedPayloadSchema>;

/**
 * XP-V1B-2 -- publicado por PROGRESS/EDUCATION únicamente cuando
 * `EducationService.completeResource` crea la fila de
 * `learning_resource_progress` por primera vez (nunca en una llamada
 * posterior sobre un recurso ya completado). Identidad estable de
 * deduplicación de negocio = (accountId, learningResourceId) -- la identidad
 * CANÓNICA del recurso, nunca su versión editorial -- un nuevo
 * `LearningResourceVersion` del mismo recurso nunca reabre elegibilidad.
 */
export const resourceCompletedPayloadSchema = z
  .object({
    accountId: entityId,
    learningResourceProgressId: entityId,
    learningResourceId: entityId,
    completedAt: isoDateTime,
  })
  .strict();

export type ResourceCompletedPayload = z.infer<typeof resourceCompletedPayloadSchema>;

export const gamificationEventPayloadSchemas: Record<
  GamificationEventKey,
  | typeof studentResponseRecordedPayloadSchema
  | typeof curriculumTopicCompletedPayloadSchema
  | typeof quickQuestionAnsweredPayloadSchema
  | typeof examCompletedPayloadSchema
  | typeof resourceCompletedPayloadSchema
> = {
  student_response_recorded: studentResponseRecordedPayloadSchema,
  curriculum_topic_completed: curriculumTopicCompletedPayloadSchema,
  quick_question_answered: quickQuestionAnsweredPayloadSchema,
  exam_completed: examCompletedPayloadSchema,
  resource_completed: resourceCompletedPayloadSchema,
};

/**
 * Contratos de autoservicio del incremento "Progresión visible" (Bloque
 * II, Learning Experience Foundation) -- ver
 * docs/adr/BLOCK-II-DEFINITION.md. Todos sirven `request.accountId`
 * (AuthGuard), nunca un id recibido del cliente -- mismo criterio que
 * PROGRESS (ADR-0014).
 */

// --- GET /gamification/me/level ---

export const levelSummarySchema = z.object({
  levelNumber: z.number().int().positive(),
  levelName: z.string().nullable(),
  minimumLifetimeXp: z.number().int().nonnegative(),
});
export type LevelSummary = z.infer<typeof levelSummarySchema>;

export const levelProgressResponseSchema = z.object({
  lifetimeXp: z.number().int().nonnegative(),
  currentLevel: levelSummarySchema,
  nextLevel: levelSummarySchema.nullable(),
  xpIntoLevel: z.number().int().nonnegative(),
  xpForNextLevel: z.number().int().nonnegative().nullable(),
  progressRatio: z.number().min(0).max(1),
});
export type LevelProgressResponse = z.infer<typeof levelProgressResponseSchema>;

// --- GET /gamification/me/streak ---

/**
 * Deliberadamente sin persistencia propia (`streak_definition`/
 * `account_streak`) -- se deriva de `xp_ledger_entry` en tiempo de lectura.
 * `lastActiveLocalDate` usa el mismo criterio de día calendario UTC que
 * `daily_cap` (ver streak-calculator.ts), no zona horaria del estudiante.
 */
export const streakResponseSchema = z.object({
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  lastActiveLocalDate: z.string().nullable(),
});
export type StreakResponse = z.infer<typeof streakResponseSchema>;

// --- GET /gamification/me/xp-history ---

export const xpHistoryEntrySchema = z.object({
  id: entityId,
  entryType: z.enum(['OTORGAMIENTO', 'BONO', 'REVERSO', 'AJUSTE']),
  xpAmount: z.number().int(),
  reasonCode: z.string().nullable(),
  occurredAt: isoDateTime,
});
export type XpHistoryEntry = z.infer<typeof xpHistoryEntrySchema>;

/** `nextCursor`: pasar como `?before=` en la siguiente página; `null` significa que no hay más páginas. */
export const xpHistoryResponseSchema = z.object({
  entries: z.array(xpHistoryEntrySchema),
  nextCursor: z.string().nullable(),
});
export type XpHistoryResponse = z.infer<typeof xpHistoryResponseSchema>;

/**
 * Contratos de autoservicio del Incremento 4 (Desafíos), sub-incremento
 * 4.c ("Reclamación") -- ver docs/adr/BLOCK-III-DEFINITION.md §4.16/§4.17.
 * `GET /gamification/me/challenges` y `POST
 * /gamification/me/challenges/:accountChallengeId/claim` operan sobre
 * `request.accountId` (AuthGuard), nunca un id de cuenta recibido del
 * cliente -- mismo criterio que el resto de `/gamification/me/*`.
 */
export const challengeSummarySchema = z.object({
  id: entityId,
  challengeKey: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  challengeType: z.enum(['DAILY', 'WEEKLY']),
  targetValue: z.number().int().positive(),
  progressValue: z.number().int().nonnegative(),
  challengeStatus: z.enum(['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CLAIMED']),
  /**
   * DESAFÍOS V1 §20 -- vista previa del bono de XP que entrega el desafío al
   * reclamarlo (10 / 20 / 30 / 100 para el contenido V1). `null` si la
   * definición no tiene bundle de recompensa o no entrega XP. Derivado por
   * el backend de los componentes `XP_BONUS` del bundle -- no expone el
   * bundle interno. Los desafíos V1 nunca recompensan COSMETIC/TITLE/LP.
   */
  rewardXpBonus: z.number().int().positive().nullable(),
  periodStart: isoDateTime,
  periodEnd: isoDateTime,
  acceptedAt: isoDateTime,
  completedAt: isoDateTime.nullable(),
  claimedAt: isoDateTime.nullable(),
});
export type ChallengeSummary = z.infer<typeof challengeSummarySchema>;

// --- GET /gamification/me/challenges ---

export const listChallengesResponseSchema = z.object({
  challenges: z.array(challengeSummarySchema),
});
export type ListChallengesResponse = z.infer<typeof listChallengesResponseSchema>;

// --- POST /gamification/me/challenges/:accountChallengeId/claim ---

/**
 * Devuelve el mismo `challengeSummarySchema` reflejando el estado tras el
 * intento de reclamación -- `challengeStatus == 'CLAIMED'` si la entrega
 * se confirmó por completo; si un componente de la recompensa falló, el
 * endpoint responde 503 (reintentable) y `account_challenge` conserva
 * `COMPLETED` -- nunca se expone un estado intermedio como si fuera éxito.
 */
export const claimChallengeResponseSchema = challengeSummarySchema;
export type ClaimChallengeResponse = z.infer<typeof claimChallengeResponseSchema>;
