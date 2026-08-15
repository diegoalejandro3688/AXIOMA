import { BadRequestException, Controller, Get, Inject, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalOpsGuard } from '../platform/internal-ops/internal-ops.guard';
import { AiEntitlementService, type AiTier } from './ai-entitlement.service';
import { AiCircuitBreakerService } from './ai-circuit-breaker.service';
import { AI_PROVIDER, type AiProvider } from './ai-provider';
import { FakeAiProvider } from './fake-ai-provider';
import { AXIOMA_TUTOR_PROMPT_VERSION } from './ai-pedagogy';

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
    @Inject(AI_PROVIDER) private readonly activeProvider: AiProvider,
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

  /**
   * Pone a CERO el contador de invocaciones físicas de UN contenido exacto --
   * ver `FakeAiProvider.resetCallCount` para la causa raíz (incidente
   * 2026-08-13: los sentinels CONSTANTES acumulaban cuenta entre corridas
   * sucesivas del mismo gate contra el mismo proceso de backend, haciendo
   * intermitente a `B3s-4` de `verify-ai-safety-gate.ts`). Permite que un
   * gate aísle su propia corrida SIN relajar su aserción ("exactamente 1
   * invocación") y sin reiniciar el proceso del backend -- mismo criterio y
   * mismas garantías que `set-tier-override`/`set-circuit-breaker`
   * (`InternalOpsGuard` + rechazo explícito en producción).
   */
  @Post('reset-fake-provider-call-count')
  @UseGuards(InternalOpsGuard)
  resetFakeProviderCallCount(@Query('content') content?: string): { ok: true } {
    this.rejectInProduction();
    if (!content) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'content requerido.' });
    this.fakeProvider.resetCallCount(content);
    return { ok: true };
  }

  /**
   * Qué implementación de `AiProvider` resolvió REALMENTE la DI de este
   * proceso (`ai.module.ts`, `useFactory` sobre `AI_PROVIDER_IMPL`).
   *
   * Precondición obligatoria de IDENTIDAD DE PROCESO introducida tras el
   * incidente del 2026-08-13 (ver
   * `experiments/tutor-pedagogy-v5-eval/INCIDENT-v4-leak-during-v5-prep.md`):
   * un puerto abierto NUNCA es evidencia suficiente de que el backend que
   * escucha es el que uno cree. Un runner/gate que asume "el puerto responde,
   * luego es mi proceso fake" puede acabar emitiendo llamadas PAGADAS contra
   * un backend real ajeno -- que es exactamente lo que pasó.
   *
   * `provider` NO se deriva de leer la variable de entorno, sino de la
   * INSTANCIA realmente inyectada bajo el token `AI_PROVIDER`: es la única
   * lectura que no puede mentir si el entorno y la DI divergieran.
   * `configured` se devuelve aparte, solo como diagnóstico de esa divergencia.
   *
   * `promptVersion` (añadido con `AXIOMA_TUTOR_V6_1`) extiende esa MISMA
   * precondición de identidad a la otra variable que puede divergir sin que el
   * puerto lo delate: QUÉ TEXTO de instrucciones tiene realmente cargado el
   * proceso que escucha. Hasta V6 la versión de prompt solo era observable A
   * POSTERIORI, leyendo `ai_usage_ledger.prompt_version` en `_summary.json` --
   * es decir, después de haber pagado la llamada. Se lee de la constante
   * `AXIOMA_TUTOR_PROMPT_VERSION` que el propio proceso tiene en memoria (la
   * misma que `AnthropicAiProvider` escribe en el ledger), nunca de una
   * variable de entorno ni del disco del runner: es la única lectura que no
   * puede mentir si el árbol de trabajo y el proceso levantado divergieran
   * (backend viejo todavía en pie después de editar el prompt).
   *
   * Solo lectura, sin efectos. Mismas garantías que el resto del controller
   * (`InternalOpsGuard` + rechazo en producción); nunca expone la API key ni
   * ningún otro secreto -- únicamente el nombre de la implementación activa y
   * el identificador de versión de prompt, que no es material sensible (ya
   * viaja al ledger en cada generación).
   */
  @Get('effective-provider')
  @UseGuards(InternalOpsGuard)
  getEffectiveProvider(): { provider: 'fake' | 'anthropic'; impl: string; configured: string; promptVersion: string } {
    this.rejectInProduction();
    const isFake = this.activeProvider instanceof FakeAiProvider;
    return {
      provider: isFake ? 'fake' : 'anthropic',
      impl: this.activeProvider.constructor.name,
      configured: this.config.get<string>('AI_PROVIDER_IMPL', 'fake'),
      promptVersion: AXIOMA_TUTOR_PROMPT_VERSION,
    };
  }

  /**
   * Invocaciones físicas TOTALES de `FakeAiProvider.generateReply` desde el
   * arranque del proceso (Incremento 8) -- permite al gate de
   * `GET /ai/me/status` demostrar CERO llamadas al proveedor en una
   * operación que no tiene `content` con el que consultar el contador por
   * contenido. Mismas garantías que el resto de este controller
   * (`InternalOpsGuard` + rechazo en producción).
   */
  @Get('fake-provider-total-call-count')
  @UseGuards(InternalOpsGuard)
  getFakeProviderTotalCallCount(): { count: number } {
    this.rejectInProduction();
    return { count: this.fakeProvider.getTotalCallCount() };
  }

  /**
   * Qué `academicContext` recibió exactamente `FakeAiProvider.generateReply`
   * para un contenido exacto -- ver reporte de cierre del Incremento 4
   * ("FakeAiProvider recibe únicamente contexto esperado"). `undefined` =
   * ese contenido nunca se envió; `null` = se envió sin contexto académico.
   */
  @Get('fake-provider-last-context')
  @UseGuards(InternalOpsGuard)
  getFakeProviderLastContext(@Query('content') content?: string): { context: unknown } {
    this.rejectInProduction();
    if (!content) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'content requerido.' });
    return { context: this.fakeProvider.getLastReceivedContext(content) ?? null };
  }

  /**
   * Qué `assistanceMode` recibió exactamente `FakeAiProvider.generateReply`
   * para un contenido exacto -- ver reporte de cierre del Incremento 5
   * ("WORKED_SOLUTION nunca llega al proveedor sin solicitud explícita").
   * `undefined` = ese contenido nunca se envió; `null` = se envió sin modo
   * explícito (progresión por defecto).
   */
  @Get('fake-provider-last-mode')
  @UseGuards(InternalOpsGuard)
  getFakeProviderLastMode(@Query('content') content?: string): { mode: unknown } {
    this.rejectInProduction();
    if (!content) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'content requerido.' });
    return { mode: this.fakeProvider.getLastReceivedMode(content) ?? null };
  }
}
