import { z } from 'zod';

/**
 * Gramática mínima de `achievement_version.unlockRule` -- Bloque III,
 * sub-incremento 2.b. Aprobada explícitamente por el Product Owner
 * (2026-08-04), limitada a UN solo `type`: sin operadores, sin reglas
 * compuestas, sin racha/nivel/materias, sin DSL general. Añadir un
 * segundo `type` es una decisión de un incremento posterior, no de 2.b.
 *
 * `schemaVersion` versiona la GRAMÁTICA TÉCNICA (la forma del JSON), nunca
 * el criterio de negocio -- eso lo versiona `achievement_version.versionLabel`
 * (la fila completa). Cambiar el umbral exige una `achievement_version`
 * nueva, nunca editar el `unlockRule` de una fila existente (`achievement_version`
 * es inmutable tras crearse, ver `AchievementVersionRepository`).
 *
 * Mismo esquema Zod se usa al crear (`AchievementVersionRepository.create`)
 * y al evaluar (`RewardEvaluationWorker`) -- una sola fuente de verdad
 * para la forma de la regla.
 */
export const XpThresholdUnlockRuleSchema = z.object({
  schemaVersion: z.literal('v1'),
  type: z.literal('XP_THRESHOLD'),
  value: z.number().int().positive(),
});

export type XpThresholdUnlockRule = z.infer<typeof XpThresholdUnlockRuleSchema>;

/** Forma canónica: orden de claves fijo -- el mismo criterio lógico siempre produce el mismo texto exacto. */
export function serializeUnlockRule(rule: XpThresholdUnlockRule): string {
  return JSON.stringify({ schemaVersion: rule.schemaVersion, type: rule.type, value: rule.value });
}

/** Lanza (ZodError o SyntaxError) si `raw` no es JSON válido o no cumple la gramática -- sin captura aquí, el llamador decide cómo aislar el fallo. */
export function parseUnlockRule(raw: string): XpThresholdUnlockRule {
  return XpThresholdUnlockRuleSchema.parse(JSON.parse(raw));
}
