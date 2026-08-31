import { z } from 'zod';
import { isoDateTime } from './common';

/**
 * Contratos de autoservicio de participación de liga (Bloque IV, Incremento
 * 5, sub-incremento 5.a) -- resuelve el hueco real encontrado en la
 * auditoría previa a Incremento 5: `LeagueEnrollmentService.joinActiveSeason`
 * (Incremento 1) nunca tenía disparador HTTP -- ninguna cuenta real podía
 * inscribirse en una liga. Acción explícita e idempotente de autoservicio,
 * NUNCA conectada a `XpGrantService` ni a ningún otorgamiento automático
 * (decisión del Product Owner, 2026-08-06).
 *
 * `request.accountId` (AuthGuard) es la única fuente de identidad -- ningún
 * cuerpo acepta tier, grupo ni identidad. Ninguna respuesta expone
 * `leagueDefinitionId`/`seasonLeagueParticipationId`/`gameSeasonId`/
 * `leagueGroupId`/`accountId` -- mismo criterio que `competitiveContextSchema`
 * (ADR-0021 §2/§3).
 *
 * COMPETITIVE V1 (parche final de QA) -- la respuesta ENROLLED SÍ incluye
 * `leaguePoints`: el saldo VIVO denormalizado de
 * `season_league_participation.league_points`, no la posición. El motivo:
 * el leaderboard se recalcula solo en :00/:15/:30/:45, así que un usuario
 * recién inscrito o activo veía "Actualizando posición…" sin ningún LP
 * durante hasta ~15 min aunque su saldo ya se hubiese actualizado. La
 * POSICIÓN sigue perteneciendo EXCLUSIVAMENTE a los endpoints competitivos
 * (`/user/public-profile/me/competitive-profile`); este contrato nunca
 * expone rank.
 */

export const leagueParticipationBodySchema = z.object({}).strict();
export type LeagueParticipationBody = z.infer<typeof leagueParticipationBodySchema>;

/**
 * COMPETITIVE V1 -- fechas de la temporada ACTIVE, para que el hub móvil
 * renderice la cuenta regresiva de 7 días sin una segunda llamada. SOLO
 * `startsAt`/`endsAt` (datos de producto) -- NUNCA el `id` de `game_season`
 * ni ningún identificador interno (mismo criterio "sin IDs" que
 * `competitiveContextSchema`, ADR-0021 §2/§3).
 */
export const enrolledSeasonWindowSchema = z.object({
  startsAt: isoDateTime,
  endsAt: isoDateTime,
});
export type EnrolledSeasonWindow = z.infer<typeof enrolledSeasonWindowSchema>;

/** Forma compartida entre GET y POST cuando la cuenta SÍ tiene una participación resuelta. */
export const enrolledLeagueParticipationSchema = z.object({
  outcome: z.literal('ENROLLED'),
  leagueName: z.string(),
  /**
   * COMPETITIVE V1 -- `tierOrder` del tier actual (1 = Bronce … 7 = Gran
   * Maestro). Dato de producto de `league_definition` (nunca un id interno)
   * -- el móvil lo usa para el arte/insignia de liga, SIN inferir la liga
   * del marco equipado (que puede ser de otra liga -- ADR-COSMETICS).
   */
  leagueTier: z.number().int().positive(),
  /**
   * COMPETITIVE V1 -- saldo VIVO de puntos de liga
   * (`season_league_participation.league_points`), entero y no negativo,
   * autoritativo desde el servidor. NO es la posición: el móvil lo muestra
   * al instante mientras la posición del leaderboard "se pone al día" en el
   * siguiente recálculo (:00/:15/:30/:45).
   */
  leaguePoints: z.number().int().nonnegative(),
  joinedAt: isoDateTime,
  /** COMPETITIVE V1 -- ventana de la temporada de esta participación. */
  season: enrolledSeasonWindowSchema,
  // Enum completo de season_league_participation_status (ADR-0020 §4/§7) --
  // una cuenta puede estar ENROLLED con cualquiera de estos cinco valores
  // (p. ej. tras el cierre de una temporada, antes de inscribirse en la
  // siguiente): ACTIVE/SEASON_ENDED (Incremento 1) y PROMOTED/DEMOTED/
  // RETAINED (resultado del cierre de grupo, Incremento 2).
  status: z.enum(['ACTIVE', 'SEASON_ENDED', 'PROMOTED', 'DEMOTED', 'RETAINED']),
});
export type EnrolledLeagueParticipation = z.infer<typeof enrolledLeagueParticipationSchema>;

