/**
 * Runner de la evaluación pedagógica de `AXIOMA_TUTOR_V3` (LEF Bloque VI, cierre).
 *
 * NO es DG-1. DG-1 (`experiments/dg1-tutor-provider-eval/`) seleccionó proveedor/modelo
 * y está congelado (ADR-0022). Este runner NO compara proveedores, NO cambia
 * provider/model y NO toca `apps/backend/src`: solo ejercita la superficie HTTP real
 * del Tutor (I1-I8) contra un backend levantado con `AI_PROVIDER_IMPL=anthropic`.
 *
 * Credenciales: este script NUNCA lee ni imprime `ANTHROPIC_API_KEY`. La key vive
 * exclusivamente en el proceso del backend (inyectada desde el entorno del operador).
 *
 * Uso:
 *   node runner.mjs --base=http://127.0.0.1:3101 --dry-run
 *   node runner.mjs --base=http://127.0.0.1:3101 --live --i-confirm-live-run [--only=P01,P02]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => args.includes(`--${name}`);

const base = arg('base', 'http://127.0.0.1:3101');
const live = has('live') && has('i-confirm-live-run');
const only = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// --- env del backend (DATABASE_URL / INTERNAL_OPS_KEY). Nunca se lee ANTHROPIC_API_KEY. ---
const envPath = join(here, '..', '..', 'apps', 'backend', '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    }),
);
const DATABASE_URL = process.env.DATABASE_URL ?? env.DATABASE_URL;
const INTERNAL_OPS_KEY = process.env.INTERNAL_OPS_KEY ?? env.INTERNAL_OPS_KEY;

const dataset = JSON.parse(readFileSync(join(here, 'dataset', 'cases.json'), 'utf8'));
const cases = only.length ? dataset.cases.filter((c) => only.includes(c.id)) : dataset.cases;
const plannedCalls = cases.reduce((n, c) => n + c.turns.length, 0);

/** Mismo mecanismo de token stub que usan los gates del repo (`StubIdentityProvider.encode`). */
function stubIdToken(payload) {
  return `stub:${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`;
}

async function req(method, path, headers = {}, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed, raw: text };
}

