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
import {
  examAxisSchema,
  examDifficultySchema,
  examPrimarySkillSchema,
  examReadingSkillSchema,
  examHistoriaAxisSchema,
  examHistoriaSkillSchema,
  examCienciasDisciplineSchema,
  examCienciasModuleSchema,
  examCienciasSkillSchema,
} from './schema';

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

export const EXAM_HISTORIA_AXES = examHistoriaAxisSchema.options;
export const EXAM_HISTORIA_SKILLS = examHistoriaSkillSchema.options;

// ---------------------------------------------------------------------------
// ENSAYO.HISTORIA -- blueprint de familia HISTORIA_CIENCIAS_SOCIALES.
//
// Reutiliza la infraestructura de textos compartidos + tablas de ENSAYOS-F2.
// Clasificacion `axis` + `skill` + `difficulty`, SOLO de source (sin columnas
// DB). Declara el mapa autoritativo texto -> rango de preguntas.
// ---------------------------------------------------------------------------
const historiaAxisDistributionSchema = z.object({
  HISTORIA_MUNDO_AMERICA_CHILE: z.number().int().nonnegative(),
  FORMACION_CIUDADANA: z.number().int().nonnegative(),
  SISTEMA_ECONOMICO: z.number().int().nonnegative(),
});
const historiaSkillDistributionSchema = z.object({
  PENSAMIENTO_TEMPORAL_ESPACIAL: z.number().int().nonnegative(),
  ANALISIS_FUENTES: z.number().int().nonnegative(),
  PENSAMIENTO_CRITICO: z.number().int().nonnegative(),
});
const answerDistributionSchema = z.object({
  A: z.number().int().nonnegative(),
  B: z.number().int().nonnegative(),
  C: z.number().int().nonnegative(),
  D: z.number().int().nonnegative(),
});

export const examHistoriaBlueprintSchema = z
  .object({
    family: z.literal('HISTORIA_CIENCIAS_SOCIALES'),
    examKey: z.string().min(1),
    title: z.string().min(1),
    subjectKey: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    expectedQuestionCount: z.number().int().positive(),
    expectedPassageCount: z.number().int().positive(),
    expectedAxis: historiaAxisDistributionSchema,
    expectedSkill: historiaSkillDistributionSchema,
    expectedDifficulty: difficultyDistributionSchema,
    expectedAnswerDistribution: answerDistributionSchema,
    compactKey: z.string().length(65).regex(/^[ABCD]+$/),
    passageMap: z.array(passageRangeSchema).min(1),
  })
  .refine((b) => sum(b.expectedAxis) === b.expectedQuestionCount, { message: 'expectedAxis debe sumar expectedQuestionCount.', path: ['expectedAxis'] })
  .refine((b) => sum(b.expectedSkill) === b.expectedQuestionCount, { message: 'expectedSkill debe sumar expectedQuestionCount.', path: ['expectedSkill'] })
  .refine((b) => sum(b.expectedDifficulty) === b.expectedQuestionCount, { message: 'expectedDifficulty debe sumar expectedQuestionCount.', path: ['expectedDifficulty'] })
  .refine((b) => sum(b.expectedAnswerDistribution) === b.expectedQuestionCount, { message: 'expectedAnswerDistribution debe sumar expectedQuestionCount.', path: ['expectedAnswerDistribution'] })
  .refine((b) => b.compactKey.length === b.expectedQuestionCount, { message: 'compactKey debe tener expectedQuestionCount caracteres.', path: ['compactKey'] })
  .refine(
    (b) => {
      const d = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
      for (const ch of b.compactKey) d[ch] += 1;
      return (['A', 'B', 'C', 'D'] as const).every((k) => d[k] === b.expectedAnswerDistribution[k]);
    },
    { message: 'La distribución de compactKey no coincide con expectedAnswerDistribution.', path: ['compactKey'] },
  )
  .refine((b) => b.passageMap.length === b.expectedPassageCount, { message: 'passageMap debe tener expectedPassageCount entradas.', path: ['passageMap'] })
  .refine(
    (b) => {
      const sorted = [...b.passageMap].sort((x, y) => x.firstQuestion - y.firstQuestion);
      if (sorted[0].firstQuestion !== 1) return false;
      if (sorted[sorted.length - 1].lastQuestion !== b.expectedQuestionCount) return false;
      return sorted.every((r, i) => r.lastQuestion >= r.firstQuestion && (i === 0 || r.firstQuestion === sorted[i - 1].lastQuestion + 1));
    },
    { message: 'passageMap debe cubrir 1..expectedQuestionCount con rangos contiguos.', path: ['passageMap'] },
  );
