// Gate del LEF Bloque V, Incremento 7 ("Vista previa pública", ver
// docs/adr/LEF-BLOCK-V-DEFINITION.md §15 y Gate 5 de bloque, §5) -- prueba
// contra el servidor real: GET /user/public-profile/me/preview comparado
// BYTE A BYTE contra GET /user/public-profile/:username/competitive-profile
// consultado por una SEGUNDA cuenta real (nunca contra lo que "debería"
// devolver). Mismo patrón de fixtures que verify-competitive-profile-endpoint-gate.ts
// y verify-featured-achievement-gate.ts.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { EquippedCosmeticRepository } from '../src/gamification/equipped-cosmetic.repository';
import { PublicProfileRepository } from '../src/user/public-profile.repository';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeaderboardDefinitionRepository } from '../src/gamification/leaderboard-definition.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { LeaderboardEntryRepository } from '../src/gamification/leaderboard-entry.repository';
import { LeaderboardCalculationService } from '../src/gamification/leaderboard-calculation.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
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

/**
 * Reemplaza cualquier URL firmada (string parseable como URL absoluta) por
 * su pathname decodificado -- neutraliza componentes de la firma que varían
 * con el instante exacto de emisión (X-Amz-Date/Signature), preservando la
 * comparación de que ambas respuestas apuntan al MISMO objeto. Necesario
 * porque `preview` y la consulta pública se firman en llamadas HTTP
 * separadas y pueden caer en segundos distintos.
 */
