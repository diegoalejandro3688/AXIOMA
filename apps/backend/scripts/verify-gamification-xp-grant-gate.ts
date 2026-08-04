// Gate de otorgamiento de XP (validated_gamification_activity -> xp_ledger_entry)
// -- ver docs/adr/0016-gamificacion-fundacion.md. Prueba contra el servidor
// real ya compilado y corriendo (para XpGrantService, vía los endpoints
// _internal/*) más acceso directo a Postgres para fixtures y para probar
// restricciones/triggers que no son alcanzables solo con rutas HTTP.
//
// NO toca UI, niveles, rachas, ligas, títulos, insignias, desafíos, moneda
// virtual ni cosméticos -- fuera de alcance de este incremento.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { GamificationProgramRepository } from '../src/gamification/gamification-program.repository';
import { GamificationProgramVersionRepository } from '../src/gamification/gamification-program-version.repository';
import { XpRuleRepository } from '../src/gamification/xp-rule.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

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

const opsHeaders = { 'x-internal-ops-key': opsKey };
const runGrant = () => req('POST', '/gamification/_internal/grant-xp', opsHeaders);
const runReverse = (entryId: string, reasonCode: string) =>
  req('POST', `/gamification/_internal/xp-ledger-entries/${entryId}/reverse`, opsHeaders, { reasonCode });