export type ExamHistoriaBlueprint = z.infer<typeof examHistoriaBlueprintSchema>;

/**
 * Blueprint APPROVED del Ensayo PAES Historia y Ciencias Sociales ZETRYND.
 * `subjectKey: 'historia'` -- el `Exam` se asocia a la materia academica
 * "Historia"; las QuestionVersions siguen aisladas bajo el Subject tecnico
 * `ensayos` + CurriculumTopic raiz `ENSAYO.HISTORIA`.
 */
export const ENSAYO_HISTORIA_BLUEPRINT: ExamHistoriaBlueprint = examHistoriaBlueprintSchema.parse({
  family: 'HISTORIA_CIENCIAS_SOCIALES',
  examKey: 'ENSAYO.HISTORIA',
  title: 'Ensayo PAES Historia y Ciencias Sociales',
  subjectKey: 'historia',
  durationMinutes: 120,
  expectedQuestionCount: 65,
  expectedPassageCount: 24,
  expectedAxis: { HISTORIA_MUNDO_AMERICA_CHILE: 38, FORMACION_CIUDADANA: 17, SISTEMA_ECONOMICO: 10 },
  expectedSkill: { PENSAMIENTO_TEMPORAL_ESPACIAL: 18, ANALISIS_FUENTES: 30, PENSAMIENTO_CRITICO: 17 },
  expectedDifficulty: { FACIL: 16, MEDIA: 33, DIFICIL: 16 },
  expectedAnswerDistribution: { A: 16, B: 16, C: 16, D: 17 },
  compactKey: 'CADBCABDCABDACDBCADBACBDACDBACDBCADBCADBBDACBADCABDCBACDBACDBCDAD',
  passageMap: [
    { passageKey: 'ENSAYO.HISTORIA.T1', title: 'República y ciudadanía en el siglo XIX', firstQuestion: 1, lastQuestion: 3 },
    { passageKey: 'ENSAYO.HISTORIA.T2', title: 'Industrialización y urbanización', firstQuestion: 4, lastQuestion: 5 },
    { passageKey: 'ENSAYO.HISTORIA.T3', title: 'Chile y los mercados internacionales', firstQuestion: 6, lastQuestion: 7 },
    { passageKey: 'ENSAYO.HISTORIA.T4', title: 'Una ciudad chilena en transformación', firstQuestion: 8, lastQuestion: 10 },
    { passageKey: 'ENSAYO.HISTORIA.T5', title: 'Crisis de la democracia liberal en el periodo de entreguerras', firstQuestion: 11, lastQuestion: 12 },
    { passageKey: 'ENSAYO.HISTORIA.T6', title: 'Instituciones y Estado de derecho', firstQuestion: 13, lastQuestion: 15 },
    { passageKey: 'ENSAYO.HISTORIA.T7', title: 'Información y democracia', firstQuestion: 16, lastQuestion: 17 },
    { passageKey: 'ENSAYO.HISTORIA.T8', title: 'Mercado de tomates', firstQuestion: 18, lastQuestion: 20 },
    { passageKey: 'ENSAYO.HISTORIA.T9', title: 'Crisis económica y dependencia externa', firstQuestion: 21, lastQuestion: 23 },
    { passageKey: 'ENSAYO.HISTORIA.T10', title: 'Industrialización y acción estatal', firstQuestion: 24, lastQuestion: 25 },
    { passageKey: 'ENSAYO.HISTORIA.T11', title: 'Un mundo dividido', firstQuestion: 26, lastQuestion: 27 },
    { passageKey: 'ENSAYO.HISTORIA.T12', title: 'Transformaciones y tensiones en Chile durante la década de 1960', firstQuestion: 28, lastQuestion: 30 },
    { passageKey: 'ENSAYO.HISTORIA.T13', title: 'Dictadura y transición política en Chile', firstQuestion: 31, lastQuestion: 32 },
    { passageKey: 'ENSAYO.HISTORIA.T14', title: 'Municipio, ciudadanía y control institucional', firstQuestion: 33, lastQuestion: 37 },
    { passageKey: 'ENSAYO.HISTORIA.T15', title: 'Inflación y poder adquisitivo', firstQuestion: 38, lastQuestion: 40 },
    { passageKey: 'ENSAYO.HISTORIA.T16', title: 'Después de la Segunda Guerra Mundial', firstQuestion: 41, lastQuestion: 43 },
    { passageKey: 'ENSAYO.HISTORIA.T17', title: 'La descolonización', firstQuestion: 44, lastQuestion: 45 },
    { passageKey: 'ENSAYO.HISTORIA.T18', title: 'América Latina en la Guerra Fría', firstQuestion: 46, lastQuestion: 48 },
    { passageKey: 'ENSAYO.HISTORIA.T19', title: 'Dictadura militar y derechos humanos en Chile', firstQuestion: 49, lastQuestion: 51 },
    { passageKey: 'ENSAYO.HISTORIA.T20', title: 'El fin de la Guerra Fría y un mundo más interconectado', firstQuestion: 52, lastQuestion: 54 },
    { passageKey: 'ENSAYO.HISTORIA.T21', title: 'Representación y participación ciudadana', firstQuestion: 55, lastQuestion: 57 },
    { passageKey: 'ENSAYO.HISTORIA.T22', title: 'Igualdad y no discriminación', firstQuestion: 58, lastQuestion: 59 },
    { passageKey: 'ENSAYO.HISTORIA.T23', title: 'Poder público y controles institucionales', firstQuestion: 60, lastQuestion: 61 },
    { passageKey: 'ENSAYO.HISTORIA.T24', title: 'Producción, empleo y poder adquisitivo', firstQuestion: 62, lastQuestion: 65 },
  ],
});

