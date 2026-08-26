import { z } from 'zod';

/**
 * Contratos de la API editorial administrativa -- LEF Bloque VII, Incremento 3
 * ("Transiciones de estado con auditoría, retiro primero").
 * Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §8.2, §8.4, §8.5, §9.3, §12.3, §13.3.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN ARCHIVO PROPIO Y NO `administration.ts`
 * ---------------------------------------------------------------------------
 * `administration.ts` (Incremento 2) declara como REGLA DURA que no contiene
 * ningún esquema de petición, y `verify:admin-identity-gate` lo verifica
 * estáticamente. Esa propiedad sigue siendo cierta y NO se toca: el
 * Incremento 3 sí necesita cuerpos de petición (motivo, clave de idempotencia,
 * estado destino) y viven aquí, en un archivo separado, de modo que el gate
 * del Incremento 2 permanece byte-idéntico y en PASS.
 *
 * ---------------------------------------------------------------------------
 * REGLA DURA QUE SÍ SE HEREDA (invariante 22, §9.5, §13.2 punto 9)
 * ---------------------------------------------------------------------------
 * NINGÚN esquema de petición de este archivo contiene un campo de ROL ni de
 * ACTOR. El cliente presenta su token personal por cabecera (`X-Admin-Token`)
 * y nada más; el backend resuelve identidad y rol desde la base en cada
 * request. Un campo de rol o de actor aquí sería una segunda ruta de
 * autorización. Verificado estáticamente por `verify:editorial-transitions-gate`.
 */

/**
 * Estado destino solicitado.
 *
 * Incluye deliberadamente los SEIS valores del enum real `EditorialStatus`,
 * `ARCHIVED` entre ellos, aunque §8.4 y el invariante 21 lo declaren
 * inalcanzable. El motivo es exigido por §13.3 punto 5: cada transición
 * prohibida debe ser **rechazada por la API con un error explícito**,
 * incluyendo "cualquier destino ARCHIVED desde cualquier estado". Si el
 * contrato no admitiera siquiera nombrar `ARCHIVED`, la respuesta sería un
 * error de forma genérico o un 404 de ruta inexistente -- no un rechazo
 * explícito y atribuible de la máquina de estados.
 *
 * Que el valor sea NOMBRABLE en la petición no lo hace ALCANZABLE: la
 * máquina de estados lo rechaza siempre, y el trigger del Incremento 1 es la
 * defensa final.
 */
export const editorialTargetStatusSchema = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'DEPRECATED',
  'ARCHIVED',
]);

/**
 * Petición de transición editorial.
 *
 * `.strict()` -- mismo criterio que el resto de contratos del proyecto: un
 * campo desconocido es un error, nunca algo que se ignore en silencio. Es
 * también lo que impide que un cliente cuele un `role` o un `actorId` y que
 * eso pase inadvertido.
 */
export const editorialTransitionRequestSchema = z
  .object({
    targetStatus: editorialTargetStatusSchema,
    /**
     * Motivo de texto libre (§9.3 campo 7). OBLIGATORIO en T4, T6, T8 y en
     * todo uso de la excepción de CMS-018; opcional en T5 y T7 sin excepción.
     * La obligatoriedad la aplican el servicio de dominio y un CHECK de
     * PostgreSQL -- no este esquema, que no sabe qué transición resultará.
     */
    reason: z.string().trim().min(1).max(2000).optional(),
    /**
     * Clave de idempotencia de la operación (invariante 11), mismo patrón que
     * `StudentResponse.operationId`. §8.2 la exige en T7 y T8.
     */
    operationId: z.string().uuid().optional(),
    /**
     * Identificador de una activación DELIBERADA de la excepción de CMS-018
     * (§8.5). AUSENTE por defecto -- y su ausencia significa "regla normal",
     * nunca "el sistema decide".
     *
     * No es un booleano a propósito: obliga a nombrar una activación concreta
     * que alguien tuvo que crear explícitamente fuera de banda, sobre esta
     * versión concreta. Un booleano con valor por defecto sería exactamente
     * la inferencia que §8.5 condición 1 prohíbe.
     */
    cms018ActivationId: z.string().uuid().optional(),
  })
  .strict();

