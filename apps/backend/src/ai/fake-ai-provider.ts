import { Injectable } from '@nestjs/common';
import { AiProviderTechnicalError, type AiAcademicContext, type AiAssistanceMode, type AiProvider, type AiProviderMessage, type AiProviderReply } from './ai-provider';

/**
 * Sentinel de entrada que fuerza un fallo técnico determinista -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §21/gate del Incremento 1 ("failure
 * controlado del fake provider"). Exportado explícitamente para que el gate
 * lo use sin depender de un flag de entorno oculto -- el fallo es una
 * función pura del contenido del mensaje, 100% reproducible.
 */
export const FAKE_AI_PROVIDER_FAILURE_TRIGGER = '__FAKE_AI_PROVIDER_FORCE_FAILURE__';

/**
 * Prefijo de entrada que fuerza EXACTAMENTE un fallo técnico y luego éxito
 * determinista para el MISMO contenido -- ver reporte de cierre del
 * Incremento 3 ("retry de una operación pendiente que finalmente consume").
 * Necesario porque `AiConversationService` reintenta la generación
 * reusando el `content` YA persistido del mensaje USER (nunca acepta
 * contenido nuevo en un retry) -- `FAKE_AI_PROVIDER_FAILURE_TRIGGER` por sí
 * solo no puede probar "falla una vez, luego tiene éxito" porque su fallo es
 * permanente para ese contenido exacto. Estado en memoria por instancia del
 * proceso (nunca persistido) -- cada string distinto con este prefijo tiene
 * su propio contador independiente.
 */
export const FAKE_AI_PROVIDER_FAIL_ONCE_PREFIX = '__FAKE_AI_PROVIDER_FAIL_ONCE__';

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
  private readonly failOnceAttempts = new Map<string, number>();
  /** Contador de invocaciones físicas por contenido exacto -- ver reporte de auditoría de concurrencia del Incremento 3 ("provider called exactly once"), expuesto solo para gates vía AiInternalAdminController. */
  private readonly callCounts = new Map<string, number>();
  /** Incremento 4 -- último `academicContext` recibido para un contenido exacto, expuesto SOLO para gates (inspección exacta de qué llegó a la abstracción de proveedor, nunca usado por AiConversationService). */
  private readonly lastReceivedContext = new Map<string, AiAcademicContext | null | undefined>();
  /** Incremento 5 -- último `assistanceMode` recibido para un contenido exacto, expuesto SOLO para gates (ver AiInternalAdminController.getFakeProviderLastMode). Permite verificar, sin proveedor real, que WORKED_SOLUTION nunca llega sin solicitud explícita del estudiante. */
  private readonly lastReceivedMode = new Map<string, AiAssistanceMode | null | undefined>();

  /** Solo para gates -- nunca usado por AiConversationService. */
  getCallCount(content: string): number {
    return this.callCounts.get(content) ?? 0;
  }

  /** Solo para gates -- nunca usado por AiConversationService. */
  getLastReceivedContext(content: string): AiAcademicContext | null | undefined {
    return this.lastReceivedContext.get(content);
  }

  /** Solo para gates -- nunca usado por AiConversationService. */
  getLastReceivedMode(content: string): AiAssistanceMode | null | undefined {
    return this.lastReceivedMode.get(content);
  }

  async generateReply(
    _history: AiProviderMessage[],
    newMessage: string,
    academicContext?: AiAcademicContext | null,
    assistanceMode?: AiAssistanceMode | null,
  ): Promise<AiProviderReply> {
    this.callCounts.set(newMessage, (this.callCounts.get(newMessage) ?? 0) + 1);
    this.lastReceivedContext.set(newMessage, academicContext);
    this.lastReceivedMode.set(newMessage, assistanceMode);
    if (newMessage === FAKE_AI_PROVIDER_FAILURE_TRIGGER) {
      throw new AiProviderTechnicalError('Fallo técnico simulado por FakeAiProvider (solo para gates/desarrollo).');
    }
    if (newMessage.startsWith(FAKE_AI_PROVIDER_FAIL_ONCE_PREFIX)) {
      const attempts = this.failOnceAttempts.get(newMessage) ?? 0;
      this.failOnceAttempts.set(newMessage, attempts + 1);
      if (attempts === 0) {
        throw new AiProviderTechnicalError('Fallo técnico simulado (una sola vez) por FakeAiProvider (solo para gates/desarrollo).');
      }
    }
    return {
      content: `[FakeAiProvider -- respuesta determinista de prueba] Recibido: "${newMessage}"`,
      // Incremento 3: usage determinista y explícito -- sin tokens reales (nunca inventados), 1 intento siempre, latencia ~0.
      usage: { provider: 'fake', model: 'fake', promptVersion: 'fake', attempts: 1, inputTokens: null, outputTokens: null, latencyMs: 0 },
    };
  }
}
