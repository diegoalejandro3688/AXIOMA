// WEB-0D.1C-B3-R1-ADDENDUM -- guardia de cuenta en cierre DEFINITIVO
// ACTIVAMENTE en curso (PrivacyRequest PROCESSING), ANTES de que
// `AuthService.markAccountClosed` marque `Account.status = CLOSED` (B3-R1
// §3 diferió ese marcado al FINAL del barrido). Sin esta extensión,
// GamificationService.ingestPending / XpGrantService.grantPending /
// LeaguePointGrantService.grantPending / RewardEvaluationWorker.processAccount
// solo comprobaban `Account.status === 'CLOSED'` -- durante la ventana
// (potencialmente de varios pasos) entre el inicio del barrido y ese
// marcado final, `Account.status` sigue leyendo DELETION_PENDING, IDÉNTICO
// al valor durante la ventana ORDINARIA de recuperación de 30 días. Este
// gate prueba que la distinción real (¿hay un PrivacyRequest PROCESSING
// para esta cuenta?) bloquea el caso (B) sin tocar el caso (A).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { assertGateDb, retireStaleGateLeagues } from './gate-db-safety';
import { AccountRepository } from '../src/auth/account.repository';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { LeaguePointRuleRepository } from '../src/gamification/league-point-rule.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { QuickQuestionAttemptRepository } from '../src/gamification/quick-question-attempt.repository';
import { LeaguePointGrantService } from '../src/gamification/league-point-grant.service';
import { gamificationActorRef } from '../src/gamification/gamification-actor-ref';
import { buildLegacyRewardSourceId } from '../src/gamification/gamification-key';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3001';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    failures++;
    console.error(`FALLO  ${label}`);
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
  const uid = `cpwg-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return { accountId: session.body.accountId as string, headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId } };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);
  await retireStaleGateLeagues(pg);

  const now = new Date();
  const suffix = `${Date.now()}`;
  const gamificationSecret = process.env.GAMIFICATION_ACTOR_SECRET ?? '';
  check('preflight: GAMIFICATION_ACTOR_SECRET presente', gamificationSecret.length > 0);

  // Fixture xp-core compartida (mismo criterio que otros gates de este bloque).
  await pg.query(
    "UPDATE xp_rule xr SET status = 'RETIRED' FROM gamification_program_version gpv, gamification_program gp WHERE xr.program_version_id = gpv.id AND gpv.gamification_program_id = gp.id AND gp.program_key = 'xp-core' AND gpv.version_label LIKE 'cpwg-gate-%' AND xr.status = 'ACTIVE'",
  );
  await pg.query("UPDATE league_point_rule SET status = 'RETIRED' WHERE rule_version LIKE 'cpwg-gate-lp-%' AND status = 'ACTIVE'");
  let programId: string;
  const existingProgram = await pg.query(`SELECT id FROM gamification_program WHERE program_key = 'xp-core'`);
  if (existingProgram.rows.length > 0) programId = existingProgram.rows[0].id;
  else {
    programId = randomUUID();
    await pg.query(`INSERT INTO gamification_program (id, program_key, name, program_type) VALUES ($1,'xp-core','XP Core','XP')`, [programId]);
  }
  const versionId = randomUUID();
  await pg.query(
    `INSERT INTO gamification_program_version (id, gamification_program_id, version_label, approval_status, effective_from) VALUES ($1,$2,$3,'APPROVED',$4)`,
    [versionId, programId, `cpwg-gate-${suffix}`, now.toISOString()],
  );
  const xpRuleId = randomUUID();
  await pg.query(`INSERT INTO xp_rule (id, program_version_id, activity_type, base_xp, effective_from) VALUES ($1,$2,'RESPUESTA_VALIDADA',10,$3)`, [xpRuleId, versionId, now.toISOString()]);

  const bundleId = randomUUID();
  await pg.query(`INSERT INTO reward_bundle (id, name, bundle_key) VALUES ($1,'Gate Bundle CPWG',$2)`, [bundleId, `cpwg-gate-bundle-${suffix}`]);

  // Temporada/liga/grupo mínimos para LP.
  const existingActiveSeason = await pg.query(`SELECT id, starts_at, ends_at FROM game_season WHERE status = 'ACTIVE' AND starts_at <= $1 AND ends_at > $1 LIMIT 1`, [now.toISOString()]);
  let seasonId: string, seasonStartsAt: Date, seasonEndsAt: Date;
  if (existingActiveSeason.rows.length > 0) {
    seasonId = existingActiveSeason.rows[0].id;
    seasonStartsAt = existingActiveSeason.rows[0].starts_at;
    seasonEndsAt = existingActiveSeason.rows[0].ends_at;
  } else {
    seasonId = randomUUID();
    seasonStartsAt = now;
    seasonEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await pg.query(`INSERT INTO game_season (id, season_key, name, status, starts_at, ends_at) VALUES ($1,$2,'Gate Season CPWG','ACTIVE',$3,$4)`, [
      seasonId,
      `cpwg-gate-season-${suffix}`,
      seasonStartsAt.toISOString(),
      seasonEndsAt.toISOString(),
    ]);
  }
  const leagueDefId = randomUUID();
  await pg.query(`INSERT INTO league_definition (id, league_key, name, tier_order, participant_group_size) VALUES ($1,$2,'Gate League CPWG',1,30)`, [leagueDefId, `cpwg-gate-league-${suffix}`]);
  const leagueGroupId = randomUUID();
  await pg.query(`INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,30,'v1','OPEN')`, [
    leagueGroupId,
    seasonId,
    leagueDefId,
  ]);
  const lpRuleId = randomUUID();
  await pg.query(`INSERT INTO league_point_rule (id, activity_type, base_points, rule_version, effective_from) VALUES ($1,'RESPUESTA_VALIDADA',1,$2,$3)`, [lpRuleId, `cpwg-gate-lp-${suffix}`, now.toISOString()]);

  const lpParticipationRepo = new SeasonLeagueParticipationRepository(prisma);
  const lpSeasonRepo = new GameSeasonRepository(prisma);
  const lpGroupRepo = new LeagueGroupRepository(prisma);
  const lpRuleRepo = new LeaguePointRuleRepository(prisma);
  const lpLedgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const lpQuickQuestionRepo = new QuickQuestionAttemptRepository(prisma);
  const lpActivityRepo = new ValidatedGamificationActivityRepository(prisma);
  const lpTxRunner = new TransactionRunnerService(prisma);
  const lpAccountRepo = new AccountRepository(prisma);
  const lpGrantService = new LeaguePointGrantService(lpTxRunner, lpActivityRepo, lpParticipationRepo, lpSeasonRepo, lpGroupRepo, lpRuleRepo, lpLedgerRepo, lpQuickQuestionRepo, lpAccountRepo);

  // ==========================================================================
  console.log('--- 1/2. Caso (A): DELETION_PENDING ORDINARIO -- el comportamiento existente NO cambia ---');

  const ordinary = await createSession('ordinary');
  const ordinaryDel = await req('POST', '/privacy/account-deletion', ordinary.headers, {});
  if (ordinaryDel.status !== 202) throw new Error(`solicitud de eliminación falló: ${ordinaryDel.status} ${ordinaryDel.raw}`);
  const ordinaryStatus = await pg.query('SELECT status FROM account WHERE id = $1', [ordinary.accountId]);
  check('1.1 cuenta en DELETION_PENDING (ventana ordinaria, scheduledFor a 30 días -- SIN barrido en curso)', ordinaryStatus.rows[0]?.status === 'DELETION_PENDING');
  const ordinaryRequestStatus = await pg.query('SELECT status FROM privacy_request WHERE account_id = $1', [ordinary.accountId]);
  check('1.2 PrivacyRequest en PENDING (NUNCA PROCESSING todavía)', ordinaryRequestStatus.rows[0]?.status === 'PENDING');

  const ordinaryVgaId = randomUUID();
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,$2,'GATE','GATE_ENTITY',$3,'RESPUESTA_VALIDADA','VALID','v1',$4,$5,'INTACT')`,
    [ordinaryVgaId, ordinary.accountId, randomUUID(), now.toISOString(), `cpwg-a2-vga-${suffix}`],
  );
  const xpGrantOrdinary = await req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey }, {});
  check('2.1 grant-xp responde 200', xpGrantOrdinary.status === 200);
  const ordinaryXpAfter = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE validated_activity_id = $1', [ordinaryVgaId]);
  check('2.2 comportamiento existente SIN CAMBIOS: XP SÍ se otorga durante DELETION_PENDING ordinario (B0/B0R solo bloquea CLOSED, nunca DELETION_PENDING -- decisión de producto ya congelada, este addendum NO la toca)', ordinaryXpAfter.rows[0].n === 1);

  // ==========================================================================
  console.log('--- 3/4. Cierre DEFINITIVO ACTIVAMENTE en curso (PROCESSING), pausado ANTES de markAccountClosed por un fallo real de B3 ---');

  const closing = await createSession('closing');

  // Trabajo gamification YA existente/pendiente para "closing", sembrado
  // MIENTRAS la cuenta todavía está activa (antes de solicitar el cierre) --
  // representa el estado real que un worker podría intentar tocar durante
  // la ventana de PROCESSING.
  const closingXpEntryId = randomUUID(); // XP YA otorgado (para que RewardEvaluationWorker descubra la cuenta).
  await pg.query(
    `INSERT INTO xp_ledger_entry (id, account_id, xp_rule_id, entry_type, xp_amount, idempotency_key, occurred_at) VALUES ($1,$2,$3,'OTORGAMIENTO',10,$4,$5)`,
    [closingXpEntryId, closing.accountId, xpRuleId, `cpwg-closing-xp-${suffix}`, now.toISOString()],
  );
  const closingXpPendingVgaId = randomUUID(); // XP pendiente de otorgar (para XpGrantService).
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,$2,'GATE','GATE_ENTITY',$3,'RESPUESTA_VALIDADA','VALID','v1',$4,$5,'INTACT')`,
    [closingXpPendingVgaId, closing.accountId, randomUUID(), now.toISOString(), `cpwg-closing-xp-pending-vga-${suffix}`],
  );
  const closingParticipationId = randomUUID();
  await pg.query(`INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6)`, [
    closingParticipationId,
    seasonId,
    closing.accountId,
    leagueDefId,
    leagueGroupId,
    (now < seasonStartsAt ? seasonStartsAt : now).toISOString(),
  ]);
  const closingLpPendingVgaId = randomUUID(); // LP pendiente de otorgar (para LeaguePointGrantService).
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,$2,'GATE','GATE_ENTITY',$3,'RESPUESTA_VALIDADA','VALID','v1',$4,$5,'INTACT')`,
    [closingLpPendingVgaId, closing.accountId, randomUUID(), now.toISOString(), `cpwg-closing-lp-pending-vga-${suffix}`],
  );
  // Dos RewardGrant legacy que colisionan al mismo destino v2 -- fuerza que
  // B3 ABORTE (B3-R1 §1) en el primer intento de barrido, dejando a
  // "closing" EXACTAMENTE en PrivacyRequest PROCESSING / Account
  // DELETION_PENDING (nunca CLOSED) -- el checkpoint real que este gate
  // necesita, logrado con un fallo GENUINO, no un pausado artificial.
  const closingLegacySourceId = buildLegacyRewardSourceId(closing.accountId, 55);
  const closingGrant1Id = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    closingGrant1Id,
    closing.accountId,
    bundleId,
    closingLegacySourceId,
    `reward:LEVEL:${closingLegacySourceId}`,
  ]);
  const closingGrant2Id = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    closingGrant2Id,
    closing.accountId,
    bundleId,
    closingLegacySourceId,
    `reward:LEVEL:${closingLegacySourceId}-dup-${suffix}`,
  ]);

  const closingDel = await req('POST', '/privacy/account-deletion', closing.headers, {});
  if (closingDel.status !== 202) throw new Error(`solicitud de eliminación falló: ${closingDel.status} ${closingDel.raw}`);
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [closing.accountId]);
  const closingSweep1 = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  check('3.1 el ENDPOINT de barrido responde 200 (falla aislada por cuenta)', closingSweep1.status === 200);

  const closingAccountAfterSweep1 = await pg.query('SELECT status, closed_at FROM account WHERE id = $1', [closing.accountId]);
  check('3.2 checkpoint: Account.status == DELETION_PENDING (NUNCA CLOSED -- el fallo de B3 detuvo el try antes de markAccountClosed)', closingAccountAfterSweep1.rows[0]?.status === 'DELETION_PENDING');
  check('3.3 checkpoint: Account.closedAt sigue NULL', closingAccountAfterSweep1.rows[0]?.closed_at === null);
  const closingRequestAfterSweep1 = await pg.query('SELECT status FROM privacy_request WHERE account_id = $1', [closing.accountId]);
  check('3.4 checkpoint: PrivacyRequest.status == PROCESSING (cierre definitivo ACTIVAMENTE en curso)', closingRequestAfterSweep1.rows[0]?.status === 'PROCESSING');

  // ==========================================================================
  console.log('--- 5/6. Con la cuenta en ese checkpoint EXACTO, se invocan los 4 workers reales -- CERO estado nuevo ---');

  // Evento de ingesta TARDÍO (llegó después de que el barrido ya empezó a
  // procesar esta cuenta) -- simula el caso real que preocupa: un
  // OutboxEvent en cola para una cuenta que está siendo cerrada AHORA MISMO.
  const closingOutboxId = randomUUID();
  const closingExamAttemptId = randomUUID();
  const closingExamId = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'exam_completed', 'v1', 'EXAMS', $2, now(), $3)`,
    [closingOutboxId, closing.accountId, JSON.stringify({ accountId: closing.accountId, examAttemptId: closingExamAttemptId, examId: closingExamId, completedAt: now.toISOString() })],
  );
  const vgaCountBefore = await pg.query('SELECT count(*)::int AS n FROM validated_gamification_activity WHERE account_id = $1', [closing.accountId]);

  const relayDuringProcessing = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
  check('5.1 relay (ingest) responde 200', relayDuringProcessing.status === 200);
  const vgaCountAfter = await pg.query('SELECT count(*)::int AS n FROM validated_gamification_activity WHERE account_id = $1', [closing.accountId]);
  check('6.1 INGEST: NINGUNA ValidatedGamificationActivity nueva creada para la cuenta en PROCESSING', vgaCountAfter.rows[0].n === vgaCountBefore.rows[0].n);
  const closingDelivery = await pg.query(`SELECT status FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'`, [closingOutboxId]);
  check('6.2 INGEST: el evento se trata como éxito de transporte (nunca reintento infinito)', closingDelivery.rows[0]?.status === 'PROCESSED');

  const xpGrantDuringProcessing = await req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey }, {});
  check('5.2 XP worker responde 200', xpGrantDuringProcessing.status === 200);
  const closingXpCountAfterGrant = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE validated_activity_id = $1', [closingXpPendingVgaId]);
  check('6.3 XP WORKER: NINGÚN XpLedgerEntry nuevo para la actividad pendiente de la cuenta en PROCESSING', closingXpCountAfterGrant.rows[0].n === 0);

  const lpResultDuringProcessing = await lpGrantService.grantPending();
  check('5.3 LP worker corre sin lanzar', typeof lpResultDuringProcessing.granted === 'number');
  const closingLpCountAfterGrant = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = $1', [closingLpPendingVgaId]);
  check('6.4 LP WORKER: NINGÚN LeaguePointLedgerEntry nuevo para la actividad pendiente de la cuenta en PROCESSING', closingLpCountAfterGrant.rows[0].n === 0);

  const rewardGrantCountBefore = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1 OR account_id IS NULL', [closing.accountId]);
  const evaluateDuringProcessing = await req('POST', '/gamification/_internal/evaluate-rewards', { 'x-internal-ops-key': opsKey }, {});
  check('5.4 reward worker responde 200', evaluateDuringProcessing.status === 200);
  const closingRewardGrantsAfter = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1', [closing.accountId]);
  check('6.5 REWARD WORKER: ningún RewardGrant nuevo para la cuenta en PROCESSING (sigue solo con los 2 legacy sembrados)', closingRewardGrantsAfter.rows[0].n === 2);
  const closingXpEntryStillRaw = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [closingXpEntryId]);
  check('6.6 REWARD WORKER: la entrada XP pre-existente NO se tocó (ni el worker ni B3, que también falló, la mutaron)', closingXpEntryStillRaw.rows[0].account_id === closing.accountId && closingXpEntryStillRaw.rows[0].gamification_actor_ref === null);
  void rewardGrantCountBefore;

  // ==========================================================================
  console.log('--- 7/8. Se resuelve la colisión, se reintenta, el barrido COMPLETA -- CLOSED solo aparece tras el cleanup exitoso ---');

  await pg.query(`DELETE FROM reward_grant WHERE id = $1`, [closingGrant2Id]);
  await pg.query("UPDATE privacy_request SET processing_started_at = now() - interval '2 hours' WHERE account_id = $1 AND status = 'PROCESSING'", [closing.accountId]);
  const closingSweep2 = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  check('7.1 reintento del barrido responde 200', closingSweep2.status === 200);

  const closingAccountFinal = await pg.query('SELECT status, closed_at FROM account WHERE id = $1', [closing.accountId]);
  check('8.1 Account.status == CLOSED SOLO ahora, tras el cleanup exitoso', closingAccountFinal.rows[0]?.status === 'CLOSED');
  check('8.2 Account.closedAt seteado', closingAccountFinal.rows[0]?.closed_at !== null);
  const closingRequestFinal = await pg.query('SELECT status FROM privacy_request WHERE account_id = $1', [closing.accountId]);
  check('8.3 PrivacyRequest COMPLETED', closingRequestFinal.rows[0]?.status === 'COMPLETED');
  const closingActorRef = gamificationActorRef(closing.accountId, gamificationSecret);
  const closingXpEntryFinal = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [closingXpEntryId]);
  check('8.4 la entrada XP pre-existente SÍ quedó pseudonimizada ahora (B3 corrió sin colisión)', closingXpEntryFinal.rows[0].account_id === null && closingXpEntryFinal.rows[0].gamification_actor_ref === closingActorRef);

  // Post-CLOSED: los 4 workers siguen bloqueados, ahora por el guardia
  // CLOSED existente (nunca una brecha entre "PROCESSING" y "CLOSED").
  const relayAfterClosed = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
  check('8.5 post-CLOSED: relay responde 200', relayAfterClosed.status === 200);
  // WEB-0D.1C-B4 -- STALE GATE fix: entre el checkpoint anterior (6.1) y
  // este punto, el barrido COMPLETÓ exitosamente (paso 7), y B4 ahora
  // pseudonimiza `ValidatedGamificationActivity` como parte de ese mismo
  // cierre exitoso -- las filas de "closing" YA NO tienen `account_id`
  // crudo (esperado, correcto, ver el reporte de B4 §C), así que contar
  // por `account_id = closing.accountId` subestima el total real. La
  // invariante que este check debe probar sigue intacta: NINGUNA fila
  // NUEVA -- se prueba comparando accountId crudo + actorRef de esta
  // cuenta contra el total esperado (el mismo de antes, ahora repartido
  // entre ambas formas de identidad en vez de perderse).
  const vgaCountFinal = await pg.query('SELECT count(*)::int AS n FROM validated_gamification_activity WHERE account_id = $1 OR gamification_actor_ref = $2', [closing.accountId, closingActorRef]);
  check('8.6 post-CLOSED: sigue sin ValidatedGamificationActivity nueva (CLOSED, guardia preexistente + B4 ya pseudonimizó las existentes)', vgaCountFinal.rows[0].n === vgaCountAfter.rows[0].n);
  const xpGrantAfterClosed = await req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey }, {});
  check('8.7 post-CLOSED: grant-xp responde 200', xpGrantAfterClosed.status === 200);
  const closingXpCountFinal = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE validated_activity_id = $1', [closingXpPendingVgaId]);
  check('8.8 post-CLOSED: sigue sin XpLedgerEntry nuevo para la actividad pendiente', closingXpCountFinal.rows[0].n === 0);

  // Retira las reglas COMPARTIDAS sembradas -- mismo criterio que otros gates de este bloque.
  await pg.query(
    "UPDATE xp_rule xr SET status = 'RETIRED' FROM gamification_program_version gpv, gamification_program gp WHERE xr.program_version_id = gpv.id AND gpv.gamification_program_id = gp.id AND gp.program_key = 'xp-core' AND gpv.version_label LIKE 'cpwg-gate-%' AND xr.status = 'ACTIVE'",
  );
  // `effective_until` explícito además de `status`: algunos consumidores
  // (p.ej. verify-competitive-v1-gate.ts) verifican vigencia temporal
  // directamente por `effective_from/effective_until`, sin filtrar por
  // `status` -- dejar solo `status='RETIRED'` con `effective_until` NULL
  // deja la fila temporalmente "vigente para siempre" en esos consumidores.
  await pg.query("UPDATE league_point_rule SET status = 'RETIRED', effective_until = now() WHERE rule_version LIKE 'cpwg-gate-lp-%' AND status = 'ACTIVE'");
  await retireStaleGateLeagues(pg);

  await prisma.$disconnect();
  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de guardia de workers durante el cierre-en-PROCESSING (WEB-0D.1C-B3-R1-ADDENDUM) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
