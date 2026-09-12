// RTDN-RET -- Gate de retencion del buzon durable `google_play_rtdn_event`.
//
// Verifica `RtdnRetentionService`/`RtdnRetentionController` via HTTP contra
// el servidor real de gates (mismo patron hibrido que
// verify-outbox-lifecycle-gate.ts): acceso directo a Postgres para fixtures
// (filas con `status`/`processed_at` arbitrarios, imposibles de producir
// deterministicamente solo con rutas HTTP) + el endpoint `_test/sweep` (solo
// no-produccion) para ejercitar la purga con un `retentionDays` explicito sin
// depender de una env global.
//
// A. TERMINAL mas viejo que la retencion -> purgado.
// B. TERMINAL mas nuevo que la retencion -> retenido.
// C. RETRYABLE viejo -> NUNCA purgado (no terminal).
// D. PROCESSING (activamente en curso) -> NUNCA purgado.
// E. PENDING viejo -> NUNCA purgado (no terminal, "vivo").
// F. config fail-safe: sin `retentionDays` ni env -> NO-OP, cero borrados.
// G. interaccion con BillingRetentionService: `countLiveByPurchaseTokens`
//    nunca cambia por la purga RTDN (TERMINAL es siempre el complemento de
//    "vivo").
// H. batching/idempotencia: mas filas expiradas que el limite de lote ->
//    primera corrida borra <= lote, corridas repetidas convergen a cero.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const base = process.argv[2] ?? 'http://127.0.0.1:3001';
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

async function post(path: string, body: unknown) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-ops-key': opsKey },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function insertRtdnEvent(
  pg: Client,
  overrides: {
    status: 'PENDING' | 'PROCESSING' | 'DONE' | 'RETRYABLE' | 'FAILED' | 'IGNORED';
    processedAt: Date | null;
    purchaseToken?: string | null;
    attempts?: number;
    createdAt?: Date;
    updatedAt?: Date;
  },
): Promise<string> {
  const id = randomUUID();
  const messageId = `gate-rtdn-ret-${randomUUID()}`;
  const createdAt = overrides.createdAt ?? new Date();
  const updatedAt = overrides.updatedAt ?? createdAt;
  await pg.query(
    `INSERT INTO google_play_rtdn_event
       (id, message_id, provider, package_name, notification_kind, notification_type, purchase_token,
        event_time, status, attempts, processed_at, created_at, updated_at)
     VALUES ($1, $2, 'GOOGLE_PLAY', 'com.zetrynd.app', 'subscription', 4, $3, now(), $4, $5, $6, $7, $8)`,
    [
      id,
      messageId,
      overrides.purchaseToken ?? `tok-${randomUUID()}`,
      overrides.status,
      overrides.attempts ?? 1,
      overrides.processedAt,
      createdAt,
      updatedAt,
    ],
  );
  return id;
}

