// CONTENT-4.1 -- Schema fuente de contenido V1 (infraestructura estática,
// SIN Postgres). Ver docs de cierre de CONTENT-2/CONTENT-3/CONTENT-4
// (auditorías previas, sin ADR propio todavía).
//
// Un módulo de Recurso (`apps/backend/content/estudio/**/*.ts`, uno por
// archivo, ver CONTENT-4.1 punto 1) exporta por default un objeto que
// cumple `resourceContentModuleSchema`. CONTENT-4.2 (fuera de alcance de
// este incremento) será el único código que lea estos módulos para
// transformarlos en llamadas a la API editorial real
// (`EditorialAuthoringService`/`EditorialTransitionService`) -- este
// archivo NO importa nada de `src/`, NO abre conexión a Postgres, NO llama
// a la API editorial.
//
// Reutilización de @axioma/contracts (nunca se reimplementa una regla ya
// existente):
//   - `headingBlockSchema`/`paragraphBlockSchema`/`imageBlockSchema` se
//     reutilizan TAL CUAL.
//   - `formulaBlockSchema` exige `{ latex, svg }` -- pero en el CONTENIDO
//     FUENTE el `svg` todavía no existe (se genera una sola vez, en el
//     momento de publicar -- mismo criterio que ADR-0002/
//     `EditorialAuthoringService`, que también recibe solo LaTeX del
//     autor). Por eso `sourceFormulaBlockSchema` es `formulaBlockSchema`
//     con `.omit({ svg: true })` -- una composición, no una reescritura de
//     sus reglas (`type`/`order`/`latex` se heredan intactas).
//   - `resourceContentBlocksSchema`/`explanationContentSchema`/
//     `answerOptionContentSchema` NO se usan directamente sobre el
//     contenido fuente (exigirían `svg` ya presente); sus equivalentes
//     "fuente" de abajo son ensamblados componiendo los mismos bloques
//     base de contracts, restringidos a los mismos subconjuntos que ya
//     define cada contrato real (`explanationContentBlockSchema` excluye
//     `heading`; `answerOptionContentSchema` es paragraph|formula).
import { z } from 'zod';
import { headingBlockSchema, paragraphBlockSchema, imageBlockSchema, formulaBlockSchema } from '@axioma/contracts';

/** Fórmula en contenido FUENTE: `latex` obligatorio, `svg` ausente -- lo genera CONTENT-4.2. */
export const sourceFormulaBlockSchema = formulaBlockSchema.omit({ svg: true });
export type SourceFormulaBlock = z.infer<typeof sourceFormulaBlockSchema>;

/** Equivalente fuente de `resourceContentBlockSchema` (heading|paragraph|formula|image), sin `svg` en formula. */
export const sourceContentBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  sourceFormulaBlockSchema,
  imageBlockSchema,
]);
export const sourceContentBlocksSchema = z.array(sourceContentBlockSchema).min(1);
export type SourceContentBlock = z.infer<typeof sourceContentBlockSchema>;

/** Equivalente fuente de `explanationContentBlockSchema` (paragraph|formula|image, SIN heading -- mismo subconjunto que el contrato real). */
export const sourceExplanationBlockSchema = z.discriminatedUnion('type', [
  paragraphBlockSchema,
  sourceFormulaBlockSchema,
  imageBlockSchema,
]);
export const sourceExplanationContentSchema = z.array(sourceExplanationBlockSchema).min(1);

/** Equivalente fuente de `answerOptionContentSchema` (paragraph|formula, sin `svg`). */
export const sourceAnswerOptionContentSchema = z.discriminatedUnion('type', [paragraphBlockSchema, sourceFormulaBlockSchema]);

/**
 * Progresión editorial de CONTENT-3 (3 fáciles / 5 medias / 2 difíciles para
 * un recurso de 10) -- el ENUM es la parte validable aquí; la distribución
 * exacta por recurso es una regla de contenido/coverage, no de forma, y
 * queda fuera de este schema (ver gate, que sí puede auditarla si se pide
 * en un incremento posterior).
 */
export const questionDifficultySchema = z.enum(['FACIL', 'MEDIA', 'DIFICIL']);
export type QuestionDifficulty = z.infer<typeof questionDifficultySchema>;

/**
 * Distingue catálogo V1 real de contenido de prueba -- TIPADO, no solo por
 * convención de carpeta (`_fixture/`). `'catalog'` es el default: cualquier
 * módulo de recurso que no declare `kind` explícitamente se asume catálogo
 * real, así que `fixture`/`validation` SIEMPRE deben marcarse a mano -- no
 * hay forma de "olvidarlo" en el sentido peligroso (omitir el campo nunca
 * oculta contenido real de los totales). El importer de CONTENT-4.2 debe
 * filtrar por `kind === 'catalog'` antes de escribir nada en la API
 * editorial en su modo normal -- este campo es el contrato que se lo permite
 * sin depender de inspeccionar rutas de archivo.
 *
 * SEMÁNTICA CONGELADA (CONTENT-4.2B, punto 7) -- la AUTORIDAD es `kind`,
 * nunca el nombre de la carpeta:
 *   - `catalog`:    contenido V1 real. Cuenta en coverage/totales oficiales.
 *                    Importable normalmente. Incluido por `--all`.
 *   - `fixture`:    contenido puramente de test ESTRUCTURAL (schema/gate de
 *                    forma). NO cuenta en V1. NUNCA importable -- el
 *                    importer lo salta siempre (`SKIP_FIXTURE`), sin flag
 *                    que lo habilite.
 *   - `validation`: contenido técnico E2E para probar EL IMPORTER mismo
 *                    (CONTENT-4.2, recurso `zztest`). NO cuenta en V1. NO se
 *                    importa por defecto NI con `--unit`/`--all` -- solo
 *                    mediante `--resource <key> --allow-validation`
 *                    explícito (nunca por `--all`, ni con el flag presente:
 *                    preferencia congelada, `--all` = únicamente `catalog`).
 */
