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
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
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

  console.log('--- A-C. Enforcement real del límite de turnos (independiente de la cuota diaria, Incremento 3) ---');
  // Este bloque necesita más de 3 consultas EXITOSAS (cuota FREE/día) en una sola cuenta para poder
  // probar el límite de turnos hasta agotarlo -- se usa una cuenta dedicada con override PREMIUM
  // (50 consultas/día, ver AiInternalAdminController, solo alcanzable en gate/desarrollo, NUNCA en
  // producción). El límite de turnos verificado sigue siendo el MISMO mecanismo (turnCount >= maxTurns)
  // -- probarlo con maxTurns=15 (Premium) en vez de 6 (Free) es una prueba igual de válida del mecanismo,
  // nunca del valor numérico específico (ese ya está cubierto por el punto A siguiente).
  const turnLimitTester = await createSession('turnlimit-premium');
  const premiumOverride = await req('POST', `/ai/_internal/set-tier-override?accountId=${turnLimitTester.accountId}&tier=PREMIUM`, { 'x-internal-ops-key': opsKey });
  check('fixture: override PREMIUM aplicado a la cuenta dedicada de este bloque', premiumOverride.status === 200 || premiumOverride.status === 201);

  const turnLimitConversation = await req('POST', '/ai/me/conversations', turnLimitTester.headers, {});
  const turnLimitConversationId = turnLimitConversation.body?.conversationId as string;
  const maxTurns = turnLimitConversation.body?.maxTurns as number;
  check('A. conversación nueva: turnCount == 0', turnLimitConversation.body?.turnCount === 0);
  check('A. conversación nueva: maxTurns == 15 (Premium, vía override de prueba)', maxTurns === 15);
  check('A. dailyQuota.limit == 50 (Premium)', turnLimitConversation.body?.dailyQuota?.limit === 50);

  const turnOperationIds: string[] = [];
  const turnResponses: Array<{ userMessageId: string; assistantMessageId: string }> = [];
  for (let turn = 1; turn <= maxTurns; turn++) {
    const operationId = randomOperationId();
    turnOperationIds.push(operationId);
    const send = await req('POST', `/ai/me/conversations/${turnLimitConversationId}/messages`, turnLimitTester.headers, { content: `Turno ${turn}`, operationId });
    check(`B. turno ${turn}/${maxTurns} -> permitido (200/201)`, send.status === 200 || send.status === 201);
    check(`B. turno ${turn}/${maxTurns} -> turnCount == ${turn}`, send.body?.turnCount === turn);
    turnResponses.push({ userMessageId: send.body?.userMessage?.id, assistantMessageId: send.body?.assistantMessage?.id });
  }
  const detailAtLimit = await req('GET', `/ai/me/conversations/${turnLimitConversationId}`, turnLimitTester.headers);
  const messagesAtLimit = detailAtLimit.body?.messages ?? [];
  check(`B. exactamente ${maxTurns * 2} mensajes tras ${maxTurns} turnos (${maxTurns} USER + ${maxTurns} ASSISTANT)`, messagesAtLimit.length === maxTurns * 2);
  check(`B. exactamente ${maxTurns} mensajes USER`, messagesAtLimit.filter((m: { role: string }) => m.role === 'USER').length === maxTurns);
  check(`B. exactamente ${maxTurns} mensajes ASSISTANT`, messagesAtLimit.filter((m: { role: string }) => m.role === 'ASSISTANT').length === maxTurns);
  check('B. turnCount == maxTurns', detailAtLimit.body?.turnCount === maxTurns && detailAtLimit.body?.maxTurns === maxTurns);

  const overLimitOperationId = randomOperationId();
  const overLimitSend = await req('POST', `/ai/me/conversations/${turnLimitConversationId}/messages`, turnLimitTester.headers, { content: 'Turno extra -- debe rechazarse', operationId: overLimitOperationId });
  check('C. turno extra (operación NUEVA) -> rechazado (409, mismo criterio que otros límites fijos del proyecto, ej. featured-achievements)', overLimitSend.status === 409);
  const detailAfterOverLimit = await req('GET', `/ai/me/conversations/${turnLimitConversationId}`, turnLimitTester.headers);
  const messagesAfterOverLimit = detailAfterOverLimit.body?.messages ?? [];
  check('C. SIGUE el mismo número de mensajes -- el intento extra NO persistió ningún USER huérfano', messagesAfterOverLimit.length === maxTurns * 2);
  check('C. turnCount SIGUE en el límite -- ningún ASSISTANT nuevo, el FakeAiProvider NUNCA se invocó para el turno extra', detailAfterOverLimit.body?.turnCount === maxTurns);
  const repeatOverLimitSend = await req('POST', `/ai/me/conversations/${turnLimitConversationId}/messages`, turnLimitTester.headers, { content: 'Turno extra -- reintento del mismo rechazo', operationId: randomOperationId() });
  check('C. repetir el intento (operationId distinto, sigue siendo un turno extra nuevo) -> sigue rechazado, sin alterar estado', repeatOverLimitSend.status === 409);
  const detailAfterRepeatOverLimit = await req('GET', `/ai/me/conversations/${turnLimitConversationId}`, turnLimitTester.headers);
  check('C. estado sin cambios tras el reintento del rechazo', (detailAfterRepeatOverLimit.body?.messages ?? []).length === maxTurns * 2);
  check('C. NINGUNO de los rechazos por límite de turnos consumió cuota diaria', detailAfterRepeatOverLimit.body?.dailyQuota?.consumed === maxTurns);

  console.log('--- D. Replay de una operación YA completada, en una conversación en el límite -> sigue siendo idempotente, NUNCA rechazado por el límite ---');
  const replayAtLimit = await req('POST', `/ai/me/conversations/${turnLimitConversationId}/messages`, turnLimitTester.headers, { content: 'Turno 1', operationId: turnOperationIds[0] });
  check('D. replay del 1er turno (ya completado) -> 200/201, NUNCA 409 pese a que la conversación está en el límite', replayAtLimit.status === 200 || replayAtLimit.status === 201);
  check('D. replay devuelve EXACTAMENTE el mismo userMessage.id/assistantMessage.id del turno 1 original (replay puro, sin nueva llamada al provider)', replayAtLimit.body?.userMessage?.id === turnResponses[0]?.userMessageId && replayAtLimit.body?.assistantMessage?.id === turnResponses[0]?.assistantMessageId);
  const detailAfterReplayAtLimit = await req('GET', `/ai/me/conversations/${turnLimitConversationId}`, turnLimitTester.headers);
  check('D. el replay NO alteró el conteo de mensajes ni el turnCount', (detailAfterReplayAtLimit.body?.messages ?? []).length === maxTurns * 2 && detailAfterReplayAtLimit.body?.turnCount === maxTurns);
  check('D. el replay NO consumió cuota adicional (sigue en el mismo consumed que antes)', detailAfterReplayAtLimit.body?.dailyQuota?.consumed === maxTurns);

  console.log('--- E/F. Fallo técnico dentro del turno pendiente (justo antes del límite) no consume turno ni cuota; el retry de ESE turno sigue permitido ---');
  const nearLimitConversation = await req('POST', '/ai/me/conversations', turnLimitTester.headers, {});
  const nearLimitConversationId = nearLimitConversation.body?.conversationId as string;
  const turnsBeforeLast = maxTurns - 1;
  for (let turn = 1; turn <= turnsBeforeLast; turn++) {
    await req('POST', `/ai/me/conversations/${nearLimitConversationId}/messages`, turnLimitTester.headers, { content: `Turno ${turn}`, operationId: randomOperationId() });
  }
  const detailBeforeLast = await req('GET', `/ai/me/conversations/${nearLimitConversationId}`, turnLimitTester.headers);
  check(`E/F. fixture: turnCount == ${turnsBeforeLast} antes del último turno permitido`, detailBeforeLast.body?.turnCount === turnsBeforeLast);
  const consumedBeforeLastAttempt = detailBeforeLast.body?.dailyQuota?.consumed as number;

  const lastOperationId = randomOperationId();
  const lastFailedSend = await req('POST', `/ai/me/conversations/${nearLimitConversationId}/messages`, turnLimitTester.headers, { content: FAKE_AI_PROVIDER_FAILURE_TRIGGER, operationId: lastOperationId });
  check('E. el último turno permitido falla técnicamente -> 503, nunca 409 (el límite SÍ permitía este turno)', lastFailedSend.status === 503);
  const detailAfterLastFailure = await req('GET', `/ai/me/conversations/${nearLimitConversationId}`, turnLimitTester.headers);
  check('E. turnCount SIGUE en el mismo valor -- el fallo técnico no consumió el turno (sin ASSISTANT persistido)', detailAfterLastFailure.body?.turnCount === turnsBeforeLast);
  check('E. el mensaje USER del último turno SÍ quedó persistido (1 USER huérfano legítimo, reintentable)', (detailAfterLastFailure.body?.messages ?? []).length === turnsBeforeLast * 2 + 1);
  check('E. el fallo técnico NO consumió cuota diaria', detailAfterLastFailure.body?.dailyQuota?.consumed === consumedBeforeLastAttempt);

  const lastRetry = await req('POST', `/ai/me/conversations/${nearLimitConversationId}/messages`, turnLimitTester.headers, { content: FAKE_AI_PROVIDER_FAILURE_TRIGGER, operationId: lastOperationId });
  check('F. reintento del MISMO operationId (turno pendiente) -> sigue permitido (503 por el mismo fallo determinista, NUNCA 409 por límite)', lastRetry.status === 503);
  const detailAfterLastRetry = await req('GET', `/ai/me/conversations/${nearLimitConversationId}`, turnLimitTester.headers);
  check('F. sin duplicar el USER del turno pendiente tras el retry', (detailAfterLastRetry.body?.messages ?? []).length === turnsBeforeLast * 2 + 1);
  check('F. turnCount sigue igual -- el turno pendiente todavía no cuenta como completado', detailAfterLastRetry.body?.turnCount === turnsBeforeLast);
  check('F. el retry técnico tampoco consumió cuota diaria', detailAfterLastRetry.body?.dailyQuota?.consumed === consumedBeforeLastAttempt);

  console.log('--- 15. Verificación estática: ningún archivo de src/ai/ escribe en dominio de Gamificación/Progreso/Ranking ---');
  const aiDir = join(__dirname, '..', 'src', 'ai');
  const aiFiles = readdirSync(aiDir).filter((f) => f.endsWith('.ts'));
  const aiSources = aiFiles.map((f) => ({ file: f, content: readFileSync(join(aiDir, f), 'utf8') }));
  // Se busca CÓDIGO real, no prosa de comentarios -- desde el Incremento 3
  // varios archivos (ai-usage-ledger.repository.ts, ai-conversation.service.ts)
  // documentan legítimamente el paralelismo con XpLedgerEntryRepository/
  // XpGrantService (mismo patrón de ledger append-only) en sus docstrings;
  // eso es esperado y correcto, nunca un import real.
  const forbiddenDomainImports = ["from '../gamification/", "from '../progress/", "XpLedgerEntry", "RewardGrant", "LeaderboardEntry"];
  let leakedDomainImport: string | null = null;
  for (const { content } of aiSources) {
    const codeOnly = content
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        return !trimmed.startsWith('*') && !trimmed.startsWith('//') && !trimmed.startsWith('/**');
      })
      .join('\n');
    for (const forbidden of forbiddenDomainImports) {
      if (codeOnly.includes(forbidden)) leakedDomainImport = forbidden;
    }
  }
  check('ningún archivo de src/ai/ importa GAMIFICATION/PROGRESS ni referencia XP/ranking/recompensas directamente en CÓDIGO real (menciones en comentarios de diseño son esperadas)', leakedDomainImport === null);

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
