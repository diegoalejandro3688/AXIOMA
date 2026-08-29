// ENSAYOS-M1-A -- Schema fuente del banco de Ensayos V1 (infraestructura
// estática, SIN Postgres). Ver docs/adr/0024-ensayos-foundation.md.
//
// El banco de Ensayos es SEPARADO del de Study (`ENSAYOS != STUDY BANK`):
// este archivo NO importa ni extiende `content/schema.ts` (Study) ni
// `content/manifest.ts` (Study) -- reutiliza únicamente los bloques base de
// `@axioma/contracts`, exactamente igual que hace `content/schema.ts`, y de
// forma independiente. Un cambio aquí nunca puede alterar la validación del
// contenido de Study.
//
// Un módulo de Ensayo (`content/ensayo/**/*.ts`, uno por archivo) exporta por
// default un objeto que cumple `examSourceModuleSchema`. ENSAYOS-M1-B (fuera
// de alcance de este incremento) será el único código que lea estos módulos
// para transformarlos en filas reales de `exam`/`exam_question` vía la API
// editorial/administrativa -- este archivo NO abre conexión, NO importa nada
// de `src/`.
//
// Igual que en el schema fuente de Study: `formulaBlockSchema` exige
// `{ latex, svg }`, pero en el CONTENIDO FUENTE el `svg` todavía no existe
// (se genera una sola vez al publicar). Por eso `sourceFormulaBlockSchema` es
// `formulaBlockSchema.omit({ svg: true })` -- una composición, no una
// reescritura.
import { z } from 'zod';
import { headingBlockSchema, paragraphBlockSchema, imageBlockSchema, formulaBlockSchema } from '@axioma/contracts';

/** Fórmula en contenido FUENTE: `latex` obligatorio, `svg` ausente -- lo genera ENSAYOS-M1-B al publicar. */
export const sourceFormulaBlockSchema = formulaBlockSchema.omit({ svg: true });
export type SourceFormulaBlock = z.infer<typeof sourceFormulaBlockSchema>;

/** Enunciado: heading|paragraph|formula|image (mismo subconjunto que el enunciado de una pregunta de Study). */
export const sourceStemBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  sourceFormulaBlockSchema,
  imageBlockSchema,
]);
export const sourceStemContentSchema = z.array(sourceStemBlockSchema).min(1);
export type SourceStemBlock = z.infer<typeof sourceStemBlockSchema>;

/** Explicación editorial (visible solo en revisión): paragraph|formula|image, SIN heading -- mismo subconjunto que el contrato real de EDUCATION. */
export const sourceExplanationBlockSchema = z.discriminatedUnion('type', [
  paragraphBlockSchema,
  sourceFormulaBlockSchema,
  imageBlockSchema,
]);
export const sourceExplanationContentSchema = z.array(sourceExplanationBlockSchema).min(1);

/** Contenido de una alternativa: un solo bloque, texto o fórmula -- nunca imagen. */
export const sourceAnswerOptionContentSchema = z.discriminatedUnion('type', [paragraphBlockSchema, sourceFormulaBlockSchema]);

/** Ejes curriculares PAES M1 -- valores normalizados y explícitos (ENSAYOS-M1-A §7). NUNCA se infiere de texto. */
export const examAxisSchema = z.enum(['NUMEROS', 'ALGEBRA_FUNCIONES', 'GEOMETRIA', 'PROBABILIDAD_ESTADISTICA']);
export type ExamAxis = z.infer<typeof examAxisSchema>;

/** Dificultad -- mismo enum que Study, re-declarado aquí para no acoplar los dos bancos. */
export const examDifficultySchema = z.enum(['FACIL', 'MEDIA', 'DIFICIL']);
export type ExamDifficulty = z.infer<typeof examDifficultySchema>;

/** Habilidad principal PAES M1 (ENSAYOS-M1-A §8). */
export const examPrimarySkillSchema = z.enum(['RESOLVER_PROBLEMAS', 'MODELAR', 'REPRESENTAR', 'ARGUMENTAR']);
export type ExamPrimarySkill = z.infer<typeof examPrimarySkillSchema>;

/**
 * Convención de código: mismo criterio DEMRE ya vigente en el repo
 * (segmentos en mayúsculas/dígitos separados por puntos). `ENSAYO.M1`,
 * `ENSAYO.M1.Q1`, ... -- namespace propio, imposible de confundir con
 * `M1.NUMEROS.*` (Study).
 */
const examCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]+(\.[A-Z0-9_]+)+$/, 'Código de ensayo inválido -- se espera convención tipo "ENSAYO.M1.Q1".')
  .refine((code) => code.startsWith('ENSAYO.'), 'Todo código del banco de Ensayos debe vivir bajo el namespace "ENSAYO.".');

export const examSourceOptionSchema = z.object({
  content: sourceAnswerOptionContentSchema,
  correct: z.boolean(),
});
export type ExamSourceOption = z.infer<typeof examSourceOptionSchema>;

export const examSourceQuestionSchema = z
  .object({
    /** Código estable de la pregunta, ej. "ENSAYO.M1.Q1". */
    questionKey: examCodeSchema,
    /** Posición fija en el ensayo (1-based). Sin huecos ni duplicados -- verificado por `examSourceModuleSchema` y por el gate. */
    displayOrder: z.number().int().positive(),
    axis: examAxisSchema,
    difficulty: examDifficultySchema,
    primarySkill: examPrimarySkillSchema,
    stemContent: sourceStemContentSchema,
    /** Exactamente 4 alternativas, exactamente 1 correcta. */
    options: z.array(examSourceOptionSchema).length(4),
    explanationContent: sourceExplanationContentSchema,
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: 'Cada pregunta debe tener exactamente una alternativa correcta.',
    path: ['options'],
  });
export type ExamSourceQuestion = z.infer<typeof examSourceQuestionSchema>;

/**
 * Módulo de Ensayo -- lo que un archivo bajo `content/ensayo/**` exporta por
 * default. `durationMinutes` sigue la convención humana del blueprint (140);
 * ENSAYOS-M1-B lo convertirá a `Exam.durationSeconds` al importar.
 */
export const examSourceModuleSchema = z
  .object({
    /** `Exam.examKey`, ej. "ENSAYO.M1". */
    examKey: examCodeSchema,
    title: z.string().min(1),
    /** `Subject.subjectKey` real, ej. "matematica". */
    subjectKey: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    questions: z.array(examSourceQuestionSchema).min(1),
  })
  .refine(
    (m) => new Set(m.questions.map((q) => q.questionKey)).size === m.questions.length,
    { message: 'questionKey duplicado dentro del ensayo.', path: ['questions'] },
  )
  .refine(
    (m) => {
      const orders = m.questions.map((q) => q.displayOrder).sort((a, b) => a - b);
      return orders.every((o, i) => o === i + 1);
    },
    { message: 'displayOrder debe ser 1..N sin huecos ni duplicados.', path: ['questions'] },
  );
export type ExamSourceModule = z.infer<typeof examSourceModuleSchema>;
