import { z } from 'zod';

/**
 * Contrato de la Content Coverage Matrix -- LEF Bloque VII, Incremento 5.
 * Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §12.5 (frontera), §13.5 (criterios
 * de cierre), decisión E (§4) e invariante 14 (§7.1).
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN ARCHIVO PROPIO Y NO `editorial.ts`
 * ---------------------------------------------------------------------------
 * `editorial.ts` declara los contratos de ESCRITURA de los Incrementos 3 y 4
 * (T1..T8: peticiones de creación, edición y transición). La matriz es
 * ESTRICTAMENTE de solo lectura (invariante 14) y no aporta ni una sola
 * petición: mezclarla allí haría más difícil, no más fácil, verificar que
 * §12.5 no introdujo ninguna ruta de escritura. La separación física del
 * contrato acompaña a la separación física del módulo que §13.5 punto 4 exige.
 *
 * ---------------------------------------------------------------------------
 * REGLAS DURAS DE ESTE ARCHIVO (invariante 14, §11.4)
 * ---------------------------------------------------------------------------
 *  - NO declara NINGÚN esquema de petición. La matriz se pide con un `GET` sin
 *    cuerpo; no hay nada que un cliente pueda enviar. Es la misma regla dura
 *    que `administration.ts` (Incremento 2) y se verifica estáticamente.
 *  - NO declara ningún campo de ROL ni de ACTOR (invariante 22): el backend
 *    resuelve identidad y rol desde el token en cada request.
 *  - NO declara `isCorrect`, ni contenido académico, ni ningún campo de
 *    `Account`/`StudentResponse`/`AiConversation`/PROGRESS/GAMIFICATION/
 *    PRIVACY (§13.5 puntos 2 y 3, §11.4). Lo que sale de aquí son CONTEOS y
 *    referencias de taxonomía, nada más.
 *  - NO declara el estado `ARCHIVED` (invariante 21): ninguna ruta de Bloque
 *    VII lo produce, de modo que una casilla para contarlo sería una
 *    afirmación falsa sobre el alcance de V1.
 */

/**
 * Conteos por estado editorial de una familia de versiones.
 *
 * Los CUATRO estados contados son exactamente los que §12.5 nombra:
 * "conteo de versiones publicadas, borradores/en revisión/aprobadas". Ni uno
 * más. En particular:
 *  - `DEPRECATED` NO se cuenta: §12.5 no lo pide y el retiro se observa como
 *    la CAÍDA de `published`, que es lo que §13.5 punto 1 exige demostrar
 *    ("la matriz refleja el estado real de la base [...] después de retirar").
 *  - `ARCHIVED` NO se cuenta: es inalcanzable (invariante 21).
 */
export const contentCoverageCountsSchema = z.object({
  /** Versiones en `PUBLISHED`. Por el invariante 16, como máximo una por identidad. */
  published: z.number().int().nonnegative(),
  draft: z.number().int().nonnegative(),
  inReview: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
});

/** Fila de tema: la unidad fina de la matriz ("agregación por materia/tema", §12.5). */
export const contentCoverageTopicSchema = z.object({
  curriculumTopicId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  order: z.number().int(),
  /** `null` en un tema raíz. `CurriculumTopic` es plano-con-padre y NO se versiona (§6 punto 3). */
  parentId: z.string().uuid().nullable(),
  questions: contentCoverageCountsSchema,
  learningResources: contentCoverageCountsSchema,
  /**
   * "Última actualización" (§12.5): el `updated_at` MÁS RECIENTE entre todas
   * las versiones de contenido clasificadas en este tema, de ambas familias.
   * `null` cuando el tema todavía no tiene ninguna versión -- que es
   * precisamente el hueco de cobertura que `CMS-002` existe para hacer
   * visible.
   */
  lastUpdatedAt: z.string().datetime().nullable(),
});

/** Fila de materia: agregado de sus temas, más el detalle tema a tema. */
export const contentCoverageSubjectSchema = z.object({
  subjectId: z.string().uuid(),
  subjectKey: z.string(),
  name: z.string(),
  shortName: z.string(),
  displayOrder: z.number().int(),
  /** Suma de los conteos de todos los temas de la materia. */
  questions: contentCoverageCountsSchema,
  learningResources: contentCoverageCountsSchema,
  topics: z.array(contentCoverageTopicSchema),
});

/**
 * Respuesta de `GET /administration/editorial/coverage-matrix`.
 *
 * `generatedAt` es el momento de la CONSULTA, no un dato almacenado: la matriz
 * no se materializa en ninguna tabla (eso sería una escritura, invariante 14).
 * Se calcula en lectura, en cada petición, sobre las entidades ya existentes.
 */
export const contentCoverageMatrixResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  subjects: z.array(contentCoverageSubjectSchema),
});

export type ContentCoverageCounts = z.infer<typeof contentCoverageCountsSchema>;
export type ContentCoverageTopic = z.infer<typeof contentCoverageTopicSchema>;
export type ContentCoverageSubject = z.infer<typeof contentCoverageSubjectSchema>;
export type ContentCoverageMatrixResponse = z.infer<typeof contentCoverageMatrixResponseSchema>;