const runReconcile = (accountId: string) => req('POST', `/gamification/_internal/accounts/${accountId}/reconcile-balance`, opsHeaders);

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const programRepo = new GamificationProgramRepository(prisma);
  const versionRepo = new GamificationProgramVersionRepository(prisma);
  const ruleRepo = new XpRuleRepository(prisma);
  const activityRepo = new ValidatedGamificationActivityRepository(prisma);

  const suffix = Date.now();

  console.log('--- -1. Decision Gate 5 (Bloque I): autoridad exclusiva de servidor -- sin clave de operaciones -> 401 ---');
  const anyId = randomUUID();
  const grantNoKey = await req('POST', '/gamification/_internal/grant-xp');
  check('POST /gamification/_internal/grant-xp sin INTERNAL_OPS_KEY -> 401', grantNoKey.status === 401);
  const reverseNoKey = await req('POST', `/gamification/_internal/xp-ledger-entries/${anyId}/reverse`, {}, { reasonCode: 'x' });
  check('POST .../reverse sin INTERNAL_OPS_KEY -> 401 (el guard rechaza antes de tocar la entrada)', reverseNoKey.status === 401);
  const reconcileNoKey = await req('POST', `/gamification/_internal/accounts/${anyId}/reconcile-balance`);
  check('POST .../reconcile-balance sin INTERNAL_OPS_KEY -> 401', reconcileNoKey.status === 401);

  console.log('--- 0. Fixtures: programa xp-core (ACTIVE), versión APPROVED + regla, y versión DRAFT + regla ---');
  let program = await programRepo.findByProgramKey('xp-core');
  if (!program) {
    program = await programRepo.create({ programKey: 'xp-core', name: 'XP Core', programType: 'XP', status: 'ACTIVE' });
  }
  check('programa xp-core disponible y ACTIVE', program.status === 'ACTIVE');

  const activityType = `GATE_ACTIVITY_${suffix}`;
  const draftActivityType = `GATE_ACTIVITY_DRAFT_${suffix}`;
  const BASE_XP = 10;
  const DAILY_CAP = 25; // permite exactamente 2 otorgamientos de 10 (20 <= 25); un 3ro (30) excede.

  const approvedVersion = await versionRepo.create({
    gamificationProgramId: program.id,
    versionLabel: `gate-approved-${suffix}`,
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60 * 60 * 1000),
    effectiveUntil: null,
    approvedAt: new Date(),
  });
  const rule = await ruleRepo.create({
    programVersionId: approvedVersion.id,
    activityType,
    baseXp: BASE_XP,
    dailyCap: DAILY_CAP,
  });
  check('versión APPROVED y regla creadas', Boolean(rule.id));

  const draftVersion = await versionRepo.create({
    gamificationProgramId: program.id,
    versionLabel: `gate-draft-${suffix}`,
    approvalStatus: 'DRAFT',
    effectiveFrom: new Date(Date.now() - 60 * 60 * 1000),
    effectiveUntil: null,
  });
  await ruleRepo.create({ programVersionId: draftVersion.id, activityType: draftActivityType, baseXp: 999, dailyCap: null });
  check('versión DRAFT y regla creadas (nunca deben otorgar XP)', true);

  console.log('--- 1. Rechazo de versiones no aprobadas: actividad bajo una regla DRAFT -> NO_ACTIVE_RULE ---');
  const draftAccountId = randomUUID();
  const draftActivity = await activityRepo.create({
    accountId: draftAccountId,
    sourceDomain: 'PROGRESS',
    sourceEntityType: 'StudentResponse',
    sourceEntityId: randomUUID(),
    activityType: draftActivityType,
    validationStatus: 'PENDING',
    occurredAt: new Date(),
    validationRuleVersion: 'v1',
    deduplicationKey: `draft-${suffix}`,
    integrityStatus: 'NOT_EVALUATED',
  });
  const grantDraft = await runGrant();
  check('relay de otorgamiento responde 200', grantDraft.status === 200);

  const draftLedgerRows = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE validated_activity_id = $1', [
    draftActivity.id,
  ]);
  check('NINGÚN xp_ledger_entry creado para la actividad bajo regla DRAFT', draftLedgerRows.rows[0].n === 0);

  const draftAttempt = await pg.query('SELECT last_outcome, attempts FROM xp_grant_attempt WHERE validated_activity_id = $1', [
    draftActivity.id,
  ]);
  check('xp_grant_attempt registra NO_ACTIVE_RULE (nunca en validated_gamification_activity)', draftAttempt.rows[0]?.last_outcome === 'NO_ACTIVE_RULE');
  check('attempts == 1 en el primer intento', Number(draftAttempt.rows[0]?.attempts) === 1);

  const draftActivityUnchanged = await pg.query(
    'SELECT validation_status FROM validated_gamification_activity WHERE id = $1',
    [draftActivity.id],
  );
  check(
    'validated_gamification_activity.validation_status SIGUE en PENDING -- nunca se modificó',
    draftActivityUnchanged.rows[0]?.validation_status === 'PENDING',
  );

  console.log('--- 1b. NO_ACTIVE_RULE no es terminal: reevaluado automáticamente al aparecer una regla compatible ---');
  await ruleRepo.create({ programVersionId: approvedVersion.id, activityType: draftActivityType, baseXp: 7, dailyCap: null });
  // El backoff de xp_grant_attempt (1 min tras el primer intento) impediría
  // reprocesar de inmediato en producción real -- para el gate, se libera el
  // backoff manualmente vía SQL en vez de esperar, para probar la
  // REACTIVACIÓN sin depender del reloj de la prueba.
  await pg.query("UPDATE xp_grant_attempt SET next_eligible_at = now() - interval '1 second' WHERE validated_activity_id = $1", [
    draftActivity.id,
  ]);
  const grantAfterRuleAppeared = await runGrant();
  check('segundo relay responde 200', grantAfterRuleAppeared.status === 200);
  const draftLedgerAfter = await pg.query('SELECT xp_amount FROM xp_ledger_entry WHERE validated_activity_id = $1', [
    draftActivity.id,
  ]);
  check(
    'con la regla ya APPROVED, la actividad que antes no tenía regla ahora SÍ se otorga (7 XP), sin intervención manual sobre la actividad',
    draftLedgerAfter.rowCount === 1 && draftLedgerAfter.rows[0]?.xp_amount === 7,
  );

  console.log('--- 1c. Corrección de secuenciación (2026-08-05): una versión MÁS RECIENTE sin regla para este activityType NO oculta una versión anterior que sí la tiene ---');
  // Reproduce exactamente el escenario que rompía verify-gamification-progression-gate.ts:
  // una versión aprobada, MÁS RECIENTE que `approvedVersion`, que solo
  // define la regla de OTRO activityType. Con el diseño anterior (elegir
  // la versión más reciente del PROGRAMA primero, buscar la regla DESPUÉS
  // solo dentro de esa versión), esta versión más nueva "ganaba" y la
  // actividad de `activityType` quedaba en NO_ACTIVE_RULE aunque
  // `approvedVersion` (más antigua) sí tuviera su regla vigente. Ver
  // docs/adr/0016-gamificacion-fundacion.md, "Corrección: selección de
  // regla aplicable".
  const newerUnrelatedVersion = await versionRepo.create({
    gamificationProgramId: program.id,
    versionLabel: `gate-newer-unrelated-${suffix}`,
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 30 * 60 * 1000), // más reciente que approvedVersion (60 min atrás)
    effectiveUntil: null,
    approvedAt: new Date(),
  });
  await ruleRepo.create({
    programVersionId: newerUnrelatedVersion.id,
    activityType: `GATE_ACTIVITY_UNRELATED_${suffix}`, // NUNCA el activityType que se prueba abajo
    baseXp: 999,
    dailyCap: null,
  });

  const shadowTestAccount = randomUUID();
  const shadowTestActivity = await activityRepo.create({
    accountId: shadowTestAccount,
    sourceDomain: 'PROGRESS',
    sourceEntityType: 'StudentResponse',
    sourceEntityId: randomUUID(),
    activityType, // el MISMO activityType de approvedVersion (la versión más antigua)
    validationStatus: 'PENDING',
    occurredAt: new Date(),
    validationRuleVersion: 'v1',
    deduplicationKey: `shadow-test-${suffix}`,
    integrityStatus: 'NOT_EVALUATED',
  });
  await runGrant();
  const shadowTestLedger = await pg.query('SELECT xp_amount, rule_version FROM xp_ledger_entry WHERE validated_activity_id = $1', [
    shadowTestActivity.id,
  ]);
  check(
    'la actividad SÍ se otorga (10 XP) pese a existir una versión más reciente sin esta regla',
    shadowTestLedger.rowCount === 1 && shadowTestLedger.rows[0]?.xp_amount === BASE_XP,
  );
  check(
    'rule_version referencia la versión ANTIGUA correcta (la que realmente tiene la regla), no la más reciente',
    shadowTestLedger.rows[0]?.rule_version === approvedVersion.versionLabel,
  );

  console.log('--- 2. Otorgamiento correcto + idempotencia + referencia estable a xp_rule ---');
  const accountA = randomUUID();
  const activityA = await activityRepo.create({
    accountId: accountA,
    sourceDomain: 'PROGRESS',
    sourceEntityType: 'StudentResponse',
    sourceEntityId: randomUUID(),
    activityType,
    validationStatus: 'PENDING',
    occurredAt: new Date(),
    validationRuleVersion: 'v1',
    deduplicationKey: `A-${suffix}`,
    integrityStatus: 'NOT_EVALUATED',
  });
  await runGrant();

  const entryA = await pg.query(
    'SELECT id, xp_amount, entry_type, xp_rule_id, idempotency_key FROM xp_ledger_entry WHERE validated_activity_id = $1',
    [activityA.id],
  );
  check('otorgamiento correcto: exactamente 1 xp_ledger_entry', entryA.rowCount === 1);
  check('entry_type == OTORGAMIENTO', entryA.rows[0]?.entry_type === 'OTORGAMIENTO');
  check('xp_amount == base_xp de la regla (10)', entryA.rows[0]?.xp_amount === BASE_XP);
  check('idempotencyKey == grant:${activityId}', entryA.rows[0]?.idempotency_key === `grant:${activityA.id}`);
  check('xp_rule_id referencia ESTABLE a la regla aplicada', entryA.rows[0]?.xp_rule_id === rule.id);

  const ruleToVersionJoin = await pg.query(
    `SELECT gpv.id AS version_id, gpv.approval_status FROM xp_ledger_entry xle
       JOIN xp_rule xr ON xr.id = xle.xp_rule_id
       JOIN gamification_program_version gpv ON gpv.id = xr.program_version_id
     WHERE xle.id = $1`,
    [entryA.rows[0].id],
  );
  check(
    'la versión del programa se resuelve vía xpRule -> APPROVED, la correcta',
    ruleToVersionJoin.rows[0]?.version_id === approvedVersion.id && ruleToVersionJoin.rows[0]?.approval_status === 'APPROVED',
  );

  const balanceAAfterFirst = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id = $1', [accountA]);
  check('xp_balance.lifetimeXp == 10 tras el primer otorgamiento', balanceAAfterFirst.rows[0]?.lifetime_xp === BASE_XP);

  console.log('--- 2b. Idempotencia real: reintentar el otorgamiento no duplica ni reincrementa el balance ---');
  await runGrant();
  await runGrant();
  const entryACountAfterRetries = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE validated_activity_id = $1', [
    activityA.id,
  ]);
  check('sigue existiendo UNA sola xp_ledger_entry tras reintentos', entryACountAfterRetries.rows[0].n === 1);
  const balanceAAfterRetries = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id = $1', [accountA]);
  check('xp_balance.lifetimeXp SIGUE en 10 -- no se incrementó dos veces', balanceAAfterRetries.rows[0]?.lifetime_xp === BASE_XP);

  console.log('--- 3. daily_cap bajo concurrencia REAL: 5 actividades distintas compitiendo por el mismo cupo ---');
  const accountB = randomUUID();
  const capActivities = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      activityRepo.create({
        accountId: accountB,
        sourceDomain: 'PROGRESS',
        sourceEntityType: 'StudentResponse',
        sourceEntityId: randomUUID(),
        activityType,
        validationStatus: 'PENDING',
        occurredAt: new Date(),
        validationRuleVersion: 'v1',
        deduplicationKey: `cap-${suffix}-${i}`,
        integrityStatus: 'NOT_EVALUATED',
      }),
    ),
  );
  check('5 actividades académicas distintas creadas para el mismo accountId/regla', capActivities.length === 5);

  // 5 disparos CONCURRENTES del mismo endpoint de otorgamiento -- cada uno
  // consulta pendientes y procesa antes de que los demás confirmen,
  // produciendo conflictos serializables reales entre transacciones que
  // compiten por el mismo daily_cap (ver XpGrantService.runSerializable).
  const concurrentResults = await Promise.all([runGrant(), runGrant(), runGrant(), runGrant(), runGrant()]);
  check('las 5 llamadas concurrentes respondieron 200', concurrentResults.every((r) => r.status === 200));

  const grantedForB = await pg.query(
    "SELECT count(*)::int AS n, COALESCE(SUM(xp_amount), 0)::int AS total FROM xp_ledger_entry WHERE account_id = $1 AND xp_rule_id = $2 AND entry_type = 'OTORGAMIENTO'",
    [accountB, rule.id],
  );
  check(
    'exactamente 2 otorgamientos concedidos (20 XP) -- el resto respetó el daily_cap bajo concurrencia real',
    grantedForB.rows[0].n === 2 && grantedForB.rows[0].total === 20,
  );
  check('el total otorgado NUNCA excede daily_cap (20 <= 25)', grantedForB.rows[0].total <= DAILY_CAP);

  // Nota: bajo concurrencia real, una actividad puede acumular un intento
  // DAILY_CAP_REACHED (perdió una carrera) y MÁS TARDE otorgarse igual (ganó
  // una carrera posterior) -- el registro de xp_grant_attempt es un historial
  // de intentos, no un veredicto final; el veredicto final es la existencia
  // (o no) de xp_ledger_entry. La garantía real es: toda actividad que NUNCA
  // se otorgó tiene un registro DAILY_CAP_REACHED.
  const notGrantedWithoutCapRecord = await pg.query(
    `SELECT count(*)::int AS n FROM validated_gamification_activity vga
       LEFT JOIN xp_ledger_entry xle ON xle.validated_activity_id = vga.id AND xle.entry_type = 'OTORGAMIENTO'
       LEFT JOIN xp_grant_attempt xga ON xga.validated_activity_id = vga.id
     WHERE vga.account_id = $1 AND xle.id IS NULL AND (xga.last_outcome IS DISTINCT FROM 'DAILY_CAP_REACHED')`,
    [accountB],
  );
  check(
    'toda actividad de esta cuenta que NUNCA se otorgó quedó registrada como DAILY_CAP_REACHED (ninguna quedó sin explicación)',
    notGrantedWithoutCapRecord.rows[0].n === 0,
  );

  console.log('--- 4. Reverso compensatorio: correcto, doble reversión impedida, reverso de un reverso rechazado ---');
  const originalEntryRow = await pg.query(
    "SELECT id FROM xp_ledger_entry WHERE account_id = $1 AND xp_rule_id = $2 AND entry_type = 'OTORGAMIENTO' LIMIT 1",
    [accountB, rule.id],
  );
  const originalEntryId = originalEntryRow.rows[0].id;

  const reversal1 = await runReverse(originalEntryId, 'gate-test-correction');
  check('reverso creado -> 200', reversal1.status === 200);
  check('entry_type == REVERSO', reversal1.body?.entryType === 'REVERSO');
  check('xpAmount == -10 (negativo exacto del original)', reversal1.body?.xpAmount === -BASE_XP);

  const reversal2 = await runReverse(originalEntryId, 'segundo-intento-deberia-ser-idempotente');
  check('segundo intento de reversar la MISMA entrada -> 200 (idempotente, no error)', reversal2.status === 200);
  check('devuelve la MISMA fila de reverso, no una segunda', reversal2.body?.id === reversal1.body?.id);
  const reversalCount = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE reverses_entry_id = $1', [
    originalEntryId,
  ]);
  check('UNA sola fila de reverso en la base para esta entrada original', reversalCount.rows[0].n === 1);

  const reverseOfReverse = await runReverse(reversal1.body.id, 'no-deberia-permitirse');
  check('intentar reversar un REVERSO -> rechazado (400)', reverseOfReverse.status === 400);

  console.log('--- 4b. Integridad de reverso a nivel de base de datos (protección independiente del servicio) ---');
  let crossAccountRejected = false;
  try {
    await pg.query(
      `INSERT INTO xp_ledger_entry (id, account_id, entry_type, xp_amount, idempotency_key, occurred_at, reverses_entry_id)
       VALUES ($1, $2, 'REVERSO', $3, $4, now(), $5)`,
      [randomUUID(), randomUUID(), -BASE_XP, `bad-cross-account-${suffix}`, originalEntryId],
    );
  } catch (error) {
    crossAccountRejected = true;
    check('el trigger menciona la causa (misma cuenta)', String((error as Error).message ?? '').includes('misma cuenta'));
  }
  check('trigger rechaza un reverso con account_id distinto al original', crossAccountRejected);

  let wrongAmountRejected = false;
  const secondGrantRow = await pg.query(
    "SELECT id, account_id FROM xp_ledger_entry WHERE account_id = $1 AND xp_rule_id = $2 AND entry_type = 'OTORGAMIENTO' AND id <> $3 LIMIT 1",
    [accountB, rule.id, originalEntryId],
  );
  try {
    await pg.query(
      `INSERT INTO xp_ledger_entry (id, account_id, entry_type, xp_amount, idempotency_key, occurred_at, reverses_entry_id)
       VALUES ($1, $2, 'REVERSO', $3, $4, now(), $5)`,
      [randomUUID(), secondGrantRow.rows[0].account_id, -999, `bad-amount-${suffix}`, secondGrantRow.rows[0].id],
    );
  } catch (error) {
    wrongAmountRejected = true;
    check('el trigger menciona la causa (negativo exacto)', String((error as Error).message ?? '').includes('negativo'));
  }
  check('trigger rechaza un reverso con monto distinto del negativo exacto', wrongAmountRejected);

  let duplicateReversalAtDbLevelRejected = false;
  try {
    await pg.query(
      `INSERT INTO xp_ledger_entry (id, account_id, entry_type, xp_amount, idempotency_key, occurred_at, reverses_entry_id)
       VALUES ($1, $2, 'REVERSO', $3, $4, now(), $5)`,
      [randomUUID(), secondGrantRow.rows[0].account_id, -BASE_XP, `bad-duplicate-reversal-${suffix}`, originalEntryId],
    );
  } catch (error) {
    duplicateReversalAtDbLevelRejected = (error as { code?: string }).code === '23505';
  }
  check(
    'UNIQUE(reverses_entry_id) rechaza una segunda fila de reverso aunque tenga OTRO idempotencyKey (protección de base de datos, no solo del servicio)',
    duplicateReversalAtDbLevelRejected,
  );

  console.log('--- 5. daily_cap NO se libera con un reverso ---');
  const otorgamientoSumAfterReversal = await pg.query(
    "SELECT COALESCE(SUM(xp_amount), 0)::int AS total FROM xp_ledger_entry WHERE account_id = $1 AND xp_rule_id = $2 AND entry_type = 'OTORGAMIENTO'",
    [accountB, rule.id],
  );
  check(
    'la suma de OTORGAMIENTO del día sigue en 20 tras el reverso -- el REVERSO nunca participa en el cómputo de daily_cap',
    otorgamientoSumAfterReversal.rows[0].total === 20,
  );

  console.log('--- 6. Consistencia ledger/proyección y reconstrucción real ---');
  const netFromLedgerB = await pg.query('SELECT COALESCE(SUM(xp_amount), 0)::int AS total FROM xp_ledger_entry WHERE account_id = $1', [
    accountB,
  ]);
  const balanceB = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id = $1', [accountB]);
  check(
    'xp_balance.lifetimeXp coincide EXACTAMENTE con la suma real del ledger (20 - 10 = 10)',
    netFromLedgerB.rows[0].total === 10 && balanceB.rows[0]?.lifetime_xp === 10,
  );

  console.log('--- 7. Recuperación ante desalineación: reconcile() corrige xp_balance divergente ---');
  await pg.query('UPDATE xp_balance SET lifetime_xp = 999999 WHERE account_id = $1', [accountB]);
  const corrupted = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id = $1', [accountB]);
  check('balance corrupto manualmente para la prueba (999999)', corrupted.rows[0]?.lifetime_xp === 999999);

  const reconcileResult = await runReconcile(accountB);
  check('reconcile responde 200', reconcileResult.status === 200);
  check('reporta corrected=true', reconcileResult.body?.corrected === true);
  check('reporta before=999999', reconcileResult.body?.before === 999999);
  check('reporta after=10 (el valor real recalculado desde el ledger)', reconcileResult.body?.after === 10);

  const balanceAfterReconcile = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id = $1', [accountB]);
  check('xp_balance quedó corregido a 10 en la base de datos', balanceAfterReconcile.rows[0]?.lifetime_xp === 10);

  const reconcileNoOp = await runReconcile(accountB);
  check('un segundo reconcile inmediato reporta corrected=false (ya está alineado)', reconcileNoOp.body?.corrected === false);

  console.log('--- 8. Cero modificación de PROGRESS: el flujo real de PROGRESS sigue intacto ---');
  const uid = `xpgrant-${suffix}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  const progressAccountId = session.body?.accountId as string;
  const authHeaders = { authorization: `Bearer ${idToken}`, 'x-session-id': session.body?.sessionId };

  const topicRow = await pg.query(`SELECT id FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
  const qv = await pg.query(
    `SELECT id FROM question_version WHERE curriculum_topic_id = $1 AND editorial_status = 'PUBLISHED' ORDER BY published_at ASC LIMIT 1`,
    [topicRow.rows[0].id],
  );
  const opt = await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 LIMIT 1`, [qv.rows[0].id]);
  const progressResponse = await req('POST', `/progress/topics/${topicRow.rows[0].id}/responses`, authHeaders, {
    questionVersionId: qv.rows[0].id,
    answerOptionId: opt.rows[0].id,
    operationId: randomUUID(),
  });
  check('PROGRESS sigue respondiendo 201 con éxito, sin ningún cambio de comportamiento', progressResponse.status === 201);
  const progressOutboxRow = await pg.query(
    "SELECT id FROM outbox_event WHERE aggregate_id = $1 AND event_key = 'student_response_recorded'",
    [progressAccountId],
  );
  check('PROGRESS sigue publicando student_response_recorded.v1 exactamente igual que antes', progressOutboxRow.rowCount === 1);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de otorgamiento de XP pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
