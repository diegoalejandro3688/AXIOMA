// Gate de LEF Bloque VI, Incremento 1 ("Fundación conversacional") -- ver
// docs/adr/LEF-BLOCK-VI-DEFINITION.md §21. Prueba contra el servidor real:
// creación/listado/lectura de conversación, envío de mensaje con
// FakeAiProvider, idempotencia (replay puro y reintento tras fallo
// parcial), límite de turnos, ownership cross-cuenta, inmutabilidad de
// mensajes (trigger de Postgres) y ausencia de acoplamiento a un SDK real.
import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { FAKE_AI_PROVIDER_FAILURE_TRIGGER } from '../src/ai/fake-ai-provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `ai-conv-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

function randomOperationId(): string {
  return crypto.randomUUID();
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const alice = await createSession('alice');
  const bob = await createSession('bob');

  console.log('--- 1. Sin sesión -> 401 ---');
  const noSessionCreate = await req('POST', '/ai/me/conversations', {}, {});
  check('POST /ai/me/conversations sin sesión -> 401', noSessionCreate.status === 401);
  const noSessionList = await req('GET', '/ai/me/conversations');
  check('GET /ai/me/conversations sin sesión -> 401', noSessionList.status === 401);

  console.log('--- 2. Cuenta A crea conversación ---');
  const createResult = await req('POST', '/ai/me/conversations', alice.headers, {});
  check('POST -> 200/201', createResult.status === 200 || createResult.status === 201);
  const conversationId = createResult.body?.conversationId as string;
  check('conversationId presente', typeof conversationId === 'string' && conversationId.length > 0);
  check('turnCount inicial == 0', createResult.body?.turnCount === 0);
  check('maxTurns presente y positivo (Free = 6, decisión B)', createResult.body?.maxTurns === 6);
  check('respuesta NUNCA expone accountId', !('accountId' in (createResult.body ?? {})));

  console.log('--- 3. Lista propia contiene esa conversación ---');
  const listResult = await req('GET', '/ai/me/conversations', alice.headers);
  check('GET lista -> 200', listResult.status === 200);
  const listedIds = (listResult.body?.conversations ?? []).map((c: { conversationId: string }) => c.conversationId);
  check('la conversación recién creada aparece en la lista propia', listedIds.includes(conversationId));

  console.log('--- 4. Cuenta B no puede leer la conversación de A (404 uniforme) ---');
  const bobReadAttempt = await req('GET', `/ai/me/conversations/${conversationId}`, bob.headers);
  check('cuenta B -> 404 (nunca 403, nunca distingue "existe pero no es tuya")', bobReadAttempt.status === 404);
  const nonexistentAttempt = await req('GET', `/ai/me/conversations/${randomOperationId()}`, bob.headers);
  check('mismo código/mensaje que una conversación verdaderamente inexistente (semántica privada uniforme)', bobReadAttempt.body?.error?.code === nonexistentAttempt.body?.error?.code && bobReadAttempt.body?.error?.message === nonexistentAttempt.body?.error?.message);

  console.log('--- 5. Cuenta B no puede escribir en la conversación de A ---');
  const bobWriteAttempt = await req('POST', `/ai/me/conversations/${conversationId}/messages`, bob.headers, { content: 'intento ajeno', operationId: randomOperationId() });
  check('cuenta B -> 404 al intentar enviar mensaje (nunca crea nada)', bobWriteAttempt.status === 404);

  console.log('--- 6/7/8/9. A envía mensaje -> exactamente 1 USER + 1 ASSISTANT, orden estable, FakeAiProvider invocado una vez ---');
  const firstOperationId = randomOperationId();
  const firstSend = await req('POST', `/ai/me/conversations/${conversationId}/messages`, alice.headers, { content: 'Hola, tutor', operationId: firstOperationId });
  check('POST mensaje -> 200/201', firstSend.status === 200 || firstSend.status === 201);
  check('userMessage.role == USER', firstSend.body?.userMessage?.role === 'USER');
  check('assistantMessage.role == ASSISTANT', firstSend.body?.assistantMessage?.role === 'ASSISTANT');
  check('assistantMessage.content es la respuesta determinista del FakeAiProvider (identificable como test/dev)', firstSend.body?.assistantMessage?.content?.includes('FakeAiProvider'));
  check('userMessage.sequence < assistantMessage.sequence (orden USER -> ASSISTANT)', firstSend.body?.userMessage?.sequence < firstSend.body?.assistantMessage?.sequence);
  check('turnCount == 1 tras el primer turno', firstSend.body?.turnCount === 1);

  const detailAfterFirst = await req('GET', `/ai/me/conversations/${conversationId}`, alice.headers);
  const messagesAfterFirst = detailAfterFirst.body?.messages ?? [];
  check('exactamente 2 mensajes persistidos (1 USER + 1 ASSISTANT)', messagesAfterFirst.length === 2);
  check('exactamente 1 mensaje USER', messagesAfterFirst.filter((m: { role: string }) => m.role === 'USER').length === 1);
  check('exactamente 1 mensaje ASSISTANT', messagesAfterFirst.filter((m: { role: string }) => m.role === 'ASSISTANT').length === 1);
  check('orden por secuencia: [0]=USER, [1]=ASSISTANT', messagesAfterFirst[0]?.role === 'USER' && messagesAfterFirst[1]?.role === 'ASSISTANT');
  check('secuencias consecutivas 0,1', messagesAfterFirst[0]?.sequence === 0 && messagesAfterFirst[1]?.sequence === 1);
  check('FakeAiProvider invocado exactamente una vez (verificado indirectamente: exactamente 1 ASSISTANT, nunca 2)', messagesAfterFirst.filter((m: { role: string }) => m.role === 'ASSISTANT').length === 1);

  console.log('--- 10. Repetir la MISMA operación idempotente no crea mensajes adicionales ni nueva llamada lógica ---');
  const replaySend = await req('POST', `/ai/me/conversations/${conversationId}/messages`, alice.headers, { content: 'Hola, tutor', operationId: firstOperationId });
  check('replay -> mismo status de éxito', replaySend.status === firstSend.status);
  check('replay devuelve EXACTAMENTE el mismo userMessage.id', replaySend.body?.userMessage?.id === firstSend.body?.userMessage?.id);
  check('replay devuelve EXACTAMENTE el mismo assistantMessage.id (sin nueva llamada al provider)', replaySend.body?.assistantMessage?.id === firstSend.body?.assistantMessage?.id);
  check('replay devuelve el mismo turnCount (== 1, sin incrementar)', replaySend.body?.turnCount === 1);
  const detailAfterReplay = await req('GET', `/ai/me/conversations/${conversationId}`, alice.headers);
  check('sigue habiendo EXACTAMENTE 2 mensajes tras el replay (ninguno adicional)', (detailAfterReplay.body?.messages ?? []).length === 2);

  console.log('--- 11. Una operación NUEVA sí crea un nuevo turno ---');
  const secondOperationId = randomOperationId();
  const secondSend = await req('POST', `/ai/me/conversations/${conversationId}/messages`, alice.headers, { content: 'Segunda pregunta', operationId: secondOperationId });
  check('segundo mensaje -> éxito', secondSend.status === 200 || secondSend.status === 201);
  check('turnCount == 2 tras el segundo turno', secondSend.body?.turnCount === 2);
  check('segundo userMessage.id DISTINTO del primero', secondSend.body?.userMessage?.id !== firstSend.body?.userMessage?.id);
  const detailAfterSecond = await req('GET', `/ai/me/conversations/${conversationId}`, alice.headers);
  const messagesAfterSecond = detailAfterSecond.body?.messages ?? [];
  check('4 mensajes en total, secuencia 0,1,2,3 con roles USER,ASSISTANT,USER,ASSISTANT', messagesAfterSecond.length === 4 && messagesAfterSecond.map((m: { role: string }) => m.role).join(',') === 'USER,ASSISTANT,USER,ASSISTANT' && messagesAfterSecond.every((m: { sequence: number }, i: number) => m.sequence === i));

  console.log('--- 12. Mensajes no pueden actualizarse (trigger de Postgres) ---');
  const anyMessageId = firstSend.body?.userMessage?.id as string;
  let updateRejected = false;
  try {
    await pg.query("UPDATE ai_message SET content = 'contenido alterado' WHERE id = $1", [anyMessageId]);
  } catch (error) {
    updateRejected = error instanceof Error && /inmutable/i.test(error.message);
  }
  check('UPDATE directo sobre ai_message rechazado por el trigger enforce_ai_message_immutable', updateRejected);

  console.log('--- 13. Conversación ajena: ya cubierto en el paso 4 (semántica privada uniforme) -- verificación adicional con conversación real de bob ---');
  const bobConversation = await req('POST', '/ai/me/conversations', bob.headers, {});
  const bobConversationId = bobConversation.body?.conversationId as string;
  const aliceReadsBobConversation = await req('GET', `/ai/me/conversations/${bobConversationId}`, alice.headers);
  check('A no puede leer la conversación real de B -> 404', aliceReadsBobConversation.status === 404);

  console.log('--- 17. Fallo controlado del FakeAiProvider: estado reintentable, sin duplicar el mensaje USER ---');
  const failConversation = await req('POST', '/ai/me/conversations', alice.headers, {});
  const failConversationId = failConversation.body?.conversationId as string;
  const failOperationId = randomOperationId();
  const failedSend = await req('POST', `/ai/me/conversations/${failConversationId}/messages`, alice.headers, { content: FAKE_AI_PROVIDER_FAILURE_TRIGGER, operationId: failOperationId });
  check('fallo simulado -> 503 (degradación controlada, nunca 500)', failedSend.status === 503);
  const detailAfterFailure = await req('GET', `/ai/me/conversations/${failConversationId}`, alice.headers);
  check('el mensaje USER SÍ quedó persistido pese al fallo del proveedor', (detailAfterFailure.body?.messages ?? []).length === 1 && detailAfterFailure.body?.messages?.[0]?.role === 'USER');
  check('turnCount sigue en 0 -- el turno no se completó', detailAfterFailure.body?.turnCount === 0);

  const retryAfterFailure = await req('POST', `/ai/me/conversations/${failConversationId}/messages`, alice.headers, { content: FAKE_AI_PROVIDER_FAILURE_TRIGGER, operationId: failOperationId });
  check('reintento con el MISMO operationId -> sigue fallando (mismo contenido determinista), pero sin error de servidor genérico', retryAfterFailure.status === 503);
  const detailAfterRetry = await req('GET', `/ai/me/conversations/${failConversationId}`, alice.headers);
  check('tras el reintento, SIGUE habiendo EXACTAMENTE 1 mensaje USER -- nunca se duplicó', (detailAfterRetry.body?.messages ?? []).length === 1);

  console.log('--- A-C. Enforcement real del límite de turnos: 6 permitidos, el 7º rechazado ANTES de persistir nada ---');
  const turnLimitConversation = await req('POST', '/ai/me/conversations', alice.headers, {});
  const turnLimitConversationId = turnLimitConversation.body?.conversationId as string;
  check('A. conversación nueva: turnCount == 0', turnLimitConversation.body?.turnCount === 0);
  check('A. conversación nueva: maxTurns == 6 (Free, frontera provisional)', turnLimitConversation.body?.maxTurns === 6);

  const turnOperationIds: string[] = [];
  const turnResponses: Array<{ userMessageId: string; assistantMessageId: string }> = [];
  for (let turn = 1; turn <= 6; turn++) {
    const operationId = randomOperationId();
    turnOperationIds.push(operationId);
    const send = await req('POST', `/ai/me/conversations/${turnLimitConversationId}/messages`, alice.headers, { content: `Turno ${turn}`, operationId });
    check(`B. turno ${turn}/6 -> permitido (200/201)`, send.status === 200 || send.status === 201);
    check(`B. turno ${turn}/6 -> turnCount == ${turn}`, send.body?.turnCount === turn);
    turnResponses.push({ userMessageId: send.body?.userMessage?.id, assistantMessageId: send.body?.assistantMessage?.id });
  }
  const detailAtLimit = await req('GET', `/ai/me/conversations/${turnLimitConversationId}`, alice.headers);
  const messagesAtLimit = detailAtLimit.body?.messages ?? [];
  check('B. exactamente 12 mensajes tras 6 turnos (6 USER + 6 ASSISTANT)', messagesAtLimit.length === 12);
  check('B. exactamente 6 mensajes USER', messagesAtLimit.filter((m: { role: string }) => m.role === 'USER').length === 6);
  check('B. exactamente 6 mensajes ASSISTANT', messagesAtLimit.filter((m: { role: string }) => m.role === 'ASSISTANT').length === 6);
  check('B. turnCount == 6 == maxTurns', detailAtLimit.body?.turnCount === 6 && detailAtLimit.body?.maxTurns === 6);

  const seventhOperationId = randomOperationId();
  const seventhSend = await req('POST', `/ai/me/conversations/${turnLimitConversationId}/messages`, alice.headers, { content: 'Turno 7 -- debe rechazarse', operationId: seventhOperationId });
  check('C. 7º turno (operación NUEVA) -> rechazado (409, mismo criterio que otros límites fijos del proyecto, ej. featured-achievements)', seventhSend.status === 409);
  const detailAfterSeventh = await req('GET', `/ai/me/conversations/${turnLimitConversationId}`, alice.headers);
  const messagesAfterSeventh = detailAfterSeventh.body?.messages ?? [];
  check('C. SIGUEN siendo exactamente 12 mensajes -- el intento 7 NO persistió ningún USER huérfano', messagesAfterSeventh.length === 12);
  check('C. turnCount SIGUE en 6 -- ningún ASSISTANT nuevo, el FakeAiProvider NUNCA se invocó para el turno 7', detailAfterSeventh.body?.turnCount === 6);
  const repeatSeventhSend = await req('POST', `/ai/me/conversations/${turnLimitConversationId}/messages`, alice.headers, { content: 'Turno 7 -- reintento del mismo rechazo', operationId: randomOperationId() });
  check('C. repetir el intento (operationId distinto, sigue siendo un turno 7 nuevo) -> sigue rechazado, sin alterar estado', repeatSeventhSend.status === 409);
  const detailAfterRepeatSeventh = await req('GET', `/ai/me/conversations/${turnLimitConversationId}`, alice.headers);
  check('C. estado sin cambios tras el reintento del rechazo (siguen 12 mensajes)', (detailAfterRepeatSeventh.body?.messages ?? []).length === 12);

  console.log('--- D. Replay de una operación YA completada, en una conversación en el límite -> sigue siendo idempotente, NUNCA rechazado por el límite ---');
  const replayAtLimit = await req('POST', `/ai/me/conversations/${turnLimitConversationId}/messages`, alice.headers, { content: 'Turno 1', operationId: turnOperationIds[0] });
  check('D. replay del 1er turno (ya completado) -> 200/201, NUNCA 409 pese a que la conversación está en el límite', replayAtLimit.status === 200 || replayAtLimit.status === 201);
  check('D. replay devuelve EXACTAMENTE el mismo userMessage.id/assistantMessage.id del turno 1 original (replay puro, sin nueva llamada al provider)', replayAtLimit.body?.userMessage?.id === turnResponses[0]?.userMessageId && replayAtLimit.body?.assistantMessage?.id === turnResponses[0]?.assistantMessageId);
  const detailAfterReplayAtLimit = await req('GET', `/ai/me/conversations/${turnLimitConversationId}`, alice.headers);
  check('D. el replay NO alteró el conteo -- siguen 12 mensajes, turnCount sigue en 6', (detailAfterReplayAtLimit.body?.messages ?? []).length === 12 && detailAfterReplayAtLimit.body?.turnCount === 6);

  console.log('--- E/F. Fallo técnico dentro del turno pendiente (5/6) no consume turno; el retry de ESE turno sigue permitido aunque sea el turno 6 lógico ---');
  const nearLimitConversation = await req('POST', '/ai/me/conversations', alice.headers, {});
  const nearLimitConversationId = nearLimitConversation.body?.conversationId as string;
  for (let turn = 1; turn <= 5; turn++) {
    await req('POST', `/ai/me/conversations/${nearLimitConversationId}/messages`, alice.headers, { content: `Turno ${turn}`, operationId: randomOperationId() });
  }
  const detailBeforeSixth = await req('GET', `/ai/me/conversations/${nearLimitConversationId}`, alice.headers);
  check('E/F. fixture: turnCount == 5 antes del turno 6 (todavía dentro del límite de 6)', detailBeforeSixth.body?.turnCount === 5);

  const sixthOperationId = randomOperationId();
  const sixthFailedSend = await req('POST', `/ai/me/conversations/${nearLimitConversationId}/messages`, alice.headers, { content: FAKE_AI_PROVIDER_FAILURE_TRIGGER, operationId: sixthOperationId });
  check('E. el turno 6 (dentro del límite) falla técnicamente -> 503, nunca 409 (el límite SÍ permitía este turno)', sixthFailedSend.status === 503);
  const detailAfterSixthFailure = await req('GET', `/ai/me/conversations/${nearLimitConversationId}`, alice.headers);
  check('E. turnCount SIGUE en 5 -- el fallo técnico no consumió el turno (sin ASSISTANT persistido)', detailAfterSixthFailure.body?.turnCount === 5);
  check('E. el mensaje USER del turno 6 SÍ quedó persistido (11 mensajes: 5 pares + 1 USER huérfano legítimo, reintentable)', (detailAfterSixthFailure.body?.messages ?? []).length === 11);

  const sixthRetry = await req('POST', `/ai/me/conversations/${nearLimitConversationId}/messages`, alice.headers, { content: FAKE_AI_PROVIDER_FAILURE_TRIGGER, operationId: sixthOperationId });
  check('F. reintento del MISMO operationId (turno 6 pendiente) -> sigue permitido (503 por el mismo fallo determinista, NUNCA 409 por límite)', sixthRetry.status === 503);
  const detailAfterSixthRetry = await req('GET', `/ai/me/conversations/${nearLimitConversationId}`, alice.headers);
  check('F. sin duplicar el USER del turno 6 pendiente tras el retry (sigue en 11 mensajes)', (detailAfterSixthRetry.body?.messages ?? []).length === 11);
  check('F. turnCount sigue en 5 -- el turno 6 pendiente todavía no cuenta como completado', detailAfterSixthRetry.body?.turnCount === 5);

  console.log('--- 15. Verificación estática: ningún archivo de src/ai/ escribe en dominio de Gamificación/Progreso/Ranking ---');
  const aiDir = join(__dirname, '..', 'src', 'ai');
  const aiFiles = readdirSync(aiDir).filter((f) => f.endsWith('.ts'));
  const aiSources = aiFiles.map((f) => ({ file: f, content: readFileSync(join(aiDir, f), 'utf8') }));
  const forbiddenDomainImports = ["from '../gamification/", "from '../progress/", "XpLedgerEntry", "RewardGrant", "LeaderboardEntry"];
  let leakedDomainImport: string | null = null;
  for (const { content } of aiSources) {
    for (const forbidden of forbiddenDomainImports) {
      if (content.includes(forbidden)) leakedDomainImport = forbidden;
    }
  }
  check('ningún archivo de src/ai/ importa GAMIFICATION/PROGRESS ni referencia XP/ranking/recompensas directamente', leakedDomainImport === null);

  console.log('--- 16. Verificación estática: SDK de Anthropic confinado a anthropic-ai-provider.ts, sin OpenAI, sin red en el fake ---');
  // Incremento 2 (ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §22, criterio exacto de
  // cierre): "ningún archivo de DOMINIO importa el SDK de Anthropic directamente" --
  // el propio proveedor real (anthropic-ai-provider.ts) es la única excepción
  // legítima y esperada; ai-conversation.service.ts, el controller, los repos, la
  // interfaz AiProvider y ai.module.ts (que solo importa la CLASE, nunca el SDK)
  // deben seguir sin conocer el SDK. OpenAI nunca es aceptable en ningún archivo.
  const forbiddenProviderCodePatterns = [/from\s+['"]@anthropic-ai/i, /from\s+['"]openai['"]/i, /require\(\s*['"]@anthropic-ai/i, /require\(\s*['"]openai['"]/i, /new\s+Anthropic\s*\(/, /new\s+OpenAI\s*\(/];
  const forbiddenOpenAiOnlyPatterns = [/from\s+['"]openai['"]/i, /require\(\s*['"]openai['"]/i, /new\s+OpenAI\s*\(/];
  let leakedProviderCode: string | null = null;
  for (const { file, content } of aiSources) {
    if (file === 'anthropic-ai-provider.ts') {
      for (const pattern of forbiddenOpenAiOnlyPatterns) {
        if (pattern.test(content)) leakedProviderCode = `${pattern} en ${file}`;
      }
      continue;
    }
    for (const pattern of forbiddenProviderCodePatterns) {
      if (pattern.test(content)) leakedProviderCode = `${pattern} en ${file}`;
    }
  }
  check(
    'ningún archivo de dominio de src/ai/ (fuera de anthropic-ai-provider.ts) importa/instancia un SDK real de Anthropic/OpenAI; anthropic-ai-provider.ts nunca importa OpenAI',
    leakedProviderCode === null,
  );
  const fakeProviderSource = aiSources.find((s) => s.file === 'fake-ai-provider.ts')?.content ?? '';
  check('fake-ai-provider.ts nunca usa fetch/red -- determinista, en memoria', !fakeProviderSource.includes('fetch(') && !fakeProviderSource.includes('http'));
  const backendPackageJson = readFileSync(join(__dirname, '..', 'package.json'), 'utf8');
  check('apps/backend/package.json sin dependencia de openai', !backendPackageJson.toLowerCase().includes('"openai"'));
  check('apps/backend/package.json SÍ declara @anthropic-ai/sdk (Incremento 2, ADR-0022)', backendPackageJson.includes('"@anthropic-ai/sdk"'));

  console.log('--- 14 (contratos). Ningún tipo/endpoint de este incremento permite mutar XP/progreso/ranking/recompensas ---');
  const contractsSource = readFileSync(join(__dirname, '..', '..', '..', 'packages', 'contracts', 'src', 'ai.ts'), 'utf8');
  const forbiddenMutationFields = ['xpAmount', 'rankPosition', 'levelNumber', 'rewardGrantId', 'streakCount'];
  let leakedMutationField: string | null = null;
  for (const field of forbiddenMutationFields) {
    if (contractsSource.includes(field)) leakedMutationField = field;
  }
  check('los contratos de ai.ts no declaran ningún campo de dominio de gamificación/progreso', leakedMutationField === null);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundación Conversacional (LEF Bloque VI, Incremento 1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
