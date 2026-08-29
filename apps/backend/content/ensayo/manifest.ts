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
import { examAxisSchema, examDifficultySchema, examPrimarySkillSchema, examReadingSkillSchema } from './schema';

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

/** Todos los ensayos de familia MATEMATICA declarados en V1: M1 y M2. */
export const ENSAYO_MANIFEST: ExamBlueprint[] = [ENSAYO_M1_BLUEPRINT, ENSAYO_M2_BLUEPRINT];

export function findExamBlueprint(examKey: string): ExamBlueprint | null {
  return ENSAYO_MANIFEST.find((b) => b.examKey === examKey) ?? null;
}

export const EXAM_AXES = examAxisSchema.options;
export const EXAM_DIFFICULTIES = examDifficultySchema.options;
export const EXAM_PRIMARY_SKILLS = examPrimarySkillSchema.options;
export const EXAM_READING_SKILLS = examReadingSkillSchema.options;

// ---------------------------------------------------------------------------
// ENSAYOS-LECTORA -- blueprint de familia COMPETENCIA_LECTORA.
//
// Reutiliza la infraestructura de textos compartidos + tablas de ENSAYOS-F2.
// La clasificacion aqui NO usa ejes/habilidades matematicas: es
// `readingSkill` + `difficulty` (metadata SOLO de source, sin columnas DB,
// igual que axis/difficulty/skill en M1/M2). Ademas declara el mapa
// autoritativo texto -> rango de preguntas, que el gate compara contra el
// contenido real.
// ---------------------------------------------------------------------------
const readingSkillDistributionSchema = z.object({
  LOCALIZAR: z.number().int().nonnegative(),
  INTERPRETAR: z.number().int().nonnegative(),
  EVALUAR: z.number().int().nonnegative(),
});

const passageRangeSchema = z.object({
  passageKey: z.string().min(1),
  title: z.string().min(1),
  firstQuestion: z.number().int().positive(),
  lastQuestion: z.number().int().positive(),
});

export const examReadingBlueprintSchema = z
  .object({
    family: z.literal('COMPETENCIA_LECTORA'),
    examKey: z.string().min(1),
    title: z.string().min(1),
    subjectKey: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    expectedQuestionCount: z.number().int().positive(),
    expectedPassageCount: z.number().int().positive(),
    expectedReadingSkill: readingSkillDistributionSchema,
    expectedDifficulty: difficultyDistributionSchema,
    passageMap: z.array(passageRangeSchema).min(1),
  })
  .refine((b) => sum(b.expectedReadingSkill) === b.expectedQuestionCount, {
    message: 'expectedReadingSkill debe sumar expectedQuestionCount.',
    path: ['expectedReadingSkill'],
  })
  .refine((b) => sum(b.expectedDifficulty) === b.expectedQuestionCount, {
    message: 'expectedDifficulty debe sumar expectedQuestionCount.',
    path: ['expectedDifficulty'],
  })
  .refine((b) => b.passageMap.length === b.expectedPassageCount, {
    message: 'passageMap debe tener expectedPassageCount entradas.',
    path: ['passageMap'],
  })
  .refine(
    (b) => {
      // rangos contiguos que cubren exactamente 1..expectedQuestionCount
      const sorted = [...b.passageMap].sort((x, y) => x.firstQuestion - y.firstQuestion);
      if (sorted[0].firstQuestion !== 1) return false;
      if (sorted[sorted.length - 1].lastQuestion !== b.expectedQuestionCount) return false;
      return sorted.every(
        (r, i) => r.lastQuestion >= r.firstQuestion && (i === 0 || r.firstQuestion === sorted[i - 1].lastQuestion + 1),
      );
    },
    { message: 'passageMap debe cubrir 1..expectedQuestionCount con rangos contiguos.', path: ['passageMap'] },
  );
export type ExamReadingBlueprint = z.infer<typeof examReadingBlueprintSchema>;

/**
 * Blueprint APPROVED del Ensayo PAES Competencia Lectora ZETRYND. Las
 * distribuciones (habilidad lectora / dificultad) y el mapa texto->pregunta
 * son la fuente de verdad de los checks del gate; el contenido real
 * (`content/ensayo/lectora/ensayo-paes-competencia-lectora.ts`) debe
 * reproducirlos EXACTAMENTE. `subjectKey: 'lenguaje'` -- el `Exam` se asocia a
 * la materia academica "Lenguaje"; las QuestionVersions siguen aisladas bajo
 * el Subject tecnico `ensayos` + CurriculumTopic raiz `ENSAYO.LECTORA`.
 */
export const ENSAYO_LECTORA_BLUEPRINT: ExamReadingBlueprint = examReadingBlueprintSchema.parse({
  family: 'COMPETENCIA_LECTORA',
  examKey: 'ENSAYO.LECTORA',
  title: 'Ensayo PAES Competencia Lectora',
  subjectKey: 'lenguaje',
  durationMinutes: 150,
  expectedQuestionCount: 65,
  expectedPassageCount: 10,
  expectedReadingSkill: { LOCALIZAR: 17, INTERPRETAR: 31, EVALUAR: 17 },
  expectedDifficulty: { FACIL: 16, MEDIA: 33, DIFICIL: 16 },
  passageMap: [
    { passageKey: 'ENSAYO.LECTORA.T1', title: 'El banco azul', firstQuestion: 1, lastQuestion: 7 },
    { passageKey: 'ENSAYO.LECTORA.T2', title: 'Más que plantar: diseñar sombra', firstQuestion: 8, lastQuestion: 13 },
    { passageKey: 'ENSAYO.LECTORA.T3', title: 'Quince minutos sin pregunta', firstQuestion: 14, lastQuestion: 20 },
    { passageKey: 'ENSAYO.LECTORA.T4', title: 'Restaurar no es dejar nuevo', firstQuestion: 21, lastQuestion: 27 },
    { passageKey: 'ENSAYO.LECTORA.T5', title: 'El bosque también se escucha de noche', firstQuestion: 28, lastQuestion: 34 },
    { passageKey: 'ENSAYO.LECTORA.T6', title: 'Prohibir todas las notificaciones no resuelve el problema', firstQuestion: 35, lastQuestion: 40 },
    { passageKey: 'ENSAYO.LECTORA.T7', title: 'Leer también lo que un mapa calla', firstQuestion: 41, lastQuestion: 47 },
    { passageKey: 'ENSAYO.LECTORA.T8', title: 'La bandeja vacía', firstQuestion: 48, lastQuestion: 53 },
    { passageKey: 'ENSAYO.LECTORA.T9', title: 'Una biblioteca no cabe en un solo número', firstQuestion: 54, lastQuestion: 59 },
    { passageKey: 'ENSAYO.LECTORA.T10', title: '¿Por qué algunos árboles florecen antes?', firstQuestion: 60, lastQuestion: 65 },
  ],
});

/** Todos los ensayos de familia COMPETENCIA_LECTORA declarados en V1. */
export const ENSAYO_READING_MANIFEST: ExamReadingBlueprint[] = [ENSAYO_LECTORA_BLUEPRINT];

export function findReadingBlueprint(examKey: string): ExamReadingBlueprint | null {
  return ENSAYO_READING_MANIFEST.find((b) => b.examKey === examKey) ?? null;
}

/** Total de modulos de ensayo esperados (todas las familias). */
export const ENSAYO_MODULE_COUNT = ENSAYO_MANIFEST.length + ENSAYO_READING_MANIFEST.length;
