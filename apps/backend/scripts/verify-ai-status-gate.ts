// Gate de LEF Bloque VI, Incremento 8 -- contraparte BACKEND del cierre del
// hueco detectado en la verificación práctica de la superficie móvil: una
// cuenta SIN conversaciones no podía ver su cuota diaria ni el disclaimer,
// porque ambos solo viajaban dentro de la respuesta de una conversación
// (create/list/get), y el contrato de I8 prohíbe fabricarlos en el cliente.
//
// Verifica `GET /ai/me/status` contra backend REAL + Postgres REAL, con
// FakeAiProvider (nunca llamadas pagadas). El complemento estático de mobile
// (cero fallback hardcodeado de cuota/disclaimer) vive en
// `apps/mobile/scripts/verify-ai-mobile-gate.ts`, sección 26/26b.
//
// Invariantes probados: (a) forma EXACTA de la respuesta -- 4 campos de
// cuota + disclaimer, nada más; (b) CERO efectos secundarios (no crea
// conversación, no crea mensaje, no escribe en el ledger, no crea claims);
// (c) CERO invocaciones al proveedor; (d) reutiliza la lógica canónica de
// cuota y la constante canónica del disclaimer (no hay fórmula duplicada);
// (e) requiere sesión (401 sin ella); (f) refleja remaining=0 con la cuota
// agotada; (g) no filtra provider/model/tokens/coste/tier.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { AXIOMA_TUTOR_DISCLAIMER } from '../src/ai/ai-pedagogy';

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

