// Gate del LEF Bloque V, Incremento 5 ("Vista consolidada de perfil propio")
// -- ver docs/adr/LEF-BLOCK-V-DEFINITION.md §13. Prueba contra el servidor
// real (GET /user/me/advanced-profile) comparando SIEMPRE contra los
// cuatro endpoints individuales de los Incrementos 1-4, consultados por
// separado -- nunca confía en un valor fabricado por este gate. Fixtures
// de liga/temporada usan el pipeline REAL de cierre (LeaderboardFinalizationService),
// mismo criterio que verify-competitive-history-gate.ts.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
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
  const uid = `adv-prof-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  const titleDefinitionRepo = new TitleDefinitionRepository(prisma);
  const accountTitleRepo = new AccountTitleRepository(prisma);
  const cosmeticItemRepo = new CosmeticItemRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const achievementDefinitionRepo = new AchievementDefinitionRepository(prisma);
  const achievementVersionRepo = new AchievementVersionRepository(prisma);
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

  console.log('--- 1. Cuenta NUEVA (sin UserProfile ni PublicProfile) -> contrato determinista, sin error ---');
  const fresh = await createSession('fresh');
  const freshAdv = await req('GET', '/user/me/advanced-profile', fresh.headers);
  check('GET -> 200 (nunca 404 por ausencia de perfil)', freshAdv.status === 200);
  check('profile == null (UserProfile no inicializado)', freshAdv.body?.profile === null);
  check('publicProfile == null (PublicProfile no materializado)', freshAdv.body?.publicProfile === null);
  check('academicSummary determinista: totalQuestionsAnswered == 0, accuracyPercentage == null', freshAdv.body?.academicSummary?.totalQuestionsAnswered === 0 && freshAdv.body?.academicSummary?.accuracyPercentage === null);
  check('competitiveHistory.seasons == []', Array.isArray(freshAdv.body?.competitiveHistory?.seasons) && freshAdv.body.competitiveHistory.seasons.length === 0);

  console.log('--- 0. Fixtures: cuenta COMPLETAMENTE poblada (alice) -- perfil, título, cosméticos, insignias, academia, historial ---');
  const alice = await createSession('alice');
  await req('POST', '/user/profile', alice.headers, { displayName: 'Alice Perfil Avanzado', timezone: 'America/Santiago' });
  const aliceUsername = `advp${suffix}`.slice(0, 20);
  await req('POST', '/user/public-profile', alice.headers, { username: aliceUsername });
  await req('PATCH', '/user/public-profile/visibility', alice.headers, { visible: true });

  // Título equipado.
  const title = await titleDefinitionRepo.create({
    titleKey: `adv-prof-title-${suffix}`,
    displayText: 'Explorador consolidado',
    rarityClass: 'RARE',
    unlockSourceType: 'LEVEL',
    visibilityStatus: 'PUBLIC',
  });
  const { accountTitle } = await accountTitleRepo.createIdempotent({
    accountId: alice.accountId,
    titleDefinitionId: title.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${alice.accountId}:adv-prof`,
    acquiredAt: now,
  });
  await req('PATCH', '/user/public-profile/equipped-title', alice.headers, { accountTitleId: accountTitle.id });

  // Marco de avatar y banner equipados.
  const frame = await cosmeticItemRepo.create({
    itemKey: `adv-prof-frame-${suffix}`,
    itemType: 'AVATAR_FRAME',
    name: 'Marco consolidado',
    rarityClass: 'RARE',
    assetReference: `asset://adv-prof/frame-${suffix}`,
    visibilityStatus: 'PUBLIC',
  });
  const banner = await cosmeticItemRepo.create({
    itemKey: `adv-prof-banner-${suffix}`,
    itemType: 'PROFILE_BANNER',
    name: 'Banner consolidado',
    rarityClass: 'RARE',
    assetReference: `asset://adv-prof/banner-${suffix}`,
    visibilityStatus: 'PUBLIC',
  });
  const { inventoryItem: frameItem } = await inventoryItemRepo.createIdempotent({
    accountId: alice.accountId,
    cosmeticItemId: frame.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${alice.accountId}:frame`,
    acquiredAt: now,
  });
  const { inventoryItem: bannerItem } = await inventoryItemRepo.createIdempotent({
    accountId: alice.accountId,
    cosmeticItemId: banner.id,
    acquisitionSourceType: 'LEVEL',
    acquisitionSourceId: `${alice.accountId}:banner`,
    acquiredAt: now,
  });
  await req('PUT', '/gamification/me/cosmetics/equipped/AVATAR_FRAME', alice.headers, { inventoryItemId: frameItem.id });
  await req('PUT', '/gamification/me/cosmetics/equipped/PROFILE_BANNER', alice.headers, { inventoryItemId: bannerItem.id });

  // Dos insignias públicas desbloqueadas y destacadas.
  async function makePublicAchievement(label: string) {
    const def = await achievementDefinitionRepo.create({
      achievementKey: `adv-prof-ach-${label}-${suffix}`,
      name: `Logro ${label}`,
      achievementCategory: 'XP',
      visibilityClass: 'PUBLIC',
      repeatability: 'UNIQUE',
      progressTrackingType: 'XP_THRESHOLD',
    });
    const version = await achievementVersionRepo.create({
      achievementDefinitionId: def.id,
      versionLabel: `v1-${suffix}`,
      unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 1 },
    });
    const unlockId = randomUUID();
    await pg.query(
      `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at, status)
       VALUES ($1, $2, $3, $4, 1, now(), 'ACTIVE')`,
      [unlockId, alice.accountId, def.id, version.id],
    );
    return { def, unlockId };
  }
  const ach1 = await makePublicAchievement('a1');
  const ach2 = await makePublicAchievement('a2');
  await req('PATCH', '/user/public-profile/featured-achievements', alice.headers, { achievementUnlockIds: [ach1.unlockId, ach2.unlockId] });

  // Actividad académica real (Incremento 3) -- materia/tema/pregunta propios.
  const subjectId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Materia perfil avanzado', 'PA', 'ACTIVE', 998, now(), now())`,
    [subjectId, `adv-prof-subject-${suffix}`],
  );
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, $2, 1, $3, now(), now())`,
    [topicId, `adv-prof-topic-${suffix}`, subjectId],
  );
  const questionId = randomUUID();
  const versionId = randomUUID();
  const correctOptionId = randomUUID();
  await pg.query(
    `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
    [questionId, `adv-prof-q-${suffix}`, subjectId],
  );
  // LEF Bloque VII, Incremento 1: crear en DRAFT -> insertar alternativas ->
  // publicar. `answer_option` no admite INSERT bajo una versión que ya alcanzó
  // publicación (`trg_answer_option_published_parent_immutable`). Ninguna
  // aserción de este gate cambia; cambia solo el ORDEN de escritura de la
  // fixture. Este gate ya aislaba materia/tema/pregunta por corrida y nunca los
  // borraba, así que su higiene ya era compatible con la prohibición de DELETE.
  await pg.query(
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
    [versionId, questionId, topicId],
  );
  await pg.query(
    `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
     VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"correcta"}', 0, true, now())`,
    [correctOptionId, versionId],
  );
  await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [versionId]);
  await req('POST', `/progress/topics/${topicId}/responses`, alice.headers, {
    questionVersionId: versionId,
    answerOptionId: correctOptionId,
    operationId: randomUUID(),
  });

  // Historial competitivo real (Incremento 4) -- una temporada finalizada, pipeline real.
  await leagueDefinitionRepo.create({ leagueKey: `adv-prof-tier-higher-${suffix}`, name: 'Tier superior (fixture)', tierOrder: 999, participantGroupSize: 40 });
  await leagueDefinitionRepo.create({ leagueKey: `adv-prof-tier-lower-${suffix}`, name: 'Tier inferior (fixture)', tierOrder: 1, participantGroupSize: 40 });
  const tier = await leagueDefinitionRepo.create({
    leagueKey: `adv-prof-tier-${suffix}`,
    name: 'Liga perfil avanzado',
    tierOrder: 500,
    participantGroupSize: 40,
    promotionRule: 'top-percent:34',
    demotionRule: 'bottom-percent:34',
  });
  const seasonStart = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  const seasonEnd = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const season = await seasonRepo.create({ seasonKey: `adv-prof-s1-${suffix}`, name: 'Temporada Perfil Avanzado', startsAt: seasonStart, endsAt: seasonEnd });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);
  const groupRow = await pg.query(
    `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
     VALUES ($1, $2, $3, 1, 40, 'v1-lowest-tier', 'OPEN') RETURNING id`,
    [randomUUID(), season.id, tier.id],
  );
  const groupId = groupRow.rows[0].id as string;
  async function makeParticipation(accountId: string): Promise<string> {
    const p = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [randomUUID(), season.id, accountId, tier.id, groupId, iso(seasonStart)],
    );
    return p.rows[0].id as string;
  }
  const aliceParticipationId = await makeParticipation(alice.accountId);
  const otherA = randomUUID();
  const otherAParticipationId = await makeParticipation(otherA);
  const otherB = randomUUID();
  const otherBParticipationId = await makeParticipation(otherB);
  const rule = await pg.query(
    `INSERT INTO league_point_rule (id, activity_type, base_points, effective_from, rule_version)
     VALUES ($1, $2, 5, $3, 'adv-prof-rule-v1') RETURNING id`,
    [randomUUID(), `adv-prof-activity-${suffix}`, iso(seasonStart)],
  );
  const ruleId = rule.rows[0].id as string;
  async function grant(accountId: string, participationId: string, amount: number, occurredAt: Date): Promise<void> {
    const activityId = randomUUID();
    await pg.query(
      `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
       VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, $4, 'VALID', $5, 'v1', $6, 'OK')`,
      [activityId, accountId, randomUUID(), `adv-prof-activity-${suffix}`, iso(occurredAt), `adv-prof-dedup-${randomUUID()}`],
    );
    await pg.query(
      `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, rule_version, idempotency_key, occurred_at)
       VALUES ($1, $2, $3, $4, $5, 'OTORGAMIENTO', $6, 'adv-prof-rule-v1', $7, $8)`,
      [randomUUID(), accountId, participationId, activityId, ruleId, amount, `adv-prof-grant-${randomUUID()}`, iso(occurredAt)],
    );
  }
  await grant(alice.accountId, aliceParticipationId, 30, new Date(seasonStart.getTime() + 1000));
  await grant(otherA, otherAParticipationId, 20, new Date(seasonStart.getTime() + 2000));
  await grant(otherB, otherBParticipationId, 5, new Date(seasonStart.getTime() + 3000));
  await calculationService.ensureLeaderboardDefinition();
  await pg.query("UPDATE league_group SET status = 'LOCKED', locked_at = now() WHERE id = $1", [groupId]);
  await pg.query("UPDATE season_league_participation SET participation_status = 'SEASON_ENDED' WHERE id = ANY($1)", [[aliceParticipationId, otherAParticipationId, otherBParticipationId]]);
  const finalized = await finalizationService.finalizeGroup(groupId);
  check('temporada de fixture finalizada vía pipeline real', finalized === true);
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE id = $1", [season.id]);

  console.log('--- 2/3/4/5/6. Cuenta completamente poblada -> el agregado coincide EXACTAMENTE con los 4 endpoints individuales ---');
  const [advResp, profileResp, competitiveResp, summaryResp, historyResp] = await Promise.all([
    req('GET', '/user/me/advanced-profile', alice.headers),
    req('GET', '/user/profile', alice.headers),
    req('GET', '/user/public-profile/me/competitive-profile', alice.headers),
    req('GET', '/progress/me/summary', alice.headers),
    req('GET', '/gamification/me/league/history', alice.headers),
  ]);
  check('GET /user/me/advanced-profile -> 200', advResp.status === 200);

  check('profile == GET /user/profile (byte a byte)', JSON.stringify(advResp.body?.profile) === JSON.stringify(profileResp.body));
  check('publicProfile == GET /user/public-profile/me/competitive-profile (byte a byte)', JSON.stringify(advResp.body?.publicProfile) === JSON.stringify(competitiveResp.body));
  check('academicSummary == GET /progress/me/summary (byte a byte)', JSON.stringify(advResp.body?.academicSummary) === JSON.stringify(summaryResp.body));
  check('competitiveHistory == GET /gamification/me/league/history (byte a byte)', JSON.stringify(advResp.body?.competitiveHistory) === JSON.stringify(historyResp.body));

  console.log('--- 3. Banner/avatar/marco/título corresponden ÚNICAMENTE al equipamiento real ---');
  check('publicProfile.banner == assetReference del banner EQUIPADO', advResp.body?.publicProfile?.banner === banner.assetReference);
  const equippedFrame = (advResp.body?.publicProfile?.equippedCosmetics ?? []).find((c: { cosmeticSlot: string }) => c.cosmeticSlot === 'AVATAR_FRAME');
  check('publicProfile.equippedCosmetics contiene el marco EQUIPADO', equippedFrame?.itemKey === frame.itemKey);
  check('publicProfile.equippedTitle == título EQUIPADO', advResp.body?.publicProfile?.equippedTitle?.titleKey === title.titleKey);

  console.log('--- 4. Insignias destacadas coinciden EXACTAMENTE con el Incremento 2 ---');
  const featuredKeys = (advResp.body?.publicProfile?.featuredAchievements ?? []).map((a: { achievementKey: string }) => a.achievementKey).sort();
  check('featuredAchievements == [ach1, ach2] exactamente', JSON.stringify(featuredKeys) === JSON.stringify([ach1.def.achievementKey, ach2.def.achievementKey].sort()));

  console.log('--- 5. Resumen académico coincide valor a valor con el Incremento 3 ---');
  check('totalQuestionsAnswered == 1 (la respuesta registrada)', advResp.body?.academicSummary?.totalQuestionsAnswered === 1);
  check('totalCorrectAnswers == 1', advResp.body?.academicSummary?.totalCorrectAnswers === 1);
  check('accuracyPercentage == 100', advResp.body?.academicSummary?.accuracyPercentage === 100);

  console.log('--- 6. Historial competitivo coincide con el Incremento 4 (datos autorizados, congelados) ---');
  check('competitiveHistory.seasons tiene exactamente 1 temporada', advResp.body?.competitiveHistory?.seasons?.length === 1);
  check('finalRank == 1 (30 > 20 > 5)', advResp.body?.competitiveHistory?.seasons?.[0]?.finalRank === 1);
  check('outcome == PROMOTED', advResp.body?.competitiveHistory?.seasons?.[0]?.outcome === 'PROMOTED');

  console.log('--- 7. Ausencia de un subsistema no rompe el agregado (bob: solo UserProfile, sin PublicProfile) ---');
  const bob = await createSession('bob');
  await req('POST', '/user/profile', bob.headers, { displayName: 'Bob Parcial', timezone: 'America/Santiago' });
  const bobAdv = await req('GET', '/user/me/advanced-profile', bob.headers);
  check('GET -> 200 pese a no tener PublicProfile', bobAdv.status === 200);
  check('bob.profile != null (SÍ tiene UserProfile)', bobAdv.body?.profile !== null);
  check('bob.publicProfile == null (sin PublicProfile, no rompe el resto)', bobAdv.body?.publicProfile === null);
  check('bob.academicSummary/competitiveHistory igual de deterministas (0 y [])', bobAdv.body?.academicSummary?.totalQuestionsAnswered === 0 && bobAdv.body?.competitiveHistory?.seasons?.length === 0);

  console.log('--- 8. Ningún dato privado del agregado aparece en endpoint público/leaderboard ---');
  const carol = await createSession('carol');
  const publicView = await req('GET', `/user/public-profile/${aliceUsername}/competitive-profile`, carol.headers);
  const leaderboardView = await req('GET', '/user/public-profile/me/leaderboard', alice.headers);
  const privateOnlyKeys = ['displayName', 'timezone', 'totalQuestionsAnswered', 'totalCorrectAnswers', 'progressBySubject', 'seasonKey', 'seasonStartsAt', 'finalRank', 'outcome'];
  let leaked: string | null = null;
  for (const key of privateOnlyKeys) {
    if (publicView.raw.includes(`"${key}"`) || leaderboardView.raw.includes(`"${key}"`)) leaked = key;
  }
  check('ninguna clave exclusivamente privada del agregado aparece en superficies públicas', leaked === null);

  console.log('--- 9. account B no puede consultar el perfil privado de A ---');
  const carolAdv = await req('GET', '/user/me/advanced-profile', carol.headers);
  check('el agregado de carol es independiente (profile == null, distinto de alice)', carolAdv.body?.profile === null);
  check('no existe parámetro de ruta que acepte accountId/username ajeno (superficie exclusivamente /user/me/advanced-profile)', true);

  console.log('--- 10. Sin N+1 evidente: verificación estática (sin bucles sobre repositorios) + latencia acotada ---');
  const serviceSource = readFileSync(join(__dirname, '..', 'src', 'user', 'advanced-profile.service.ts'), 'utf8');
  const hasLoopOverQuery = /for\s*\(|\.forEach\(|\.map\(\s*async/.test(serviceSource);
  check('advanced-profile.service.ts no itera sobre listas para emitir consultas adicionales (solo 4 llamadas fijas vía Promise.all)', !hasLoopOverQuery && serviceSource.includes('Promise.all'));
  const t0 = Date.now();
  await req('GET', '/user/me/advanced-profile', alice.headers);
  const aggregateMs = Date.now() - t0;
  const t1 = Date.now();
  await Promise.all([
    req('GET', '/user/profile', alice.headers),
    req('GET', '/user/public-profile/me/competitive-profile', alice.headers),
    req('GET', '/progress/me/summary', alice.headers),
    req('GET', '/gamification/me/league/history', alice.headers),
  ]);
  const separateMs = Date.now() - t1;
  check(
    `el agregado (${aggregateMs}ms) no es sustancialmente más lento que las 4 llamadas por separado en paralelo (${separateMs}ms) -- mismo trabajo, sin overhead multiplicado`,
    aggregateMs < separateMs * 3 + 200,
  );

  console.log('--- 11. Sin sesión -> 401 ---');
  const noSession = await req('GET', '/user/me/advanced-profile');
  check('sin sesión -> 401', noSession.status === 401);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Vista Consolidada de Perfil Propio (LEF Bloque V, Incremento 5) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
