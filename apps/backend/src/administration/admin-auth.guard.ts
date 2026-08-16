import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AdminIdentityService, type AuthenticatedAdminActor } from './admin-identity.service';

/**
 * Cabecera explícita y documentada de la credencial administrativa personal.
 * Deliberadamente distinta de `authorization` (estudiante, ADR-0004) y de
 * `x-internal-ops-key` (clave COMPARTIDA de operación interna): tres
 * cabeceras distintas para tres sujetos distintos, sin solapamiento posible.
 */
export const ADMIN_TOKEN_HEADER = 'x-admin-token';

/**
 * Request con identidad administrativa adjunta. Mismo patrón que
 * `AuthenticatedRequest` de `auth/auth.guard.ts` (propiedades adjuntadas al
 * request por el guard) -- se replica el ESTILO, no se reutiliza el guard ni
 * se mezclan las dos identidades: un `AdminAuthenticatedRequest` NUNCA lleva
 * `accountId` ni `sessionId`.
 */
export interface AdminAuthenticatedRequest extends Request {
  adminActor: AuthenticatedAdminActor;
}

/**
 * Mensaje ÚNICO para los cinco motivos de rechazo (sin token, token
 * desconocido, expirado, revocado, actor desactivado).
 *
 * Es deliberado: distinguirlos públicamente le diría a un atacante si un
 * token existió alguna vez, si acaba de expirar o si la persona sigue en el
 * equipo. El motivo real se conserva ÍNTEGRO en `admin_access_log`, que es
 * donde el equipo puede consultarlo.
 */
const GENERIC_401 = 'Credencial administrativa inválida.';

/**
 * LEF Bloque VII, Incremento 2 -- guard administrativo propio.
 * Ver LEF-BLOCK-VII-DEFINITION.md §9.5, §12.2, §13.2.
 *
 * SEPARACIÓN, verificada por gate estático:
 *  - NO extiende, importa ni invoca `AuthGuard` (sesión de estudiante). Un
 *    `Account` no obtiene acceso administrativo por ninguna vía.
 *  - NO extiende, importa ni invoca `InternalOpsGuard`. `INTERNAL_OPS_KEY`
 *    es una clave COMPARTIDA -- exactamente lo que ADMIN-002 prohíbe ("no se
 *    utilizarán cuentas administrativas compartidas") y lo que decisión B
 *    excluye expresamente de lo editorial. Presentarla aquí no autentica.
 *  - NO crea ninguna sesión de servidor. La autenticación es stateless:
 *    cabecera -> hash -> búsqueda indexada en `admin_actor_token` -> actor ->
 *    roles. No hay tabla de sesión administrativa, ni cookie, ni caché.
 *
 * Rechazo por defecto (§9.5): sin token, token desconocido, revocado,
 * expirado o actor desactivado -> 401. Nunca acceso anónimo ni "degradado".
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly identityService: AdminIdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminAuthenticatedRequest>();

    const provided = request.headers[ADMIN_TOKEN_HEADER];
    if (typeof provided !== 'string' || provided.length === 0) {
      throw new UnauthorizedException(GENERIC_401);
    }

    const result = await this.identityService.authenticate(provided, request.path);
    if (!result.ok) {
      // El motivo granular (`result.reason`) NO viaja a la respuesta y NO se
      // loguea aquí: ya quedó en `admin_access_log`, que es append-only.
      throw new UnauthorizedException(GENERIC_401);
    }

    // Identidad resuelta por el SERVIDOR. Se sobrescribe cualquier valor que
    // el request pudiera traer: nada de lo que llegue del cliente sobrevive.
    request.adminActor = result.actor;
    return true;
  }
}
