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
 *   QUICK_QUESTION_ANSWERED +2 LP   (cada Pregunta rápida respondida)
 *
 * LP-V1-HOTFIX -- corrección de frontera de producto (LP es MONEDA
 * COMPETITIVA; Estudio nunca debe otorgar LP): `RESPUESTA_VALIDADA` y
 * `TEMA_COMPLETADO` se retiraron de este catálogo. Ambas se emiten
 * EXCLUSIVAMENTE desde `ProgressService` (dominio Estudio -- confirmado por
 * auditoría de código, único emisor de `student_response_recorded`/
 * `curriculum_topic_completed` en todo el repositorio) -- ninguna vía de
 * Competir las produce jamás, así que no existe una "actividad Study" que
 * distinguir de una "actividad Competir" con el mismo `activityType`.
 * `QUICK_QUESTION_ANSWERED` es el único tipo emitido EXCLUSIVAMENTE por
 * `QuickQuestionService` (dominio GAMIFICATION), accesible solo bajo la
 * superficie `/(tabs)/competir/*` en móvil -- confirmado Competir-only.
 *
 * Las 2 reglas históricas (`RESPUESTA_VALIDADA`=+1, `TEMA_COMPLETADO`=+5,
 * `ruleVersion='v1'`) NO se eliminan de la base de datos productiva -- se
 * RETIRAN de forma no destructiva (`effectiveUntil` fijado a un cutoff T
 * explícito) por el script dedicado
 * `scripts/competitive-hotfix-study-lp-boundary-v1.ts`, preservando su fila
 * histórica/auditable y todo LP ya otorgado bajo ellas. Este catálogo es la
 * fuente de verdad para instalaciones NUEVAS/limpias -- `competitive:seed-v1`
 * nunca vuelve a crear las 2 reglas retiradas porque ya no aparecen aquí.
 *
 * SIN tope diario en V1 (`dailyCap = null` -- representación del modelo para
 * "sin límite"). SIN LP negativos: nunca se descuenta por respuesta
 * incorrecta.
 *
 * `activityType` DEBE ser uno de los ya emitidos por
 * `GamificationService.activityTypeFor` -- este catálogo nunca introduce un
 * tipo nuevo.
 */
export const LEAGUE_POINT_RULES_V1: ReadonlyArray<{
  activityType: 'QUICK_QUESTION_ANSWERED';
  basePoints: number;
  dailyCap: null;
  ruleVersion: string;
}> = [{ activityType: 'QUICK_QUESTION_ANSWERED', basePoints: 2, dailyCap: null, ruleVersion: 'v1' }];

/**
 * LP-V1-HOTFIX -- las 2 reglas históricas retiradas por
 * `competitive-hotfix-study-lp-boundary-v1.ts`. Fuente ÚNICA de verdad de
 * SUS valores canónicos originales (usada por el script de remediación para
 * detectar divergencia antes de tocar cualquier fila -- nunca sobrescribe
 * en silencio una regla con un `basePoints`/`ruleVersion` inesperado).
 */
export const LEAGUE_POINT_RULES_V1_STUDY_RETIRED: ReadonlyArray<{
  activityType: 'RESPUESTA_VALIDADA' | 'TEMA_COMPLETADO';
  basePoints: number;
  ruleVersion: string;
}> = [
  { activityType: 'RESPUESTA_VALIDADA', basePoints: 1, ruleVersion: 'v1' },
  { activityType: 'TEMA_COMPLETADO', basePoints: 5, ruleVersion: 'v1' },
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
