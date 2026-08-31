// Gate del Bloque IV, Incremento 3, sub-incremento 3.c ("Lista de ranking
// con redacción", ADR-0021 §1/§5, precisiones obligatorias del Product
// Owner 2026-08-06) -- prueba contra el servidor real
// (GET /user/public-profile/me/leaderboard), mismo criterio que
// verify-competitive-profile-endpoint-gate.ts (3.b).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ObjectStorageService } from '../src/platform/object-storage/object-storage.service';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeaderboardDefinitionRepository } from '../src/gamification/leaderboard-definition.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { LeaderboardEntryRepository } from '../src/gamification/leaderboard-entry.repository';
import { LeaderboardCalculationService } from '../src/gamification/leaderboard-calculation.service';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { EquippedTitleRepository } from '../src/gamification/equipped-title.repository';
import { EquippedCosmeticRepository } from '../src/gamification/equipped-cosmetic.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { AchievementUnlockRepository } from '../src/gamification/achievement-unlock.repository';
import { FeaturedAchievementRepository } from '../src/gamification/featured-achievement.repository';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { PublicProfileRepository } from '../src/user/public-profile.repository';
import { CompetitiveProfileIdentityService } from '../src/user/competitive-profile-identity.service';
import { CompetitiveContextService } from '../src/user/competitive-context.service';
import { CompetitiveLeaderboardService } from '../src/user/competitive-leaderboard.service';
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

