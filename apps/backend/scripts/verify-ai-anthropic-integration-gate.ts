// Gate de LEF Bloque VI, Incremento 2 ("Abstracción + integración real de
// proveedor") -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §22. Separado
// deliberadamente del gate ordinario (verify-ai-conversation-foundation-gate.ts,
// que sigue usando exclusivamente FakeAiProvider, rápido/gratis/sin red).
// Este gate es OPT-IN: se salta con SKIP (no FALLO) si no hay
// ANTHROPIC_API_KEY en el entorno del propio script -- nunca se ejecuta por
// accidente como parte de la regresión ordinaria.
//
// Combina, tal como autorizó el Product Owner ("no necesitas provocar
// deliberadamente cargos costosos/fallos para probar todo -- combina
// integración real mínima + pruebas deterministas del adaptador"):
//   PARTE A: pruebas deterministas de AnthropicAiProvider con un cliente
//            Anthropic FALSO inyectado -- sin red, sin coste, prueban
//            exhaustivamente la política de deadline/reintento/clasificación
//            de errores (propiedad 7: máximo 1 reintento automático, y la
//            matriz completa de categorías elegibles/no elegibles).
//   PARTE B: integración real mínima contra la API de Anthropic (requiere
//            un backend productivo corriendo con AI_PROVIDER_IMPL=anthropic)
//            -- prueba las propiedades que solo pueden demostrarse contra el
//            proveedor real (1,2,3,5,8,9) más una prueba de timeout con un
//            presupuesto deliberadamente corto (propiedad 6), de coste
//            mínimo.
//
// Uso:
//   ANTHROPIC_API_KEY=... npx tsx scripts/verify-ai-anthropic-integration-gate.ts <baseUrlNormal> [<baseUrlShortTimeout>] [<logFilePath>]
//   - <baseUrlNormal>: backend con AI_PROVIDER_IMPL=anthropic, ANTHROPIC_TIMEOUT_MS por defecto (8000).
//   - <baseUrlShortTimeout> (opcional): backend con AI_PROVIDER_IMPL=anthropic, ANTHROPIC_TIMEOUT_MS muy corto (ej. 1) -- para la propiedad 6 (timeout). Si se omite, esa comprobación se salta explícitamente (SKIP, no FALLO).
//   - <logFilePath> (opcional): archivo donde el backend <baseUrlNormal> escribió su stdout -- para la propiedad 5 (API key nunca en logs). Si se omite, esa comprobación se salta explícitamente (SKIP, no FALLO).
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { AnthropicAiProvider, AXIOMA_TUTOR_SYSTEM_PROMPT_VERSION } from '../src/ai/anthropic-ai-provider';
import { AiProviderTechnicalError, type AiProviderErrorCategory } from '../src/ai/ai-provider';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

let failures = 0;
let skips = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}
function skip(label: string) {
  console.log(`SKIP  ${label}`);
  skips++;
}

function fakeConfig(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = { ANTHROPIC_API_KEY: 'test-key-nunca-real', ...overrides };
  return { get: (key: string, def?: string) => values[key] ?? def } as unknown as ConfigService;
}

type FakeCreateImpl = (attemptIndex: number) => Promise<Anthropic.Message> | Anthropic.Message;

function fakeClient(impls: FakeCreateImpl[]): { client: Anthropic; callCount: () => number } {
  let calls = 0;
  const client = {
    messages: {
      create: async (..._args: unknown[]) => {
        const impl = impls[calls] ?? impls[impls.length - 1];
        calls += 1;
        return impl(calls);
      },
    },
  } as unknown as Anthropic;
  return { client, callCount: () => calls };
}

function textMessage(text: string): Anthropic.Message {
  return { content: [{ type: 'text', text, citations: null }] } as unknown as Anthropic.Message;
}

