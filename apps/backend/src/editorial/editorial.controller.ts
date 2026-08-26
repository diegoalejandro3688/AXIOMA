import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  adminActionListResponseSchema,
  editorialAuthoringResponseSchema,
  editorialCreateLearningResourceRequestSchema,
  editorialCreateLearningResourceVersionRequestSchema,
  editorialCreateQuestionRequestSchema,
  editorialCreateQuestionVersionRequestSchema,
  editorialTransitionRequestSchema,
  editorialTransitionResponseSchema,
  editorialUpdateLearningResourceVersionRequestSchema,
  editorialUpdateQuestionVersionRequestSchema,
  editorialResolveSubjectRequestSchema,
  editorialSubjectResponseSchema,
  editorialResolveCurriculumTopicRequestSchema,
  editorialCurriculumTopicResponseSchema,
  type AdminActionListResponse,
  type EditorialAuthoringResponse,
  type EditorialTransitionResponse,
  type EditorialSubjectResponse,
  type EditorialCurriculumTopicResponse,
} from '@axioma/contracts';
import { AdminAuthGuard, type AdminAuthenticatedRequest } from '../administration/admin-auth.guard';
import { AdminRoleGuard } from '../administration/admin-role.guard';
import { RequireAdminRole } from '../administration/require-admin-role.decorator';
import { AdminActionRepository, type AdminActionWithActors } from '../administration/admin-action.repository';
import { EditorialTransitionService } from '../education/editorial-transition.service';
import { EditorialAuthoringService } from '../education/editorial-authoring.service';
import { EditorialTaxonomyService } from '../education/editorial-taxonomy.service';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import type { AdminActionObjectType } from '../generated/prisma/client';

/**
 * API editorial administrativa -- LEF Bloque VII, Incremento 3.
 * Ver LEF-BLOCK-VII-DEFINITION.md §12.3 (frontera) y §13.3 (criterios).
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES ESTE ARCHIVO, EXACTAMENTE -- invariante 15
 * ---------------------------------------------------------------------------
 * Una FACHADA HTTP autenticada, y nada más. **La capa administrativa SOLICITA;
 * EDUCATION valida sus propios invariantes y ejecuta la transición**
 * (MC §6.24, "Solo Education publica"). Aquí no hay ni una decisión de
 * dominio: no se resuelve ninguna transición, no se comprueba ningún estado,
 * no se aplica CMS-018 y no se escribe en ningún repositorio de EDUCATION.
 * Todo eso vive en `education/editorial-transition.service.ts`.
 *
 * ---------------------------------------------------------------------------
 * FRONTERA -- lo que este controller NO hace
 * ---------------------------------------------------------------------------
 *  - Incremento 4 (§12.4): SE AÑADEN las rutas de T1 (crear borrador) y T2
 *    (editar en DRAFT). T3 (DRAFT -> IN_REVIEW) NO estrena ruta propia: es una
 *    transición de §8.2 y viaja por el mismo endpoint de transiciones que
 *    T4..T8, con `targetStatus: 'IN_REVIEW'`. Las validaciones de CMS-013 son
 *    su precondición y viven en EDUCATION, no aquí -- este archivo sigue sin
 *    contener ni una decisión de dominio.
 *  - NO expone la Content Coverage Matrix (Incremento 5).
 *  - NO importa contenido (CMS-026..029, diferido).
 *  - NO activa la excepción de CMS-018 por HTTP: activarla es un acto
 *    deliberado fuera de banda, por CLI (§8.5, condición 1). Aquí solo puede
 *    USARSE una activación ya existente, nombrándola explícitamente.
 *  - NO devuelve NINGÚN dato de `Account`, `StudentResponse`,
 *    `AiConversation`, `AiMessage` ni de PROGRESS/GAMIFICATION/PRIVACY
 *    (§11.4). Este archivo no importa nada de esos dominios.
 *  - NO devuelve contenido académico: la auditoría guarda REFERENCIAS, nunca
 *    copias (§9.3).
 *  - NO usa `InternalOpsGuard` (decisión B) ni `AuthGuard` (sesión de
 *    estudiante). Solo la identidad administrativa del Incremento 2, reusada
 *    sin reimplementarse.
 */
