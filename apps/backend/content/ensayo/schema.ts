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

/**
 * ENSAYOS-F2 -- habilidad lectora PAES Competencia Lectora. SOLO clasificación
 * de fuente: NO se materializa como columna en `exam_question` (igual que
 * `axis`/`primarySkill` para M1). Los 65 ítems de Lectora NO se agregan en F2.
 */
export const examReadingSkillSchema = z.enum(['LOCALIZAR', 'INTERPRETAR', 'EVALUAR']);
export type ExamReadingSkill = z.infer<typeof examReadingSkillSchema>;

/**
 * ENSAYO.HISTORIA -- ejes y habilidades PAES Historia y Ciencias Sociales.
 * SOLO clasificación de fuente: NO se materializan como columnas en
 * `exam_question` (igual que axis/primarySkill en M1 y readingSkill en
 * Lectora).
 */
export const examHistoriaAxisSchema = z.enum([
  'HISTORIA_MUNDO_AMERICA_CHILE',
  'FORMACION_CIUDADANA',
  'SISTEMA_ECONOMICO',
]);
export type ExamHistoriaAxis = z.infer<typeof examHistoriaAxisSchema>;

export const examHistoriaSkillSchema = z.enum([
  'PENSAMIENTO_TEMPORAL_ESPACIAL',
  'ANALISIS_FUENTES',
  'PENSAMIENTO_CRITICO',
]);
export type ExamHistoriaSkill = z.infer<typeof examHistoriaSkillSchema>;

/**
 * ENSAYOS-F2 -- bloque de TABLA estructurada dentro del contenido de un texto
 * fuente. Misma forma que `examTableBlockSchema` de `@axioma/contracts`
 * (headers/rows/footnote). La invariante esencial son filas/columnas
 * estructuradas, nunca Markdown ni imagen.
 */
export const sourceTableBlockSchema = z.object({
  type: z.literal('table'),
  order: z.number().int().nonnegative(),
  headers: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(z.string())).min(1),
  footnote: z.string().min(1).optional(),
});
export type SourceTableBlock = z.infer<typeof sourceTableBlockSchema>;

/** Cada fila de tabla debe tener exactamente `headers.length` celdas; ninguna fila totalmente vacía. */
function refineSourceTables(blocks: Array<{ type: string } & Record<string, unknown>>, ctx: z.RefinementCtx): void {
  blocks.forEach((block, index) => {
    if (block.type !== 'table') return;
    const headers = block.headers as string[];
    const rows = block.rows as string[][];
    rows.forEach((row, rowIndex) => {
      if (row.length !== headers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'rows', rowIndex],
          message: `La fila ${rowIndex} tiene ${row.length} celdas, se esperaban ${headers.length}.`,
        });
      }
      if (row.length > 0 && row.every((cell) => cell.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'rows', rowIndex],
          message: `La fila ${rowIndex} está completamente vacía.`,
        });
      }
    });
  });
}

/** Contenido de un texto/estímulo fuente: heading|paragraph|formula|image|table. Persistido UNA vez como `ExamPassage.content`. */
export const sourcePassageBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  sourceFormulaBlockSchema,
  imageBlockSchema,
  sourceTableBlockSchema,
]);
export const sourcePassageContentSchema = z
  .array(sourcePassageBlockSchema)
  .min(1)
  .superRefine((blocks, ctx) => refineSourceTables(blocks as never, ctx));
export type SourcePassageBlock = z.infer<typeof sourcePassageBlockSchema>;

/** Un texto compartido dentro de un módulo de ensayo (opcional -- M1/M2 no tienen). */
export const examSourcePassageSchema = z.object({
  /** Código estable del texto, ej. "ENSAYO.LECTORA.T1". */
  passageKey: examCodeSchema,
  /** Orden de presentación del texto dentro del ensayo (1-based, contiguo). */
  displayOrder: z.number().int().positive(),
  title: z.string().min(1),
  content: sourcePassageContentSchema,
});
export type ExamSourcePassage = z.infer<typeof examSourcePassageSchema>;

/** Pregunta de familia MATEMÁTica (M1/M2) -- forma EXACTA previa a ENSAYOS-F2. */
export const mathSourceQuestionSchema = z
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
export type MathSourceQuestion = z.infer<typeof mathSourceQuestionSchema>;

/**
 * ENSAYOS-F2 -- pregunta de familia COMPETENCIA LECTORA. Se ancla a un texto
 * compartido vía `passageKey`. La clasificación (`readingSkill`/`difficulty`)
 * es SOLO de fuente. NO se agregan ítems reales de Lectora en F2.
 */
export const lectoraSourceQuestionSchema = z
  .object({
    questionKey: examCodeSchema,
    displayOrder: z.number().int().positive(),
    readingSkill: examReadingSkillSchema,
    difficulty: examDifficultySchema,
    /** `passageKey` de un `examSourcePassageSchema` del mismo módulo. */
    passageKey: examCodeSchema,
    stemContent: sourceStemContentSchema,
    options: z.array(examSourceOptionSchema).length(4),
    explanationContent: sourceExplanationContentSchema,
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: 'Cada pregunta debe tener exactamente una alternativa correcta.',
    path: ['options'],
  });
