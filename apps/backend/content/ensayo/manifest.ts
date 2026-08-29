// ENSAYOS-M1-A -- Blueprint canónico del banco de Ensayos V1, SIN Postgres.
// Ver docs/adr/0024-ensayos-foundation.md.
//
// DELIBERADAMENTE separado de `content/manifest.ts` (Study): este archivo NO
// se importa desde `CONTENT_MANIFEST` ni desde ningún helper de Study. El
// catálogo Study permanece exactamente 98 Learning Resources / 980 Questions
// sin verse afectado por nada de aquí.
//
// Cada entrada declara las distribuciones ESPERADAS (eje / dificultad /
// habilidad principal) del ensayo. Los totales se derivan por suma y el
// `.refine` exige que cada distribución sume exactamente `expectedQuestionCount`
// -- un blueprint inconsistente consigo mismo falla al cargar, antes de que
// el gate compare nada contra el contenido real.
import { z } from 'zod';
import { examAxisSchema, examDifficultySchema, examPrimarySkillSchema } from './schema';

const axisDistributionSchema = z.object({
  NUMEROS: z.number().int().nonnegative(),
  ALGEBRA_FUNCIONES: z.number().int().nonnegative(),
  GEOMETRIA: z.number().int().nonnegative(),
  PROBABILIDAD_ESTADISTICA: z.number().int().nonnegative(),
});

const difficultyDistributionSchema = z.object({
  FACIL: z.number().int().nonnegative(),
  MEDIA: z.number().int().nonnegative(),
  DIFICIL: z.number().int().nonnegative(),
});

const primarySkillDistributionSchema = z.object({
  RESOLVER_PROBLEMAS: z.number().int().nonnegative(),
  MODELAR: z.number().int().nonnegative(),
  REPRESENTAR: z.number().int().nonnegative(),
  ARGUMENTAR: z.number().int().nonnegative(),
});

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

export const examBlueprintSchema = z
  .object({
    examKey: z.string().min(1),
    title: z.string().min(1),
    subjectKey: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    expectedQuestionCount: z.number().int().positive(),
    expectedAxis: axisDistributionSchema,
    expectedDifficulty: difficultyDistributionSchema,
    expectedPrimarySkill: primarySkillDistributionSchema,
  })
  .refine((b) => sum(b.expectedAxis) === b.expectedQuestionCount, {
    message: 'expectedAxis debe sumar expectedQuestionCount.',
    path: ['expectedAxis'],
  })
  .refine((b) => sum(b.expectedDifficulty) === b.expectedQuestionCount, {
    message: 'expectedDifficulty debe sumar expectedQuestionCount.',
    path: ['expectedDifficulty'],
  })
  .refine((b) => sum(b.expectedPrimarySkill) === b.expectedQuestionCount, {
    message: 'expectedPrimarySkill debe sumar expectedQuestionCount.',
    path: ['expectedPrimarySkill'],
  });
export type ExamBlueprint = z.infer<typeof examBlueprintSchema>;

/**
 * Blueprint APPROVED del primer Ensayo PAES M1 ZETRYND (ENSAYOS-M1-A §3).
 * Estas distribuciones son la fuente de verdad de los checks del gate; el
 * contenido real (`content/ensayo/m1/ensayo-paes-m1.ts`) debe reproducirlas
 * EXACTAMENTE.
 */
export const ENSAYO_M1_BLUEPRINT: ExamBlueprint = examBlueprintSchema.parse({
  examKey: 'ENSAYO.M1',
  title: 'Ensayo PAES M1',
  subjectKey: 'matematica',
  durationMinutes: 140,
  expectedQuestionCount: 65,
  expectedAxis: { NUMEROS: 15, ALGEBRA_FUNCIONES: 19, GEOMETRIA: 15, PROBABILIDAD_ESTADISTICA: 16 },
  expectedDifficulty: { FACIL: 16, MEDIA: 33, DIFICIL: 16 },
  expectedPrimarySkill: { RESOLVER_PROBLEMAS: 25, MODELAR: 15, REPRESENTAR: 14, ARGUMENTAR: 11 },
});

/**
 * Blueprint DEFINITIVO del Ensayo PAES M2 ZETRYND (handoff "ENSAYOS-M2 —
 * IMPLEMENTACIÓN DEFINITIVA" §7, con la resolución de dificultad de Q10 ->
 * MEDIA). `subjectKey: 'matematica-m2'` -- el `Exam` se asocia a la materia
 * académica "Matemática M2" (M1/M2 SUBJECT TAXONOMY ALIGNMENT), no a
 * `matematica`. Las QuestionVersions del ensayo siguen aisladas bajo el
 * Subject técnico `ensayos` + CurriculumTopic raíz `ENSAYO.M2`.
 */
export const ENSAYO_M2_BLUEPRINT: ExamBlueprint = examBlueprintSchema.parse({
  examKey: 'ENSAYO.M2',
  title: 'Ensayo PAES M2',
  subjectKey: 'matematica-m2',
  durationMinutes: 140,
  expectedQuestionCount: 55,
  expectedAxis: { NUMEROS: 12, ALGEBRA_FUNCIONES: 17, GEOMETRIA: 12, PROBABILIDAD_ESTADISTICA: 14 },
  expectedDifficulty: { FACIL: 9, MEDIA: 27, DIFICIL: 19 },
  expectedPrimarySkill: { RESOLVER_PROBLEMAS: 19, MODELAR: 14, REPRESENTAR: 11, ARGUMENTAR: 11 },
});

/** Todos los ensayos declarados en V1: M1 y M2. */
export const ENSAYO_MANIFEST: ExamBlueprint[] = [ENSAYO_M1_BLUEPRINT, ENSAYO_M2_BLUEPRINT];

export function findExamBlueprint(examKey: string): ExamBlueprint | null {
  return ENSAYO_MANIFEST.find((b) => b.examKey === examKey) ?? null;
}

export const EXAM_AXES = examAxisSchema.options;
export const EXAM_DIFFICULTIES = examDifficultySchema.options;
export const EXAM_PRIMARY_SKILLS = examPrimarySkillSchema.options;
