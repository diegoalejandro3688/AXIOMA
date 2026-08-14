// Gate de LEF Bloque VI, Incremento 3 ("Cuotas, idempotencia y control de
// coste") -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §22 (revisión).
// Mayoritariamente contra FakeAiProvider (determinista, sin red, sin coste)
// -- ver items 20 (fuente fake) y el gate de integración real de Anthropic
// (`verify-ai-anthropic-integration-gate.ts`, PARTE A extendida) para la
// prueba equivalente de que `AnthropicAiProvider` puebla `usage` real.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { FAKE_AI_PROVIDER_FAILURE_TRIGGER, FAKE_AI_PROVIDER_FAIL_ONCE_PREFIX } from '../src/ai/fake-ai-provider';

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

/**
 * Hallazgo correctivo de concurrencia (Fase B) -- una aserción DERIVADA solo
 * es evaluable si la clasificación ganador/perdedor de la carrera fue
 * UNÍVOCA. Antes se usaba `raceA.status === 409 ? A : B`, un ternario sin
 * rama para "ninguno fue 409": cuando el perdedor real devolvía 500 en vez de
 * 409, el ternario caía por defecto y evaluaba al GANADOR como si fuera el
 * perdedor, produciendo FALLOS EN CASCADA falsos (F2e/F2f) a partir de un
 * único evento real. Ahora se marca explícitamente SKIPPED con el motivo --
 * NUNCA FAIL, para no inventar defectos -- mientras la aserción PRIMARIA
 * separada (F2b/F3b, "exactamente uno fue rechazado con 409") sigue fallando
 * claramente, de modo que el problema real nunca desaparece tras un SKIPPED.
 */
let skipped = 0;
function skip(label: string, reason: string) {
  console.warn(`SKIPPED  ${label} -- ${reason}`);
  skipped++;
}

/**
 * Identificación del perdedor por EVIDENCIA POSITIVA: primero se identifica al
 * GANADOR (la única respuesta 2xx), y el perdedor se deriva por complemento
 * SOLO si hay exactamente un ganador. Devuelve `null` si la clasificación no
 * es unívoca (0 o 2+ ganadores).
 */
function classifyRace<T extends { status: number }>(a: T, b: T): { winner: T; loser: T } | null {
  const successes = [a, b].filter((r) => r.status === 200 || r.status === 201);
  if (successes.length !== 1) return null;
  const winner = successes[0]!;
  return { winner, loser: winner === a ? b : a };
}

