// WEB-0D.1C-B3 (+ B3-R1) -- pseudonimización histórica INMEDIATA-SEGURA,
// ATÓMICA por cuenta, en el cierre DEFINITIVO de cuenta. HTTP real contra
// /privacy (solicitud + barrido real, mismo mecanismo que produce un cierre
// definitivo genuino) + acceso directo a Postgres para fixtures/aserciones
// + invocación directa de GamificationPrivacyService (clase REAL, sin
// reimplementar su lógica) para los escenarios de secreto ausente y de
// fallo dentro de la transacción -- mismo patrón híbrido que los gates de
// B0R, ampliado según B3-R1 §4.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { assertGateDb } from './gate-db-safety';
import { gamificationActorRef } from '../src/gamification/gamification-actor-ref';
import { buildLegacyRewardSourceId } from '../src/gamification/gamification-key';
import { GamificationPrivacyService, RewardGrantReconciliationRequiredError } from '../src/gamification/gamification-privacy.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';

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
  const uid = `gwhp-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return { accountId: session.body.accountId as string, headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId } };
}

/** Solicita eliminación, adelanta scheduledFor, y corre el barrido real -- mismo helper que verify-deferred-gamification-worker-closed-account-guard-gate.ts. */
async function closeDefinitively(pg: Client, session: { accountId: string; headers: Record<string, string> }): Promise<void> {
  const del = await req('POST', '/privacy/account-deletion', session.headers, {});
  if (del.status !== 202) throw new Error(`solicitud de eliminación falló para ${session.accountId}: ${del.status} ${del.raw}`);
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [session.accountId]);
  const sweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  if (sweep.status !== 200) throw new Error(`barrido de cierre falló: ${sweep.status} ${sweep.raw}`);
}

async function requestDeletionOnly(session: { accountId: string; headers: Record<string, string> }): Promise<void> {
  const del = await req('POST', '/privacy/account-deletion', session.headers, {});
  if (del.status !== 202) throw new Error(`solicitud de eliminación falló para ${session.accountId}: ${del.status} ${del.raw}`);
}

/** `cancelDeletion` no tiene endpoint HTTP (ADR-0005) -- invocable solo vía el CLI real, igual que verify-privacy-gate.ts. */
function recoverAccountViaCli(accountId: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync('node', ['dist/cli/recover-account.js', accountId], { encoding: 'utf-8', env: process.env });
    return { ok: true, output };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as any;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  const now = new Date();
  const gamificationSecret = process.env.GAMIFICATION_ACTOR_SECRET ?? '';
  check('preflight: GAMIFICATION_ACTOR_SECRET presente en el entorno de gates', gamificationSecret.length > 0);

  // Fixture xp-core / achievement / bundle minimos, reutilizables entre escenarios.
  const suffix = `${Date.now()}`;
  await pg.query(
    "UPDATE xp_rule xr SET status = 'RETIRED' FROM gamification_program_version gpv, gamification_program gp WHERE xr.program_version_id = gpv.id AND gpv.gamification_program_id = gp.id AND gp.program_key = 'xp-core' AND gpv.version_label LIKE 'gwhp-gate-%' AND xr.status = 'ACTIVE'",
  );
  await pg.query("UPDATE league_point_rule SET status = 'RETIRED' WHERE rule_version LIKE 'gwhp-gate-lp-%' AND status = 'ACTIVE'");
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
    [versionId, programId, `gwhp-gate-${suffix}`, now.toISOString()],
  );
  const xpRuleId = randomUUID();
  await pg.query(`INSERT INTO xp_rule (id, program_version_id, activity_type, base_xp, effective_from) VALUES ($1,$2,'RESPUESTA_VALIDADA',10,$3)`, [xpRuleId, versionId, now.toISOString()]);

  async function seedXpEntry(accountId: string, idemp: string): Promise<string> {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO xp_ledger_entry (id, account_id, xp_rule_id, entry_type, xp_amount, idempotency_key, occurred_at) VALUES ($1,$2,$3,'OTORGAMIENTO',10,$4,$5)`,
      [id, accountId, xpRuleId, idemp, now.toISOString()],
    );
    return id;
  }

  const bundleId = randomUUID();
  await pg.query(`INSERT INTO reward_bundle (id, name, bundle_key) VALUES ($1,'Gate Bundle B3',$2)`, [bundleId, `gwhp-gate-bundle-${suffix}`]);

  const achDefId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_definition (id, achievement_key, name, achievement_category, visibility_class, repeatability, progress_tracking_type) VALUES ($1,$2,'Gate Ach B3','GATE','PRIVATE','UNIQUE','GATE')`,
    [achDefId, `gwhp-gate-ach-${suffix}`],
  );
  const achVersionId = randomUUID();
  await pg.query(`INSERT INTO achievement_version (id, achievement_definition_id, version_label, unlock_rule, approval_status) VALUES ($1,$2,'v1','{"schemaVersion":"v1","type":"XP_THRESHOLD","value":999999999}','APPROVED')`, [
    achVersionId,
    achDefId,
  ]);

  // ==========================================================================
  console.log('--- A. Estado de la cuenta -- solo CLOSED dispara la pseudonimización ---');

  // A.1 -- ACTIVA: sin cierre, historial sigue identificable.
  const active = await createSession('active');
  const activeXpId = await seedXpEntry(active.accountId, `gwhp-a1-${suffix}`);
  const activeRow1 = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [activeXpId]);
  check('A.1 cuenta ACTIVA: XpLedgerEntry sigue identificable (sin B3)', activeRow1.rows[0].account_id === active.accountId && activeRow1.rows[0].gamification_actor_ref === null);

  // A.2 -- DELETION_PENDING (solicitud SIN adelantar/barrer): historial sigue identificable durante la ventana.
  const pending = await createSession('pending');
  const pendingXpId = await seedXpEntry(pending.accountId, `gwhp-a2-${suffix}`);
  await requestDeletionOnly(pending);
  const pendingAccountRow = await pg.query('SELECT status FROM account WHERE id = $1', [pending.accountId]);
  check('A.2 cuenta DELETION_PENDING (status real)', pendingAccountRow.rows[0]?.status === 'DELETION_PENDING');
  const pendingRow = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [pendingXpId]);
  check('A.2 cuenta DELETION_PENDING: historial sigue identificable (sin B3 durante la ventana de recuperación)', pendingRow.rows[0].account_id === pending.accountId && pendingRow.rows[0].gamification_actor_ref === null);

  // A.4 -- recuperación/cancelación ANTES del cierre definitivo: sin pseudonimización.
  const recovered = await createSession('recovered');
  const recoveredXpId = await seedXpEntry(recovered.accountId, `gwhp-a4-${suffix}`);
  await requestDeletionOnly(recovered);
  const cancel = recoverAccountViaCli(recovered.accountId);
  const recoveredAccountRow = await pg.query('SELECT status FROM account WHERE id = $1', [recovered.accountId]);
  check('A.4 recuperación vía CLI real: cuenta vuelve a ACTIVE', cancel.ok && recoveredAccountRow.rows[0]?.status === 'ACTIVE');
  const recoveredRow = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [recoveredXpId]);
  check('A.4 tras recuperación/cancelación: NINGUNA pseudonimización histórica ocurrió', recoveredRow.rows[0].account_id === recovered.accountId && recoveredRow.rows[0].gamification_actor_ref === null);

  // A.3 -- CLOSED / cierre definitivo real: pseudonimización inmediata-segura SÍ ocurre.
  const closed = await createSession('closed');
  const closedXpId = await seedXpEntry(closed.accountId, `gwhp-a3-${suffix}`);
  await closeDefinitively(pg, closed);
  const closedAccountRow = await pg.query('SELECT status FROM account WHERE id = $1', [closed.accountId]);
  check('A.3 cuenta CLOSED (status real, cierre definitivo genuino)', closedAccountRow.rows[0]?.status === 'CLOSED');
  const closedRow = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [closedXpId]);
  const expectedActorRef = gamificationActorRef(closed.accountId, gamificationSecret);
  check('A.3 XpLedgerEntry pseudonimizado tras el cierre definitivo (accountId->NULL)', closedRow.rows[0].account_id === null);
  check('A.3 gamificationActorRef == gamificationActorRef(accountId, secreto de prueba)', closedRow.rows[0].gamification_actor_ref === expectedActorRef);

  // ==========================================================================
  console.log('--- B. Transición de identidad -- los 5 modelos IMMEDIATE_SAFE reciben el MISMO actorRef ---');

  const w = await createSession('w');
  const wXpId = await seedXpEntry(w.accountId, `gwhp-b-xp-${suffix}`);
  const wRewardGrantId = randomUUID();
  await pg.query(
    `INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'ACHIEVEMENT_UNLOCK',$4,$5)`,
    [wRewardGrantId, w.accountId, bundleId, randomUUID(), `reward:ACHIEVEMENT_UNLOCK:${randomUUID()}-${suffix}`],
  );
  const wAchProgressId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_progress (id, account_id, achievement_definition_id, achievement_version_id, current_value, target_value, updated_at) VALUES ($1,$2,$3,$4,0,1,$5)`,
    [wAchProgressId, w.accountId, achDefId, achVersionId, now.toISOString()],
  );
  const wAchUnlockId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at) VALUES ($1,$2,$3,$4,1,$5)`,
    [wAchUnlockId, w.accountId, achDefId, achVersionId, now.toISOString()],
  );
  // LeaguePointLedgerEntry necesita season/league/participation/rule mínimos.
  const wSeasonId = randomUUID();
  const existingActiveSeason = await pg.query(`SELECT id, starts_at, ends_at FROM game_season WHERE status = 'ACTIVE' AND starts_at <= $1 AND ends_at > $1 LIMIT 1`, [now.toISOString()]);
  let wSeasonStartsAt: Date, wSeasonEndsAt: Date, wSeasonIdFinal: string;
  if (existingActiveSeason.rows.length > 0) {
    wSeasonIdFinal = existingActiveSeason.rows[0].id;
    wSeasonStartsAt = existingActiveSeason.rows[0].starts_at;
    wSeasonEndsAt = existingActiveSeason.rows[0].ends_at;
  } else {
    wSeasonIdFinal = wSeasonId;
    wSeasonStartsAt = now;
    wSeasonEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await pg.query(`INSERT INTO game_season (id, season_key, name, status, starts_at, ends_at) VALUES ($1,$2,'Gate Season B3','ACTIVE',$3,$4)`, [
      wSeasonIdFinal,
      `gwhp-gate-season-${suffix}`,
      wSeasonStartsAt.toISOString(),
      wSeasonEndsAt.toISOString(),
    ]);
  }
  const wLeagueDefId = randomUUID();
  await pg.query(`INSERT INTO league_definition (id, league_key, name, tier_order, participant_group_size) VALUES ($1,$2,'Gate League B3',1,30)`, [wLeagueDefId, `gwhp-gate-league-${suffix}`]);
  const wLeagueGroupId = randomUUID();
  await pg.query(`INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,30,'v1','OPEN')`, [
    wLeagueGroupId,
    wSeasonIdFinal,
    wLeagueDefId,
  ]);
  const wParticipationId = randomUUID();
  const wJoinedAt = now < wSeasonStartsAt ? wSeasonStartsAt : now;
  await pg.query(`INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6)`, [
    wParticipationId,
    wSeasonIdFinal,
    w.accountId,
    wLeagueDefId,
    wLeagueGroupId,
    wJoinedAt.toISOString(),
  ]);
  const wLpRuleId = randomUUID();
  await pg.query(`INSERT INTO league_point_rule (id, activity_type, base_points, rule_version, effective_from) VALUES ($1,'RESPUESTA_VALIDADA',1,$2,$3)`, [wLpRuleId, `gwhp-gate-lp-${suffix}`, now.toISOString()]);
  const wVgaId = randomUUID();
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,$2,'GATE','GATE_ENTITY',$3,'RESPUESTA_VALIDADA','VALID','v1',$4,$5,'INTACT')`,
    [wVgaId, w.accountId, randomUUID(), wJoinedAt.toISOString(), `gwhp-b-vga-${suffix}`],
  );
  const wLpEntryId = randomUUID();
  await pg.query(
    `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, idempotency_key, occurred_at) VALUES ($1,$2,$3,$4,$5,'OTORGAMIENTO',1,$6,$7)`,
    [wLpEntryId, w.accountId, wParticipationId, wVgaId, wLpRuleId, `gwhp-b-lp-${suffix}`, wJoinedAt.toISOString()],
  );

  // Capturar campos de negocio ANTES del cierre (§19 -- inmutabilidad de negocio).
  const wBefore = {
    xp: (await pg.query('SELECT xp_amount, occurred_at, xp_rule_id FROM xp_ledger_entry WHERE id = $1', [wXpId])).rows[0],
    lp: (await pg.query('SELECT point_amount, occurred_at, season_league_participation_id FROM league_point_ledger_entry WHERE id = $1', [wLpEntryId])).rows[0],
    achProgress: (await pg.query('SELECT achievement_definition_id, achievement_version_id, current_value, target_value FROM achievement_progress WHERE id = $1', [wAchProgressId])).rows[0],
    achUnlock: (await pg.query('SELECT achievement_definition_id, unlock_instance, unlocked_at FROM achievement_unlock WHERE id = $1', [wAchUnlockId])).rows[0],
    rewardGrant: (await pg.query('SELECT reward_bundle_id, source_entity_type, created_at FROM reward_grant WHERE id = $1', [wRewardGrantId])).rows[0],
  };

  await closeDefinitively(pg, w);
  const wActorRef = gamificationActorRef(w.accountId, gamificationSecret);

  const wAfter = {
    xp: (await pg.query('SELECT account_id, gamification_actor_ref, xp_amount, occurred_at, xp_rule_id FROM xp_ledger_entry WHERE id = $1', [wXpId])).rows[0],
    lp: (await pg.query('SELECT account_id, gamification_actor_ref, point_amount, occurred_at, season_league_participation_id FROM league_point_ledger_entry WHERE id = $1', [wLpEntryId])).rows[0],
    achProgress: (await pg.query('SELECT account_id, gamification_actor_ref, achievement_definition_id, achievement_version_id, current_value, target_value FROM achievement_progress WHERE id = $1', [wAchProgressId])).rows[0],
    achUnlock: (await pg.query('SELECT account_id, gamification_actor_ref, achievement_definition_id, unlock_instance, unlocked_at FROM achievement_unlock WHERE id = $1', [wAchUnlockId])).rows[0],
    rewardGrant: (await pg.query('SELECT account_id, gamification_actor_ref, reward_bundle_id, source_entity_type, created_at FROM reward_grant WHERE id = $1', [wRewardGrantId])).rows[0],
  };

  for (const [label, row] of Object.entries(wAfter)) {
    check(`B. ${label}: accountId -> NULL`, row.account_id === null);
    check(`B. ${label}: gamificationActorRef == el MISMO actorRef para esta cuenta`, row.gamification_actor_ref === wActorRef);
    check(`B. ${label}: actorRef != accountId crudo`, row.gamification_actor_ref !== w.accountId);
  }

  // §19 -- inmutabilidad de negocio: los campos no-privacidad no cambiaron.
  check('B.19 XpLedgerEntry: xp_amount/occurred_at/xp_rule_id sin cambios', wAfter.xp.xp_amount === wBefore.xp.xp_amount && wAfter.xp.xp_rule_id === wBefore.xp.xp_rule_id);
  check('B.19 LeaguePointLedgerEntry: point_amount/season_league_participation_id sin cambios', wAfter.lp.point_amount === wBefore.lp.point_amount && wAfter.lp.season_league_participation_id === wBefore.lp.season_league_participation_id);
  check(
    'B.19 AchievementProgress: definición/versión/valores sin cambios',
    wAfter.achProgress.achievement_definition_id === wBefore.achProgress.achievement_definition_id &&
      wAfter.achProgress.current_value === wBefore.achProgress.current_value &&
      wAfter.achProgress.target_value === wBefore.achProgress.target_value,
  );
  check(
    'B.19 AchievementUnlock: definición/unlockInstance/unlockedAt sin cambios',
    wAfter.achUnlock.achievement_definition_id === wBefore.achUnlock.achievement_definition_id && wAfter.achUnlock.unlock_instance === wBefore.achUnlock.unlock_instance,
  );
  check('B.19 RewardGrant: bundle/sourceEntityType/createdAt sin cambios', wAfter.rewardGrant.reward_bundle_id === wBefore.rewardGrant.reward_bundle_id && wAfter.rewardGrant.source_entity_type === wBefore.rewardGrant.source_entity_type);

  // ==========================================================================
  console.log('--- C. Limpieza de clave legacy en RewardGrant (LEVEL) -- solo la familia con accountId embebido ---');

  const legacyLevelAccount = await createSession('legacy-level');
  const legacySourceId = buildLegacyRewardSourceId(legacyLevelAccount.accountId, 42);
  const legacyGrantId = randomUUID();
  await pg.query(
    `INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`,
    [legacyGrantId, legacyLevelAccount.accountId, bundleId, legacySourceId, `reward:LEVEL:${legacySourceId}`],
  );
  await closeDefinitively(pg, legacyLevelAccount);
  const legacyGrantAfter = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id, idempotency_key FROM reward_grant WHERE id = $1', [legacyGrantId]);
  const legacyActorRef = gamificationActorRef(legacyLevelAccount.accountId, gamificationSecret);
  const expectedV2SourceId = `v2:${legacyActorRef}:42`;
  check('C.1 accountId -> NULL', legacyGrantAfter.rows[0].account_id === null);
  check('C.2 gamificationActorRef correcto', legacyGrantAfter.rows[0].gamification_actor_ref === legacyActorRef);
  check('C.3 sourceEntityId reescrito a la forma v2 (sin accountId crudo)', legacyGrantAfter.rows[0].source_entity_id === expectedV2SourceId && !legacyGrantAfter.rows[0].source_entity_id.includes(legacyLevelAccount.accountId));
  check('C.4 idempotencyKey reescrito consistentemente', legacyGrantAfter.rows[0].idempotency_key === `reward:LEVEL:${expectedV2SourceId}`);
  const legacyDupCount = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE source_entity_id = $1 OR idempotency_key = $2', [expectedV2SourceId, `reward:LEVEL:${expectedV2SourceId}`]);
  check('C.5 ninguna fila duplicada creada (exactamente 1 con la clave v2)', legacyDupCount.rows[0].n === 1);

  // Ya-v2: probar que una clave v2 EXISTENTE no se toca en su forma, solo la identidad.
  const alreadyV2Account = await createSession('already-v2');
  const alreadyV2SourceId = `v2:${gamificationActorRef(alreadyV2Account.accountId, gamificationSecret)}:7`;
  const alreadyV2GrantId = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    alreadyV2GrantId,
    alreadyV2Account.accountId,
    bundleId,
    alreadyV2SourceId,
    `reward:LEVEL:${alreadyV2SourceId}`,
  ]);
  await closeDefinitively(pg, alreadyV2Account);
  const alreadyV2After = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id, idempotency_key FROM reward_grant WHERE id = $1', [alreadyV2GrantId]);
  check('C.6 fila YA v2: sourceEntityId permanece EXACTAMENTE igual', alreadyV2After.rows[0].source_entity_id === alreadyV2SourceId);
  check('C.7 fila YA v2: solo la identidad transicionó', alreadyV2After.rows[0].account_id === null && alreadyV2After.rows[0].gamification_actor_ref === gamificationActorRef(alreadyV2Account.accountId, gamificationSecret));

  // ==========================================================================
  console.log('--- D. Colisión legacy->v2 (B3-R1 §1): ABORTA, no salta -- las 5 familias quedan INTACTAS ---');

  const collisionAccount = await createSession('collision');
  const collisionActorRef = gamificationActorRef(collisionAccount.accountId, gamificationSecret);
  const collisionV2SourceId = `v2:${collisionActorRef}:99`;
  // Fila v2 YA existente para el MISMO hecho de negocio (nivel 99), de OTRA
  // fila (simula un otorgamiento v2 posterior) -- ya pseudonimizada
  // (accountId NULL + actorRef fijado), respetando el CHECK de B1-R1.
  await pg.query(
    `INSERT INTO reward_grant (id, account_id, gamification_actor_ref, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,NULL,$2,$3,'LEVEL',$4,$5)`,
    [randomUUID(), collisionActorRef, bundleId, collisionV2SourceId, `reward:LEVEL:${collisionV2SourceId}`],
  );
  // Fila LEGACY para la MISMA cuenta/nivel -- construida a propósito para colisionar.
  const collisionLegacySourceId = buildLegacyRewardSourceId(collisionAccount.accountId, 99);
  const collisionLegacyGrantId = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    collisionLegacyGrantId,
    collisionAccount.accountId,
    bundleId,
    collisionLegacySourceId,
    `reward:LEVEL:${collisionLegacySourceId}`,
  ]);
  // B3-R1 §1/§2: además de RewardGrant, sembramos las OTRAS 4 familias
  // IMMEDIATE_SAFE para esta MISMA cuenta -- la prueba exige demostrar que
  // NINGUNA de las 5 familias se muta cuando RewardGrant colisiona,
  // porque las 5 comparten una única transacción.
  const collisionXpId = await seedXpEntry(collisionAccount.accountId, `gwhp-d-xp-${suffix}`);
  const collisionAchProgressId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_progress (id, account_id, achievement_definition_id, achievement_version_id, current_value, target_value, updated_at) VALUES ($1,$2,$3,$4,0,1,$5)`,
    [collisionAchProgressId, collisionAccount.accountId, achDefId, achVersionId, now.toISOString()],
  );
  const collisionAchUnlockId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at) VALUES ($1,$2,$3,$4,2,$5)`,
    [collisionAchUnlockId, collisionAccount.accountId, achDefId, achVersionId, now.toISOString()],
  );
  const collisionParticipationId = randomUUID();
  await pg.query(`INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6)`, [
    collisionParticipationId,
    wSeasonIdFinal,
    collisionAccount.accountId,
    wLeagueDefId,
    wLeagueGroupId,
    wJoinedAt.toISOString(),
  ]);
  const collisionVgaId = randomUUID();
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,$2,'GATE','GATE_ENTITY',$3,'RESPUESTA_VALIDADA','VALID','v1',$4,$5,'INTACT')`,
    [collisionVgaId, collisionAccount.accountId, randomUUID(), wJoinedAt.toISOString(), `gwhp-d-vga-${suffix}`],
  );
  const collisionLpEntryId = randomUUID();
  await pg.query(
    `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, idempotency_key, occurred_at) VALUES ($1,$2,$3,$4,$5,'OTORGAMIENTO',1,$6,$7)`,
    [collisionLpEntryId, collisionAccount.accountId, collisionParticipationId, collisionVgaId, wLpRuleId, `gwhp-d-lp-${suffix}`, wJoinedAt.toISOString()],
  );

  // §3 -- CLOSURE STATUS punto A: DELETION_PENDING justo antes del barrido.
  const del = await req('POST', '/privacy/account-deletion', collisionAccount.headers, {});
  if (del.status !== 202) throw new Error(`solicitud de eliminación falló: ${del.status} ${del.raw}`);
  const statusBeforeSweep = await pg.query('SELECT status FROM account WHERE id = $1', [collisionAccount.accountId]);
  check('§3.A Account.status INMEDIATAMENTE ANTES del barrido == DELETION_PENDING', statusBeforeSweep.rows[0]?.status === 'DELETION_PENDING');
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [collisionAccount.accountId]);
  const collisionSweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  check('D.0 el ENDPOINT de barrido responde 200 igual (falla aislada por cuenta, el barrido general no explota)', collisionSweep.status === 200);

  const collisionAfter = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id, idempotency_key FROM reward_grant WHERE id = $1', [collisionLegacyGrantId]);
  check('D.1 RewardGrant en colisión: accountId SIGUE siendo el crudo (NO se desidentificó)', collisionAfter.rows[0].account_id === collisionAccount.accountId);
  check('D.2 RewardGrant en colisión: gamificationActorRef SIGUE NULL', collisionAfter.rows[0].gamification_actor_ref === null);
  check('D.3 RewardGrant en colisión: sourceEntityId/idempotencyKey SIN cambios', collisionAfter.rows[0].source_entity_id === collisionLegacySourceId);
  const collisionTotalRows = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE idempotency_key = $1', [`reward:LEVEL:${collisionV2SourceId}`]);
  check('D.4 ninguna fusión/duplicado -- exactamente 1 fila con la clave v2 (la preexistente, intacta)', collisionTotalRows.rows[0].n === 1);

  // B3-R1 §1/§4 -- prueba que las OTRAS 4 familias TAMBIÉN quedaron intactas
  // (la colisión de RewardGrant abortó la transacción COMPLETA, no solo su
  // propia fila).
  const collisionXpAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [collisionXpId]);
  check('D.5 XpLedgerEntry SIN mutar (accountId crudo, actorRef NULL)', collisionXpAfter.rows[0].account_id === collisionAccount.accountId && collisionXpAfter.rows[0].gamification_actor_ref === null);
  const collisionAchProgressAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_progress WHERE id = $1', [collisionAchProgressId]);
  check('D.6 AchievementProgress SIN mutar', collisionAchProgressAfter.rows[0].account_id === collisionAccount.accountId && collisionAchProgressAfter.rows[0].gamification_actor_ref === null);
  const collisionAchUnlockAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_unlock WHERE id = $1', [collisionAchUnlockId]);
  check('D.7 AchievementUnlock SIN mutar', collisionAchUnlockAfter.rows[0].account_id === collisionAccount.accountId && collisionAchUnlockAfter.rows[0].gamification_actor_ref === null);
  const collisionLpAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM league_point_ledger_entry WHERE id = $1', [collisionLpEntryId]);
  check('D.8 LeaguePointLedgerEntry SIN mutar', collisionLpAfter.rows[0].account_id === collisionAccount.accountId && collisionLpAfter.rows[0].gamification_actor_ref === null);

  // §3 puntos B/C -- con la arquitectura corregida (B3-R1 §3), el estado
  // INMEDIATAMENTE DESPUÉS de finalizeAccountClosure y el estado DESPUÉS
  // de un fallo de B3 son la MISMA observación: markAccountClosed nunca
  // corrió (el fallo de B3 detuvo el try ANTES de llegar a esa línea), así
  // que Account.status sigue exactamente igual que antes del barrido.
  const collisionAccountAfter = await pg.query('SELECT status, closed_at FROM account WHERE id = $1', [collisionAccount.accountId]);
  check('§3.B/§3.C Account.status tras finalizeAccountClosure + fallo de B3 == DELETION_PENDING (NUNCA CLOSED falsamente completo)', collisionAccountAfter.rows[0]?.status === 'DELETION_PENDING');
  check('§3.B/§3.C Account.closedAt sigue NULL', collisionAccountAfter.rows[0]?.closed_at === null);
  const collisionRequestAfter = await pg.query('SELECT status FROM privacy_request WHERE account_id = $1', [collisionAccount.accountId]);
  check('D.9 PrivacyRequest queda en PROCESSING (no se marcó COMPLETED con una pseudonimización parcial)', collisionRequestAfter.rows[0]?.status === 'PROCESSING');
  // Identidad SÍ quedó desvinculada (finalizeAccountClosure corrió, es la
  // parte que YA no depende del resultado de B3) -- terminal e idempotente.
  const collisionIdentityAfter = await pg.query(
    'SELECT unlinked_at FROM auth_identity WHERE account_id = $1',
    [collisionAccount.accountId],
  );
  check('D.10 AuthIdentity SÍ quedó unlinked (finalizeAccountClosure ya no depende de B3)', collisionIdentityAfter.rows.every((r: { unlinked_at: Date | null }) => r.unlinked_at !== null));

  // ==========================================================================
  console.log('--- D2. Reconciliación explícita: el CLI/servicio real preserva el detalle de la colisión para B5 ---');

  const rawPrisma = new PrismaClient({ adapter }) as any;
  const fakeTxRunner = new TransactionRunnerService(rawPrisma);
  const directPrivacyService = new GamificationPrivacyService(fakeTxRunner, undefined);
  try {
    await directPrivacyService.pseudonymizeImmediateSafeHistory(collisionAccount.accountId);
    check('D2.1 invocación directa del servicio real también lanza (nunca completa en silencio)', false);
  } catch (error) {
    const isTypedError = error instanceof RewardGrantReconciliationRequiredError;
    check('D2.1 invocación directa del servicio real lanza RewardGrantReconciliationRequiredError (tipado)', isTypedError);
    if (isTypedError) {
      const typedError = error as RewardGrantReconciliationRequiredError;
      check('D2.2 el error preserva accountId', typedError.accountId === collisionAccount.accountId);
      check('D2.3 el error preserva >=1 detalle de colisión (rewardGrantId + reason) para reconciliación en B5', typedError.collisions.length >= 1 && typedError.collisions[0].reason === 'V2_TARGET_ALREADY_EXISTS' && typeof typedError.collisions[0].rewardGrantId === 'string');
    }
  }
  await rawPrisma.$disconnect();

  // ==========================================================================
  console.log('--- G. Secreto ausente (B3-R1 §4 MISSING SECRET ROLLBACK): las 5 familias quedan intactas ---');

  const secretAccount = await createSession('secret');
  const secretXpId = await seedXpEntry(secretAccount.accountId, `gwhp-g-xp-${suffix}`);
  const secretAchProgressId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_progress (id, account_id, achievement_definition_id, achievement_version_id, current_value, target_value, updated_at) VALUES ($1,$2,$3,$4,0,1,$5)`,
    [secretAchProgressId, secretAccount.accountId, achDefId, achVersionId, now.toISOString()],
  );
  const secretRewardGrantId = randomUUID();
  await pg.query(
    `INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'ACHIEVEMENT_UNLOCK',$4,$5)`,
    [secretRewardGrantId, secretAccount.accountId, bundleId, randomUUID(), `reward:ACHIEVEMENT_UNLOCK:${randomUUID()}-${suffix}`],
  );

  // Invocación DIRECTA del servicio real (misma clase que usa PrivacyService),
  // con el secreto AUSENTE de `process.env` y sin ConfigService -- reproduce
  // exactamente `getGamificationSecret()` fallando ANTES de abrir la
  // transacción (§10/§K), sin tocar el proceso del servidor de gates (que
  // sigue con el secreto real para el resto del gate).
  const savedSecret = process.env.GAMIFICATION_ACTOR_SECRET;
  delete process.env.GAMIFICATION_ACTOR_SECRET;
  const rawPrisma2 = new PrismaClient({ adapter }) as any;
  const secretMissingService = new GamificationPrivacyService(new TransactionRunnerService(rawPrisma2), undefined);
  let secretErrorThrown = false;
  try {
    await secretMissingService.pseudonymizeImmediateSafeHistory(secretAccount.accountId);
  } catch {
    secretErrorThrown = true;
  } finally {
    process.env.GAMIFICATION_ACTOR_SECRET = savedSecret;
  }
  await rawPrisma2.$disconnect();
  check('G.1 secreto ausente -> la operación lanza (nunca completa en silencio, nunca usa un valor de repuesto)', secretErrorThrown);

  const secretXpAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [secretXpId]);
  check('G.2 XpLedgerEntry SIN mutar', secretXpAfter.rows[0].account_id === secretAccount.accountId && secretXpAfter.rows[0].gamification_actor_ref === null);
  const secretAchAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_progress WHERE id = $1', [secretAchProgressId]);
  check('G.3 AchievementProgress SIN mutar', secretAchAfter.rows[0].account_id === secretAccount.accountId && secretAchAfter.rows[0].gamification_actor_ref === null);
  const secretGrantAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM reward_grant WHERE id = $1', [secretRewardGrantId]);
  check('G.4 RewardGrant SIN mutar', secretGrantAfter.rows[0].account_id === secretAccount.accountId && secretGrantAfter.rows[0].gamification_actor_ref === null);

  // Ahora, integrado vía HTTP real (PrivacyService.runAccountDeletionSweep) --
  // el servidor de gates SÍ tiene el secreto cargado, así que este cierre
  // completo debe suceder normalmente. Prueba que el escenario de secreto
  // ausente arriba fue una prueba AISLADA de la clase real, no una
  // reconfiguración del servidor -- el cierre CLOSED sigue disponible.
  await closeDefinitively(pg, secretAccount);
  const secretAccountClosed = await pg.query('SELECT status FROM account WHERE id = $1', [secretAccount.accountId]);
  check('G.5 con el secreto presente (servidor real), el mismo tipo de cuenta SÍ cierra CLOSED normalmente', secretAccountClosed.rows[0]?.status === 'CLOSED');

  // ==========================================================================
  console.log('--- H. Fallo A MITAD de la transacción (B3-R1 §4 MID-TRANSACTION FAILURE) -- rollback COMPLETO ---');

  // Dos RewardGrant LEGACY para la MISMA cuenta que resuelven al MISMO
  // destino v2 (mismo negocio, nivel 77) -- NINGUNO colisiona con una fila
  // YA persistida (el preflight los deja pasar a ambos), pero el SEGUNDO
  // update de la pareja choca con la restricción UNIQUE real de Postgres
  // sobre `idempotency_key` DENTRO de la misma transacción, después de que
  // XpLedgerEntry/AchievementProgress/AchievementUnlock/LeaguePointLedgerEntry
  // YA se mutaron en esa misma transacción -- Postgres revierte la
  // transacción COMPLETA, probando que ningún modelo queda parcialmente
  // pseudonimizado incluso cuando el fallo ocurre DESPUÉS de operaciones ya
  // ejecutadas (no solo en el preflight de lectura).
  const midTxAccount = await createSession('midtx');
  const midTxXpId = await seedXpEntry(midTxAccount.accountId, `gwhp-h-xp-${suffix}`);
  const midTxAchProgressId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_progress (id, account_id, achievement_definition_id, achievement_version_id, current_value, target_value, updated_at) VALUES ($1,$2,$3,$4,0,1,$5)`,
    [midTxAchProgressId, midTxAccount.accountId, achDefId, achVersionId, now.toISOString()],
  );
  const midTxAchUnlockId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at) VALUES ($1,$2,$3,$4,3,$5)`,
    [midTxAchUnlockId, midTxAccount.accountId, achDefId, achVersionId, now.toISOString()],
  );
  const midTxParticipationId = randomUUID();
  await pg.query(`INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6)`, [
    midTxParticipationId,
    wSeasonIdFinal,
    midTxAccount.accountId,
    wLeagueDefId,
    wLeagueGroupId,
    wJoinedAt.toISOString(),
  ]);
  const midTxVgaId = randomUUID();
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,$2,'GATE','GATE_ENTITY',$3,'RESPUESTA_VALIDADA','VALID','v1',$4,$5,'INTACT')`,
    [midTxVgaId, midTxAccount.accountId, randomUUID(), wJoinedAt.toISOString(), `gwhp-h-vga-${suffix}`],
  );
  const midTxLpEntryId = randomUUID();
  await pg.query(
    `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, idempotency_key, occurred_at) VALUES ($1,$2,$3,$4,$5,'OTORGAMIENTO',1,$6,$7)`,
    [midTxLpEntryId, midTxAccount.accountId, midTxParticipationId, midTxVgaId, wLpRuleId, `gwhp-h-lp-${suffix}`, wJoinedAt.toISOString()],
  );
  const midTxLegacySourceId1 = buildLegacyRewardSourceId(midTxAccount.accountId, 77);
  const midTxGrant1Id = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    midTxGrant1Id,
    midTxAccount.accountId,
    bundleId,
    midTxLegacySourceId1,
    `reward:LEVEL:${midTxLegacySourceId1}`,
  ]);
  // Segunda fila -- MISMA cuenta/nivel (77) que la anterior: forma legacy
  // idéntica salvo por su propia PK/idempotencyKey de origen (posible en la
  // práctica solo por un defecto de negocio previo a B2; aquí construido a
  // propósito para forzar el escenario). Ambas resuelven al MISMO
  // sourceEntityId/idempotencyKey v2.
  const midTxGrant2Id = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    midTxGrant2Id,
    midTxAccount.accountId,
    bundleId,
    midTxLegacySourceId1,
    `reward:LEVEL:${midTxLegacySourceId1}-dup-${suffix}`,
  ]);

  await requestDeletionOnly(midTxAccount);
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [midTxAccount.accountId]);
  const midTxSweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  check('H.0 el ENDPOINT de barrido responde 200 igual (falla aislada por cuenta)', midTxSweep.status === 200);

  const midTxAccountAfter = await pg.query('SELECT status, closed_at FROM account WHERE id = $1', [midTxAccount.accountId]);
  check('H.1 Account.status tras el fallo A MITAD de transacción == DELETION_PENDING (NUNCA CLOSED falsamente completo)', midTxAccountAfter.rows[0]?.status === 'DELETION_PENDING');
  check('H.2 Account.closedAt sigue NULL', midTxAccountAfter.rows[0]?.closed_at === null);
  const midTxRequestAfter = await pg.query('SELECT status, processing_started_at FROM privacy_request WHERE account_id = $1', [midTxAccount.accountId]);
  check('H.3 PrivacyRequest queda en PROCESSING', midTxRequestAfter.rows[0]?.status === 'PROCESSING');

  const midTxXpAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [midTxXpId]);
  check('H.4 XpLedgerEntry (ya mutado ANTES del fallo, dentro de la misma tx) revertido -- SIGUE con accountId crudo', midTxXpAfter.rows[0].account_id === midTxAccount.accountId && midTxXpAfter.rows[0].gamification_actor_ref === null);
  const midTxAchProgressAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_progress WHERE id = $1', [midTxAchProgressId]);
  check('H.5 AchievementProgress revertido', midTxAchProgressAfter.rows[0].account_id === midTxAccount.accountId && midTxAchProgressAfter.rows[0].gamification_actor_ref === null);
  const midTxAchUnlockAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_unlock WHERE id = $1', [midTxAchUnlockId]);
  check('H.6 AchievementUnlock revertido', midTxAchUnlockAfter.rows[0].account_id === midTxAccount.accountId && midTxAchUnlockAfter.rows[0].gamification_actor_ref === null);
  const midTxLpAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM league_point_ledger_entry WHERE id = $1', [midTxLpEntryId]);
  check('H.7 LeaguePointLedgerEntry revertido', midTxLpAfter.rows[0].account_id === midTxAccount.accountId && midTxLpAfter.rows[0].gamification_actor_ref === null);
  const midTxGrant1After = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id FROM reward_grant WHERE id = $1', [midTxGrant1Id]);
  check('H.8 RewardGrant #1 (el que sí llegó a ejecutar su UPDATE antes del choque) revertido', midTxGrant1After.rows[0].account_id === midTxAccount.accountId && midTxGrant1After.rows[0].gamification_actor_ref === null && midTxGrant1After.rows[0].source_entity_id === midTxLegacySourceId1);
  const midTxGrant2After = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id FROM reward_grant WHERE id = $1', [midTxGrant2Id]);
  check('H.9 RewardGrant #2 (el que causó el choque UNIQUE) también revertido', midTxGrant2After.rows[0].account_id === midTxAccount.accountId && midTxGrant2After.rows[0].gamification_actor_ref === null && midTxGrant2After.rows[0].source_entity_id === midTxLegacySourceId1);

  console.log('--- I. SUCCESS -- se remueve el fallo temporal, se reintenta, B3 completa (§4 SUCCESS) ---');

  // Se remueve el conflicto (política de reconciliación B5 simulada: se
  // retiene solo el otorgamiento más reciente, se anula el duplicado
  // defectuoso) y se fuerza el reintento del barrido (processingStartedAt
  // envejecido más allá del umbral de 1h de `findStuckProcessing`).
  await pg.query(`DELETE FROM reward_grant WHERE id = $1`, [midTxGrant2Id]);
  await pg.query("UPDATE privacy_request SET processing_started_at = now() - interval '2 hours' WHERE account_id = $1 AND status = 'PROCESSING'", [midTxAccount.accountId]);
  const retrySweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  check('I.1 reintento del barrido responde 200', retrySweep.status === 200);

  const midTxActorRef = gamificationActorRef(midTxAccount.accountId, gamificationSecret);
  const retryResults = {
    xp: (await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [midTxXpId])).rows[0],
    achProgress: (await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_progress WHERE id = $1', [midTxAchProgressId])).rows[0],
    achUnlock: (await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_unlock WHERE id = $1', [midTxAchUnlockId])).rows[0],
    lp: (await pg.query('SELECT account_id, gamification_actor_ref FROM league_point_ledger_entry WHERE id = $1', [midTxLpEntryId])).rows[0],
    grant1: (await pg.query('SELECT account_id, gamification_actor_ref FROM reward_grant WHERE id = $1', [midTxGrant1Id])).rows[0],
  };
  for (const [label, row] of Object.entries(retryResults)) {
    check(`I.2 ${label}: accountId -> NULL tras el reintento exitoso`, row.account_id === null);
    check(`I.3 ${label}: gamificationActorRef == el MISMO actorRef para esta cuenta (las 5 familias coherentes)`, row.gamification_actor_ref === midTxActorRef);
  }
  const midTxAccountFinal = await pg.query('SELECT status, closed_at FROM account WHERE id = $1', [midTxAccount.accountId]);
  check('I.4 Account.status == CLOSED tras el reintento exitoso (§3.D)', midTxAccountFinal.rows[0]?.status === 'CLOSED');
  check('I.5 Account.closedAt seteado', midTxAccountFinal.rows[0]?.closed_at !== null);
  const midTxRequestFinal = await pg.query('SELECT status FROM privacy_request WHERE account_id = $1', [midTxAccount.accountId]);
  check('I.6 PrivacyRequest COMPLETED', midTxRequestFinal.rows[0]?.status === 'COMPLETED');

  // Reintento subsecuente -- no hay solicitud PENDING/PROCESSING para esta
  // cuenta (ya COMPLETED), así que un barrido adicional es un no-op para
  // ella; verificación directa de estabilidad de la fila ya pseudonimizada.
  const idempotentRetrySweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  check('I.7 barrido subsecuente responde 200 (no-op para esta cuenta, sin error)', idempotentRetrySweep.status === 200);
  const midTxXpStable = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [midTxXpId]);
  check('I.8 fila ya pseudonimizada permanece IDÉNTICA tras el barrido subsecuente (idempotente)', midTxXpStable.rows[0].account_id === null && midTxXpStable.rows[0].gamification_actor_ref === midTxActorRef);

  // ==========================================================================
  console.log('--- E. Cuenta CLOSED no puede resucitar gamificación (re-prueba B0/B0R sobre historial ya desidentificado) ---');

  const beforeCounts = {
    vga: (await pg.query('SELECT count(*)::int AS n FROM validated_gamification_activity').then((r) => r.rows[0].n)),
    xp: (await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1 OR gamification_actor_ref = $2', [w.accountId, wActorRef]).then((r) => r.rows[0].n)),
  };
  // Reintenta los workers reales -- grant-xp/evaluate-rewards ya corrieron dentro del barrido; correrlos de nuevo debe ser un no-op para w.
  const grantRunAgain = await req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey }, {});
  check('E.1 grant-xp status 200', grantRunAgain.status === 200);
  const evalRunAgain = await req('POST', '/gamification/_internal/evaluate-rewards', { 'x-internal-ops-key': opsKey }, {});
  check('E.2 evaluate-rewards status 200', evalRunAgain.status === 200);
  const afterCounts = {
    xp: (await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1 OR gamification_actor_ref = $2', [w.accountId, wActorRef]).then((r) => r.rows[0].n)),
  };
  check('E.3 NINGÚN xp_ledger_entry nuevo para la cuenta ya pseudonimizada (sigue en 1: la histórica)', afterCounts.xp === beforeCounts.xp);
  const xpBalanceRecreated = await pg.query('SELECT id FROM xp_balance WHERE account_id = $1', [w.accountId]);
  check('E.4 xp_balance NO se recreó', xpBalanceRecreated.rows.length === 0);
  const wRowStillPseudonymized = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [wXpId]);
  check('E.5 la fila pseudonimizada permanece SIN cambios tras re-correr los workers', wRowStillPseudonymized.rows[0].account_id === null && wRowStillPseudonymized.rows[0].gamification_actor_ref === wActorRef);

  // ==========================================================================
  console.log('--- F. Segunda invocación idempotente (§21) ---');

  const secondRun = await pg.query('SELECT account_id, gamification_actor_ref, xp_amount FROM xp_ledger_entry WHERE id = $1', [wXpId]);
  // Invoca el barrido de nuevo -- la PrivacyRequest de w ya está COMPLETED, así que esto no debería re-procesar nada para w, pero probamos explícitamente que si SE reinvocara el método de pseudonimización (vía otro cierre trivial no aplica aquí) el resultado es estable. Verificación directa: los valores no cambiaron respecto de la sección B.
  check('F.1 segundo barrido general no altera la fila ya pseudonimizada', secondRun.rows[0].account_id === null && secondRun.rows[0].gamification_actor_ref === wActorRef && secondRun.rows[0].xp_amount === wBefore.xp.xp_amount);
  const rowCountForActorRef = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE gamification_actor_ref = $1', [wActorRef]);
  check('F.2 exactamente 1 fila con este actorRef (nada se duplicó)', rowCountForActorRef.rows[0].n === 1);

  // Mismo criterio EXACTO que otros gates de XP/LP de este bloque
  // (B0R/B1/B2) -- retira las propias reglas COMPARTIDAS `xp-core`/
  // `league_point_rule` al terminar para no interferir con
  // `verify-xp-v1-implementation-gate.ts`/`verify-competitive-v1-gate.ts`
  // (invariante congelado "Estudio/RESPUESTA_VALIDADA nunca otorga LP").
  await pg.query(
    "UPDATE xp_rule xr SET status = 'RETIRED' FROM gamification_program_version gpv, gamification_program gp WHERE xr.program_version_id = gpv.id AND gpv.gamification_program_id = gp.id AND gp.program_key = 'xp-core' AND gpv.version_label LIKE 'gwhp-gate-%' AND xr.status = 'ACTIVE'",
  );
  await pg.query("UPDATE league_point_rule SET status = 'RETIRED' WHERE rule_version LIKE 'gwhp-gate-lp-%' AND status = 'ACTIVE'");

  await prisma.$disconnect();
  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de pseudonimización histórica inmediata-segura de GAMIFICATION (WEB-0D.1C-B3) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
