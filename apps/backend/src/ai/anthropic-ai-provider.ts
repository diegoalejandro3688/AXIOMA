import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AiProviderTechnicalError,
  type AiAcademicContext,
  type AiAssistanceMode,
  type AiProvider,
  type AiProviderErrorCategory,
  type AiProviderMessage,
  type AiProviderReply,
} from './ai-provider';
import { AXIOMA_TUTOR_PROMPT_VERSION, buildSystemPrompt } from './ai-pedagogy';

/** Reexportado por compatibilidad de nombre histórico (I2 usaba este identificador) -- ver `ai-pedagogy.ts` para la fuente de verdad real, ya en `AXIOMA_TUTOR_V2` desde Incremento 5. */
export const AXIOMA_TUTOR_SYSTEM_PROMPT_VERSION = AXIOMA_TUTOR_PROMPT_VERSION;

const RETRY_ELIGIBLE_CATEGORIES: ReadonlySet<AiProviderErrorCategory> = new Set([
  'transient_provider_error',
  'provider_rate_limited',
  'provider_unavailable',
]);

/**
 * Presupuesto mínimo (ms) para que valga la pena iniciar el reintento
 * técnico -- decisión de ingeniería, no contractual (el Product Owner fijó
 * el presupuesto TOTAL de 8000ms; este valor solo evita iniciar un segundo
 * intento con tan poco tiempo restante que fallaría por timeout casi con
 * certeza). Documentado explícitamente en el reporte de cierre.
 */
const MIN_RETRY_BUDGET_MS = 1000;

function toAnthropicRole(role: 'USER' | 'ASSISTANT'): 'user' | 'assistant' {
  return role === 'USER' ? 'user' : 'assistant';
}

function classifyError(error: unknown): { category: AiProviderErrorCategory; safeMessage: string } {
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return { category: 'timeout', safeMessage: 'El proveedor de IA no respondió dentro del presupuesto de tiempo asignado.' };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { category: 'provider_rate_limited', safeMessage: 'El proveedor de IA alcanzó un límite de tasa.' };
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return { category: 'provider_auth_error', safeMessage: 'Fallo de autenticación/configuración con el proveedor de IA.' };
  }
  if (
    error instanceof Anthropic.BadRequestError ||
    error instanceof Anthropic.UnprocessableEntityError ||
    error instanceof Anthropic.NotFoundError
  ) {
    return { category: 'provider_invalid_request', safeMessage: 'El proveedor de IA rechazó la solicitud por inválida.' };
  }
  if (error instanceof Anthropic.InternalServerError) {
    return { category: 'provider_unavailable', safeMessage: 'El proveedor de IA reportó una falla interna.' };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { category: 'transient_provider_error', safeMessage: 'Fallo de transporte/red al contactar al proveedor de IA.' };
  }
  return { category: 'unknown_provider_error', safeMessage: 'Fallo técnico no clasificado del proveedor de IA.' };
}