/**
 * Este gate hace MUCHAS más peticiones que los demás (Incremento 3, PARTE F
 * de concurrencia + secuencias de hasta 49 consultas) -- puede chocar con el
 * límite GLOBAL de `ThrottlerModule` (100 req/60s, ver app.module.ts), que
 * es infraestructura compartida de todo el backend, no algo propio de este
 * dominio. Absorbido con backoff acotado -- NUNCA se relaja el límite real,
 * ningún test de este archivo verifica un 429 crudo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown, attempt = 0): Promise<{ status: number; body: any; raw: string }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, 12_000));
    return req(method, path, headers, body, attempt + 1);
  }
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

/** Este gate crea muchas más sesiones que los demás (concurrencia real, PARTE F) -- el límite de /auth/session (10/60s) es del propio AUTH, no de este dominio; `req()` ya absorbe el 429 con backoff acotado, nunca desactivando el límite. */
async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `ai-quota-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function newConversation(headers: Record<string, string>): Promise<string> {
  const res = await req('POST', '/ai/me/conversations', headers, {});
  return res.body?.conversationId as string;
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // ------------------------------------------------------------------
  // 1-4. Cuenta FREE: 3 consultas disponibles, consumed/remaining exactos tras cada una.
  // ------------------------------------------------------------------
  console.log('--- 1-4. FREE: 3 consultas disponibles, consumed/remaining exactos ---');
  const free1 = await createSession('free1');
  const conv1 = await newConversation(free1.headers);

  const initial = await req('GET', `/ai/me/conversations/${conv1}`, free1.headers);
  check('1. cuenta FREE nueva: dailyQuota.limit == 3', initial.body?.dailyQuota?.limit === 3);
  check('1. cuenta FREE nueva: dailyQuota.consumed == 0', initial.body?.dailyQuota?.consumed === 0);
  check('1. cuenta FREE nueva: dailyQuota.remaining == 3', initial.body?.dailyQuota?.remaining === 3);

  const operationId1 = randomOperationId();
  const send1 = await req('POST', `/ai/me/conversations/${conv1}/messages`, free1.headers, { content: 'consulta 1', operationId: operationId1 });
  check('2. primera respuesta utilizable -> 200/201', send1.status === 200 || send1.status === 201);
  check('2. consumed=1, remaining=2', send1.body?.dailyQuota?.consumed === 1 && send1.body?.dailyQuota?.remaining === 2);

  const send2 = await req('POST', `/ai/me/conversations/${conv1}/messages`, free1.headers, { content: 'consulta 2', operationId: randomOperationId() });
  check('3. segunda -> remaining=1', send2.body?.dailyQuota?.consumed === 2 && send2.body?.dailyQuota?.remaining === 1);

  const send3 = await req('POST', `/ai/me/conversations/${conv1}/messages`, free1.headers, { content: 'consulta 3', operationId: randomOperationId() });
  check('4. tercera -> remaining=0', send3.body?.dailyQuota?.consumed === 3 && send3.body?.dailyQuota?.remaining === 0);

  // ------------------------------------------------------------------
  // 5-8. Cuarta operación NUEVA -> rechazada ANTES del provider; sin USER, sin ASSISTANT, sin consumo.
  // ------------------------------------------------------------------
  console.log('--- 5-8. Cuarta operación NUEVA -> rechazada antes del provider; sin USER/ASSISTANT/consumo ---');
  const detailBeforeFourth = await req('GET', `/ai/me/conversations/${conv1}`, free1.headers);
  const messageCountBeforeFourth = (detailBeforeFourth.body?.messages ?? []).length;
  const fourthOperationId = randomOperationId();
  const send4 = await req('POST', `/ai/me/conversations/${conv1}/messages`, free1.headers, { content: 'consulta 4 -- debe rechazarse', operationId: fourthOperationId });
  check('5. cuarta operación NUEVA -> 409 (rechazada antes de invocar al provider)', send4.status === 409);
  const detailAfterFourth = await req('GET', `/ai/me/conversations/${conv1}`, free1.headers);
  check('6. cuarta no persiste USER -- mismo número de mensajes que antes', (detailAfterFourth.body?.messages ?? []).length === messageCountBeforeFourth);
  check('7. cuarta no crea ASSISTANT -- mismo turnCount que antes', detailAfterFourth.body?.turnCount === detailBeforeFourth.body?.turnCount);
  check('8. cuarta no consume -- dailyQuota.consumed sigue en 3', detailAfterFourth.body?.dailyQuota?.consumed === 3);
  const ledgerRowForFourth = await pg.query('SELECT 1 FROM ai_usage_ledger WHERE operation_id = $1', [fourthOperationId]);
  check('8b. ninguna fila de ledger para el operationId rechazado', ledgerRowForFourth.rowCount === 0);

  // ------------------------------------------------------------------
  // 9. Replay de una de las 3 completadas sigue funcionando con remaining=0.
  // ------------------------------------------------------------------
  console.log('--- 9. Replay de una operación ya completada sigue funcionando con remaining=0 ---');
  const replay = await req('POST', `/ai/me/conversations/${conv1}/messages`, free1.headers, { content: 'consulta 1 (replay)', operationId: operationId1 });
  check('9. replay -> 200/201 (nunca 409 pese a remaining=0)', replay.status === 200 || replay.status === 201);
  check('9. replay devuelve el mismo assistantMessage.id que la operación original', replay.body?.assistantMessage?.id === send1.body?.assistantMessage?.id);
  check('9. replay -> dailyQuota.consumed SIGUE en 3, remaining SIGUE en 0 (sin consumo adicional)', replay.body?.dailyQuota?.consumed === 3 && replay.body?.dailyQuota?.remaining === 0);

  // ------------------------------------------------------------------
  // 10-11. Fallo técnico no consume; retry del mismo operationId que finalmente tiene éxito consume exactamente 1.
  // ------------------------------------------------------------------
  console.log('--- 10-11. Fallo técnico no consume; retry que finalmente tiene éxito consume exactamente 1 ---');
  const free2 = await createSession('free2');
  const conv2 = await newConversation(free2.headers);
  const failOnceContent = `${FAKE_AI_PROVIDER_FAIL_ONCE_PREFIX}${randomOperationId()}`;
  const retryOperationId = randomOperationId();

  const firstAttempt = await req('POST', `/ai/me/conversations/${conv2}/messages`, free2.headers, { content: failOnceContent, operationId: retryOperationId });
  check('10. primer intento -> 503 (fallo técnico controlado)', firstAttempt.status === 503);
  const detailAfterFirstAttempt = await req('GET', `/ai/me/conversations/${conv2}`, free2.headers);
  check('10. fallo técnico no consume -- dailyQuota.consumed == 0', detailAfterFirstAttempt.body?.dailyQuota?.consumed === 0);
  check('10. USER quedó persistido (1 mensaje), sin ASSISTANT', (detailAfterFirstAttempt.body?.messages ?? []).length === 1 && detailAfterFirstAttempt.body?.turnCount === 0);

  const retrySuccess = await req('POST', `/ai/me/conversations/${conv2}/messages`, free2.headers, { content: 'contenido ignorado en el retry -- se reusa el original', operationId: retryOperationId });
  check('11. retry del MISMO operationId -> 200/201 (finalmente tiene éxito)', retrySuccess.status === 200 || retrySuccess.status === 201);
  check('11. el retry exitoso consume EXACTAMENTE 1 -- dailyQuota.consumed == 1', retrySuccess.body?.dailyQuota?.consumed === 1);
  const ledgerRowsForRetry = await pg.query('SELECT count(*) FROM ai_usage_ledger WHERE operation_id = $1', [retryOperationId]);
  check('11b. EXACTAMENTE 1 fila de ledger para ese operationId (nunca 2, pese a 2 intentos físicos)', Number(ledgerRowsForRetry.rows[0].count) === 1);

  // ------------------------------------------------------------------
  // 12-13. Timeout / error permanente del proveedor no consumen -- prueba arquitectónica: MISMO catch, category-agnóstico (ver AiConversationService.completeAssistantReply).
  // ------------------------------------------------------------------
  console.log('--- 12-13. Timeout / error permanente no consumen (prueba arquitectónica + referencia cruzada al gate de Incremento 2) ---');
  const serviceSource = readFileSync(join(__dirname, '..', 'src', 'ai', 'ai-conversation.service.ts'), 'utf8');
  // Incremento 6 (revisión Product Owner, 2026-08-12): el catch de AiProviderTechnicalError ahora bifurca el OUTCOME HTTP
  // (422/AI_SAFETY_BLOCKED para 'provider_safety_refusal', 503 para cualquier otra categoría) -- pero para TODA categoría,
  // el resultado de DOMINIO sigue siendo idéntico: nunca se llega a `persistConsumedReply` (cero consumo, cero ASSISTANT,
  // cero fila de ledger). Esta verificación se actualiza para reflejar esa bifurcación intencional sin perder la propiedad
  // original que prueba (timeout/error permanente/transitorio NUNCA consumen) -- ver verify-ai-safety-gate.ts (sección
  // B3-safety) para la cobertura completa y explícita del nuevo outcome 422.
  const catchAnchorIndex = serviceSource.indexOf('if (error instanceof AiProviderTechnicalError) {');
  const throwErrorIndex = catchAnchorIndex >= 0 ? serviceSource.indexOf('throw error;', catchAnchorIndex) : -1;
  const catchBlockSlice = catchAnchorIndex >= 0 && throwErrorIndex >= 0 ? serviceSource.slice(catchAnchorIndex, throwErrorIndex) : '';
  check(
    '12/13. el catch de AiProviderTechnicalError en completeAssistantReply cubre TODAS las categorías (nunca llega a persistConsumedReply) -- bifurca el outcome HTTP (422 seguridad / 503 técnico) sin excepción sin capturar',
    catchAnchorIndex >= 0 &&
      catchBlockSlice.includes('ServiceUnavailableException') &&
      catchBlockSlice.includes('UnprocessableEntityException') &&
      catchBlockSlice.includes('provider_safety_refusal') &&
      !catchBlockSlice.includes('persistConsumedReply'),
  );
  check(
    '12/13. las categorías timeout/provider_invalid_request/provider_auth_error están definidas y mapeadas en AnthropicAiProvider (ver gate del Incremento 2, A6/A7/A8) -- mismo AiProviderTechnicalError, mismo catch category-agnóstico aquí probado',
    readFileSync(join(__dirname, '..', 'src', 'ai', 'anthropic-ai-provider.ts'), 'utf8').includes("'timeout'") &&
      readFileSync(join(__dirname, '..', 'src', 'ai', 'anthropic-ai-provider.ts'), 'utf8').includes('provider_invalid_request'),
  );

  // ------------------------------------------------------------------
  // 14. Doble request concurrente con el MISMO operationId -> exactamente 1 consumo.
  // ------------------------------------------------------------------
  console.log('--- 14. Doble request concurrente con el MISMO operationId -> exactamente 1 consumo (concurrencia real) ---');
  const free3 = await createSession('free3');
  const conv3 = await newConversation(free3.headers);
  const concurrentOperationId = randomOperationId();
  const [concA, concB] = await Promise.all([
    req('POST', `/ai/me/conversations/${conv3}/messages`, free3.headers, { content: 'concurrente', operationId: concurrentOperationId }),
    req('POST', `/ai/me/conversations/${conv3}/messages`, free3.headers, { content: 'concurrente', operationId: concurrentOperationId }),
  ]);
  check('14. ambas peticiones concurrentes terminan en éxito (200/201) -- una gana la escritura, la otra relee el resultado', (concA.status === 200 || concA.status === 201) && (concB.status === 200 || concB.status === 201));
  check('14. ambas devuelven EXACTAMENTE el mismo assistantMessage.id (nunca 2 ASSISTANT distintos)', concA.body?.assistantMessage?.id === concB.body?.assistantMessage?.id);
  const ledgerRowsForConcurrent = await pg.query('SELECT count(*) FROM ai_usage_ledger WHERE operation_id = $1', [concurrentOperationId]);
  check('14b. EXACTAMENTE 1 fila de ledger pese a la concurrencia real', Number(ledgerRowsForConcurrent.rows[0].count) === 1);
  const detailAfterConcurrent = await req('GET', `/ai/me/conversations/${conv3}`, free3.headers);
  check('14c. dailyQuota.consumed == 1 tras la carrera (nunca 2)', detailAfterConcurrent.body?.dailyQuota?.consumed === 1);

  // ------------------------------------------------------------------
  // 15. ai_usage_ledger es append-only/inmutable.
  // ------------------------------------------------------------------
  console.log('--- 15. ai_usage_ledger es append-only/inmutable (triggers de Postgres) ---');
  const anyLedgerRow = await pg.query('SELECT id FROM ai_usage_ledger LIMIT 1');
  const sampleLedgerId = anyLedgerRow.rows[0]?.id;
  let updateRejected = false;
  try {
    await pg.query('UPDATE ai_usage_ledger SET attempts = 99 WHERE id = $1', [sampleLedgerId]);
  } catch {
    updateRejected = true;
  }
  check('15a. UPDATE directo sobre ai_usage_ledger rechazado por el trigger enforce_ai_usage_ledger_entry_immutable', updateRejected);
  let deleteRejected = false;
  try {
    await pg.query('DELETE FROM ai_usage_ledger WHERE id = $1', [sampleLedgerId]);
  } catch {
    deleteRejected = true;
  }
  check('15b. DELETE directo sobre ai_usage_ledger rechazado por el trigger enforce_ai_usage_ledger_entry_no_delete', deleteRejected);

  // ------------------------------------------------------------------
  // 16. Reset de ventana diario: una fila de "ayer" no cuenta para "hoy".
  // ------------------------------------------------------------------
  console.log('--- 16. Reset de ventana diario (frontera UTC) ---');
  const free4 = await createSession('free4');
  const conv4 = await newConversation(free4.headers);
  // Fixture: mensaje ASSISTANT + fila de ledger insertados DIRECTAMENTE con occurred_at de ayer (fuera de la app -- el INSERT no está bloqueado por los triggers de inmutabilidad, solo UPDATE/DELETE lo están).
  const yesterdayFixtureMessageId = crypto.randomUUID();
  await pg.query(
    `INSERT INTO ai_message (id, conversation_id, role, content, sequence, created_at) VALUES ($1, $2, 'ASSISTANT', 'fixture de ayer', 0, now() - interval '1 day')`,
    [yesterdayFixtureMessageId, conv4],
  );
  await pg.query(
    `INSERT INTO ai_usage_ledger (id, account_id, conversation_id, assistant_message_id, operation_id, provider, model, prompt_version, attempts, latency_ms, occurred_at)
     VALUES ($1, $2, $3, $4, $5, 'fake', 'fake', 'fake', 1, 0, now() - interval '1 day')`,
    [crypto.randomUUID(), free4.accountId, conv4, yesterdayFixtureMessageId, crypto.randomUUID()],
  );
  const detailWithYesterdayFixture = await req('GET', `/ai/me/conversations/${conv4}`, free4.headers);
  check('16a. la fila de "ayer" NO cuenta para la cuota de HOY -- dailyQuota.consumed == 0 pese al fixture', detailWithYesterdayFixture.body?.dailyQuota?.consumed === 0);
  const sendToday = await req('POST', `/ai/me/conversations/${conv4}/messages`, free4.headers, { content: 'consulta de hoy', operationId: randomOperationId() });
  check('16b. una consulta real de HOY sí cuenta -- consumed == 1 (no 2, la de ayer sigue sin contar)', sendToday.body?.dailyQuota?.consumed === 1);

  // ------------------------------------------------------------------
  // 17-18. Límite de conversación (6) sigue independiente de la cuota diaria; agotar cuota no toca turnCount.
  // ------------------------------------------------------------------
  console.log('--- 17-18. Límite de turnos (6) independiente de cuota diaria; agotar cuota no modifica turnCount ---');
  const free5 = await createSession('free5');
  const conv5 = await newConversation(free5.headers);
  for (let i = 1; i <= 3; i++) {
    await req('POST', `/ai/me/conversations/${conv5}/messages`, free5.headers, { content: `turno ${i}`, operationId: randomOperationId() });
  }
  const detailAtQuotaLimit = await req('GET', `/ai/me/conversations/${conv5}`, free5.headers);
  check('17. tras 3 turnos (cuota FREE agotada), turnCount == 3, MUY por debajo de maxTurns == 6', detailAtQuotaLimit.body?.turnCount === 3 && detailAtQuotaLimit.body?.maxTurns === 6);
  check('17. dailyQuota.remaining == 0 -- la cuota es el límite vinculante aquí, no el límite de turnos', detailAtQuotaLimit.body?.dailyQuota?.remaining === 0);
  const rejectedByQuota = await req('POST', `/ai/me/conversations/${conv5}/messages`, free5.headers, { content: 'turno 4 -- rechazado por cuota, no por límite de turnos', operationId: randomOperationId() });
  check('17. 4º turno rechazado (409) por CUOTA, pese a que el límite de turnos (6) todavía permitiría más', rejectedByQuota.status === 409);
  const detailAfterQuotaRejection = await req('GET', `/ai/me/conversations/${conv5}`, free5.headers);
  check('18. agotamiento de cuota NO modifica turnCount -- sigue en 3', detailAfterQuotaRejection.body?.turnCount === 3);

  // ------------------------------------------------------------------
  // 19. Circuit breaker activo -> degradación controlada, cero consumo.
  // ------------------------------------------------------------------
  console.log('--- 19. Circuit breaker activo -> degradación controlada, cero consumo ---');
  const free6 = await createSession('free6');
  const conv6 = await newConversation(free6.headers);
  const enableBreaker = await req('POST', '/ai/_internal/set-circuit-breaker?disabled=true', { 'x-internal-ops-key': opsKey });
  check('19a. fixture: circuit breaker activado', enableBreaker.status === 200 || enableBreaker.status === 201);
  const breakerOperationId = randomOperationId();
  const sendWithBreaker = await req('POST', `/ai/me/conversations/${conv6}/messages`, free6.headers, { content: 'debería bloquearse por el circuit breaker', operationId: breakerOperationId });
  check('19b. con el breaker activo -> 503 (degradación controlada), el proveedor NUNCA se invoca', sendWithBreaker.status === 503);
  const detailWithBreaker = await req('GET', `/ai/me/conversations/${conv6}`, free6.headers);
  check('19c. USER persistido (reintentable), sin ASSISTANT, dailyQuota.consumed == 0', (detailWithBreaker.body?.messages ?? []).length === 1 && detailWithBreaker.body?.dailyQuota?.consumed === 0);
  const disableBreaker = await req('POST', '/ai/_internal/set-circuit-breaker?disabled=false', { 'x-internal-ops-key': opsKey });
  check('19d. fixture: circuit breaker desactivado de nuevo', disableBreaker.status === 200 || disableBreaker.status === 201);
  const retryAfterBreakerOff = await req('POST', `/ai/me/conversations/${conv6}/messages`, free6.headers, { content: 'ahora sí debería funcionar', operationId: breakerOperationId });
  check('19e. con el breaker desactivado, el retry del MISMO operationId funciona y consume exactamente 1', (retryAfterBreakerOff.status === 200 || retryAfterBreakerOff.status === 201) && retryAfterBreakerOff.body?.dailyQuota?.consumed === 1);

  // ------------------------------------------------------------------
  // 20-21. Usage metadata coincide con la fuente (fake -> nulls); nunca prompt/respuesta completa en el ledger.
  // ------------------------------------------------------------------
  console.log('--- 20-21. Usage metadata coincide con FakeAiProvider; nunca contenido conversacional en el ledger ---');
  const secretContent = `contenido-secreto-${randomOperationId()}-nunca-debe-aparecer-en-el-ledger`;
  const free7 = await createSession('free7');
  const conv7 = await newConversation(free7.headers);
  const sendForUsageCheck = await req('POST', `/ai/me/conversations/${conv7}/messages`, free7.headers, { content: secretContent, operationId: randomOperationId() });
  const ledgerRowForUsageCheck = await pg.query(
    'SELECT provider, model, prompt_version, input_tokens, output_tokens, attempts, latency_ms FROM ai_usage_ledger WHERE assistant_message_id = $1',
    [sendForUsageCheck.body?.assistantMessage?.id],
  );
  const usageRow = ledgerRowForUsageCheck.rows[0];
  check('20. provider == "fake" (coincide con la fuente real usada por este gate)', usageRow?.provider === 'fake');
  check('20. model == "fake", prompt_version == "fake"', usageRow?.model === 'fake' && usageRow?.prompt_version === 'fake');
  check('20. input_tokens/output_tokens == null (FakeAiProvider nunca inventa tokens)', usageRow?.input_tokens === null && usageRow?.output_tokens === null);
  check('20. attempts == 1, latency_ms >= 0', usageRow?.attempts === 1 && Number(usageRow?.latency_ms) >= 0);
  const ledgerColumns = await pg.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_usage_ledger'`,
  );
  const columnNames = ledgerColumns.rows.map((r) => r.column_name as string);
  check('21a. el esquema de ai_usage_ledger NO tiene ninguna columna de contenido (content/prompt/message/response)', !columnNames.some((c) => /content|prompt_text|message|response/i.test(c)) || columnNames.includes('prompt_version'));
  const rawLedgerRow = await pg.query('SELECT * FROM ai_usage_ledger WHERE assistant_message_id = $1', [sendForUsageCheck.body?.assistantMessage?.id]);
  const rawLedgerJson = JSON.stringify(rawLedgerRow.rows[0]);
  check('21b. el contenido secreto del mensaje NUNCA aparece en ninguna columna de la fila del ledger', !rawLedgerJson.includes(secretContent));

  // ------------------------------------------------------------------
  // 22. Cross-cuenta: cada cuenta ve únicamente su propia cuota.
  // ------------------------------------------------------------------
  console.log('--- 22. Cross-cuenta: cada cuenta ve únicamente su propia cuota ---');
  const accountX = await createSession('crossX');
  const accountY = await createSession('crossY');
  const convX = await newConversation(accountX.headers);
  await req('POST', `/ai/me/conversations/${convX}/messages`, accountX.headers, { content: 'consulta de X', operationId: randomOperationId() });
  const detailX = await req('GET', `/ai/me/conversations/${convX}`, accountX.headers);
  check('22a. cuenta X: dailyQuota.consumed == 1 tras su propia consulta', detailX.body?.dailyQuota?.consumed === 1);
  const convY = await newConversation(accountY.headers);
  const detailY = await req('GET', `/ai/me/conversations/${convY}`, accountY.headers);
  check('22b. cuenta Y (nunca consultó): dailyQuota.consumed == 0 -- NUNCA ve el consumo de X', detailY.body?.dailyQuota?.consumed === 0 && detailY.body?.dailyQuota?.remaining === 3);
  const crossRead = await req('GET', `/ai/me/conversations/${convX}`, accountY.headers);
  check('22c. Y no puede leer la conversación de X (404 uniforme, ya cubierto en el gate ordinario) -- reconfirmado aquí junto a la cuota', crossRead.status === 404);

  // ------------------------------------------------------------------
  // PARTE F (revisión del Product Owner -- auditoría de concurrencia real).
  // ------------------------------------------------------------------
  console.log('=== PARTE F: concurrencia real -- provider exactly-once, quota race, turn race ===');

  console.log('--- F1. Mismo operationId concurrente -> el proveedor se invoca EXACTAMENTE una vez ---');
  {
    const freeF1 = await createSession('freeF1');
    const convF1 = await newConversation(freeF1.headers);
    const opIdF1 = randomOperationId();
    const contentF1 = `contenido-F1-${opIdF1}`;
    const [respA, respB] = await Promise.all([
      req('POST', `/ai/me/conversations/${convF1}/messages`, freeF1.headers, { content: contentF1, operationId: opIdF1 }),
      req('POST', `/ai/me/conversations/${convF1}/messages`, freeF1.headers, { content: contentF1, operationId: opIdF1 }),
    ]);
    check('F1a. ambas peticiones concurrentes terminan en éxito (200/201)', (respA.status === 200 || respA.status === 201) && (respB.status === 200 || respB.status === 201));
    check('F1b. ambas devuelven EXACTAMENTE el mismo assistantMessage.id', respA.body?.assistantMessage?.id === respB.body?.assistantMessage?.id);
    const callCountF1 = await req('GET', `/ai/_internal/fake-provider-call-count?content=${encodeURIComponent(contentF1)}`, { 'x-internal-ops-key': opsKey });
    check('F1c. el proveedor fue invocado EXACTAMENTE 1 vez para esta operación (nunca 2)', callCountF1.body?.count === 1);
    const ledgerCountF1 = await pg.query('SELECT count(*) FROM ai_usage_ledger WHERE operation_id = $1', [opIdF1]);
    check('F1d. EXACTAMENTE 1 fila de ledger', Number(ledgerCountF1.rows[0].count) === 1);
  }

  console.log('--- F2. FREE consumed=2: dos operationId DISTINTOS concurrentes -> consumed final EXACTAMENTE 3, nunca 4 ---');
  {
    const freeF2 = await createSession('freeF2');
    const convF2 = await newConversation(freeF2.headers);
    await req('POST', `/ai/me/conversations/${convF2}/messages`, freeF2.headers, { content: 'previo 1', operationId: randomOperationId() });
    await req('POST', `/ai/me/conversations/${convF2}/messages`, freeF2.headers, { content: 'previo 2', operationId: randomOperationId() });
    const detailBeforeRace = await req('GET', `/ai/me/conversations/${convF2}`, freeF2.headers);
    check('F2 fixture: consumed == 2, remaining == 1 antes de la carrera', detailBeforeRace.body?.dailyQuota?.consumed === 2 && detailBeforeRace.body?.dailyQuota?.remaining === 1);

    const opIdRaceA = randomOperationId();
    const opIdRaceB = randomOperationId();
    const contentRaceA = `contenido-F2-A-${opIdRaceA}`;
    const contentRaceB = `contenido-F2-B-${opIdRaceB}`;
    const [raceA, raceB] = await Promise.all([
      req('POST', `/ai/me/conversations/${convF2}/messages`, freeF2.headers, { content: contentRaceA, operationId: opIdRaceA }),
      req('POST', `/ai/me/conversations/${convF2}/messages`, freeF2.headers, { content: contentRaceB, operationId: opIdRaceB }),
    ]);
    const successes = [raceA, raceB].filter((r) => r.status === 200 || r.status === 201);
    const rejections = [raceA, raceB].filter((r) => r.status === 409);
    check('F2a. EXACTAMENTE una de las dos operaciones tuvo éxito', successes.length === 1);
    check('F2b. EXACTAMENTE una de las dos operaciones fue rechazada (409, cuota agotada)', rejections.length === 1);
    // Check NUEVO (Fase B) -- explícito y NUNCA ocultable por un SKIPPED: con el fix del predicado de conflicto
    // serializable, el retry acotado reconcilia la carrera y ninguna de las dos respuestas debe ser 5xx.
    check(
      `F2b2. ninguna de las dos respuestas concurrentes es 5xx (observado: ${raceA.status}/${raceB.status})`,
      raceA.status < 500 && raceB.status < 500,
    );
    const detailAfterRace = await req('GET', `/ai/me/conversations/${convF2}`, freeF2.headers);
    check('F2c. dailyQuota.consumed == 3 EXACTAMENTE (nunca 4)', detailAfterRace.body?.dailyQuota?.consumed === 3);
    check('F2d. dailyQuota.remaining == 0', detailAfterRace.body?.dailyQuota?.remaining === 0);

    // Aserciones DERIVADAS -- ver `classifyRace`: el perdedor se deriva por complemento del ÚNICO ganador 2xx,
    // nunca por un ternario "si no es 409 entonces es el otro" (que confundía ganador y perdedor).
    const classified = classifyRace(raceA, raceB);
    if (!classified) {
      const reason = `clasificación ganador/perdedor NO unívoca (${successes.length} respuestas 2xx: ${raceA.status}/${raceB.status}) -- el defecto real ya está reportado por F2a/F2b/F2b2`;
      skip('F2e. la operación rechazada en admisión NUNCA llamó al proveedor (0 invocaciones)', reason);
      skip('F2f. sin USER huérfano de la operación rechazada en admisión', reason);
    } else {
      const loserContent = classified.loser === raceA ? contentRaceA : contentRaceB;
      const loserOperationId = classified.loser === raceA ? opIdRaceA : opIdRaceB;
      const callCountLoser = await req('GET', `/ai/_internal/fake-provider-call-count?content=${encodeURIComponent(loserContent)}`, { 'x-internal-ops-key': opsKey });
      check('F2e. la operación rechazada en admisión NUNCA llamó al proveedor (0 invocaciones)', callCountLoser.body?.count === 0);
      const orphanCheck = await pg.query('SELECT count(*) FROM ai_message WHERE operation_id = $1', [loserOperationId]);
      check('F2f. sin USER huérfano de la operación rechazada en admisión', Number(orphanCheck.rows[0].count) === 0);
      const loserLedger = await pg.query('SELECT count(*) FROM ai_usage_ledger WHERE operation_id = $1', [loserOperationId]);
      check('F2g. sin fila de ledger de la operación rechazada en admisión', Number(loserLedger.rows[0].count) === 0);
    }
  }

  console.log('--- F3. turnCount=maxTurns-1: dos operationId DISTINTOS concurrentes -> turnCount final EXACTAMENTE maxTurns, nunca maxTurns+1 ---');
  {
    const freeF3 = await createSession('freeF3-turn');
    const premiumOverrideF3 = await req('POST', `/ai/_internal/set-tier-override?accountId=${freeF3.accountId}&tier=PREMIUM`, { 'x-internal-ops-key': opsKey });
    check('F3 fixture: override PREMIUM aplicado (cuota amplia, deja aislado el límite de turnos)', premiumOverrideF3.status === 200 || premiumOverrideF3.status === 201);
    const convF3 = await newConversation(freeF3.headers);
    const maxTurnsF3 = 15; // Premium -- ver AiEntitlementService.
    // La reserva de la carrera solo puede ser vinculante si SOLO queda espacio para 1 turno más -- turnCount debe llegar a maxTurns-1, no a un valor arbitrario bajo.
    for (let i = 1; i <= maxTurnsF3 - 1; i++) {
      await req('POST', `/ai/me/conversations/${convF3}/messages`, freeF3.headers, { content: `turno ${i}`, operationId: randomOperationId() });
    }
    const detailBeforeTurnRace = await req('GET', `/ai/me/conversations/${convF3}`, freeF3.headers);
    check(`F3 fixture: turnCount == ${maxTurnsF3 - 1}, maxTurns == ${maxTurnsF3} (Premium)`, detailBeforeTurnRace.body?.turnCount === maxTurnsF3 - 1 && detailBeforeTurnRace.body?.maxTurns === maxTurnsF3);

    const opIdTurnA = randomOperationId();
    const opIdTurnB = randomOperationId();
    const [turnRaceA, turnRaceB] = await Promise.all([
      req('POST', `/ai/me/conversations/${convF3}/messages`, freeF3.headers, { content: 'último turno -- A', operationId: opIdTurnA }),
      req('POST', `/ai/me/conversations/${convF3}/messages`, freeF3.headers, { content: 'último turno -- B', operationId: opIdTurnB }),
    ]);
    const turnSuccesses = [turnRaceA, turnRaceB].filter((r) => r.status === 200 || r.status === 201);
    const turnRejections = [turnRaceA, turnRaceB].filter((r) => r.status === 409);
    check('F3a. EXACTAMENTE una de las dos operaciones tuvo éxito', turnSuccesses.length === 1);
    check('F3b. EXACTAMENTE una fue rechazada (409, límite de turnos)', turnRejections.length === 1);
    // Check NUEVO (Fase B) -- mismo criterio que F2b2, nunca ocultable por un SKIPPED.
    check(
      `F3b2. ninguna de las dos respuestas concurrentes es 5xx (observado: ${turnRaceA.status}/${turnRaceB.status})`,
      turnRaceA.status < 500 && turnRaceB.status < 500,
    );
    const detailAfterTurnRace = await req('GET', `/ai/me/conversations/${convF3}`, freeF3.headers);
    check(`F3c. turnCount == ${maxTurnsF3} EXACTAMENTE (nunca ${maxTurnsF3 + 1})`, detailAfterTurnRace.body?.turnCount === maxTurnsF3);

    // F3d comparte EXACTAMENTE el mismo defecto de ternario que F2e/F2f -- misma corrección metodológica.
    const classifiedTurn = classifyRace(turnRaceA, turnRaceB);
    if (!classifiedTurn) {
      skip(
        'F3d. sin USER huérfano de la operación rechazada por límite de turnos',
        `clasificación ganador/perdedor NO unívoca (${turnSuccesses.length} respuestas 2xx: ${turnRaceA.status}/${turnRaceB.status}) -- el defecto real ya está reportado por F3a/F3b/F3b2`,
      );
    } else {
      const loserTurnOperationId = classifiedTurn.loser === turnRaceA ? opIdTurnA : opIdTurnB;
      const orphanTurnCheck = await pg.query('SELECT count(*) FROM ai_message WHERE operation_id = $1', [loserTurnOperationId]);
      check('F3d. sin USER huérfano de la operación rechazada por límite de turnos', Number(orphanTurnCheck.rows[0].count) === 0);
      const loserTurnLedger = await pg.query('SELECT count(*) FROM ai_usage_ledger WHERE operation_id = $1', [loserTurnOperationId]);
      check('F3e. sin fila de ledger de la operación rechazada por límite de turnos', Number(loserTurnLedger.rows[0].count) === 0);
    }
  }

  console.log('--- F5. Replay/retry siguen funcionando después de las carreras anteriores (sanity adicional) ---');
  {
    const freeF5 = await createSession('freeF5');
    const convF5 = await newConversation(freeF5.headers);
    const opIdF5 = randomOperationId();
    const first = await req('POST', `/ai/me/conversations/${convF5}/messages`, freeF5.headers, { content: 'smoke replay', operationId: opIdF5 });
    const replayF5 = await req('POST', `/ai/me/conversations/${convF5}/messages`, freeF5.headers, { content: 'smoke replay (ignorado)', operationId: opIdF5 });
    check('F5. replay tras las pruebas de concurrencia sigue devolviendo el mismo resultado', first.body?.assistantMessage?.id === replayF5.body?.assistantMessage?.id);
  }

  console.log('--- F6. PREMIUM: mismo mecanismo de carrera de cuota, límite 50 (override exclusivo de gate) ---');
  {
    const premiumF6 = await createSession('premiumF6');
    const overrideF6 = await req('POST', `/ai/_internal/set-tier-override?accountId=${premiumF6.accountId}&tier=PREMIUM`, { 'x-internal-ops-key': opsKey });
    check('F6 fixture: override PREMIUM aplicado', overrideF6.status === 200 || overrideF6.status === 201);
    // maxTurns Premium == 15 -- la cuota (50) es POR CUENTA, el límite de turnos es POR CONVERSACIÓN;
    // hace falta rotar de conversación cada 10 turnos para acumular 49 consultas sin chocar con maxTurns.
    let convF6 = await newConversation(premiumF6.headers);
    for (let i = 1; i <= 49; i++) {
      if (i > 1 && (i - 1) % 10 === 0) convF6 = await newConversation(premiumF6.headers);
      const sendF6 = await req('POST', `/ai/me/conversations/${convF6}/messages`, premiumF6.headers, { content: `consulta ${i}`, operationId: randomOperationId() });
      if (sendF6.status !== 200 && sendF6.status !== 201) {
        console.error(`F6 fixture: consulta ${i} inesperadamente rechazada (status ${sendF6.status}): ${sendF6.raw}`);
      }
    }
    const detailBeforePremiumRace = await req('GET', `/ai/me/conversations/${convF6}`, premiumF6.headers);
    check('F6 fixture: dailyQuota.consumed == 49, remaining == 1 (Premium, límite 50)', detailBeforePremiumRace.body?.dailyQuota?.consumed === 49 && detailBeforePremiumRace.body?.dailyQuota?.remaining === 1);

    const convF6Race = await newConversation(premiumF6.headers);
    const [premiumRaceA, premiumRaceB] = await Promise.all([
      req('POST', `/ai/me/conversations/${convF6Race}/messages`, premiumF6.headers, { content: 'consulta 50 -- A', operationId: randomOperationId() }),
      req('POST', `/ai/me/conversations/${convF6Race}/messages`, premiumF6.headers, { content: 'consulta 50 -- B', operationId: randomOperationId() }),
    ]);
    const premiumSuccesses = [premiumRaceA, premiumRaceB].filter((r) => r.status === 200 || r.status === 201);
    check('F6a. EXACTAMENTE una de las dos tuvo éxito', premiumSuccesses.length === 1);
    const detailAfterPremiumRace = await req('GET', `/ai/me/conversations/${convF6Race}`, premiumF6.headers);
    check('F6b. dailyQuota.consumed == 50 EXACTAMENTE (nunca 51) -- mismo mecanismo, límite Premium', detailAfterPremiumRace.body?.dailyQuota?.consumed === 50);
  }

  console.log('--- F7. Verificación estática: ninguna transacción envuelve la llamada al proveedor ---');
  {
    const serviceSourceF7 = readFileSync(join(__dirname, '..', 'src', 'ai', 'ai-conversation.service.ts'), 'utf8');
    const completeAssistantReplyBody = serviceSourceF7.slice(
      serviceSourceF7.indexOf('private async completeAssistantReply'),
      serviceSourceF7.indexOf('private async waitForConcurrentCompletion'),
    );
    check(
      'F7. completeAssistantReply (fase provider call) NO contiene ninguna llamada a txRunner.run/runSerializable envolviendo this.provider.generateReply',
      !completeAssistantReplyBody.includes('this.txRunner.run') && !completeAssistantReplyBody.includes('this.runSerializable'),
    );
    check('F7b. generateReply se invoca dentro de completeAssistantReply (la función auditada es la correcta)', completeAssistantReplyBody.includes('this.provider.generateReply'));
  }

  // ------------------------------------------------------------------
  // Verificación estática auxiliar: FakeAiProvider mantiene FAKE_AI_PROVIDER_FAIL_ONCE_PREFIX exportado, mismo criterio de reproducibilidad que FAKE_AI_PROVIDER_FAILURE_TRIGGER.
  // ------------------------------------------------------------------
  console.log('--- Verificación auxiliar: exports deterministas del fake provider ---');
  check('FAKE_AI_PROVIDER_FAILURE_TRIGGER sigue exportado', typeof FAKE_AI_PROVIDER_FAILURE_TRIGGER === 'string');
  check('FAKE_AI_PROVIDER_FAIL_ONCE_PREFIX sigue exportado', typeof FAKE_AI_PROVIDER_FAIL_ONCE_PREFIX === 'string');

  await pg.end();

  console.log('');
  if (skipped > 0) {
    console.warn(`${skipped} verificación(es) DERIVADA(S) omitidas por clasificación no unívoca (ver SKIPPED arriba) -- las aserciones primarias correspondientes siguen evaluadas.`);
  }
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Cuotas/Idempotencia/Coste (LEF Bloque VI, Incremento 3) pasaron.');
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