/** Resultado de una transición aplicada (o reconocida como ya aplicada). */
export const editorialTransitionResponseSchema = z.object({
  versionId: z.string().uuid(),
  objectType: z.enum(['QUESTION_VERSION', 'LEARNING_RESOURCE_VERSION']),
  previousStatus: editorialTargetStatusSchema,
  newStatus: editorialTargetStatusSchema,
  adminActionId: z.string().uuid(),
  /**
   * `true` cuando la petición se reconoció como REPETICIÓN de una operación
   * ya aplicada con la misma clave de idempotencia. El efecto no se repitió y
   * no se creó ningún registro nuevo (invariante 11).
   */
  idempotentReplay: z.boolean(),
  /**
   * Presente solo cuando T7 despublicó automáticamente una versión anterior
   * de la misma identidad, dentro de la misma transacción (§8.6, invariante 16).
   */
  supersededVersionId: z.string().uuid().nullable(),
});

/**
 * Proyección de un registro de acción administrativa -- los nueve campos de
 * §9.3, en lectura.
 *
 * NUNCA incluye contenido académico (§9.3, "guarda la referencia, nunca una
 * copia"), NUNCA datos de `Account`/`StudentResponse`/`AiConversation` ni de
 * PROGRESS/GAMIFICATION/PRIVACY (§11.4).
 */
export const adminActionResponseSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid(),
  actorDisplayName: z.string(),
  roleExercised: z.enum(['AUTHOR', 'PUBLISHER']),
  occurredAt: z.string(),
  actionType: z.enum(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']),
  objectType: z.enum(['QUESTION_VERSION', 'LEARNING_RESOURCE_VERSION', 'ANSWER_OPTION']),
  objectId: z.string().uuid(),
  previousStatus: editorialTargetStatusSchema.nullable(),
  newStatus: editorialTargetStatusSchema.nullable(),
  reason: z.string().nullable(),
  operationId: z.string().uuid().nullable(),
  /**
   * Noveno campo, condicional (§9.3): presente SOLO cuando se usó la
   * excepción de CMS-018, y entonces lleva AMBOS actores -- el que la activó
   * y el que la usó (§8.5 condición 2). Su ausencia es la marca de que la
   * operación siguió la regla normal.
   */
  cms018Exception: z
    .object({
      activationId: z.string().uuid(),
      activatedByActorId: z.string().uuid(),
      activatedByDisplayName: z.string(),
      usedByActorId: z.string().uuid(),
      usedByDisplayName: z.string(),
      activationReason: z.string(),
    })
    .nullable(),
});

/** Listado de auditoría de un objeto (§13.3 punto 8: consultable). */
export const adminActionListResponseSchema = z.object({
  actions: z.array(adminActionResponseSchema),
});

export type EditorialTargetStatus = z.infer<typeof editorialTargetStatusSchema>;
export type EditorialTransitionRequest = z.infer<typeof editorialTransitionRequestSchema>;
export type EditorialTransitionResponse = z.infer<typeof editorialTransitionResponseSchema>;
export type AdminActionResponse = z.infer<typeof adminActionResponseSchema>;
export type AdminActionListResponse = z.infer<typeof adminActionListResponseSchema>;