/**
 * Implementación REAL de `AiProvider` contra la API de Anthropic (SDK
 * oficial `@anthropic-ai/sdk`) -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md
 * §22, Incremento 2. Único archivo de dominio que importa el SDK de
 * Anthropic; `AiConversationService`/el controller no conocen su existencia
 * (siguen dependiendo solo de `AI_PROVIDER`/`AiProvider`).
 *
 * Semántica de timeout/reintento (decisión EXACTA del Product Owner, ver
 * reporte de cierre del Incremento 2): presupuesto TOTAL wall-clock de
 * `timeoutMs` (default 8000) para la operación lógica completa. Máximo 2
 * intentos físicos (inicial + 1 reintento técnico), ambos comparten el mismo
 * deadline absoluto -- nunca se reinicia el reloj. El reintento recibe
 * únicamente el tiempo restante hasta el deadline; si no queda presupuesto
 * razonable (`MIN_RETRY_BUDGET_MS`), no se inicia. Solo las categorías en
 * `RETRY_ELIGIBLE_CATEGORIES` son elegibles -- timeout, error de
 * autenticación/configuración, solicitud inválida y error no clasificado
 * NUNCA se reintentan automáticamente.
 *
 * `maxOutputTokens` (default 512) -- AUDITADO explícitamente en el
 * Incremento 3 (no se cambia por intuición, ver reporte de cierre):
 * - Coste: acota el gasto máximo por llamada de forma predecible,
 *   proporcional a la cuota diaria (3/50 consultas) -- un techo generoso por
 *   consulta no es grave cuando el NÚMERO de consultas ya está acotado por
 *   cuenta y día.
 * - UX: ~350-450 palabras es suficiente para una explicación o pista
 *   tutorial completa y enfocada en una interfaz conversacional; una
 *   respuesta más larga sistemáticamente sugeriría que falta dividir la
 *   interacción en turnos, no que falte presupuesto de tokens.
 * - DG-1: la evidencia disponible (`experiments/dg1-tutor-provider-eval/results/`)
 *   es cualitativa (calidad pedagógica vía revisión humana), sin conteo de
 *   tokens/longitud -- no ofrece una referencia cuantitativa mejor que 512.
 * - Sonnet 5: 512 está muy por debajo de cualquier límite técnico del
 *   modelo; el riesgo aceptado es que una derivación paso a paso
 *   excepcionalmente larga corte en `stop_reason: "max_tokens"` -- tradeoff
 *   consciente para V1, no un error.
 * Conclusión: se MANTIENE 512 como política V1 explícita y revisable (no
 * partida por tier -- ninguna decisión de producto exige que Premium
 * reciba respuestas más largas todavía), no como un valor heredado sin
 * revisar. El propio ledger de este incremento (`ai_usage_ledger.outputTokens`)
 * es la fuente de evidencia real para reabrir esta decisión más adelante.
 *
 * Incremento 3 (ver reporte de cierre): `generateReply` ahora puebla
 * `AiProviderReply.usage` (attempts/inputTokens/outputTokens/latencyMs) a
 * partir de `response.usage`, exactamente el campo que I2 documentó como
 * "descartado deliberadamente" -- I3 empieza a consumirlo SIN rediseñar esta
 * clase ni `AiProvider` (el campo ya era opcional desde I2). Sigue sin
 * incluir contenido conversacional: `usage` nunca lleva prompt/mensaje/
 * respuesta, solo metadata numérica de coste/latencia.
 */
@Injectable()
export class AnthropicAiProvider implements AiProvider {
  private readonly logger = new Logger(AnthropicAiProvider.name);
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;

