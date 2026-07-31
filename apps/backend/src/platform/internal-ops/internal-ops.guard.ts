import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const OPS_KEY_HEADER = 'x-internal-ops-key';

/**
 * Protege endpoints operativos internos (ej. disparar barridos manualmente)
 * con una clave compartida -- no es autenticación de usuario, es una
 * herramienta de operación para el equipo, separada de AuthGuard.
 *
 * Movido de privacy/ a platform/ en ADR-0006: ANALYTICS también lo usa para
 * sus propios endpoints internos (_internal/relay, _internal/summary) --
 * es infraestructura compartida por operación interna, no propiedad de un
 * solo dominio. Sin cambios de comportamiento respecto a ADR-0005.
 */
@Injectable()
export class InternalOpsGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[OPS_KEY_HEADER];
    const expected = this.config.get<string>('INTERNAL_OPS_KEY');

    if (!expected) {
      throw new UnauthorizedException('INTERNAL_OPS_KEY no configurada');
    }
    if (typeof provided !== 'string' || provided !== expected) {
      throw new UnauthorizedException('Clave de operación inválida');
    }
    return true;
  }
}
