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
