import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminRole } from '../generated/prisma/client';
import { REQUIRED_ADMIN_ROLES } from './require-admin-role.decorator';
import type { AdminAuthenticatedRequest } from './admin-auth.guard';

/**
 * Autorización por rol. Se ejecuta SIEMPRE después de `AdminAuthGuard`
 * (orden de `@UseGuards`), sobre la identidad que el servidor ya resolvió.
 *
 * Semántica exigida por §13.2 y por el diseño del incremento:
 *   - credencial inválida/expirada/revocada/actor inactivo -> 401 (lo cubre
 *     `AdminAuthGuard`, que este guard nunca alcanza a contradecir);
 *   - actor autenticado SIN el rol requerido -> 403.
 *
 * Los roles evaluados son EXCLUSIVAMENTE `request.adminActor.roles`, que
 * `AdminIdentityService` leyó de `admin_actor_role` en esta misma request.
 * Este guard no lee headers, no lee el body y no lee la query: no existe
 * ningún camino por el que un rol enviado por el cliente llegue hasta aquí.
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[] | undefined>(REQUIRED_ADMIN_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Ruta sin exigencia de rol: basta con estar autenticado como AdminActor.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AdminAuthenticatedRequest>();
    const actor = request.adminActor;

    // Defensa en profundidad: si este guard se aplicara sin AdminAuthGuard
    // delante, no hay identidad que autorizar -- se rechaza, nunca se asume.
    if (!actor) {
      throw new UnauthorizedException('Credencial administrativa inválida.');
    }

    if (!required.some((role) => actor.roles.includes(role))) {
      throw new ForbiddenException('El actor administrativo no tiene el rol requerido para esta operación.');
    }

    return true;
  }
}
