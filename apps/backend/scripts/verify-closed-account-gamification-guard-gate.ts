// WEB-0D.1C-A -- guardia de cuenta CERRADA en GAMIFICATION + borrado de
// estado ACTUAL/propiedad seguro al cierre + exclusión del ranking en vivo.
// Mismo patrón híbrido que otros gates de este bloque: HTTP contra el
// servidor real (relay real de GAMIFICATION, cierre definitivo real vía
// /privacy) + acceso directo a Postgres/repositorios para fixtures y
// aserciones no alcanzables solo con HTTP.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { assertGateDb, finalizeStaleGateSeasons, retireStaleGateLeagues } from './gate-db-safety';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeaderboardDefinitionRepository } from '../src/gamification/leaderboard-definition.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { LeaderboardEntryRepository } from '../src/gamification/leaderboard-entry.repository';
import { LeaderboardCalculationService } from '../src/gamification/leaderboard-calculation.service';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { AccountRepository } from '../src/auth/account.repository';
import { PublicProfileRepository } from '../src/user/public-profile.repository';
import { EquippedTitleRepository } from '../src/gamification/equipped-title.repository';
import { EquippedCosmeticRepository } from '../src/gamification/equipped-cosmetic.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { AchievementUnlockRepository } from '../src/gamification/achievement-unlock.repository';
import { FeaturedAchievementRepository } from '../src/gamification/featured-achievement.repository';
import { ObjectStorageService } from '../src/platform/object-storage/object-storage.service';
import { CompetitiveProfileIdentityService } from '../src/user/competitive-profile-identity.service';
import { CompetitiveContextService } from '../src/user/competitive-context.service';
import { CompetitiveLeaderboardService } from '../src/user/competitive-leaderboard.service';
import { CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION } from '@axioma/contracts';
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