/**
 * GET -- lectura pura, NUNCA crea participación. Tres outcomes: `ENROLLED`
 * (ya inscrita), `NOT_ENROLLED` (hay temporada activa, la cuenta todavía no
 * participa -- el hub muestra "Unirme a la liga" únicamente en este caso),
 * `NO_ACTIVE_SEASON` (nada que unirse todavía).
 */
export const getLeagueParticipationResponseSchema = z.discriminatedUnion('outcome', [
  enrolledLeagueParticipationSchema,
  z.object({ outcome: z.literal('NOT_ENROLLED') }),
  z.object({ outcome: z.literal('NO_ACTIVE_SEASON') }),
]);
export type GetLeagueParticipationResponse = z.infer<typeof getLeagueParticipationResponseSchema>;

/**
 * POST -- acción idempotente. Devuelve la participación existente o recién
 * creada (`ENROLLED`) -- el mismo cuerpo tanto si esta llamada creó la fila
 * como si ya existía, mismo criterio "200 uniforme" que Pregunta rápida
 * (4.c). Sin temporada activa: `NO_ACTIVE_SEASON`, outcome de dominio,
 * NUNCA un error genérico.
 */
export const postLeagueParticipationResponseSchema = z.discriminatedUnion('outcome', [
  enrolledLeagueParticipationSchema,
  z.object({ outcome: z.literal('NO_ACTIVE_SEASON') }),
]);
export type PostLeagueParticipationResponse = z.infer<typeof postLeagueParticipationResponseSchema>;

// --- GET /gamification/me/league/history -- LEF Bloque V, Incremento 4 ("Historial competitivo cross-temporada", docs/adr/LEF-BLOCK-V-DEFINITION.md §12) ---

/**
 * Una temporada YA FINALIZADA en la que la cuenta participó. PRIVADO
 * exclusivamente (`/gamification/me/league/history`) -- NUNCA se expone en
 * `competitive-profile`/`leaderboard` (decisión del Product Owner,
 * LEF-BLOCK-V-DEFINITION.md §4.5: el historial cross-temporada es privado
 * sin excepción).
 *
 * `finalRank`/`metricValue`/`outcome` provienen de `leaderboard_snapshot_entry`
 * -- la instantánea INMUTABLE congelada al cerrar el grupo (ADR-0020 §5),
 * nunca recalculada con reglas vigentes. Sin
 * `seasonLeagueParticipationId`/`gameSeasonId`/`leagueDefinitionId`/
 * `leagueGroupId`/`accountId` -- mismo criterio "sin IDs internos" que
 * `competitiveContextSchema` (ADR-0021 §2/§3), aunque esta superficie sea
 * privada: no hay necesidad de exponerlos para el propósito de este
 * contrato.
 */
export const seasonHistoryEntrySchema = z.object({
  seasonKey: z.string(),
  seasonName: z.string(),
  seasonStartsAt: isoDateTime,
  seasonEndsAt: isoDateTime,
  leagueKey: z.string(),
  leagueName: z.string(),
  finalRank: z.number().int().positive(),
  metricValue: z.number().int(),
  outcome: z.enum(['PROMOTED', 'DEMOTED', 'RETAINED']),
  finalizedAt: isoDateTime,
});
export type SeasonHistoryEntry = z.infer<typeof seasonHistoryEntrySchema>;

/** Orden: temporada más reciente primero (`seasonStartsAt` descendente) -- estable y determinista, nunca por orden de inserción. Cuenta sin historial -> `seasons: []`, nunca un error. */
export const competitiveHistoryResponseSchema = z.object({
  seasons: z.array(seasonHistoryEntrySchema),
});
export type CompetitiveHistoryResponse = z.infer<typeof competitiveHistoryResponseSchema>;
