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
 * TUTOR-MICRO-REMEDIATION-V1 -- `stop_reason` de Anthropic que significan
 * "la generación se cortó por límite de longitud, el texto es prosa
 * PARCIAL". Se convierten en `AiProviderTechnicalError('provider_incomplete_output')`
 * ANTES de extraer/devolver el texto -- ver `RETRY_ELIGIBLE_CATEGORIES`
 * (no están ahí a propósito: reintentar daría el mismo corte) y el docstring
 * de `AiProviderErrorCategory`. `refusal` NO va aquí: tiene su propia
 * categoría (`provider_safety_refusal`) y outcome HTTP (422) desde el
 * Incremento 6.
 */
const INCOMPLETE_OUTPUT_STOP_REASONS: ReadonlySet<string> = new Set(['max_tokens', 'model_context_window_exceeded']);

/**
 * Presupuesto mínimo (ms) para que valga la pena iniciar el reintento
 * técnico -- decisión de ingeniería, no contractual (el Product Owner fijó
 * el presupuesto TOTAL de 8000ms; este valor solo evita iniciar un segundo
 * intento con tan poco tiempo restante que fallaría por timeout casi con
 * certeza). Documentado explícitamente en el reporte de cierre.
 */
const MIN_RETRY_BUDGET_MS = 1000;

/**
 * Presupuesto TOTAL wall-clock por operación lógica, en ms. Default 10000
 * desde V5 (era 8000 desde el Incremento 2).
 *
 * DECISIÓN DEL PRODUCT OWNER basada en la evidencia REAL de la evaluación
 * pedagógica de `AXIOMA_TUTOR_V4`
 * (`experiments/tutor-pedagogy-v4-eval/evaluation.md`): con un system prompt
 * de ~2.570 tokens de entrada por llamada, **7 de 38 turnos (18,4 %)**
 * expiraron contra el presupuesto de 8000 ms -- todos con la firma
 * `"durationMs":8002..8018,"result":"timeout"` -- y el máximo registrado en el
 * ledger fue 7.990 ms, a 10 ms del deadline. No es una intuición: es una
 * distribución de latencia medida contra un techo demasiado ajustado.
 *
 * Qué NO cambia con este valor (explícito, para que nadie lo infiera al revés):
 * - Sigue siendo un deadline TOTAL de la operación, NUNCA "10 s por intento":
 *   el intento inicial y el único reintento técnico elegible comparten el mismo
 *   instante absoluto de expiración; el reloj jamás se reinicia.
 * - NO cambia el número de intentos (máximo 2 físicos: inicial + 1 reintento).
 * - NO cambia qué categorías son reintentables: `timeout` sigue FUERA de
 *   `RETRY_ELIGIBLE_CATEGORIES`. Un timeout termina la operación; no consume
 *   cuota, no persiste ASSISTANT, no escribe en el ledger y deja el mensaje
 *   USER reintentable por el propio estudiante.
 * - NO cambia la semántica de idempotencia (`operationId`) ni ninguna cuota.
 * La otra mitad de la mitigación de latencia es la COMPRESIÓN SEMÁNTICA del
 * system prompt en `AXIOMA_TUTOR_V5` (ver `ai-pedagogy.ts`): se ataca el
 * tamaño de entrada, no se compran reintentos.
 *
 * -> `24000` desde TUTOR-MICRO-REMEDIATION-V1 (era 10000 desde V5). Va
 * ACOPLADO al aumento de `ANTHROPIC_MAX_OUTPUT_TOKENS` 768 -> 1536 -- son
 * dos mitigaciones del MISMO defecto (TQ-02, ver TUTOR-MICRO-AUDIT-V1): en
 * producción una respuesta real terminó EXACTAMENTE en 768 tokens de salida
 * (`stop_reason` casi con certeza `max_tokens`), con el texto cortado a
 * mitad de palabra ("...en un ac"), y esa misma generación tardó ~9.913 ms
 * contra el techo de 10.000. Duplicar el techo de salida sin ampliar el
 * presupuesto de tiempo solo cambiaría el modo de fallo de "truncada" a
 * "timeout". Evidencia de la razón de escala: ~10 ms/token de salida +
 * ~2 s de overhead fijo -> una generación de 1536 tokens ronda los ~18-20 s;
 * 24000 deja ~4-6 s de holgura en el intento inicial y mantiene coherente el
 * deadline TOTAL compartido (sigue sin reiniciarse entre intentos, sigue
 * habiendo máximo 2 intentos físicos, `timeout`/`max_tokens` siguen FUERA de
 * `RETRY_ELIGIBLE_CATEGORIES`). NO se toca el número de intentos, la política
 * de categorías, la idempotencia (`operationId`) ni ninguna cuota.
 */