@Controller('administration/editorial')
@UseGuards(AdminAuthGuard, AdminRoleGuard)
export class EditorialController {
  constructor(
    private readonly transitions: EditorialTransitionService,
    private readonly actionRepo: AdminActionRepository,
    /** Incremento 4 -- T1 y T2. Autoridad de dominio en EDUCATION (invariante 15). */
    private readonly authoring: EditorialAuthoringService,
    /** CONTENT-4.2A -- resolución/creación idempotente de Subject/CurriculumTopic. */
    private readonly taxonomy: EditorialTaxonomyService,
  ) {}

  // ==========================================================================
  // CONTENT-4.2A -- TAXONOMÍA (Subject / CurriculumTopic). Cierra la
  // dependencia bloqueante de CONTENT-4.2: T1 exige `primarySubjectId`/
  // `curriculumTopicId` ya existentes; estos dos endpoints son la única
  // forma autorizada de resolverlos/crearlos sin Prisma directo.
  //
  // `@RequireAdminRole('AUTHOR')` -- mismo criterio que T1: crear taxonomía
  // es autoría, nunca publicación. Semántica idempotente (CREATED/NO-OP),
  // nunca upsert destructivo -- una contradicción estructural es 409
  // (`ConflictException`, ver `EditorialTaxonomyService`), no una
  // sobrescritura silenciosa.
  // ==========================================================================

  @Post('subjects')
  @RequireAdminRole('AUTHOR')
  async resolveSubject(@Body() body: unknown): Promise<EditorialSubjectResponse> {
    const input = parseRequestBody(editorialResolveSubjectRequestSchema, body);
    const { subject, created } = await this.taxonomy.resolveOrCreateSubject(input);
    return editorialSubjectResponseSchema.parse({
      id: subject.id,
      subjectKey: subject.subjectKey,
      name: subject.name,
      shortName: subject.shortName,
      displayOrder: subject.displayOrder,
      created,
    });
  }

  @Post('curriculum-topics')
  @RequireAdminRole('AUTHOR')
  async resolveCurriculumTopic(@Body() body: unknown): Promise<EditorialCurriculumTopicResponse> {
    const input = parseRequestBody(editorialResolveCurriculumTopicRequestSchema, body);
    const { topic, created } = await this.taxonomy.resolveOrCreateCurriculumTopic(input);
    return editorialCurriculumTopicResponseSchema.parse({
      id: topic.id,
      code: topic.code,
      name: topic.name,
      order: topic.order,
      subjectId: topic.subjectId,
      parentId: topic.parentId,
      created,
    });
  }

  // ==========================================================================
  // T1 -- CREAR BORRADOR. LEF Bloque VII, Incremento 4 (§8.2 fila T1, §12.4).
  //
  // `@RequireAdminRole('AUTHOR')` -- EXCLUSIVO del Autor, sin `'PUBLISHER'`.
  // No es un descuido ni un endurecimiento inventado: §9.2 le niega T1/T2/T3 al
  // Publicador de forma literal ("crear/editar contenido -- menor privilegio,
  // ADMIN-004") y §7.2 lo repite ("Editar el contenido de una versión, ni en
  // DRAFT -- eso es del Autor"). Un actor que tenga AMBOS roles pasa por ser
  // Autor, no por ser Publicador.
  //
  // Ninguna de estas rutas admite `editorialStatus` ni `id`: el contrato no los
  // declara y `.strict()` rechaza el intento. Crear en PUBLISHED no es
  // representable (invariante 5, §8.4).
  // ==========================================================================

