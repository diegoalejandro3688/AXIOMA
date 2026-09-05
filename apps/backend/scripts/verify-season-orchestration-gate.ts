// PF2-B -- gate de la ORQUESTACIÓN DE TEMPORADAS SEMANALES V1.
//
// PARTE 1 (pura): `season-calendar.ts` -- fronteras lunes 00:00 America/Santiago
//   DST-safe (167/168/169 h), horizonte contiguo, claves locales, determinismo.
// PARTE 2 (BD de gates): `SeasonProvisioningService.provisionHorizon` --
//   crea-sólo-lo-que-falta, idempotente, conflicto con ventana legacy/no-canónica.
// PARTE 3 (BD de gates): `SeasonOrchestrationService.runCycle` + `SeasonRolloverService`
//   -- orden seguro (provisión -> cierre -> finalización -> activación -> rollover),
//   carrera SEASON_ENDED eliminada, auto-roll SÓLO de la temporada inmediata,
//   usuario inactivo NO se auto-inscribe, LP nuevo = 0, marco reusado/idempotente,
//   catch-up de bootstrap, invariantes multi-instancia.
//
// Se ejecuta vía run-gate.ts -> axioma_gates_dev. HARD FAIL si apunta a axioma_dev.
// Fixtures de temporada usan claves canónicas de un año MUY futuro y aleatorio
// por corrida (2099+), nunca colisionan con temporadas reales; residuo FINALIZED
// + instantánea inmutable queda como reсiduo permanente por diseño (trigger no_delete).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { assertGateDb, retireOtherActiveLeagues } from './gate-db-safety';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import {
  canonicalHorizon,
  canonicalWeekStart,
  canonicalNextWeekStart,
  canonicalWindowContaining,
  seasonKeyForWeekStart,
} from '../src/gamification/season-calendar';
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
import { SeasonTransitionService } from '../src/gamification/season-transition.service';
import { SeasonProvisioningService } from '../src/gamification/season-provisioning.service';
import { SeasonRolloverService } from '../src/gamification/season-rollover.service';
import { SeasonOrchestrationService } from '../src/gamification/season-orchestration.service';
import { LeagueEnrollmentService } from '../src/gamification/league-enrollment.service';
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

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  // Limpieza de residuo de corridas anteriores de ESTE gate. Las fixtures usan
  // claves canónicas de años MUY futuros (>=2099) -- nunca colisionan con la
  // identidad canónica real (`comp-v1-2026-*`). El índice parcial
  // `game_season_single_active` sólo admite UNA temporada ACTIVE global, así que
  // una temporada de prueba ACTIVE dejada por una corrida abortada haría fallar
  // el seed de la siguiente: se fuerza a FINALIZED (transición hacia adelante,
  // permitida por el trigger). Las SCHEDULED de prueba se borran.
  const TEST_KEY_SQL = `(season_key ~ '^comp-v1-(209[0-9]|2[1-9][0-9]{2}|[3-9][0-9]{3})-[0-9]{2}-[0-9]{2}$' OR season_key LIKE 's-orch-gate-%')`;
  async function cleanupTestSeasons(): Promise<void> {
    await pg.query(
      `UPDATE game_season SET status='FINALIZED', finalized_at=now() WHERE status='ACTIVE' AND ${TEST_KEY_SQL}`,
    );
    await pg.query(`DELETE FROM game_season WHERE status='SCHEDULED' AND ${TEST_KEY_SQL}`);
  }
  await cleanupTestSeasons();

  // ===================================================================
  // PARTE 1 -- calendario canónico (PURA, sin BD)
  // ===================================================================
  console.log('=== PARTE 1: calendario canónico America/Santiago (puro) ===');

  const horizon = canonicalHorizon(new Date('2099-06-15T12:00:00Z'), 4);
  check('horizonte = 5 franjas (semana actual + 4 futuras)', horizon.length === 5);
  check('claves canónicas comp-v1-{YYYY-MM-DD local}', horizon[0]!.seasonKey === 'comp-v1-2099-06-15' && horizon[4]!.seasonKey === 'comp-v1-2099-07-13');
  check('franjas EXACTAMENTE contiguas (sin hueco, sin solape)', horizon.every((w, i) => i === 0 || w.startsAt.getTime() === horizon[i - 1]!.endsAt.getTime()));
  check('determinista: dos llamadas idénticas', JSON.stringify(canonicalHorizon(new Date('2099-06-15T12:00:00Z'), 4)) === JSON.stringify(horizon));

  const ordinary = canonicalWindowContaining(new Date('2099-06-15T12:00:00Z'));
  const springFwd = canonicalWindowContaining(new Date('2099-08-31T12:00:00Z')); // Chile primavera -> pierde 1 h
  const fallBack = canonicalWindowContaining(new Date('2099-03-30T12:00:00Z')); // Chile otoño -> gana 1 h
  const hrs = (w: { startsAt: Date; endsAt: Date }) => (w.endsAt.getTime() - w.startsAt.getTime()) / HOUR;
  check('semana ordinaria = 168 h', hrs(ordinary) === 168);
  check('semana con cambio de DST (primavera) = 167 h -- NUNCA 604800000 ms fijos', hrs(springFwd) === 167);
  check('semana con cambio de DST (otoño) = 169 h', hrs(fallBack) === 169);
  check('clave usa la fecha LOCAL del lunes (no UTC)', springFwd.seasonKey === 'comp-v1-2099-08-31' && fallBack.seasonKey === 'comp-v1-2099-03-30');

  const monStart = ordinary.startsAt;
  check('un lunes 1 min DESPUÉS de 00:00 local -> ese mismo lunes', canonicalWeekStart(new Date(monStart.getTime() + 60_000)).getTime() === monStart.getTime());
  check('un domingo 1 min ANTES de medianoche -> el lunes anterior', canonicalNextWeekStart(canonicalWeekStart(new Date(monStart.getTime() - 60_000))).getTime() === monStart.getTime());

  // ===================================================================
  // PARTE 2 -- SeasonProvisioningService (BD de gates)
  // ===================================================================
  console.log('=== PARTE 2: provisión del horizonte canónico ===');

  const seasonRepo = new GameSeasonRepository(prisma);
  const provisioningService = new SeasonProvisioningService(seasonRepo);

  // `now` canónico ALEATORIO en un año muy futuro (2099+) -> claves únicas por corrida.
  const randomFutureWeeks = Math.floor(Math.random() * 80_000);
  const nowProv = canonicalWeekStart(new Date(Date.UTC(2099, 0, 5) + randomFutureWeeks * 7 * DAY + 3 * DAY + 12 * HOUR));
  const provWindows = canonicalHorizon(new Date(nowProv.getTime() + 12 * HOUR), 4);
  const provKeys = provWindows.map((w) => w.seasonKey);

  // Limpieza previa (namespaced a estas claves exactas).
  await pg.query('DELETE FROM game_season WHERE season_key = ANY($1)', [provKeys]);

  const r1 = await provisioningService.provisionHorizon(new Date(nowProv.getTime() + 12 * HOUR));
  check('provisionHorizon: 5 franjas canónicas', r1.canonicalSlots === 5);
  check('provisionHorizon: creó las 5 (entorno limpio)', r1.created.length === 5 && r1.conflicts.length === 0);
  const provRows = await prisma.gameSeason.findMany({ where: { seasonKey: { in: provKeys } }, orderBy: { startsAt: 'asc' } });
  check('las 5 filas son SCHEDULED', provRows.length === 5 && provRows.every((s) => s.status === 'SCHEDULED'));
  check('ventanas persistidas EXACTAMENTE contiguas', provRows.every((s, i) => i === 0 || s.startsAt.getTime() === provRows[i - 1]!.endsAt.getTime()));
  check('sin grupos / participaciones / instantáneas para esas temporadas', (await pg.query('SELECT (SELECT count(*) FROM league_group WHERE game_season_id = ANY($1))::int + (SELECT count(*) FROM season_league_participation WHERE game_season_id = ANY($1))::int + (SELECT count(*) FROM leaderboard_snapshot WHERE game_season_id = ANY($1))::int AS n', [provRows.map((s) => s.id)])).rows[0].n === 0);

  console.log('--- idempotencia ---');
  const r2 = await provisioningService.provisionHorizon(new Date(nowProv.getTime() + 12 * HOUR));
  check('2ª provisión: 0 creadas, 5 ya presentes', r2.created.length === 0 && r2.existing.length === 5 && r2.conflicts.length === 0);
  const provRows2 = await prisma.gameSeason.findMany({ where: { seasonKey: { in: provKeys } } });
  check('mismas filas, sin mutación de ventana', provRows2.length === 5 && provRows2.every((s) => { const o = provRows.find((x) => x.id === s.id)!; return o.startsAt.getTime() === s.startsAt.getTime() && o.endsAt.getTime() === s.endsAt.getTime(); }));

  console.log('--- concurrencia (createScheduledIfAbsent doble) ---');
  const concKey = provKeys[2]!;
  const concWin = provWindows[2]!;
  const c1 = await seasonRepo.createScheduledIfAbsent({ seasonKey: concKey, name: 'x', startsAt: concWin.startsAt, endsAt: concWin.endsAt });
  const c2 = await seasonRepo.createScheduledIfAbsent({ seasonKey: concKey, name: 'x', startsAt: concWin.startsAt, endsAt: concWin.endsAt });
  check('createScheduledIfAbsent x2 -> ambas devuelven la MISMA fila, created=false', 'season' in c1 && 'season' in c2 && c1.season.id === c2.season.id && c1.created === false && c2.created === false);
  check('sigue habiendo UNA sola fila para esa clave', (await prisma.gameSeason.count({ where: { seasonKey: concKey } })) === 1);

  console.log('--- conflicto con ventana legacy / no-canónica ---');
  // Temporada legacy DENTRO de la franja canónica [n=3] (no la desborda) --
  // sólo entra en conflicto con esa franja.
  const legacyWin = provWindows[3]!;
  const legacyKey = `s-orch-gate-legacy-${randomUUID().slice(0, 8)}`;
  await pg.query(
    `INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status) VALUES ($1, $2, 'legacy', $3, $4, 'SCHEDULED')`,
    [randomUUID(), legacyKey, iso(new Date(legacyWin.startsAt.getTime() + 5 * HOUR)), iso(new Date(legacyWin.endsAt.getTime() - 5 * HOUR))],
  );
  await pg.query('DELETE FROM game_season WHERE season_key = $1', [provKeys[3]!]); // quita la canónica ya provisionada
  const r3 = await provisioningService.provisionHorizon(new Date(nowProv.getTime() + 12 * HOUR));
  check('conflicto detectado SÓLO para la franja ocupada por la legacy', r3.conflicts.length === 1 && r3.conflicts[0]!.seasonKey === provKeys[3]! && r3.conflicts[0]!.reason === 'NON_CANONICAL_SEASON_WINDOW_CONFLICT');
  check('NO se creó la fila canónica en conflicto', (await prisma.gameSeason.count({ where: { seasonKey: provKeys[3]! } })) === 0);
  const legacyAfter = await prisma.gameSeason.findUnique({ where: { seasonKey: legacyKey } });
  check('la fila legacy quedó INTACTA (misma ventana, mismo status)', legacyAfter != null && legacyAfter.startsAt.getTime() === legacyWin.startsAt.getTime() + 5 * HOUR && legacyAfter.status === 'SCHEDULED');
  check('las otras 4 franjas canónicas SÍ están', (await prisma.gameSeason.count({ where: { seasonKey: { in: [provKeys[0]!, provKeys[1]!, provKeys[2]!, provKeys[4]!] } } })) === 4);

  // Limpieza de PARTE 2 (todo SCHEDULED, sin dependientes).
  await pg.query('DELETE FROM game_season WHERE season_key = ANY($1) OR season_key = $2', [provKeys, legacyKey]);

  // ===================================================================
  // PARTE 3 -- orquestación + rollover (BD de gates)
  // ===================================================================
  console.log('=== PARTE 3: orquestación de fronteras + auto-rollover ===');

  const leagueDefRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const leaderboardDefRepo = new LeaderboardDefinitionRepository(prisma);
  const entryRepo = new LeaderboardEntryRepository(prisma);
  const snapshotRepo = new LeaderboardSnapshotRepository(prisma);
  const snapshotEntryRepo = new LeaderboardSnapshotEntryRepository(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);

  const calcService = new LeaderboardCalculationService(leaderboardDefRepo, participationRepo, ledgerRepo, entryRepo);
  const finalizationService = new LeaderboardFinalizationService(prisma, leagueGroupRepo, leagueDefRepo, participationRepo, calcService, snapshotRepo, snapshotEntryRepo);
  const transitionService = new SeasonTransitionService(prisma, seasonRepo, leagueGroupRepo, participationRepo);

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
  const orchestrationService = new SeasonOrchestrationService(seasonRepo, leagueGroupRepo, participationRepo, transitionService, finalizationService, provisioningService, rolloverService);


  const suffix = Date.now();

  // --- Ladder de 3 tiers real + marco en cada uno (seguro: assertGateDb ya corrió). ---
  async function makeTierWithFrame(order: number): Promise<{ id: string; key: string; frameCosmeticId: string }> {
    const cos = await pg.query(
      `INSERT INTO cosmetic_item (id, item_key, item_type, name, rarity_class, asset_reference, visibility_status, status)
       VALUES ($1, $2, 'AVATAR_FRAME', $3, 'COMMON', $4, 'PUBLIC', 'ACTIVE') RETURNING id`,
      [randomUUID(), `orch-frame-t${order}-${suffix}`, `Marco T${order}`, `asset://orch/${order}-${suffix}`],
    );
    const cosId = cos.rows[0].id as string;
    const bundle = await bundleRepo.create({ bundleKey: `orch-bundle-t${order}-${suffix}`, name: `T${order}`, items: [{ componentType: 'COSMETIC', referenceId: cosId }] });
    const def = await leagueDefRepo.create({ leagueKey: `orch-tier${order}-${suffix}`, name: `Tier ${order}`, tierOrder: order, participantGroupSize: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20', rewardBundleId: bundle.id });
    return { id: def.id, key: def.leagueKey, frameCosmeticId: cosId };
  }
  const t1 = await makeTierWithFrame(1);
  const t2 = await makeTierWithFrame(2);
  const t3 = await makeTierWithFrame(3);
  // t4 existe sólo para que t3 NO sea el tier más alto ACTIVO -> una promoción
  // que aterriza en t3 no es un "terminal reach" (regla Gran Maestro), así que
  // el rollover entrega SÓLO el marco del tier superado, nunca el de destino.
  const t4 = await makeTierWithFrame(4);
  await retireOtherActiveLeagues(pg, [t1.key, t2.key, t3.key, t4.key]);

  const anyRuleId = (await pg.query('SELECT id FROM league_point_rule LIMIT 1')).rows[0].id as string;

  /** `now` canónico ÚNICO por corrida (año 2099+) -> claves canónicas nuevas cada vez. */
  function freshCanonicalNow(): Date {
    const weeks = Math.floor(Math.random() * 80_000);
    return new Date(canonicalWeekStart(new Date(Date.UTC(2099, 0, 5) + weeks * 7 * DAY + 3 * DAY + 12 * HOUR)).getTime() + 12 * HOUR);
  }

  /** Crea una temporada ACTIVE con un grupo (tier `t2`) y N participantes con LP dado. */
  async function seedActiveSeasonWithParticipants(
    win: { seasonKey: string; startsAt: Date; endsAt: Date },
    parts: { accountId: string; lp: number }[],
  ): Promise<{ seasonId: string; groupId: string; participationIds: Record<string, string> }> {
    const seasonId = randomUUID();
    await pg.query(`INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status) VALUES ($1,$2,$2,$3,$4,'ACTIVE')`, [seasonId, win.seasonKey, iso(win.startsAt), iso(win.endsAt)]);
    const groupId = randomUUID();
    await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
       VALUES ($1,$2,$3,1,30,'v1-lowest-tier','OPEN')`,
      [groupId, seasonId, t2.id],
    );
    const participationIds: Record<string, string> = {};
    for (const p of parts) {
      const pid = randomUUID();
      participationIds[p.accountId] = pid;
      await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, league_points, participation_status, joined_at)
         VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE',$7)`,
        [pid, seasonId, p.accountId, t2.id, groupId, p.lp, iso(new Date(win.startsAt.getTime() + HOUR))],
      );
      if (p.lp > 0) {
        const act = await pg.query(
          `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
           VALUES ($1,$2,'GAMIFICATION','Test',$3,'QUICK_QUESTION_ANSWERED','VALID',$4,'v1',$5,'OK') RETURNING id`,
          [randomUUID(), p.accountId, randomUUID(), iso(new Date(win.startsAt.getTime() + 2 * HOUR)), `orch-${randomUUID()}`],
        );
        await pg.query(
          `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, rule_version, idempotency_key, occurred_at)
           VALUES ($1,$2,$3,$4,$5,'OTORGAMIENTO',$6,'v1',$7,$8)`,
          [randomUUID(), p.accountId, pid, act.rows[0].id, anyRuleId, p.lp, `orch-grant-${randomUUID()}`, iso(new Date(win.startsAt.getTime() + 2 * HOUR))],
        );
      }
    }
    return { seasonId, groupId, participationIds };
  }

  function windowsFor(now: Date) {
    const cur = canonicalWindowContaining(now);
    const prevStart = canonicalWeekStart(new Date(cur.startsAt.getTime() - 60_000));
    const prev = { seasonKey: seasonKeyForWeekStart(prevStart), startsAt: prevStart, endsAt: canonicalNextWeekStart(prevStart) };
    const olderStart = canonicalWeekStart(new Date(prev.startsAt.getTime() - 60_000));
    const older = { seasonKey: seasonKeyForWeekStart(olderStart), startsAt: olderStart, endsAt: canonicalNextWeekStart(olderStart) };
    return { cur, prev, older };
  }

  // ============================================================
  // 3.1 -- rollover feliz en UN solo runCycle (frontera + 7 min)
  // ============================================================
  console.log('--- 3.1 runCycle en la frontera (bootstrap tardio +7 min): close -> finalize -> activate -> rollover ---');
  {
    const now = freshCanonicalNow();
    const { cur, prev, older } = windowsFor(now);
    const P1 = randomUUID(); // top -> PROMOTED
    const P2 = randomUUID(); // medio -> RETAINED
    const P3 = randomUUID(); // bottom -> DEMOTED
    const INACT = randomUUID(); // solo N-2

    const a = await seedActiveSeasonWithParticipants(prev, [{ accountId: P1, lp: 100 }, { accountId: P2, lp: 50 }, { accountId: P3, lp: 10 }]);
    // Temporada N-2 (FINALIZED) para la cuenta inactiva.
    const olderSeason = randomUUID();
    await pg.query(`INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status, finalized_at) VALUES ($1,$2,$2,$3,$4,'FINALIZED',$4)`, [olderSeason, older.seasonKey, iso(older.startsAt), iso(older.endsAt)]);
    const olderGroup = randomUUID();
    await pg.query(`INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status, finalized_at) VALUES ($1,$2,$3,1,30,'v1-lowest-tier','FINALIZED',$4)`, [olderGroup, olderSeason, t2.id, iso(older.endsAt)]);
    await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, league_points, participation_status, joined_at, final_rank, finalized_at)
       VALUES ($1,$2,$3,$4,$5,30,'RETAINED',$6,1,$7)`,
      [randomUUID(), olderSeason, INACT, t2.id, olderGroup, iso(new Date(older.startsAt.getTime() + HOUR)), iso(older.endsAt)],
    );
    // Temporada canonica actual B -- SCHEDULED.
    const bId = randomUUID();
    await pg.query(`INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status) VALUES ($1,$2,$2,$3,$4,'SCHEDULED')`, [bId, cur.seasonKey, iso(cur.startsAt), iso(cur.endsAt)]);

    const nowLate = new Date(cur.startsAt.getTime() + 7 * 60_000);
    const cycle = await orchestrationService.runCycle(nowLate);

    check('runCycle: horizonte canonico provisionado (>=1 nueva), 0 conflictos', cycle.createdSeasonCount >= 1 && cycle.conflictCount === 0);
    check('runCycle: 1 temporada cerrada (A), >=1 grupo finalizado', cycle.closedSeasonCount === 1 && cycle.finalizedGroupCount >= 1);
    check('runCycle: activacion NO diferida, 1 activada', cycle.activationDeferred === false && cycle.activatedSeasonCount === 1);
    check('runCycle: 3 participantes rolleados', cycle.rolledParticipantCount === 3);

    const aRow = await prisma.gameSeason.findUnique({ where: { id: a.seasonId } });
    check('A -> FINALIZED', aRow?.status === 'FINALIZED');
    const gRow = await pg.query("SELECT status FROM league_group WHERE id=$1", [a.groupId]);
    const snCount = await pg.query("SELECT count(*)::int AS n FROM leaderboard_snapshot WHERE league_group_id=$1", [a.groupId]);
    check('grupo de A -> FINALIZED + 1 instantanea inmutable', gRow.rows[0].status === 'FINALIZED' && snCount.rows[0].n === 1);
    const outA = await pg.query('SELECT account_id, participation_status FROM season_league_participation WHERE game_season_id=$1', [a.seasonId]);
    const sOf = (acc: string) => outA.rows.find((r) => r.account_id === acc)?.participation_status;
    check('A: P1->PROMOTED, P2->RETAINED, P3->DEMOTED', sOf(P1) === 'PROMOTED' && sOf(P2) === 'RETAINED' && sOf(P3) === 'DEMOTED');

    const bRow = await seasonRepo.findByKey(cur.seasonKey);
    check('B (canonica actual) -> ACTIVE', bRow?.status === 'ACTIVE');
    const np1 = await participationRepo.findByAccountAndSeason(P1, bId);
    const np2 = await participationRepo.findByAccountAndSeason(P2, bId);
    const np3 = await participationRepo.findByAccountAndSeason(P3, bId);
    check('P1 -> B, tier SUPERIOR (t3), LP 0, ACTIVE, ranks NULL', np1?.leagueDefinitionId === t3.id && np1?.leaguePoints === 0 && np1?.participationStatus === 'ACTIVE' && np1?.currentRank === null && np1?.finalRank === null);
    check('P2 -> B, MISMO tier (t2), LP 0', np2?.leagueDefinitionId === t2.id && np2?.leaguePoints === 0);
    check('P3 -> B, tier INFERIOR (t1), LP 0', np3?.leagueDefinitionId === t1.id && np3?.leaguePoints === 0);
    check('cuenta INACTIVA (solo N-2) NO se auto-inscribio', (await participationRepo.findByAccountAndSeason(INACT, bId)) == null);

    check('participacion vieja de P1 en A intacta: 100 LP, PROMOTED', (await participationRepo.findById(a.participationIds[P1]!))?.leaguePoints === 100);
    check('ledger de A sin cambios (suma 100)', (await pg.query('SELECT coalesce(sum(point_amount),0)::int AS s FROM league_point_ledger_entry WHERE season_league_participation_id=$1', [a.participationIds[P1]!])).rows[0].s === 100);

    check('P1 recibio el marco del tier SUPERADO (t2), 1 fila', (await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id=$1 AND cosmetic_item_id=$2', [P1, t2.frameCosmeticId])).rows[0].n === 1);
    check('P1 NO recibio el marco del tier de destino (t3) por el rollover', (await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id=$1 AND cosmetic_item_id=$2', [P1, t3.frameCosmeticId])).rows[0].n === 0);
    check('P2/P3 NO reciben marco de tier superado', (await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id=ANY($1) AND cosmetic_item_id=ANY($2)', [[P2, P3], [t1.frameCosmeticId, t2.frameCosmeticId, t3.frameCosmeticId]])).rows[0].n === 0);
    check('ningun equipped_cosmetic creado por el rollover', (await pg.query('SELECT count(*)::int AS n FROM equipped_cosmetic ec JOIN inventory_item ii ON ii.id=ec.inventory_item_id WHERE ii.account_id=ANY($1)', [[P1, P2, P3]])).rows[0].n === 0);

    console.log('--- 3.1b 2 runCycle: idempotente ---');
    const cycle2 = await orchestrationService.runCycle(new Date(nowLate.getTime() + 60_000));
    check('2 runCycle: 0 activadas, 0 rolleadas', cycle2.activatedSeasonCount === 0 && cycle2.rolledParticipantCount === 0);
    check('1 participacion por (cuenta, B)', (await pg.query('SELECT account_id FROM season_league_participation WHERE game_season_id=$1 AND account_id=ANY($2) GROUP BY account_id HAVING count(*)>1', [bId, [P1, P2, P3]])).rowCount === 0);
    check('marco de t2 de P1 sigue en 1 (sin duplicar)', (await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id=$1 AND cosmetic_item_id=$2', [P1, t2.frameCosmeticId])).rows[0].n === 1);
    check('<= 1 temporada ACTIVE', (await prisma.gameSeason.count({ where: { status: 'ACTIVE' } })) <= 1);

    console.log('--- 3.1c join manual tras rollover: idempotente ---');
    const manual = await enrollmentService.joinActiveSeason(P2, nowLate);
    check('joinActiveSeason(P2) -> misma participacion, created=false', 'participation' in manual && manual.created === false && manual.participation.id === np2!.id);

    console.log('--- 3.1d usuario inactivo: join manual disponible ---');
    const inactJoin = await enrollmentService.joinActiveSeason(INACT, nowLate);
    check('INACT join manual -> created=true, tier t2 (RETAINED), LP 0', 'participation' in inactJoin && inactJoin.created === true && inactJoin.participation.leagueDefinitionId === t2.id && inactJoin.participation.leaguePoints === 0);

    console.log('--- 3.1e OTORGAMIENTO tardio sobre A (FINALIZED) -> rechazado por trigger ---');
    let blocked = false;
    try {
      const lateAct = await pg.query(`INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status) VALUES ($1,$2,'GAMIFICATION','Test',$3,'QUICK_QUESTION_ANSWERED','VALID',$4,'v1',$5,'OK') RETURNING id`, [randomUUID(), P1, randomUUID(), iso(new Date(prev.startsAt.getTime() + 3 * HOUR)), `orch-late-${randomUUID()}`]);
      await pg.query(
        `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, rule_version, idempotency_key, occurred_at)
         VALUES ($1,$2,$3,$4,$5,'OTORGAMIENTO',2,'v1',$6,$7)`,
        [randomUUID(), P1, a.participationIds[P1]!, lateAct.rows[0].id, anyRuleId, `orch-lategrant-${randomUUID()}`, iso(new Date(prev.startsAt.getTime() + 3 * HOUR))],
      );
    } catch {
      blocked = true;
    }
    check('OTORGAMIENTO tardio sobre la participacion de A rechazado', blocked);
    check('LP de P1 en A sigue en 100', (await participationRepo.findById(a.participationIds[P1]!))?.leaguePoints === 100);

    await cleanupTestSeasons();
  }

  // ============================================================
  // 3.2 -- guarda de activacion diferida (predecesora con outcome pendiente)
  // ============================================================
  console.log('--- 3.2 activacion DIFERIDA si a la predecesora le queda una participacion SEASON_ENDED sin resultado ---');
  {
    const now = freshCanonicalNow();
    const { cur, prev } = windowsFor(now);
    const Q1 = randomUUID();
    // Predecesora ya FINALIZED y con su grupo FINALIZED -- pero una participacion
    // quedo en SEASON_ENDED (finalizacion parcial: escenario defensivo que la
    // GUARDA §4 debe detectar). `finalizePendingGroups` no la toca (el grupo no
    // esta LOCKED), asi que la unica proteccion es la guarda de orquestacion.
    const a2 = randomUUID();
    await pg.query(`INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status, finalized_at) VALUES ($1,$2,$2,$3,$4,'FINALIZED',$4)`, [a2, prev.seasonKey, iso(prev.startsAt), iso(prev.endsAt)]);
    const g2id = randomUUID();
    await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status, locked_at, finalized_at)
       VALUES ($1,$2,$3,1,30,'v1-lowest-tier','FINALIZED',$4,$4)`,
      [g2id, a2, t2.id, iso(prev.endsAt)],
    );
    await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, league_points, participation_status, joined_at, finalized_at)
       VALUES ($1,$2,$3,$4,$5,20,'SEASON_ENDED',$6,$7)`,
      [randomUUID(), a2, Q1, t2.id, g2id, iso(new Date(prev.startsAt.getTime() + HOUR)), iso(prev.endsAt)],
    );
    const b2 = randomUUID();
    await pg.query(`INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status) VALUES ($1,$2,$2,$3,$4,'SCHEDULED')`, [b2, cur.seasonKey, iso(cur.startsAt), iso(cur.endsAt)]);

    const cycle = await orchestrationService.runCycle(new Date(cur.startsAt.getTime() + 10 * 60_000));
    check('runCycle: activacion DIFERIDA (predecesora con outcome pendiente)', cycle.activationDeferred === true && cycle.activatedSeasonCount === 0 && cycle.rolledParticipantCount === 0);
    check('B2 sigue SCHEDULED', (await seasonRepo.findByKey(cur.seasonKey))?.status === 'SCHEDULED');
    check('Q1 NO tiene participacion en B2', (await participationRepo.findByAccountAndSeason(Q1, b2)) == null);

    // Se resuelve el outcome pendiente -> el proximo ciclo ya activa.
    await pg.query(`UPDATE season_league_participation SET participation_status='RETAINED', final_rank=1, finalized_at=now() WHERE game_season_id=$1 AND account_id=$2`, [a2, Q1]);
    const cycle2 = await orchestrationService.runCycle(new Date(cur.startsAt.getTime() + 20 * 60_000));
    check('tras resolver la predecesora: activacion YA no diferida', cycle2.activationDeferred === false && cycle2.activatedSeasonCount === 1);
    check('B2 -> ACTIVE', (await seasonRepo.findByKey(cur.seasonKey))?.status === 'ACTIVE');

    await cleanupTestSeasons();
  }

  // ============================================================
  // 3.3 -- temporada vacia (0 participantes) cierra y la sucesora activa
  // ============================================================
  console.log('--- 3.3 temporada vacia: cierra sin grupos/instantaneas, sucesora activa ---');
  {
    const now = freshCanonicalNow();
    const { cur, prev } = windowsFor(now);
    const empty = randomUUID();
    await pg.query(`INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status) VALUES ($1,$2,$2,$3,$4,'ACTIVE')`, [empty, prev.seasonKey, iso(prev.startsAt), iso(prev.endsAt)]);
    await pg.query(`INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status) VALUES ($1,$2,$2,$3,$4,'SCHEDULED')`, [randomUUID(), cur.seasonKey, iso(cur.startsAt), iso(cur.endsAt)]);
    const cycle = await orchestrationService.runCycle(new Date(cur.startsAt.getTime() + 5 * 60_000));
    check('temporada vacia: cerrada, 0 grupos finalizados, 0 rolleados, 0 conflictos', cycle.closedSeasonCount === 1 && cycle.finalizedGroupCount === 0 && cycle.rolledParticipantCount === 0 && cycle.conflictCount === 0);
    check('temporada vacia -> FINALIZED', (await prisma.gameSeason.findUnique({ where: { id: empty } }))?.status === 'FINALIZED');
    check('sucesora -> ACTIVE aunque la predecesora estuviera vacia', (await seasonRepo.findByKey(cur.seasonKey))?.status === 'ACTIVE');
    check('0 instantaneas para la temporada vacia', (await pg.query('SELECT count(*)::int AS n FROM leaderboard_snapshot WHERE game_season_id=$1', [empty])).rows[0].n === 0);
    await cleanupTestSeasons();
  }

  // ============================================================
  // 3.4 -- ciclo sano a mitad de semana: no hace nada
  // ============================================================
  console.log('--- 3.4 ciclo sano a mitad de semana: sin actividad ---');
  {
    const now = freshCanonicalNow();
    const { cur } = windowsFor(now);
    await pg.query(`INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status) VALUES ($1,$2,$2,$3,$4,'ACTIVE')`, [randomUUID(), cur.seasonKey, iso(cur.startsAt), iso(cur.endsAt)]);
    const midWeek = new Date(cur.startsAt.getTime() + 3 * DAY);
    await orchestrationService.runCycle(midWeek); // primer ciclo: provisiona el futuro
    const cycle = await orchestrationService.runCycle(new Date(midWeek.getTime() + HOUR)); // segundo: nada
    check('mitad de semana: 0 creadas, 0 cerradas, 0 finalizadas, 0 activadas, 0 rolleadas, 0 conflictos', cycle.createdSeasonCount === 0 && cycle.closedSeasonCount === 0 && cycle.finalizedGroupCount === 0 && cycle.activatedSeasonCount === 0 && cycle.rolledParticipantCount === 0 && cycle.conflictCount === 0);
    await cleanupTestSeasons();
  }

  await cleanupTestSeasons();
  await prisma.$disconnect();
  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de orquestacion de temporadas semanales (PF2-B) pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