const DEFAULT_TIMEOUT_MS = '24000';

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
 * reporte de cierre del Incremento 2 y, para el valor vigente, el docstring de
 * `DEFAULT_TIMEOUT_MS`): presupuesto TOTAL wall-clock de
 * `timeoutMs` (default 24000 desde TUTOR-MICRO-REMEDIATION-V1; era 10000 desde V5; era 8000)
 * para la operación lógica completa. Máximo 2
 * intentos físicos (inicial + 1 reintento técnico), ambos comparten el mismo
 * deadline absoluto -- nunca se reinicia el reloj. El reintento recibe
 * únicamente el tiempo restante hasta el deadline; si no queda presupuesto
 * razonable (`MIN_RETRY_BUDGET_MS`), no se inicia. Solo las categorías en
 * `RETRY_ELIGIBLE_CATEGORIES` son elegibles -- timeout, error de
 * autenticación/configuración, solicitud inválida, error no clasificado y
 * `provider_incomplete_output` (`stop_reason: 'max_tokens'`) NUNCA se
 * reintentan automáticamente.
 *
 * `maxOutputTokens` (default 1536 desde TUTOR-MICRO-REMEDIATION-V1; era 768
 * desde la corrección V4; era 512 hasta la evaluación pedagógica de
 * `AXIOMA_TUTOR_V3`) -- AUDITADO explícitamente en el Incremento 3 (no se
 * cambia por intuición, ver reporte de cierre):
 * - Coste: acota el gasto máximo por llamada de forma predecible,
 *   proporcional a la cuota diaria (3/20 consultas, FREE/PREMIUM -- ver
 *   `AiEntitlementService`, PB-1C) -- un techo generoso por consulta no es
 *   grave cuando el NÚMERO de consultas ya está acotado por cuenta y día.
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
 * Conclusión de I3: se MANTUVO 512 como política V1 explícita y revisable (no
 * partida por tier -- ninguna decisión de producto exige que Premium
 * reciba respuestas más largas todavía), no como un valor heredado sin
 * revisar. El propio ledger de este incremento (`ai_usage_ledger.outputTokens`)
 * es la fuente de evidencia real para reabrir esta decisión más adelante.
 *
 * REAPERTURA EJECUTADA (512 -> 768), decisión del Product Owner sobre la
 * evaluación pedagógica real de `AXIOMA_TUTOR_V3`
 * (`experiments/tutor-pedagogy-v3-eval/evaluation.md`). La evidencia
 * cuantitativa que este mismo docstring pedía ya existe y proviene del ledger,
 * no de una intuición: 9 de 21 turnos reales (43 %) terminaron EXACTAMENTE en
 * 512 tokens de salida, es decir cortados por este techo y no por fin de
 * turno; en 8 de ellos el corte solo se llevó el cierre, pero en el caso P19
 * (`WORKED_SOLUTION` sobre un ejercicio del propio estudiante) se llevó la
 * solución entera y la respuesta quedó inutilizable -- ese caso se contabilizó
 * como FAIL de la evaluación. 768 es el mínimo aumento que cubre con holgura
 * el turno más largo observado (512 truncado + cierre) sin convertir el techo
 * en un permiso para el muro de texto: la segunda mitad de la mitigación es
 * la regla de BREVEDAD Y FORMATO DE CHAT del prompt `AXIOMA_TUTOR_V4` (ver
 * `ai-pedagogy.ts`), que ataca la causa (encabezados/tablas/LaTeX) en vez de
 * comprarle más espacio. El techo sigue siendo único, sin partición por tier,
 * y el coste máximo por llamada sigue acotado y predecible (+50 % del
 * componente de salida en el peor caso, sobre un gasto medido en centavos de
 * dólar por corrida completa de evaluación).
 *
 * -> REAPERTURA EJECUTADA (768 -> 1536), TUTOR-MICRO-REMEDIATION-V1 sobre la
 * evidencia de PRODUCCIÓN de TQ-02 (ver TUTOR-MICRO-AUDIT-V1). La afirmación
 * "V4 demostró 0 truncamientos semánticos con 768" quedó DESMENTIDA por el
 * ledger real: una respuesta de producción (una pregunta de Historia, prompt
 * `AXIOMA_TUTOR_V6_2`, `claude-sonnet-5`) terminó con `outputTokens` == 768
 * EXACTO -- el techo, no fin de turno -- y el texto persistido terminaba a
 * mitad de palabra ("...en un ac"). La ventana de eval de V4 (~350-450
 * palabras) simplemente no contenía el peor caso real. 1536 = mínimo aumento
 * que cubre esa clase de turno con holgura; la regla de BREVEDAD Y FORMATO DE
 * CHAT del prompt (120-220 palabras, máx 300; ver `ai-pedagogy.ts`) sigue
 * siendo la que acota la longitud VISIBLE -- el techo solo evita el corte a
 * mitad de frase, no invita al muro de texto. El techo sigue siendo único,
 * sin partición por tier; el coste máximo por llamada sigue acotado y
 * predecible (la cuota diaria por cuenta ya lo limita). ACOPLADO a
 * `DEFAULT_TIMEOUT_MS` 10000 -> 24000 (ver su docstring) -- dos mitigaciones
 * del mismo defecto. Y -- lo que cierra TQ-02 de verdad -- desde este
 * incremento un `stop_reason: 'max_tokens'` ya NO se persiste como respuesta
 * exitosa: se convierte en `AiProviderTechnicalError('provider_incomplete_output')`
 * antes de extraer el texto (ver `generateReply` e `INCOMPLETE_OUTPUT_STOP_REASONS`).
 *
 * Incremento 3 (ver reporte de cierre): `generateReply` ahora puebla
 * `AiProviderReply.usage` (attempts/inputTokens/outputTokens/latencyMs) a
 * partir de `response.usage`, exactamente el campo que I2 documentó como
 * "descartado deliberadamente" -- I3 empieza a consumirlo SIN rediseñar esta
 * clase ni `AiProvider` (el campo ya era opcional desde I2). Sigue sin
 * incluir contenido conversacional: `usage` nunca lleva prompt/mensaje/
 * respuesta, solo metadata numérica de coste/latencia. TUTOR-MICRO-REMEDIATION-V1
 * añade `usage.stopReason` (enum de estado, nunca contenido) y lo emite
 * también en la observabilidad estructurada del adapter.
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
    this.timeoutMs = Number(config.get<string>('ANTHROPIC_TIMEOUT_MS', DEFAULT_TIMEOUT_MS));
    // PROVISIONAL -- ver docstring de la clase. No inferir de este valor ningún límite adicional Free/Premium.
    this.maxOutputTokens = Number(config.get<string>('ANTHROPIC_MAX_OUTPUT_TOKENS', '1536'));

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
          this.logObservability({ attempt, durationMs: Date.now() - startedAt, result: 'provider_safety_refusal', stopReason: 'refusal' });
          throw new AiProviderTechnicalError('El proveedor de IA rehusó generar una respuesta para esta solicitud.', 'provider_safety_refusal');
        }

        // TUTOR-MICRO-REMEDIATION-V1 (TQ-02) -- la generación se cortó por límite de longitud
        // (`max_tokens`) o de ventana de contexto: el texto es prosa PARCIAL, potencialmente a
        // mitad de palabra. Igual que `refusal`: la llamada HTTP fue exitosa pero NO hay respuesta
        // pedagógica utilizable. Se convierte en fallo técnico ANTES de extraer/devolver el texto,
        // así que `AiConversationService` NUNCA lo persiste como ASSISTANT ni escribe ledger.
        // NUNCA elegible para reintento automático (no está en `RETRY_ELIGIBLE_CATEGORIES`):
        // reintentar la misma generación daría el mismo corte. El estudiante reintenta manualmente.
        if (response.stop_reason && INCOMPLETE_OUTPUT_STOP_REASONS.has(response.stop_reason)) {
          this.logObservability({
            attempt,
            durationMs: Date.now() - startedAt,
            result: 'provider_incomplete_output',
            stopReason: response.stop_reason,
            outputTokens: response.usage?.output_tokens ?? null,
            maxOutputTokens: this.maxOutputTokens,
          });
          throw new AiProviderTechnicalError(
            'El proveedor de IA devolvió una respuesta incompleta (se alcanzó el límite de longitud).',
            'provider_incomplete_output',
          );
        }

        const text = response.content
          .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
          .map((block) => block.text)
          .join('');

        this.logObservability({
          attempt,
          durationMs: Date.now() - startedAt,
          result: 'success',
          stopReason: response.stop_reason ?? null,
          outputTokens: response.usage?.output_tokens ?? null,
        });

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
            stopReason: response.stop_reason ?? null,
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

  /**
   * Observabilidad mínima -- NUNCA incluye API key, prompt completo, mensaje del usuario ni
   * respuesta del modelo (ver docs/adr/0007-logging-error-handling.md). TUTOR-MICRO-REMEDIATION-V1
   * añade `stopReason`/`outputTokens`/`maxOutputTokens` (metadata numérica/enum, nunca contenido):
   * permite diagnosticar `max_tokens` vs `end_turn` vs `refusal` retrospectivamente desde los logs
   * de runtime, sin inspeccionar el texto persistido -- el hueco que hizo lento diagnosticar TQ-02.
   */
  private logObservability(entry: {
    attempt: number;
    durationMs: number;
    result: string;
    stopReason?: string | null;
    outputTokens?: number | null;
    maxOutputTokens?: number;
  }): void {
    this.logger.log('Llamada a proveedor de IA', {
      provider: 'anthropic',
      model: this.model,
      attempt: entry.attempt,
      durationMs: entry.durationMs,
      result: entry.result,
      ...(entry.stopReason !== undefined ? { stopReason: entry.stopReason } : {}),
      ...(entry.outputTokens !== undefined ? { outputTokens: entry.outputTokens } : {}),
      ...(entry.maxOutputTokens !== undefined ? { maxOutputTokens: entry.maxOutputTokens } : {}),
    });
  }
}
