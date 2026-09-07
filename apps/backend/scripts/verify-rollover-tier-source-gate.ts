// PF2-C.3A -- gate de la FUENTE DEL TIER en el rollover / join manual.
//
// Defecto de la frontera natural (2026-09-07): `resolveTargetTier` derivaba
// el tier de entrada de `findMostRecentByAccountId` (la participación con el
// `joinedAt` global más grande, SIN filtro de dominio). Una participación
// `RETAINED` de una temporada `lpg-season-*` de gate (ARCHIVED, joined
// después) ensombreció al predecesor canónico `comp-v1-*` (`PROMOTED`) y la
// cuenta se auto-inscribió un tier POR DEBAJO del que le correspondía, sin el
// marco del tier superado.
//
// El fix: el auto-rollover se ata al `previousSeasonId` EXACTO
// (`findTerminalForAccountInSeason`); el join manual usa el historial
// competitivo LEGÍTIMO por CRONOLOGÍA DE TEMPORADA
// (`findMostRecentCompetitiveTerminalBefore`, prefijo `comp-v1-`, estado
// terminal, temporada anterior a la activa). `joinedAt` ya no decide nada.
//
// SIN HTTP -- ejercita `SeasonRolloverService.rollover` y
// `LeagueEnrollmentService.joinActiveSeason` reales contra Postgres de gates.
// Se ejecuta vía run-gate.ts -> axioma_gates_dev. HARD FAIL si apunta a axioma_dev.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { assertGateDb, finalizeStaleGateSeasons, retireOtherActiveLeagues } from './gate-db-safety';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { RewardGrantRepository } from '../src/gamification/reward-grant.repository';
import { RewardGrantComponentRepository } from '../src/gamification/reward-grant-component.repository';
import { RewardEvaluationCursorRepository } from '../src/gamification/reward-evaluation-cursor.repository';
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { ProgressionService } from '../src/gamification/progression.service';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import { AchievementProgressRepository } from '../src/gamification/achievement-progress.repository';
import { AchievementUnlockRepository } from '../src/gamification/achievement-unlock.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { TitleEligibilityService } from '../src/gamification/title-eligibility.service';
import { SubjectCompletionService } from '../src/gamification/subject-completion.service';
import { SubjectRepository } from '../src/education/subject.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { AccountChallengeRepository } from '../src/gamification/account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from '../src/gamification/account-challenge-daily-progress.repository';
import { AccountChallengeConsumedEventRepository } from '../src/gamification/account-challenge-consumed-event.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { CurriculumTopicRepository } from '../src/education/curriculum-topic.repository';
import { CurriculumTopicProgressRepository } from '../src/progress/curriculum-topic-progress.repository';
import { LeagueEnrollmentService } from '../src/gamification/league-enrollment.service';
import { SeasonRolloverService } from '../src/gamification/season-rollover.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}
const iso = (d: Date) => d.toISOString();
const DAY = 86_400_000;
const HOUR = 3_600_000;