// =============================================================================
// LEF Bloque VII, Incremento 4 -- "Autoría: crear borrador y publicar versión
// nueva". Ver LEF-BLOCK-VII-DEFINITION.md §8.2 (T1, T2, T3), §12.4 (frontera)
// y §13.4 (criterios de cierre).
//
// Extensión ADITIVA de este mismo archivo, no un archivo nuevo: §12.4 autoriza
// tocar `packages/contracts` "de forma aditiva y explícita para el contrato
// administrativo". Todo lo anterior (Incremento 3) queda byte-idéntico.
//
// LA REGLA DURA DE ARRIBA SIGUE VIGENTE: ningún esquema de petición de este
// archivo contiene un campo de ROL ni de ACTOR (invariante 22, §13.2 punto 9).
// Tampoco ninguno admite `editorialStatus`: T1 SIEMPRE crea en `DRAFT` y T2
// SIEMPRE edita en `DRAFT`; el estado no es negociable por el cliente, y una
// creación directa en `PUBLISHED` no es representable ni siquiera en el
// contrato (§8.4: no existe DRAFT -> PUBLISHED, invariante 5).
//
// Tampoco admite `id` de entidad ni de versión: los identificadores internos
// los genera el servidor (`@default(uuid())`). Un cliente que eligiera el `id`
// podría colisionar deliberadamente con una fila publicada.
// =============================================================================

/**
 * Bloque de fórmula EN AUTORÍA: `latex` y NADA MÁS.
 *
 * El contrato de ALMACENAMIENTO (`formulaBlockSchema`, `education.ts`) exige
 * `latex` + `svg`, y NO se modifica -- §12.4: "Zod sigue siendo la autoridad
 * de la forma del JSON; se REUTILIZA, no se modifica". Lo que este esquema
 * expresa es que el autor no envía el SVG: lo genera el backend con
 * `renderLatexToSvg()`, UNA vez, en el momento en que el contenido se escribe
 * (ADR-0002/ADR-0013, `seed.ts:69`), nunca en lectura y nunca en el
 * dispositivo del estudiante.
 *
 * Que el cliente no pueda suministrar el SVG no es una comodidad: un SVG
 * suministrado por el cliente sería marcado arbitrario viajando hasta el
 * renderizador del estudiante, y además podría no corresponderse con el LaTeX
 * declarado -- dos fuentes de verdad para la misma fórmula.
 */
export const authoringFormulaBlockSchema = z.object({
  type: z.literal('formula'),
  order: z.number().int().nonnegative(),
  latex: z.string().min(1),
});

const authoringHeadingBlockSchema = z.object({
  type: z.literal('heading'),
  order: z.number().int().nonnegative(),
  text: z.string().min(1),
  /**
   * `.optional()` y NO `.default(1)`: el valor por defecto lo aplica el
   * esquema de ALMACENAMIENTO (`headingBlockSchema`, `education.ts`), que es
   * la autoridad de la forma persistida (ADR-0012 punto 4). Duplicar aquí el
   * default crearía dos sitios donde cambiarlo y haría divergir el tipo de
   * ENTRADA del de SALIDA del contrato de petición.
   */
  level: z.number().int().min(1).max(3).optional(),
});

const authoringParagraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  order: z.number().int().nonnegative(),
  text: z.string().min(1),
});

const authoringImageBlockSchema = z.object({
  type: z.literal('image'),
  order: z.number().int().nonnegative(),
  objectKey: z.string().min(1),
  altText: z.string().min(1),
});

/** Espejo de `resourceContentBlocksSchema` con la fórmula en forma de autoría. */
export const authoringResourceContentBlocksSchema = z
  .array(
    z.discriminatedUnion('type', [
      authoringHeadingBlockSchema,
      authoringParagraphBlockSchema,
      authoringFormulaBlockSchema,
      authoringImageBlockSchema,
    ]),
  )
  .min(1);

/** Espejo de `explanationContentSchema` (sin `heading`, igual que en EDUCATION). */
export const authoringExplanationContentSchema = z
  .array(
    z.discriminatedUnion('type', [
      authoringParagraphBlockSchema,
      authoringFormulaBlockSchema,
      authoringImageBlockSchema,
    ]),
  )
  .min(1);

/** Espejo de `answerOptionContentSchema`: un solo bloque, texto o fórmula. */
export const authoringAnswerOptionContentSchema = z.discriminatedUnion('type', [
  authoringParagraphBlockSchema,
  authoringFormulaBlockSchema,
]);

