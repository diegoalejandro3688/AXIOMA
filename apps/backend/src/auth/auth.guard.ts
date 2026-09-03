import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

export interface AuthenticatedRequest extends Request {
  accountId: string;
  accountStatus: string;
  sessionId: string;
}

const SESSION_HEADER = 'x-session-id';
/** `AuthSession.id` es `@default(uuid())` -- cualquier otra cosa es una credencial malformada. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Exige X-Session-Id: el sessionId opaco de ZETRYND (UUID v4, no adivinable)
 * es la ÚNICA credencial de las peticiones autenticadas -- ver RC1A
 * (docs/adr/ZETRYND-V1-RC1A-AUTH-SESSION-LIFECYCLE.md). El idToken de
 * Firebase se verifica UNA sola vez, al crear la sesión (`POST /auth/session`);
 * no vuelve a pedirse aquí porque expira en ~1 h mientras la sesión de
 * ZETRYND vive 30 días, y `validateSession` ya valida propiedad, expiración,
 * revocación y `sessionVersion` sobre el propio registro de sesión. Un
 * header `Authorization` entrante se ignora (compatibilidad hacia atrás).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const sessionId = request.headers[SESSION_HEADER];
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      throw new UnauthorizedException('Falta X-Session-Id');
    }
    // Credencial malformada (no-UUID) -> 401 uniforme, nunca un 500 de Prisma.
    if (!UUID_RE.test(sessionId)) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const result = await this.authService.validateSession(sessionId);

    request.accountId = result.accountId;
    request.accountStatus = result.status;
    request.sessionId = result.sessionId;

    return true;
  }
}
