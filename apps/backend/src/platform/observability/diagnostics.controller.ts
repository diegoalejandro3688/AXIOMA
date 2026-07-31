import { Controller, Logger, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalOpsGuard } from '../internal-ops/internal-ops.guard';

/**
 * Endpoints de diagnóstico para verificar, con evidencia real (no solo en el
 * papel), que el logging estructurado y el filtro global de excepciones
 * funcionan como se documenta en ADR-0007 -- usados por
 * scripts/verify-observability-gate.ts. Protegidos por InternalOpsGuard Y,
 * además, rechazados en producción incluso con la clave correcta (mismo
 * criterio que AUTH_IDENTITY_PROVIDER=stub en auth.module.ts): esto nunca
 * debe ser alcanzable con tráfico real.
 */
@Controller('platform/_internal/diagnostics')
export class DiagnosticsController {
  private readonly logger = new Logger(DiagnosticsController.name);

  constructor(private readonly config: ConfigService) {}

  private rejectInProduction(): void {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
  }

  /** Lanza una excepción no manejada deliberada -- para probar el camino 500 genérico. */
  @Post('throw')
  @UseGuards(InternalOpsGuard)
  throwUnhandled(): never {
    this.rejectInProduction();
    throw new Error('Error de diagnóstico deliberado (ADR-0007) -- nunca debería verse en producción.');
  }

  /**
   * Loguea una carga deliberadamente "difícil" (Error, BigInt, referencia
   * circular, claves sensibles) -- para probar que la serialización nunca
   * lanza y que la sanitización redacta secretos conocidos.
   */
  @Post('log-tricky')
  @UseGuards(InternalOpsGuard)
  logTricky(): { ok: true } {
    this.rejectInProduction();

    const circular: Record<string, unknown> = { name: 'circular' };
    circular.self = circular;

    this.logger.log('diagnóstico: carga difícil de serializar', {
      circular,
      bigNumber: 9_007_199_254_740_993n,
      errorSample: new Error('error de muestra'),
      authorization: 'Bearer secreto-no-debe-aparecer',
      idToken: 'token.no.debe.aparecer',
      password: 'hunter2-no-debe-aparecer',
      internalOpsKey: 'ops-key-no-debe-aparecer',
      analyticsActorSecret: 'actor-secret-no-debe-aparecer',
      nested: { cookie: 'session=no-debe-aparecer' },
    });

    return { ok: true };
  }
}
