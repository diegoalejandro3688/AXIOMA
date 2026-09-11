// WEB-0D.1B-P0B2 (+P0B2-R1) -- ciclo de vida de privacidad de outbox_event
// (minimización INMEDIATA al volverse terminal + retención EXACTA de 90
// días desde terminalAt). Mismo patrón híbrido que verify-analytics-gate.ts:
// HTTP contra el servidor real ya corriendo (relay real de GAMIFICATION,
// endpoints _internal de OutboxLifecycle) + acceso directo a Postgres para
// fixtures y aserciones que no son alcanzables solo con rutas HTTP
// (deliveries FAILED con `attempts`/`terminalAt` arbitrarios, timestamps
// viejos simulados, filas "legacy" sin terminalAt confiable).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { OUTBOX_CONSUMER_REGISTRY } from '../src/platform/outbox/outbox-consumer-registry';
import { evaluateOutboxTerminalState } from '../src/platform/outbox/outbox-terminal-state';
import type { OutboxEventDelivery } from '../src/generated/prisma/client';

const base = process.argv[2] ?? 'http://127.0.0.1:3002';
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

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

/** `terminalAt` por defecto sigue la MISMA regla que `recordOutcome` real: PROCESSED -> `processedAt`; FAILED -- el llamador debe pasarlo explícitamente (`null` = retryable). */
function fakeDelivery(overrides: Partial<OutboxEventDelivery> & { status: 'PROCESSED' | 'FAILED' }): OutboxEventDelivery {
  const processedAt = overrides.processedAt ?? new Date();
  const defaultTerminalAt = overrides.status === 'PROCESSED' ? processedAt : null;
  return {
    id: randomUUID(),
    outboxEventId: randomUUID(),
    consumerName: 'ANALYTICS',
    attempts: 1,
    lastError: null,
    processedAt: overrides.status === 'PROCESSED' ? processedAt : null,
    terminalAt: defaultTerminalAt,
    createdAt: new Date(),
    ...overrides,
  } as OutboxEventDelivery;
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const suffix = `${Date.now()}-${randomUUID()}`;

  console.log('--- A. Minimización INMEDIATA tras PROCESSED (sin correr ningún barrido) ---');
  const accountIdA = randomUUID();
  const examAttemptIdA = randomUUID();
  const examIdA = randomUUID();
  const completedAtA = new Date();
  const outboxIdA = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'exam_completed', 'v1', 'EXAMS', $2, $3, $4)`,
    [
      outboxIdA,
      accountIdA,
      completedAtA,
      JSON.stringify({ accountId: accountIdA, examAttemptId: examAttemptIdA, examId: examIdA, completedAt: completedAtA.toISOString() }),
    ],
  );

  const relayA = await post('/gamification/_internal/relay', {}, { 'x-internal-ops-key': opsKey });
  check('A1. relay status 200', relayA.status === 200);

  // Ninguna llamada a /outbox/_internal/minimization-sweep aquí -- la
  // minimización debe haber ocurrido YA, disparada por
  // GamificationService.ingestPending justo después de recordOutcome.
  const eventAAfterRelay = await pg.query('SELECT aggregate_id, payload FROM outbox_event WHERE id = $1', [outboxIdA]);
  check('A2. payload.accountId ausente INMEDIATAMENTE (sin sweep)', !('accountId' in (eventAAfterRelay.rows[0]?.payload ?? {})));
  check('A3. aggregateId es NULL INMEDIATAMENTE (sin sweep)', eventAAfterRelay.rows[0]?.aggregate_id === null);
  check('A4. examAttemptId preservado', eventAAfterRelay.rows[0]?.payload?.examAttemptId === examAttemptIdA);
  check('A5. examId preservado', eventAAfterRelay.rows[0]?.payload?.examId === examIdA);
  check('A6. completedAt preservado', eventAAfterRelay.rows[0]?.payload?.completedAt === completedAtA.toISOString());

  const deliveryAAfterRelay = await pg.query(
    `SELECT status, attempts, processed_at, terminal_at FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'`,
    [outboxIdA],
  );
  check('A7. delivery quedó PROCESSED', deliveryAAfterRelay.rows[0]?.status === 'PROCESSED');
  check('A8. terminalAt exacto == processedAt (mismo instante, nunca una aproximación aparte)', new Date(deliveryAAfterRelay.rows[0]?.terminal_at).getTime() === new Date(deliveryAAfterRelay.rows[0]?.processed_at).getTime());

  console.log('--- B/C. Camino real de reintentos: attempt 9 (retryable) -> attempt 10 (terminal, minimización inmediata) ---');
  const accountIdBC = randomUUID();
  const outboxIdBC = randomUUID();
  const examAttemptIdBC = randomUUID();
  // Payload deliberadamente INVÁLIDO (falta `completedAt`, campo requerido
  // por examCompletedPayloadSchema.strict()) -- GAMIFICATION falla SIEMPRE
  // al procesar esta fila, de forma determinística, en cada intento real.
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'exam_completed', 'v1', 'EXAMS', $2, now(), $3)`,
    [outboxIdBC, accountIdBC, JSON.stringify({ accountId: accountIdBC, examAttemptId: examAttemptIdBC, examId: randomUUID() })],
  );
  // Fixture: 9 intentos previos YA registrados (mismo criterio que las
  // secciones equivalentes de otros gates -- simula el estado que dejaría
  // el camino real tras 9 corridas de relay reales, sin tener que esperar
  // 9 minutos de cron real). `terminal_at` explícitamente NULL -- todavía
  // reintentable.
  await pg.query(
    `INSERT INTO outbox_event_delivery (id, outbox_event_id, consumer_name, status, attempts, last_error, terminal_at)
     VALUES ($1, $2, 'GAMIFICATION', 'FAILED', 9, 'fallo simulado reintentable', NULL)`,
    [randomUUID(), outboxIdBC],
  );

  console.log('--- C. attempt 9: SIGUE reintentable, SIN terminalAt, accountId intacto ---');
  const eventCBefore = await pg.query('SELECT payload, aggregate_id FROM outbox_event WHERE id = $1', [outboxIdBC]);
  check('C1. accountId SIGUE en payload en attempt 9', eventCBefore.rows[0]?.payload?.accountId === accountIdBC);
  check('C2. aggregateId SIGUE presente en attempt 9', eventCBefore.rows[0]?.aggregate_id === accountIdBC);
  const deliveryCBefore = await pg.query(`SELECT attempts, terminal_at, status FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'`, [outboxIdBC]);
  check('C3. attempts == 9', deliveryCBefore.rows[0]?.attempts === 9);
  check('C4. terminal_at es NULL en attempt 9 (todavía retryable)', deliveryCBefore.rows[0]?.terminal_at === null);
  const pendingCheck = await pg.query(
    `SELECT 1 FROM outbox_event oe WHERE oe.id = $1 AND (
       NOT EXISTS (SELECT 1 FROM outbox_event_delivery d WHERE d.outbox_event_id = oe.id AND d.consumer_name = 'GAMIFICATION')
       OR EXISTS (SELECT 1 FROM outbox_event_delivery d WHERE d.outbox_event_id = oe.id AND d.consumer_name = 'GAMIFICATION' AND d.status = 'FAILED' AND d.attempts < 10)
     )`,
    [outboxIdBC],
  );
  check('C5. el evento SIGUE siendo elegible para reintento real (mismo criterio que findPendingFor)', pendingCheck.rows.length === 1);

  console.log('--- B. El intento REAL #10 (vía relay real) transiciona a terminal y minimiza INMEDIATAMENTE ---');
  const relayBC = await post('/gamification/_internal/relay', {}, { 'x-internal-ops-key': opsKey });
  check('B1. relay (intento #10 real) status 200', relayBC.status === 200);

  const deliveryBAfter = await pg.query(
    `SELECT status, attempts, last_error, terminal_at FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'`,
    [outboxIdBC],
  );
  check('B2. attempts == 10 tras el intento real', deliveryBAfter.rows[0]?.attempts === 10);
  check('B3. status sigue FAILED (payload sigue siendo inválido)', deliveryBAfter.rows[0]?.status === 'FAILED');
  check('B4. lastError registrado en la transición real', typeof deliveryBAfter.rows[0]?.last_error === 'string' && deliveryBAfter.rows[0]?.last_error.length > 0);
  check('B5. terminal_at EXACTO quedó registrado en la transición a attempt 10 (no null)', deliveryBAfter.rows[0]?.terminal_at !== null);

  // Sin llamar a ningún sweep -- la minimización debió ocurrir YA, dentro
  // del mismo ciclo del relay que llevó attempts a 10.
  const eventBAfter = await pg.query('SELECT payload, aggregate_id FROM outbox_event WHERE id = $1', [outboxIdBC]);
  check('B6. payload.accountId removido INMEDIATAMENTE (agotar reintentos SÍ es terminal, sin esperar sweep)', !('accountId' in (eventBAfter.rows[0]?.payload ?? {})));
  check('B7. aggregateId es NULL INMEDIATAMENTE', eventBAfter.rows[0]?.aggregate_id === null);
  check('B8. examAttemptId preservado', eventBAfter.rows[0]?.payload?.examAttemptId === examAttemptIdBC);

  console.log('--- D. Retención EXACTA de 90 días: usa terminalAt, NUNCA occurredAt/createdAt ---');
  const outboxIdOldTerminal = randomUUID();
  const outboxIdRecentTerminal = randomUUID();
  const outboxIdAncientButRecentTerminal = randomUUID();

  // D1: terminal_at explícitamente viejo (91 días) -> debe purgarse.
  const oldTerminalAt = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, created_at)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, $3, $4, $3)`,
    [outboxIdOldTerminal, randomUUID(), oldTerminalAt, JSON.stringify({ accountId: randomUUID() })],
  );
  await pg.query(
    `INSERT INTO outbox_event_delivery (id, outbox_event_id, consumer_name, status, attempts, processed_at, terminal_at, created_at)
     VALUES ($1, $2, 'ANALYTICS', 'PROCESSED', 1, $3, $3, $3)`,
    [randomUUID(), outboxIdOldTerminal, oldTerminalAt],
  );

  // D2: terminal_at reciente (5 días) -> debe preservarse.
  const recentTerminalAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, created_at)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, $3, $4, $3)`,
    [outboxIdRecentTerminal, randomUUID(), recentTerminalAt, JSON.stringify({ accountId: randomUUID() })],
  );
  await pg.query(
    `INSERT INTO outbox_event_delivery (id, outbox_event_id, consumer_name, status, attempts, processed_at, terminal_at, created_at)
     VALUES ($1, $2, 'ANALYTICS', 'PROCESSED', 1, $3, $3, $3)`,
    [randomUUID(), outboxIdRecentTerminal, recentTerminalAt],
  );

  // D3 -- EL CASO CRÍTICO: occurredAt/createdAt ARBITRARIAMENTE viejos
  // (200 días), pero terminalAt RECIENTE (5 días) -- debe SOBREVIVIR. Esto
  // prueba que la retención usa terminalAt exclusivamente, nunca
  // occurredAt/createdAt como proxy de antigüedad real.
  const ancientOccurredAt = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
  const recentTerminalAt2 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, created_at)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, $3, $4, $3)`,
    [outboxIdAncientButRecentTerminal, randomUUID(), ancientOccurredAt, JSON.stringify({ accountId: randomUUID() })],
  );
  await pg.query(
    `INSERT INTO outbox_event_delivery (id, outbox_event_id, consumer_name, status, attempts, processed_at, terminal_at, created_at)
     VALUES ($1, $2, 'ANALYTICS', 'PROCESSED', 1, $3, $3, $4)`,
    [randomUUID(), outboxIdAncientButRecentTerminal, recentTerminalAt2, ancientOccurredAt],
  );

  const analyticsEventCountBefore = (await pg.query('SELECT count(*)::int n FROM analytics_event')).rows[0].n;

  const retentionD1 = await post('/outbox/_internal/retention-sweep', {}, { 'x-internal-ops-key': opsKey });
  check('D4. barrido de retención status 200', retentionD1.status === 200);

  const oldTerminalAfter = await pg.query('SELECT id FROM outbox_event WHERE id = $1', [outboxIdOldTerminal]);
  check('D5. terminalAt viejo (91 días) fue PURGADO', oldTerminalAfter.rows.length === 0);

  const recentTerminalAfter = await pg.query('SELECT id FROM outbox_event WHERE id = $1', [outboxIdRecentTerminal]);
  check('D6. terminalAt reciente (5 días) preservado', recentTerminalAfter.rows.length === 1);

  const ancientButRecentAfter = await pg.query('SELECT id, payload FROM outbox_event WHERE id = $1', [outboxIdAncientButRecentTerminal]);
  check(
    'D7. CRÍTICO: occurredAt/createdAt de 200 días NO causó purga -- terminalAt (5 días) es lo que manda, el evento SOBREVIVE',
    ancientButRecentAfter.rows.length === 1,
  );

  const deliveryOldTerminalAfter = await pg.query('SELECT id FROM outbox_event_delivery WHERE outbox_event_id = $1', [outboxIdOldTerminal]);
  check('D8. delivery cascade: sin filas de entrega para el evento purgado', deliveryOldTerminalAfter.rows.length === 0);
  const deliveryRecentTerminalAfter = await pg.query('SELECT id FROM outbox_event_delivery WHERE outbox_event_id = $1', [outboxIdRecentTerminal]);
  check('D9. delivery del evento preservado SIGUE existiendo (cascade solo aplica al borrado real)', deliveryRecentTerminalAfter.rows.length === 1);

  const analyticsEventCountAfter = (await pg.query('SELECT count(*)::int n FROM analytics_event')).rows[0].n;
  check('D10. tabla no relacionada (analytics_event) sin cambios de cantidad de filas', analyticsEventCountAfter === analyticsEventCountBefore);

  const retentionD2 = await post('/outbox/_internal/retention-sweep', {}, { 'x-internal-ops-key': opsKey });
  check('D11. segundo barrido inmediato status 200', retentionD2.status === 200);
  const recentTerminalStill = await pg.query('SELECT id FROM outbox_event WHERE id = $1', [outboxIdRecentTerminal]);
  check('D12. segundo barrido es idempotente: el terminal reciente sigue intacto', recentTerminalStill.rows.length === 1);
  const ancientButRecentStill = await pg.query('SELECT id FROM outbox_event WHERE id = $1', [outboxIdAncientButRecentTerminal]);
  check('D13. segundo barrido tampoco purga el caso crítico', ancientButRecentStill.rows.length === 1);

  console.log('--- E. Comportamiento seguro con filas LEGACY sin terminalAt confiable: NUNCA se minimizan ni purgan prematuramente ---');
  const accountIdLegacy = randomUUID();
  const outboxIdLegacy = randomUUID();
  const oldCreatedAtLegacy = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
  // Simula una fila FAILED con reintentos agotados (attempts >= 10) que
  // predata la columna terminal_at (o cuyo backfill no pudo asignarle un
  // instante confiable) -- terminal_at explícitamente NULL. Estructuralmente
  // "terminal" (findPendingFor jamás la reintentaría), pero SIN un instante
  // exacto -- debe tratarse como NO terminal por el camino de retención
  // exacta, nunca purgarse ni minimizarse prematuramente.
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload, created_at)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, $3, $4, $3)`,
    [outboxIdLegacy, accountIdLegacy, oldCreatedAtLegacy, JSON.stringify({ accountId: accountIdLegacy, campoLegacy: 'preexistente' })],
  );
  await pg.query(
    `INSERT INTO outbox_event_delivery (id, outbox_event_id, consumer_name, status, attempts, last_error, terminal_at, created_at)
     VALUES ($1, $2, 'ANALYTICS', 'FAILED', 10, 'fallo historico agotado', NULL, $3)`,
    [randomUUID(), outboxIdLegacy, oldCreatedAtLegacy],
  );

  const minimizeE = await post('/outbox/_internal/minimization-sweep', {}, { 'x-internal-ops-key': opsKey });
  check('E1. barrido de minimización status 200', minimizeE.status === 200);
  const retentionE = await post('/outbox/_internal/retention-sweep', {}, { 'x-internal-ops-key': opsKey });
  check('E2. barrido de retención status 200', retentionE.status === 200);

  const legacyAfter = await pg.query('SELECT id, payload, aggregate_id FROM outbox_event WHERE id = $1', [outboxIdLegacy]);
  check('E3. la fila legacy sigue existiendo (NO purgada prematuramente)', legacyAfter.rows.length === 1);
  check('E4. accountId SIGUE en payload (NO minimizada sin terminalAt confiable)', legacyAfter.rows[0]?.payload?.accountId === accountIdLegacy);
  check('E5. aggregateId SIGUE presente', legacyAfter.rows[0]?.aggregate_id === accountIdLegacy);
  check('E6. campo de negocio ajeno intacto', legacyAfter.rows[0]?.payload?.campoLegacy === 'preexistente');

  console.log('--- F. Seguridad multi-consumidor: terminalAt del evento = el MÁS TARDÍO entre consumidores aplicables, minimiza solo tras el último ---');
  // Registro real de ejemplo -- este eventKey NUNCA existe en producción,
  // se registra SOLO en esta corrida de gate (cast local, nunca en código
  // de producción) para probar la evaluación pura con más de un consumidor
  // aplicable, protegiendo una futura expansión más allá del mapeo
  // disjunto de hoy.
  const multiConsumerKey = `__gate_multiconsumer_test__${suffix}`;
  (OUTBOX_CONSUMER_REGISTRY as unknown as Map<string, readonly string[]>).set(multiConsumerKey, ['ANALYTICS', 'GAMIFICATION']);

  const onlyAnalyticsProcessed = [fakeDelivery({ consumerName: 'ANALYTICS', status: 'PROCESSED', processedAt: new Date(Date.now() - 1000) })];
  const partial = evaluateOutboxTerminalState(multiConsumerKey, onlyAnalyticsProcessed);
  check('F1. con SOLO un consumidor aplicable PROCESSED (falta GAMIFICATION, sin fila de entrega), el evento NO es terminal', partial.terminal === false);
  check('F2. terminalAt es null mientras no es terminal', partial.terminalAt === null);

  const analyticsAt = new Date(Date.now() - 1000);
  const gamificationAt = new Date();
  const bothProcessed = [
    fakeDelivery({ consumerName: 'ANALYTICS', status: 'PROCESSED', processedAt: analyticsAt }),
    fakeDelivery({ consumerName: 'GAMIFICATION', status: 'PROCESSED', processedAt: gamificationAt }),
  ];
  const full = evaluateOutboxTerminalState(multiConsumerKey, bothProcessed);
  check('F3. con AMBOS consumidores aplicables PROCESSED, el evento SÍ es terminal', full.terminal === true);
  check('F4. terminalAt es el MÁS TARDÍO entre los consumidores aplicables (GAMIFICATION, no ANALYTICS)', full.terminalAt?.getTime() === gamificationAt.getTime());

  const oneFailedRetryable = [
    fakeDelivery({ consumerName: 'ANALYTICS', status: 'PROCESSED', processedAt: new Date() }),
    fakeDelivery({ consumerName: 'GAMIFICATION', status: 'FAILED', attempts: 3, terminalAt: null }),
  ];
  const stillNotTerminal = evaluateOutboxTerminalState(multiConsumerKey, oneFailedRetryable);
  check('F5. un consumidor PROCESSED y el otro FAILED reintentable (sin terminalAt) -> NO terminal todavía', stillNotTerminal.terminal === false);

  const oneFailedExhausted = [
    fakeDelivery({ consumerName: 'ANALYTICS', status: 'PROCESSED', processedAt: new Date(Date.now() - 2000) }),
    fakeDelivery({ consumerName: 'GAMIFICATION', status: 'FAILED', attempts: 10, terminalAt: new Date() }),
  ];
  const nowTerminalViaExhaustion = evaluateOutboxTerminalState(multiConsumerKey, oneFailedExhausted);
  check('F6. el consumidor faltante llega terminal por agotar reintentos (terminalAt propio) -> AHORA SÍ terminal', nowTerminalViaExhaustion.terminal === true);

  (OUTBOX_CONSUMER_REGISTRY as unknown as Map<string, readonly string[]>).delete(multiConsumerKey);

  console.log('--- G. Barrido diario como RESPALDO: repara un evento terminal que no se minimizó de inmediato ---');
  const accountIdFallback = randomUUID();
  const outboxIdFallback = randomUUID();
  // Inserción DIRECTA por SQL (no vía el relay real) -- simula exactamente
  // el escenario que este barrido debe cubrir: un evento que de alguna
  // forma quedó TERMINAL (delivery PROCESSED con terminal_at ya asignado)
  // sin que la minimización inmediata haya corrido (crash entre
  // recordOutcome y minimizeIfTerminal, etc.).
  const fallbackTerminalAt = new Date();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'account_registered', 'v1', 'AUTH', $2, now(), $3)`,
    [outboxIdFallback, accountIdFallback, JSON.stringify({ accountId: accountIdFallback })],
  );
  await pg.query(
    `INSERT INTO outbox_event_delivery (id, outbox_event_id, consumer_name, status, attempts, processed_at, terminal_at)
     VALUES ($1, $2, 'ANALYTICS', 'PROCESSED', 1, $3, $3)`,
    [randomUUID(), outboxIdFallback, fallbackTerminalAt],
  );

  const fallbackBefore = await pg.query('SELECT payload, aggregate_id FROM outbox_event WHERE id = $1', [outboxIdFallback]);
  check('G1. fixture: terminal pero SIN minimizar todavía (accountId presente)', fallbackBefore.rows[0]?.payload?.accountId === accountIdFallback);

  const dailySweep = await post('/outbox/_internal/minimization-sweep', {}, { 'x-internal-ops-key': opsKey });
  check('G2. barrido diario/manual status 200', dailySweep.status === 200);

  const fallbackAfter = await pg.query('SELECT payload, aggregate_id FROM outbox_event WHERE id = $1', [outboxIdFallback]);
  check('G3. el barrido de respaldo REPARA el evento que se saltó la minimización inmediata', !('accountId' in (fallbackAfter.rows[0]?.payload ?? {})));
  check('G4. aggregateId es NULL tras la reparación', fallbackAfter.rows[0]?.aggregate_id === null);

  console.log('--- H. eventKey desconocido para el registro: NUNCA minimizado, NUNCA purgado (regresión) ---');
  const accountIdH = randomUUID();
  const outboxIdH = randomUUID();
  const unknownEventKey = `unknown_event_key_${suffix}`;
  check('H0. eventKey de prueba realmente NO está en el registro real', !OUTBOX_CONSUMER_REGISTRY.has(unknownEventKey));
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, $2, 'v1', 'TEST', $3, now(), $4)`,
    [outboxIdH, unknownEventKey, accountIdH, JSON.stringify({ accountId: accountIdH, campoAjeno: 'sin-tocar' })],
  );

  const minimizeH = await post('/outbox/_internal/minimization-sweep', {}, { 'x-internal-ops-key': opsKey });
  check('H1. barrido de minimización status 200', minimizeH.status === 200);
  const retentionH = await post('/outbox/_internal/retention-sweep', {}, { 'x-internal-ops-key': opsKey });
  check('H2. barrido de retención status 200', retentionH.status === 200);

  const eventHAfter = await pg.query('SELECT aggregate_id, payload FROM outbox_event WHERE id = $1', [outboxIdH]);
  check('H3. la fila sigue existiendo (no purgada)', eventHAfter.rows.length === 1);
  check('H4. accountId SIGUE en payload (eventKey desconocido nunca se minimiza)', eventHAfter.rows[0]?.payload?.accountId === accountIdH);
  check('H5. aggregateId SIGUE presente', eventHAfter.rows[0]?.aggregate_id === accountIdH);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de ciclo de vida de OUTBOX pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