async function createSession(tag) {
  const uid = `tutor-v3-eval-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = stubIdToken({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear sesión (${tag}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  // --- Fixtures canónicos del seed (apps/backend/prisma/seed.ts). Nada inventado. ---
  const topic = (await client.query(`SELECT id, name FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`)).rows[0];
  if (!topic) throw new Error('Fixture canónico ausente: M1.NUMEROS.PORCENTAJES. Corre `pnpm --filter @axioma/backend prisma:seed`.');
  const qRows = (
    await client.query(
      `SELECT qv.id, q.question_key FROM question_version qv
       JOIN question q ON q.id = qv.question_id
       WHERE q.question_key IN ('M1.NUMEROS.PORCENTAJES.Q1','M1.NUMEROS.PORCENTAJES.Q2')
         AND qv.editorial_status = 'PUBLISHED' AND q.status = 'ACTIVE'`,
    )
  ).rows;
  const fixtures = {
    TOPIC_PORCENTAJES: { kind: 'topic', id: topic.id, label: topic.name },
    Q1: { kind: 'question', id: qRows.find((r) => r.question_key.endsWith('Q1'))?.id, label: 'M1.NUMEROS.PORCENTAJES.Q1' },
    Q2: { kind: 'question', id: qRows.find((r) => r.question_key.endsWith('Q2'))?.id, label: 'M1.NUMEROS.PORCENTAJES.Q2' },
  };
  if (!fixtures.Q1.id || !fixtures.Q2.id) throw new Error('Fixtures Q1/Q2 no publicadas/activas en la base de datos.');

  async function optionsOf(questionVersionId) {
    return (
      await client.query(`SELECT id, is_correct, content FROM answer_option WHERE question_version_id = $1 ORDER BY display_order ASC`, [questionVersionId])
    ).rows;
  }

  console.log(`Dataset: ${dataset.datasetVersion} | prompt bajo evaluación: ${dataset.promptUnderEvaluation}`);
  console.log(`Casos: ${cases.length} | llamadas reales planificadas: ${plannedCalls}`);
  console.log(`Fixtures: topic=${fixtures.TOPIC_PORCENTAJES.label} Q1=${fixtures.Q1.label} Q2=${fixtures.Q2.label}`);

  if (!live) {
    console.log('\nDRY-RUN: 0 llamadas externas realizadas. Usa --live --i-confirm-live-run para ejecutar de verdad.');
    await client.end();
    return;
  }

  const startedAt = new Date().toISOString();
  const runId = `live-${startedAt.replace(/[:.]/g, '-')}`;
  const outDir = join(here, 'results', runId);
  mkdirSync(outDir, { recursive: true });

  const records = [];
  for (const c of cases) {
    const record = { id: c.id, title: c.title, coverage: c.coverage, expectation: c.expectation, context: c.context, turns: [], status: 'OK' };
    try {
      const session = await createSession(c.id);
      // Tier PREMIUM vía el override de PRUEBA ya existente (I3, `AiInternalAdminController`) --
      // no cambia ninguna cuota contractual, solo evita que el límite FREE de 3/día detenga la evaluación.
      const tier = await req('POST', `/ai/_internal/set-tier-override?accountId=${session.accountId}&tier=PREMIUM`, { 'x-internal-ops-key': INTERNAL_OPS_KEY });
      if (tier.status !== 200 && tier.status !== 201) throw new Error(`No se pudo fijar tier PREMIUM: ${tier.status} ${tier.raw}`);

      if (c.preAnswer) {
        const qvId = fixtures[c.preAnswer.fixture].id;
        const opts = await optionsOf(qvId);
        const target = c.preAnswer.choose === 'correct' ? opts.find((o) => o.is_correct) : opts.find((o) => !o.is_correct);
        const answer = await req('POST', `/progress/topics/${topic.id}/responses`, session.headers, {
          questionVersionId: qvId,
          answerOptionId: target.id,
          operationId: randomUUID(),
        });
        record.preAnswer = { fixture: c.preAnswer.fixture, choose: c.preAnswer.choose, httpStatus: answer.status };
        if (answer.status >= 400) throw new Error(`No se pudo registrar la respuesta previa: ${answer.status} ${answer.raw}`);
      }

      const body = {};
      if (c.context.kind === 'question') body.contextQuestionVersionId = fixtures[c.context.fixture].id;
      if (c.context.kind === 'topic') body.contextCurriculumTopicId = fixtures[c.context.fixture].id;
      const conv = await req('POST', '/ai/me/conversations', session.headers, body);
      if (conv.status !== 200 && conv.status !== 201) throw new Error(`No se pudo crear conversación: ${conv.status} ${conv.raw}`);
      record.conversationId = conv.body.conversationId;
      record.academicContextSummary = conv.body.academicContext;

      for (const [i, turn] of c.turns.entries()) {
        const payload = { content: turn.content, operationId: randomUUID(), ...(turn.requestedMode ? { requestedMode: turn.requestedMode } : {}) };
        const t0 = Date.now();
        const res = await req('POST', `/ai/me/conversations/${record.conversationId}/messages`, session.headers, payload);
        const wallMs = Date.now() - t0;
        const turnRecord = {
          index: i,
          requestedMode: turn.requestedMode ?? null,
          input: turn.content,
          httpStatus: res.status,
          wallMs,
          output: res.body?.assistantMessage?.content ?? null,
          assistantMessageId: res.body?.assistantMessage?.messageId ?? null,
          errorBody: res.status >= 400 ? res.body : undefined,
        };
        record.turns.push(turnRecord);
        if (res.status >= 400) {
          record.status = 'TECHNICAL_FAILURE';
          console.log(`  ${c.id} turno ${i}: FALLO TÉCNICO ${res.status}`);
          break;
        }
        console.log(`  ${c.id} turno ${i}: ok (${wallMs}ms, ${turnRecord.output?.length ?? 0} chars)`);
      }

      // Metadata REAL de uso desde el ledger (I3) -- nunca contenido conversacional.
      const ledger = await client.query(
        `SELECT provider, model, prompt_version, attempts, input_tokens, output_tokens, latency_ms
         FROM ai_usage_ledger WHERE account_id = $1 ORDER BY occurred_at ASC`,
        [session.accountId],
      );
      record.usage = ledger.rows.map((r) => ({
        provider: r.provider,
        model: r.model,
        promptVersion: r.prompt_version,
        attempts: r.attempts,
        inputTokens: r.input_tokens,
        outputTokens: r.output_tokens,
        latencyMs: r.latency_ms,
      }));
    } catch (error) {
      record.status = 'TECHNICAL_FAILURE';
      record.error = String(error?.message ?? error);
      console.log(`  ${c.id}: FALLO TÉCNICO -- ${record.error}`);
    }
    records.push(record);
    writeFileSync(join(outDir, `${c.id}.json`), JSON.stringify(record, null, 2), 'utf8');
  }

  const totals = records.flatMap((r) => r.usage ?? []).reduce(
    (acc, u) => ({
      calls: acc.calls + 1,
      inputTokens: acc.inputTokens + (u.inputTokens ?? 0),
      outputTokens: acc.outputTokens + (u.outputTokens ?? 0),
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0 },
  );

  const summary = {
    runId,
    startedAt,
    finishedAt: new Date().toISOString(),
    datasetVersion: dataset.datasetVersion,
    promptUnderEvaluation: dataset.promptUnderEvaluation,
    base,
    casesExecuted: records.length,
    turnsAttempted: records.reduce((n, r) => n + r.turns.length, 0),
    technicalFailures: records.filter((r) => r.status === 'TECHNICAL_FAILURE').map((r) => r.id),
    usageTotals: totals,
    providerModel: [...new Set(records.flatMap((r) => (r.usage ?? []).map((u) => `${u.provider}/${u.model}`)))],
    promptVersions: [...new Set(records.flatMap((r) => (r.usage ?? []).map((u) => u.promptVersion)))],
  };
  writeFileSync(join(outDir, '_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('\n', JSON.stringify(summary, null, 2));
  await client.end();
}

main().catch((error) => {
  console.error('Runner falló:', error);
  process.exitCode = 1;
});
