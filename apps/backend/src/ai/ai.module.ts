import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiConversationRepository } from './ai-conversation.repository';
import { AiMessageRepository } from './ai-message.repository';
import { AiEntitlementService } from './ai-entitlement.service';
import { AiConversationService } from './ai-conversation.service';
import { AiConversationController } from './ai-conversation.controller';
import { AI_PROVIDER } from './ai-provider';
import { FakeAiProvider } from './fake-ai-provider';

/**
 * LEF Bloque VI, Incremento 1 -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md
 * §7/§21. `AI_PROVIDER` se registra aquí como `FakeAiProvider` -- el
 * Incremento 2 añadirá `AnthropicTutorProvider` detrás del mismo token,
 * nunca cambia el símbolo ni el contrato `AiProvider`, así que ningún
 * consumidor (`AiConversationService`) necesita cambiar cuando eso ocurra.
 */
@Module({
  imports: [AuthModule],
  controllers: [AiConversationController],
  providers: [
    AiConversationRepository,
    AiMessageRepository,
    AiEntitlementService,
    AiConversationService,
    { provide: AI_PROVIDER, useClass: FakeAiProvider },
  ],
  exports: [AiConversationService],
})
export class AiModule {}
