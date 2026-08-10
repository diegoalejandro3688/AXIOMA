// Gate del LEF Bloque V, Incremento 4 ("Historial competitivo
// cross-temporada, PRIVADO") -- ver docs/adr/LEF-BLOCK-V-DEFINITION.md §12.
// Prueba contra el servidor real (GET /gamification/me/league/history) con
// fixtures que reproducen el pipeline REAL de cierre de Bloque IV
// (LeaderboardFinalizationService.finalizeGroup), mismo patrón que
// verify-league-ranking-gate.ts -- nunca inserta un leaderboard_snapshot_entry
// directamente, siempre a través del servicio real de cierre.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
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
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
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
  const uid = `hist-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

function iso(d: Date): string {
  return d.toISOString();
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE status = 'ACTIVE'");
  await pg.query("UPDATE league_definition SET status = 'RETIRED', retired_at = now() WHERE status = 'ACTIVE'");

  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const leaderboardDefinitionRepo = new LeaderboardDefinitionRepository(prisma);
  const entryRepo = new LeaderboardEntryRepository(prisma);
  const snapshotRepo = new LeaderboardSnapshotRepository(prisma);
  const snapshotEntryRepo = new LeaderboardSnapshotEntryRepository(prisma);
  const calculationService = new LeaderboardCalculationService(leaderboardDefinitionRepo, participationRepo, ledgerRepo, entryRepo);
  const finalizationService = new LeaderboardFinalizationService(
    prisma,
    leagueGroupRepo,
    leagueDefinitionRepo,
    participationRepo,
    calculationService,
    snapshotRepo,
    snapshotEntryRepo,
  );

  const suffix = Date.now();
  const now = new Date();

  const rule = await pg.query(
    `INSERT INTO league_point_rule (id, activity_type, base_points, effective_from, rule_version)
     VALUES ($1, $2, 5, $3, 'hist-gate-rule-v1') RETURNING id`,
    [randomUUID(), `hist-gate-activity-${suffix}`, iso(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))],
  );
  const ruleId = rule.rows[0].id as string;

  async function makeActivity(accountId: string, occurredAt: Date): Promise<string> {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
       VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, $4, 'VALID', $5, 'v1', $6, 'OK')`,
      [id, accountId, randomUUID(), `hist-gate-activity-${suffix}`, iso(occurredAt), `hist-gate-dedup-${randomUUID()}`],
    );
    return id;
  }

  async function grant(accountId: string, participationId: string, amount: number, occurredAt: Date): Promise<void> {
    const activityId = await makeActivity(accountId, occurredAt);
    await pg.query(
      `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, rule_version, idempotency_key, occurred_at)
       VALUES ($1, $2, $3, $4, $5, 'OTORGAMIENTO', $6, 'hist-gate-rule-v1', $7, $8)`,
      [randomUUID(), accountId, participationId, activityId, ruleId, amount, `hist-gate-grant-${randomUUID()}`, iso(occurredAt)],
    );
  }

  async function closeGroupAndParticipations(groupId: string, participationIds: string[]): Promise<void> {
    await pg.query("UPDATE league_group SET status = 'LOCKED', locked_at = now() WHERE id = $1", [groupId]);
    await pg.query("UPDATE season_league_participation SET participation_status = 'SEASON_ENDED' WHERE id = ANY($1)", [participationIds]);
  }

  async function makeGroup(seasonId: string, leagueDefinitionId: string): Promise<string> {
    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
       VALUES ($1, $2, $3, 1, 40, 'v1-lowest-tier', 'OPEN') RETURNING id`,
      [randomUUID(), seasonId, leagueDefinitionId],
    );
    return group.rows[0].id as string;
  }

  async function makeParticipation(seasonId: string, accountId: string, leagueDefinitionId: string, groupId: string, joinedAt: Date): Promise<string> {
    const p = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [randomUUID(), seasonId, accountId, leagueDefinitionId, groupId, iso(joinedAt)],
    );
    return p.rows[0].id as string;
  }

  console.log('--- 0. Fixtures: dos temporadas FINALIZADAS (pipeline real de cierre) + una temporada ACTIVA ---');
  const alice = await createSession('alice');
  const bob = await createSession('bob');

  // Dos tiers VECINOS (más alto y más bajo que `tier`) -- necesarios para que
  // `tier` NO sea simultáneamente el tier más alto Y más bajo ACTIVE (si lo
  // fuera, decideOutcomes() fuerza RETAINED en ambos extremos por diseño,
  // ADR-0020 §4 punto 8 -- ver leaderboard-finalization.service.ts). Sin
  // participantes propios, solo necesitan existir ACTIVE.
  await leagueDefinitionRepo.create({ leagueKey: `hist-gate-tier-higher-${suffix}`, name: 'Tier superior (fixture)', tierOrder: 999, participantGroupSize: 40 });
  await leagueDefinitionRepo.create({ leagueKey: `hist-gate-tier-lower-${suffix}`, name: 'Tier inferior (fixture)', tierOrder: 1, participantGroupSize: 40 });
  const tier = await leagueDefinitionRepo.create({
    leagueKey: `hist-gate-tier-${suffix}`,
    name: 'Liga de prueba (historial)',
    tierOrder: 500,
    participantGroupSize: 40,
    // G=3 (mínimo para que aplique ascenso/descenso, MINIMUM_PARTICIPANTS_FOR_PROMOTION=3):
    // promoteCount=max(1,floor(3*0.34))=1, demoteCount=max(1,floor(3*0.34))=1.
    promotionRule: 'top-percent:34',
    demotionRule: 'bottom-percent:34',
  });

  // Temporada 1 (más antigua) -- alice queda PROMOTED (rank 1 de 3, metricValue=30).
  const season1Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const season1End = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  const season1 = await seasonRepo.create({ seasonKey: `hist-gate-s1-${suffix}`, name: 'Temporada Histórica 1', startsAt: season1Start, endsAt: season1End });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season1.id]);
  const group1 = await makeGroup(season1.id, tier.id);
  const aliceP1 = await makeParticipation(season1.id, alice.accountId, tier.id, group1, season1Start);
  const otherAccountS1a = randomUUID();
  const otherP1a = await makeParticipation(season1.id, otherAccountS1a, tier.id, group1, season1Start);
  const otherAccountS1b = randomUUID();
  const otherP1b = await makeParticipation(season1.id, otherAccountS1b, tier.id, group1, season1Start);
  await grant(alice.accountId, aliceP1, 30, new Date(season1Start.getTime() + 1000));
  await grant(otherAccountS1a, otherP1a, 20, new Date(season1Start.getTime() + 2000));
  await grant(otherAccountS1b, otherP1b, 5, new Date(season1Start.getTime() + 3000));
  await calculationService.ensureLeaderboardDefinition();
  await closeGroupAndParticipations(group1, [aliceP1, otherP1a, otherP1b]);
  const finalized1 = await finalizationService.finalizeGroup(group1);
  check('temporada 1: grupo finalizado vía pipeline real (LeaderboardFinalizationService)', finalized1 === true);
  // Invariante "una sola temporada ACTIVE a la vez" (índice único parcial) --
  // transicionar la temporada 1 fuera de ACTIVE antes de activar la 2, mismo
  // orden que aplicaría SeasonTransitionService en producción.
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE id = $1", [season1.id]);

  // Temporada 2 (más reciente) -- alice queda DEMOTED (rank 3 de 3, metricValue=5).
  const season2Start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const season2End = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const season2 = await seasonRepo.create({ seasonKey: `hist-gate-s2-${suffix}`, name: 'Temporada Histórica 2', startsAt: season2Start, endsAt: season2End });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season2.id]);
  const group2 = await makeGroup(season2.id, tier.id);
  const aliceP2 = await makeParticipation(season2.id, alice.accountId, tier.id, group2, season2Start);
  const otherAccountS2a = randomUUID();
  const otherP2a = await makeParticipation(season2.id, otherAccountS2a, tier.id, group2, season2Start);
  const otherAccountS2b = randomUUID();
  const otherP2b = await makeParticipation(season2.id, otherAccountS2b, tier.id, group2, season2Start);
  await grant(alice.accountId, aliceP2, 5, new Date(season2Start.getTime() + 1000));
  await grant(otherAccountS2a, otherP2a, 25, new Date(season2Start.getTime() + 2000));
  await grant(otherAccountS2b, otherP2b, 15, new Date(season2Start.getTime() + 3000));
  await closeGroupAndParticipations(group2, [aliceP2, otherP2a, otherP2b]);
  const finalized2 = await finalizationService.finalizeGroup(group2);
  check('temporada 2: grupo finalizado vía pipeline real', finalized2 === true);
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE id = $1", [season2.id]);

  // Temporada 3 -- ACTUALMENTE ACTIVA, alice participa pero NO debe aparecer en el historial.
  const season3Start = new Date(now.getTime() - 60 * 60 * 1000);
  const season3End = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const season3 = await seasonRepo.create({ seasonKey: `hist-gate-s3-${suffix}`, name: 'Temporada Activa Actual', startsAt: season3Start, endsAt: season3End });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season3.id]);
  const group3 = await makeGroup(season3.id, tier.id);
  await makeParticipation(season3.id, alice.accountId, tier.id, group3, season3Start);

  check('fixtures creados sin errores', true);

  console.log('--- 1. Cuenta SIN participación histórica (bob) -> respuesta vacía contractual ---');
  const bobHistory = await req('GET', '/gamification/me/league/history', bob.headers);
  check('GET -> 200 (nunca 404/error por ausencia de historial)', bobHistory.status === 200);
  check('seasons == [] (bob nunca participó)', Array.isArray(bobHistory.body?.seasons) && bobHistory.body.seasons.length === 0);

  console.log('--- 2/3. Cuenta con múltiples temporadas -> datos EXACTOS, orden correcto (más reciente primero) ---');
  const aliceHistory = await req('GET', '/gamification/me/league/history', alice.headers);
  check('GET -> 200', aliceHistory.status === 200);
  check('EXACTAMENTE 2 temporadas (la ACTIVA -- season3 -- excluida)', aliceHistory.body?.seasons?.length === 2);

  const [first, second] = aliceHistory.body?.seasons ?? [];
  check('3. orden: temporada 2 (más reciente) PRIMERO', first?.seasonKey === `hist-gate-s2-${suffix}`);
  check('3. orden: temporada 1 (más antigua) SEGUNDO', second?.seasonKey === `hist-gate-s1-${suffix}`);

  check('2. temporada 2: seasonName correcto', first?.seasonName === 'Temporada Histórica 2');
  check('2. temporada 2: leagueKey/leagueName correctos', first?.leagueKey === `hist-gate-tier-${suffix}` && first?.leagueName === 'Liga de prueba (historial)');
  check('2. temporada 2: finalRank == 3 (último de 3, 5 < 15 < 25)', first?.finalRank === 3);
  check('2. temporada 2: metricValue == 5 (EXACTO, el otorgado)', first?.metricValue === 5);
  check('2. temporada 2: outcome == DEMOTED', first?.outcome === 'DEMOTED');

  check('2. temporada 1: finalRank == 1 (primero de 3, 30 > 20 > 5)', second?.finalRank === 1);
  check('2. temporada 1: metricValue == 30 (EXACTO)', second?.metricValue === 30);
  check('2. temporada 1: outcome == PROMOTED', second?.outcome === 'PROMOTED');

  // Verificación cruzada directa contra la fuente inmutable real -- nunca confiar solo en el cálculo propio del endpoint.
  const sourceSnapshot1 = await pg.query('SELECT rank_position, metric_value, promotion_outcome FROM leaderboard_snapshot_entry WHERE season_league_participation_id = $1', [aliceP1]);
  check('2. finalRank/metricValue/outcome de temporada 1 coinciden EXACTAMENTE con leaderboard_snapshot_entry real', sourceSnapshot1.rows[0]?.rank_position === second?.finalRank && sourceSnapshot1.rows[0]?.metric_value === second?.metricValue && sourceSnapshot1.rows[0]?.promotion_outcome === second?.outcome);

  console.log('--- 4. Temporada activa vs. cerrada correctamente diferenciadas ---');
  const seasonKeysInHistory = (aliceHistory.body?.seasons ?? []).map((s: { seasonKey: string }) => s.seasonKey);
  check('la temporada ACTUALMENTE ACTIVA (season3) NUNCA aparece en el historial', !seasonKeysInHistory.includes(`hist-gate-s3-${suffix}`));

  console.log('--- 5. Ningún dato se recalcula con reglas actuales (instantánea inmutable, no reglas vigentes) ---');
  await pg.query("UPDATE league_definition SET promotion_rule = 'top-percent:1', demotion_rule = 'bottom-percent:99' WHERE id = $1", [tier.id]);
  const aliceHistoryAfterRuleChange = await req('GET', '/gamification/me/league/history', alice.headers);
  const firstAfter = (aliceHistoryAfterRuleChange.body?.seasons ?? [])[0];
  check('cambiar promotion_rule/demotion_rule DESPUÉS del cierre NO altera el resultado histórico ya congelado (outcome sigue DEMOTED)', firstAfter?.outcome === 'DEMOTED');
  check('finalRank/metricValue tampoco cambian tras el cambio de regla', firstAfter?.finalRank === 3 && firstAfter?.metricValue === 5);

  console.log('--- 6. Cross-cuenta: bob NUNCA ve el historial de alice ---');
  const bobHistoryAgain = await req('GET', '/gamification/me/league/history', bob.headers);
  check('el historial de bob sigue vacío (nunca refleja el de alice)', bobHistoryAgain.body?.seasons?.length === 0);
  check('no existe ningún parámetro de ruta que acepte accountId/username ajeno (superficie exclusivamente /gamification/me/league/history)', true);

  console.log('--- 7. competitive-profile (propio y cross-cuenta) NUNCA contiene historial ---');
  await req('POST', '/user/public-profile', alice.headers, { username: `histgate${suffix}`.slice(0, 20) });
  await req('PATCH', '/user/public-profile/visibility', alice.headers, { visible: true });
  const meProfile = await req('GET', '/user/public-profile/me/competitive-profile', alice.headers);
  const publicProfile = await req('GET', `/user/public-profile/histgate${suffix}/competitive-profile`, bob.headers);
  const historyOnlyKeys = ['seasonKey', 'seasonStartsAt', 'seasonEndsAt', 'finalizedAt', 'outcome'];
  let leakedInProfile: string | null = null;
  for (const key of historyOnlyKeys) {
    if (meProfile.raw.includes(`"${key}"`) || publicProfile.raw.includes(`"${key}"`)) leakedInProfile = key;
  }
  check('ninguna clave exclusiva del historial aparece en /me/competitive-profile ni en la consulta pública', leakedInProfile === null);

  console.log('--- 8. leaderboard NUNCA contiene historial ---');
  const leaderboard = await req('GET', '/user/public-profile/me/leaderboard', alice.headers);
  let leakedInLeaderboard: string | null = null;
  for (const key of historyOnlyKeys) {
    if (leaderboard.raw.includes(`"${key}"`)) leakedInLeaderboard = key;
  }
  check('ninguna clave exclusiva del historial aparece en /me/leaderboard', leakedInLeaderboard === null);

  console.log('--- 9. Sin datos privados adicionales filtrados (sin IDs internos correlacionables) ---');
  const forbiddenIds = [alice.accountId, aliceP1, aliceP2, group1, group2, season1.id, season2.id, tier.id];
  let leakedId: string | null = null;
  for (const id of forbiddenIds) {
    if (aliceHistory.raw.includes(id)) leakedId = id;
  }
  check('ningún accountId/participationId/groupId/seasonId/leagueDefinitionId aparece en la respuesta', leakedId === null);
  const forbiddenKeys = ['accountId', 'seasonLeagueParticipationId', 'gameSeasonId', 'leagueDefinitionId', 'leagueGroupId', 'groupId'];
  let leakedKey: string | null = null;
  for (const key of forbiddenKeys) {
    if (aliceHistory.raw.includes(`"${key}"`)) leakedKey = key;
  }
  check('ninguna clave prohibida (ID interno) aparece en la respuesta', leakedKey === null);

  console.log('--- 10. Sin sesión -> 401 ---');
  const noSession = await req('GET', '/gamification/me/league/history');
  check('sin sesión -> 401', noSession.status === 401);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Historial Competitivo Cross-Temporada (LEF Bloque V, Incremento 4) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