/** Mismo backoff acotado que `verify-ai-quota-gate.ts` -- el límite global de ThrottlerModule es infraestructura compartida, nunca se relaja. */
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

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `ai-status-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function providerTotalCalls(): Promise<number> {
  const res = await req('GET', '/ai/_internal/fake-provider-total-call-count', { 'x-internal-ops-key': opsKey });
  if (res.status !== 200) throw new Error(`No se pudo leer el contador total del FakeAiProvider: ${res.status} ${res.raw}`);
  return res.body.count as number;
}

function readSource(...pathSegments: string[]): string {
  return readFileSync(join(__dirname, '..', ...pathSegments), 'utf8');
}

/** Prohibiciones sobre CÓDIGO real, no sobre la prosa de los comentarios -- mismo criterio que `verify-ai-mobile-gate.ts`. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  async function countsFor(accountId: string) {
    const [conversations, messages, ledger, claims] = await Promise.all([
      pg.query('SELECT count(*)::int AS n FROM ai_conversation WHERE account_id = $1', [accountId]),
      pg.query('SELECT count(*)::int AS n FROM ai_message m JOIN ai_conversation c ON c.id = m.conversation_id WHERE c.account_id = $1', [accountId]),
      pg.query('SELECT count(*)::int AS n FROM ai_usage_ledger WHERE account_id = $1', [accountId]),
      pg.query('SELECT count(*)::int AS n FROM ai_generation_claim WHERE account_id = $1', [accountId]),
    ]);
    return {
      conversations: conversations.rows[0].n as number,
      messages: messages.rows[0].n as number,
      ledger: ledger.rows[0].n as number,
      claims: claims.rows[0].n as number,
    };
  }

  // ------------------------------------------------------------------
  // 1. Cuenta NUEVA, sin ninguna conversación: status responde cuota real + disclaimer real.
  // ------------------------------------------------------------------
  console.log('--- 1. Cuenta nueva SIN conversaciones: status devuelve cuota y disclaimer reales ---');
  const fresh = await createSession('fresh');
  const beforeCounts = await countsFor(fresh.accountId);
  const providerCallsBefore = await providerTotalCalls();
  check('precondición: la cuenta no tiene NINGUNA conversación', beforeCounts.conversations === 0);

  const status = await req('GET', '/ai/me/status', fresh.headers);
  check('1. GET /ai/me/status -> 200', status.status === 200);
  check('1. dailyQuota.limit es el límite REAL del entitlement (entero positivo)', Number.isInteger(status.body?.dailyQuota?.limit) && status.body.dailyQuota.limit > 0);
  check('1. cuenta nueva: consumed == 0', status.body?.dailyQuota?.consumed === 0);
  check('1. cuenta nueva: remaining == limit', status.body?.dailyQuota?.remaining === status.body?.dailyQuota?.limit);
  check('1. resetAt es un instante ISO válido', typeof status.body?.dailyQuota?.resetAt === 'string' && !Number.isNaN(Date.parse(status.body.dailyQuota.resetAt)));
  check('1. disclaimer es EXACTAMENTE la constante canónica del backend (AXIOMA_TUTOR_DISCLAIMER)', status.body?.disclaimer === AXIOMA_TUTOR_DISCLAIMER);

  // ------------------------------------------------------------------
  // 2. Forma EXACTA de la respuesta -- ni un campo de más.
  // ------------------------------------------------------------------
  console.log('--- 2. Forma exacta: solo dailyQuota{4} + disclaimer, sin datos internos ---');
  check('2. claves de primer nivel exactamente ["dailyQuota","disclaimer"]', JSON.stringify(Object.keys(status.body ?? {}).sort()) === JSON.stringify(['dailyQuota', 'disclaimer']));
  check('2. claves de dailyQuota exactamente ["consumed","limit","remaining","resetAt"]', JSON.stringify(Object.keys(status.body?.dailyQuota ?? {}).sort()) === JSON.stringify(['consumed', 'limit', 'remaining', 'resetAt']));
  check('2. NO expone turnCount/maxTurns (conceptos por conversación, no por cuenta)', !('turnCount' in (status.body ?? {})) && !('maxTurns' in (status.body ?? {})));
  const forbiddenLeaks = ['provider', 'model', 'token', 'cost', 'coste', 'usage', 'tier', 'premium', 'free', 'entitlement', 'anthropic', 'claude', 'accountId', 'account_id', 'apiKey'];
  const rawLower = status.raw.toLowerCase();
  check('2. el payload crudo no contiene proveedor/modelo/tokens/coste/tier/entitlement/accountId', forbiddenLeaks.every((leak) => !rawLower.includes(leak.toLowerCase())));

  // ------------------------------------------------------------------
  // 3. CERO efectos secundarios en BD y CERO llamadas al proveedor.
  // ------------------------------------------------------------------
  console.log('--- 3. Cero efectos secundarios: sin conversación, sin mensaje, sin ledger, sin claim, sin provider ---');
  // Varias llamadas seguidas: si hubiera cualquier escritura, se acumularía.
  await req('GET', '/ai/me/status', fresh.headers);
  await req('GET', '/ai/me/status', fresh.headers);
  const afterCounts = await countsFor(fresh.accountId);
  check('3. NO crea conversación (mismo conteo en ai_conversation)', afterCounts.conversations === beforeCounts.conversations && afterCounts.conversations === 0);
  check('3. NO crea mensaje (mismo conteo en ai_message)', afterCounts.messages === beforeCounts.messages && afterCounts.messages === 0);
  check('3. NO consume cuota: NO escribe en ai_usage_ledger', afterCounts.ledger === beforeCounts.ledger && afterCounts.ledger === 0);
  check('3. NO crea reservas de admisión (ai_generation_claim)', afterCounts.claims === beforeCounts.claims && afterCounts.claims === 0);
  check('3. CERO invocaciones físicas al AiProvider (contador TOTAL del fake sin cambios)', (await providerTotalCalls()) === providerCallsBefore);
  const statusAgain = await req('GET', '/ai/me/status', fresh.headers);
  check('3. status sigue reportando consumed=0 tras 4 lecturas (idempotente, sin auto-consumo)', statusAgain.body?.dailyQuota?.consumed === 0);

  // ------------------------------------------------------------------
  // 4. Sin sesión -> 401.
  // ------------------------------------------------------------------
  console.log('--- 4. Autenticación obligatoria (mismo guard que el resto de ai/me/*) ---');
  const anon = await req('GET', '/ai/me/status');
  check('4. sin credenciales -> 401', anon.status === 401);
  const badToken = await req('GET', '/ai/me/status', { authorization: 'Bearer no-es-un-token-valido' });
  check('4. token inválido -> 401', badToken.status === 401);
  check('4. la respuesta 401 no filtra cuota ni disclaimer', !anon.raw.includes('dailyQuota') && !anon.raw.includes('disclaimer'));

  // ------------------------------------------------------------------
  // 5. Coherencia con la superficie canónica de conversación (misma lógica, no una paralela).
  // ------------------------------------------------------------------
  console.log('--- 5. Coherencia con la respuesta canónica de conversación ---');
  const withConv = await createSession('withconv');
  const statusBeforeConv = await req('GET', '/ai/me/status', withConv.headers);
  const created = await req('POST', '/ai/me/conversations', withConv.headers, {});
  check('5. crear conversación -> 200/201 (flujo existente de I1 sin regresión)', created.status === 200 || created.status === 201);
  check('5. dailyQuota de status y de la conversación coinciden campo a campo', JSON.stringify(statusBeforeConv.body?.dailyQuota) === JSON.stringify(created.body?.dailyQuota));
  check('5. el disclaimer de status y el de la conversación son el MISMO texto', statusBeforeConv.body?.disclaimer === created.body?.disclaimer);

  const send = await req('POST', `/ai/me/conversations/${created.body.conversationId}/messages`, withConv.headers, {
    content: 'Consulta del gate de status (FakeAiProvider).',
    operationId: crypto.randomUUID(),
  });
  check('5. enviar mensaje -> 200/201 (flujo existente sin regresión)', send.status === 200 || send.status === 201);
  const statusAfterSend = await req('GET', '/ai/me/status', withConv.headers);
  check('5. tras consumir 1 consulta, status refleja el MISMO consumed que la respuesta de envío', statusAfterSend.body?.dailyQuota?.consumed === send.body?.dailyQuota?.consumed);
  check('5. tras consumir 1 consulta, status refleja el MISMO remaining que la respuesta de envío', statusAfterSend.body?.dailyQuota?.remaining === send.body?.dailyQuota?.remaining);
  check('5. status NO añadió consumo propio (consumed == 1 tras exactamente un envío)', statusAfterSend.body?.dailyQuota?.consumed === 1);

  // ------------------------------------------------------------------
  // 6. Cuota agotada -> remaining = 0.
  // ------------------------------------------------------------------
  console.log('--- 6. Cuota agotada: status refleja remaining = 0 ---');
  const exhausted = await createSession('exhausted');
  const exhaustedConv = await req('POST', '/ai/me/conversations', exhausted.headers, {});
  const limit = (await req('GET', '/ai/me/status', exhausted.headers)).body?.dailyQuota?.limit as number;
  for (let i = 0; i < limit; i++) {
    await req('POST', `/ai/me/conversations/${exhaustedConv.body.conversationId}/messages`, exhausted.headers, {
      content: `Consulta ${i + 1} para agotar la cuota (gate de status).`,
      operationId: crypto.randomUUID(),
    });
  }
  const statusExhausted = await req('GET', '/ai/me/status', exhausted.headers);
  check('6. tras agotar la cuota: remaining == 0', statusExhausted.body?.dailyQuota?.remaining === 0);
  check('6. tras agotar la cuota: consumed == limit', statusExhausted.body?.dailyQuota?.consumed === limit);
  const ledgerAfterExhaust = await countsFor(exhausted.accountId);
  const blocked = await req('POST', `/ai/me/conversations/${exhaustedConv.body.conversationId}/messages`, exhausted.headers, {
    content: 'Consulta que debe rechazarse por cuota agotada.',
    operationId: crypto.randomUUID(),
  });
  check('6. una consulta más allá del límite sigue rechazándose con 409 (admisión intacta)', blocked.status === 409);
  const statusAfterBlocked = await req('GET', '/ai/me/status', exhausted.headers);
  check('6. consultar status con la cuota agotada no cambia el ledger', (await countsFor(exhausted.accountId)).ledger === ledgerAfterExhaust.ledger);
  check('6. status sigue reportando remaining == 0', statusAfterBlocked.body?.dailyQuota?.remaining === 0);

  // ------------------------------------------------------------------
  // 7. Reutilización de la lógica canónica (verificación ESTÁTICA sobre el código real).
  // ------------------------------------------------------------------
  console.log('--- 7. Reutiliza la lógica canónica: sin fórmula de cuota duplicada, sin segundo disclaimer ---');
  const controllerSource = readSource('src', 'ai', 'ai-status.controller.ts');
  const controllerCode = stripComments(controllerSource);
  const serviceSource = readSource('src', 'ai', 'ai-conversation.service.ts');
  const serviceCode = stripComments(serviceSource);

  check('7. el controller delega en AiConversationService.getAccountStatus', controllerCode.includes('this.aiConversationService.getAccountStatus(request.accountId)'));
  check('7. getAccountStatus reutiliza getDailyQuotaView (la MISMA función de create/list/get/send)', /async getAccountStatus[\s\S]{0,400}this\.getDailyQuotaView\(accountId, entitlement\)/.test(serviceCode));
  check('7. `getDailyQuotaView` sigue definida UNA sola vez en todo el dominio AI', (serviceCode.match(/private async getDailyQuotaView/g) ?? []).length === 1);
  check('7. el controller NO recalcula la cuota (sin ledger, sin entitlement, sin aritmética de remaining)', !controllerCode.includes('usageLedger') && !controllerCode.includes('Entitlement') && !controllerCode.includes('Math.max') && !controllerCode.includes('countConsumedToday'));
  check('7. el controller NO reimplementa la frontera de día UTC', !controllerCode.includes('utcDayRange') && !controllerCode.includes('Date.UTC') && !controllerCode.includes('setUTCHours'));
  check('7. el disclaimer es la constante canónica importada de ai-pedagogy, no un literal nuevo', controllerCode.includes("import { AXIOMA_TUTOR_DISCLAIMER } from './ai-pedagogy'") && controllerCode.includes('disclaimer: AXIOMA_TUTOR_DISCLAIMER'));
  check('7. AXIOMA_TUTOR_DISCLAIMER sigue definido UNA sola vez (ai-pedagogy.ts)', (stripComments(readSource('src', 'ai', 'ai-pedagogy.ts')).match(/export const AXIOMA_TUTOR_DISCLAIMER/g) ?? []).length === 1);

  console.log('--- 8. El endpoint es estructuralmente incapaz de escribir o de llamar al proveedor ---');
  check('8. el controller no importa NINGÚN proveedor de IA (ni AI_PROVIDER, ni el fake, ni Anthropic)', !controllerCode.includes('AI_PROVIDER') && !controllerCode.includes('FakeAiProvider') && !controllerCode.includes('AnthropicAiProvider'));
  check('8. el controller no importa repositorios de escritura (ledger, claims, mensajes, conversaciones)', !/AiUsageLedgerRepository|AiGenerationClaimRepository|AiMessageRepository|AiConversationRepository/.test(controllerCode));
  const statusMethodBody = /async getAccountStatus\([\s\S]*?\n  \}/.exec(serviceCode)?.[0] ?? '';
  check('8. getAccountStatus solo LEE: sin create/insert/update/delete y sin generateReply', statusMethodBody.length > 0 && !/\.create\(|\.insert|\.update|\.delete|generateReply|runSerializable/.test(statusMethodBody));
  check('8. el controller solo declara métodos @Get (superficie de solo lectura)', !/@Post\(|@Put\(|@Patch\(|@Delete\(/.test(controllerCode) && (controllerCode.match(/@Get\(/g) ?? []).length === 1);
  check('8. el controller exige AuthGuard a nivel de clase', controllerCode.includes('@UseGuards(AuthGuard)'));

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Estado de Cuenta del Tutor IA (LEF Bloque VI, Incremento 8 -- GET /ai/me/status) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