/** Decodifica una URL firmada y confirma que su pathname termina exactamente en la object key esperada -- no depende de cómo el presigner codifique/genere la URL. */
function expectSignedUrlForKey(url: string | null, expectedKey: string): boolean {
  if (!url) return false;
  try {
    const decodedPath = decodeURIComponent(new URL(url).pathname);
    return decodedPath.endsWith(expectedKey);
  } catch {
    return false;
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
  const uid = `cple-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter, log: [{ emit: 'event', level: 'query' }] }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  let queryCount = 0;
  (prisma as unknown as { $on: (event: 'query', cb: () => void) => void }).$on('query', () => {
    queryCount++;
  });

  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leaderboardDefinitionRepo = new LeaderboardDefinitionRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const entryRepo = new LeaderboardEntryRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const calculationService = new LeaderboardCalculationService(leaderboardDefinitionRepo, participationRepo, ledgerRepo, entryRepo);

  const suffix = Date.now();
  const now = new Date();
  const seasonStart = new Date(now.getTime() - 60 * 60 * 1000);
  const seasonEnd = new Date(now.getTime() + 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString();

  console.log('--- 0. Fixtures: sesión real (self), grupo real con participantes de todos los estados de presentabilidad ---');

  const self = await createSession('self'); // PRIVATE -- prueba la excepción de autoconsulta

  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE status = 'ACTIVE'");
  const season = await seasonRepo.create({ seasonKey: `cple-gate-${suffix}`, name: 'Temporada CPLE', startsAt: seasonStart, endsAt: seasonEnd });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);
  await pg.query("UPDATE league_definition SET status = 'RETIRED', retired_at = now() WHERE status = 'ACTIVE'");
  // COMPETITIVE V1 -- `tier` es un tier MEDIO real (below @9 / above @11 ACTIVE),
  // con la gramática productiva `top/bottom-percent:20`, para que la zona EN
  // VIVO produzca PROMOTION/DEMOTION reales (no todo RETENTION por borde de tier).
  await leagueDefinitionRepo.create({ leagueKey: `cple-below-${suffix}`, name: 'Below', tierOrder: 9, participantGroupSize: 40 });
  await leagueDefinitionRepo.create({ leagueKey: `cple-above-${suffix}`, name: 'Above', tierOrder: 11, participantGroupSize: 40 });
  const tier = await leagueDefinitionRepo.create({
    leagueKey: `cple-tier-${suffix}`,
    name: 'Liga CPLE',
    tierOrder: 10,
    participantGroupSize: 40,
    promotionRule: 'top-percent:20',
    demotionRule: 'bottom-percent:20',
  });
  const groupRow = await pg.query(
    `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
     VALUES ($1, $2, $3, 1, 40, 'v1-lowest-tier', 'OPEN') RETURNING id`,
    [randomUUID(), season.id, tier.id],
  );
  const groupId = groupRow.rows[0].id as string;

  const rule = await pg.query(
    `INSERT INTO league_point_rule (id, activity_type, base_points, effective_from, rule_version)
     VALUES ($1, $2, 5, $3, 'cple-gate-rule-v1') RETURNING id`,
    [randomUUID(), `cple-gate-activity-${suffix}`, iso(seasonStart)],
  );

  async function join(accountId: string, metricValue: number): Promise<string> {
    const p = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [randomUUID(), season.id, accountId, tier.id, groupId, iso(seasonStart)],
    );
    const participationId = p.rows[0].id as string;
    const activityRow = await pg.query(
      `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
       VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, $4, 'PENDING', $5, 'v1', $6, 'NOT_EVALUATED') RETURNING id`,
      [randomUUID(), accountId, randomUUID(), `cple-gate-activity-${suffix}`, iso(now), `cple-gate-dedup-${accountId}`],
    );
    await pg.query(
      `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, rule_version, idempotency_key, occurred_at)
       VALUES ($1, $2, $3, $4, $5, 'OTORGAMIENTO', $6, 'cple-gate-rule-v1', $7, $8)`,
      [randomUUID(), accountId, participationId, activityRow.rows[0].id, rule.rows[0].id, metricValue, `cple-gate-grant-${accountId}`, iso(now)],
    );
    return participationId;
  }

  async function profile(accountId: string, username: string, visibility: 'PRIVATE' | 'VISIBLE', lifecycle: 'ACTIVE' | 'RETIRED' | 'ANONYMIZED') {
    await pg.query(
      `INSERT INTO public_profile (id, account_id, username_normalized, visibility_status, lifecycle_status, username_changed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now(), now())`,
      [randomUUID(), accountId, username, visibility, lifecycle],
    );
  }

  await profile(self.accountId, `cple-self-${suffix}`.toLowerCase(), 'PRIVATE', 'ACTIVE');
  await join(self.accountId, 100); // el puntaje más alto -- rank 1, para predecir posiciones sin ambigüedad

  const accountVisible = randomUUID();
  await profile(accountVisible, `cple-visible-${suffix}`.toLowerCase(), 'VISIBLE', 'ACTIVE');
  await join(accountVisible, 90);

  // LEF Bloque V, Incremento 1 (docs/adr/LEF-BLOCK-V-DEFINITION.md §9;
  // enmienda ADR-0021 §2) -- banner equipado para el tercero VISIBLE, para
  // confirmar que la fila COMPLETA de ranking también lo expone.
  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const equippedCosmeticRepoFixture = new EquippedCosmeticRepository(prisma);
  const bannerCosmetic = await cosmeticItemRepo.create({
    itemKey: `cple-gate-banner-${suffix}`,
    itemType: 'PROFILE_BANNER',
    name: 'Banner de prueba (ranking)',
    rarityClass: 'RARE',
    assetReference: `asset://cple-gate/banner-${suffix}`,
    visibilityStatus: 'PUBLIC',
  });
  const profileVisibleRow = await new PublicProfileRepository(prisma).findByAccountId(accountVisible);
  const { inventoryItem: bannerInventoryItem } = await inventoryItemRepo.createIdempotent({
    accountId: accountVisible,
    cosmeticItemId: bannerCosmetic.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${accountVisible}:banner`,
    acquiredAt: new Date(),
  });
  await equippedCosmeticRepoFixture.upsert(profileVisibleRow!.id, 'PROFILE_BANNER', bannerInventoryItem.id);

  const accountPrivateOther = randomUUID();
  await profile(accountPrivateOther, `cple-privateother-${suffix}`.toLowerCase(), 'PRIVATE', 'ACTIVE');
  await join(accountPrivateOther, 80);

  const accountRetiredOther = randomUUID();
  await profile(accountRetiredOther, `cple-retiredother-${suffix}`.toLowerCase(), 'PRIVATE', 'RETIRED');
  await join(accountRetiredOther, 70);

  const accountAnonymizedOther = randomUUID();
  await profile(accountAnonymizedOther, `cple-anonother-${suffix}`.toLowerCase(), 'PRIVATE', 'ANONYMIZED');
  await join(accountAnonymizedOther, 60);

  // Participantes adicionales, sin perfil público -- también deben quedar redactados (no presentable == sin public_profile).
  const bulkAccountIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const accountId = randomUUID();
    await join(accountId, 50 - i);
    bulkAccountIds.push(accountId);
  }

  const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();
  await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));

  check('fixtures creados sin errores (10 participantes en total)', true);

  console.log('--- 1. Sin sesión -> 401 ---');
  const noSession = await req('GET', '/user/public-profile/me/leaderboard');
  check('GET .../me/leaderboard sin sesión -> 401', noSession.status === 401);

  console.log('--- 2. Página completa: 10 filas, sin huecos de posición, orden correcto ---');
  const fullPage = await req('GET', '/user/public-profile/me/leaderboard?limit=20', self.headers);
  check('status 200', fullPage.status === 200);
  const rows: Array<Record<string, unknown>> = fullPage.body?.entries ?? [];
  check('exactamente 10 filas', rows.length === 10);
  const positions = rows.map((r) => r.rankPosition as number);
  check('rankPosition consecutivo 1..10, sin huecos ni duplicados', JSON.stringify(positions) === JSON.stringify(Array.from({ length: 10 }, (_, i) => i + 1)));
  check('nextCursor == null (página completa, sin más páginas)', fullPage.body?.nextCursor === null);

  console.log('--- 3. Autoconsulta: la fila propia se muestra COMPLETA aunque el perfil sea PRIVATE ---');
  const ownRow = rows.find((r) => r.isCurrentUser === true);
  check('exactamente UNA fila marcada isCurrentUser', rows.filter((r) => r.isCurrentUser === true).length === 1);
  check('la fila propia es presentable=true pese a PRIVATE', ownRow?.presentable === true);
  check('la fila propia expone su username real', ownRow?.username === `cple-self-${suffix}`.toLowerCase());
  check('la fila propia quedó en rank 1 (mayor metricValue)', ownRow?.rankPosition === 1);

  console.log('--- 4. Fila de un tercero VISIBLE -> presentable, identidad completa, isCurrentUser=false ---');
  const visibleRow = rows.find((r) => r.username === `cple-visible-${suffix}`.toLowerCase());
  check('tercero VISIBLE -> presentable=true', visibleRow?.presentable === true);
  check('tercero VISIBLE -> isCurrentUser=false', visibleRow?.isCurrentUser === false);
  check(
    'LEF V, Incremento 1: fila COMPLETA de ranking expone el banner equipado (URL firmada de su assetReference)',
    expectSignedUrlForKey((visibleRow?.banner as string | null) ?? null, bannerCosmetic.assetReference),
  );

  console.log('--- 5. Filas de terceros NO presentables (PRIVATE/RETIRED/ANONYMIZED/sin perfil) -> redactadas EXACTAMENTE ---');
  const redactedRows = rows.filter((r) => r.presentable === false);
  check('8 filas redactadas (privateOther, retiredOther, anonOther, 5 sin perfil)', redactedRows.length === 8);
  for (const row of redactedRows) {
    const keys = Object.keys(row).sort();
    // COMPETITIVE V1 -- `competitiveZone` SÍ puede aparecer en una fila
    // redactada: es dato DERIVADO DEL RANKING (posición + tamaño de grupo +
    // gramática de tier), nunca de la identidad. `banner`/`username`/etc.
    // siguen prohibidos.
    check(`fila redactada (rank ${row.rankPosition}) contiene EXACTAMENTE presentable/isCurrentUser/rankPosition/metricValue/competitiveZone -- "banner" nunca aparece en una fila redactada`, JSON.stringify(keys) === JSON.stringify(['competitiveZone', 'isCurrentUser', 'metricValue', 'presentable', 'rankPosition']));
    check(`fila redactada (rank ${row.rankPosition}): competitiveZone es un valor válido`, ['PROMOTION', 'RETENTION', 'DEMOTION'].includes(row.competitiveZone as string));
  }

  console.log('--- 5b. COMPETITIVE V1: zona EN VIVO mirror EXACTO de la gramática de cierre (10 participantes, tier medio Bronce, top/bottom 20%) ---');
  // G = 10 -> promoteCount = max(1, floor(10*20/100)) = 2 ; demoteCount = 2 ; 6 RETENTION.
  const zoneByPosition = new Map(rows.map((r) => [r.rankPosition as number, r.competitiveZone as string]));
  check('rank 1 -> PROMOTION', zoneByPosition.get(1) === 'PROMOTION');
  check('rank 2 -> PROMOTION', zoneByPosition.get(2) === 'PROMOTION');
  check('rank 3 -> RETENTION (fuera de la zona de ascenso)', zoneByPosition.get(3) === 'RETENTION');
  check('rank 8 -> RETENTION (fuera de la zona de descenso)', zoneByPosition.get(8) === 'RETENTION');
  check('rank 9 -> DEMOTION', zoneByPosition.get(9) === 'DEMOTION');
  check('rank 10 -> DEMOTION', zoneByPosition.get(10) === 'DEMOTION');
  check('exactamente 2 filas PROMOTION y 2 DEMOTION (mismo count que decideOutcomes para G=10)', rows.filter((r) => r.competitiveZone === 'PROMOTION').length === 2 && rows.filter((r) => r.competitiveZone === 'DEMOTION').length === 2);

  console.log('--- 6. Sin identificadores internos correlacionables en NINGUNA fila (ADR-0021) ---');
  const forbiddenIds = [self.accountId, accountVisible, accountPrivateOther, accountRetiredOther, accountAnonymizedOther, groupId, season.id, tier.id, leaderboardDefinition.id, ...bulkAccountIds];
  let leakedId: string | null = null;
  for (const id of forbiddenIds) {
    if (fullPage.raw.includes(id)) leakedId = id;
  }
  check('ningún accountId/groupId/seasonId/tierId/leaderboardDefinitionId aparece en la respuesta', leakedId === null);
  const forbiddenKeys = ['accountId', 'publicProfileId', 'seasonLeagueParticipationId', 'groupId', 'leaderboardEntryId', 'inventoryItemId', 'cosmeticItemId', 'titleDefinitionId', 'accountTitleId'];
  let leakedKey: string | null = null;
  for (const key of forbiddenKeys) {
    if (fullPage.raw.includes(`"${key}"`)) leakedKey = key;
  }
  check('ninguna clave prohibida aparece en la respuesta', leakedKey === null);

  console.log('--- 7. Paginación real: cursor opaco, sin huecos ni duplicados entre páginas ---');
  const seenPositions: number[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  do {
    const url = cursor ? `/user/public-profile/me/leaderboard?limit=3&cursor=${encodeURIComponent(cursor)}` : '/user/public-profile/me/leaderboard?limit=3';
    const page = await req('GET', url, self.headers);
    check(`página ${pageCount + 1} -> 200`, page.status === 200);
    for (const row of page.body?.entries ?? []) seenPositions.push(row.rankPosition as number);
    cursor = page.body?.nextCursor ?? null;
    pageCount++;
  } while (cursor !== null && pageCount < 10);
  check('recorrer todas las páginas (limit=3) cubre EXACTAMENTE 1..10, sin huecos ni duplicados', JSON.stringify([...seenPositions].sort((a, b) => a - b)) === JSON.stringify(Array.from({ length: 10 }, (_, i) => i + 1)));
  check('el cursor es una cadena opaca (no un JSON plano ni un rankPosition literal en texto)', !cursor || !/^\d+$/.test(cursor));

  console.log('--- 8. Cursor inválido -> 400, nunca 500 ni datos corruptos ---');
  const invalidCursor = await req('GET', '/user/public-profile/me/leaderboard?cursor=%25%25not-valid-base64%25%25', self.headers);
  check('cursor inválido -> 400', invalidCursor.status === 400);

  console.log('--- 9. Sin participación activa: lista vacía, competitiveContext null, SIN error ---');
  const noParticipationSession = await createSession('noparticip');
  await profile(noParticipationSession.accountId, `cple-noparticip-${suffix}`.toLowerCase(), 'VISIBLE', 'ACTIVE');
  const emptyPage = await req('GET', '/user/public-profile/me/leaderboard', noParticipationSession.headers);
  check('sin participación activa -> 200 (nunca error)', emptyPage.status === 200);
  check('entries == [] ', Array.isArray(emptyPage.body?.entries) && emptyPage.body.entries.length === 0);
  check('nextCursor == null', emptyPage.body?.nextCursor === null);
  check('competitiveContext == null', emptyPage.body?.competitiveContext === null);

  console.log('--- 10. competitiveContext presente y correcto para quien SÍ participa ---');
  check('competitiveContext.rankPosition == 1 (self)', fullPage.body?.competitiveContext?.rankPosition === 1);
  check('competitiveContext.metricValue == 100', fullPage.body?.competitiveContext?.metricValue === 100);
  // COMPETITIVE V1 (rediseño visual, Incremento 2) -- leagueTier + competitiveZone
  // de la PROPIA posición, resueltos por el backend (misma gramática que las filas).
  check('competitiveContext.leagueTier == 10 (tierOrder del tier de la fixture)', fullPage.body?.competitiveContext?.leagueTier === 10);
  check(
    'competitiveContext.competitiveZone == PROMOTION (rank 1, G=10, top 20%, tier ni el más alto ni el más bajo)',
    fullPage.body?.competitiveContext?.competitiveZone === 'PROMOTION',
  );

  console.log('--- 11. Sin patrón N+1: el número de consultas SQL de una página NO escala con la cantidad de filas ---');
  // La instrumentación $on('query') solo ve las consultas de ESTA conexión
  // -- las peticiones HTTP de arriba corren en el proceso del SERVIDOR, con
  // su propia PrismaService, invisible aquí. Para medir consultas reales
  // (no fingir), se instancia el MISMO árbol de dependencias que usa el
  // controller, apuntando al `prisma` de este gate (ya instrumentado), y se
  // invoca `resolvePage` directamente -- sin HTTP, mismo criterio que
  // verify-competitive-profile-foundation-gate.ts (3.a).
  const publicProfileRepoDirect = new PublicProfileRepository(prisma);
  const equippedTitleRepoDirect = new EquippedTitleRepository(prisma);
  const equippedCosmeticRepoDirect = new EquippedCosmeticRepository(prisma);
  const xpBalanceRepoDirect = new XpBalanceRepository(prisma);
  const levelDefinitionRepoDirect = new LevelDefinitionRepository(prisma);
  const achievementUnlockRepoDirect = new AchievementUnlockRepository(prisma);
  const featuredAchievementRepoDirect = new FeaturedAchievementRepository(prisma);
  const leagueGroupRepoDirect = new LeagueGroupRepository(prisma);
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
  const contextServiceDirect = new CompetitiveContextService(participationRepo, entryRepo, leaderboardDefinitionRepo, leagueGroupRepoDirect, leagueDefinitionRepo);
  const leaderboardServiceDirect = new CompetitiveLeaderboardService(participationRepo, entryRepo, leaderboardDefinitionRepo, identityServiceDirect, contextServiceDirect, leagueGroupRepoDirect, leagueDefinitionRepo);

  queryCount = 0;
  await leaderboardServiceDirect.resolvePage(self.accountId, { limit: 3 });
  const queriesForThree = queryCount;

  queryCount = 0;
  await leaderboardServiceDirect.resolvePage(self.accountId, { limit: 10 });
  const queriesForTen = queryCount;

  check(
    `una página de 3 filas (${queriesForThree} consultas) y una de 10 filas (${queriesForTen} consultas) emiten el MISMO número de consultas SQL -- independiente de la cantidad de filas`,
    queriesForThree === queriesForTen && queriesForThree > 0,
  );

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Lista de Ranking con Redacción (Bloque IV, Incremento 3, sub-incremento 3.c) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
