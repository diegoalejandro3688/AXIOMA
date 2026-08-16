import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { adminMeResponseSchema, type AdminMeResponse } from '@axioma/contracts';
import { AdminAuthGuard, type AdminAuthenticatedRequest } from './admin-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';
import { RequireAdminRole } from './require-admin-role.decorator';

/**
 * `GET /administration/me` -- LEF Bloque VII, Incremento 2.
 * Ver LEF-BLOCK-VII-DEFINITION.md §12.2: "el incremento cierra con un
 * endpoint administrativo trivial (p. ej. 'quién soy') que demuestra el
 * guard, la identidad, la resolución de rol por el backend y el registro de
 * acceso".
 *
 * Convención de ruta tomada de `AiStatusController` (`GET /ai/me/status`,
 * Bloque VI): superficie `me`, 100 % de LECTURA.
 *
 * ---------------------------------------------------------------------------
 * FRONTERA -- lo que este controller NO hace, y no puede empezar a hacer sin
 * abrir un incremento nuevo:
 *   - NO crea, edita, aprueba, publica ni retira contenido. Cero escrituras
 *     sobre EDUCATION (Incrementos 3 y 4).
 *   - NO expone la Content Coverage Matrix (Incremento 5).
 *   - NO importa contenido (CMS-026..029, diferido).
 *   - NO gestiona actores ni roles por HTTP (ADMIN-005..009, fuera de alcance):
 *     crear un actor es exclusivamente el CLI de bootstrap, sin superficie web.
 *   - NO devuelve NINGÚN dato de `Account`, `StudentResponse`,
 *     `AiConversation`, `AiMessage` ni de PROGRESS/GAMIFICATION/PRIVACY
 *     (§11.4, §13.2 punto 10). Este archivo no importa nada de esos dominios.
 *   - NO devuelve el token en claro, su hash, su id, sus fechas ni ningún
 *     otro secreto: la respuesta se recorta con `adminMeResponseSchema`, que
 *     es una whitelist estricta de tres campos.
 * ---------------------------------------------------------------------------
 */
@Controller('administration/me')
@UseGuards(AdminAuthGuard, AdminRoleGuard)
export class AdministrationController {
  /**
   * Identidad administrativa del portador del token. Exige credencial válida,
   * pero ningún rol concreto: los dos roles de V1 son igualmente legítimos
   * para preguntar "quién soy".
   */
  @Get()
  me(@Req() request: AdminAuthenticatedRequest): AdminMeResponse {
    return this.project(request);
  }

  /**
   * Sondas de autorización por rol. Cero semántica de dominio: devuelven la
   * MISMA identidad que `GET /administration/me` y no leen ni escriben nada
   * más.
   *
   * Existen porque el Incremento 2 todavía no tiene ninguna operación
   * editorial que proteger, y un decorador de rol que se entregara sin una
   * sola ruta que lo ejerza sería código muerto no probado -- justo lo que
   * §13.2 puntos 2 y 3 exigen demostrar ("con actor válido pero sin el rol
   * requerido -> rechazo; con el rol correcto -> acceso concedido").
   *
   * Los Incrementos 3-4 las sustituyen por las transiciones reales (T1..T8),
   * que son las rutas a las que este mapa rol->operación está destinado.
   */
  @Get('authoring-access')
  @RequireAdminRole('AUTHOR')
  authoringAccess(@Req() request: AdminAuthenticatedRequest): AdminMeResponse {
    return this.project(request);
  }

  @Get('publishing-access')
  @RequireAdminRole('PUBLISHER')
  publishingAccess(@Req() request: AdminAuthenticatedRequest): AdminMeResponse {
    return this.project(request);
  }

  /**
   * Proyección única. `request.adminActor` lo escribió `AdminAuthGuard` a
   * partir de la base -- nunca a partir del request. `tokenId` existe en la
   * identidad interna y se DESCARTA aquí deliberadamente.
   */
  private project(request: AdminAuthenticatedRequest): AdminMeResponse {
    return adminMeResponseSchema.parse({
      actorId: request.adminActor.actorId,
      displayName: request.adminActor.displayName,
      roles: request.adminActor.roles,
    });
  }
}