export const contentKindSchema = z.enum(['catalog', 'fixture', 'validation']);
export type ContentKind = z.infer<typeof contentKindSchema>;

/**
 * Alternativa fuente: contenido (texto o fórmula) + si es la correcta.
 * `displayOrder` NO se declara aquí -- lo determina la posición del
 * elemento en el array `options` (mismo criterio que `seedQuestion` ya usa
 * hoy: `input.options.map((option, index) => ({ ..., displayOrder: index }))`).
 */
export const sourceAnswerOptionSchema = z.object({
  content: sourceAnswerOptionContentSchema,
  correct: z.boolean(),
});
export type SourceAnswerOption = z.infer<typeof sourceAnswerOptionSchema>;

/**
 * `questionKey`/`topicCode`/`unitCode`/`code` en general: convención DEMRE
 * ya vigente en el repo (`M1.NUMEROS.PORCENTAJES`, con puntos como
 * separador de nivel, segmentos en mayúsculas/dígitos). Ver
 * `curriculumCodeSchema` más abajo para la regex compartida.
 */
const curriculumCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]+(\.[A-Z0-9_]+)+$/, 'Código curricular inválido -- se espera convención DEMRE tipo "M1.NUMEROS.PORCENTAJES".');

export const sourceQuestionSchema = z.object({
  /** Código estable de la pregunta, ej. "M1.NUMEROS.PORCENTAJES.CALCULO.Q1". */
  questionKey: curriculumCodeSchema,
  /** Orden dentro del recurso (0-based), sin huecos ni duplicados -- verificado por el gate, no por este schema. */
  order: z.number().int().nonnegative(),
  difficulty: questionDifficultySchema,
  stemContent: sourceContentBlocksSchema,
  /** Mínimo 2 -- SINGLE_CHOICE exige una elección real entre alternativas (`question_type` en schema.prisma). */
  options: z.array(sourceAnswerOptionSchema).min(2),
  explanationContent: sourceExplanationContentSchema,
});
export type SourceQuestion = z.infer<typeof sourceQuestionSchema>;

/**
 * Módulo de Recurso -- lo que un archivo bajo `content/estudio/**` exporta
 * por default. `topicCode` es el código del `CurriculumTopic` HIJO (=
 * Recurso, CONTENT-2); `unitCode` es el código del `CurriculumTopic` RAÍZ
 * (= Unidad) al que pertenece -- ambos deben existir ya sea en el propio
 * lote de archivos o en el manifest (verificado por el gate).
 */
/**
 * CONTENT-4.2 -- los DOS valores reales del enum `LearningResourceType`
 * (`schema.prisma`, mismo criterio ya documentado ahí: "acotado a 2 valores
 * para M1, no los 12 del Data Model"). Necesario para que el importer pueda
 * construir el payload de `POST /administration/editorial/learning-resources`
 * (`editorialCreateLearningResourceRequestSchema` lo exige) sin inventar un
 * valor por defecto.
 */
export const learningResourceTypeSchema = z.enum(['LESSON', 'CONCEPT_EXPLANATION']);
export type SourceLearningResourceType = z.infer<typeof learningResourceTypeSchema>;

export const resourceContentModuleSchema = z.object({
  /** 'catalog' (default) = catálogo V1 real; 'fixture' = SOLO prueba, nunca elegible para el importer de CONTENT-4.2. */
  kind: contentKindSchema.default('catalog'),
  /** Código del `LearningResource.resourceKey`, ej. "M1.NUMEROS.PORCENTAJES.CALCULO.LECCION". */
  resourceKey: curriculumCodeSchema,
  /** CONTENT-4.2 -- necesario para el payload editorial de creación (ver arriba). */
  resourceType: learningResourceTypeSchema,
  /** Código del `CurriculumTopic` hijo (Recurso). */
  topicCode: curriculumCodeSchema,
  /** Código del `CurriculumTopic` raíz (Unidad) padre. */
  unitCode: curriculumCodeSchema,
  /** `Subject.subjectKey` real, ej. "matematica". */
  subjectKey: z.string().min(1),
  /** Orden del recurso dentro de la unidad (1-based, espejo de `CurriculumTopic.order`). */
  order: z.number().int().positive(),
  title: z.string().min(1),
  /** Objetivo de aprendizaje editorial -- metadata de producción, NUNCA viaja a mobile/API pública. */
  learningObjective: z.string().min(1),
  /** Mini-lección -- se transformará en `LearningResourceVersion.contentBlocks`. */
  contentBlocks: sourceContentBlocksSchema,
  questions: z.array(sourceQuestionSchema).min(1),
});
export type ResourceContentModule = z.infer<typeof resourceContentModuleSchema>;