/** Todos los ensayos de familia HISTORIA_CIENCIAS_SOCIALES declarados en V1. */
export const ENSAYO_HISTORIA_MANIFEST: ExamHistoriaBlueprint[] = [ENSAYO_HISTORIA_BLUEPRINT];

export function findHistoriaBlueprint(examKey: string): ExamHistoriaBlueprint | null {
  return ENSAYO_HISTORIA_MANIFEST.find((b) => b.examKey === examKey) ?? null;
}

export const EXAM_CIENCIAS_DISCIPLINES = examCienciasDisciplineSchema.options;
export const EXAM_CIENCIAS_MODULES = examCienciasModuleSchema.options;
export const EXAM_CIENCIAS_SKILLS = examCienciasSkillSchema.options;

// ---------------------------------------------------------------------------
// ENSAYO.CIENCIAS.BIOLOGIA -- blueprint de familia CIENCIAS_MODULO_BIOLOGIA.
//
// Reutiliza la infraestructura de textos compartidos + tablas de ENSAYOS-F2.
// Clasificacion `discipline` + `module` + `skill` + `difficulty`, SOLO de
// source. Declara ademas el permutation map autoritativo (§8.2 del paquete):
// 24 preguntas cuyas alternativas se reordenaron respecto del orden editorial
// BASE para obtener la clave final. El source gate compara todo contra el
// contenido real.
// ---------------------------------------------------------------------------
const cienciasModuleDistributionSchema = z.object({
  COMUN: z.number().int().nonnegative(),
  ELECTIVO_BIOLOGIA: z.number().int().nonnegative(),
});
const cienciasDisciplineDistributionSchema = z.object({
  BIOLOGIA: z.number().int().nonnegative(),
  FISICA: z.number().int().nonnegative(),
  QUIMICA: z.number().int().nonnegative(),
});
const cienciasSkillDistributionSchema = z.object({
  OBSERVAR_Y_PLANTEAR_PREGUNTAS: z.number().int().nonnegative(),
  PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION: z.number().int().nonnegative(),
  PROCESAR_Y_ANALIZAR_LA_EVIDENCIA: z.number().int().nonnegative(),
  EVALUAR: z.number().int().nonnegative(),
  COMUNICAR: z.number().int().nonnegative(),
});
const permutationCodeSchema = z.string().regex(/^(?!.*(.).*\1)[ABCD]{4}$/, 'Un permutation code debe ser una permutación de ABCD.');

