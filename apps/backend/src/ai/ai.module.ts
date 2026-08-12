import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { AiConversationRepository } from './ai-conversation.repository';
import { AiMessageRepository } from './ai-message.repository';
import { AiUsageLedgerRepository } from './ai-usage-ledger.repository';
import { AiGenerationClaimRepository } from './ai-generation-claim.repository';
import { AiEntitlementService } from './ai-entitlement.service';
import { AiCircuitBreakerService } from './ai-circuit-breaker.service';
import { AiConversationService } from './ai-conversation.service';
import { AiConversationController } from './ai-conversation.controller';
import { AiInternalAdminController } from './ai-internal-admin.controller';
import { AI_PROVIDER } from './ai-provider';
import { FakeAiProvider } from './fake-ai-provider';
import { AnthropicAiProvider } from './anthropic-ai-provider';

/**
 * LEF Bloque VI, Incrementos 1-3 -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md
 * §7/§21/§22. `AI_PROVIDER` se resuelve según `AI_PROVIDER_IMPL`
 * (default "fake"): mismo patrón de `useFactory` condicional que
 * `AuthModule`/`IDENTITY_PROVIDER` -- `AnthropicAiProvider` se construye
 * manualmente y SOLO cuando `AI_PROVIDER_IMPL=anthropic`, para que nunca se
 * instancie de forma eager (ni intente leer `ANTHROPIC_API_KEY`) cuando el
 * modo activo es "fake" (gates ordinarios, desarrollo sin credenciales).
 * Ninguna de las dos implementaciones cambia el símbolo `AI_PROVIDER` ni el
 * contrato `AiProvider` -- `AiConversationService`/el controller no conocen
 * cuál está activa.
 *
 * `AiInternalAdminController` (Incremento 3) -- endpoints operativos
 * internos (override de tier/circuit breaker para el gate), mismo criterio
 * que `DiagnosticsController`: `InternalOpsGuard` + rechazo explícito en
 * producción, nunca alcanzable con tráfico real.
 */
@Module({
  imports: [AuthModule, ConfigModule, InternalOpsModule],
  controllers: [AiConversationController, AiInternalAdminController],
  providers: [
    AiConversationRepository,
    AiMessageRepository,
    AiUsageLedgerRepository,
    AiGenerationClaimRepository,
    AiEntitlementService,
    AiCircuitBreakerService,
    AiConversationService,
    // Registrado como provider normal (singleton de Nest) -- necesario para que
    // AiInternalAdminController pueda inyectar la MISMA instancia (contador de
    // invocaciones para el gate de concurrencia, Incremento 3) sin pasar por el
    // token AI_PROVIDER (que en producción podría resolver a AnthropicAiProvider).
    FakeAiProvider,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, FakeAiProvider],
      useFactory: (config: ConfigService, fakeProvider: FakeAiProvider) => {
        const impl = config.get<string>('AI_PROVIDER_IMPL', 'fake');
        if (impl === 'anthropic') return new AnthropicAiProvider(config);
        return fakeProvider;
      },
    },
  ],
  exports: [AiConversationService],
})
export class AiModule {}
