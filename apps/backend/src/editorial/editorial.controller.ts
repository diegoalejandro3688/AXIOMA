import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  adminActionListResponseSchema,
  editorialTransitionRequestSchema,
  editorialTransitionResponseSchema,
  type AdminActionListResponse,
  type EditorialTransitionResponse,
} from '@axioma/contracts';
import { AdminAuthGuard, type AdminAuthenticatedRequest } from '../administration/admin-auth.guard';
import { AdminRoleGuard } from '../administration/admin-role.guard';
import { RequireAdminRole } from '../administration/require-admin-role.decorator';
import { AdminActionRepository, type AdminActionWithActors } from '../administration/admin-action.repository';
import { EditorialTransitionService } from '../education/editorial-transition.service';
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
 *  - NO crea contenido, NO edita contenido, NO implementa T1, T2 ni T3, y NO
 *    contiene ninguna validación de CMS-013: todo eso es el Incremento 4
 *    (DG-12, Opción C). No existe ninguna ruta productiva adelantada de I4.
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
  ) {}

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