  /** T1 -- pregunta nueva: identidad + versión `DRAFT` + alternativas, en una transacción. */
  @Post('questions')
  @RequireAdminRole('AUTHOR')
  async createQuestion(
    @Req() request: AdminAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<EditorialAuthoringResponse> {
    const input = parseRequestBody(editorialCreateQuestionRequestSchema, body);
    const result = await this.authoring.createQuestion(request.adminActor, input);
    return editorialAuthoringResponseSchema.parse(result);
  }

  /**
   * T1 -- versión `DRAFT` NUEVA de una pregunta existente.
   *
   * Ésta es la ruta de CORRECCIÓN de contenido publicado (invariante 5,
   * `CMS-025`): no existe, y no existirá, ninguna ruta que edite una versión
   * publicada. Corregir es siempre crear una versión nueva.
   */
  @Post('questions/:questionId/versions')
  @RequireAdminRole('AUTHOR')
  async createQuestionVersion(
    @Req() request: AdminAuthenticatedRequest,
    @Param('questionId', new ParseUUIDPipe()) questionId: string,
    @Body() body: unknown,
  ): Promise<EditorialAuthoringResponse> {
    const input = parseRequestBody(editorialCreateQuestionVersionRequestSchema, body);
    const result = await this.authoring.createQuestionVersion(request.adminActor, questionId, input);
    return editorialAuthoringResponseSchema.parse(result);
  }

  /** T1 -- recurso de aprendizaje nuevo. §8.2/§8.4 tratan ambas familias en paralelo. */
  @Post('learning-resources')
  @RequireAdminRole('AUTHOR')
  async createLearningResource(
    @Req() request: AdminAuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<EditorialAuthoringResponse> {
    const input = parseRequestBody(editorialCreateLearningResourceRequestSchema, body);
    const result = await this.authoring.createLearningResource(request.adminActor, input);
    return editorialAuthoringResponseSchema.parse(result);
  }

  /** T1 -- versión `DRAFT` nueva de un recurso existente (corrección). */
  @Post('learning-resources/:resourceId/versions')
  @RequireAdminRole('AUTHOR')
  async createLearningResourceVersion(
    @Req() request: AdminAuthenticatedRequest,
    @Param('resourceId', new ParseUUIDPipe()) resourceId: string,
    @Body() body: unknown,
  ): Promise<EditorialAuthoringResponse> {
    const input = parseRequestBody(editorialCreateLearningResourceVersionRequestSchema, body);
    const result = await this.authoring.createLearningResourceVersion(request.adminActor, resourceId, input);
    return editorialAuthoringResponseSchema.parse(result);
  }

  // ==========================================================================
  // T2 -- EDITAR EN `DRAFT` (§8.2 fila T2, §12.4).
  //
  // `PATCH` y no `PUT`: la petición admite enviar solo los campos que cambian.
  // Lo que NO es parcial es el conjunto de alternativas -- si se envía, se
  // reemplaza entero (ver el contrato). El servicio rechaza la edición si la
  // versión no está en `DRAFT`; PostgreSQL es la defensa final en cuanto la
  // versión alcanza publicación (triggers del Incremento 1).
  // ==========================================================================

  @Patch('question-versions/:versionId')
  @RequireAdminRole('AUTHOR')
  async updateQuestionVersion(
    @Req() request: AdminAuthenticatedRequest,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Body() body: unknown,
  ): Promise<EditorialAuthoringResponse> {
    const input = parseRequestBody(editorialUpdateQuestionVersionRequestSchema, body);
    const result = await this.authoring.updateQuestionVersion(request.adminActor, versionId, input);
    return editorialAuthoringResponseSchema.parse(result);
  }

  @Patch('learning-resource-versions/:versionId')
  @RequireAdminRole('AUTHOR')
  async updateLearningResourceVersion(
    @Req() request: AdminAuthenticatedRequest,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Body() body: unknown,
  ): Promise<EditorialAuthoringResponse> {
    const input = parseRequestBody(editorialUpdateLearningResourceVersionRequestSchema, body);
    const result = await this.authoring.updateLearningResourceVersion(request.adminActor, versionId, input);
    return editorialAuthoringResponseSchema.parse(result);
  }

  /**
   * Transición de una `question_version`.
   *
   * UN endpoint por familia de objeto, con el estado destino EXPLÍCITO en el
   * cuerpo, en vez de un endpoint por transición. Es lo que permite cumplir
   * §13.3 punto 5 literalmente: cada transición prohibida —incluida
   * "cualquier destino ARCHIVED desde cualquier estado"— recibe un **rechazo
   * explícito de la máquina de estados**, y no un 404 de ruta inexistente que
   * no distinguiría "prohibido" de "no existe".
   *
   * `@RequireAdminRole('AUTHOR', 'PUBLISHER')` es la puerta gruesa: exige ser
   * un actor administrativo con al menos uno de los dos roles. La
   * autorización FINA por transición (T5..T8 son del Publicador; T4 admite al
   * Autor propietario) la aplica el servicio de dominio -- invariante 7:
   * "API (guard) + servicio (autorización por operación)".
   */
  @Post('question-versions/:versionId/transitions')
  @RequireAdminRole('AUTHOR', 'PUBLISHER')
  async transitionQuestionVersion(
    @Req() request: AdminAuthenticatedRequest,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Body() body: unknown,
  ): Promise<EditorialTransitionResponse> {
    const input = editorialTransitionRequestSchema.parse(body);
    const result = await this.transitions.transition(request.adminActor, {
      objectType: 'QUESTION_VERSION',
      versionId,
      ...input,
    });
    return editorialTransitionResponseSchema.parse(result);
  }

  /** Ídem para `learning_resource_version`: §8.2 y §8.4 tratan ambas familias en paralelo. */
  @Post('learning-resource-versions/:versionId/transitions')
  @RequireAdminRole('AUTHOR', 'PUBLISHER')
  async transitionLearningResourceVersion(
    @Req() request: AdminAuthenticatedRequest,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Body() body: unknown,
  ): Promise<EditorialTransitionResponse> {
    const input = editorialTransitionRequestSchema.parse(body);
    const result = await this.transitions.transition(request.adminActor, {
      objectType: 'LEARNING_RESOURCE_VERSION',
      versionId,
      ...input,
    });
    return editorialTransitionResponseSchema.parse(result);
  }

  /**
   * Auditoría de un objeto -- §13.3 punto 8 exige que cada transición produzca
   * "exactamente un registro con los nueve campos de §9.3", lo que solo es
   * verificable si el registro es consultable.
   *
   * Solo lectura. No hay ninguna ruta de escritura, actualización ni borrado
   * sobre `admin_action`: es append-only, y PostgreSQL lo aplica
   * (`admin_action_immutable`).
   */
  @Get('actions')
  @RequireAdminRole('AUTHOR', 'PUBLISHER')
  async listActions(
    @Query('objectType') objectType: string,
    @Query('objectId', new ParseUUIDPipe()) objectId: string,
  ): Promise<AdminActionListResponse> {
    const actions = await this.actionRepo.findByObject(objectType as AdminActionObjectType, objectId);
    return adminActionListResponseSchema.parse({ actions: actions.map((a) => this.project(a)) });
  }

  /**
   * Usos de la excepción de CMS-018 -- §8.5: "el uso de la excepción es un
   * tipo de evento DISTINGUIBLE Y CONSULTABLE, de modo que 'cuántas
   * publicaciones se hicieron bajo excepción' sea una pregunta respondible sin
   * leer código". Este endpoint ES esa respuesta.
   */
  @Get('cms018-exception-uses')
  @RequireAdminRole('AUTHOR', 'PUBLISHER')
  async listCms018ExceptionUses(): Promise<AdminActionListResponse> {
    const actions = await this.actionRepo.findCms018ExceptionUses();
    return adminActionListResponseSchema.parse({ actions: actions.map((a) => this.project(a)) });
  }

  /**
   * Proyección de los nueve campos de §9.3. El noveno solo aparece cuando la
   * excepción se usó, y entonces lleva AMBOS actores (§8.5, condición 2).
   */
  private project(action: AdminActionWithActors) {
    return {
      id: action.id,
      actorId: action.actorId,
      actorDisplayName: action.actor.displayName,
      roleExercised: action.roleExercised,
      occurredAt: action.occurredAt.toISOString(),
      actionType: action.actionType,
      objectType: action.objectType,
      objectId: action.objectId,
      previousStatus: action.previousStatus,
      newStatus: action.newStatus,
      reason: action.reason,
      operationId: action.operationId,
      cms018Exception: action.cms018Activation
        ? {
            activationId: action.cms018Activation.id,
            activatedByActorId: action.cms018Activation.activatedByActorId,
            activatedByDisplayName: action.cms018Activation.activatedByActor.displayName,
            usedByActorId: action.actorId,
            usedByDisplayName: action.actor.displayName,
            activationReason: action.cms018Activation.activationReason,
          }
        : null,
    };
  }
}
