// WEB-0D.1C-B0R -- guardia de cuenta CERRADA en los workers DIFERIDOS de
// GAMIFICATION (XpGrantService, LeaguePointGrantService,
// RewardEvaluationWorker). Complementa (nunca reemplaza)
// verify-closed-account-gamification-guard-gate.ts (WEB-0D.1C-A, guardia
// en el INGEST de Outbox) -- este gate prueba la ordenación distinta:
// trabajo YA PERSISTIDO mientras la cuenta estaba ACTIVA, cuya evaluación
// diferida ocurre DESPUÉS del cierre definitivo.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { assertGateDb, finalizeStaleGateSeasons, retireStaleGateLeagues } from './gate-db-safety';
import { AccountRepository } from '../src/auth/account.repository';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { GamificationProgramRepository } from '../src/gamification/gamification-program.repository';
import { XpRuleRepository } from '../src/gamification/xp-rule.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { XpGrantAttemptRepository } from '../src/gamification/xp-grant-attempt.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { LeaguePointRuleRepository } from '../src/gamification/league-point-rule.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { QuickQuestionAttemptRepository } from '../src/gamification/quick-question-attempt.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeaguePointGrantService } from '../src/gamification/league-point-grant.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

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
  const uid = `dwcag-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  const suffix = `${Date.now()}`;
  const now = new Date();

  // Cadena mínima program -> program_version -> xp_rule, requerida por el
  // CHECK `xp_ledger_entry_otorgamiento_requires_rule` (mismo patrón que
  // verify-closed-account-gamification-guard-gate.ts). `xp-core` es la
  // MISMA clave que `XpGrantService.PROGRAM_KEY` (privada, hardcodeada) --
  // se busca/crea de forma IDEMPOTENTE porque es un recurso COMPARTIDO
  // entre corridas de gate sobre la misma DB aislada de larga duración
  // (nunca un fixture propio con sufijo -- el servicio real solo reconoce
  // exactamente "xp-core").
  // Barrido defensivo: retira cualquier `xp_rule` propio de este gate
  // (identificado por el prefijo `dwcag-gate-` en `version_label`, único a
  // este script) que haya quedado ACTIVE de una corrida ANTERIOR abortada a
  // mitad de camino (p.ej. el servidor de gates cayó justo tras crear el
  // fixture, antes de llegar a la limpieza de fin de corrida). Sin esto, ese
  // residuo queda invisible para el `createdXpRuleId` de la corrida actual
  // (que solo retira lo que ÉL creó) y sigue contaminando otros gates de XP
  // indefinidamente. Nunca toca reglas de otros dueños (p.ej. `v1` real).
  async function retireOwnStaleFixtures(): Promise<void> {
    await pg.query(
      `UPDATE xp_rule xr SET status = 'RETIRED'
       FROM gamification_program_version gpv, gamification_program gp
       WHERE xr.program_version_id = gpv.id AND gpv.gamification_program_id = gp.id
         AND gp.program_key = 'xp-core' AND gpv.version_label LIKE 'dwcag-gate-%'
         AND xr.status = 'ACTIVE'`,
    );
  }
  await retireOwnStaleFixtures();

  async function findOrCreateXpCoreRule(): Promise<string> {
    // Debe estar VIGENTE para `now` (no solo ACTIVE) -- una regla `v1` real
    // sembrada por otro gate (p.ej. `verify-xp-v1-implementation-gate.ts`)
    // suele tener `effective_from` en el FUTURO respecto de `now`, y
    // reutilizarla ciegamente dejaría a este gate sin regla aplicable
    // (NO_ACTIVE_RULE falso en los escenarios E/F).
    const existingRule = await pg.query(
      `SELECT xr.id FROM xp_rule xr
       JOIN gamification_program_version gpv ON gpv.id = xr.program_version_id
       JOIN gamification_program gp ON gp.id = gpv.gamification_program_id
       WHERE gp.program_key = 'xp-core' AND gp.status = 'ACTIVE' AND gpv.approval_status = 'APPROVED'
         AND xr.activity_type = 'RESPUESTA_VALIDADA' AND xr.status = 'ACTIVE'
         AND (xr.effective_from IS NULL OR xr.effective_from <= $1)
         AND (xr.effective_until IS NULL OR xr.effective_until > $1)
         AND (gpv.effective_from IS NULL OR gpv.effective_from <= $1)
         AND (gpv.effective_until IS NULL OR gpv.effective_until > $1)
       LIMIT 1`,
      [now],
    );
    if (existingRule.rows.length > 0) return existingRule.rows[0].id as string;

    let programId: string;
    const existingProgram = await pg.query(`SELECT id FROM gamification_program WHERE program_key = 'xp-core'`);
    if (existingProgram.rows.length > 0) {
      programId = existingProgram.rows[0].id as string;
    } else {
      const programRow = await pg.query(
        `INSERT INTO gamification_program (id, program_key, name, program_type) VALUES ($1, 'xp-core', 'XP Core', 'XP') RETURNING id`,
        [randomUUID()],
      );
      programId = programRow.rows[0].id as string;
    }

    let programVersionId: string;
    const existingVersion = await pg.query(
      `SELECT id FROM gamification_program_version WHERE gamification_program_id = $1 AND version_label = $2`,
      [programId, `dwcag-gate-${suffix}`],
    );
    if (existingVersion.rows.length > 0) {
      programVersionId = existingVersion.rows[0].id as string;
    } else {
      // `effective_from = now` (NUNCA NULL) -- una ventana abierta hacia
      // atrás (NULL = "siempre elegible") intercepta actividades históricas
      // pre-cutover de OTROS gates de XP vía `ORDER BY effective_from DESC`
      // (Postgres ordena NULL primero en DESC), exactamente la fuga que
      // rompió `verify-xp-v1-implementation-gate.ts` la primera vez.
      const programVersionRow = await pg.query(
        `INSERT INTO gamification_program_version (id, gamification_program_id, version_label, approval_status, effective_from) VALUES ($1, $2, $3, 'APPROVED', $4) RETURNING id`,
        [randomUUID(), programId, `dwcag-gate-${suffix}`, now],
      );
      programVersionId = programVersionRow.rows[0].id as string;
    }

    const newXpRuleId = randomUUID();
    const xpRuleRow = await pg.query(
      `INSERT INTO xp_rule (id, program_version_id, activity_type, base_xp, effective_from) VALUES ($1, $2, 'RESPUESTA_VALIDADA', 10, $3) RETURNING id`,
      [newXpRuleId, programVersionId, now],
    );
    createdXpRuleId = xpRuleRow.rows[0].id as string;
    return xpRuleRow.rows[0].id as string;
  }
  // `createdXpRuleId` solo se marca cuando ESTE gate crea la fila -- si
  // reutilizó una regla `xp-core` ya ACTIVA dejada por otra corrida, NO le
  // pertenece y no debe retirarla (podría ser un fixture legítimo de otro
  // proceso que corre concurrentemente).
  let createdXpRuleId: string | null = null;
  const xpRuleId = await findOrCreateXpCoreRule();

  // ============================================================
  console.log('--- A. XP diferido: actividad persistida ACTIVA, cuenta se cierra, XP worker corre después ---');
  const x = await createSession('x');
  const activityXRow = await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, 'RESPUESTA_VALIDADA', 'PENDING', now(), 'v1', $4, 'NOT_EVALUATED') RETURNING id`,
    [randomUUID(), x.accountId, randomUUID(), `response:${randomUUID()}`],
  );
  const activityXId = activityXRow.rows[0].id as string;

  await closeDefinitively(pg, x);

  const grantRunAfterClose = await req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey }, {});
  check('A1. grant-xp status 200', grantRunAfterClose.status === 200);

  const xpEntryX = await pg.query('SELECT id FROM xp_ledger_entry WHERE validated_activity_id = $1', [activityXId]);
  check('A2. NINGÚN xp_ledger_entry creado para la actividad de X (CLOSED)', xpEntryX.rows.length === 0);
  const xpBalanceX = await pg.query('SELECT id FROM xp_balance WHERE account_id = $1', [x.accountId]);
  check('A3. NINGÚN xp_balance recreado para X', xpBalanceX.rows.length === 0);
  const attemptX = await pg.query('SELECT id FROM xp_grant_attempt WHERE validated_activity_id = $1', [activityXId]);
  check('A4. sin xp_grant_attempt (nunca redescubierta -- exclusión central, no bookkeeping de reintento)', attemptX.rows.length === 0);

  const grantRunAgain = await req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey }, {});
  check('A5. segunda corrida también status 200 (nunca reintenta indefinidamente, ni error)', grantRunAgain.status === 200);
  const xpEntryXAfter2 = await pg.query('SELECT id FROM xp_ledger_entry WHERE validated_activity_id = $1', [activityXId]);
  check('A6. tras la segunda corrida, SIGUE sin xp_ledger_entry', xpEntryXAfter2.rows.length === 0);

  // ============================================================
  console.log('--- B. LP diferido: participación ACTIVA + actividad pendiente, cuenta se cierra, LP worker corre después ---');
  const x2 = await createSession('x2');

  await finalizeStaleGateSeasons(pg);
  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const seasonStart = new Date(now.getTime() - 60 * 60 * 1000);
  const seasonEnd = new Date(now.getTime() + 60 * 60 * 1000);
  const existingActiveSeason = await pg.query("SELECT id FROM game_season WHERE status = 'ACTIVE' LIMIT 1");
  let seasonId: string;
  if (existingActiveSeason.rows.length > 0) {
    seasonId = existingActiveSeason.rows[0].id as string;
  } else {
    const season = await seasonRepo.create({ seasonKey: `dwcag-gate-${suffix}`, name: 'Temporada DWCAG', startsAt: seasonStart, endsAt: seasonEnd });
    await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);
    seasonId = season.id;
  }
  await retireStaleGateLeagues(pg);
  const tier = await leagueDefinitionRepo.create({ leagueKey: `dwcag-tier-${suffix}`, name: 'Liga DWCAG', tierOrder: 10, participantGroupSize: 40 });
  const groupRow = await pg.query(
    `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
     VALUES ($1, $2, $3, 1, 40, 'v1-lowest-tier', 'OPEN') RETURNING id`,
    [randomUUID(), seasonId, tier.id],
  );
  const groupId = groupRow.rows[0].id as string;
  const participationRow = await pg.query(
    `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, league_points)
     VALUES ($1, $2, $3, $4, $5, now(), 50) RETURNING id`,
    [randomUUID(), seasonId, x2.accountId, tier.id, groupId],
  );
  const participationId = participationRow.rows[0].id as string;

  const lpRuleRow = await pg.query(
    `INSERT INTO league_point_rule (id, activity_type, base_points, effective_from, rule_version)
     VALUES ($1, 'RESPUESTA_VALIDADA', 1, $2, 'dwcag-gate-rule-v1') RETURNING id`,
    [randomUUID(), seasonStart.toISOString()],
  );
  void lpRuleRow;

  const activityX2Row = await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, 'RESPUESTA_VALIDADA', 'PENDING', now(), 'v1', $4, 'NOT_EVALUATED') RETURNING id`,
    [randomUUID(), x2.accountId, randomUUID(), `response:${randomUUID()}`],
  );
  const activityX2Id = activityX2Row.rows[0].id as string;

  await closeDefinitively(pg, x2);

  const leaguePointsBefore = (await pg.query('SELECT league_points, current_rank FROM season_league_participation WHERE id = $1', [participationId])).rows[0];

  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const groupRepo = new LeagueGroupRepository(prisma);
  const ruleRepo = new LeaguePointRuleRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const quickQuestionAttemptRepo = new QuickQuestionAttemptRepository(prisma);
  const activityRepoForLp = new ValidatedGamificationActivityRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const accountRepoDirect = new AccountRepository(prisma);
  const lpGrantService = new LeaguePointGrantService(
    txRunner,
    activityRepoForLp,
    participationRepo,
    seasonRepo,
    groupRepo,
    ruleRepo,
    ledgerRepo,
    quickQuestionAttemptRepo,
    accountRepoDirect,
  );

  // B0R -- la exclusión central (excludeClosedAccounts) quita a X2 de
  // `eligibleAccountIds` ANTES de siquiera consultar actividades pendientes
  // -- su actividad nunca entra al lote, así que el contador `accountClosed`
  // (reservado para la defensa TOCTOU dentro de la transacción) queda en 0
  // en este caso normal (sin carrera). La prueba real de seguridad son
  // B3/B4/B5 abajo -- ningún rastro de otorgamiento para X2.
  const lpResult = await lpGrantService.grantPending();
  check('B1. grantPending de LP corre sin lanzar', typeof lpResult.granted === 'number');

  const lpEntryX2 = await pg.query('SELECT id FROM league_point_ledger_entry WHERE account_id = $1', [x2.accountId]);
  check('B3. NINGÚN league_point_ledger_entry creado para X2 (CLOSED)', lpEntryX2.rows.length === 0);
  const participationAfter = (await pg.query('SELECT league_points, current_rank FROM season_league_participation WHERE id = $1', [participationId])).rows[0];
  check('B4. leaguePoints SIN cambios', Number(participationAfter.league_points) === Number(leaguePointsBefore.league_points));
  check('B5. currentRank SIN cambios (ninguna mutación de estado competitivo)', participationAfter.current_rank === leaguePointsBefore.current_rank);

  // B6/B7 -- defensa TOCTOU real: llama `grantForActivity` DIRECTAMENTE
  // (sin pasar por `excludeClosedAccounts`), simulando que la actividad ya
  // se había leído como "pendiente" ANTES de que el cierre se confirmara.
  // Debe abortar limpiamente por la relectura DENTRO de la transacción,
  // reutilizando `ClosedConcurrentlyError` -- nunca escribe nada.
  const activityX2 = await activityRepoForLp.findById(activityX2Id);
  const toctouResult = await lpGrantService.grantForActivity(activityX2!);
  check('B6. la relectura DENTRO de la transacción aborta el otorgamiento (CLOSED_CONCURRENTLY)', toctouResult.outcome === 'CLOSED_CONCURRENTLY');
  const lpEntryX2After = await pg.query('SELECT id FROM league_point_ledger_entry WHERE account_id = $1', [x2.accountId]);
  check('B7. sigue sin ningún league_point_ledger_entry tras el intento directo (defensa TOCTOU real)', lpEntryX2After.rows.length === 0);

  // ============================================================
  console.log('--- C. Recompensas diferidas: XP ya otorgado ACTIVA, evaluación pendiente, cuenta se cierra, reward worker corre después ---');
  const x3 = await createSession('x3');
  const activityX3Row = await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, 'RESPUESTA_VALIDADA', 'PENDING', now(), 'v1', $4, 'NOT_EVALUATED') RETURNING id`,
    [randomUUID(), x3.accountId, randomUUID(), `response:${randomUUID()}`],
  );
  const xpEntryX3Row = await pg.query(
    `INSERT INTO xp_ledger_entry (id, account_id, validated_activity_id, xp_rule_id, entry_type, xp_amount, idempotency_key, occurred_at, recorded_at)
     VALUES ($1, $2, $3, $4, 'OTORGAMIENTO', 10, $5, now(), now()) RETURNING id, recorded_at`,
    [randomUUID(), x3.accountId, activityX3Row.rows[0].id, xpRuleId, `grant:${activityX3Row.rows[0].id}`],
  );
  const xpEntryX3Id = xpEntryX3Row.rows[0].id as string;

  console.log('--- D. Recompensa parcial PRE-EXISTENTE para X3: un RewardGrantComponent PENDING sembrado ANTES del cierre ---');
  const titleDefRow = await pg.query(
    `INSERT INTO title_definition (id, title_key, display_text, rarity_class, unlock_source_type, visibility_status)
     VALUES ($1, $2, 'Título DWCAG', 'COMMON', 'TITLE_UNLOCK', 'PUBLIC') RETURNING id`,
    [randomUUID(), `dwcag-title-${suffix}`],
  );
  const rewardBundleRow = await pg.query(`INSERT INTO reward_bundle (id, bundle_key, name) VALUES ($1, $2, 'Bundle DWCAG') RETURNING id`, [
    randomUUID(),
    `dwcag-bundle-${suffix}`,
  ]);
  const rewardGrantRow = await pg.query(
    `INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key)
     VALUES ($1, $2, $3, 'LEVEL', $4, $5) RETURNING id`,
    [randomUUID(), x3.accountId, rewardBundleRow.rows[0].id, `${x3.accountId}:1`, `reward:LEVEL:${x3.accountId}:1`],
  );
  const rewardGrantId = rewardGrantRow.rows[0].id as string;
  const pendingComponentRow = await pg.query(
    `INSERT INTO reward_grant_component (id, reward_grant_id, component_type, reference_id, delivery_status)
     VALUES ($1, $2, 'TITLE', $3, 'PENDING') RETURNING id`,
    [randomUUID(), rewardGrantId, titleDefRow.rows[0].id],
  );
  const pendingComponentId = pendingComponentRow.rows[0].id as string;

  await closeDefinitively(pg, x3);

  const evaluateRunAfterClose = await req('POST', '/gamification/_internal/evaluate-rewards', { 'x-internal-ops-key': opsKey }, {});
  check('C1/D1. evaluate-rewards status 200', evaluateRunAfterClose.status === 200);
  check('C2. accountClosed >= 1 en la respuesta (la cuenta X3 fue omitida terminalmente, no como fallo)', (evaluateRunAfterClose.body?.accountClosed ?? 0) >= 1);

  const cursorX3 = await pg.query('SELECT last_processed_entry_id FROM reward_evaluation_cursor WHERE account_id = $1', [x3.accountId]);
  check('C3. el cursor SÍ avanzó hasta la última entrada pendiente (no reintenta indefinidamente)', cursorX3.rows[0]?.last_processed_entry_id === xpEntryX3Id);

  const achievementProgressX3 = await pg.query('SELECT id FROM achievement_progress WHERE account_id = $1', [x3.accountId]);
  check('C4. NINGÚN achievement_progress nuevo para X3', achievementProgressX3.rows.length === 0);
  const achievementUnlockX3 = await pg.query('SELECT id FROM achievement_unlock WHERE account_id = $1', [x3.accountId]);
  check('C5. NINGÚN achievement_unlock nuevo para X3', achievementUnlockX3.rows.length === 0);
  const newRewardGrantsX3 = await pg.query('SELECT id FROM reward_grant WHERE account_id = $1 AND id != $2', [x3.accountId, rewardGrantId]);
  check('C6. NINGÚN reward_grant NUEVO para X3 (aparte del sembrado antes del cierre)', newRewardGrantsX3.rows.length === 0);
  const accountTitleX3 = await pg.query('SELECT id FROM account_title WHERE account_id = $1', [x3.accountId]);
  check('C7. NINGÚN account_title nuevo para X3', accountTitleX3.rows.length === 0);
  const inventoryItemX3 = await pg.query('SELECT id FROM inventory_item WHERE account_id = $1', [x3.accountId]);
  check('C8. NINGÚN inventory_item nuevo para X3', inventoryItemX3.rows.length === 0);
  const accountChallengeX3 = await pg.query('SELECT id FROM account_challenge WHERE account_id = $1', [x3.accountId]);
  check('C9. NINGÚN account_challenge nuevo para X3', accountChallengeX3.rows.length === 0);

  const pendingComponentAfter = await pg.query('SELECT delivery_status FROM reward_grant_component WHERE id = $1', [pendingComponentId]);
  check('D2. el RewardGrantComponent PRE-EXISTENTE sigue EXACTAMENTE en PENDING (nunca marcado DELIVERED falsamente)', pendingComponentAfter.rows[0]?.delivery_status === 'PENDING');
  check('D3. tampoco se borró (fuera de alcance -- se deja como registro histórico honesto)', pendingComponentAfter.rows.length === 1);

  // ============================================================
  console.log('--- E. Control ACTIVO: una cuenta equivalente sigue procesándose con normalidad ---');
  const y = await createSession('y');
  const activityYRow = await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, 'RESPUESTA_VALIDADA', 'PENDING', now(), 'v1', $4, 'NOT_EVALUATED') RETURNING id`,
    [randomUUID(), y.accountId, randomUUID(), `response:${randomUUID()}`],
  );
  const activityYId = activityYRow.rows[0].id as string;
  const grantRunY = await req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey }, {});
  check('E1. grant-xp status 200', grantRunY.status === 200);
  const xpEntryY = await pg.query('SELECT id FROM xp_ledger_entry WHERE validated_activity_id = $1', [activityYId]);
  check('E2. XP SÍ se otorgó normalmente para la cuenta ACTIVA Y', xpEntryY.rows.length === 1);

  // ============================================================
  console.log('--- F. Control DELETION_PENDING: conserva el comportamiento recuperable existente ---');
  const z = await createSession('z');
  const delZ = await req('POST', '/privacy/account-deletion', z.headers, {});
  check('F1. solicitud de eliminación (DELETION_PENDING) -> 202', delZ.status === 202);
  const accountZStatus = await pg.query('SELECT status FROM account WHERE id = $1', [z.accountId]);
  check('F2. Account.status == DELETION_PENDING (todavía NO CLOSED)', accountZStatus.rows[0]?.status === 'DELETION_PENDING');

  const activityZRow = await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, 'RESPUESTA_VALIDADA', 'PENDING', now(), 'v1', $4, 'NOT_EVALUATED') RETURNING id`,
    [randomUUID(), z.accountId, randomUUID(), `response:${randomUUID()}`],
  );
  const activityZId = activityZRow.rows[0].id as string;
  const grantRunZ = await req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey }, {});
  check('F3. grant-xp status 200', grantRunZ.status === 200);
  const xpEntryZ = await pg.query('SELECT id FROM xp_ledger_entry WHERE validated_activity_id = $1', [activityZId]);
  check('F4. XP SÍ se otorgó para DELETION_PENDING (todavía recuperable, no es CLOSED)', xpEntryZ.rows.length === 1);

  // ============================================================
  console.log('--- G. Regresión C-A: evento tardío de Outbox para cuenta CLOSED sigue ignorado/terminal ---');
  const examAttemptIdG = randomUUID();
  const examIdG = randomUUID();
  const outboxIdG = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'exam_completed', 'v1', 'EXAMS', $2, now(), $3)`,
    [outboxIdG, x.accountId, JSON.stringify({ accountId: x.accountId, examAttemptId: examAttemptIdG, examId: examIdG, completedAt: now.toISOString() })],
  );
  const relayG = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
  check('G1. relay status 200', relayG.status === 200);
  const deliveryG = await pg.query(`SELECT status FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'`, [outboxIdG]);
  check('G2. el evento tardío de X (CLOSED) sigue terminal (PROCESSED), nunca retry infinito', deliveryG.rows[0]?.status === 'PROCESSED');
  const lateDedupKeyG = `ensayo-completado:${x.accountId}:${examIdG}`;
  const newActivityG = await pg.query('SELECT id FROM validated_gamification_activity WHERE deduplication_key = $1', [lateDedupKeyG]);
  check('G3. NINGUNA validated_gamification_activity nueva para el evento tardío (guardia C-A intacta)', newActivityG.rows.length === 0);

  // Este gate SÓLO otorga XP para probar sus escenarios (A/E2/F4) -- deja
  // vigente su regla `dwcag-gate-*` bajo la clave COMPARTIDA `xp-core` tanto
  // como pudiera interferir con otros gates de XP (p.ej. ventanas de corte o
  // backlog histórico de `verify-xp-v1-implementation-gate.ts`). Se retira
  // TODO fixture propio (identificado por el prefijo, nunca por su id --
  // sobrevive incluso a una corrida anterior que crasheó a mitad de camino)
  // al terminar, nunca una regla de otro dueño (p.ej. `v1` real).
  void createdXpRuleId;
  await retireOwnStaleFixtures();

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de guardia de cuenta CERRADA en workers diferidos de GAMIFICATION pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