  /**
   * `injectedClient` existe EXCLUSIVAMENTE para el gate de integración
   * (pruebas deterministas de la lógica de deadline/reintento/clasificación
   * de errores sin red real, ver
   * `scripts/verify-ai-anthropic-integration-gate.ts`) -- el camino
   * productivo (`ai.module.ts`) nunca lo pasa, siempre construye el cliente
   * real internamente.
   */
  constructor(config: ConfigService, injectedClient?: Anthropic) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY', '');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY no está configurada -- requerida cuando AI_PROVIDER_IMPL=anthropic.');
    }
    this.model = config.get<string>('ANTHROPIC_MODEL', 'claude-sonnet-5');
    this.timeoutMs = Number(config.get<string>('ANTHROPIC_TIMEOUT_MS', '8000'));
    // PROVISIONAL -- ver docstring de la clase. No inferir de este valor ningún límite adicional Free/Premium.
    this.maxOutputTokens = Number(config.get<string>('ANTHROPIC_MAX_OUTPUT_TOKENS', '512'));

    // maxRetries: 0 -- el reintento propio (deadline-aware) reemplaza por completo el reintento incorporado del SDK,
    // que no conoce nuestro presupuesto total ni nuestra política de categorías elegibles.
    this.client = injectedClient ?? new Anthropic({ apiKey, maxRetries: 0 });
  }

  async generateReply(
    history: AiProviderMessage[],
    newMessage: string,
    academicContext?: AiAcademicContext | null,
    assistanceMode?: AiAssistanceMode | null,
  ): Promise<AiProviderReply> {
    const operationStartedAt = Date.now();
    const deadline = operationStartedAt + this.timeoutMs;
    const messages = [...history.map((m) => ({ role: toAnthropicRole(m.role), content: m.content })), { role: 'user' as const, content: newMessage }];
    const systemPrompt = buildSystemPrompt({ academicContext, assistanceMode });

    let lastError: { category: AiProviderErrorCategory; safeMessage: string } | undefined;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        this.logObservability({ attempt, durationMs: 0, result: 'timeout' });
        throw new AiProviderTechnicalError('Se agotó el presupuesto total de tiempo antes de iniciar el intento.', 'timeout');
      }

      const startedAt = Date.now();
      try {
        const response = await this.client.messages.create(
          {
            model: this.model,
            max_tokens: this.maxOutputTokens,
            system: systemPrompt,
            messages,
          },
          { timeout: remainingMs, maxRetries: 0 },
        );

        // Incremento 6 (seguridad general, categoría C -- ver ai-pedagogy.ts) -- Anthropic puede rehusarse a
        // generar contenido por su propia política de seguridad, señalado por `stop_reason: 'refusal'`, INDEPENDIENTE
        // de cualquier excepción del SDK (la llamada HTTP en sí fue exitosa). Tratado igual que cualquier otro fallo
        // técnico -- degradación controlada uniforme, nunca se muestra al estudiante contenido parcial de un rechazo
        // de seguridad, nunca se intenta "reformular" automáticamente para evadirlo.
        if (response.stop_reason === 'refusal') {
          this.logObservability({ attempt, durationMs: Date.now() - startedAt, result: 'provider_safety_refusal' });
          throw new AiProviderTechnicalError('El proveedor de IA rehusó generar una respuesta para esta solicitud.', 'provider_safety_refusal');
        }

        const text = response.content
          .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
          .map((block) => block.text)
          .join('');

        this.logObservability({ attempt, durationMs: Date.now() - startedAt, result: 'success' });

        if (!text) {
          throw new AiProviderTechnicalError('El proveedor de IA no devolvió contenido de texto utilizable.', 'unknown_provider_error');
        }
        return {
          content: text,
          usage: {
            provider: 'anthropic',
            model: this.model,
            promptVersion: AXIOMA_TUTOR_SYSTEM_PROMPT_VERSION,
            attempts: attempt,
            inputTokens: response.usage?.input_tokens ?? null,
            outputTokens: response.usage?.output_tokens ?? null,
            latencyMs: Date.now() - operationStartedAt,
          },
        };
      } catch (error) {
        if (error instanceof AiProviderTechnicalError) throw error;

        const { category, safeMessage } = classifyError(error);
        lastError = { category, safeMessage };
        this.logObservability({ attempt, durationMs: Date.now() - startedAt, result: category });

        const remainingAfterError = deadline - Date.now();
        const canRetry = attempt === 1 && RETRY_ELIGIBLE_CATEGORIES.has(category) && remainingAfterError >= MIN_RETRY_BUDGET_MS;
        if (!canRetry) {
          throw new AiProviderTechnicalError(safeMessage, category);
        }
        // continúa al siguiente intento con el mismo deadline compartido.
      }
    }

    // Inalcanzable en la práctica (el bucle siempre retorna o lanza), pero TypeScript requiere un valor de retorno.
    throw new AiProviderTechnicalError(lastError?.safeMessage ?? 'Fallo técnico no clasificado del proveedor de IA.', lastError?.category ?? 'unknown_provider_error');
  }

  /** Observabilidad mínima -- NUNCA incluye API key, prompt completo, mensaje del usuario ni respuesta del modelo (ver docs/adr/0007-logging-error-handling.md). */
  private logObservability(entry: { attempt: number; durationMs: number; result: string }): void {
    this.logger.log('Llamada a proveedor de IA', {
      provider: 'anthropic',
      model: this.model,
      attempt: entry.attempt,
      durationMs: entry.durationMs,
      result: entry.result,
    });
  }
}
