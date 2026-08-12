/**
 * Abstracción de proveedor de IA -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md
 * §7/§13, invariante 3: "Anthropic vive exclusivamente detrás de una
 * abstracción de proveedor propia". Ningún archivo de dominio ni controller
 * debe importar un SDK de proveedor directamente -- siempre a través de
 * este contrato.
 *
 * La decisión del Product Owner para el Incremento 1 adelanta la EXISTENCIA
 * de esta interfaz y de una implementación fake/determinista (`FakeAiProvider`)
 * respecto de `LEF-BLOCK-VI-DEFINITION.md` §21, que originalmente reservaba
 * "cualquier llamada real o fake a un proveedor de IA" para el Incremento 2.
 * Reconciliación (ver reporte de cierre de este incremento): I1 introduce la
 * interfaz + la implementación fake (determinista, sin red, sin SDK); I2
 * sigue siendo el lugar donde se añade la implementación REAL de Anthropic
 * detrás de esta misma interfaz -- ninguna llamada real ni SDK se introduce
 * en este incremento.
 */
export interface AiProviderMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

/**
 * Metadata técnica OPCIONAL de la llamada real -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §22 (revisión, Incremento 3). NUNCA
 * incluye contenido conversacional (eso es `AiProviderReply.content`,
 * persistido únicamente en `AiMessage`). `inputTokens`/`outputTokens` son
 * `null` cuando el proveedor no los provee (`FakeAiProvider`) -- el llamador
 * (`AiConversationService`) los persiste tal cual, sin inventar un valor.
 *
 * `provider`/`model`/`promptVersion` los reporta CADA implementación sobre
 * sí misma -- `AiConversationService` los persiste tal cual en el ledger sin
 * inferirlos ni conocer qué proveedor concreto está activo (mantiene la
 * frontera de la interfaz: el dominio nunca sabe si es Anthropic o el fake).
 */
export interface AiProviderUsage {
  provider: string;
  model: string;
  promptVersion: string;
  attempts: number;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
}

export interface AiProviderReply {
  content: string;
  /** Ausente = el proveedor no reporta metadata de uso (compatibilidad hacia atrás con I1/I2, nunca obligatorio). */
  usage?: AiProviderUsage;
}

/**
 * Categorías internas de fallo técnico -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md
 * §22 e Incremento 2 (mapeo de errores). Uso EXCLUSIVAMENTE interno
 * (reintento/observabilidad): `AiConversationService` solo distingue
 * `instanceof AiProviderTechnicalError` (siempre 503 genérico al cliente),
 * nunca expone `category` ni `message` por HTTP -- el contrato público no
 * cambia respecto a I1.
 */
export type AiProviderErrorCategory =
  | 'timeout'
  | 'transient_provider_error'
  | 'provider_rate_limited'
  | 'provider_auth_error'
  | 'provider_invalid_request'
  | 'provider_unavailable'
  | 'unknown_provider_error';

/** Lanzado por una implementación de `AiProvider` ante un fallo técnico (timeout, red, error del proveedor) -- nunca ante un bloqueo de seguridad (fuera de alcance de I1). */
export class AiProviderTechnicalError extends Error {
  readonly category: AiProviderErrorCategory;

  constructor(message: string, category: AiProviderErrorCategory = 'unknown_provider_error') {
    super(message);
    this.category = category;
  }
}

export interface AiProvider {
  /**
   * `history` es la conversación previa YA persistida (sin el mensaje nuevo);
   * `newMessage` es el contenido del mensaje que se está procesando ahora.
   * Debe lanzar `AiProviderTechnicalError` ante cualquier fallo -- nunca
   * devolver una respuesta parcial silenciosa.
   */
  generateReply(history: AiProviderMessage[], newMessage: string): Promise<AiProviderReply>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