export const examCienciasBlueprintSchema = z
  .object({
    family: z.literal('CIENCIAS_MODULO_BIOLOGIA'),
    examKey: z.string().min(1),
    title: z.string().min(1),
    subjectKey: z.string().min(1),
    durationMinutes: z.number().int().positive(),
    expectedQuestionCount: z.number().int().positive(),
    expectedPassageCount: z.number().int().positive(),
    /** Q1..N que pertenecen al módulo común (el resto es electivo). */
    comunLastQuestion: z.number().int().positive(),
    expectedModule: cienciasModuleDistributionSchema,
    expectedDiscipline: cienciasDisciplineDistributionSchema,
    expectedDisciplineComun: cienciasDisciplineDistributionSchema,
    expectedDisciplineElectivo: cienciasDisciplineDistributionSchema,
    expectedSkill: cienciasSkillDistributionSchema,
    expectedDifficulty: difficultyDistributionSchema,
    expectedAnswerDistribution: answerDistributionSchema,
    compactKey: z.string().regex(/^[ABCD]+$/),
    /** §8.2 -- preguntas cuyas alternativas se reordenaron y su código de permutación. */
    permutationMap: z.record(z.string().regex(/^\d+$/), permutationCodeSchema),
    passageMap: z.array(passageRangeSchema).min(1),
  })
  .refine((b) => sum(b.expectedModule) === b.expectedQuestionCount, { message: 'expectedModule debe sumar expectedQuestionCount.', path: ['expectedModule'] })
  .refine((b) => sum(b.expectedDiscipline) === b.expectedQuestionCount, { message: 'expectedDiscipline debe sumar expectedQuestionCount.', path: ['expectedDiscipline'] })
  .refine((b) => sum(b.expectedDisciplineComun) === b.expectedModule.COMUN, { message: 'expectedDisciplineComun debe sumar expectedModule.COMUN.', path: ['expectedDisciplineComun'] })
  .refine((b) => sum(b.expectedDisciplineElectivo) === b.expectedModule.ELECTIVO_BIOLOGIA, { message: 'expectedDisciplineElectivo debe sumar expectedModule.ELECTIVO_BIOLOGIA.', path: ['expectedDisciplineElectivo'] })
  .refine((b) => sum(b.expectedSkill) === b.expectedQuestionCount, { message: 'expectedSkill debe sumar expectedQuestionCount.', path: ['expectedSkill'] })
  .refine((b) => sum(b.expectedDifficulty) === b.expectedQuestionCount, { message: 'expectedDifficulty debe sumar expectedQuestionCount.', path: ['expectedDifficulty'] })
  .refine((b) => sum(b.expectedAnswerDistribution) === b.expectedQuestionCount, { message: 'expectedAnswerDistribution debe sumar expectedQuestionCount.', path: ['expectedAnswerDistribution'] })
  .refine((b) => b.compactKey.length === b.expectedQuestionCount, { message: 'compactKey debe tener expectedQuestionCount caracteres.', path: ['compactKey'] })
  .refine(
    (b) => {
      const d = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
      for (const ch of b.compactKey) d[ch] += 1;
      return (['A', 'B', 'C', 'D'] as const).every((k) => d[k] === b.expectedAnswerDistribution[k]);
    },
    { message: 'La distribución de compactKey no coincide con expectedAnswerDistribution.', path: ['compactKey'] },
  )
  .refine(
    (b) => Object.keys(b.permutationMap).every((k) => Number(k) >= 1 && Number(k) <= b.expectedQuestionCount),
    { message: 'permutationMap contiene una pregunta fuera de rango.', path: ['permutationMap'] },
  )
  .refine((b) => b.passageMap.length === b.expectedPassageCount, { message: 'passageMap debe tener expectedPassageCount entradas.', path: ['passageMap'] })
  .refine(
    (b) => {
      const sorted = [...b.passageMap].sort((x, y) => x.firstQuestion - y.firstQuestion);
      if (sorted[0].firstQuestion !== 1) return false;
      if (sorted[sorted.length - 1].lastQuestion !== b.expectedQuestionCount) return false;
      return sorted.every((r, i) => r.lastQuestion >= r.firstQuestion && (i === 0 || r.firstQuestion === sorted[i - 1].lastQuestion + 1));
    },
    { message: 'passageMap debe cubrir 1..expectedQuestionCount con rangos contiguos.', path: ['passageMap'] },
  );
