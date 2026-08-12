import { BadRequestException, Controller, Get, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalOpsGuard } from '../platform/internal-ops/internal-ops.guard';
import { AiEntitlementService, type AiTier } from './ai-entitlement.service';
import { AiCircuitBreakerService } from './ai-circuit-breaker.service';
import { FakeAiProvider } from './fake-ai-provider';

/**
 * Endpoints operativos internos del Tutor IA (Incremento 3) -- mismo
 * criterio EXACTO que `DiagnosticsController`: protegidos por
 * `InternalOpsGuard` Y, además, rechazados en producción incluso con la
 * clave correcta (nunca alcanzable con tráfico real). Usados por
 * `scripts/verify-ai-quota-gate.ts` para demostrar el comportamiento
 * PREMIUM y el circuit breaker sin billing real y sin reiniciar el proceso.
 */
@Controller('ai/_internal')
export class AiInternalAdminController {
  constructor(
    private readonly config: ConfigService,
    private readonly entitlementService: AiEntitlementService,
    private readonly circuitBreaker: AiCircuitBreakerService,
    private readonly fakeProvider: FakeAiProvider,
  ) {}

  private rejectInProduction(): void {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
  }

  /**
   * Fija (o limpia, con `tier` ausente) el tier de UNA cuenta de prueba, en
   * memoria -- ver `AiEntitlementService.testOnlyTierOverride`. Nunca crea
   * ni simula una tabla de suscripción/billing.
   */
  @Post('set-tier-override')
  @UseGuards(InternalOpsGuard)
  setTierOverride(@Query('accountId') accountId?: string, @Query('tier') tier?: string): { ok: true } {
    this.rejectInProduction();
    if (!accountId) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'accountId requerido.' });
    if (tier !== undefined && tier !== 'FREE' && tier !== 'PREMIUM') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'tier debe ser FREE o PREMIUM.' });
    }
    this.entitlementService.setTestOnlyTierOverride(accountId, (tier as AiTier) ?? null);
    return { ok: true };
  }

  /** Activa/desactiva el circuit breaker de generación -- ver `AiCircuitBreakerService`. */
  @Post('set-circuit-breaker')
  @UseGuards(InternalOpsGuard)
  setCircuitBreaker(@Query('disabled') disabled?: string): { ok: true } {
    this.rejectInProduction();
    if (disabled !== 'true' && disabled !== 'false') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'disabled debe ser "true" o "false".' });
    }
    this.circuitBreaker.setGenerationDisabled(disabled === 'true');
    return { ok: true };
  }

  /**
   * Cuántas veces `FakeAiProvider.generateReply` fue invocado físicamente
   * con un contenido exacto -- ver reporte de auditoría de concurrencia real
   * del Incremento 3 ("provider called exactly once"). Solo mide
   * FakeAiProvider (siempre la instancia real registrada en DI, ver
   * ai.module.ts); en producción con AI_PROVIDER_IMPL=anthropic el conteo es
   * irrelevante (endpoint de todas formas inalcanzable).
   */
  @Get('fake-provider-call-count')
  @UseGuards(InternalOpsGuard)
  getFakeProviderCallCount(@Query('content') content?: string): { count: number } {
    this.rejectInProduction();
    if (!content) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'content requerido.' });
    return { count: this.fakeProvider.getCallCount(content) };
  }
}
