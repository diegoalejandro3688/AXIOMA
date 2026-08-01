import { z } from 'zod';
import { entityId, isoDateTime } from './common';

/**
 * Contratos del dominio EDUCATION -- Bloque I, Vertical Slice M1. Ver
 * docs/adr/0012-education-foundation.md.
 *
 * Postgres protege las invariantes RELACIONALES (unicidad, FK, consistencia
 * de materia vía triggers). Zod protege la FORMA de los campos `Json`
 * (`contentBlocks`, `explanationContent`, `content` de alternativa) -- Postgres
 * no sabe qué tipos de bloque son válidos dentro de esas columnas. Ver ADR-0012,
 * "Precisiones finales de aprobación", punto 4.
 */

const blockOrder = z.number().int().nonnegative();

export const headingBlockSchema = z.object({
  type: z.literal('heading'),
  order: blockOrder,
  text: z.string().min(1),
  level: z.number().int().min(1).max(3).default(1),
});

export const paragraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  order: blockOrder,
  text: z.string().min(1),
});

/** Fórmula en LaTeX inline -- ver ADR-0002. Nunca como imagen (Data Model, invariante 241). */
export const formulaBlockSchema = z.object({
  type: z.literal('formula'),
  order: blockOrder,
  latex: z.string().min(1),
});

/**
 * `objectKey` es la clave devuelta por `ObjectStorageService.putObject()` --
 * nunca una URL persistida (ADR-0010, ajuste 6). Se resuelve a URL firmada
 * en el momento de servir el recurso, no al guardar el contenido.
 */
export const imageBlockSchema = z.object({
  type: z.literal('image'),
  order: blockOrder,
  objectKey: z.string().min(1),
  altText: z.string().min(1),
});

/**
 * Subconjunto mínimo de `resource_content_block` -- ver ADR-0012, punto 2 del
 * proceso de ajuste. `worked_step`/`example` se representan componiendo estos
 * cuatro tipos, sin tipo propio.
 */
export const resourceContentBlockSchema = z.discriminatedUnion('type', [
  headingBlockSchema,
  paragraphBlockSchema,
  formulaBlockSchema,
  imageBlockSchema,
]);
export const resourceContentBlocksSchema = z.array(resourceContentBlockSchema).min(1);

/**
 * `explanationContent` reutiliza el mismo contrato de bloques, restringido a
 * paragraph/formula/image -- sin heading (ver ADR-0012, "explanationContent
 * usa el mismo contrato de bloques"). Nunca texto libre / Markdown / HTML.
 */
export const explanationContentBlockSchema = z.discriminatedUnion('type', [
  paragraphBlockSchema,
  formulaBlockSchema,
  imageBlockSchema,
]);
export const explanationContentSchema = z.array(explanationContentBlockSchema).min(1);

/** Contenido de una alternativa: un solo bloque, texto o fórmula -- nunca imagen en M1. */
export const answerOptionContentSchema = z.discriminatedUnion('type', [paragraphBlockSchema, formulaBlockSchema]);

export const editorialStatusSchema = z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED']);

// --- Subject ---

export const subjectResponseSchema = z.object({
  id: entityId,
  subjectKey: z.string(),
  name: z.string(),
  shortName: z.string(),
  displayOrder: z.number().int(),
});
export type SubjectResponse = z.infer<typeof subjectResponseSchema>;

// --- CurriculumTopic ---

export const curriculumTopicResponseSchema = z.object({
  id: entityId,
  code: z.string(),
  name: z.string(),
  order: z.number().int(),
  parentId: entityId.nullable(),
  subjectId: entityId,
});
export type CurriculumTopicResponse = z.infer<typeof curriculumTopicResponseSchema>;

// --- LearningResource (identidad + versión publicada, aplanado para lectura) ---

export const learningResourceResponseSchema = z.object({
  id: entityId,
  resourceKey: z.string(),
  curriculumTopicId: entityId,
  versionId: entityId,
  title: z.string(),
  contentBlocks: resourceContentBlocksSchema,
  publishedAt: isoDateTime,
});
export type LearningResourceResponse = z.infer<typeof learningResourceResponseSchema>;

// --- Question (identidad + versión publicada, aplanado para lectura) ---
// NUNCA incluye `isCorrect` -- ver ADR-0012, invariante "la pauta no viaja al
// cliente antes de la revelación". No hay endpoint de envío de respuesta en
// Bloque I (eso es Bloque III/Progress), así que la exclusión es incondicional.

export const answerOptionPublicResponseSchema = z.object({
  id: entityId,
  content: answerOptionContentSchema,
  displayOrder: z.number().int(),
});
export type AnswerOptionPublicResponse = z.infer<typeof answerOptionPublicResponseSchema>;

export const questionResponseSchema = z.object({
  id: entityId,
  questionKey: z.string(),
  curriculumTopicId: entityId,
  versionId: entityId,
  questionType: z.literal('SINGLE_CHOICE'),
  stemContent: resourceContentBlocksSchema,
  explanationContent: explanationContentSchema,
  answerOptions: z.array(answerOptionPublicResponseSchema).min(1),
  publishedAt: isoDateTime,
});
export type QuestionResponse = z.infer<typeof questionResponseSchema>;
