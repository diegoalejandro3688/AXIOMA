import { LEAGUE_V1_SEASON_DURATION_DAYS } from './cosmetics-v1-catalog';

/**
 * COMPETITIVE V1 -- configuración PRODUCTIVA de la experiencia de liga,
 * decisiones cerradas por Product/TPM. Fuente de verdad versionada (mismo
 * criterio que `cosmetics-v1-catalog.ts` / `challenges-v1-catalog.ts`) para
 * los scripts idempotentes `competitive:seed-v1` (reglas de League Points) y
 * `competitive:ensure-first-season` (una temporada real de 7 días para QA).
 *
 * NO crea entidades nuevas, NO añade endpoints, NO añade schedulers. Reutiliza
 * `LeaguePointRule` + `GameSeason` + `SeasonTransitionService`, ya existentes.
 */

export { LEAGUE_V1_SEASON_DURATION_DAYS };

/**
 * ECONOMÍA DE LEAGUE POINTS V1 (decisión Product/TPM).
 *
 *   RESPUESTA_VALIDADA      +1 LP   (cada respuesta de Estudio validada)
 *   QUICK_QUESTION_ANSWERED +2 LP   (cada Pregunta rápida respondida)
 *   TEMA_COMPLETADO         +5 LP   (cada recurso/tema completado)
 *
 * SIN tope diario en V1 (`dailyCap = null` -- representación del modelo para
 * "sin límite"). SIN LP negativos: nunca se descuenta por respuesta
 * incorrecta -- `RESPUESTA_VALIDADA` es una *actividad validada*, no
 * "respuesta correcta" (misma semántica que ya usa `XpGrantService`).
 *
 * `activityType` DEBE ser uno de los ya emitidos por
 * `GamificationService.activityTypeFor` -- este catálogo nunca introduce un
 * tipo nuevo.
 */
export const LEAGUE_POINT_RULES_V1: ReadonlyArray<{
  activityType: 'RESPUESTA_VALIDADA' | 'QUICK_QUESTION_ANSWERED' | 'TEMA_COMPLETADO';
  basePoints: number;
  dailyCap: null;
  ruleVersion: string;
}> = [
  { activityType: 'RESPUESTA_VALIDADA', basePoints: 1, dailyCap: null, ruleVersion: 'v1' },
  { activityType: 'QUICK_QUESTION_ANSWERED', basePoints: 2, dailyCap: null, ruleVersion: 'v1' },
  { activityType: 'TEMA_COMPLETADO', basePoints: 5, dailyCap: null, ruleVersion: 'v1' },
];

/**
 * `effectiveFrom` fijo y muy anterior a cualquier actividad real -- una
 * regla V1 aplica desde siempre (no hay una "regla previa" que suceda). Fecha
 * estable (no `new Date()`) para que el seed sea 100% determinista entre
 * corridas.
 */
export const LEAGUE_POINT_RULE_V1_EFFECTIVE_FROM = new Date('2026-01-01T00:00:00.000Z');

/** Prefijo del `seasonKey` de la primera temporada de QA -- se completa con la fecha de inicio (`comp-v1-2026-08-31`). */
export const COMPETITIVE_V1_SEASON_KEY_PREFIX = 'comp-v1';
export const COMPETITIVE_V1_SEASON_NAME = 'Temporada 1';
