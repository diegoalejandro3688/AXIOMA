// WEB-0D.1C-B4 -- pseudonimización de los 2 modelos que B3 difirió:
// ValidatedGamificationActivity (MODELO A) y SeasonLeagueParticipation
// (MODELO B). HTTP real contra /privacy (solicitud + barrido real) +
// invocación directa de los servicios reales (GamificationPrivacyService,
// LeaderboardFinalizationService) para los escenarios que no tienen
// endpoint HTTP -- mismo patrón híbrido que los gates de B3/B3-R1.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { assertGateDb, finalizeStaleGateSeasons, retireStaleGateLeagues } from './gate-db-safety';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { GamificationPrivacyService, ValidatedActivityReconciliationRequiredError } from '../src/gamification/gamification-privacy.service';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { LeaderboardDefinitionRepository } from '../src/gamification/leaderboard-definition.repository';
import { LeaderboardEntryRepository } from '../src/gamification/leaderboard-entry.repository';
import { LeaderboardSnapshotRepository } from '../src/gamification/leaderboard-snapshot.repository';
import { LeaderboardSnapshotEntryRepository } from '../src/gamification/leaderboard-snapshot-entry.repository';
import { LeaderboardCalculationService } from '../src/gamification/leaderboard-calculation.service';
import { LeaderboardFinalizationService } from '../src/gamification/leaderboard-finalization.service';
import { gamificationActorRef } from '../src/gamification/gamification-actor-ref';
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// `POST /auth/session` tiene su propio @Throttle estricto (10/60s, NFR-SEC-007)
// -- distinto del límite general (300/60s). Este gate crea 11 sesiones; sin
// espaciarlas se dispara el 429 de ese endpoint específico. 7s entre
// llamadas mantiene cualquier ventana de 60s por debajo de 10.
let sessionCount = 0;
async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  if (sessionCount > 0 && sessionCount % 9 === 0) await sleep(61_000);
  else if (sessionCount > 0) await sleep(7_000);
  sessionCount++;
  const uid = `b4-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return { accountId: session.body.accountId as string, headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId } };
}

async function closeDefinitively(pg: Client, session: { accountId: string; headers: Record<string, string> }): Promise<void> {
  const del = await req('POST', '/privacy/account-deletion', session.headers, {});
  if (del.status !== 202) throw new Error(`solicitud de eliminación falló para ${session.accountId}: ${del.status} ${del.raw}`);
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [session.accountId]);
  const sweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  if (sweep.status !== 200) throw new Error(`barrido de cierre falló: ${sweep.status} ${sweep.raw}`);
}

function isoNow() {
  return new Date().toISOString();
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);
  // Higiene entre corridas -- mismo criterio que otros gates de este bloque.
  await finalizeStaleGateSeasons(pg);
  await retireStaleGateLeagues(pg);

  const now = new Date();
  const suffix = `${Date.now()}`;
  const gamificationSecret = process.env.GAMIFICATION_ACTOR_SECRET ?? '';
  check('preflight: GAMIFICATION_ACTOR_SECRET presente', gamificationSecret.length > 0);

  const txRunner = new TransactionRunnerService(prisma);
  const privacyService = new GamificationPrivacyService(txRunner, undefined);

  async function seedActivity(accountId: string, opts: { activityType?: string; deduplicationKey?: string; occurredAt?: Date } = {}): Promise<string> {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
       VALUES ($1,$2,'GATE','GATE_ENTITY',$3,$4,'VALID','v1',$5,$6,'INTACT')`,
      [id, accountId, randomUUID(), opts.activityType ?? 'RESPUESTA_VALIDADA', (opts.occurredAt ?? now).toISOString(), opts.deduplicationKey ?? `b4-gate-vga-${randomUUID()}`],
    );
    return id;
  }

  // ==========================================================================
  console.log('--- A/B/C/D/E. MODELO A -- ValidatedGamificationActivity: solo CLOSED se pseudonimiza, cualquier estado de "drenado" ---');

  // A/B -- cuenta CLOSED con UNA actividad NO otorgada (sin XpLedgerEntry) y
  // OTRA YA otorgada (con XpLedgerEntry) -- B4 pseudonimiza AMBAS: una vez
  // cerrado el punto ciego de `findPendingGrant` (account_id IS NOT NULL),
  // el estado de "drenado" per-fila deja de ser relevante -- la cuenta
  // CLOSED ya excluye a AMBAS de todo descubrimiento futuro, con o sin B4
  // (ver el reporte de B4 §C: no existe una señal persistida confiable de
  // "drenado LP" para construir la distinción A/B originalmente prevista;
  // la condición real y suficiente es Account.status=CLOSED + el hardening
  // de la consulta).
  const closedA = await createSession('closed-a');
  const pendingActivityId = await seedActivity(closedA.accountId); // nunca se le otorga XP -- queda "pendiente" a propósito
  const grantedActivityId = await seedActivity(closedA.accountId);
  await pg.query(`INSERT INTO xp_grant_attempt (id, validated_activity_id, attempts, last_outcome, last_attempted_at, next_eligible_at) VALUES ($1,$2,0,'NO_ACTIVE_RULE',$3,$4)`, [randomUUID(), pendingActivityId, now.toISOString(), now.toISOString()]);
  await closeDefinitively(pg, closedA);

  const pendingAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM validated_gamification_activity WHERE id = $1', [pendingActivityId]);
  const grantedAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM validated_gamification_activity WHERE id = $1', [grantedActivityId]);
  const closedAActorRef = gamificationActorRef(closedA.accountId, gamificationSecret);
  check('A. actividad NO otorgada (pendiente de XP) de cuenta CLOSED: SÍ pseudonimizada (accountId->NULL)', pendingAfter.rows[0].account_id === null);
  check('A. actividad NO otorgada: gamificationActorRef correcto', pendingAfter.rows[0].gamification_actor_ref === closedAActorRef);
  check('B. actividad YA otorgada de cuenta CLOSED: SÍ pseudonimizada', grantedAfter.rows[0].account_id === null && grantedAfter.rows[0].gamification_actor_ref === closedAActorRef);

  // C -- cuenta ACTIVA con actividad "drenada" (aunque nunca se otorgó,
  // aquí basta con que exista) -- intacta.
  const active = await createSession('active');
  const activeActivityId = await seedActivity(active.accountId);
  const activeAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM validated_gamification_activity WHERE id = $1', [activeActivityId]);
  check('C. cuenta ACTIVA: actividad SIGUE identificable (B4 nunca la toca)', activeAfter.rows[0].account_id === active.accountId && activeAfter.rows[0].gamification_actor_ref === null);

  // D -- DELETION_PENDING ordinario -- intacta.
  const pending = await createSession('pending');
  const pendingDel = await req('POST', '/privacy/account-deletion', pending.headers, {});
  if (pendingDel.status !== 202) throw new Error(`solicitud de eliminación falló: ${pendingDel.status}`);
  const pendingActivityId2 = await seedActivity(pending.accountId);
  const pendingAfter2 = await pg.query('SELECT account_id, gamification_actor_ref FROM validated_gamification_activity WHERE id = $1', [pendingActivityId2]);
  check('D. cuenta DELETION_PENDING ordinaria: actividad SIGUE identificable', pendingAfter2.rows[0].account_id === pending.accountId && pendingAfter2.rows[0].gamification_actor_ref === null);

  // E -- segunda invocación (idempotencia) -- ver también §28 más abajo.
  const rerun = await privacyService.pseudonymizeDrainedValidatedActivity(closedA.accountId);
  check('E. segunda invocación directa -- 0 filas nuevas mutadas (ya todas pseudonimizadas)', rerun.validatedGamificationActivity === 0);
  const grantedStable = await pg.query('SELECT account_id, gamification_actor_ref FROM validated_gamification_activity WHERE id = $1', [grantedActivityId]);
  check('E. fila ya pseudonimizada permanece IDÉNTICA', grantedStable.rows[0].account_id === null && grantedStable.rows[0].gamification_actor_ref === closedAActorRef);

  // ==========================================================================
  console.log('--- 21. NO REDESCUBRIMIENTO: XP/LP/reward workers reales tras pseudonimizar ---');

  const xpCountBefore = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE validated_activity_id = $1', [pendingActivityId]);
  const grantXp = await req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey }, {});
  check('21.1 grant-xp responde 200 (nunca throw-loop)', grantXp.status === 200);
  const xpCountAfter = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE validated_activity_id = $1', [pendingActivityId]);
  check('21.2 NINGÚN xp_ledger_entry nuevo para la actividad pseudonimizada (sin resurrección)', xpCountAfter.rows[0].n === xpCountBefore.rows[0].n && xpCountAfter.rows[0].n === 0);
  const evalRewards = await req('POST', '/gamification/_internal/evaluate-rewards', { 'x-internal-ops-key': opsKey }, {});
  check('21.3 evaluate-rewards responde 200', evalRewards.status === 200);
  const stillPseudonymized = await pg.query('SELECT account_id, gamification_actor_ref FROM validated_gamification_activity WHERE id = $1', [pendingActivityId]);
  check('21.4 la fila permanece ESTABLE tras invocar los workers (sin retry loop, sin nuevo estado derivado)', stillPseudonymized.rows[0].account_id === null && stillPseudonymized.rows[0].gamification_actor_ref === closedAActorRef);
  const attemptStable = await pg.query('SELECT attempts FROM xp_grant_attempt WHERE validated_activity_id = $1', [pendingActivityId]);
  check('21.5 xp_grant_attempt.attempts NO incrementó (nunca reintentó la fila desidentificada)', attemptStable.rows[0]?.attempts === 0);

  // ==========================================================================
  console.log('--- 22. CLAVE LEGACY de actividad -- reescritura a v2, ya-v2 sin cambios ---');

  const legacyAccount = await createSession('legacy-activity');
  const legacyBusinessKey = randomUUID();
  const legacyDedupKey = `topic-completed:${legacyAccount.accountId}:${legacyBusinessKey}`;
  const legacyActivityId = await seedActivity(legacyAccount.accountId, { activityType: 'TEMA_COMPLETADO', deduplicationKey: legacyDedupKey });
  await closeDefinitively(pg, legacyAccount);
  const legacyActorRef = gamificationActorRef(legacyAccount.accountId, gamificationSecret);
  const expectedV2Key = `topic-completed:v2:${legacyActorRef}:${legacyBusinessKey}`;
  const legacyAfter = await pg.query('SELECT account_id, gamification_actor_ref, deduplication_key FROM validated_gamification_activity WHERE id = $1', [legacyActivityId]);
  check('22.1 accountId -> NULL', legacyAfter.rows[0].account_id === null);
  check('22.2 gamificationActorRef correcto', legacyAfter.rows[0].gamification_actor_ref === legacyActorRef);
  check('22.3 deduplicationKey reescrita a v2 (sin accountId crudo)', legacyAfter.rows[0].deduplication_key === expectedV2Key && !legacyAfter.rows[0].deduplication_key.includes(legacyAccount.accountId));
  const legacyDupCount = await pg.query('SELECT count(*)::int AS n FROM validated_gamification_activity WHERE deduplication_key = $1', [expectedV2Key]);
  check('22.4 ninguna fila duplicada -- exactamente 1 con la clave v2', legacyDupCount.rows[0].n === 1);

  const alreadyV2Account = await createSession('already-v2-activity');
  const alreadyV2Key = `ensayo-completado:v2:${gamificationActorRef(alreadyV2Account.accountId, gamificationSecret)}:${randomUUID()}`;
  const alreadyV2ActivityId = await seedActivity(alreadyV2Account.accountId, { activityType: 'ENSAYO_COMPLETADO', deduplicationKey: alreadyV2Key });
  await closeDefinitively(pg, alreadyV2Account);
  const alreadyV2After = await pg.query('SELECT account_id, gamification_actor_ref, deduplication_key FROM validated_gamification_activity WHERE id = $1', [alreadyV2ActivityId]);
  check('22.5 fila YA v2: deduplicationKey permanece EXACTAMENTE igual', alreadyV2After.rows[0].deduplication_key === alreadyV2Key);
  check('22.6 fila YA v2: solo la identidad transicionó', alreadyV2After.rows[0].account_id === null && alreadyV2After.rows[0].gamification_actor_ref === gamificationActorRef(alreadyV2Account.accountId, gamificationSecret));

  // ==========================================================================
  console.log('--- 23. COLISIÓN de actividad -- ABORTA, sin fusión/borrado/skip-as-success ---');

  const collisionAccount = await createSession('collision-activity');
  const collisionActorRef = gamificationActorRef(collisionAccount.accountId, gamificationSecret);
  const collisionBusinessKey = randomUUID();
  const collisionV2Key = `resource-completed:v2:${collisionActorRef}:${collisionBusinessKey}`;
  // Fila v2 YA existente para el MISMO hecho de negocio.
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, gamification_actor_ref, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,NULL,$2,'GATE','GATE_ENTITY',$3,'RECURSO_COMPLETADO','VALID','v1',$4,$5,'INTACT')`,
    [randomUUID(), collisionActorRef, randomUUID(), now.toISOString(), collisionV2Key],
  );
  const collisionLegacyKey = `resource-completed:${collisionAccount.accountId}:${collisionBusinessKey}`;
  const collisionLegacyActivityId = await seedActivity(collisionAccount.accountId, { activityType: 'RECURSO_COMPLETADO', deduplicationKey: collisionLegacyKey });
  // Otro modelo (XpLedgerEntry vía B3) sembrado para la MISMA cuenta, para
  // probar que el aborto de MODELO A no afecta a los OTROS modelos --
  // cada uno tiene su propia transacción independiente (B4 §K).
  await pg.query(`INSERT INTO gamification_program (id, program_key, name, program_type) VALUES ($1,'xp-core','XP Core','XP') ON CONFLICT DO NOTHING`, [randomUUID()]);

  const collisionSweep = await req('POST', '/privacy/account-deletion', collisionAccount.headers, {});
  if (collisionSweep.status !== 202) throw new Error(`solicitud de eliminación falló: ${collisionSweep.status}`);
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [collisionAccount.accountId]);
  const sweepResult = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  check('23.0 el ENDPOINT de barrido responde 200 (falla aislada por cuenta)', sweepResult.status === 200);

  const collisionAfter = await pg.query('SELECT account_id, gamification_actor_ref, deduplication_key FROM validated_gamification_activity WHERE id = $1', [collisionLegacyActivityId]);
  check('23.1 fila legacy en colisión: accountId SIGUE crudo (sin fusión/borrado)', collisionAfter.rows[0].account_id === collisionAccount.accountId);
  check('23.2 fila legacy en colisión: gamificationActorRef SIGUE NULL', collisionAfter.rows[0].gamification_actor_ref === null);
  check('23.3 fila legacy en colisión: deduplicationKey SIN cambios', collisionAfter.rows[0].deduplication_key === collisionLegacyKey);
  const collisionTargetCount = await pg.query('SELECT count(*)::int AS n FROM validated_gamification_activity WHERE deduplication_key = $1', [collisionV2Key]);
  check('23.4 ninguna fusión/duplicado -- exactamente 1 fila con la clave v2 (la preexistente, intacta)', collisionTargetCount.rows[0].n === 1);
  const collisionRequestAfter = await pg.query('SELECT status FROM privacy_request WHERE account_id = $1', [collisionAccount.accountId]);
  check('23.5 PrivacyRequest queda en PROCESSING (no completada con una pseudonimización parcial)', collisionRequestAfter.rows[0]?.status === 'PROCESSING');

  // Prueba directa del tipo de error real.
  let typedErrorThrown = false;
  try {
    await privacyService.pseudonymizeDrainedValidatedActivity(collisionAccount.accountId);
  } catch (error) {
    typedErrorThrown = error instanceof ValidatedActivityReconciliationRequiredError;
  }
  check('23.6 invocación directa lanza ValidatedActivityReconciliationRequiredError (tipado, preserva accountId + detalle)', typedErrorThrown);

  // ==========================================================================
  console.log('--- 24/25. MODELO B -- SeasonLeagueParticipation: ACTIVA vs TERMINAL, historia finalizada intacta ---');

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
    await pg.query(`INSERT INTO game_season (id, season_key, name, status, starts_at, ends_at) VALUES ($1,$2,'Gate Season B4','ACTIVE',$3,$4)`, [seasonId, `b4-gate-season-${suffix}`, seasonStartsAt.toISOString(), seasonEndsAt.toISOString()]);
  }
  const leagueDefId = randomUUID();
  await pg.query(`INSERT INTO league_definition (id, league_key, name, tier_order, participant_group_size) VALUES ($1,$2,'Gate League B4',1,30)`, [leagueDefId, `b4-gate-league-${suffix}`]);

  // 24.A -- participación en temporada ACTIVA (grupo también ACTIVO/OPEN, sin finalizar).
  const activeGroupId = randomUUID();
  await pg.query(`INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,30,'v1','OPEN')`, [activeGroupId, seasonId, leagueDefId]);
  const closedWithActiveParticipation = await createSession('closed-active-season');
  const activeParticipationId = randomUUID();
  await pg.query(`INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, participation_status) VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE')`, [
    activeParticipationId,
    seasonId,
    closedWithActiveParticipation.accountId,
    leagueDefId,
    activeGroupId,
    seasonStartsAt.toISOString(),
  ]);
  await closeDefinitively(pg, closedWithActiveParticipation);
  const activeParticipationAfter = await pg.query('SELECT account_id, gamification_actor_ref, participation_status FROM season_league_participation WHERE id = $1', [activeParticipationId]);
  check('24.A participación ACTIVA (temporada no terminal): SIGUE identificable internamente tras el cierre', activeParticipationAfter.rows[0].account_id === closedWithActiveParticipation.accountId && activeParticipationAfter.rows[0].gamification_actor_ref === null);
  check('24.A participationStatus SIGUE ACTIVE (sin alterar el resultado de la temporada)', activeParticipationAfter.rows[0].participation_status === 'ACTIVE');
  // La cuenta CLOSED ya está excluida del ranking en vivo por protecciones EXISTENTES (WEB-0D.1C-A/B0) -- probado en verify-closed-account-gamification-guard-gate.ts §E; no se reproduce aquí para no duplicar cobertura.

  // 24.B / 25 -- participación en grupo/temporada YA TERMINAL antes del cierre (lado de CIERRE de B4).
  const terminalGroupId = randomUUID();
  await pg.query(`INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,2,30,'v1','FINALIZED')`, [terminalGroupId, seasonId, leagueDefId]);
  const closedWithTerminalParticipation = await createSession('closed-terminal-season');
  const terminalParticipationId = randomUUID();
  const finalizedAt = new Date();
  await pg.query(
    `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, participation_status, final_rank, finalized_at) VALUES ($1,$2,$3,$4,$5,$6,'RETAINED',5,$7)`,
    [terminalParticipationId, seasonId, closedWithTerminalParticipation.accountId, leagueDefId, terminalGroupId, seasonStartsAt.toISOString(), finalizedAt.toISOString()],
  );
  // Snapshot finalizado histórico (business state a preservar).
  const leaderboardDefinitionRepo = new LeaderboardDefinitionRepository(prisma);
  const snapshotId = randomUUID();
  const ldbRow = await pg.query(`SELECT id FROM leaderboard_definition WHERE status = 'ACTIVE' LIMIT 1`);
  let ldbId = ldbRow.rows[0]?.id as string | undefined;
  if (!ldbId) {
    ldbId = randomUUID();
    await pg.query(
      `INSERT INTO leaderboard_definition (id, leaderboard_key, leaderboard_type, ranking_metric, scope_rule, tie_break_rule, update_frequency, status) VALUES ($1,'league-ranking-v1','LEAGUE','league_points','group','v1','15m','ACTIVE')`,
      [ldbId],
    );
  }
  await pg.query(
    `INSERT INTO leaderboard_snapshot (id, league_group_id, game_season_id, league_definition_id, leaderboard_definition_id, snapshot_at, tie_break_rule_version, promotion_rule_version, demotion_rule_version, ranking_metric_version, participant_count, content_hash)
     VALUES ($1,$2,$3,$4,$5,$6,'v1','none','none','v1',1,'gate-hash')`,
    [snapshotId, terminalGroupId, seasonId, leagueDefId, ldbId, finalizedAt.toISOString()],
  );
  const snapshotEntryId = randomUUID();
  await pg.query(
    `INSERT INTO leaderboard_snapshot_entry (id, leaderboard_snapshot_id, season_league_participation_id, rank_position, metric_value, tie_break_value, promotion_outcome)
     VALUES ($1,$2,$3,5,10,$4,'RETAINED')`,
    [snapshotEntryId, snapshotId, terminalParticipationId, finalizedAt.toISOString()],
  );
  const snapshotBefore = await pg.query('SELECT rank_position, metric_value, promotion_outcome FROM leaderboard_snapshot_entry WHERE id = $1', [snapshotEntryId]);

  await closeDefinitively(pg, closedWithTerminalParticipation);
  const terminalActorRef = gamificationActorRef(closedWithTerminalParticipation.accountId, gamificationSecret);
  const terminalAfter = await pg.query('SELECT account_id, gamification_actor_ref, final_rank, participation_status, league_definition_id, league_group_id, game_season_id FROM season_league_participation WHERE id = $1', [terminalParticipationId]);
  check('24.B/25.1 participación TERMINAL (temporada/grupo ya finalizado): SÍ pseudonimizada tras el cierre', terminalAfter.rows[0].account_id === null && terminalAfter.rows[0].gamification_actor_ref === terminalActorRef);
  check('25.2 finalRank/participationStatus/leagueDefinitionId/leagueGroupId/gameSeasonId SIN cambios (resultado de temporada intacto)', terminalAfter.rows[0].final_rank === 5 && terminalAfter.rows[0].participation_status === 'RETAINED' && terminalAfter.rows[0].league_definition_id === leagueDefId && terminalAfter.rows[0].league_group_id === terminalGroupId && terminalAfter.rows[0].game_season_id === seasonId);
  const snapshotAfter = await pg.query('SELECT rank_position, metric_value, promotion_outcome FROM leaderboard_snapshot_entry WHERE id = $1', [snapshotEntryId]);
  check('25.3 LeaderboardSnapshotEntry SIN mutar (nunca depende de accountId)', JSON.stringify(snapshotAfter.rows[0]) === JSON.stringify(snapshotBefore.rows[0]));

  // ==========================================================================
  console.log('--- 24/25 (lado FINALIZACIÓN) -- cuenta ya CLOSED, temporada finaliza DESPUÉS ---');

  // Las cuentas se crean/cierran ANTES de sembrar el grupo LOCKED -- el
  // scheduler REAL de `LeaderboardFinalizationScheduler` corre cada minuto
  // en este mismo proceso; con las pausas de espaciado de `createSession`
  // (NFR-SEC-007) de por medio, dejar el grupo LOCKED sembrado demasiado
  // pronto le da tiempo a ese cron de encontrarlo y finalizarlo (con 0
  // participantes todavía) antes de que este gate llame a `finalizeGroup`
  // explícitamente -- ENVIRONMENT, no un defecto de B4. Sembrar el grupo +
  // sus participaciones + llamar a `finalizeGroup` en sucesión inmediata
  // (sin ninguna pausa de por medio) cierra esa ventana.
  const closedBeforeFinalization = await createSession('closed-before-finalization');
  await closeDefinitively(pg, closedBeforeFinalization);
  const controlAccount = await createSession('control-active-at-finalization');
  const finalGroupId = randomUUID();
  await pg.query(`INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,3,30,'v1','LOCKED')`, [finalGroupId, seasonId, leagueDefId]);
  const closedParticipationId = randomUUID();
  const controlParticipationId = randomUUID();
  await pg.query(`INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, participation_status, league_points) VALUES ($1,$2,$3,$4,$5,$6,'SEASON_ENDED',10)`, [
    closedParticipationId,
    seasonId,
    closedBeforeFinalization.accountId,
    leagueDefId,
    finalGroupId,
    seasonStartsAt.toISOString(),
  ]);
  await pg.query(`INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, participation_status, league_points) VALUES ($1,$2,$3,$4,$5,$6,'SEASON_ENDED',20)`, [
    controlParticipationId,
    seasonId,
    controlAccount.accountId,
    leagueDefId,
    finalGroupId,
    seasonStartsAt.toISOString(),
  ]);

  const gameSeasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const entryRepo = new LeaderboardEntryRepository(prisma);
  const snapshotRepo = new LeaderboardSnapshotRepository(prisma);
  const snapshotEntryRepo = new LeaderboardSnapshotEntryRepository(prisma);
  const calculationService = new LeaderboardCalculationService(leaderboardDefinitionRepo, participationRepo, ledgerRepo, entryRepo);
  const finalizationService = new LeaderboardFinalizationService(prisma, leagueGroupRepo, leagueDefinitionRepo, participationRepo, calculationService, snapshotRepo, snapshotEntryRepo, privacyService);

  void gameSeasonRepo;
  void isoNow;

  const finalized = await finalizationService.finalizeGroup(finalGroupId);
  check('Finalización real del grupo -> true (no-op solo si ya estaba FINALIZED)', finalized === true);

  const closedParticipationFinal = await pg.query('SELECT account_id, gamification_actor_ref, participation_status FROM season_league_participation WHERE id = $1', [closedParticipationId]);
  check('Lado FINALIZACIÓN: participación de cuenta YA CLOSED -- pseudonimizada EN el mismo instante de finalización', closedParticipationFinal.rows[0].account_id === null && closedParticipationFinal.rows[0].gamification_actor_ref === gamificationActorRef(closedBeforeFinalization.accountId, gamificationSecret));
  check('Lado FINALIZACIÓN: participationStatus SÍ se fijó a un valor terminal (finalización real, no simulada)', ['PROMOTED', 'DEMOTED', 'RETAINED'].includes(closedParticipationFinal.rows[0].participation_status));
  const controlParticipationFinal = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [controlParticipationId]);
  check('Control: participación de cuenta NO cerrada -- SIGUE identificable tras la MISMA finalización (fresh-check TOCTOU §26 correcto)', controlParticipationFinal.rows[0].account_id === controlAccount.accountId && controlParticipationFinal.rows[0].gamification_actor_ref === null);
  const groupFinal = await pg.query('SELECT status FROM league_group WHERE id = $1', [finalGroupId]);
  check('El grupo SÍ quedó FINALIZED (la pseudonimización de B4 nunca bloqueó la finalización real)', groupFinal.rows[0]?.status === 'FINALIZED');

  // ==========================================================================
  console.log('--- 27. SECRETO ausente -- rollback total, sin fallback ---');

  const secretAccount = await createSession('secret-missing');
  const secretActivityId = await seedActivity(secretAccount.accountId);
  await closeDefinitively(pg, secretAccount); // cierra con el secreto REAL presente en el servidor -- B3 corre normalmente
  // Ahora probamos la invocación DIRECTA de los métodos de B4 con el secreto AUSENTE de este proceso (nunca el del servidor).
  const savedSecret = process.env.GAMIFICATION_ACTOR_SECRET;
  delete process.env.GAMIFICATION_ACTOR_SECRET;
  const secretMissingService = new GamificationPrivacyService(txRunner, undefined);
  let modelAThrew = false;
  let modelBThrew = false;
  try {
    await secretMissingService.pseudonymizeDrainedValidatedActivity(secretAccount.accountId);
  } catch {
    modelAThrew = true;
  }
  try {
    await secretMissingService.pseudonymizeTerminalSeasonParticipations(secretAccount.accountId);
  } catch {
    modelBThrew = true;
  }
  process.env.GAMIFICATION_ACTOR_SECRET = savedSecret;
  check('27.1 MODELO A sin secreto -> lanza (nunca fallback, nunca completa en silencio)', modelAThrew);
  check('27.2 MODELO B sin secreto -> lanza', modelBThrew);
  const secretActivityStable = await pg.query('SELECT account_id, gamification_actor_ref FROM validated_gamification_activity WHERE id = $1', [secretActivityId]);
  check('27.3 la actividad de esa cuenta ya fue pseudonimizada por el cierre REAL (secreto presente en el servidor) -- confirma que el fallo anterior fue aislado a la invocación directa sin secreto', secretActivityStable.rows[0].account_id === null);

  // ==========================================================================
  console.log('--- 28. IDEMPOTENCIA -- segunda corrida completa, sin mutaciones nuevas ---');

  const secondModelA = await privacyService.pseudonymizeDrainedValidatedActivity(legacyAccount.accountId);
  check('28.1 MODELO A -- segunda corrida: 0 filas nuevas', secondModelA.validatedGamificationActivity === 0);
  const secondModelB = await privacyService.pseudonymizeTerminalSeasonParticipations(closedWithTerminalParticipation.accountId);
  check('28.2 MODELO B (lado cierre) -- segunda corrida: 0 filas nuevas', secondModelB.seasonLeagueParticipation === 0);
  const legacyStable = await pg.query('SELECT account_id, gamification_actor_ref, deduplication_key FROM validated_gamification_activity WHERE id = $1', [legacyActivityId]);
  check('28.3 fila legacy reescrita permanece IDÉNTICA', legacyStable.rows[0].account_id === null && legacyStable.rows[0].deduplication_key === expectedV2Key);

  // Higiene de fin de corrida -- mismo criterio que el resto de gates de
  // este bloque: retira los `league_definition`/`game_season` COMPARTIDOS
  // que este gate creó, para no interferir con otros gates que dependen de
  // un ladder de tiers/temporada limpio (p.ej. findLowestActiveTier).
  await retireStaleGateLeagues(pg);
  await finalizeStaleGateSeasons(pg);

  await prisma.$disconnect();
  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de pseudonimización diferida/terminal de GAMIFICATION (WEB-0D.1C-B4) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
