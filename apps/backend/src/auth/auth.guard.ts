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

/**
 * Exige idToken de Firebase (Authorization: Bearer) + X-Session-Id.
 * Valida la sesión específica (propiedad, expiración, revocación,
 * sessionVersion) -- nunca "cualquier sesión activa de la cuenta".
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de autorización');
    }
    const idToken = authHeader.slice('Bearer '.length);

    const sessionId = request.headers[SESSION_HEADER];
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      throw new UnauthorizedException('Falta X-Session-Id');
    }

    const result = await this.authService.validateSession(idToken, sessionId);

    request.accountId = result.accountId;
    request.accountStatus = result.status;
    request.sessionId = result.sessionId;

    return true;
  }
}