export type ExamCienciasBlueprint = z.infer<typeof examCienciasBlueprintSchema>;

/**
 * Blueprint APPROVED (versión FINAL post-patch) del Ensayo PAES Ciencias,
 * Módulo Biología ZETRYND. `subjectKey: 'ciencias'` -- el `Exam` se asocia a la
 * materia académica "Ciencias"; las QuestionVersions siguen aisladas bajo el
 * Subject técnico `ensayos` + CurriculumTopic raíz `ENSAYO.CIENCIAS.BIOLOGIA`.
 */
export const ENSAYO_CIENCIAS_BIOLOGIA_BLUEPRINT: ExamCienciasBlueprint = examCienciasBlueprintSchema.parse({
  family: 'CIENCIAS_MODULO_BIOLOGIA',
  examKey: 'ENSAYO.CIENCIAS.BIOLOGIA',
  title: 'Ensayo PAES Ciencias — Módulo Biología',
  subjectKey: 'ciencias',
  durationMinutes: 160,
  expectedQuestionCount: 80,
  expectedPassageCount: 41,
  comunLastQuestion: 54,
  expectedModule: { COMUN: 54, ELECTIVO_BIOLOGIA: 26 },
  expectedDiscipline: { BIOLOGIA: 44, FISICA: 18, QUIMICA: 18 },
  expectedDisciplineComun: { BIOLOGIA: 18, FISICA: 18, QUIMICA: 18 },
  expectedDisciplineElectivo: { BIOLOGIA: 26, FISICA: 0, QUIMICA: 0 },
  expectedSkill: {
    OBSERVAR_Y_PLANTEAR_PREGUNTAS: 12,
    PLANIFICAR_Y_CONDUCIR_UNA_INVESTIGACION: 16,
    PROCESAR_Y_ANALIZAR_LA_EVIDENCIA: 28,
    EVALUAR: 16,
    COMUNICAR: 8,
  },
  expectedDifficulty: { FACIL: 20, MEDIA: 40, DIFICIL: 20 },
  expectedAnswerDistribution: { A: 20, B: 20, C: 20, D: 20 },
  compactKey: 'BDCCBADAABDCABCCBADCBBCDACDBDCCDAADBCDABBDABBACCABCABADDABCDACBDCCDAABBDDCDDAABC',
  permutationMap: {
    '3': 'BCAD', '8': 'CABD', '15': 'ABDC', '21': 'BACD', '22': 'ACBD', '23': 'ACBD', '29': 'BCDA', '31': 'ABDC',
    '32': 'ACDB', '33': 'CABD', '44': 'ACBD', '47': 'ABDC', '51': 'ABDC', '52': 'CABD', '53': 'BACD', '54': 'BACD',
    '56': 'ABDC', '65': 'BCAD', '68': 'BACD', '70': 'ACBD', '73': 'BCDA', '75': 'ACDB', '77': 'CABD', '80': 'ABDC',
  },
  passageMap: [
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T1', title: 'Especialización celular', firstQuestion: 1, lastQuestion: 3 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T2', title: 'Luz y fotosíntesis', firstQuestion: 4, lastQuestion: 5 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T3', title: 'Transmisión en una sinapsis química', firstQuestion: 6, lastQuestion: 6 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T4', title: 'Transferencia de energía en un ecosistema', firstQuestion: 7, lastQuestion: 7 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T5', title: 'Ondas electromagnéticas', firstQuestion: 8, lastQuestion: 9 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T6', title: 'Fuerza, aceleración y movimiento', firstQuestion: 10, lastQuestion: 12 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T7', title: 'Resistencia eléctrica', firstQuestion: 13, lastQuestion: 14 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T8', title: 'Temperatura y solubilidad', firstQuestion: 15, lastQuestion: 15 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T9', title: 'Separación de una mezcla', firstQuestion: 16, lastQuestion: 16 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T10', title: 'Estructura atómica', firstQuestion: 17, lastQuestion: 17 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T11', title: 'Conservación y relaciones cuantitativas', firstQuestion: 18, lastQuestion: 20 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T12', title: 'Cambios durante el ciclo ovárico y uterino', firstQuestion: 21, lastQuestion: 22 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T13', title: 'Bacterias y resistencia a un antibiótico', firstQuestion: 23, lastQuestion: 24 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T14', title: 'Estructura y función de los gametos', firstQuestion: 25, lastQuestion: 26 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T15', title: 'Movimiento de un carro', firstQuestion: 27, lastQuestion: 28 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T16', title: 'Formación de imágenes con una lente convergente', firstQuestion: 29, lastQuestion: 30 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T17', title: 'Sismos y subducción', firstQuestion: 31, lastQuestion: 32 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T18', title: 'Circuitos eléctricos', firstQuestion: 33, lastQuestion: 33 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T19', title: 'Propiedades físicas de sustancias puras', firstQuestion: 34, lastQuestion: 35 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T20', title: 'Determinación experimental de densidad', firstQuestion: 36, lastQuestion: 36 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T21', title: 'Modelo de una reacción química', firstQuestion: 37, lastQuestion: 38 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T22', title: 'Preparación de una disolución', firstQuestion: 39, lastQuestion: 40 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T23', title: 'Respiración celular en semillas', firstQuestion: 41, lastQuestion: 43 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T24', title: 'Respuesta del sistema nervioso a un estímulo', firstQuestion: 44, lastQuestion: 45 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T25', title: 'Refracción de la luz', firstQuestion: 46, lastQuestion: 47 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T26', title: 'Potencia y consumo de energía eléctrica', firstQuestion: 48, lastQuestion: 49 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T27', title: 'Serie de alcoholes', firstQuestion: 50, lastQuestion: 51 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T28', title: 'Separación de una disolución mediante destilación', firstQuestion: 52, lastQuestion: 52 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T29', title: 'Fórmula empírica de un compuesto', firstQuestion: 53, lastQuestion: 53 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T30', title: 'Temperatura y solubilidad', firstQuestion: 54, lastQuestion: 54 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T31', title: 'Manipulación genética y producción de un fármaco', firstQuestion: 55, lastQuestion: 56 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T32', title: 'Anatomía comparada y evolución', firstQuestion: 57, lastQuestion: 58 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T33', title: 'Punto de control del ciclo celular', firstQuestion: 59, lastQuestion: 60 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T34', title: 'Ciclo celular y cantidad de ADN', firstQuestion: 61, lastQuestion: 63 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T35', title: 'Mitosis y punto de control de metafase', firstQuestion: 64, lastQuestion: 65 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T36', title: 'Meiosis I y meiosis II', firstQuestion: 66, lastQuestion: 67 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T37', title: 'Resistencia y selección natural', firstQuestion: 68, lastQuestion: 70 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T38', title: 'Registro fósil y cambio a través del tiempo', firstQuestion: 71, lastQuestion: 73 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T39', title: 'Etapas de la fotosíntesis', firstQuestion: 74, lastQuestion: 75 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T40', title: 'Flujo de energía en una cadena trófica', firstQuestion: 76, lastQuestion: 77 },
    { passageKey: 'ENSAYO.CIENCIAS.BIOLOGIA.T41', title: 'Factores que limitan la fotosíntesis', firstQuestion: 78, lastQuestion: 80 },
  ],
});

/** Todos los ensayos de familia CIENCIAS_MODULO_BIOLOGIA declarados en V1. */
export const ENSAYO_CIENCIAS_MANIFEST: ExamCienciasBlueprint[] = [ENSAYO_CIENCIAS_BIOLOGIA_BLUEPRINT];

export function findCienciasBlueprint(examKey: string): ExamCienciasBlueprint | null {
  return ENSAYO_CIENCIAS_MANIFEST.find((b) => b.examKey === examKey) ?? null;
}

/** Total de modulos de ensayo esperados (todas las familias). */
export const ENSAYO_MODULE_COUNT =
  ENSAYO_MANIFEST.length + ENSAYO_READING_MANIFEST.length + ENSAYO_HISTORIA_MANIFEST.length + ENSAYO_CIENCIAS_MANIFEST.length;