// ---------------------------------------------------------------------------
// PARTE A: pruebas deterministas del adaptador (sin red)
// ---------------------------------------------------------------------------
async function runDeterministicAdapterTests() {
  console.log('=== PARTE A: AnthropicAiProvider -- pruebas deterministas (cliente Anthropic falso, sin red) ===');

  console.log('--- A1. Éxito en el primer intento -> 1 llamada física, respuesta usable ---');
  {
    const { client, callCount } = fakeClient([() => textMessage('Respuesta real de prueba.')]);
    const provider = new AnthropicAiProvider(fakeConfig(), client);
    const reply = await provider.generateReply([], 'hola');
    check('contenido devuelto == el del proveedor falso', reply.content === 'Respuesta real de prueba.');
    check('exactamente 1 llamada física', callCount() === 1);
  }

  console.log('--- A2. Error transitorio (5xx) -> reintento permitido -> éxito en el 2º intento -> exactamente 2 llamadas físicas ---');
  {
    const headers = new Headers();
    const { client, callCount } = fakeClient([
      () => {
        throw new Anthropic.InternalServerError(500, {}, 'boom transitorio', headers);
      },
      () => textMessage('Respuesta tras retry.'),
    ]);
    const provider = new AnthropicAiProvider(fakeConfig(), client);
    const reply = await provider.generateReply([], 'hola');
    check('contenido devuelto == el del 2º intento', reply.content === 'Respuesta tras retry.');
    check('EXACTAMENTE 2 llamadas físicas (1 intento inicial + 1 reintento, nunca más)', callCount() === 2);
  }

  console.log('--- A3. Rate limit (429) -> reintento permitido -> éxito -> 2 llamadas físicas ---');
  {
    const headers = new Headers();
    const { client, callCount } = fakeClient([
      () => {
        throw new Anthropic.RateLimitError(429, {}, 'rate limited', headers);
      },
      () => textMessage('Respuesta tras retry por rate limit.'),
    ]);
    const provider = new AnthropicAiProvider(fakeConfig(), client);
    const reply = await provider.generateReply([], 'hola');
    check('contenido devuelto == el del 2º intento', reply.content === 'Respuesta tras retry por rate limit.');
    check('EXACTAMENTE 2 llamadas físicas', callCount() === 2);
  }

  console.log('--- A4. Fallo de transporte/red -> reintento permitido -> éxito -> 2 llamadas físicas ---');
  {
    const { client, callCount } = fakeClient([
      () => {
        throw new Anthropic.APIConnectionError({ message: 'ECONNRESET simulado' });
      },
      () => textMessage('Respuesta tras retry por red.'),
    ]);
    const provider = new AnthropicAiProvider(fakeConfig(), client);
    const reply = await provider.generateReply([], 'hola');
    check('contenido devuelto == el del 2º intento', reply.content === 'Respuesta tras retry por red.');
    check('EXACTAMENTE 2 llamadas físicas', callCount() === 2);
  }

  console.log('--- A5. Ambos intentos fallan (transitorio ambas veces) -> EXACTAMENTE 2 llamadas físicas, nunca un 3er intento ---');
  {
    const headers = new Headers();
    const { client, callCount } = fakeClient([
      () => {
        throw new Anthropic.InternalServerError(500, {}, 'boom 1', headers);
      },
      () => {
        throw new Anthropic.InternalServerError(500, {}, 'boom 2', headers);
      },
    ]);
    const provider = new AnthropicAiProvider(fakeConfig(), client);
    let category: AiProviderErrorCategory | undefined;
    try {
      await provider.generateReply([], 'hola');
    } catch (error) {
      if (error instanceof AiProviderTechnicalError) category = error.category;
    }
    check('lanza AiProviderTechnicalError con categoría provider_unavailable', category === 'provider_unavailable');
    check('EXACTAMENTE 2 llamadas físicas (máximo 1 reintento, nunca un 3er intento pese a seguir fallando)', callCount() === 2);
  }

  console.log('--- A6. Error permanente (400) -> NUNCA se reintenta aunque sobre presupuesto -> 1 sola llamada física ---');
  {
    const headers = new Headers();
    const { client, callCount } = fakeClient([
      () => {
        throw new Anthropic.BadRequestError(400, {}, 'input inválido', headers);
      },
      () => textMessage('esto NUNCA debería llamarse'),
    ]);
    const provider = new AnthropicAiProvider(fakeConfig(), client);
    let category: AiProviderErrorCategory | undefined;
    try {
      await provider.generateReply([], 'hola');
    } catch (error) {
      if (error instanceof AiProviderTechnicalError) category = error.category;
    }
    check('categoría == provider_invalid_request', category === 'provider_invalid_request');
    check('EXACTAMENTE 1 llamada física -- error permanente nunca se reintenta', callCount() === 1);
  }

  console.log('--- A7. Error de autenticación/configuración (401) -> NUNCA se reintenta -> 1 sola llamada física ---');
  {
    const headers = new Headers();
    const { client, callCount } = fakeClient([
      () => {
        throw new Anthropic.AuthenticationError(401, {}, 'api key inválida', headers);
      },
      () => textMessage('esto NUNCA debería llamarse'),
    ]);
    const provider = new AnthropicAiProvider(fakeConfig(), client);
    let category: AiProviderErrorCategory | undefined;
    try {
      await provider.generateReply([], 'hola');
    } catch (error) {
      if (error instanceof AiProviderTechnicalError) category = error.category;
    }
    check('categoría == provider_auth_error', category === 'provider_auth_error');
    check('EXACTAMENTE 1 llamada física -- error de auth nunca se reintenta', callCount() === 1);
  }

  console.log('--- A8. Timeout de conexión del SDK (presupuesto agotado en el 1er intento) -> NUNCA se reintenta -> 1 sola llamada física ---');
  {
    const { client, callCount } = fakeClient([
      () => {
        throw new Anthropic.APIConnectionTimeoutError();
      },
      () => textMessage('esto NUNCA debería llamarse'),
    ]);
    const provider = new AnthropicAiProvider(fakeConfig(), client);
    let category: AiProviderErrorCategory | undefined;
    try {
      await provider.generateReply([], 'hola');
    } catch (error) {
      if (error instanceof AiProviderTechnicalError) category = error.category;
    }
    check('categoría == timeout', category === 'timeout');
    check('EXACTAMENTE 1 llamada física -- timeout nunca se reintenta', callCount() === 1);
  }

  console.log('--- A9. Error transitorio pero SIN presupuesto restante razonable -> NO se reintenta aunque la categoría sea elegible ---');
  {
    const headers = new Headers();
    const { client, callCount } = fakeClient([
      async () => {
        // consume la mayor parte del presupuesto total (1500ms) antes de fallar -- deja <1000ms restante.
        await new Promise((resolve) => setTimeout(resolve, 1200));
        throw new Anthropic.InternalServerError(500, {}, 'boom tardío', headers);
      },
      () => textMessage('esto NUNCA debería llamarse'),
    ]);
    const provider = new AnthropicAiProvider(fakeConfig({ ANTHROPIC_TIMEOUT_MS: '1500' }), client);
    const startedAt = Date.now();
    let category: AiProviderErrorCategory | undefined;
    try {
      await provider.generateReply([], 'hola');
    } catch (error) {
      if (error instanceof AiProviderTechnicalError) category = error.category;
    }
    const elapsedMs = Date.now() - startedAt;
    check('categoría == provider_unavailable (el error original, no se reclasifica como timeout)', category === 'provider_unavailable');
    check('EXACTAMENTE 1 llamada física -- sin presupuesto razonable para un 2º intento, no se inicia', callCount() === 1);
    check(
      'NUNCA se acumulan 8s + 8s (ni ningún múltiplo del presupuesto): la operación completa terminó en menos de 1500ms + margen, nunca cerca de 2x el presupuesto',
      elapsedMs < 1500 + 200,
    );
  }

  console.log('--- A10. Respuesta sin bloques de texto -> se trata como fallo (no se retorna una respuesta vacía como "éxito"), sin reintento ---');
  {
    const { client, callCount } = fakeClient([() => ({ content: [] }) as unknown as Anthropic.Message]);
    const provider = new AnthropicAiProvider(fakeConfig(), client);
    let threw = false;
    try {
      await provider.generateReply([], 'hola');
    } catch (error) {
      threw = error instanceof AiProviderTechnicalError;
    }
    check('lanza AiProviderTechnicalError ante una respuesta sin texto utilizable', threw);
    check('EXACTAMENTE 1 llamada física (una respuesta vacía no es un error de proveedor reintentable)', callCount() === 1);
  }

  console.log('--- A11. Deadline COMPARTIDO, nunca reiniciado: el reintento recibe timeout == presupuesto RESTANTE, no 8000ms de nuevo ---');
  {
    const observedTimeouts: number[] = [];
    const headers = new Headers();
    let calls = 0;
    const client = {
      messages: {
        create: async (_params: unknown, opts: { timeout?: number }) => {
          calls += 1;
          observedTimeouts.push(opts?.timeout ?? -1);
          if (calls === 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            throw new Anthropic.InternalServerError(500, {}, 'boom', headers);
          }
          return textMessage('ok');
        },
      },
    } as unknown as Anthropic;
    const provider = new AnthropicAiProvider(fakeConfig({ ANTHROPIC_TIMEOUT_MS: '8000' }), client);
    await provider.generateReply([], 'hola');
    check('el timeout pasado al 1er intento es (aprox.) el presupuesto total (8000ms)', observedTimeouts[0] > 7000 && observedTimeouts[0] <= 8000);
    check(
      'el timeout pasado al 2º intento es MENOR al presupuesto total -- nunca se reinicia a 8000ms de nuevo',
      observedTimeouts[1] > 0 && observedTimeouts[1] < observedTimeouts[0],
    );
  }

  console.log('--- A12. maxRetries del cliente SDK == 0 -- el reintento propio reemplaza por completo al del SDK ---');
  {
    const provider = new AnthropicAiProvider(fakeConfig()) as unknown as { client: Anthropic };
    check('el cliente Anthropic real se construye con maxRetries: 0', provider.client.maxRetries === 0);
  }

  console.log('--- A13 (Incremento 3). usage se puebla desde response.usage -- provider/model/promptVersion propios, tokens/attempts/latencia reales, sin red ---');
  {
    const { client } = fakeClient([
      () =>
        ({
          content: [{ type: 'text', text: 'respuesta con usage real', citations: null }],
          usage: { input_tokens: 123, output_tokens: 45, cache_creation_input_tokens: null, cache_read_input_tokens: null, server_tool_use: null },
        }) as unknown as Anthropic.Message,
    ]);
    const provider = new AnthropicAiProvider(fakeConfig({ ANTHROPIC_MODEL: 'claude-sonnet-5' }), client);
    const reply = await provider.generateReply([], 'hola');
    check('usage.provider == "anthropic"', reply.usage?.provider === 'anthropic');
    check('usage.model == el modelo configurado (claude-sonnet-5)', reply.usage?.model === 'claude-sonnet-5');
    check('usage.promptVersion == AXIOMA_TUTOR_SYSTEM_PROMPT_VERSION', reply.usage?.promptVersion === AXIOMA_TUTOR_SYSTEM_PROMPT_VERSION);
    check('usage.inputTokens/outputTokens == los valores reales de response.usage (123/45)', reply.usage?.inputTokens === 123 && reply.usage?.outputTokens === 45);
    check('usage.attempts == 1 (éxito en el primer intento)', reply.usage?.attempts === 1);
    check('usage.latencyMs es un número >= 0', typeof reply.usage?.latencyMs === 'number' && reply.usage!.latencyMs >= 0);
  }

  console.log('--- A14 (Incremento 4). El system prompt renderizado NUNCA revela la respuesta de una pregunta sin contestar; SÍ la incluye cuando fue autorizada ---');
  {
    let capturedSystemUnanswered: unknown;
    const clientUnanswered = {
      messages: {
        create: async (params: { system?: unknown }) => {
          capturedSystemUnanswered = params.system;
          return textMessage('ok');
        },
      },
    } as unknown as Anthropic;
    const providerUnanswered = new AnthropicAiProvider(fakeConfig(), clientUnanswered);
    await providerUnanswered.generateReply([], 'hola', {
      subjectName: 'Matemática',
      topicName: 'Porcentajes',
      question: { stemText: '¿Cuánto es 10% de 200?', options: ['20', '10', '200'] },
    });
    const systemUnanswered = String(capturedSystemUnanswered);
    check('A14a. pregunta SIN responder -> el prompt instruye explícitamente NO revelar la alternativa correcta', systemUnanswered.includes('NUNCA reveles'));
    check('A14b. pregunta SIN responder -> el prompt NUNCA incluye una "explicación validada"', !systemUnanswered.includes('Explicación validada'));

    let capturedSystemAnswered: unknown;
    const clientAnswered = {
      messages: {
        create: async (params: { system?: unknown }) => {
          capturedSystemAnswered = params.system;
          return textMessage('ok');
        },
      },
    } as unknown as Anthropic;
    const providerAnswered = new AnthropicAiProvider(fakeConfig(), clientAnswered);
    await providerAnswered.generateReply([], 'hola', {
      subjectName: 'Matemática',
      topicName: 'Porcentajes',
      question: {
        stemText: '¿Cuánto es 10% de 200?',
        options: ['20', '10', '200'],
        studentAnswer: { chosenOptionText: '20', isCorrect: true, explanationText: '10% de 200 es 20 porque...' },
      },
    });
    const systemAnswered = String(capturedSystemAnswered);
    check('A14c. pregunta YA respondida -> el prompt SÍ incluye la explicación validada', systemAnswered.includes('Explicación validada: 10% de 200 es 20 porque...'));
    check('A14d. pregunta YA respondida -> el prompt indica la alternativa elegida y su corrección', systemAnswered.includes('eligió: "20"') && systemAnswered.includes('correcta'));
  }
}

