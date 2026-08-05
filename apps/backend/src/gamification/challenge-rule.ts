import { z } from 'zod';

/**
 * Gramáticas mínimas de `challenge_definition.completion_rule`/
 * `eligibility_rule` -- Bloque III, sub-incremento 4.b (BLOCK-III-DEFINITION.md
 * §4.16(b)/(c)). Mismo criterio que `achievement-unlock-rule.ts` (2.b): un
 * único `type` soportado por campo, sin operadores ni reglas compuestas.
 * Añadir un segundo `type` es una decisión de un sub-incremento posterior.
 *
 * `eligibility_rule` NO se ignora (corrección §4.16(c) sobre una propuesta
 * previa) -- se parsea y valida con la misma disciplina que `completion_rule`,
 * aunque hoy solo exista un valor posible (`ALL_ACCOUNTS`, sin segmentación).
 * Una regla no reconocida o malformada en cualquiera de los dos campos es un
 * error de configuración de ESA definición -- el worker la aísla y continúa
 * con las demás, nunca asume "sin filtro" por default silencioso.
 */
export const CumulativeCountCompletionRuleSchema = z.object({
  schemaVersion: z.literal('v1'),
  type: z.literal('CUMULATIVE_COUNT'),
  targetValue: z.number().int().positive(),
});

export type CumulativeCountCompletionRule = z.infer<typeof CumulativeCountCompletionRuleSchema>;

/** Lanza (ZodError o SyntaxError) si `raw` no es JSON válido o no cumple la gramática. */
export function parseCompletionRule(raw: string): CumulativeCountCompletionRule {
  return CumulativeCountCompletionRuleSchema.parse(JSON.parse(raw));
}

export const AllAccountsEligibilityRuleSchema = z.object({
  schemaVersion: z.literal('v1'),
  type: z.literal('ALL_ACCOUNTS'),
});

export type AllAccountsEligibilityRule = z.infer<typeof AllAccountsEligibilityRuleSchema>;

/** Lanza (ZodError o SyntaxError) si `raw` no es JSON válido o no cumple la gramática. */
export function parseEligibilityRule(raw: string): AllAccountsEligibilityRule {
  return AllAccountsEligibilityRuleSchema.parse(JSON.parse(raw));
}
