/**
 * Runner de la evaluación pedagógica de `AXIOMA_TUTOR_V4`.
 *
 * Derivado del runner de V3 (`experiments/tutor-pedagogy-v3-eval/runner.mjs`), que queda
 * CONGELADO e intacto junto con su evidencia. Único cambio estructural: los fixtures
 * académicos ya no son solo los de Matemática -- se resuelven por materia desde el seed
 * canónico (`apps/backend/prisma/seed.ts`), y cada fixture de pregunta lleva su propio
 * `topicId` (la respuesta previa del estudiante se registra contra el tema de SU materia,
 * no contra el de Matemática).
 *
 * NO es DG-1. DG-1 (`experiments/dg1-tutor-provider-eval/`) seleccionó proveedor/modelo
 * y está congelado (ADR-0022). Este runner NO compara proveedores, NO cambia
 * provider/model y NO toca `apps/backend/src`: solo ejercita la superficie HTTP real
 * del Tutor contra un backend levantado con `AI_PROVIDER_IMPL=anthropic`.
 *
 * Credenciales: este script NUNCA lee ni imprime `ANTHROPIC_API_KEY`. La key vive
 * exclusivamente en el proceso del backend (inyectada desde el entorno del operador).
 *
 * Uso:
 *   node runner.mjs --base=http://127.0.0.1:3101 --dry-run
 *   node runner.mjs --base=http://127.0.0.1:3101 --fake            # backend con AI_PROVIDER_IMPL=fake: 0 gasto real
 *   node runner.mjs --base=http://127.0.0.1:3101 --live --i-confirm-live-run [--only=M01,C05]
 *
 * `--fake` es idéntico a `--live` en el camino que ejercita; solo cambia la etiqueta del
 * runId y sirve para validar mecánicamente dataset/fixtures/runner SIN gastar en Anthropic
 * (el backend debe estar levantado con `AI_PROVIDER_IMPL=fake`). El runner NO puede
 * verificar por sí mismo qué provider corre el backend: eso se comprueba en el ledger
 * (`provider` == 'fake') y queda registrado en el `_summary.json` de la corrida.
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
const fake = has('fake');
const execute = live || fake;
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `POST /auth/session` está limitado a 10 peticiones por minuto por IP
 * (`@Throttle({ default: { limit: 10, ttl: 60_000 } })` en `AuthController`) --
 * límite de PRODUCTO, no un accidente del entorno de pruebas, así que el runner
 * se adapta a él en vez de tocarlo. V3 nunca lo alcanzó porque cada llamada real
 * a Anthropic tarda ~6 s y sus 19 sesiones quedaban naturalmente espaciadas; con
 * 35 casos (y sobre todo en modo `--fake`, donde las respuestas son instantáneas)
 * el burst inicial sí lo alcanza. La corrida de validación con `FakeAiProvider`
 * detectó exactamente esto antes de gastar un solo dólar.
 *
 * Espera y reintenta ante 429; nunca desactiva ni eleva el límite. Un 429 aquí
 * NO es un fallo técnico del caso (no llegó a haber generación), así que no se
 * contabiliza como tal -- solo se pierde tiempo de reloj.
 */
