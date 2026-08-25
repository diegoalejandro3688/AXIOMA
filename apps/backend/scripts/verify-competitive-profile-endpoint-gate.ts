// Gate del Bloque IV, Incremento 3, sub-incremento 3.b ("Perfil
// competitivo individual", ADR-0021 §1/§3/§5) -- prueba contra el
// servidor real (endpoints GET /user/public-profile/me/competitive-profile
// y GET /user/public-profile/:username/competitive-profile), mismo
// criterio que verify-title-equipment-gate.ts. Cubre EXCLUSIVAMENTE los
// dos endpoints individuales -- SIN ranking paginado todavía (3.c).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeaderboardDefinitionRepository } from '../src/gamification/leaderboard-definition.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { LeaderboardEntryRepository } from '../src/gamification/leaderboard-entry.repository';
import { LeaderboardCalculationService } from '../src/gamification/leaderboard-calculation.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { EquippedCosmeticRepository } from '../src/gamification/equipped-cosmetic.repository';
import { PublicProfileRepository } from '../src/user/public-profile.repository';
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
function expectSignedUrlForKey(url: unknown, expectedKey: string): boolean {
  if (typeof url !== 'string') return false;
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
  const uid = `cpe-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leaderboardDefinitionRepo = new LeaderboardDefinitionRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const entryRepo = new LeaderboardEntryRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const calculationService = new LeaderboardCalculationService(leaderboardDefinitionRepo, participationRepo, ledgerRepo, entryRepo);
  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const equippedCosmeticRepo = new EquippedCosmeticRepository(prisma);
  const publicProfileRepo = new PublicProfileRepository(prisma);

  const suffix = Date.now();
  const now = new Date();
  const seasonStart = new Date(now.getTime() - 60 * 60 * 1000);
  const seasonEnd = new Date(now.getTime() + 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString();

  console.log('--- 0. Fixtures: sesiones reales, liga/temporada/grupo/participación/LP, cálculo real del ranking ---');

  const accountActive = await createSession('active'); // ACTIVE + PRIVATE -- sin competitivo, sin logros/título/cosmético
  const accountVisible = await createSession('visible'); // ACTIVE + VISIBLE -- CON contexto competitivo real
  const accountRetired = await createSession('retired');

  await pg.query(
    `INSERT INTO public_profile (id, account_id, username_normalized, visibility_status, lifecycle_status, username_changed_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'PRIVATE', 'ACTIVE', now(), now(), now())`,
    [randomUUID(), accountActive.accountId, `cpe-active-${suffix}`.toLowerCase()],
  );
  const visibleUsername = `CPE-Visible-${suffix}`; // mayúsculas deliberadas -- prueba la normalización canónica (precisión #4)
  await pg.query(
    `INSERT INTO public_profile (id, account_id, username_normalized, visibility_status, lifecycle_status, username_changed_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'VISIBLE', 'ACTIVE', now(), now(), now())`,
    [randomUUID(), accountVisible.accountId, visibleUsername.normalize('NFC').toLowerCase()],
  );
  // RETIRED simulado por SQL directo sobre public_profile, SIN pasar por
  // el flujo real de PRIVACY -- ese flujo también deshabilita la identidad
  // en el proveedor de autenticación (`AuthService.requestAccountDeletion`
  // -> `identityProvider.disableUser`), lo que impide obtener una sesión
  // NUEVA durante la ventana de recuperación real (la recuperación real es
  // una acción de soporte vía CLI, ADR-0005 -- nunca un re-login del propio
  // estudiante). Aquí solo se necesita el ESTADO de `public_profile` en
  // RETIRED con una sesión válida para probar la lógica de presentación de
  // 3.b -- mismo criterio ya usado para PRIVATE/ANONYMIZED en este gate: la
  // sesión original de `accountRetired` (nunca revocada) sigue siendo
  // válida.
  await pg.query(
    `INSERT INTO public_profile (id, account_id, username_normalized, visibility_status, lifecycle_status, username_changed_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'PRIVATE', 'RETIRED', now(), now(), now())`,
    [randomUUID(), accountRetired.accountId, `cpe-retired-${suffix}`.toLowerCase()],
  );

  const accountAnonymized = await createSession('anonymized');
  await pg.query(
    `INSERT INTO public_profile (id, account_id, username_normalized, visibility_status, lifecycle_status, username_changed_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'PRIVATE', 'ANONYMIZED', now(), now(), now())`,
    [randomUUID(), accountAnonymized.accountId, `cpe-anon-${suffix}`.toLowerCase()],
  );

  const accountNoProfile = await createSession('noprofile'); // sesión válida, sin public_profile en absoluto
  const accountRetiredHeaders = accountRetired.headers;

  // --- Liga real para accountVisible ---
  // Higiene entre corridas -- ninguna temporada ACTIVE huérfana de una corrida anterior (mismo criterio que verify-league-ranking-gate.ts).
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE status = 'ACTIVE'");
  const season = await seasonRepo.create({ seasonKey: `cpe-gate-${suffix}`, name: 'Temporada CPE', startsAt: seasonStart, endsAt: seasonEnd });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);
  await pg.query("UPDATE league_definition SET status = 'RETIRED', retired_at = now() WHERE status = 'ACTIVE'");
  const tier = await leagueDefinitionRepo.create({ leagueKey: `cpe-tier-${suffix}`, name: 'Liga de Prueba CPE', tierOrder: 10, participantGroupSize: 40 });
  const groupRow = await pg.query(
    `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
     VALUES ($1, $2, $3, 1, 40, 'v1-lowest-tier', 'OPEN') RETURNING id`,
    [randomUUID(), season.id, tier.id],
  );
  const groupId = groupRow.rows[0].id as string;
  const participationRow = await pg.query(
    `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [randomUUID(), season.id, accountVisible.accountId, tier.id, groupId, iso(seasonStart)],
  );
  const participationId = participationRow.rows[0].id as string;

  const rule = await pg.query(
    `INSERT INTO league_point_rule (id, activity_type, base_points, effective_from, rule_version)
     VALUES ($1, $2, 5, $3, 'cpe-gate-rule-v1') RETURNING id`,
    [randomUUID(), `cpe-gate-activity-${suffix}`, iso(seasonStart)],
  );
  const activityRow = await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, $4, 'PENDING', $5, 'v1', $6, 'NOT_EVALUATED') RETURNING id`,
    [randomUUID(), accountVisible.accountId, randomUUID(), `cpe-gate-activity-${suffix}`, iso(now), `cpe-gate-dedup-${suffix}`],
  );
  await pg.query(
    `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, rule_version, idempotency_key, occurred_at)
     VALUES ($1, $2, $3, $4, $5, 'OTORGAMIENTO', 42, 'cpe-gate-rule-v1', $6, $7)`,
    [randomUUID(), accountVisible.accountId, participationId, activityRow.rows[0].id, rule.rows[0].id, `cpe-gate-grant-${suffix}`, iso(now)],
  );

  const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();
  await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));

  // LEF Bloque V, Incremento 1 (docs/adr/LEF-BLOCK-V-DEFINITION.md §9;
  // enmienda ADR-0021 §2) -- banner EQUIPADO (slot PROFILE_BANNER) para
  // accountVisible, y un SEGUNDO banner del mismo catálogo, POSEÍDO pero
  // NUNCA equipado, para verificar que solo el equipado se filtra.
  const bannerCosmeticEquipped = await cosmeticItemRepo.create({
    itemKey: `cpe-gate-banner-equipped-${suffix}`,
    itemType: 'PROFILE_BANNER',
    name: 'Banner de prueba (equipado)',
    rarityClass: 'RARE',
    assetReference: `asset://cpe-gate/banner-equipped-${suffix}`,
    visibilityStatus: 'PUBLIC',
  });
  const bannerCosmeticOwnedNotEquipped = await cosmeticItemRepo.create({
    itemKey: `cpe-gate-banner-unequipped-${suffix}`,
    itemType: 'PROFILE_BANNER',
    name: 'Banner de prueba (no equipado)',
    rarityClass: 'RARE',
    assetReference: `asset://cpe-gate/banner-unequipped-${suffix}`,
    visibilityStatus: 'PUBLIC',
  });
  const profileVisible = await publicProfileRepo.findByAccountId(accountVisible.accountId);
  const { inventoryItem: bannerInventoryEquipped } = await inventoryItemRepo.createIdempotent({
    accountId: accountVisible.accountId,
    cosmeticItemId: bannerCosmeticEquipped.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${accountVisible.accountId}:banner-equipped`,
    acquiredAt: new Date(),
  });
  await inventoryItemRepo.createIdempotent({
    accountId: accountVisible.accountId,
    cosmeticItemId: bannerCosmeticOwnedNotEquipped.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${accountVisible.accountId}:banner-unequipped`,
    acquiredAt: new Date(),
  });
  await equippedCosmeticRepo.upsert(profileVisible!.id, 'PROFILE_BANNER', bannerInventoryEquipped.id);

  check('fixtures creados sin errores', true);

  console.log('--- 1. Sin sesión -> 401 en ambos endpoints ---');
  const meNoSession = await req('GET', '/user/public-profile/me/competitive-profile');
  check('GET .../me/competitive-profile sin sesión -> 401', meNoSession.status === 401);
  const publicNoSession = await req('GET', `/user/public-profile/${visibleUsername}/competitive-profile`);
  check('GET .../:username/competitive-profile sin sesión -> 401', publicNoSession.status === 401);

  console.log('--- 2. /me: sin public_profile -> 404 ---');
  const meNoProfile = await req('GET', '/user/public-profile/me/competitive-profile', accountNoProfile.headers);
  check('cuenta sin public_profile -> 404', meNoProfile.status === 404);

  console.log('--- 3. /me: ACTIVE+PRIVATE -> 200, ignora visibilityStatus, sin competitivo ---');
  const meActive = await req('GET', '/user/public-profile/me/competitive-profile', accountActive.headers);
  check('ACTIVE+PRIVATE -> 200 (visibilityStatus NUNCA oculta al dueño)', meActive.status === 200);
  check('lifecycleStatus == ACTIVE', meActive.body?.lifecycleStatus === 'ACTIVE');
  check('username == propio', meActive.body?.username === `cpe-active-${suffix}`.toLowerCase());
  check('competitive == null (sin participación activa) -- NUNCA 404 por esto', meActive.body?.competitive === null);
  check('equippedTitle == null, equippedCosmetics == [], publicAchievements == [] (perfil mínimo)', meActive.body?.equippedTitle === null && meActive.body?.equippedCosmetics.length === 0 && meActive.body?.publicAchievements.length === 0);
  check('LEF V, Incremento 1: sin banner equipado -> banner === null (campo vacío legítimo, no ausente)', 'banner' in (meActive.body ?? {}) && meActive.body?.banner === null);

  console.log('--- 4. /me: ACTIVE+VISIBLE, CON contexto competitivo real ---');
  const meVisible = await req('GET', '/user/public-profile/me/competitive-profile', accountVisible.headers);
  check('ACTIVE+VISIBLE -> 200', meVisible.status === 200);
  check('competitive.leagueName correcto', meVisible.body?.competitive?.leagueName === 'Liga de Prueba CPE');
  check('competitive.rankPosition == 1 (única participante del grupo)', meVisible.body?.competitive?.rankPosition === 1);
  check('competitive.metricValue == 42 (el LP otorgado)', meVisible.body?.competitive?.metricValue === 42);
  check('competitive.calculatedAt/snapshotVersion presentes', typeof meVisible.body?.competitive?.calculatedAt === 'string' && typeof meVisible.body?.competitive?.snapshotVersion === 'number');
  check(
    'LEF V, Incremento 1: /me con PROFILE_BANNER equipado -> banner devuelve la URL firmada del assetReference equipado',
    expectSignedUrlForKey(meVisible.body?.banner, bannerCosmeticEquipped.assetReference),
  );

  console.log('--- 5. /me: RETIRED -> 200 para el dueño, MOSTRANDO su estado ---');
  const meRetired = await req('GET', '/user/public-profile/me/competitive-profile', accountRetiredHeaders);
  check('RETIRED -> 200 para el propio dueño (no oculto, no 404)', meRetired.status === 200);
  check('lifecycleStatus == RETIRED, visible en la respuesta', meRetired.body?.lifecycleStatus === 'RETIRED');

  console.log('--- 6. /me: ANONYMIZED -> 404 uniforme (defensa en profundidad) ---');
  const meAnonymized = await req('GET', '/user/public-profile/me/competitive-profile', accountAnonymized.headers);
  check('ANONYMIZED -> 404', meAnonymized.status === 404);

  console.log('--- 7. Endpoint público: 404 IDÉNTICO para inexistente, PRIVATE, RETIRED, ANONYMIZED -- incluso para el propio dueño ---');
  const nonexistentUsername = `cpe-nonexistent-${suffix}`;
  const publicNonexistent = await req('GET', `/user/public-profile/${nonexistentUsername}/competitive-profile`, accountVisible.headers);
  const publicPrivateByStranger = await req('GET', `/user/public-profile/cpe-active-${suffix}/competitive-profile`, accountVisible.headers);
  const publicPrivateByOwner = await req('GET', `/user/public-profile/cpe-active-${suffix}/competitive-profile`, accountActive.headers);
  const publicRetired = await req('GET', `/user/public-profile/cpe-retired-${suffix}/competitive-profile`, accountVisible.headers);
  const publicAnonymized = await req('GET', `/user/public-profile/cpe-anon-${suffix}/competitive-profile`, accountVisible.headers);

  check('inexistente -> 404', publicNonexistent.status === 404);
  check('PRIVATE (consultado por un extraño) -> 404', publicPrivateByStranger.status === 404);
  check('PRIVATE (consultado por SU PROPIO dueño, vía el endpoint público) -> 404 -- SIN excepción para el dueño', publicPrivateByOwner.status === 404);
  check('RETIRED -> 404', publicRetired.status === 404);
  check('ANONYMIZED -> 404', publicAnonymized.status === 404);

  const bodies = [publicNonexistent, publicPrivateByStranger, publicPrivateByOwner, publicRetired, publicAnonymized].map((r) => ({
    code: r.body?.error?.code,
    message: r.body?.error?.message,
  }));
  const allIdentical = bodies.every((b) => b.code === bodies[0]!.code && b.message === bodies[0]!.message);
  check('los CINCO casos devuelven EXACTAMENTE el mismo código y mensaje -- ninguno distingue el motivo', allIdentical);

  console.log('--- 8. Endpoint público: perfil presentable -> 200, lista blanca completa ---');
  const publicVisible = await req('GET', `/user/public-profile/${visibleUsername}/competitive-profile`, accountActive.headers);
  check('ACTIVE+VISIBLE consultado por un extraño -> 200', publicVisible.status === 200);
  check('username en forma canónica (minúsculas), no la forma con mayúsculas enviada en la URL', publicVisible.body?.username === visibleUsername.toLowerCase());
  check('competitive presente con los mismos datos que /me', publicVisible.body?.competitive?.rankPosition === 1 && publicVisible.body?.competitive?.metricValue === 42);
  check('la respuesta pública NUNCA incluye lifecycleStatus (solo /me lo expone)', !('lifecycleStatus' in (publicVisible.body ?? {})));
  check(
    'LEF V, Incremento 1: superficie pública cross-cuenta también expone la URL firmada del banner equipado',
    expectSignedUrlForKey(publicVisible.body?.banner, bannerCosmeticEquipped.assetReference),
  );

  console.log('--- 8.1 LEF Bloque V, Incremento 1: banner poseído pero NO equipado nunca se filtra ---');
  const publicAllResponses = [meActive.raw, meVisible.raw, meRetired.raw, publicVisible.raw];
  let leakedUnequippedBanner = false;
  for (const raw of publicAllResponses) {
    if (raw.includes(bannerCosmeticOwnedNotEquipped.assetReference)) leakedUnequippedBanner = true;
  }
  check('el assetReference del banner POSEÍDO pero NO equipado nunca aparece en ninguna respuesta', !leakedUnequippedBanner);

  console.log('--- 9. Normalización canónica del username de entrada (ADR-0018 §2, precisión #4) ---');
  const mixedCaseQuery = await req('GET', `/user/public-profile/${visibleUsername.toUpperCase()}/competitive-profile`, accountActive.headers);
  check('consultar con OTRA variante de mayúsculas/minúsculas resuelve al MISMO perfil (200, mismo username)', mixedCaseQuery.status === 200 && mixedCaseQuery.body?.username === visibleUsername.toLowerCase());

  console.log('--- 10. Sin identificadores internos correlacionables en ninguna respuesta 200 (ADR-0021 §2/§3) ---');
  const forbiddenIds = [accountVisible.accountId, accountActive.accountId, participationId, groupId, season.id, tier.id];
  const responsesToScan = [meActive.raw, meVisible.raw, meRetired.raw, publicVisible.raw];
  let leakedId: string | null = null;
  for (const raw of responsesToScan) {
    for (const id of forbiddenIds) {
      if (raw.includes(id)) leakedId = id;
    }
  }
  check('ningún accountId/seasonLeagueParticipationId/groupId/gameSeasonId/leagueDefinitionId aparece en ninguna respuesta', leakedId === null);
  const forbiddenKeys = ['accountId', 'publicProfileId', 'seasonLeagueParticipationId', 'groupId', 'inventoryItemId', 'cosmeticItemId', 'titleDefinitionId', 'accountTitleId'];
  let leakedKey: string | null = null;
  for (const raw of responsesToScan) {
    for (const key of forbiddenKeys) {
      if (raw.includes(`"${key}"`)) leakedKey = key;
    }
  }
  check('ninguna clave prohibida aparece en ninguna respuesta (ni con valor null)', leakedKey === null);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Perfil Competitivo Individual (Bloque IV, Incremento 3, sub-incremento 3.b) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
