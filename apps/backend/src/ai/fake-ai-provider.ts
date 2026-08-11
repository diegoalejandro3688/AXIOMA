import { Injectable } from '@nestjs/common';
import { AiProviderTechnicalError, type AiProvider, type AiProviderMessage, type AiProviderReply } from './ai-provider';

/**
 * Sentinel de entrada que fuerza un fallo técnico determinista -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §21/gate del Incremento 1 ("failure
 * controlado del fake provider"). Exportado explícitamente para que el gate
 * lo use sin depender de un flag de entorno oculto -- el fallo es una
 * función pura del contenido del mensaje, 100% reproducible.
 */
export const FAKE_AI_PROVIDER_FAILURE_TRIGGER = '__FAKE_AI_PROVIDER_FORCE_FAILURE__';

/**
 * Implementación fake/determinista de `AiProvider` -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §7 (mismo espíritu que
 * `StubIdentityProvider` en AUTH). Sin red, sin SDK, sin variabilidad --
 * permite que el dominio del Tutor se gatee de forma repetible sin depender
 * de Anthropic (invariante 5 del bloque). Deliberadamente NO intenta
 * simular pedagogía real -- la respuesta es reconocible como contenido de
 * prueba/desarrollo, nunca podría confundirse con una respuesta real del
 * Tutor.
 */
@Injectable()
export class FakeAiProvider implements AiProvider {
  async generateReply(_history: AiProviderMessage[], newMessage: string): Promise<AiProviderReply> {
    if (newMessage === FAKE_AI_PROVIDER_FAILURE_TRIGGER) {
      throw new AiProviderTechnicalError('Fallo técnico simulado por FakeAiProvider (solo para gates/desarrollo).');
    }
    return { content: `[FakeAiProvider -- respuesta determinista de prueba] Recibido: "${newMessage}"` };
  }
}
