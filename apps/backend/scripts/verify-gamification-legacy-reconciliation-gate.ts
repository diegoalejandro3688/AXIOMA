// WEB-0D.1C-B5 -- auditoría de solo-lectura + reconciliación DETERMINISTA
// acotada de anomalías legado de GAMIFICATION dejadas deliberadamente por
// B3/B4. Invocación directa del servicio real (misma técnica que los gates
// de B4/B4-R1) contra fixtures sembradas directamente por SQL.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { assertGateDb, finalizeStaleGateSeasons, retireStaleGateLeagues } from './gate-db-safety';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { GamificationLegacyReconciliationService } from '../src/gamification/gamification-legacy-reconciliation.service';
import { gamificationActorRef } from '../src/gamification/gamification-actor-ref';
import { buildLegacyRewardSourceId, buildRewardSourceIdV2 } from '../src/gamification/gamification-key';
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

let sessionCount = 0;
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  if (sessionCount > 0) await sleep(7_000);
  sessionCount++;
  const uid = `b5-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return { accountId: session.body.accountId as string, headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId } };
}

async function closeAccountDirectly(pg: Client, accountId: string): Promise<void> {
  await pg.query("UPDATE account SET status = 'CLOSED', closed_at = now() WHERE id = $1", [accountId]);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);
  await finalizeStaleGateSeasons(pg);
  await retireStaleGateLeagues(pg);

  const now = new Date();
  const suffix = `${Date.now()}`;
  const gamificationSecret = process.env.GAMIFICATION_ACTOR_SECRET ?? '';
  check('preflight: GAMIFICATION_ACTOR_SECRET presente', gamificationSecret.length > 0);

  const txRunner = new TransactionRunnerService(prisma);
  const reconciliationService = new GamificationLegacyReconciliationService(prisma, txRunner, undefined);

  const bundleId = randomUUID();
  await pg.query(`INSERT INTO reward_bundle (id, name, bundle_key) VALUES ($1,'Gate Bundle B5',$2)`, [bundleId, `b5-gate-bundle-${suffix}`]);

  // ==========================================================================
  console.log('--- Fixtures: A-H ---');

  // A. RewardGrant legacy DETERMINISTA (CLOSED, forma legacy exacta, sin colisión v2).
  const accountA = await createSession('a-deterministic-reward');
  await closeAccountDirectly(pg, accountA.accountId);
  const legacySourceA = buildLegacyRewardSourceId(accountA.accountId, 42);
  const grantAId = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    grantAId,
    accountA.accountId,
    bundleId,
    legacySourceA,
    `reward:LEVEL:${legacySourceA}`,
  ]);
  const componentAId = randomUUID();
  await pg.query(`INSERT INTO reward_grant_component (id, reward_grant_id, component_type, xp_amount, delivery_status) VALUES ($1,$2,'XP_BONUS',50,'DELIVERED')`, [componentAId, grantAId]);

  // B. RewardGrant legacy/v2 COLLISION.
  const accountB = await createSession('b-collision-reward');
  await closeAccountDirectly(pg, accountB.accountId);
  const collisionActorRefB = gamificationActorRef(accountB.accountId, gamificationSecret);
  const collisionV2SourceB = `v2:${collisionActorRefB}:99`;
  await pg.query(`INSERT INTO reward_grant (id, account_id, gamification_actor_ref, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,NULL,$2,$3,'LEVEL',$4,$5)`, [
    randomUUID(),
    collisionActorRefB,
    bundleId,
    collisionV2SourceB,
    `reward:LEVEL:${collisionV2SourceB}`,
  ]);
  const legacySourceB = buildLegacyRewardSourceId(accountB.accountId, 99);
  const grantBId = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    grantBId,
    accountB.accountId,
    bundleId,
    legacySourceB,
    `reward:LEVEL:${legacySourceB}`,
  ]);

  // C. RewardGrant MALFORMADO (tipo legacy-embedding pero forma inesperada).
  const accountC = await createSession('c-malformed-reward');
  await closeAccountDirectly(pg, accountC.accountId);
  const malformedSourceC = `not-the-expected-shape-${randomUUID()}`;
  const grantCId = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'STUDY_SUBJECT',$4,$5)`, [
    grantCId,
    accountC.accountId,
    bundleId,
    malformedSourceC,
    `reward:STUDY_SUBJECT:${malformedSourceC}`,
  ]);

  // D. ValidatedGamificationActivity DETERMINISTA.
  const accountD = await createSession('d-deterministic-activity');
  await closeAccountDirectly(pg, accountD.accountId);
  const businessKeyD = randomUUID();
  const legacyKeyD = `topic-completed:${accountD.accountId}:${businessKeyD}`;
  const activityDId = randomUUID();
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,$2,'GATE','GATE_ENTITY',$3,'TEMA_COMPLETADO','VALID','v1',$4,$5,'INTACT')`,
    [activityDId, accountD.accountId, randomUUID(), now.toISOString(), legacyKeyD],
  );

  // E. ValidatedGamificationActivity COLISIÓN.
  const accountE = await createSession('e-collision-activity');
  await closeAccountDirectly(pg, accountE.accountId);
  const actorRefE = gamificationActorRef(accountE.accountId, gamificationSecret);
  const businessKeyE = randomUUID();
  const v2KeyE = `ensayo-completado:v2:${actorRefE}:${businessKeyE}`;
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, gamification_actor_ref, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,NULL,$2,'GATE','GATE_ENTITY',$3,'ENSAYO_COMPLETADO','VALID','v1',$4,$5,'INTACT')`,
    [randomUUID(), actorRefE, randomUUID(), now.toISOString(), v2KeyE],
  );
  const legacyKeyE = `ensayo-completado:${accountE.accountId}:${businessKeyE}`;
  const activityEId = randomUUID();
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,$2,'GATE','GATE_ENTITY',$3,'ENSAYO_COMPLETADO','VALID','v1',$4,$5,'INTACT')`,
    [activityEId, accountE.accountId, randomUUID(), now.toISOString(), legacyKeyE],
  );

  // F. ValidatedGamificationActivity MALFORMADA.
  const accountF = await createSession('f-malformed-activity');
  await closeAccountDirectly(pg, accountF.accountId);
  const malformedKeyF = `topic-completed:not-the-expected-shape-${randomUUID()}`;
  const activityFId = randomUUID();
  await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1,$2,'GATE','GATE_ENTITY',$3,'TEMA_COMPLETADO','VALID','v1',$4,$5,'INTACT')`,
    [activityFId, accountF.accountId, randomUUID(), now.toISOString(), malformedKeyF],
  );

  // G. SeasonLeagueParticipation TERMINAL BASELINE.
  const accountG = await createSession('g-terminal-participation');
  const existingActiveSeason = await pg.query(`SELECT id FROM game_season WHERE status = 'ACTIVE' LIMIT 1`);
  let seasonId: string;
  if (existingActiveSeason.rows.length > 0) {
    seasonId = existingActiveSeason.rows[0].id;
  } else {
    seasonId = randomUUID();
    await pg.query(`INSERT INTO game_season (id, season_key, name, status, starts_at, ends_at) VALUES ($1,$2,'Gate Season B5','ACTIVE',$3,$4)`, [
      seasonId,
      `b5-gate-season-${suffix}`,
      now.toISOString(),
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ]);
  }
  const leagueDefId = randomUUID();
  await pg.query(`INSERT INTO league_definition (id, league_key, name, tier_order, participant_group_size) VALUES ($1,$2,'Gate League B5',1,30)`, [leagueDefId, `b5-gate-league-${suffix}`]);
  const terminalGroupId = randomUUID();
  await pg.query(`INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,30,'v1','FINALIZED')`, [
    terminalGroupId,
    seasonId,
    leagueDefId,
  ]);
  await closeAccountDirectly(pg, accountG.accountId);
  const participationGId = randomUUID();
  await pg.query(
    `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, participation_status, final_rank, finalized_at) VALUES ($1,$2,$3,$4,$5,$6,'RETAINED',3,$7)`,
    [participationGId, seasonId, accountG.accountId, leagueDefId, terminalGroupId, now.toISOString(), now.toISOString()],
  );

  // H. Filas YA pseudonimizadas (control) -- nunca deben reportarse como deterministas/duplicadas/malformadas.
  const accountH = await createSession('h-already-pseudonymized');
  await closeAccountDirectly(pg, accountH.accountId);
  const actorRefH = gamificationActorRef(accountH.accountId, gamificationSecret);
  const grantHId = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, gamification_actor_ref, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,NULL,$2,$3,'ACHIEVEMENT_UNLOCK',$4,$5)`, [
    grantHId,
    actorRefH,
    bundleId,
    randomUUID(),
    `reward:ACHIEVEMENT_UNLOCK:${randomUUID()}-${suffix}`,
  ]);

  // Controles de seguridad de estado: ACTIVE y DELETION_PENDING con filas legacy.
  const accountActive = await createSession('active-control');
  const legacySourceActive = buildLegacyRewardSourceId(accountActive.accountId, 7);
  const grantActiveId = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    grantActiveId,
    accountActive.accountId,
    bundleId,
    legacySourceActive,
    `reward:LEVEL:${legacySourceActive}`,
  ]);
  const accountPending = await createSession('pending-control');
  const pendingDel = await req('POST', '/privacy/account-deletion', accountPending.headers, {});
  if (pendingDel.status !== 202) throw new Error(`solicitud de eliminación falló: ${pendingDel.status}`);
  const legacySourcePending = buildLegacyRewardSourceId(accountPending.accountId, 8);
  const grantPendingId = randomUUID();
  await pg.query(`INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1,$2,$3,'LEVEL',$4,$5)`, [
    grantPendingId,
    accountPending.accountId,
    bundleId,
    legacySourcePending,
    `reward:LEVEL:${legacySourcePending}`,
  ]);

  // ==========================================================================
  console.log('--- 21. DRY RUN -- clasificación exacta, CERO mutaciones ---');

  const dryRun = await reconciliationService.reconcile({ apply: false });
  check('21.1 dry-run reporta applied=false', dryRun.applied === false);
  check('21.2 A: RewardGrant legacy determinista clasificado DETERMINISTIC_REWRITE', dryRun.report.deterministic.some((e) => e.rowId === grantAId && e.model === 'RewardGrant'));
  check('21.3 B: RewardGrant en colisión clasificado DUPLICATE_EQUIVALENT', dryRun.report.duplicates.some((e) => e.rowId === grantBId && e.model === 'RewardGrant'));
  check('21.4 C: RewardGrant malformado clasificado MALFORMED_LEGACY', dryRun.report.malformed.some((e) => e.rowId === grantCId && e.model === 'RewardGrant'));
  check('21.5 D: ValidatedActivity determinista clasificada DETERMINISTIC_REWRITE', dryRun.report.deterministic.some((e) => e.rowId === activityDId && e.model === 'ValidatedGamificationActivity'));
  check('21.6 E: ValidatedActivity en colisión clasificada DUPLICATE_EQUIVALENT', dryRun.report.duplicates.some((e) => e.rowId === activityEId && e.model === 'ValidatedGamificationActivity'));
  check('21.7 F: ValidatedActivity malformada clasificada MALFORMED_LEGACY', dryRun.report.malformed.some((e) => e.rowId === activityFId && e.model === 'ValidatedGamificationActivity'));
  check('21.8 G: SeasonLeagueParticipation terminal clasificada TERMINAL_PARTICIPATION_BASELINE', dryRun.report.terminalParticipationBaseline.some((e) => e.rowId === participationGId));
  check('21.9 H: fila YA pseudonimizada NO aparece en ninguna clasificación', ![...dryRun.report.deterministic, ...dryRun.report.duplicates, ...dryRun.report.malformed].some((e) => e.rowId === grantHId));
  check('21.10 ACTIVE: fila legacy de cuenta ACTIVA NO aparece en ninguna clasificación', ![...dryRun.report.deterministic, ...dryRun.report.duplicates, ...dryRun.report.malformed].some((e) => e.rowId === grantActiveId));
  check('21.11 DELETION_PENDING: fila legacy NO aparece en ninguna clasificación', ![...dryRun.report.deterministic, ...dryRun.report.duplicates, ...dryRun.report.malformed].some((e) => e.rowId === grantPendingId));

  const grantAAfterDryRun = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id FROM reward_grant WHERE id = $1', [grantAId]);
  check('21.12 CERO mutación real tras dry-run (A sigue cruda)', grantAAfterDryRun.rows[0].account_id === accountA.accountId && grantAAfterDryRun.rows[0].gamification_actor_ref === null && grantAAfterDryRun.rows[0].source_entity_id === legacySourceA);
  const participationGAfterDryRun = await pg.query('SELECT account_id FROM season_league_participation WHERE id = $1', [participationGId]);
  check('21.13 CERO mutación real tras dry-run (G sigue cruda)', participationGAfterDryRun.rows[0].account_id === accountG.accountId);

  // ==========================================================================
  console.log('--- 27. Secreto AUSENTE -- dry-run puede clasificar filas pass-through, apply hace CERO mutaciones ---');

  const savedSecret = process.env.GAMIFICATION_ACTOR_SECRET;
  delete process.env.GAMIFICATION_ACTOR_SECRET;
  const noSecretService = new GamificationLegacyReconciliationService(prisma, txRunner, undefined);
  const dryRunNoSecret = await noSecretService.reconcile({ apply: false });
  check('27.1 dry-run sin secreto: H (ya pseudonimizada) sigue sin aparecer en ninguna clasificación', ![...dryRunNoSecret.report.deterministic, ...dryRunNoSecret.report.duplicates, ...dryRunNoSecret.report.malformed].some((e) => e.rowId === grantHId));
  check('27.2 dry-run sin secreto: A/D (requieren HMAC para descartar colisión) NO se clasifican como deterministas sin poder probarlo', !dryRunNoSecret.report.deterministic.some((e) => e.rowId === grantAId) && !dryRunNoSecret.report.deterministic.some((e) => e.rowId === activityDId));
  const applyNoSecret = await noSecretService.reconcile({ apply: true });
  process.env.GAMIFICATION_ACTOR_SECRET = savedSecret;
  check('27.3 apply sin secreto: secretMissing=true', applyNoSecret.secretMissing === true);
  check('27.4 apply sin secreto: CERO mutaciones', applyNoSecret.accountsFullyRepaired === 0 && applyNoSecret.accountsPartial === 0 && applyNoSecret.rewardGrantRepaired === 0 && applyNoSecret.validatedActivityRepaired === 0 && applyNoSecret.seasonParticipationRepaired === 0);
  const grantAAfterNoSecret = await pg.query('SELECT account_id FROM reward_grant WHERE id = $1', [grantAId]);
  check('27.5 fila A SIGUE cruda tras el intento de apply sin secreto', grantAAfterNoSecret.rows[0].account_id === accountA.accountId);

  // ==========================================================================
  console.log('--- 22. APPLY -- repara SOLO el subconjunto determinista ---');

  const apply1 = await reconciliationService.reconcile({ apply: true });
  check('22.0 apply corre sin lanzar', apply1.applied === true && apply1.secretMissing === false);

  const grantAAfter = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id, idempotency_key FROM reward_grant WHERE id = $1', [grantAId]);
  const expectedActorRefA = gamificationActorRef(accountA.accountId, gamificationSecret);
  const expectedV2SourceA = buildRewardSourceIdV2(accountA.accountId, gamificationSecret, '42');
  check('22.1 RewardGrant A: accountId NULL', grantAAfter.rows[0].account_id === null);
  check('22.2 RewardGrant A: actorRef esperado', grantAAfter.rows[0].gamification_actor_ref === expectedActorRefA);
  check('22.3 RewardGrant A: sourceEntityId/idempotencyKey reescritos a v2', grantAAfter.rows[0].source_entity_id === expectedV2SourceA && grantAAfter.rows[0].idempotency_key === `reward:LEVEL:${expectedV2SourceA}`);
  const componentAAfter = await pg.query('SELECT reward_grant_id, delivery_status, xp_amount FROM reward_grant_component WHERE id = $1', [componentAId]);
  check('22.4 RewardGrantComponent de A intacto (mismo rewardGrantId, mismo estado/monto -- la PK nunca cambia)', componentAAfter.rows[0].reward_grant_id === grantAId && componentAAfter.rows[0].delivery_status === 'DELIVERED' && Number(componentAAfter.rows[0].xp_amount) === 50);

  const activityDAfter = await pg.query('SELECT account_id, gamification_actor_ref, deduplication_key, activity_type FROM validated_gamification_activity WHERE id = $1', [activityDId]);
  const expectedActorRefD = gamificationActorRef(accountD.accountId, gamificationSecret);
  const expectedV2KeyD = `topic-completed:v2:${expectedActorRefD}:${businessKeyD}`;
  check('22.5 ValidatedActivity D: accountId NULL', activityDAfter.rows[0].account_id === null);
  check('22.6 ValidatedActivity D: actorRef esperado', activityDAfter.rows[0].gamification_actor_ref === expectedActorRefD);
  check('22.7 ValidatedActivity D: deduplicationKey reescrita a v2', activityDAfter.rows[0].deduplication_key === expectedV2KeyD);
  check('22.8 ValidatedActivity D: activityType SIN cambios (campo de negocio)', activityDAfter.rows[0].activity_type === 'TEMA_COMPLETADO');

  const participationGAfter = await pg.query('SELECT account_id, gamification_actor_ref, participation_status, final_rank FROM season_league_participation WHERE id = $1', [participationGId]);
  check('22.9 SeasonParticipation G: accountId NULL', participationGAfter.rows[0].account_id === null);
  check('22.10 SeasonParticipation G: actorRef esperado', participationGAfter.rows[0].gamification_actor_ref === gamificationActorRef(accountG.accountId, gamificationSecret));
  check('22.11 SeasonParticipation G: resultado terminal SIN cambios (RETAINED, rank 3)', participationGAfter.rows[0].participation_status === 'RETAINED' && participationGAfter.rows[0].final_rank === 3);

  // ==========================================================================
  console.log('--- 23. Preservación de filas ambiguas tras APPLY ---');

  const grantBAfter = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id FROM reward_grant WHERE id = $1', [grantBId]);
  check('23.1 RewardGrant B (colisión) SIN cambios', grantBAfter.rows[0].account_id === accountB.accountId && grantBAfter.rows[0].gamification_actor_ref === null && grantBAfter.rows[0].source_entity_id === legacySourceB);
  const grantCAfter = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id FROM reward_grant WHERE id = $1', [grantCId]);
  check('23.2 RewardGrant C (malformado) SIN cambios', grantCAfter.rows[0].account_id === accountC.accountId && grantCAfter.rows[0].gamification_actor_ref === null && grantCAfter.rows[0].source_entity_id === malformedSourceC);
  const activityEAfter = await pg.query('SELECT account_id, gamification_actor_ref, deduplication_key FROM validated_gamification_activity WHERE id = $1', [activityEId]);
  check('23.3 ValidatedActivity E (colisión) SIN cambios', activityEAfter.rows[0].account_id === accountE.accountId && activityEAfter.rows[0].gamification_actor_ref === null && activityEAfter.rows[0].deduplication_key === legacyKeyE);
  const activityFAfter = await pg.query('SELECT account_id, gamification_actor_ref, deduplication_key FROM validated_gamification_activity WHERE id = $1', [activityFId]);
  check('23.4 ValidatedActivity F (malformada) SIN cambios', activityFAfter.rows[0].account_id === accountF.accountId && activityFAfter.rows[0].gamification_actor_ref === null && activityFAfter.rows[0].deduplication_key === malformedKeyF);

  const totalGrantsWithLegacyB = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE source_entity_id = $1', [collisionV2SourceB]);
  check('23.5 ninguna fusión/duplicado -- exactamente 1 fila con la clave v2 de B (la preexistente)', totalGrantsWithLegacyB.rows[0].n === 1);

  const dryRun2 = await reconciliationService.reconcile({ apply: false });
  check('23.6 tras APPLY, B/C/E/F siguen visibles en el reporte (ambiguos, nunca silenciados)', dryRun2.report.duplicates.some((e) => e.rowId === grantBId) && dryRun2.report.malformed.some((e) => e.rowId === grantCId) && dryRun2.report.duplicates.some((e) => e.rowId === activityEId) && dryRun2.report.malformed.some((e) => e.rowId === activityFId));

  // ==========================================================================
  console.log('--- 24. IDEMPOTENCIA -- segunda APPLY es no-op para lo ya reparado ---');

  const apply2 = await reconciliationService.reconcile({ apply: true });
  check('24.1 segunda apply: 0 RewardGrant reparados de nuevo', apply2.rewardGrantRepaired === 0);
  check('24.2 segunda apply: 0 ValidatedActivity reparados de nuevo', apply2.validatedActivityRepaired === 0);
  check('24.3 segunda apply: 0 SeasonParticipation reparados de nuevo', apply2.seasonParticipationRepaired === 0);
  const grantAStable = await pg.query('SELECT account_id, gamification_actor_ref, source_entity_id FROM reward_grant WHERE id = $1', [grantAId]);
  check('24.4 fila A permanece IDÉNTICA (sin duplicar, sin re-mutar)', grantAStable.rows[0].account_id === null && grantAStable.rows[0].gamification_actor_ref === expectedActorRefA && grantAStable.rows[0].source_entity_id === expectedV2SourceA);
  const dryRun3 = await reconciliationService.reconcile({ apply: false });
  check('24.5 ambiguos SIGUEN reportados tras dos corridas de apply', dryRun3.report.duplicates.some((e) => e.rowId === grantBId) && dryRun3.report.malformed.some((e) => e.rowId === grantCId));

  // ==========================================================================
  console.log('--- 25. Seguridad ACTIVE/DELETION_PENDING -- ignoradas por completo ---');

  const grantActiveAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM reward_grant WHERE id = $1', [grantActiveId]);
  check('25.1 cuenta ACTIVA: fila legacy SIGUE cruda tras dry-run+apply', grantActiveAfter.rows[0].account_id === accountActive.accountId && grantActiveAfter.rows[0].gamification_actor_ref === null);
  const grantPendingAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM reward_grant WHERE id = $1', [grantPendingId]);
  check('25.2 cuenta DELETION_PENDING: fila legacy SIGUE cruda tras dry-run+apply', grantPendingAfter.rows[0].account_id === accountPending.accountId && grantPendingAfter.rows[0].gamification_actor_ref === null);

  // ==========================================================================
  console.log('--- 26. Línea base del reconciliador de B4-R1 -- backlog determinista pasa a cero ---');

  const b4r1Predicate = await pg.query(
    `SELECT count(*)::int AS n FROM season_league_participation slp JOIN account a ON a.id = slp.account_id
     WHERE a.status = 'CLOSED' AND slp.participation_status IN ('PROMOTED','DEMOTED','RETAINED') AND slp.account_id IS NOT NULL AND slp.gamification_actor_ref IS NULL AND slp.id = $1`,
    [participationGId],
  );
  check('26.1 tras el baseline de B5, la fila G ya NO aparece en el predicado del reconciliador de B4-R1 (backlog determinista == 0 para esta fila)', b4r1Predicate.rows[0].n === 0);

  await retireStaleGateLeagues(pg);
  await finalizeStaleGateSeasons(pg);

  await prisma.$disconnect();
  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de reconciliación legado de GAMIFICATION (WEB-0D.1C-B5) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
