/**
 * XP-V1B -- configuración canónica de XP Economy V1 (decisión Product/TPM,
 * ver brief XP-V1A/XP-V1B). Fuente ÚNICA de verdad para el futuro
 * provisionador (`xp:seed-v1`) -- ningún otro módulo declara estos valores
 * por su cuenta.
 *
 * Deliberadamente NO incluye Challenges (10/20/30/100 XP_BONUS): esos siguen
 * entregándose por el camino existente de `reward_bundle`/`reward_grant`
 * (ChallengeDefinition), completamente fuera de `xp_rule` -- ver
 * XP-V1A §24/§25. `xp:seed-v1` nunca toca `challenge_definition`.
 *
 * `programKey = 'xp-core'` reutiliza EXACTAMENTE la constante ya existente
 * y en uso en `xp-grant.service.ts` (`PROGRAM_KEY`) -- no se renombra ni se
 * introduce un segundo programa.
 */

export const XP_V1_PROGRAM_KEY = 'xp-core';
export const XP_V1_PROGRAM_NAME = 'Progresión XP';
export const XP_V1_PROGRAM_TYPE = 'XP';
export const XP_V1_VERSION_LABEL = 'v1';

export interface XpV1RuleSpec {
  readonly activityType: string;
  readonly baseXp: number;
}

/**
 * Los 5 orígenes NORMALES aprobados de XP Economy V1. Challenges quedan
 * explícitamente fuera (ver comentario de archivo). Todas:
 *   - `dailyCap = null` (decisión Product: SIN tope diario global)
 *   - `repeatDecayRule = null`, `qualityCondition = null`,
 *     `multiplierPolicy = null` (sin condición de correctness/Premium/racha)
 *   - `status = 'ACTIVE'`
 *   - `effectiveUntil = null`
 *   - `effectiveFrom` = el cutover T explícito que recibe el provisionador
 *     (NUNCA `new Date()`/ahora -- ver `parseAndValidateExplicitUtcCutover`
 *     en `scripts/seed-xp-v1.ts`).
 */
export const XP_V1_RULES: readonly XpV1RuleSpec[] = [
  { activityType: 'RESPUESTA_VALIDADA', baseXp: 2 },
  { activityType: 'QUICK_QUESTION_ANSWERED', baseXp: 2 },
  { activityType: 'RECURSO_COMPLETADO', baseXp: 20 },
  { activityType: 'TEMA_COMPLETADO', baseXp: 20 },
  { activityType: 'ENSAYO_COMPLETADO', baseXp: 100 },
];