async function rowExists(pg: Client, id: string): Promise<boolean> {
  const res = await pg.query('SELECT 1 FROM google_play_rtdn_event WHERE id = $1', [id]);
  return res.rows.length === 1;
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  console.log('--- F. Config fail-safe: sin retentionDays -> NO-OP, cero borrados ---');
  const noopId = await insertRtdnEvent(pg, { status: 'DONE', processedAt: new Date(Date.now() - 365 * DAY_MS) });
  const noopSweep = await post('/internal/rtdn-retention/_test/sweep', {});
  check('F1. sweep sin retentionDays status 200', noopSweep.status === 200);
  check('F2. enabled=false (fail-safe: sin override, sin env -> NO-OP)', noopSweep.body?.enabled === false);
  check('F3. purgedRows=0', noopSweep.body?.purgedRows === 0);
  check('F4. la fila TERMINAL vieja NO fue tocada (sin config, se retiene)', await rowExists(pg, noopId));

  console.log('--- A/B. TERMINAL viejo purgado, TERMINAL reciente retenido (retentionDays=30) ---');
  const oldDoneId = await insertRtdnEvent(pg, { status: 'DONE', processedAt: new Date(Date.now() - 31 * DAY_MS) });
  const oldFailedId = await insertRtdnEvent(pg, { status: 'FAILED', processedAt: new Date(Date.now() - 40 * DAY_MS), attempts: 24 });
  const oldIgnoredId = await insertRtdnEvent(pg, { status: 'IGNORED', processedAt: new Date(Date.now() - 90 * DAY_MS) });
  const recentDoneId = await insertRtdnEvent(pg, { status: 'DONE', processedAt: new Date(Date.now() - 5 * DAY_MS) });

  const sweepAB = await post('/internal/rtdn-retention/_test/sweep', { retentionDays: 30 });
  check('AB1. sweep(30) status 200', sweepAB.status === 200);
  check('AB2. enabled=true', sweepAB.body?.enabled === true);
  check('AB3. purgedRows >= 3 (los 3 terminales viejos de este bloque)', sweepAB.body?.purgedRows >= 3);

  check('A1. DONE de 31 dias -> PURGADO', !(await rowExists(pg, oldDoneId)));
  check('A2. FAILED (dead-letter) de 40 dias -> PURGADO', !(await rowExists(pg, oldFailedId)));
  check('A3. IGNORED de 90 dias -> PURGADO', !(await rowExists(pg, oldIgnoredId)));
  check('B1. DONE de 5 dias (< 30) -> RETENIDO', await rowExists(pg, recentDoneId));

  console.log('--- C/D/E. Nunca se purga trabajo VIVO (RETRYABLE / PROCESSING / PENDING), sin importar antiguedad ---');
  const oldRetryableId = await insertRtdnEvent(pg, { status: 'RETRYABLE', processedAt: null, createdAt: new Date(Date.now() - 200 * DAY_MS), updatedAt: new Date(Date.now() - 200 * DAY_MS) });
  const oldProcessingId = await insertRtdnEvent(pg, { status: 'PROCESSING', processedAt: null, createdAt: new Date(Date.now() - 200 * DAY_MS), updatedAt: new Date(Date.now() - 200 * DAY_MS) });
  const oldPendingId = await insertRtdnEvent(pg, { status: 'PENDING', processedAt: null, createdAt: new Date(Date.now() - 200 * DAY_MS), updatedAt: new Date(Date.now() - 200 * DAY_MS) });

  const sweepCDE = await post('/internal/rtdn-retention/_test/sweep', { retentionDays: 0 });
  check('CDE1. sweep(0) status 200 (retentionDays=0 -> cutoff=ahora, maxima agresividad posible)', sweepCDE.status === 200);

  check('C1. RETRYABLE de 200 dias -> NUNCA purgado (no terminal)', await rowExists(pg, oldRetryableId));
  check('D1. PROCESSING de 200 dias -> NUNCA purgado (activamente en curso)', await rowExists(pg, oldProcessingId));
  check('E1. PENDING de 200 dias -> NUNCA purgado (vivo, aun sin reclamar)', await rowExists(pg, oldPendingId));

  console.log('--- G. Interaccion con BillingRetentionService: countLiveByPurchaseTokens nunca cambia por la purga RTDN ---');
  const sharedToken = `gate-shared-tok-${randomUUID()}`;
  const liveRowId = await insertRtdnEvent(pg, { status: 'PENDING', processedAt: null, purchaseToken: sharedToken, createdAt: new Date(Date.now() - 500 * DAY_MS), updatedAt: new Date(Date.now() - 500 * DAY_MS) });
  const terminalRowSameTokenId = await insertRtdnEvent(pg, { status: 'DONE', processedAt: new Date(Date.now() - 500 * DAY_MS), purchaseToken: sharedToken });

  const liveCountBefore = (
    await pg.query(
      `SELECT count(*)::int n FROM google_play_rtdn_event WHERE purchase_token = $1 AND status IN ('PENDING','PROCESSING','RETRYABLE')`,
      [sharedToken],
    )
  ).rows[0].n;
  check('G1. fixture: 1 fila viva para el token compartido antes de purgar', liveCountBefore === 1);

  const sweepG = await post('/internal/rtdn-retention/_test/sweep', { retentionDays: 0 });
  check('G2. sweep status 200', sweepG.status === 200);
  check('G3. la fila TERMINAL del token compartido fue purgada', !(await rowExists(pg, terminalRowSameTokenId)));
  check('G4. la fila PENDING (viva) del MISMO token sigue intacta', await rowExists(pg, liveRowId));

  const liveCountAfter = (
    await pg.query(
      `SELECT count(*)::int n FROM google_play_rtdn_event WHERE purchase_token = $1 AND status IN ('PENDING','PROCESSING','RETRYABLE')`,
      [sharedToken],
    )
  ).rows[0].n;
  check('G5. countLiveByPurchaseTokens (equivalente SQL) SIN cambios tras purgar el terminal del mismo token', liveCountAfter === liveCountBefore);

  console.log('--- H. Batching/idempotencia: mas filas expiradas que el limite de lote (200) ---');
  const BATCH_LIMIT = 200;
  const overflowIds: string[] = [];
  for (let i = 0; i < BATCH_LIMIT + 25; i++) {
    overflowIds.push(await insertRtdnEvent(pg, { status: 'DONE', processedAt: new Date(Date.now() - (60 + i) * DAY_MS) }));
  }
  const sweepH1 = await post('/internal/rtdn-retention/_test/sweep', { retentionDays: 30 });
  check('H1. primera corrida status 200', sweepH1.status === 200);
  check('H2. primera corrida purga <= limite de lote (200)', sweepH1.body?.purgedRows <= BATCH_LIMIT);
  check('H3. primera corrida purga ALGO (hay overflow expirado)', sweepH1.body?.purgedRows > 0);

  const sweepH2 = await post('/internal/rtdn-retention/_test/sweep', { retentionDays: 30 });
  check('H4. segunda corrida status 200', sweepH2.status === 200);
  const remainingAfterH2 = (
    await pg.query(`SELECT count(*)::int n FROM google_play_rtdn_event WHERE id = ANY($1::uuid[])`, [overflowIds]),
  ).rows[0].n;
  check('H5. tras 1-2 corridas, converge: cero filas de overflow sobreviven (todas terminales+expiradas)', remainingAfterH2 === 0);

  const sweepH3 = await post('/internal/rtdn-retention/_test/sweep', { retentionDays: 30 });
  check('H6. tercera corrida (nada que hacer) status 200', sweepH3.status === 200);
  check('H7. tercera corrida idempotente: purgedRows=0', sweepH3.body?.purgedRows === 0);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de retencion RTDN pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
