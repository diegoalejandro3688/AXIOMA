// STABILIZATION-B7 -- reproduce la inconsistencia física de B5 y prueba que
// está corregida: el Hub de Competir y el Ranking deben resolver la MISMA
// participación de la MISMA temporada canónica vigente, y una participación
// de una temporada FINALIZED (cuyo `participation_status` quedó ACTIVE por
// residuo) NUNCA debe presentarse como "ranking actual".
//
// Hub    = `LeagueEnrollmentService.getParticipationStatus` (usa `findCurrent`).
// Ranking = `CompetitiveContextService.resolveByAccountId`   (usa `findCurrentByAccountId`).
//
// Se ejecuta vía run-gate.ts (axioma_gates_dev). Sin servidor HTTP.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { assertGateDb, finalizeStaleGateSeasons, retireOtherActiveLeagues } from './gate-db-safety';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaderboardEntryRepository } from '../src/gamification/leaderboard-entry.repository';
import { LeaderboardDefinitionRepository } from '../src/gamification/leaderboard-definition.repository';
import { CompetitiveContextService } from '../src/user/competitive-context.service';
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
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { AccountChallengeRepository } from '../src/gamification/account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from '../src/gamification/account-challenge-daily-progress.repository';
import { AccountChallengeConsumedEventRepository } from '../src/gamification/account-challenge-consumed-event.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { CurriculumTopicRepository } from '../src/education/curriculum-topic.repository';
import { CurriculumTopicProgressRepository } from '../src/progress/curriculum-topic-progress.repository';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { TitleEligibilityService } from '../src/gamification/title-eligibility.service';
import { SubjectCompletionService } from '../src/gamification/subject-completion.service';
import { SubjectRepository } from '../src/education/subject.repository';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  const suffix = Date.now();
  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const entryRepo = new LeaderboardEntryRepository(prisma);
  const leaderboardDefRepo = new LeaderboardDefinitionRepository(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);

  const balanceRepo = new XpBalanceRepository(prisma);
  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const levelDefRepo = new LevelDefinitionRepository(prisma);
  const progressionService = new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo);
  const curriculumTopicRepo = new CurriculumTopicRepository(prisma);
  const curriculumTopicProgressRepo = new CurriculumTopicProgressRepository(prisma);
  const subjectRepo = new SubjectRepository(prisma);
  const worker = new RewardEvaluationWorker(
    prisma, ledgerRepo, new RewardEvaluationCursorRepository(prisma), balanceRepo, progressionService, levelDefRepo,
    bundleRepo, new RewardGrantRepository(prisma), new RewardGrantComponentRepository(prisma), txRunner,
    new AchievementDefinitionRepository(prisma), new AchievementVersionRepository(prisma), new AchievementProgressRepository(prisma),
    new AchievementUnlockRepository(prisma), new AccountTitleRepository(prisma), new InventoryItemRepository(prisma),
    new ChallengeDefinitionRepository(prisma), new AccountChallengeRepository(prisma), new AccountChallengeDailyProgressRepository(prisma),
    new AccountChallengeConsumedEventRepository(prisma), new ValidatedGamificationActivityRepository(prisma),
    curriculumTopicRepo, curriculumTopicProgressRepo, new TitleDefinitionRepository(prisma),
    new TitleEligibilityService(prisma, subjectRepo, curriculumTopicRepo, curriculumTopicProgressRepo, progressionService),
    new SubjectCompletionService(curriculumTopicRepo, curriculumTopicProgressRepo, subjectRepo),
  );
  const enrollmentService = new LeagueEnrollmentService(prisma, seasonRepo, leagueDefRepo, leagueGroupRepo, participationRepo, bundleRepo, worker);
  const contextService = new CompetitiveContextService(participationRepo, entryRepo, leaderboardDefRepo, leagueGroupRepo, leagueDefRepo);

  // --- Fixtures base: un ladder de tiers limpio (seguro: assertGateDb ya corrió) ---
  const tierKey = `hrl-bronze-${suffix}`;
  const tier = await leagueDefRepo.create({ leagueKey: tierKey, name: 'HRL Bronce', tierOrder: 1, participantGroupSize: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20' });
  await retireOtherActiveLeagues(pg, [tierKey]);

  async function makeActiveSeason(key: string): Promise<string> {
    await finalizeStaleGateSeasons(pg);
    const s = await seasonRepo.create({ seasonKey: key, name: key, startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 7 * 86_400_000) });
    await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [s.id]);
    return s.id;
  }
  async function setLp(participationId: string, lp: number): Promise<void> {
    await pg.query('UPDATE season_league_participation SET league_points = $1 WHERE id = $2', [lp, participationId]);
  }
  async function hubLp(accountId: string): Promise<number | 'NO_ACTIVE_SEASON' | 'NOT_ENROLLED'> {
    const r = await enrollmentService.getParticipationStatus(accountId);
    return r.kind === 'ENROLLED' ? r.leaguePoints : r.kind;
  }

  // ============================ SCENARIO A ============================
  console.log('--- A. Temporada vigente + participación: Hub y Ranking coinciden ---');
  const acctA = randomUUID();
  const seasonA = await makeActiveSeason(`hrl-a-${suffix}`);
  const joinA = await enrollmentService.joinActiveSeason(acctA);
  if (!('participation' in joinA)) throw new Error('joinActiveSeason A no creó participación');
  await setLp(joinA.participation.id, 42);

  const hubA = await hubLp(acctA);
  const curPartA = await participationRepo.findCurrentByAccountId(acctA, new Date());
  check('Hub reporta LP = 42', hubA === 42);
  check('findCurrentByAccountId devuelve la MISMA participación (misma temporada vigente)', curPartA?.id === joinA.participation.id && curPartA?.gameSeasonId === seasonA);
  check('findCurrent(now) resuelve la temporada vigente', (await seasonRepo.findCurrent(new Date()))?.id === seasonA);

  // ============================ SCENARIO B ============================
  console.log('--- B. Temporada FINALIZED + participación con estado ACTIVE residual: NO es "actual" ---');
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE id = $1", [seasonA]);
  // participación de acctA queda con participation_status = ACTIVE (residuo transitorio)

  check('findCurrent(now) = null (no hay temporada vigente)', (await seasonRepo.findCurrent(new Date())) === null);
  check('findCurrentByAccountId = null (la participación pertenece a una temporada NO vigente)', (await participationRepo.findCurrentByAccountId(acctA, new Date())) === null);
  check('Hub -> NO_ACTIVE_SEASON (no muestra los 42 LP históricos como actuales)', (await hubLp(acctA)) === 'NO_ACTIVE_SEASON');
  check('Ranking (CompetitiveContextService) -> null (no surface de participación obsoleta)', (await contextService.resolveByAccountId(acctA)) === null);
  // Prueba explícita del bug ANTERIOR: findFirst({participationStatus:'ACTIVE'}) SÍ la encontraría.
  const stale = await prisma.seasonLeagueParticipation.findFirst({ where: { accountId: acctA, participationStatus: 'ACTIVE' } });
  check('(control) la participación obsoleta AÚN existe con estado ACTIVE -- el fix la ignora por temporada, no por estado', stale?.id === joinA.participation.id);

  // ============================ SCENARIO C ============================
  console.log('--- C. Participación vieja FINALIZED (42) + participación nueva vigente (0): ambas superficies = la NUEVA ---');
  const seasonC = await makeActiveSeason(`hrl-c-${suffix}`);
  const joinC = await enrollmentService.joinActiveSeason(acctA);
  if (!('participation' in joinC)) throw new Error('joinActiveSeason C no creó participación');
  check('la nueva participación pertenece a la temporada C vigente', joinC.participation.gameSeasonId === seasonC && joinC.participation.id !== joinA.participation.id);
  check('la nueva participación arranca en 0 LP', joinC.participation.leaguePoints === 0);

  const hubC = await hubLp(acctA);
  const curPartC = await participationRepo.findCurrentByAccountId(acctA, new Date());
  check('Hub reporta 0 LP (de la temporada NUEVA, nunca los 42 de la vieja)', hubC === 0);
  check('findCurrentByAccountId devuelve la participación de la temporada C', curPartC?.id === joinC.participation.id);
  check('la participación vieja (42 LP) sigue intacta como historial, no como actual', (await participationRepo.findById(joinA.participation.id))?.leaguePoints === 42);

  // Limpieza mínima -- estado de este run.
  await pg.query('DELETE FROM league_point_ledger_entry WHERE account_id = $1', [acctA]).catch(() => undefined);
  await pg.query('DELETE FROM season_league_participation WHERE account_id = $1', [acctA]);
  await finalizeStaleGateSeasons(pg);

  await prisma.$disconnect();
  await pg.end();

  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de consistencia Hub/Ranking pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
