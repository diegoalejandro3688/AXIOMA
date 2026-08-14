// Gate de estrés de la ADMISIÓN del Tutor IA (hallazgo correctivo de
// concurrencia, Fase B) -- ejercita REPETIDAMENTE la carrera de admisión
// (`AiConversationService.admitNewOperation`, transacción SERIALIZABLE) para
// provocar de forma sostenida el conflicto de serialización real de Postgres
// y demostrar que el outcome contractual es SIEMPRE correcto:
//
//   - un único ganador 2xx,
//   - un perdedor con outcome contractual: 409 (el retry acotado reconcilió
//     la carrera y el rechazo real de negocio emergió) o, si el conflicto
//     persistió tras los 3 reintentos, el 503 técnico intencional,
//   - NUNCA un 500 genérico,
//   - `consumed`/`turnCount` finales EXACTOS en el límite, nunca sobreconsumo.
//
// Complementa (no sustituye) a F2/F3 de `verify-ai-quota-gate.ts`, que cubren
// la carrera UNA vez cada uno: aquí lo que se prueba es la ESTABILIDAD del
// mecanismo bajo repetición. Siempre contra `FakeAiProvider` (determinista,
// sin red, sin coste externo).
//
// Uso: tsx scripts/verify-ai-admission-race-gate.ts [baseUrl] [iteraciones]
import 'dotenv/config';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const ITERATIONS = Number(process.argv[3] ?? 10);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown, attempt = 0): Promise<{ status: number; body: any; raw: string }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  // Mismo criterio que verify-ai-quota-gate.ts: el límite global de ThrottlerModule es infraestructura
  // compartida, se absorbe con backoff acotado -- NUNCA se relaja el límite real.
  if (res.status === 429 && attempt < 6) {
    await new Promise((resolve) => setTimeout(resolve, 12_000));
    return req(method, path, headers, body, attempt + 1);
  }
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `ai-admission-race-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return { accountId: session.body.accountId as string, headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId } };
}

async function newConversation(headers: Record<string, string>): Promise<string> {
  const res = await req('POST', '/ai/me/conversations', headers, {});
  return res.body?.conversationId as string;
}

const statusHistogram = new Map<number, number>();
function recordStatus(status: number) {
  statusHistogram.set(status, (statusHistogram.get(status) ?? 0) + 1);
}

/** Outcome contractual del PERDEDOR: 409 (rechazo real de negocio) o el 503 técnico intencional de agotamiento de reintentos. Nunca 500. */
function loserOutcomeIsContractual(status: number): boolean {
  return status === 409 || status === 503;
}

interface RaceOutcome {
  statuses: [number, number];
  successes: number;
  loserStatus: number | null;
  finalCount: number | null;
}

/**
 * Fixture de estado PREVIO por SQL directo (mismo patrón ya usado en
 * `verify-ai-quota-gate.ts`, test 16): inserta `turns` mensajes ASSISTANT
 * ya "consumidos" en la conversación y, opcionalmente, su fila de ledger de
 * HOY. Se hace por SQL y no por HTTP porque llevar el estado al borde del
 * límite vía la API costaría ~19 peticiones por iteración y chocaría contra
 * el `ThrottlerModule` GLOBAL (100 req/60s), que es infraestructura
 * compartida y NUNCA se relaja. El estado resultante es indistinguible del
 * generado por la API para lo único que importa aquí: los 4 counts que la
 * transacción SERIALIZABLE de admisión ejecuta.
 */
async function seedConsumedTurns(pg: Client, accountId: string, conversationId: string, turns: number, withLedger: boolean) {
  for (let sequence = 0; sequence < turns; sequence++) {
    const messageId = crypto.randomUUID();
    await pg.query(`INSERT INTO ai_message (id, conversation_id, role, content, sequence) VALUES ($1, $2, 'ASSISTANT', $3, $4)`, [
      messageId,
      conversationId,
      `fixture de carrera -- turno ${sequence}`,
      sequence,
    ]);
    if (withLedger) {
      await pg.query(
        `INSERT INTO ai_usage_ledger (id, account_id, conversation_id, assistant_message_id, operation_id, provider, model, prompt_version, attempts, latency_ms, occurred_at)
         VALUES ($1, $2, $3, $4, $5, 'fake', 'fake', 'fake', 1, 0, now())`,
        [crypto.randomUUID(), accountId, conversationId, messageId, crypto.randomUUID()],
      );
    }
  }
}

/** ESCENARIO A -- carrera de CUOTA: FREE con consumed=2 (cupo=1 restante), dos operationId nuevos simultáneos. */
async function quotaRace(pg: Client, iteration: number): Promise<RaceOutcome> {
  const account = await createSession(`quota-${iteration}`);
  const conv = await newConversation(account.headers);
  await seedConsumedTurns(pg, account.accountId, conv, 2, true);
  const [a, b] = await Promise.all([
    req('POST', `/ai/me/conversations/${conv}/messages`, account.headers, { content: 'carrera A', operationId: crypto.randomUUID() }),
    req('POST', `/ai/me/conversations/${conv}/messages`, account.headers, { content: 'carrera B', operationId: crypto.randomUUID() }),
  ]);
  recordStatus(a.status);
  recordStatus(b.status);
  const successes = [a, b].filter((r) => r.status === 200 || r.status === 201);
  const detail = await req('GET', `/ai/me/conversations/${conv}`, account.headers);
  return {
    statuses: [a.status, b.status],
    successes: successes.length,
    loserStatus: successes.length === 1 ? (successes[0] === a ? b.status : a.status) : null,
    finalCount: detail.body?.dailyQuota?.consumed ?? null,
  };
}

/** ESCENARIO B -- carrera de TURNOS: turnCount = maxTurns-1, dos operationId nuevos simultáneos. Override PREMIUM para que la cuota NO sea el límite vinculante (el conflicto queda AISLADO en el límite de turnos). */
async function turnRace(pg: Client, iteration: number): Promise<RaceOutcome> {
  const account = await createSession(`turn-${iteration}`);
  const override = await req('POST', `/ai/_internal/set-tier-override?accountId=${account.accountId}&tier=PREMIUM`, { 'x-internal-ops-key': opsKey });
  if (override.status !== 200 && override.status !== 201) throw new Error(`No se pudo aplicar el override PREMIUM: ${override.status} ${override.raw}`);
  const maxTurns = 15; // Premium -- ver AiEntitlementService.
  const conv = await newConversation(account.headers);
  // Sin ledger: la cuota Premium (50) NO debe ser vinculante -- solo el límite de turnos.
  await seedConsumedTurns(pg, account.accountId, conv, maxTurns - 1, false);
  const [a, b] = await Promise.all([
    req('POST', `/ai/me/conversations/${conv}/messages`, account.headers, { content: 'último turno A', operationId: crypto.randomUUID() }),
    req('POST', `/ai/me/conversations/${conv}/messages`, account.headers, { content: 'último turno B', operationId: crypto.randomUUID() }),
  ]);
  recordStatus(a.status);
  recordStatus(b.status);
  const successes = [a, b].filter((r) => r.status === 200 || r.status === 201);
  const detail = await req('GET', `/ai/me/conversations/${conv}`, account.headers);
  return {
    statuses: [a.status, b.status],
    successes: successes.length,
    loserStatus: successes.length === 1 ? (successes[0] === a ? b.status : a.status) : null,
    finalCount: detail.body?.turnCount ?? null,
  };
}

async function runScenario(name: string, expectedFinal: number, runner: (iteration: number) => Promise<RaceOutcome>) {
  console.log(`--- ${name}: ${ITERATIONS} iteraciones ---`);
  let singleWinner = 0;
  let contractualLoser = 0;
  let exactFinal = 0;
  let overconsumption = 0;
  const anomalies: string[] = [];
  for (let i = 1; i <= ITERATIONS; i++) {
    const outcome = await runner(i);
    if (outcome.successes === 1) singleWinner++;
    else anomalies.push(`it${i}: ${outcome.successes} ganadores (${outcome.statuses.join('/')})`);
    if (outcome.loserStatus !== null && loserOutcomeIsContractual(outcome.loserStatus)) contractualLoser++;
    else if (outcome.loserStatus !== null) anomalies.push(`it${i}: perdedor con status NO contractual ${outcome.loserStatus}`);
    if (outcome.finalCount === expectedFinal) exactFinal++;
    else anomalies.push(`it${i}: conteo final ${outcome.finalCount} != ${expectedFinal}`);
    if (outcome.finalCount !== null && outcome.finalCount > expectedFinal) overconsumption++;
    const has5xx = outcome.statuses.some((s) => s >= 500 && s !== 503);
    if (has5xx) anomalies.push(`it${i}: 5xx NO contractual (${outcome.statuses.join('/')})`);
  }
  check(`${name}: EXACTAMENTE un ganador en las ${ITERATIONS} iteraciones (observado ${singleWinner}/${ITERATIONS})`, singleWinner === ITERATIONS);
  check(`${name}: el perdedor tuvo outcome contractual (409 o el 503 técnico, NUNCA 500) en todas (observado ${contractualLoser}/${singleWinner})`, contractualLoser === singleWinner);
  check(`${name}: conteo final EXACTO == ${expectedFinal} en todas (observado ${exactFinal}/${ITERATIONS})`, exactFinal === ITERATIONS);
  check(`${name}: CERO sobreconsumo (observado ${overconsumption})`, overconsumption === 0);
  if (anomalies.length > 0) console.error(`  Anomalías de ${name}:\n    ${anomalies.join('\n    ')}`);
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Identidad del backend -- nunca se corre este gate contra un proceso con el proveedor real (coste externo).
  const provider = await req('GET', '/ai/_internal/effective-provider', { 'x-internal-ops-key': opsKey });
  check(`fixture: el backend en ${base} usa el proveedor FAKE (observado: ${provider.body?.provider}/${provider.body?.impl})`, provider.body?.provider === 'fake');
  if (provider.body?.provider !== 'fake') {
    console.error('Abortando: este gate NUNCA debe correr contra el proveedor real.');
    process.exit(1);
  }

  const anthropicBefore = Number((await pg.query(`SELECT count(*) FROM ai_usage_ledger WHERE provider = 'anthropic'`)).rows[0].count);

  await runScenario('A. carrera de CUOTA (FREE, consumed=2, cupo=1)', 3, (i) => quotaRace(pg, i));
  await runScenario('B. carrera de TURNOS (PREMIUM, turnCount=maxTurns-1)', 15, (i) => turnRace(pg, i));

  console.log('');
  console.log('Distribución de respuestas HTTP de las peticiones en carrera:');
  for (const [status, count] of [...statusHistogram.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${status}: ${count}`);
  }
  const unexpected5xx = [...statusHistogram.entries()].filter(([s]) => s >= 500 && s !== 503).reduce((acc, [, c]) => acc + c, 0);
  check(`CERO respuestas 5xx no contractuales (500/502/504...) en toda la corrida (observado ${unexpected5xx})`, unexpected5xx === 0);

  // El proveedor REAL nunca se invocó durante esta corrida -- verificado contra el ledger real (delta), no por suposición.
  // Nota: el ledger es append-only e histórico; puede contener filas `anthropic` de sesiones de evaluación ANTERIORES
  // y legítimas -- por eso se compara el DELTA de esta corrida, no el total absoluto.
  const anthropicAfter = await pg.query(`SELECT count(*) FROM ai_usage_ledger WHERE provider = 'anthropic'`);
  check(
    `CERO filas nuevas de ledger con provider='anthropic' durante esta corrida (antes ${anthropicBefore}, después ${anthropicAfter.rows[0].count})`,
    Number(anthropicAfter.rows[0].count) === anthropicBefore,
  );

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de estrés de admisión pasaron.');
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