function normalizeSignedUrls(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return decodeURIComponent(new URL(value).pathname);
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(normalizeSignedUrls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeSignedUrls(v)]));
  }
  return value;
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
  const uid = `ppp-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  const achievementDefinitionRepo = new AchievementDefinitionRepository(prisma);
  const achievementVersionRepo = new AchievementVersionRepository(prisma);
  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const equippedCosmeticRepo = new EquippedCosmeticRepository(prisma);
  const publicProfileRepo = new PublicProfileRepository(prisma);
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
  const iso = (d: Date) => d.toISOString();

  async function claimProfile(headers: Record<string, string>, username: string) {
    const res = await req('POST', '/user/public-profile', headers, { username });
    if (res.status !== 200 && res.status !== 201) throw new Error(`No se pudo crear public_profile: ${res.status} ${res.raw}`);
    return res;
  }

  console.log('--- 0. Fixtures: cuenta dueña (owner) fully-populated + cuenta extraña (stranger) ---');
  const ownerUsername = `ppp_o_${suffix}`.slice(0, 20);
  const owner = await createSession('owner');
  await claimProfile(owner.headers, ownerUsername);
  await req('PATCH', '/user/public-profile/visibility', owner.headers, { visible: true });

  const stranger = await createSession('stranger');
  await claimProfile(stranger.headers, `ppp_s_${suffix}`.slice(0, 20));

  // --- Logro público + destacado ---
  const achievementDef = await achievementDefinitionRepo.create({
    achievementKey: `ppp-gate-ach-${suffix}`,
    name: 'Logro de prueba PPP',
    achievementCategory: 'XP',
    visibilityClass: 'PUBLIC',
    repeatability: 'UNIQUE',
    progressTrackingType: 'XP_THRESHOLD',
  });
  const achievementVersion = await achievementVersionRepo.create({
    achievementDefinitionId: achievementDef.id,
    versionLabel: `v1-${suffix}`,
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 1 },
  });
  const unlockId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at, status)
     VALUES ($1, $2, $3, $4, 1, now(), 'ACTIVE')`,
    [unlockId, owner.accountId, achievementDef.id, achievementVersion.id],
  );
  const featureResult = await req('PATCH', '/user/public-profile/featured-achievements', owner.headers, { achievementUnlockIds: [unlockId] });
  if (featureResult.status !== 200) throw new Error(`No se pudo destacar el logro de fixture: ${featureResult.status} ${featureResult.raw}`);

  // --- Banner equipado (LEF V, Incremento 1) ---
  const bannerCosmetic = await cosmeticItemRepo.create({
    itemKey: `ppp-gate-banner-${suffix}`,
    itemType: 'PROFILE_BANNER',
    name: 'Banner de prueba PPP',
    rarityClass: 'RARE',
    assetReference: `asset://ppp-gate/banner-${suffix}`,
    visibilityStatus: 'PUBLIC',
  });
  const ownerProfile = await publicProfileRepo.findByAccountId(owner.accountId);
  const { inventoryItem: bannerInventory } = await inventoryItemRepo.createIdempotent({
    accountId: owner.accountId,
    cosmeticItemId: bannerCosmetic.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${owner.accountId}:ppp-banner`,
    acquiredAt: new Date(),
  });
  await equippedCosmeticRepo.upsert(ownerProfile!.id, 'PROFILE_BANNER', bannerInventory.id);

  // --- Contexto competitivo real (liga/temporada) ---
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE status = 'ACTIVE'");
  const season = await seasonRepo.create({ seasonKey: `ppp-gate-${suffix}`, name: 'Temporada PPP', startsAt: new Date(now.getTime() - 3600_000), endsAt: new Date(now.getTime() + 3600_000) });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);
  await pg.query("UPDATE league_definition SET status = 'RETIRED', retired_at = now() WHERE status = 'ACTIVE'");
  const tier = await leagueDefinitionRepo.create({ leagueKey: `ppp-tier-${suffix}`, name: 'Liga de Prueba PPP', tierOrder: 10, participantGroupSize: 40 });
  const groupRow = await pg.query(
    `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
     VALUES ($1, $2, $3, 1, 40, 'v1-lowest-tier', 'OPEN') RETURNING id`,
    [randomUUID(), season.id, tier.id],
  );
  const groupId = groupRow.rows[0].id as string;
  const participationRow = await pg.query(
    `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [randomUUID(), season.id, owner.accountId, tier.id, groupId, iso(new Date(now.getTime() - 3600_000))],
  );
  const participationId = participationRow.rows[0].id as string;
  const rule = await pg.query(
    `INSERT INTO league_point_rule (id, activity_type, base_points, effective_from, rule_version)
     VALUES ($1, $2, 5, $3, 'ppp-gate-rule-v1') RETURNING id`,
    [randomUUID(), `ppp-gate-activity-${suffix}`, iso(new Date(now.getTime() - 3600_000))],
  );
  const activityRow = await pg.query(
    `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
     VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, $4, 'PENDING', $5, 'v1', $6, 'NOT_EVALUATED') RETURNING id`,
    [randomUUID(), owner.accountId, randomUUID(), `ppp-gate-activity-${suffix}`, iso(now), `ppp-gate-dedup-${suffix}`],
  );
  await pg.query(
    `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, rule_version, idempotency_key, occurred_at)
     VALUES ($1, $2, $3, $4, $5, 'OTORGAMIENTO', 77, 'ppp-gate-rule-v1', $6, $7)`,
    [randomUUID(), owner.accountId, participationId, activityRow.rows[0].id, rule.rows[0].id, `ppp-gate-grant-${suffix}`, iso(now)],
  );
  const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();
  await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));

  check('fixtures creados sin errores', true);

  console.log('--- 1. Sin sesión -> 401 ---');
  const previewNoSession = await req('GET', '/user/public-profile/me/preview');
  check('GET .../me/preview sin sesión -> 401', previewNoSession.status === 401);

  console.log('--- 2. Perfil VISIBLE completamente poblado: preview == respuesta pública real consultada por OTRA cuenta ---');
  const preview = await req('GET', '/user/public-profile/me/preview', owner.headers);
  const publicByStranger = await req('GET', `/user/public-profile/${ownerUsername}/competitive-profile`, stranger.headers);
  check('preview -> 200', preview.status === 200);
  check('endpoint público (consultado por un extraño) -> 200', publicByStranger.status === 200);
  check(
    'IDÉNTICO tras normalizar URLs firmadas (mismas claves, mismo orden, mismos valores -- las URLs firmadas pueden variar por timestamp de firma entre llamadas separadas)',
    JSON.stringify(normalizeSignedUrls(preview.body)) === JSON.stringify(normalizeSignedUrls(publicByStranger.body)),
  );
  check(
    'banner idéntico y correcto (URL firmada del assetReference equipado)',
    expectSignedUrlForKey(preview.body?.banner, bannerCosmetic.assetReference) && expectSignedUrlForKey(publicByStranger.body?.banner, bannerCosmetic.assetReference),
  );
  check(
    'equippedCosmetics idénticos tras normalizar URLs firmadas (deep-equal vía JSON)',
    JSON.stringify(normalizeSignedUrls(preview.body?.equippedCosmetics)) === JSON.stringify(normalizeSignedUrls(publicByStranger.body?.equippedCosmetics)),
  );
  check('featuredAchievements idénticas, mismo orden, mismos valores', JSON.stringify(preview.body?.featuredAchievements) === JSON.stringify(publicByStranger.body?.featuredAchievements));
  check('featuredAchievements contiene exactamente el logro destacado', preview.body?.featuredAchievements?.length === 1 && preview.body?.featuredAchievements?.[0]?.achievementKey === `ppp-gate-ach-${suffix}`);
  check('nivel/liga/rank idénticos', preview.body?.levelNumber === publicByStranger.body?.levelNumber && JSON.stringify(preview.body?.competitive) === JSON.stringify(publicByStranger.body?.competitive));
  check('competitive.rankPosition == 1 (única participante del grupo)', preview.body?.competitive?.rankPosition === 1);
  check('competitive.metricValue == 77 (el LP otorgado)', preview.body?.competitive?.metricValue === 77);
  check('username idéntico', preview.body?.username === publicByStranger.body?.username);
  check('preview NUNCA incluye lifecycleStatus (misma forma pública exacta, no la forma "me" privilegiada)', !('lifecycleStatus' in (preview.body ?? {})));
  check('preview NUNCA incluye accountId ni ningún identificador interno', !preview.raw.includes(owner.accountId) && !preview.raw.includes(participationId) && !preview.raw.includes(groupId) && !preview.raw.includes(season.id));
  const forbiddenKeys = ['accountId', 'publicProfileId', 'seasonLeagueParticipationId', 'groupId', 'inventoryItemId', 'cosmeticItemId', 'achievementUnlockId', 'academicSummary', 'competitiveHistory', 'owned', 'locked'];
  let leakedKey: string | null = null;
  for (const key of forbiddenKeys) {
    if (preview.raw.includes(`"${key}"`)) leakedKey = key;
  }
  check('ninguna clave privada/interna prohibida aparece en la preview (académico/historial/inventario/IDs)', leakedKey === null);

  console.log('--- 3. Perfil PRIVATE: preview == lo que realmente ve un tercero (404), NUNCA la autoconsulta privilegiada ---');
  await req('PATCH', '/user/public-profile/visibility', owner.headers, { visible: false });
  const previewPrivate = await req('GET', '/user/public-profile/me/preview', owner.headers);
  const publicPrivateByStranger = await req('GET', `/user/public-profile/${ownerUsername}/competitive-profile`, stranger.headers);
  const meCompetitivePrivate = await req('GET', '/user/public-profile/me/competitive-profile', owner.headers);
  check('preview con perfil PRIVATE -> 404', previewPrivate.status === 404);
  check('endpoint público (extraño) con perfil PRIVATE -> 404', publicPrivateByStranger.status === 404);
  // `requestId`/`timestamp` son únicos por request incluso para el mismo error -- se compara code+message, mismo criterio que Decision Gate 1 de ADR-0021 ("mismo mensaje, mismo código").
  check(
    'mismo código y mensaje de error en el caso PRIVATE (404 uniforme, requestId/timestamp difieren por diseño)',
    previewPrivate.body?.error?.code === publicPrivateByStranger.body?.error?.code && previewPrivate.body?.error?.message === publicPrivateByStranger.body?.error?.message,
  );
  check('CONTRASTE: la autoconsulta privilegiada (/me/competitive-profile) SÍ ve el perfil PRIVATE (200) -- confirma que preview NO reutilizó ese camino', meCompetitivePrivate.status === 200);
  await req('PATCH', '/user/public-profile/visibility', owner.headers, { visible: true });

  console.log('--- 4. Lifecycle no presentable (RETIRED): misma semántica que la superficie externa real ---');
  await pg.query('UPDATE public_profile SET lifecycle_status = $1 WHERE account_id = $2', ['RETIRED', owner.accountId]);
  const previewRetired = await req('GET', '/user/public-profile/me/preview', owner.headers);
  const publicRetiredByStranger = await req('GET', `/user/public-profile/${ownerUsername}/competitive-profile`, stranger.headers);
  const meCompetitiveRetired = await req('GET', '/user/public-profile/me/competitive-profile', owner.headers);
  check('preview con lifecycle RETIRED -> 404 (un tercero real tampoco lo vería)', previewRetired.status === 404);
  check('endpoint público (extraño) con RETIRED -> 404', publicRetiredByStranger.status === 404);
  check(
    'mismo código y mensaje de error en el caso RETIRED (404 uniforme, requestId/timestamp difieren por diseño)',
    previewRetired.body?.error?.code === publicRetiredByStranger.body?.error?.code && previewRetired.body?.error?.message === publicRetiredByStranger.body?.error?.message,
  );
  check('CONTRASTE: la autoconsulta privilegiada (/me/competitive-profile) SÍ muestra RETIRED (200, lifecycleStatus visible) -- confirma no-reuso de ese camino', meCompetitiveRetired.status === 200 && meCompetitiveRetired.body?.lifecycleStatus === 'RETIRED');
  await pg.query('UPDATE public_profile SET lifecycle_status = $1 WHERE account_id = $2', ['ACTIVE', owner.accountId]);

  console.log('--- 5. Cuenta sin public_profile en absoluto -> 404 uniforme ---');
  const accountNoProfile = await createSession('noprofile');
  const previewNoProfile = await req('GET', '/user/public-profile/me/preview', accountNoProfile.headers);
  const publicNonexistent = await req('GET', `/user/public-profile/ppp-nonexistent-${suffix}/competitive-profile`, stranger.headers);
  check('preview sin public_profile -> 404', previewNoProfile.status === 404);
  check('mismo código/mensaje que username inexistente vía el endpoint público', previewNoProfile.body?.error?.code === publicNonexistent.body?.error?.code && previewNoProfile.body?.error?.message === publicNonexistent.body?.error?.message);

  console.log('--- 6. La preview no acepta accountId/username para consultar otra cuenta (invariante estructural de ruta) ---');
  const previewForStranger = await req('GET', '/user/public-profile/me/preview', stranger.headers);
  check('la preview de "stranger" nunca puede devolver los datos de "owner" (siempre resuelve request.accountId, sin parámetro de entrada)', previewForStranger.body?.username !== ownerUsername);

  console.log('--- 7. Verificación estática: sin segunda whitelist -- el controller reutiliza toCompetitiveProfileResponse/competitiveProfileResponseSchema, nunca un serializer paralelo ---');
  const fs = await import('node:fs');
  const controllerSource = fs.readFileSync(new URL('../src/user/public-profile.controller.ts', import.meta.url), 'utf-8');
  const previewMethodMatch = controllerSource.match(/getMyCompetitiveProfilePreview[\s\S]*?\n  \}/);
  const previewMethodSource = previewMethodMatch?.[0] ?? '';
  check('el método del endpoint de preview invoca toCompetitiveProfileResponse (mismo serializer que el endpoint público por username)', previewMethodSource.includes('toCompetitiveProfileResponse'));
  check('el método del endpoint de preview NO usa meCompetitiveProfileResponseSchema/toMeCompetitiveProfileResponse (forma privilegiada de autoconsulta)', !previewMethodSource.includes('toMeCompetitiveProfileResponse') && !previewMethodSource.includes('meCompetitiveProfileResponseSchema'));
  const serviceSource = fs.readFileSync(new URL('../src/user/user.service.ts', import.meta.url), 'utf-8');
  const previewServiceMatch = serviceSource.match(/async getMyCompetitiveProfilePreview[\s\S]*?\n  \}/);
  const previewServiceSource = previewServiceMatch?.[0] ?? '';
  check('el método de dominio de preview delega en getCompetitiveProfileByUsername (mismo camino de código exacto que un tercero)', previewServiceSource.includes('this.getCompetitiveProfileByUsername('));

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Vista Previa Pública (LEF Bloque V, Incremento 7) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
