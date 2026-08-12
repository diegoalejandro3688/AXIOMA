import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AiConversationRepository } from './ai-conversation.repository';
import { AiMessageRepository } from './ai-message.repository';
import { AiEntitlementService } from './ai-entitlement.service';
import { AiConversationService } from './ai-conversation.service';
import { AiConversationController } from './ai-conversation.controller';
import { AI_PROVIDER } from './ai-provider';
import { FakeAiProvider } from './fake-ai-provider';
import { AnthropicAiProvider } from './anthropic-ai-provider';

/**
 * LEF Bloque VI, Incremento 1/2 -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md
 * §7/§21/§22. `AI_PROVIDER` se resuelve según `AI_PROVIDER_IMPL`
 * (default "fake"): mismo patrón de `useFactory` condicional que
 * `AuthModule`/`IDENTITY_PROVIDER` -- `AnthropicAiProvider` se construye
 * manualmente y SOLO cuando `AI_PROVIDER_IMPL=anthropic`, para que nunca se
 * instancie de forma eager (ni intente leer `ANTHROPIC_API_KEY`) cuando el
 * modo activo es "fake" (gates ordinarios, desarrollo sin credenciales).
 * Ninguna de las dos implementaciones cambia el símbolo `AI_PROVIDER` ni el
 * contrato `AiProvider` -- `AiConversationService`/el controller no conocen
 * cuál está activa.
 */
@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [AiConversationController],
  providers: [
    AiConversationRepository,
    AiMessageRepository,
    AiEntitlementService,
    AiConversationService,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const impl = config.get<string>('AI_PROVIDER_IMPL', 'fake');
        if (impl === 'anthropic') return new AnthropicAiProvider(config);
        return new FakeAiProvider();
      },
    },
  ],
  exports: [AiConversationService],
})
export class AiModule {}