async function createSession(uidSuffix: string): Promise<{ accountId: string; token: string; sessionId: string; headers: Record<string, string> }> {
  const uid = `cagg-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    token: idToken,
    sessionId: session.body.sessionId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  const suffix = `${Date.now()}`;
  const now = new Date();

  console.log('--- 0. Fixtures: cuentas X (se cerrará) e Y (control activa) ---');
  const x = await createSession('x');
  const y = await createSession('y');

  const examAttemptIdX = randomUUID();
  const examIdX = randomUUID();
  const outboxIdX = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'exam_completed', 'v1', 'EXAMS', $2, now(), $3)`,
    [outboxIdX, x.accountId, JSON.stringify({ accountId: x.accountId, examAttemptId: examAttemptIdX, examId: examIdX, completedAt: now.toISOString() })],
  );

  console.log('--- 0b. Fixtures C: filas de estado ACTUAL/propiedad seguras (xp_balance, account_title, inventory_item) para X, ANTES del cierre ---');
  const titleDefRow = await pg.query(
    `INSERT INTO title_definition (id, title_key, display_text, rarity_class, unlock_source_type, visibility_status)
     VALUES ($1, $2, 'Título de prueba', 'COMMON', 'TITLE_UNLOCK', 'PUBLIC') RETURNING id`,
    [randomUUID(), `cagg-title-${suffix}`],
  );
  const titleDefId = titleDefRow.rows[0].id as string;
  await pg.query(
    `INSERT INTO account_title (id, account_id, title_definition_id, acquisition_source_type, acquisition_source_id, acquired_at)
     VALUES ($1, $2, $3, 'TITLE_UNLOCK', $4, now())`,
    [randomUUID(), x.accountId, titleDefId, `${x.accountId}:cagg-title-${suffix}`],
  );

  const cosmeticItemRow = await pg.query(
    `INSERT INTO cosmetic_item (id, item_key, item_type, name, rarity_class, asset_reference, visibility_status)
     VALUES ($1, $2, 'AVATAR', 'Avatar de prueba', 'COMMON', $3, 'PUBLIC') RETURNING id`,
    [randomUUID(), `cagg-cosmetic-${suffix}`, `asset://cagg-gate/${suffix}`],
  );
  const cosmeticItemId = cosmeticItemRow.rows[0].id as string;
  await pg.query(
    `INSERT INTO inventory_item (id, account_id, cosmetic_item_id, acquisition_source_type, acquisition_source_id, acquired_at)
     VALUES ($1, $2, $3, 'LEVEL', $4, now())`,
    [randomUUID(), x.accountId, cosmeticItemId, `${x.accountId}:1`],
  );

  await pg.query(`INSERT INTO xp_balance (id, account_id, lifetime_xp) VALUES ($1, $2, 500)`, [randomUUID(), x.accountId]);

  console.log('--- 0c. Fixtures D: filas HISTÓRICAS/ledger para X, ANTES del cierre (deben preservarse intactas) ---');
  const historicalActivityRow = await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, 'RESPUESTA_VALIDADA', 'PENDING', now(), 'v1', $4, 'NOT_EVALUATED') RETURNING id`,
    [randomUUID(), x.accountId, randomUUID(), `response:${randomUUID()}`],
  );
  const historicalActivityId = historicalActivityRow.rows[0].id as string;
  // xp_ledger_entry.entryType='OTORGAMIENTO' exige xp_rule_id (CHECK de
  // base de datos) -- cadena mínima program -> program_version -> xp_rule.
  const programRow = await pg.query(
    `INSERT INTO gamification_program (id, program_key, name, program_type) VALUES ($1, $2, 'Programa CAGG', 'XP') RETURNING id`,
    [randomUUID(), `cagg-program-${suffix}`],
  );
  const programVersionRow = await pg.query(
    `INSERT INTO gamification_program_version (id, gamification_program_id, version_label, approval_status) VALUES ($1, $2, 'v1', 'APPROVED') RETURNING id`,
    [randomUUID(), programRow.rows[0].id],
  );
  const xpRuleRow = await pg.query(
    `INSERT INTO xp_rule (id, program_version_id, activity_type, base_xp) VALUES ($1, $2, $3, 20) RETURNING id`,
    [randomUUID(), programVersionRow.rows[0].id, `cagg-activity-${suffix}`],
  );
  const historicalXpEntryRow = await pg.query(
    `INSERT INTO xp_ledger_entry (id, account_id, validated_activity_id, xp_rule_id, entry_type, xp_amount, idempotency_key, occurred_at)
     VALUES ($1, $2, $3, $4, 'OTORGAMIENTO', 20, $5, now()) RETURNING id`,
    [randomUUID(), x.accountId, historicalActivityId, xpRuleRow.rows[0].id, `grant:${historicalActivityId}`],
  );
  const historicalXpEntryId = historicalXpEntryRow.rows[0].id as string;

  console.log('--- 1. Cierre definitivo REAL de X, ANTES de que el relay procese el evento pendiente ---');
  const deletionReq = await req('POST', '/privacy/account-deletion', x.headers, {});
  check('solicitud de eliminación -> 202', deletionReq.status === 202);
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [x.accountId]);
  const sweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  check('barrido de cierre definitivo -> 200', sweep.status === 200);
  check('barrido procesó al menos 1 cuenta', (sweep.body?.deletion?.processed ?? 0) >= 1);

  const accountXAfterClosure = await pg.query('SELECT status FROM account WHERE id = $1', [x.accountId]);
  check('Account.status == CLOSED', accountXAfterClosure.rows[0]?.status === 'CLOSED');

  console.log('--- C. Borrado de estado ACTUAL/propiedad seguro tras el cierre ---');
  const xpBalanceAfter = await pg.query('SELECT id FROM xp_balance WHERE account_id = $1', [x.accountId]);
  check('C1. xp_balance de X fue BORRADO', xpBalanceAfter.rows.length === 0);
  const accountTitleAfter = await pg.query('SELECT id FROM account_title WHERE account_id = $1', [x.accountId]);
  check('C2. account_title de X fue BORRADO', accountTitleAfter.rows.length === 0);
  const inventoryItemAfter = await pg.query('SELECT id FROM inventory_item WHERE account_id = $1', [x.accountId]);
  check('C3. inventory_item de X fue BORRADO', inventoryItemAfter.rows.length === 0);
  // El catálogo (title_definition/cosmetic_item) NUNCA se toca -- no es dato personal.
  const catalogIntact = await pg.query('SELECT id FROM title_definition WHERE id = $1 UNION SELECT id FROM cosmetic_item WHERE id = $2', [titleDefId, cosmeticItemId]);
  check('C4. catálogo (title_definition + cosmetic_item) intacto', catalogIntact.rows.length === 2);

  console.log('--- D. Preservación histórica: los ledgers de X NO se tocan en este bloque ---');
  const activityAfter = await pg.query('SELECT account_id, deduplication_key FROM validated_gamification_activity WHERE id = $1', [historicalActivityId]);
  check('D1. validated_gamification_activity histórica de X sigue existiendo', activityAfter.rows.length === 1);
  check('D2. accountId histórico SIGUE presente (no remediado en este bloque)', activityAfter.rows[0]?.account_id === x.accountId);
  const xpEntryAfter = await pg.query('SELECT account_id, xp_amount FROM xp_ledger_entry WHERE id = $1', [historicalXpEntryId]);
  check('D3. xp_ledger_entry histórico de X sigue existiendo, sin cambios', xpEntryAfter.rows.length === 1 && Number(xpEntryAfter.rows[0]?.xp_amount) === 20);
  check('D4. accountId del ledger histórico SIGUE presente', xpEntryAfter.rows[0]?.account_id === x.accountId);

  console.log('--- A. Late Outbox event para X (CLOSED): el relay real NO crea estado nuevo ---');
  const relayAfterClosure = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
  check('A1. relay status 200', relayAfterClosure.status === 200);

  const deliveryX = await pg.query(
    `SELECT status, attempts, terminal_at FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'`,
    [outboxIdX],
  );
  check('A2. el evento tardío de X se volvió terminal (PROCESSED) -- NUNCA throw/retry solo por estar CLOSED', deliveryX.rows[0]?.status === 'PROCESSED');
  check('A3. terminal_at exacto quedó registrado', deliveryX.rows[0]?.terminal_at !== null);

  const lateDedupKey = `ensayo-completado:${x.accountId}:${examIdX}`;
  const newActivityForX = await pg.query('SELECT id FROM validated_gamification_activity WHERE deduplication_key = $1', [lateDedupKey]);
  check('A4. NINGUNA validated_gamification_activity nueva para el evento tardío de X', newActivityForX.rows.length === 0);
  const xpBalanceRecreated = await pg.query('SELECT id FROM xp_balance WHERE account_id = $1', [x.accountId]);
  check('A5. xp_balance de X sigue sin existir (no se recreó estado de XP)', xpBalanceRecreated.rows.length === 0);
  const anyNewXpEntryForX = await pg.query('SELECT id FROM xp_ledger_entry WHERE account_id = $1 AND id != $2', [x.accountId, historicalXpEntryId]);
  check('A6. NINGÚN xp_ledger_entry nuevo para X (solo el histórico preexistente)', anyNewXpEntryForX.rows.length === 0);
  const anyLpEntryForX = await pg.query('SELECT id FROM league_point_ledger_entry WHERE account_id = $1', [x.accountId]);
  check('A7. NINGÚN league_point_ledger_entry para X', anyLpEntryForX.rows.length === 0);
  const anyAccountTitleForX = await pg.query('SELECT id FROM account_title WHERE account_id = $1', [x.accountId]);
  check('A8. NINGÚN account_title nuevo para X (sigue borrado, no recreado)', anyAccountTitleForX.rows.length === 0);
  const anyInventoryItemForX = await pg.query('SELECT id FROM inventory_item WHERE account_id = $1', [x.accountId]);
  check('A9. NINGÚN inventory_item nuevo para X', anyInventoryItemForX.rows.length === 0);
  const anyChallengeForX = await pg.query('SELECT id FROM account_challenge WHERE account_id = $1', [x.accountId]);
  check('A10. NINGÚN account_challenge nuevo para X', anyChallengeForX.rows.length === 0);

  console.log('--- F. Interacción con el ciclo de vida de privacidad de Outbox: minimización inmediata sigue funcionando para el evento ignorado ---');
  const outboxEventXAfter = await pg.query('SELECT aggregate_id, payload FROM outbox_event WHERE id = $1', [outboxIdX]);
  check('F1. aggregate_id del evento de X es NULL (minimización inmediata corrió tras volverse terminal)', outboxEventXAfter.rows[0]?.aggregate_id === null);
  check('F2. payload.accountId removido del evento de X', !('accountId' in (outboxEventXAfter.rows[0]?.payload ?? {})));
  check('F3. examAttemptId preservado en el payload minimizado', outboxEventXAfter.rows[0]?.payload?.examAttemptId === examAttemptIdX);

  console.log('--- B. Cuenta ACTIVA de control (Y): el mismo tipo de evento SÍ crea estado normalmente ---');
  const examAttemptIdY = randomUUID();
  const examIdY = randomUUID();
  const outboxIdY = randomUUID();
  await pg.query(
    `INSERT INTO outbox_event (id, event_key, schema_version, source_domain, aggregate_id, occurred_at, payload)
     VALUES ($1, 'exam_completed', 'v1', 'EXAMS', $2, now(), $3)`,
    [outboxIdY, y.accountId, JSON.stringify({ accountId: y.accountId, examAttemptId: examAttemptIdY, examId: examIdY, completedAt: now.toISOString() })],
  );
  const relayForY = await req('POST', '/gamification/_internal/relay', { 'x-internal-ops-key': opsKey }, {});
  check('B1. relay status 200', relayForY.status === 200);

  const dedupKeyY = `ensayo-completado:${y.accountId}:${examIdY}`;
  const activityY = await pg.query('SELECT account_id, activity_type FROM validated_gamification_activity WHERE deduplication_key = $1', [dedupKeyY]);
  check('B2. validated_gamification_activity SÍ se creó para la cuenta ACTIVA Y', activityY.rows.length === 1);
  check('B3. accountId correcto', activityY.rows[0]?.account_id === y.accountId);
  check('B4. activityType == ENSAYO_COMPLETADO', activityY.rows[0]?.activity_type === 'ENSAYO_COMPLETADO');
  const deliveryY = await pg.query(`SELECT status FROM outbox_event_delivery WHERE outbox_event_id = $1 AND consumer_name = 'GAMIFICATION'`, [outboxIdY]);
  check('B5. delivery de Y quedó PROCESSED normalmente', deliveryY.rows[0]?.status === 'PROCESSED');

  console.log('--- E. Ranking en vivo: X (CLOSED) desaparece por completo, Y permanece ---');
  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leaderboardDefinitionRepo = new LeaderboardDefinitionRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const entryRepo = new LeaderboardEntryRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const calculationService = new LeaderboardCalculationService(leaderboardDefinitionRepo, participationRepo, ledgerRepo, entryRepo);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const accountRepoDirect = new AccountRepository(prisma);

  // `game_season` admite una ÚNICA fila ACTIVE a la vez (índice único
  // parcial) -- si ya existe una temporada real/residual ACTIVE en esta DB
  // de gates compartida, se reutiliza (solo se lee su id, nunca se muta)
  // en vez de competir por crear una segunda. Si no existe ninguna, se crea
  // la propia del fixture, mismo criterio que otros gates competitivos.
  const existingActiveSeason = await pg.query("SELECT id FROM game_season WHERE status = 'ACTIVE' LIMIT 1");
  let seasonId: string;
  if (existingActiveSeason.rows.length > 0) {
    seasonId = existingActiveSeason.rows[0].id as string;
  } else {
    await finalizeStaleGateSeasons(pg);
    const seasonStart = new Date(now.getTime() - 60 * 60 * 1000);
    const seasonEnd = new Date(now.getTime() + 60 * 60 * 1000);
    const season = await seasonRepo.create({ seasonKey: `cagg-gate-${suffix}`, name: 'Temporada CAGG', startsAt: seasonStart, endsAt: seasonEnd });
    await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);
    seasonId = season.id;
  }
  await retireStaleGateLeagues(pg);
  const tier = await leagueDefinitionRepo.create({ leagueKey: `cagg-tier-${suffix}`, name: 'Liga CAGG', tierOrder: 10, participantGroupSize: 40 });
  const groupRow = await pg.query(
    `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
     VALUES ($1, $2, $3, 1, 40, 'v1-lowest-tier', 'OPEN') RETURNING id`,
    [randomUUID(), seasonId, tier.id],
  );
  const groupId = groupRow.rows[0].id as string;

  // Y necesita un public_profile VISIBLE con Términos aceptados para que el
  // ranking la resuelva como presentable (irrelevante para la exclusión de
  // X, que ocurre ANTES de resolver identidad). X ya tiene su
  // public_profile ANONYMIZED por el cierre real -- no se toca aquí.
  await pg.query(
    `INSERT INTO public_profile (id, account_id, username_normalized, visibility_status, lifecycle_status, username_changed_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'VISIBLE', 'ACTIVE', now(), now(), now())`,
    [randomUUID(), y.accountId, `cagg-y-${suffix}`.toLowerCase()],
  );
  await pg.query('UPDATE account SET public_terms_accepted_version = $2, public_terms_accepted_at = now() WHERE id = $1', [y.accountId, CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION]);

  async function join(accountId: string, metricValue: number): Promise<void> {
    const p = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, league_points)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), seasonId, accountId, tier.id, groupId, now.toISOString(), metricValue],
    );
    void p;
  }
  await join(x.accountId, 90); // X participó ANTES de cerrarse -- la fila queda, se prueba que NO aparece en el ranking en vivo.
  await join(y.accountId, 80);

  const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();
  await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, seasonId, groupId));

  const publicProfileRepoDirect = new PublicProfileRepository(prisma);
  const equippedTitleRepoDirect = new EquippedTitleRepository(prisma);
  const equippedCosmeticRepoDirect = new EquippedCosmeticRepository(prisma);
  const xpBalanceRepoDirect = new XpBalanceRepository(prisma);
  const levelDefinitionRepoDirect = new LevelDefinitionRepository(prisma);
  const achievementUnlockRepoDirect = new AchievementUnlockRepository(prisma);
  const featuredAchievementRepoDirect = new FeaturedAchievementRepository(prisma);
  const objectStorageDirect = new ObjectStorageService(new ConfigService());
  const identityServiceDirect = new CompetitiveProfileIdentityService(
    publicProfileRepoDirect,
    equippedTitleRepoDirect,
    equippedCosmeticRepoDirect,
    xpBalanceRepoDirect,
    levelDefinitionRepoDirect,
    achievementUnlockRepoDirect,
    featuredAchievementRepoDirect,
    objectStorageDirect,
  );
  const contextServiceDirect = new CompetitiveContextService(participationRepo, entryRepo, leaderboardDefinitionRepo, leagueGroupRepo, leagueDefinitionRepo);
  const leaderboardServiceDirect = new CompetitiveLeaderboardService(
    participationRepo,
    entryRepo,
    leaderboardDefinitionRepo,
    identityServiceDirect,
    contextServiceDirect,
    leagueGroupRepo,
    leagueDefinitionRepo,
    undefined, // accountBlockRepo -- no bloqueos en este gate
    accountRepoDirect,
  );

  const pageForY = await leaderboardServiceDirect.resolvePage(y.accountId, { limit: 20 });
  check('E1. exactamente 1 fila visible (solo Y -- X excluida por completo)', pageForY.entries.length === 1);
  check('E2. Y SIGUE presente en el ranking', pageForY.entries.some((r) => r.isCurrentUser));
  const xInPage = JSON.stringify(pageForY.entries).includes(x.accountId);
  check('E3. accountId de X no aparece en absoluto en la respuesta del ranking', !xInPage);

  console.log('--- E4. Snapshots históricos finalizados: fuera de alcance, sin cambios de este bloque ---');
  const snapshotCountBefore = await pg.query('SELECT count(*)::int n FROM leaderboard_snapshot');
  check('E4. ninguna fila de leaderboard_snapshot fue creada/tocada por este gate (0 esperado en esta corrida aislada)', Number(snapshotCountBefore.rows[0].n) === 0);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de seguridad de gamificación para cuentas CERRADAS pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