async function createSession(tag) {
  const uid = `tutor-v4-eval-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = stubIdToken({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  let session = await req('POST', '/auth/session', {}, { idToken });
  for (let attempt = 0; session.status === 429 && attempt < 12; attempt += 1) {
    await sleep(7000);
    session = await req('POST', '/auth/session', {}, { idToken });
  }
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear sesión (${tag}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

/**
 * Mapa fixture lógico -> contenido canónico del seed. TODO viene de la base de datos real:
 * si el seed no se corrió, esto falla ruidosamente en vez de inventar contenido académico.
 */
const TOPIC_FIXTURES = {
  MAT_TOPIC: 'M1.NUMEROS.PORCENTAJES',
  CIEN_TOPIC: 'C1.BIOLOGIA.CELULA',
  LENG_TOPIC: 'L1.LECTURA.INFERENCIA',
  HIST_TOPIC: 'H1.CHILE.SIGLO20.ISI',
};
const QUESTION_FIXTURES = {
  MAT_Q1: 'M1.NUMEROS.PORCENTAJES.Q1',
  MAT_Q2: 'M1.NUMEROS.PORCENTAJES.Q2',
  CIEN_Q1: 'C1.BIOLOGIA.CELULA.Q1',
  LENG_Q1: 'L1.LECTURA.INFERENCIA.Q1',
  HIST_Q1: 'H1.CHILE.SIGLO20.ISI.Q1',
};

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  const fixtures = {};
  for (const [name, code] of Object.entries(TOPIC_FIXTURES)) {
    const row = (await client.query(`SELECT id, name FROM curriculum_topic WHERE code = $1`, [code])).rows[0];
    if (!row) throw new Error(`Fixture canónico ausente: ${code}. Corre \`pnpm --filter @axioma/backend prisma:seed\`.`);
    fixtures[name] = { kind: 'topic', id: row.id, label: `${code} (${row.name})` };
  }
  for (const [name, key] of Object.entries(QUESTION_FIXTURES)) {
    const row = (
      await client.query(
        `SELECT qv.id, qv.curriculum_topic_id FROM question_version qv
         JOIN question q ON q.id = qv.question_id
         WHERE q.question_key = $1 AND qv.editorial_status = 'PUBLISHED' AND q.status = 'ACTIVE'`,
        [key],
      )
    ).rows[0];
    if (!row) throw new Error(`Fixture canónico ausente o no publicado/activo: ${key}. Corre el seed.`);
    fixtures[name] = { kind: 'question', id: row.id, topicId: row.curriculum_topic_id, label: key };
  }

  async function optionsOf(questionVersionId) {
    return (
      await client.query(`SELECT id, is_correct, content FROM answer_option WHERE question_version_id = $1 ORDER BY display_order ASC`, [questionVersionId])
    ).rows;
  }

  console.log(`Dataset: ${dataset.datasetVersion} | prompt bajo evaluación: ${dataset.promptUnderEvaluation}`);
  console.log(`Casos: ${cases.length} | llamadas planificadas: ${plannedCalls}`);
  console.log('Fixtures resueltos desde el seed canónico:');
  for (const [name, f] of Object.entries(fixtures)) console.log(`  ${name.padEnd(11)} ${f.kind.padEnd(8)} ${f.label}`);

  if (!execute) {
    console.log('\nDRY-RUN: 0 llamadas externas realizadas. Usa --fake (backend con provider fake, sin gasto) o --live --i-confirm-live-run.');
    await client.end();
    return;
  }

  const startedAt = new Date().toISOString();
  const runId = `${fake && !live ? 'fake' : 'live'}-${startedAt.replace(/[:.]/g, '-')}`;
  const outDir = join(here, 'results', runId);
  mkdirSync(outDir, { recursive: true });

  const records = [];
  for (const c of cases) {
    const record = {
      id: c.id,
      title: c.title,
      subject: c.subject,
      replicaOf: c.replicaOf,
      coverage: c.coverage,
      expectation: c.expectation,
      context: c.context,
      turns: [],
      status: 'OK',
    };
    try {
      const session = await createSession(c.id);
      // Tier PREMIUM vía el override de PRUEBA ya existente (I3, `AiInternalAdminController`) --
      // no cambia ninguna cuota contractual, solo evita que el límite FREE de 3/día detenga la evaluación.
      const tier = await req('POST', `/ai/_internal/set-tier-override?accountId=${session.accountId}&tier=PREMIUM`, { 'x-internal-ops-key': INTERNAL_OPS_KEY });
      if (tier.status !== 200 && tier.status !== 201) throw new Error(`No se pudo fijar tier PREMIUM: ${tier.status} ${tier.raw}`);

      if (c.preAnswer) {
        const fixture = fixtures[c.preAnswer.fixture];
        const opts = await optionsOf(fixture.id);
        const target = c.preAnswer.choose === 'correct' ? opts.find((o) => o.is_correct) : opts.find((o) => !o.is_correct);
        // El tema es el de la MATERIA de la pregunta -- nunca el de Matemática por defecto.
        const answer = await req('POST', `/progress/topics/${fixture.topicId}/responses`, session.headers, {
          questionVersionId: fixture.id,
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
