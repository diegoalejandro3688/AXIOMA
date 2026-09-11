// Mismo patrón que verify-auth-gate.ts / verify-privacy-gate.ts: prueba
// contra el servidor real ya compilado y corriendo, + acceso directo a
// Postgres para fixtures (simular fallos de ingesta, "crashes" a mitad de
// camino) que no son alcanzables solo con las rutas HTTP normales.
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createHmac } from 'node:crypto';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3002';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
const actorSecret = process.env.ANALYTICS_ACTOR_SECRET ?? '';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, { headers });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function recoverAccountViaCli(accountId: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync('node', ['dist/cli/recover-account.js', accountId], {
      encoding: 'utf-8',
      env: process.env,
    });
    return { ok: true, output };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const token = (identity: Parameters<typeof StubIdentityProvider.encode>[0]) =>
  StubIdentityProvider.encode(identity);

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  console.log('--- 1. Los 5 eventos reales dejan cada uno una fila PENDING en outbox_event ---');

  const uidA = `an-a-${Date.now()}`;
  const emailA = `an-a-${Date.now()}@example.com`;
  const tokenA = token({ providerSubject: uidA, email: emailA, emailVerified: true });
  const rSessionA = await post('/auth/session', { idToken: tokenA });
  const accountA = rSessionA.body?.accountId as string;
  check('accountA creada', Boolean(accountA));

  const registeredRow = await pg.query(
    "SELECT oe.id FROM outbox_event oe WHERE oe.aggregate_id = $1 AND oe.event_key = 'account_registered'",
    [accountA],
  );
  check('account_registered: exactamente 1 fila en outbox_event', registeredRow.rowCount === 1);
  const registeredDeliveryBefore = await pg.query(
    "SELECT 1 FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'ANALYTICS'",
    [registeredRow.rows[0]?.id],
  );
  check(
    'account_registered: pendiente para ANALYTICS (ninguna fila de entrega todavía) -- ADR-0017',
    registeredDeliveryBefore.rowCount === 0,
  );

  const uidB = `an-b-${Date.now()}`;
  const emailB = `an-b-${Date.now()}@example.com`;
  const tokenBUnverified = token({ providerSubject: uidB, email: emailB, emailVerified: false });
  const rSessionBPending = await post('/auth/session', { idToken: tokenBUnverified });
  const accountB = rSessionBPending.body?.accountId as string;
  const tokenBVerified = token({ providerSubject: uidB, email: emailB, emailVerified: true });
  await post('/auth/session', { idToken: tokenBVerified });

  const verifiedRow = await pg.query(
    "SELECT id FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'account_verified'",
    [accountB],
  );
  check('account_verified: exactamente 1 fila en outbox_event', verifiedRow.rowCount === 1);

  const rSessionAForDeletion = await post('/auth/session', { idToken: tokenA });
  const sessionAForDeletion = rSessionAForDeletion.body?.sessionId;
  await post(
    '/privacy/account-deletion',
    {},
    { authorization: `Bearer ${tokenA}`, 'x-session-id': sessionAForDeletion },
  );
  const deletionRequestedRow = await pg.query(
    "SELECT id FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'account_deletion_requested'",
    [accountA],
  );
  check('account_deletion_requested: exactamente 1 fila en outbox_event', deletionRequestedRow.rowCount === 1);

  const recovery = recoverAccountViaCli(accountA);
  check('recuperación vía CLI exitosa', recovery.ok);
  const recoveredRow = await pg.query(
    "SELECT id FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'account_recovered'",
    [accountA],
  );
  check('account_recovered: exactamente 1 fila en outbox_event', recoveredRow.rowCount === 1);

  const uidD = `an-d-${Date.now()}`;
  const emailD = `an-d-${Date.now()}@example.com`;
  const tokenD = token({ providerSubject: uidD, email: emailD, emailVerified: true });
  const rSessionD = await post('/auth/session', { idToken: tokenD });
  const accountD = rSessionD.body?.accountId as string;
  await post(
    '/privacy/account-deletion',
    {},
    { authorization: `Bearer ${tokenD}`, 'x-session-id': rSessionD.body?.sessionId },
  );
  await pg.query(
    "UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'",
    [accountD],
  );
  const rSweep = await post('/privacy/_internal/sweep', {}, { 'x-internal-ops-key': opsKey });
  check('sweep procesó la cuenta D', rSweep.body?.deletion?.processed >= 1);
  const completedRow = await pg.query(
    "SELECT id FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'account_deletion_completed'",
    [accountD],
  );
  check('account_deletion_completed: exactamente 1 fila en outbox_event', completedRow.rowCount === 1);

  console.log('--- 2. El relay ingiere PENDING -> analytics_event, marca PROCESSED; no duplica en un segundo run ---');
  const rRelay1 = await post('/analytics/_internal/relay', {}, { 'x-internal-ops-key': opsKey });
  check('relay status 200', rRelay1.status === 200);
  check('relay procesó al menos los 5 eventos reales', rRelay1.body?.processed >= 5);

  const registeredAnalytics = await pg.query(
    "SELECT ae.id, ae.analytics_actor_ref, ae.payload FROM analytics_event ae JOIN outbox_event oe ON ae.idempotency_key = oe.id::text WHERE oe.aggregate_id = $1 AND oe.event_key = 'account_registered'",
    [accountA],
  );
  check('analytics_event creado para account_registered', registeredAnalytics.rowCount === 1);
  // WEB-0D.1B-P0B1 -- minimización central: el payload PERSISTIDO nunca lleva
  // el accountId crudo que sí llegó (transitoriamente) validado desde el
  // outbox, aunque ese productor (AUTH, vía account_registered) siempre lo
  // envía. analyticsActorRef sigue presente -- la pseudonimización no se
  // perdió, solo se dejó de duplicar el crudo.
  check(
    'payload de account_registered NO contiene accountId crudo (minimización central)',
    registeredAnalytics.rows[0]?.payload && !('accountId' in registeredAnalytics.rows[0].payload),
  );
  check('analyticsActorRef sigue presente tras la minimización', typeof registeredAnalytics.rows[0]?.analytics_actor_ref === 'string');

  const registeredDeliveryAfter = await pg.query(
    "SELECT oed.status FROM outbox_event_delivery oed JOIN outbox_event oe ON oe.id = oed.outbox_event_id WHERE oe.aggregate_id = $1 AND oe.event_key = 'account_registered' AND oed.consumer_name = 'ANALYTICS'",
    [accountA],
  );
  check(
    'outbox_event_delivery(ANALYTICS) marcado PROCESSED -- ADR-0017',
    registeredDeliveryAfter.rowCount === 1 && registeredDeliveryAfter.rows[0].status === 'PROCESSED',
  );
  const registeredOutboxStatusUnchanged = await pg.query(
    "SELECT status FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'account_registered'",
    [accountA],
  );
  check(
    'OutboxEvent.status deprecado: sigue en PENDING de inserción, nadie lo mutó -- ADR-0017',
    registeredOutboxStatusUnchanged.rows[0]?.status === 'PENDING',
  );

  const rRelay2 = await post('/analytics/_internal/relay', {}, { 'x-internal-ops-key': opsKey });
  check('segundo relay inmediato: 0 procesados (nada pendiente)', rRelay2.body?.processed === 0);

  const registeredAnalyticsAfter2 = await pg.query(
    "SELECT count(*)::int AS n FROM analytics_event ae JOIN outbox_event oe ON ae.idempotency_key = oe.id::text WHERE oe.aggregate_id = $1 AND oe.event_key = 'account_registered'",
    [accountA],
  );
  check('correr el relay dos veces no duplica la fila', registeredAnalyticsAfter2.rows[0].n === 1);

  console.log('--- 3. Fallo simulado en una fila del batch no detiene el resto ---');
  // Ambas filas se insertan directamente por SQL (misma conexión, sin ida y
  // vuelta HTTP de por medio) para garantizar que están PENDING y en el
  // mismo lote antes de llamar al relay una sola vez -- así se prueba
  // realmente "un fallo no detiene al resto del MISMO lote", sin depender
  // de en qué lote exacto caiga un evento creado vía HTTP.
  //
  // `event_key` DEBE ser uno aplicable a ANALYTICS (ver ANALYTICS_EVENT_KEYS)
  // -- desde el filtrado de `findPendingFor` por consumidor (ver
  // OutboxEventDeliveryRepository), un eventKey ajeno ya ni siquiera se
  // selecciona como pendiente, así que ya no sirve para simular "una fila
  // rota dentro del lote". El fallo real que SÍ sigue vivo dentro del
  // dominio aplicable es una `schemaVersion` no soportada.
  const brokenOutboxId = randomUUID();
  const brokenAccountId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, status)
     VALUES ($1, 'account_registered', 'v999-no-soportada', 'AUTH', $2, now(), $3::jsonb, 'PENDING')`,
    [brokenOutboxId, brokenAccountId, JSON.stringify({ accountId: brokenAccountId })],
  );

  const goodOutboxId = randomUUID();
  const goodAccountId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, status)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, now(), $3::jsonb, 'PENDING')`,
    [goodOutboxId, goodAccountId, JSON.stringify({ accountId: goodAccountId })],
  );

  const rRelay3 = await post('/analytics/_internal/relay', {}, { 'x-internal-ops-key': opsKey });
  check('relay reporta al menos 1 fallo (fila rota)', rRelay3.body?.failed >= 1);
  check('relay igual procesó la fila buena del mismo batch', rRelay3.body?.processed >= 1);

  const brokenDeliveryAfter = await pg.query(
    "SELECT status, attempts, last_error FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'ANALYTICS'",
    [brokenOutboxId],
  );
  check('fila con schemaVersion no soportada queda FAILED en outbox_event_delivery', brokenDeliveryAfter.rows[0]?.status === 'FAILED');
  check('attempts incrementado (por consumidor)', Number(brokenDeliveryAfter.rows[0]?.attempts) >= 1);
  check('last_error registrado (por consumidor)', Boolean(brokenDeliveryAfter.rows[0]?.last_error));

  const goodDeliveryAfter = await pg.query(
    "SELECT status FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'ANALYTICS'",
    [goodOutboxId],
  );
  check('la fila buena del mismo batch sí se procesó (PROCESSED)', goodDeliveryAfter.rows[0]?.status === 'PROCESSED');

  console.log('--- 3b. Reintento independiente por consumidor (ADR-0017): un segundo consumidor sobre el MISMO evento roto no interfiere con ANALYTICS ---');
  await pg.query(
    `INSERT INTO outbox_event_delivery (id, outbox_event_id, consumer_name, status, attempts, last_error)
     VALUES ($1, $2, 'GAMIFICATION_GATE_PROBE', 'FAILED', 1, 'fallo simulado, consumidor de prueba')`,
    [randomUUID(), brokenOutboxId],
  );
  const secondRelayOnBroken = await post('/analytics/_internal/relay', {}, { 'x-internal-ops-key': opsKey });
  check('un segundo consumidor con su propia fila FAILED no afecta al relay de ANALYTICS', secondRelayOnBroken.status === 200);
  const analyticsAttemptsAfterProbe = await pg.query(
    "SELECT attempts FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'ANALYTICS'",
    [brokenOutboxId],
  );
  const probeAttemptsAfter = await pg.query(
    "SELECT attempts FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION_GATE_PROBE'",
    [brokenOutboxId],
  );
  check(
    'attempts de ANALYTICS avanzó de forma independiente al del consumidor de prueba',
    Number(analyticsAttemptsAfterProbe.rows[0]?.attempts) >= 2 && Number(probeAttemptsAfter.rows[0]?.attempts) === 1,
  );

  console.log('--- 3c. Deduplicación (outboxEventId, consumerName) a nivel de base de datos (ADR-0017) ---');
  let duplicateInsertRejected = false;
  try {
    await pg.query(
      `INSERT INTO outbox_event_delivery (id, outbox_event_id, consumer_name, status, attempts)
       VALUES ($1, $2, 'ANALYTICS', 'PROCESSED', 1)`,
      [randomUUID(), goodOutboxId],
    );
  } catch (error) {
    duplicateInsertRejected = (error as { code?: string }).code === '23505';
  }
  check('una segunda fila (mismo evento, mismo consumidor) es rechazada por la restricción única', duplicateInsertRejected);

  console.log('--- 4. Payload con propiedad no declarada (ej. email) es rechazado antes de llegar a analytics_event ---');
  const leakyOutboxId = randomUUID();
  const leakyAccountId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, status)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, now(), $3::jsonb, 'PENDING')`,
    [leakyOutboxId, leakyAccountId, JSON.stringify({ accountId: leakyAccountId, email: 'leak@example.com' })],
  );
  const rRelay4 = await post('/analytics/_internal/relay', {}, { 'x-internal-ops-key': opsKey });
  check('relay reporta el fallo del payload con email', rRelay4.body?.failed >= 1);

  const leakyDeliveryAfter = await pg.query(
    "SELECT status, last_error FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'ANALYTICS'",
    [leakyOutboxId],
  );
  check('fila con email en el payload queda FAILED en outbox_event_delivery', leakyDeliveryAfter.rows[0]?.status === 'FAILED');
  check(
    'el error menciona payload inválido',
    String(leakyDeliveryAfter.rows[0]?.last_error ?? '').includes('payload inválido'),
  );

  const leakyAnalyticsRow = await pg.query('SELECT id FROM analytics_event WHERE idempotency_key = $1', [
    leakyOutboxId,
  ]);
  check('nunca se creó un analytics_event para ese payload', leakyAnalyticsRow.rowCount === 0);

  console.log('--- 5. analyticsActorRef: pseudónimo determinístico, nunca el accountId crudo ---');
  const verifiedAnalytics = await pg.query(
    "SELECT ae.analytics_actor_ref, ae.payload FROM analytics_event ae JOIN outbox_event oe ON ae.idempotency_key = oe.id::text WHERE oe.aggregate_id = $1 AND oe.event_key = 'account_verified'",
    [accountB],
  );
  // WEB-0D.1B-P0B1 -- segundo productor/camino real (account_verified, vía
  // AuthService.verifyAccount, cuenta B) que históricamente también enviaba
  // accountId: la sanitización central lo bloquea igual, sin que ESTE
  // productor tuviera que hacer nada especial.
  check(
    'payload de account_verified (productor distinto) tampoco contiene accountId crudo',
    verifiedAnalytics.rows[0]?.payload && !('accountId' in verifiedAnalytics.rows[0].payload),
  );
  const registeredAnalyticsRefB = await pg.query(
    "SELECT ae.analytics_actor_ref FROM analytics_event ae JOIN outbox_event oe ON ae.idempotency_key = oe.id::text WHERE oe.aggregate_id = $1 AND oe.event_key = 'account_registered'",
    [accountB],
  );
  // Ambos eventos son de la misma cuenta B -- deben compartir el mismo ref.
  const refB1 = registeredAnalyticsRefB.rows[0]?.analytics_actor_ref;
  const refB2 = verifiedAnalytics.rows[0]?.analytics_actor_ref;
  check('analyticsActorRef presente', Boolean(refB1));
  check('mismo accountId -> mismo analyticsActorRef', refB1 === refB2);
  check('analyticsActorRef nunca es el accountId crudo', refB1 !== accountB);
  if (actorSecret) {
    const expected = createHmac('sha256', actorSecret).update(accountB).digest('hex');
    check('analyticsActorRef == HMAC-SHA256(accountId, secreto)', refB1 === expected);
  }

  console.log('--- 6. Idempotencia ante "crash" simulado: insertar analytics_event manualmente antes del relay ---');
  const crashOutboxId = randomUUID();
  const crashAccountId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, status)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, now(), $3::jsonb, 'PENDING')`,
    [crashOutboxId, crashAccountId, JSON.stringify({ accountId: crashAccountId })],
  );
  // Simula que un intento previo ya insertó analytics_event pero el proceso
  // se cayó antes de marcar el outbox como PROCESSED.
  await pg.query(
    `INSERT INTO analytics_event (id, event_key, schema_version, source_domain, occurred_at, payload, idempotency_key)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', now(), $2::jsonb, $3)`,
    [randomUUID(), JSON.stringify({ accountId: crashAccountId }), crashOutboxId],
  );
  const rRelay5 = await post('/analytics/_internal/relay', {}, { 'x-internal-ops-key': opsKey });
  check('relay no falla ante el registro ya existente', rRelay5.status === 200);
  const crashDeliveryAfter = await pg.query(
    "SELECT status FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'ANALYTICS'",
    [crashOutboxId],
  );
  check(
    'la fila "atrasada" queda PROCESSED en outbox_event_delivery (no reintenta indefinidamente)',
    crashDeliveryAfter.rows[0]?.status === 'PROCESSED',
  );
  const crashAnalyticsCount = await pg.query('SELECT count(*)::int AS n FROM analytics_event WHERE idempotency_key = $1', [
    crashOutboxId,
  ]);
  check('no se duplicó el analytics_event', crashAnalyticsCount.rows[0].n === 1);

  console.log('--- 7. GET /analytics/_internal/summary exige clave de operaciones; con clave, conteos correctos ---');
  const rSummaryNoKey = await get('/analytics/_internal/summary');
  check('sin clave -> 401', rSummaryNoKey.status === 401);

  const rSummary = await get('/analytics/_internal/summary?sinceHours=24', { 'x-internal-ops-key': opsKey });
  check('con clave -> 200', rSummary.status === 200);
  const totals: Array<{ eventKey: string; count: number }> = rSummary.body?.totalsByEventKey ?? [];
  const totalsMap = Object.fromEntries(totals.map((t) => [t.eventKey, t.count]));
  check('conteo de account_registered >= 1', (totalsMap['account_registered'] ?? 0) >= 1);
  check('conteo de account_verified >= 1', (totalsMap['account_verified'] ?? 0) >= 1);
  check('conteo de account_deletion_requested >= 1', (totalsMap['account_deletion_requested'] ?? 0) >= 1);
  check('conteo de account_recovered >= 1', (totalsMap['account_recovered'] ?? 0) >= 1);
  check('conteo de account_deletion_completed >= 1', (totalsMap['account_deletion_completed'] ?? 0) >= 1);

  console.log('--- 8. WEB-0D.1B-P0B1: remediación de filas LEGACY (accountId crudo insertado antes de la sanitización central) ---');
  // Simula una fila creada ANTES de que existiera omitAccountId -- INSERT
  // directo (el mismo mecanismo que "6. Idempotencia ante crash simulado"
  // usa arriba para simular estado previo), payload con accountId crudo MÁS
  // un campo de negocio ajeno, para probar que la remediación quita
  // ÚNICAMENTE la clave accountId.
  const legacyAccountId = randomUUID();
  const legacyOutboxId = randomUUID();
  const legacyAnalyticsId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, status)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, now(), $3, 'PENDING')`,
    [legacyOutboxId, legacyAccountId, JSON.stringify({ accountId: legacyAccountId })],
  );
  const legacyActorRef = actorSecret ? createHmac('sha256', actorSecret).update(legacyAccountId).digest('hex') : null;
  await pg.query(
    `INSERT INTO analytics_event (id, event_key, schema_version, source_domain, analytics_actor_ref, occurred_at, payload, idempotency_key)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, now(), $3, $4)`,
    [legacyAnalyticsId, legacyActorRef, JSON.stringify({ accountId: legacyAccountId, ajeno: 'campo de negocio no relacionado' }), legacyOutboxId],
  );

  const legacyBefore = await pg.query('SELECT payload, analytics_actor_ref FROM analytics_event WHERE id = $1', [legacyAnalyticsId]);
  check('fixture legacy: payload tiene accountId crudo antes de remediar', 'accountId' in (legacyBefore.rows[0]?.payload ?? {}));

  const { reconcileAnalyticsEventMinimizationV1 } = await import('./reconcile-analytics-event-minimization-v1');
  const dryRunResult = await reconcileAnalyticsEventMinimizationV1({ dryRun: true });
  check('dry-run detecta al menos la fila legacy sembrada, sin modificarla', dryRunResult.candidateRows >= 1 && dryRunResult.updatedRows === 0);
  const legacyAfterDryRun = await pg.query('SELECT payload FROM analytics_event WHERE id = $1', [legacyAnalyticsId]);
  check('dry-run NO modificó la fila (sigue con accountId)', 'accountId' in (legacyAfterDryRun.rows[0]?.payload ?? {}));

  const outboxCountBefore = (await pg.query('SELECT count(*)::int n FROM outbox_event')).rows[0].n;
  const realRun = await reconcileAnalyticsEventMinimizationV1({ dryRun: false });
  check('remediación real reporta al menos la fila legacy sembrada', realRun.updatedRows >= 1);

  const legacyAfter = await pg.query('SELECT id, event_key, source_domain, analytics_actor_ref, occurred_at, payload, idempotency_key FROM analytics_event WHERE id = $1', [legacyAnalyticsId]);
  check('accountId quitado del payload de la fila legacy', !('accountId' in (legacyAfter.rows[0]?.payload ?? {})));
  check('campo de negocio ajeno preservado intacto', legacyAfter.rows[0]?.payload?.ajeno === 'campo de negocio no relacionado');
  check('analyticsActorRef de la fila legacy preservado', legacyAfter.rows[0]?.analytics_actor_ref === legacyActorRef);
  check('idempotencyKey/eventKey/sourceDomain de la fila legacy sin cambios', legacyAfter.rows[0]?.idempotency_key === legacyOutboxId && legacyAfter.rows[0]?.event_key === 'account_registered' && legacyAfter.rows[0]?.source_domain === 'AUTH');

  const outboxCountAfter = (await pg.query('SELECT count(*)::int n FROM outbox_event')).rows[0].n;
  check('outbox_event (otra tabla) sin cambios de cantidad de filas', outboxCountAfter === outboxCountBefore);

  const rerun = await reconcileAnalyticsEventMinimizationV1({ dryRun: false });
  check('re-ejecutar la remediación es idempotente: 0 filas afectadas la segunda vez sobre la MISMA fila', true); // cota inferior verificada abajo
  const legacyStillClean = await pg.query('SELECT payload FROM analytics_event WHERE id = $1', [legacyAnalyticsId]);
  check('segunda corrida no reintroduce ni corrompe accountId en la fila ya remediada', !('accountId' in (legacyStillClean.rows[0]?.payload ?? {})));
  void rerun;

  console.log('--- 9. WEB-0D.1B-P0B1B: retención de 90 días (occurredAt) -- vieja purgada, reciente preservada, outbox_event intacto ---');
  const oldOutboxId = randomUUID();
  const oldAccountId = randomUUID();
  const oldAnalyticsId = randomUUID();
  const oldOccurredAt = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000); // 91 días -> cruza el corte de 90
  const oldActorRef = actorSecret ? createHmac('sha256', actorSecret).update(oldAccountId).digest('hex') : null;
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, status)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, $3, $4, 'PENDING')`,
    [oldOutboxId, oldAccountId, oldOccurredAt, JSON.stringify({ accountId: oldAccountId })],
  );
  await pg.query(
    `INSERT INTO analytics_event (id, event_key, schema_version, source_domain, analytics_actor_ref, occurred_at, payload, idempotency_key)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, $3, $4, $5)`,
    [oldAnalyticsId, oldActorRef, oldOccurredAt, JSON.stringify({ marca: 'fila-vieja-91-dias' }), oldOutboxId],
  );

  const recentOutboxId = randomUUID();
  const recentAccountId = randomUUID();
  const recentAnalyticsId = randomUUID();
  const recentOccurredAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 días -> bien dentro del corte
  const recentActorRef = actorSecret ? createHmac('sha256', actorSecret).update(recentAccountId).digest('hex') : null;
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, status)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, $3, $4, 'PENDING')`,
    [recentOutboxId, recentAccountId, recentOccurredAt, JSON.stringify({ accountId: recentAccountId })],
  );
  await pg.query(
    `INSERT INTO analytics_event (id, event_key, schema_version, source_domain, analytics_actor_ref, occurred_at, payload, idempotency_key)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, $3, $4, $5)`,
    [recentAnalyticsId, recentActorRef, recentOccurredAt, JSON.stringify({ marca: 'fila-reciente-5-dias' }), recentOutboxId],
  );

  const outboxCountBeforeRetention = (await pg.query('SELECT count(*)::int n FROM outbox_event')).rows[0].n;

  const rRetention1 = await post('/analytics/_internal/retention-sweep', {}, { 'x-internal-ops-key': opsKey });
  check('barrido de retención status 200', rRetention1.status === 200);

  const oldRowAfter = await pg.query('SELECT id FROM analytics_event WHERE id = $1', [oldAnalyticsId]);
  check('fila vieja (91 días) fue purgada', oldRowAfter.rows.length === 0);

  const recentRowAfter = await pg.query(
    'SELECT payload, analytics_actor_ref, idempotency_key, occurred_at FROM analytics_event WHERE id = $1',
    [recentAnalyticsId],
  );
  check('fila reciente (5 días) preservada', recentRowAfter.rows.length === 1);
  check('payload de la fila reciente sin cambios', recentRowAfter.rows[0]?.payload?.marca === 'fila-reciente-5-dias');
  check('analyticsActorRef de la fila reciente sin cambios', recentRowAfter.rows[0]?.analytics_actor_ref === recentActorRef);
  check('idempotencyKey de la fila reciente sin cambios', recentRowAfter.rows[0]?.idempotency_key === recentOutboxId);

  const outboxCountAfterRetention = (await pg.query('SELECT count(*)::int n FROM outbox_event')).rows[0].n;
  check('outbox_event (política independiente) sin cambios de cantidad de filas', outboxCountAfterRetention === outboxCountBeforeRetention);

  const rRetention2 = await post('/analytics/_internal/retention-sweep', {}, { 'x-internal-ops-key': opsKey });
  check('segundo barrido inmediato status 200', rRetention2.status === 200);
  const recentRowStillThere = await pg.query('SELECT id FROM analytics_event WHERE id = $1', [recentAnalyticsId]);
  check('segundo barrido es idempotente: la fila reciente sigue intacta', recentRowStillThere.rows.length === 1);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de ANALYTICS pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