export type LectoraSourceQuestion = z.infer<typeof lectoraSourceQuestionSchema>;

/**
 * ENSAYO.HISTORIA -- pregunta de familia HISTORIA_CIENCIAS_SOCIALES. Se ancla a
 * un texto/estímulo compartido vía `passageKey`. Clasificación (`axis` / `skill`
 * / `difficulty`) SOLO de fuente. Se distingue de la familia lectora por llevar
 * `axis` + `skill` en vez de `readingSkill`.
 */
export const historiaSourceQuestionSchema = z
  .object({
    questionKey: examCodeSchema,
    displayOrder: z.number().int().positive(),
    axis: examHistoriaAxisSchema,
    skill: examHistoriaSkillSchema,
    difficulty: examDifficultySchema,
    /** `passageKey` de un `examSourcePassageSchema` del mismo módulo. */
    passageKey: examCodeSchema,
    stemContent: sourceStemContentSchema,
    options: z.array(examSourceOptionSchema).length(4),
    explanationContent: sourceExplanationContentSchema,
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: 'Cada pregunta debe tener exactamente una alternativa correcta.',
    path: ['options'],
  });
export type HistoriaSourceQuestion = z.infer<typeof historiaSourceQuestionSchema>;

/** Una pregunta de ensayo: matemática (M1/M2), competencia lectora o historia y ciencias sociales. */
export const examSourceQuestionSchema = z.union([
  mathSourceQuestionSchema,
  lectoraSourceQuestionSchema,
  historiaSourceQuestionSchema,
]);
export type ExamSourceQuestion = z.infer<typeof examSourceQuestionSchema>;

/** `true` si la pregunta fuente es de familia Competencia Lectora (lleva `readingSkill`). */
export function isLectoraSourceQuestion(q: ExamSourceQuestion): q is LectoraSourceQuestion {
  return 'readingSkill' in q && typeof (q as { readingSkill?: unknown }).readingSkill === 'string';
}

/** `true` si la pregunta fuente es de familia Historia y Ciencias Sociales (lleva `axis` + `skill`). */
export function isHistoriaSourceQuestion(q: ExamSourceQuestion): q is HistoriaSourceQuestion {
  return 'skill' in q && typeof (q as { skill?: unknown }).skill === 'string';
}

/** El `passageKey` que referencia una pregunta (Lectora / Historia), o `null` (Matemática). */
export function questionPassageKey(q: ExamSourceQuestion): string | null {
  return 'passageKey' in q && typeof (q as { passageKey?: unknown }).passageKey === 'string'
    ? (q as { passageKey: string }).passageKey
    : null;
}

/**
 * ENSAYOS-F2 -- clasificación de fuente, discriminada por familia de ensayo.
 * SOLO para el importer / gate; nunca produce columnas de BD.
 */
export type ExamSourceClassification =
  | { family: 'MATEMATICA'; axis: ExamAxis; primarySkill: ExamPrimarySkill; difficulty: ExamDifficulty }
  | { family: 'COMPETENCIA_LECTORA'; readingSkill: ExamReadingSkill; difficulty: ExamDifficulty }
  | { family: 'HISTORIA_CIENCIAS_SOCIALES'; axis: ExamHistoriaAxis; skill: ExamHistoriaSkill; difficulty: ExamDifficulty };

export function examClassification(q: ExamSourceQuestion): ExamSourceClassification {
  if (isLectoraSourceQuestion(q)) {
    return { family: 'COMPETENCIA_LECTORA', readingSkill: q.readingSkill, difficulty: q.difficulty };
  }
  if (isHistoriaSourceQuestion(q)) {
    return { family: 'HISTORIA_CIENCIAS_SOCIALES', axis: q.axis, skill: q.skill, difficulty: q.difficulty };
  }
  return { family: 'MATEMATICA', axis: q.axis, primarySkill: q.primarySkill, difficulty: q.difficulty };
}

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
    /**
     * ENSAYOS-F2 -- textos/estímulos compartidos del ensayo. `[]` para M1/M2
     * (default -> los módulos existentes validan sin cambios). Cada pregunta de
     * familia lectora referencia uno por `passageKey`.
     */
    passages: z.array(examSourcePassageSchema).default([]),
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
  )
  .refine(
    (m) => new Set(m.passages.map((p) => p.passageKey)).size === m.passages.length,
    { message: 'passageKey duplicado dentro del ensayo.', path: ['passages'] },
  )
  .refine(
    (m) => {
      const orders = m.passages.map((p) => p.displayOrder).sort((a, b) => a - b);
      return orders.every((o, i) => o === i + 1);
    },
    { message: 'displayOrder de textos debe ser 1..N sin huecos ni duplicados.', path: ['passages'] },
  )
  .refine(
    (m) => {
      const keys = new Set(m.passages.map((p) => p.passageKey));
      return m.questions.every((q) => {
        const key = questionPassageKey(q);
        return key === null || keys.has(key);
      });
    },
    { message: 'Una pregunta referencia un passageKey que no existe en el módulo.', path: ['questions'] },
  );
export type ExamSourceModule = z.infer<typeof examSourceModuleSchema>;