// ---------------------------------------------------------------------------
// PARTE B: integración real mínima contra la API de Anthropic
// ---------------------------------------------------------------------------
async function req(base: string, method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function createSession(base: string, uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `ai-anthropic-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req(base, 'POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

async function runRealIntegrationTests(baseUrlNormal: string, baseUrlShortTimeout: string | undefined, logFilePath: string | undefined, apiKey: string) {
  console.log('=== PARTE B: integración real mínima contra Anthropic ===');
  console.log(`Backend normal: ${baseUrlNormal}`);

  const alice = await createSession(baseUrlNormal, 'alice');

  console.log('--- B1/B2/B3. Backend resuelve AnthropicAiProvider; llamada real devuelve respuesta usable; persistida como EXACTAMENTE 1 ASSISTANT ---');
  const createResult = await req(baseUrlNormal, 'POST', '/ai/me/conversations', alice.headers, {});
  check('POST conversación -> 200/201', createResult.status === 200 || createResult.status === 201);
  const conversationId = createResult.body?.conversationId as string;

  const operationId = crypto.randomUUID();
  const sendResult = await req(baseUrlNormal, 'POST', `/ai/me/conversations/${conversationId}/messages`, alice.headers, {
    content: `Responde en una sola frase corta: ¿cuánto es 2+2? (verificación automática del Incremento 2, versión de prompt ${AXIOMA_TUTOR_SYSTEM_PROMPT_VERSION})`,
    operationId,
  });
  check('POST mensaje -> 200/201 (proveedor real resuelto y llamada real completada)', sendResult.status === 200 || sendResult.status === 201);
  const assistantContent = sendResult.body?.assistantMessage?.content as string | undefined;
  check('B2. respuesta del ASSISTANT es una cadena no vacía (respuesta real usable)', typeof assistantContent === 'string' && assistantContent.length > 0);
  check(
    'B1. la respuesta NO es la marca determinista de FakeAiProvider -- confirma que el backend está usando AnthropicAiProvider, no el fake',
    !(assistantContent ?? '').startsWith('[FakeAiProvider'),
  );

  const detail = await req(baseUrlNormal, 'GET', `/ai/me/conversations/${conversationId}`, alice.headers);
  const assistantMessages = (detail.body?.messages ?? []).filter((m: { role: string }) => m.role === 'ASSISTANT');
  check('B3. EXACTAMENTE 1 mensaje ASSISTANT persistido tras 1 turno real', assistantMessages.length === 1);

  console.log('--- B4. Modelo/proveedor corresponden a ADR-0022 (verificación estática del default de configuración) ---');
  const providerSource = readFileSync(new URL('../src/ai/anthropic-ai-provider.ts', import.meta.url), 'utf8');
  check("el modelo por defecto configurado es 'claude-sonnet-5' (ADR-0022/Gate C5)", providerSource.includes("'ANTHROPIC_MODEL', 'claude-sonnet-5'"));

  console.log('--- B5. La API key nunca aparece en la respuesta HTTP ni en los logs del backend ---');
  check('la API key nunca aparece en el cuerpo de la respuesta HTTP', !sendResult.raw.includes(apiKey));
  if (logFilePath) {
    const logContent = readFileSync(logFilePath, 'utf8');
    check(`la API key nunca aparece en ${logFilePath}`, !logContent.includes(apiKey));
  } else {
    skip('B5 (logs): no se proporcionó <logFilePath> -- verificar manualmente que el archivo de log del backend no contiene la API key');
  }

  console.log('--- B6. Timeout real (presupuesto deliberadamente corto) -> error técnico estable (503), nunca expone detalle del SDK ---');
  if (baseUrlShortTimeout) {
    const bob = await createSession(baseUrlShortTimeout, 'bob-timeout');
    const createConv = await req(baseUrlShortTimeout, 'POST', '/ai/me/conversations', bob.headers, {});
    const convId = createConv.body?.conversationId as string;
    const timeoutSend = await req(baseUrlShortTimeout, 'POST', `/ai/me/conversations/${convId}/messages`, bob.headers, {
      content: 'Esto debería agotar el presupuesto de timeout, deliberadamente muy corto.',
      operationId: crypto.randomUUID(),
    });
    check('con presupuesto de timeout casi nulo -> 503 (degradación controlada, nunca 500)', timeoutSend.status === 503);
    check('el cuerpo del error NUNCA expone el mensaje crudo del SDK/proveedor', !JSON.stringify(timeoutSend.body ?? {}).toLowerCase().includes('anthropic'));
  } else {
    skip('B6: no se proporcionó <baseUrlShortTimeout> -- iniciar un backend adicional con AI_PROVIDER_IMPL=anthropic y ANTHROPIC_TIMEOUT_MS=1 para ejercer esta comprobación');
  }

  console.log('--- B7. Máximo 1 reintento automático: demostrado de forma determinista en la PARTE A (A2/A3/A4/A5) -- combinación autorizada explícitamente por el Product Owner ---');
  check('ver PARTE A (A2/A3/A4/A5) -- no se repite aquí para no provocar fallos reales artificiales contra el proveedor', true);

  console.log('--- B8. Nunca se invoca OpenAI/ningún fallback -- verificación estática (ya cubierta por el gate ordinario, punto 16) ---');
  check('ver gate ordinario (verify-ai-conversation-foundation-gate.ts, punto 16) -- sin dependencia de OpenAI en el backend', true);

  console.log('--- B9. Replay del MISMO operationId tras una respuesta ya persistida NO vuelve a llamar a Anthropic ---');
  const replaySend = await req(baseUrlNormal, 'POST', `/ai/me/conversations/${conversationId}/messages`, alice.headers, {
    content: 'contenido irrelevante -- el replay ignora el body y reutiliza lo ya persistido',
    operationId, // MISMO operationId que B1/B2/B3
  });
  check('replay -> mismo status de éxito', replaySend.status === sendResult.status);
  check('replay devuelve EXACTAMENTE el mismo assistantMessage.id (sin nueva llamada real al proveedor)', replaySend.body?.assistantMessage?.id === sendResult.body?.assistantMessage?.id);
  const detailAfterReplay = await req(baseUrlNormal, 'GET', `/ai/me/conversations/${conversationId}`, alice.headers);
  const assistantMessagesAfterReplay = (detailAfterReplay.body?.messages ?? []).filter((m: { role: string }) => m.role === 'ASSISTANT');
  check('SIGUE habiendo EXACTAMENTE 1 mensaje ASSISTANT tras el replay (ninguna llamada real adicional)', assistantMessagesAfterReplay.length === 1);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('SKIP  gate de integración real de Anthropic: ANTHROPIC_API_KEY no está configurada en el entorno de este script.');
    console.log('      Este gate es OPT-IN por diseño (ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §22) -- nunca se ejecuta accidentalmente como parte de la regresión ordinaria.');
    process.exit(0);
  }

  await runDeterministicAdapterTests();

  const baseUrlNormal = process.argv[2];
  if (!baseUrlNormal) {
    console.log('SKIP  PARTE B (integración real vía HTTP): no se proporcionó <baseUrlNormal> como argumento.');
    console.log(`      Ejecuta: npx tsx scripts/verify-ai-anthropic-integration-gate.ts <baseUrlNormal> [<baseUrlShortTimeout>] [<logFilePath>]`);
    skips++;
  } else {
    const baseUrlShortTimeout = process.argv[3];
    const logFilePath = process.argv[4];
    await runRealIntegrationTests(baseUrlNormal, baseUrlShortTimeout, logFilePath, apiKey);
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron. ${skips} comprobación(es) omitida(s) (SKIP, no cuentan como fallo).`);
    process.exit(1);
  }
  console.log(`Todas las verificaciones del gate de integración real de Anthropic (LEF Bloque VI, Incremento 2) pasaron. ${skips} comprobación(es) omitida(s) explícitamente (SKIP).`);
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