type TerminalStatus = 'PROMOTED' | 'DEMOTED' | 'RETAINED';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);

  const worker = new RewardEvaluationWorker(
    prisma, new XpLedgerEntryRepository(prisma), new RewardEvaluationCursorRepository(prisma), new XpBalanceRepository(prisma),
    new ProgressionService(new XpBalanceRepository(prisma), new XpLedgerEntryRepository(prisma), new LevelDefinitionRepository(prisma)),
    new LevelDefinitionRepository(prisma), bundleRepo, new RewardGrantRepository(prisma), new RewardGrantComponentRepository(prisma), txRunner,
    new AchievementDefinitionRepository(prisma), new AchievementVersionRepository(prisma), new AchievementProgressRepository(prisma),
    new AchievementUnlockRepository(prisma), new AccountTitleRepository(prisma), inventoryItemRepo,
    new ChallengeDefinitionRepository(prisma), new AccountChallengeRepository(prisma), new AccountChallengeDailyProgressRepository(prisma),
    new AccountChallengeConsumedEventRepository(prisma), new ValidatedGamificationActivityRepository(prisma),
    new CurriculumTopicRepository(prisma), new CurriculumTopicProgressRepository(prisma), new TitleDefinitionRepository(prisma),
    new TitleEligibilityService(prisma, new SubjectRepository(prisma), new CurriculumTopicRepository(prisma), new CurriculumTopicProgressRepository(prisma), new ProgressionService(new XpBalanceRepository(prisma), new XpLedgerEntryRepository(prisma), new LevelDefinitionRepository(prisma))),
    new SubjectCompletionService(new CurriculumTopicRepository(prisma), new CurriculumTopicProgressRepository(prisma), new SubjectRepository(prisma)),
  );
  const enrollmentService = new LeagueEnrollmentService(prisma, seasonRepo, leagueDefRepo, leagueGroupRepo, participationRepo, bundleRepo, worker);
  const rolloverService = new SeasonRolloverService(participationRepo, enrollmentService);

  const suffix = Date.now();
  const NOW = new Date();

  // Sólo una temporada ACTIVE a la vez -- barre residuo de otros gates.
  await finalizeStaleGateSeasons(pg);
  await pg.query(
    `UPDATE game_season SET status = 'FINALIZED', finalized_at = now()
     WHERE status = 'ACTIVE' AND season_key ~ '${'-[0-9]{10,}$'}'`,
  );

  // --- Escalera de 5 tiers, marco en cada uno. tierOrder 1..5 colisiona con
  //     las 7 ligas reales seedeadas -> se retiran todas las ajenas. ---
  async function makeTier(order: number): Promise<{ id: string; key: string; frameCosmeticId: string }> {
    const cos = await pg.query(
      `INSERT INTO cosmetic_item (id, item_key, item_type, name, rarity_class, asset_reference, visibility_status, status)
       VALUES ($1, $2, 'AVATAR_FRAME', $3, 'COMMON', $4, 'PUBLIC', 'ACTIVE') RETURNING id`,
      [randomUUID(), `rts-frame-t${order}-${suffix}`, `Marco T${order}`, `asset://rts/${order}-${suffix}`],
    );
    const cosId = cos.rows[0].id as string;
    const bundle = await bundleRepo.create({ bundleKey: `rts-bundle-t${order}-${suffix}`, name: `T${order}`, items: [{ componentType: 'COSMETIC', referenceId: cosId }] });
    const def = await leagueDefRepo.create({ leagueKey: `rts-tier${order}-${suffix}`, name: `Tier ${order}`, tierOrder: order, participantGroupSize: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20', rewardBundleId: bundle.id });
    return { id: def.id, key: def.leagueKey, frameCosmeticId: cosId };
  }
  const t1 = await makeTier(1); // Bronce
  const t2 = await makeTier(2); // Plata
  const t3 = await makeTier(3); // Oro
  const t4 = await makeTier(4);
  const t5 = await makeTier(5);
  await retireOtherActiveLeagues(pg, [t1.key, t2.key, t3.key, t4.key, t5.key]);

  // --- helpers de fixture ---
  async function seedSeason(
    label: string,
    status: 'FINALIZED' | 'ACTIVE',
    startsAt: Date,
    endsAt: Date,
  ): Promise<string> {
    const id = randomUUID();
    // Clave con prefijo `comp-v1-` (historial competitivo legítimo) + marca epoch.
    await pg.query(
      `INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status, finalized_at)
       VALUES ($1, $2, $2, $3, $4, $5, $6)`,
      [id, `comp-v1-rts-${label}-${suffix}`, iso(startsAt), iso(endsAt), status, status === 'FINALIZED' ? iso(endsAt) : null],
    );
    return id;
  }

  /** Participación TERMINAL en una temporada `comp-v1-*` FINALIZED (grupo FINALIZED). */
  async function seedTerminalParticipation(
    seasonId: string,
    accountId: string,
    tierId: string,
    status: TerminalStatus,
    finalRank: number,
    joinedAt: Date,
  ): Promise<string> {
    let groupId: string;
    const existing = await pg.query(
      `SELECT id FROM league_group WHERE game_season_id = $1 AND league_definition_id = $2 LIMIT 1`,
      [seasonId, tierId],
    );
    if (existing.rows[0]) {
      groupId = existing.rows[0].id as string;
    } else {
      groupId = randomUUID();
      await pg.query(
        `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status, locked_at, finalized_at)
         VALUES ($1, $2, $3, 1, 30, 'v1-lowest-tier', 'FINALIZED', $4, $4)`,
        [groupId, seasonId, tierId, iso(joinedAt)],
      );
    }
    const pid = randomUUID();
    await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, league_points, participation_status, joined_at, final_rank, finalized_at)
       VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $7)`,
      [pid, seasonId, accountId, tierId, groupId, status, iso(joinedAt), finalRank],
    );
    return pid;
  }

  /** Participación NO terminal (`SEASON_ENDED`) en una temporada `comp-v1-*`. */
  async function seedSeasonEndedParticipation(seasonId: string, accountId: string, tierId: string, joinedAt: Date): Promise<string> {
    const groupId = randomUUID();
    await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status, locked_at)
       VALUES ($1, $2, $3, 2, 30, 'v1-lowest-tier', 'LOCKED', $4)`,
      [groupId, seasonId, tierId, iso(joinedAt)],
    );
    const pid = randomUUID();
    await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, league_points, participation_status, joined_at, finalized_at)
       VALUES ($1, $2, $3, $4, $5, 0, 'SEASON_ENDED', $6, $6)`,
      [pid, seasonId, accountId, tierId, groupId, iso(joinedAt)],
    );
    return pid;
  }

  /**
   * RESIDUO ADVERSARIO -- participación `RETAINED` en una temporada
   * `lpg-season-*` ARCHIVED, con `joinedAt` POSTERIOR al historial canónico.
   * Reproduce exactamente `d0d8dede` (gate de participación de liga).
   */
  async function seedLpgResidue(accountId: string, tierId: string, joinedAt: Date): Promise<string> {
    const seasonId = randomUUID();
    await pg.query(
      `INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status, finalized_at)
       VALUES ($1, $2, $2, $3, $4, 'ARCHIVED', $4)`,
      [seasonId, `lpg-season-rts-${suffix}-${randomUUID().slice(0, 6)}`, iso(new Date(joinedAt.getTime() - HOUR)), iso(joinedAt)],
    );
    const groupId = randomUUID();
    await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status, locked_at, finalized_at)
       VALUES ($1, $2, $3, 1, 30, 'v1-lowest-tier', 'FINALIZED', $4, $4)`,
      [groupId, seasonId, tierId, iso(joinedAt)],
    );
    const pid = randomUUID();
    await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, league_points, participation_status, joined_at, final_rank, finalized_at)
       VALUES ($1, $2, $3, $4, $5, 0, 'RETAINED', $6, 1, $6)`,
      [pid, seasonId, accountId, tierId, groupId, iso(joinedAt)],
    );
    return pid;
  }

  async function tierOf(accountId: string, seasonId: string): Promise<{ tierOrder: number | null; leagueKey: string | null; lp: number | null; status: string | null; groupId: string | null }> {
    const r = await pg.query(
      `SELECT ld.tier_order, ld.league_key, p.league_points, p.participation_status, p.league_group_id
       FROM season_league_participation p JOIN league_definition ld ON ld.id = p.league_definition_id
       WHERE p.account_id = $1 AND p.game_season_id = $2`,
      [accountId, seasonId],
    );
    if (!r.rows[0]) return { tierOrder: null, leagueKey: null, lp: null, status: null, groupId: null };
    return { tierOrder: r.rows[0].tier_order, leagueKey: r.rows[0].league_key, lp: r.rows[0].league_points, status: r.rows[0].participation_status, groupId: r.rows[0].league_group_id };
  }
  async function frameCount(accountId: string, cosmeticId: string): Promise<number> {
    return (await pg.query(`SELECT count(*)::int AS n FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2`, [accountId, cosmeticId])).rows[0].n as number;
  }
  async function rewardGrantCount(accountId: string, leagueId: string): Promise<number> {
    // `deliverLeagueFrameReward` -> `deliverBundleComponents(acc, bundle, 'LEAGUE', `${accountId}:${league.id}`)`
    // (prefijo de cuenta obligatorio, STABILIZATION-B) -> `source_entity_id = '{accountId}:{leagueId}'`.
    return (await pg.query(
      `SELECT count(*)::int AS n FROM reward_grant WHERE account_id = $1 AND source_entity_type = 'LEAGUE' AND source_entity_id = $2`,
      [accountId, `${accountId}:${leagueId}`],
    )).rows[0].n as number;
  }
  async function equippedFrameCount(accountId: string): Promise<number> {
    return (await pg.query(
      `SELECT count(*)::int AS n FROM equipped_cosmetic ec JOIN inventory_item ii ON ii.id = ec.inventory_item_id
       JOIN cosmetic_item ci ON ci.id = ii.cosmetic_item_id WHERE ii.account_id = $1 AND ci.item_type = 'AVATAR_FRAME'`,
      [accountId],
    )).rows[0].n as number;
  }
  async function countParticipations(accountId: string, seasonId: string): Promise<number> {
    return (await pg.query(`SELECT count(*)::int AS n FROM season_league_participation WHERE account_id = $1 AND game_season_id = $2`, [accountId, seasonId])).rows[0].n as number;
  }

  // ==================================================================
  // Temporadas: predecesora A (FINALIZED) + sucesora B (ACTIVE ahora).
  // Para el escenario G además una N-2.
  // ==================================================================
  const seasonN2 = await seedSeason('N2', 'FINALIZED', new Date(NOW.getTime() - 21 * DAY), new Date(NOW.getTime() - 14 * DAY));
  const seasonA = await seedSeason('A', 'FINALIZED', new Date(NOW.getTime() - 14 * DAY), new Date(NOW.getTime() - 7 * DAY));
  const seasonB = await seedSeason('B', 'ACTIVE', new Date(NOW.getTime() - HOUR), new Date(NOW.getTime() + 7 * DAY));

  const bStart = new Date(NOW.getTime() - HOUR);

  // Cuentas
  const P1 = randomUUID();   // A: PROMOTED en t1  (+ residuo lpg RETAINED t1, joined después) -> B: t2 + marco t1
  const P2 = randomUUID();   // A: RETAINED en t1  (+ residuo lpg)                              -> B: t1, sin marco
  const P3 = randomUUID();   // A: DEMOTED en t3   (+ residuo lpg)                              -> B: t2, sin marco de promo
  const P_NOHIST = randomUUID();       // sin participación en A -> fail-closed
  const P_SEASONENDED = randomUUID();  // A: SEASON_ENDED (no terminal) -> fail-closed
  const M1 = randomUUID();  // join MANUAL: N-2 PROMOTED t1 (NO en A) + residuo lpg -> t2 + marco t1
  const M2 = randomUUID();  // participó en N-2 (PROMOTED t1), NO en A -> NO auto-roll; join manual -> t2
  const NEWP = randomUUID(); // sin historial comp-v1 (sólo residuo lpg) -> tier base

  // Predecesora A
  const p1A = await seedTerminalParticipation(seasonA, P1, t1.id, 'PROMOTED', 1, new Date(NOW.getTime() - 14 * DAY + HOUR));
  await seedTerminalParticipation(seasonA, P2, t1.id, 'RETAINED', 2, new Date(NOW.getTime() - 14 * DAY + 2 * HOUR));
  await seedTerminalParticipation(seasonA, P3, t3.id, 'DEMOTED', 9, new Date(NOW.getTime() - 14 * DAY + 3 * HOUR));
  await seedSeasonEndedParticipation(seasonA, P_SEASONENDED, t1.id, new Date(NOW.getTime() - 14 * DAY + 4 * HOUR));

  // N-2 -- M1 y M2 tienen su terminal PROMOTED aquí (NINGUNO participó en A,
  // así que el rollover de A NO los toca -> prueban el camino MANUAL).
  await seedTerminalParticipation(seasonN2, M1, t1.id, 'PROMOTED', 2, new Date(NOW.getTime() - 21 * DAY + HOUR));
  await seedTerminalParticipation(seasonN2, M2, t1.id, 'PROMOTED', 1, new Date(NOW.getTime() - 21 * DAY + 2 * HOUR));

  // Residuo lpg -- joined_at ~ahora (MUCHO después del historial canónico).
  const lpgP1 = await seedLpgResidue(P1, t1.id, new Date(NOW.getTime() - 30 * 60_000));
  await seedLpgResidue(P2, t1.id, new Date(NOW.getTime() - 29 * 60_000));
  await seedLpgResidue(P3, t1.id, new Date(NOW.getTime() - 28 * 60_000));
  await seedLpgResidue(M1, t1.id, new Date(NOW.getTime() - 27 * 60_000));
  await seedLpgResidue(NEWP, t1.id, new Date(NOW.getTime() - 26 * 60_000));

  check('fixture: residuo lpg de P1 tiene joinedAt POSTERIOR a su participación canónica en A', (await pg.query('SELECT (SELECT joined_at FROM season_league_participation WHERE id=$1) > (SELECT joined_at FROM season_league_participation WHERE id=$2) AS x', [lpgP1, p1A])).rows[0].x === true);

  // ==================================================================
  // 0. CONTRASTE PRE-FIX vs POST-FIX (a nivel de repositorio).
  // ==================================================================
  console.log('--- 0. la fuente vieja (findMostRecentByAccountId) elegía el residuo; las nuevas eligen el predecesor canónico ---');
  const preFixSource = await participationRepo.findMostRecentByAccountId(P1);
  check('PRE-FIX: findMostRecentByAccountId(P1) = la participación lpg RETAINED (FUENTE ERRÓNEA que causó el defecto de la frontera natural)', preFixSource?.id === lpgP1 && preFixSource?.participationStatus === 'RETAINED');
  const rolloverSource = await participationRepo.findTerminalForAccountInSeason(P1, seasonA);
  check('POST-FIX (rollover): findTerminalForAccountInSeason(P1, A) = la PROMOTED canónica en A', rolloverSource?.id === p1A && rolloverSource?.participationStatus === 'PROMOTED');
  const manualSource = await participationRepo.findMostRecentCompetitiveTerminalBefore(P1, { id: seasonB, startsAt: bStart });
  check('POST-FIX (manual): findMostRecentCompetitiveTerminalBefore(P1) ignora el residuo lpg y devuelve la PROMOTED canónica', manualSource?.id === p1A && manualSource?.participationStatus === 'PROMOTED');

  // ==================================================================
  // A. REPRODUCCIÓN DEL BUG -- auto-rollover del predecesor exacto.
  // ==================================================================
  console.log('--- A. auto-rollover: PROMOTED en A (t1) + residuo lpg RETAINED (joined después) -> B: t2 + marco t1 ---');
  const roll = await rolloverService.rollover(seasonA, NOW);
  check('rollover: 3 candidatas (P1/P2/P3 terminales en A), 3 inscritas, 0 fallidas', roll.candidates === 3 && roll.rolled === 3 && roll.failed === 0 && roll.notEligible === 0);

  const p1B = await tierOf(P1, seasonB);
  check('P1 -> B en tier SUPERIOR t2 (Plata), NO t1 -- el residuo lpg NO influye', p1B.tierOrder === 2 && p1B.leagueKey === t2.key);
  check('P1 -> B: LP = 0', p1B.lp === 0);
  check('P1 -> B: participación ACTIVE', p1B.status === 'ACTIVE');
  check('P1 recibe EXACTAMENTE 1 marco del tier SUPERADO (t1)', (await frameCount(P1, t1.frameCosmeticId)) === 1);
  check('P1 NO recibe el marco del tier de DESTINO (t2)', (await frameCount(P1, t2.frameCosmeticId)) === 0);
  check('P1: exactamente 1 reward_grant LEAGUE para t1', (await rewardGrantCount(P1, t1.id)) === 1);

  // ==================================================================
  // B. CONTROL RETAINED
  // ==================================================================
  console.log('--- B. control RETAINED: P2 RETAINED en A (t1) + residuo lpg -> B: t1, SIN marco ---');
  const p2B = await tierOf(P2, seasonB);
  check('P2 -> B en el MISMO tier t1 (Bronce)', p2B.tierOrder === 1 && p2B.leagueKey === t1.key);
  check('P2 -> B: LP = 0', p2B.lp === 0);
  check('P2 NO recibe ningún marco de liga', (await frameCount(P2, t1.frameCosmeticId)) === 0 && (await frameCount(P2, t2.frameCosmeticId)) === 0);

  // ==================================================================
  // C. CONTROL DEMOTED (tier no-inferior)
  // ==================================================================
  console.log('--- C. control DEMOTED: P3 DEMOTED en A (t3/Oro) + residuo lpg -> B: t2 (Plata), SIN marco de promoción ---');
  const p3B = await tierOf(P3, seasonB);
  check('P3 -> B en el tier INFERIOR t2 (Plata), NO t1 (el residuo lpg RETAINED t1 NO influye)', p3B.tierOrder === 2 && p3B.leagueKey === t2.key);
  check('P3 -> B: LP = 0', p3B.lp === 0);
  check('P3 NO recibe ningún marco (DEMOTED nunca supera un tier)', (await frameCount(P3, t1.frameCosmeticId)) === 0 && (await frameCount(P3, t2.frameCosmeticId)) === 0 && (await frameCount(P3, t3.frameCosmeticId)) === 0);

  // ==================================================================
  // D. RERUN IDEMPOTENTE
  // ==================================================================
  console.log('--- D. rollover x2: idempotente ---');
  const roll2 = await rolloverService.rollover(seasonA, NOW);
  check('2º rollover: 0 inscritas, 3 ya presentes, 0 fallidas', roll2.rolled === 0 && roll2.alreadyPresent === 3 && roll2.failed === 0);
  check('P1: sigue habiendo 1 sola participación en B', (await countParticipations(P1, seasonB)) === 1);
  check('P1: sigue teniendo 1 marco t1 (sin duplicar)', (await frameCount(P1, t1.frameCosmeticId)) === 1);
  check('P1: sigue teniendo 1 reward_grant LEAGUE t1', (await rewardGrantCount(P1, t1.id)) === 1);
  check('P1 -> B: tier t2 SIN cambio, LP sigue 0', (await tierOf(P1, seasonB)).tierOrder === 2 && (await tierOf(P1, seasonB)).lp === 0);

  // ==================================================================
  // E. FUENTE FAIL-CLOSED (rama de servicio, §24)
  //    El bucle real de `rollover()` sólo entrega cuentas CON participación
  //    terminal en `previousSeasonId`; el fallo por deriva concurrente no es
  //    reproducible en un gate de un solo hilo -> se ejercita la rama del
  //    servicio directamente.
  // ==================================================================
  console.log('--- E. fail-closed: sin fuente terminal en previousSeasonId -> NO se adivina tier, NO fallback ---');
  const e1 = await enrollmentService.joinActiveSeason(P_NOHIST, NOW, { sourcePreviousSeasonId: seasonA });
  check('E1 sin participación en A -> NO_TERMINAL_SOURCE_IN_PREVIOUS_SEASON', 'outcome' in e1 && e1.outcome === 'NO_TERMINAL_SOURCE_IN_PREVIOUS_SEASON');
  check('E1: NO se creó participación en B', (await countParticipations(P_NOHIST, seasonB)) === 0);
  const e2 = await enrollmentService.joinActiveSeason(P_SEASONENDED, NOW, { sourcePreviousSeasonId: seasonA });
  check('E2 con participación SEASON_ENDED (no terminal) en A -> NO_TERMINAL_SOURCE_IN_PREVIOUS_SEASON', 'outcome' in e2 && e2.outcome === 'NO_TERMINAL_SOURCE_IN_PREVIOUS_SEASON');
  check('E2: NO se creó participación en B', (await countParticipations(P_SEASONENDED, seasonB)) === 0);

  // ==================================================================
  // F. JOIN MANUAL CON RESIDUO
  // ==================================================================
  console.log('--- F. join manual: M1 (A PROMOTED t1 + residuo lpg RETAINED t1 joined después) -> t2 + marco t1 ---');
  const fJoin = await enrollmentService.joinActiveSeason(M1, NOW);
  check('F: M1 inscrito', 'participation' in fJoin && fJoin.created === true);
  const m1B = await tierOf(M1, seasonB);
  check('F: M1 -> B en tier SUPERIOR t2 (el residuo lpg NO ensombrece el historial comp-v1)', m1B.tierOrder === 2 && m1B.leagueKey === t2.key);
  check('F: M1 -> B: LP = 0', m1B.lp === 0);
  check('F: M1 recibe EXACTAMENTE 1 marco del tier SUPERADO (t1)', (await frameCount(M1, t1.frameCosmeticId)) === 1);
  check('F: M1 NO recibe el marco del tier de destino (t2)', (await frameCount(M1, t2.frameCosmeticId)) === 0);

  // ==================================================================
  // G. JOIN MANUAL TRAS SEMANA SALTADA
  // ==================================================================
  console.log('--- G. join manual tras semana saltada: M2 jugó en N-2 (PROMOTED t1), NO en A -> NO auto-roll; manual -> t2 ---');
  check('G: M2 NO fue candidata al rollover de A (no participó en A)', (await countParticipations(M2, seasonA)) === 0);
  check('G: M2 NO se auto-inscribió en B por el rollover de A', (await countParticipations(M2, seasonB)) === 0);
  const gJoin = await enrollmentService.joinActiveSeason(M2, NOW);
  check('G: join manual crea participación', 'participation' in gJoin && gJoin.created === true);
  const m2B = await tierOf(M2, seasonB);
  check('G: M2 -> B en t2 (deriva de su terminal PROMOTED en N-2, la última temporada comp-v1 legítima)', m2B.tierOrder === 2);
  check('G: M2 -> B: LP = 0', m2B.lp === 0);

  // ==================================================================
  // H. JUGADOR NUEVO (sólo residuo lpg)
  // ==================================================================
  console.log('--- H. jugador nuevo: sólo residuo lpg (RETAINED t1), sin historial comp-v1 -> tier BASE ---');
  const hJoin = await enrollmentService.joinActiveSeason(NEWP, NOW);
  check('H: join manual crea participación', 'participation' in hJoin && hJoin.created === true);
  const newpB = await tierOf(NEWP, seasonB);
  check('H: NEWP -> B en el tier más bajo t1 (Bronce) -- el residuo lpg NO es historial de progresión', newpB.tierOrder === 1 && newpB.leagueKey === t1.key);
  check('H: NEWP -> B: LP = 0', newpB.lp === 0);
  check('H: NEWP NO recibe ningún marco (ingreso inicial a Bronce nunca otorga marco)', (await frameCount(NEWP, t1.frameCosmeticId)) === 0);

  // ==================================================================
  // I. CONCURRENCIA -- 2 joins concurrentes en contexto de rollover.
  // ==================================================================
  console.log('--- I. concurrencia: 2 joins concurrentes (contexto rollover) para P_CONC PROMOTED -> 1 participación, 1 marco ---');
  const P_CONC = randomUUID();
  await seedTerminalParticipation(seasonA, P_CONC, t1.id, 'PROMOTED', 4, new Date(NOW.getTime() - 14 * DAY + 6 * HOUR));
  const [c1, c2] = await Promise.all([
    enrollmentService.joinActiveSeason(P_CONC, NOW, { sourcePreviousSeasonId: seasonA }),
    enrollmentService.joinActiveSeason(P_CONC, NOW, { sourcePreviousSeasonId: seasonA }),
  ]);
  check('I: ambas llamadas devuelven una participación', 'participation' in c1 && 'participation' in c2);
  check('I: EXACTAMENTE 1 participación de P_CONC en B', (await countParticipations(P_CONC, seasonB)) === 1);
  check('I: EXACTAMENTE 1 marco t1 para P_CONC', (await frameCount(P_CONC, t1.frameCosmeticId)) === 1);
  check('I: P_CONC -> B en t2', (await tierOf(P_CONC, seasonB)).tierOrder === 2);

  // ==================================================================
  // J. SIN AUTO-EQUIP
  // ==================================================================
  console.log('--- J. ningún marco se auto-equipa ---');
  for (const [label, acc] of [['P1', P1], ['M1', M1], ['P_CONC', P_CONC]] as const) {
    check(`J: ${label} -- 0 equipped_cosmetic de tipo AVATAR_FRAME`, (await equippedFrameCount(acc)) === 0);
  }

  // ==================================================================
  // Limpieza -- namespaced a este run (claves con marca epoch `${suffix}`).
  // Orden FK: participaciones -> grupos -> temporadas. Ligas/cosméticos/bundles
  // del run se retiran (mismo criterio anti-interferencia que
  // `verify-league-frame-unlock-gate`). Aquí no se crean instantáneas.
  // ==================================================================
  const keyLike = [`comp-v1-rts-%-${suffix}`, `lpg-season-rts-${suffix}-%`];
  const testSeasonIds = (await pg.query(
    `SELECT id FROM game_season WHERE season_key LIKE $1 OR season_key LIKE $2`,
    keyLike,
  )).rows.map((r) => r.id as string);
  if (testSeasonIds.length > 0) {
    await pg.query(`DELETE FROM season_league_participation WHERE game_season_id = ANY($1)`, [testSeasonIds]);
    await pg.query(`DELETE FROM league_group WHERE game_season_id = ANY($1)`, [testSeasonIds]);
    await pg.query(`DELETE FROM game_season WHERE id = ANY($1)`, [testSeasonIds]);
  }
  await pg.query(`UPDATE league_definition SET status = 'RETIRED' WHERE league_key LIKE $1 AND status = 'ACTIVE'`, [`rts-tier%-${suffix}`]);

  await prisma.$disconnect();
  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de fuente de tier en rollover / join manual (PF2-C.3A) pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