/**
 * Una alternativa en autoría. `displayOrder` NO se envía: es el índice dentro
 * del arreglo, de modo que no puede haber huecos ni duplicados de orden.
 */
export const authoringAnswerOptionSchema = z
  .object({
    content: authoringAnswerOptionContentSchema,
    isCorrect: z.boolean(),
  })
  .strict();

/**
 * T1 -- creación de una pregunta completa (identidad + versión `DRAFT` +
 * alternativas), en UNA operación transaccional.
 *
 * `questionKey` es la clave humana estable de la IDENTIDAD
 * (`question.question_key`, `@unique`). No es el `id`: es la etiqueta
 * editorial, y es lo único que el autor nombra.
 *
 * Nótese que NO hay campo de estado: §8.2 T1 dice "crea la versión,
 * `publishedAt` nulo". Nace en `DRAFT` y no hay forma de pedir otra cosa.
 */
export const editorialCreateQuestionRequestSchema = z
  .object({
    questionKey: z.string().trim().min(1).max(200),
    primarySubjectId: z.string().uuid(),
    curriculumTopicId: z.string().uuid(),
    stemContent: authoringResourceContentBlocksSchema,
    explanationContent: authoringExplanationContentSchema,
    answerOptions: z.array(authoringAnswerOptionSchema).min(1),
    operationId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

/**
 * T1 sobre una identidad de pregunta YA EXISTENTE: crea una versión `DRAFT`
 * NUEVA de la misma pregunta. Es la forma canónica de CORREGIR contenido
 * publicado (invariante 5, `CMS-025`): nunca se reedita lo publicado, siempre
 * se crea una versión nueva que después recorrerá T3 -> T5 -> T7, y en T7 la
 * anterior se despublica dentro de la misma transacción (§8.6, invariante 16).
 */
export const editorialCreateQuestionVersionRequestSchema = z
  .object({
    curriculumTopicId: z.string().uuid(),
    stemContent: authoringResourceContentBlocksSchema,
    explanationContent: authoringExplanationContentSchema,
    answerOptions: z.array(authoringAnswerOptionSchema).min(1),
    operationId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

/** T1 -- recurso de aprendizaje (identidad + versión `DRAFT`). */
export const editorialCreateLearningResourceRequestSchema = z
  .object({
    resourceKey: z.string().trim().min(1).max(200),
    primarySubjectId: z.string().uuid(),
    /**
     * Los DOS valores reales del enum `LearningResourceType`
     * (`schema.prisma`: "acotado a 2 valores para M1, no los 12 del Data
     * Model"). No se añade ninguno: ampliar el enum sería una decisión Nivel
     * 2/3 separada, no una extensión silenciosa desde el contrato editorial.
     */
    resourceType: z.enum(['LESSON', 'CONCEPT_EXPLANATION']),
    curriculumTopicId: z.string().uuid(),
    title: z.string().trim().min(1).max(300),
    contentBlocks: authoringResourceContentBlocksSchema,
    operationId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

/** T1 -- versión `DRAFT` nueva de un recurso ya existente (corrección). */
export const editorialCreateLearningResourceVersionRequestSchema = z
  .object({
    curriculumTopicId: z.string().uuid(),
    title: z.string().trim().min(1).max(300),
    contentBlocks: authoringResourceContentBlocksSchema,
    operationId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

/**
 * T2 -- edición de una versión de pregunta que está en `DRAFT`.
 *
 * REEMPLAZO COMPLETO del conjunto de alternativas cuando se envía, no parche
 * por alternativa: cuál es la correcta depende de todas ellas, y un parche
 * individual haría representable un estado intermedio con cero o dos
 * correctas. Reemplazar el conjunto entero hace que cada T2 deje la versión en
 * un estado íntegro.
 *
 * Las columnas que NO aparecen aquí no son editables por T2 en ningún caso:
 * `id`, `questionId`, `editorialStatus`, `publishedAt`, `createdAt`. Son
 * exactamente las que §8.4 congela sobre una fila publicada; aquí se excluyen
 * por la misma razón de fondo: la identidad de una versión y su historia no
 * son contenido. `curriculumTopicId` SÍ es editable en `DRAFT` -- §8.4 la
 * congela solo cuando la fila ya está publicada, y la "clasificación
 * curricular completa" que CMS-013 exige es precisamente lo que el autor
 * ajusta mientras el borrador vive.
 */
export const editorialUpdateQuestionVersionRequestSchema = z
  .object({
    curriculumTopicId: z.string().uuid().optional(),
    stemContent: authoringResourceContentBlocksSchema.optional(),
    explanationContent: authoringExplanationContentSchema.optional(),
    answerOptions: z.array(authoringAnswerOptionSchema).min(1).optional(),
    operationId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

/** T2 -- edición de una versión de recurso en `DRAFT`. Mismo criterio. */
export const editorialUpdateLearningResourceVersionRequestSchema = z
  .object({
    curriculumTopicId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(300).optional(),
    contentBlocks: authoringResourceContentBlocksSchema.optional(),
    operationId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

// ============================================================================
// CONTENT-4.2A -- Taxonomía editorial (Subject / CurriculumTopic).
// Cierra la dependencia bloqueante detectada por la auditoría de
// CONTENT-4.2: `editorialCreateQuestionRequestSchema`/
// `editorialCreateLearningResourceRequestSchema` (arriba) exigen
// `primarySubjectId`/`curriculumTopicId` YA EXISTENTES -- estos dos
// endpoints son la única forma autorizada de resolver/crear esos UUIDs sin
// Prisma directo ni seed.ts. Semántica idempotente por clave estable
// (`subjectKey`/`code`), nunca un upsert que oculte una contradicción --
// ver `EditorialTaxonomyService`. `created` distingue CREATED (true) de
// NO-OP (false); una contradicción estructural es un 409, nunca una
// escritura silenciosa.
// ============================================================================

export const editorialResolveSubjectRequestSchema = z
  .object({
    subjectKey: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    shortName: z.string().trim().min(1).max(20),
    displayOrder: z.number().int().positive(),
  })
  .strict();
export type EditorialResolveSubjectRequest = z.infer<typeof editorialResolveSubjectRequestSchema>;

export const editorialSubjectResponseSchema = z.object({
  id: z.string().uuid(),
  subjectKey: z.string(),
  name: z.string(),
  shortName: z.string(),
  displayOrder: z.number().int(),
  /** `true` si esta petición creó el Subject; `false` si ya existía idéntico (NO-OP). */
  created: z.boolean(),
});
export type EditorialSubjectResponse = z.infer<typeof editorialSubjectResponseSchema>;

/**
 * `parentId` ausente/`null` = raíz (Unidad, CONTENT-2). `parentId` presente
 * = hijo (Recurso). Sin límite de profundidad declarado aquí -- lo permite
 * el propio modelo `CurriculumTopic` (auto-relación); CONTENT-2 solo usa 2
 * niveles hoy, pero este contrato no lo asume.
 */
export const editorialResolveCurriculumTopicRequestSchema = z
  .object({
    code: z.string().trim().min(1).max(200),
    name: z.string().trim().min(1).max(300),
    order: z.number().int().positive(),
    subjectId: z.string().uuid(),
    parentId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type EditorialResolveCurriculumTopicRequest = z.infer<typeof editorialResolveCurriculumTopicRequestSchema>;

export const editorialCurriculumTopicResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  order: z.number().int(),
  subjectId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  /** `true` si esta petición creó el CurriculumTopic; `false` si ya existía idéntico (NO-OP). */
  created: z.boolean(),
});
export type EditorialCurriculumTopicResponse = z.infer<typeof editorialCurriculumTopicResponseSchema>;

/**
 * Respuesta de T1/T2. Devuelve REFERENCIAS, nunca contenido académico: este
 * controller no es un lector de contenido (§11.1, invariante 8) y en
 * particular NUNCA devuelve `isCorrect` -- el mismo criterio que hace que
 * `answerOptionPublicResponseSchema` lo omita en EDUCATION.
 */
export const editorialAuthoringResponseSchema = z.object({
  objectType: z.enum(['QUESTION_VERSION', 'LEARNING_RESOURCE_VERSION']),
  /** `question.id` o `learning_resource.id` -- la identidad lógica estable. */
  identityId: z.string().uuid(),
  versionId: z.string().uuid(),
  /** Siempre `DRAFT`, en T1 y en T2. Se devuelve para que sea comprobable. */
  editorialStatus: z.literal('DRAFT'),
  adminActionId: z.string().uuid(),
  /** `true` si la petición se reconoció como repetición por clave de idempotencia. */
  idempotentReplay: z.boolean(),
});

export type AuthoringAnswerOption = z.infer<typeof authoringAnswerOptionSchema>;
export type EditorialCreateQuestionRequest = z.infer<typeof editorialCreateQuestionRequestSchema>;
export type EditorialCreateQuestionVersionRequest = z.infer<typeof editorialCreateQuestionVersionRequestSchema>;
export type EditorialCreateLearningResourceRequest = z.infer<typeof editorialCreateLearningResourceRequestSchema>;
export type EditorialCreateLearningResourceVersionRequest = z.infer<
  typeof editorialCreateLearningResourceVersionRequestSchema
>;
export type EditorialUpdateQuestionVersionRequest = z.infer<typeof editorialUpdateQuestionVersionRequestSchema>;
export type EditorialUpdateLearningResourceVersionRequest = z.infer<
  typeof editorialUpdateLearningResourceVersionRequestSchema
>;
export type EditorialAuthoringResponse = z.infer<typeof editorialAuthoringResponseSchema>;

// ============================================================================
// LECTURA ADMINISTRATIVA COMPLETA -- CONTENT-4.2B.
//
// A diferencia de `editorialAuthoringResponseSchema` (que deliberadamente NO
// expone contenido, invariante 8) y de los lectores de ESTUDIANTE en
// `education.ts` (que deliberadamente NO exponen `isCorrect`), estos dos
// esquemas son la lectura de la versión PUBLISHED actual con TODO el
// contenido editorial, `isCorrect` incluido -- necesaria para que una
// pipeline de importación (CONTENT-4.2) pueda decidir CREATE/NO-OP/NEW
// VERSION comparando la fuente contra lo publicado sin usar el endpoint de
// estudiante. Solo alcanzable con `x-admin-token` + rol AUTHOR o PUBLISHER
// (mismo guard que el resto de `administration/editorial`, nunca `AuthGuard`
// de estudiante). Se reutilizan los bloques de AUTORÍA (`authoring*Schema`)
// en vez de duplicar una tercera familia de esquemas de contenido.
// ============================================================================

export const editorialQuestionReadResponseSchema = z.object({
  questionId: z.string().uuid(),
  questionKey: z.string(),
  /** `null` si la identidad no tiene ninguna versión PUBLISHED todavía. */
  publishedVersion: z
    .object({
      versionId: z.string().uuid(),
      editorialStatus: z.literal('PUBLISHED'),
      stemContent: authoringResourceContentBlocksSchema,
      explanationContent: authoringExplanationContentSchema,
      answerOptions: z.array(authoringAnswerOptionSchema).min(1),
    })
    .nullable(),
});
export type EditorialQuestionReadResponse = z.infer<typeof editorialQuestionReadResponseSchema>;

export const editorialLearningResourceReadResponseSchema = z.object({
  resourceId: z.string().uuid(),
  resourceKey: z.string(),
  resourceType: z.enum(['LESSON', 'CONCEPT_EXPLANATION']),
  publishedVersion: z
    .object({
      versionId: z.string().uuid(),
      editorialStatus: z.literal('PUBLISHED'),
      title: z.string(),
      contentBlocks: authoringResourceContentBlocksSchema,
    })
    .nullable(),
});
export type EditorialLearningResourceReadResponse = z.infer<typeof editorialLearningResourceReadResponseSchema>;
