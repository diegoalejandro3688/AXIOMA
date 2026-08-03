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

export const GAMIFICATION_EVENT_KEYS = ['student_response_recorded', 'curriculum_topic_completed'] as const;

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

export const gamificationEventPayloadSchemas: Record<
  GamificationEventKey,
  typeof studentResponseRecordedPayloadSchema | typeof curriculumTopicCompletedPayloadSchema
> = {
  student_response_recorded: studentResponseRecordedPayloadSchema,
  curriculum_topic_completed: curriculumTopicCompletedPayloadSchema,
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
