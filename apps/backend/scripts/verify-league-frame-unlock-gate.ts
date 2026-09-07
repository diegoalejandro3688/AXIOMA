// STABILIZATION-B -- gate enfocado: los marcos de liga son PRESTIGIO, se
// otorgan por haber SUPERADO un tier (transición PROMOTED), nunca por el
// mero hecho de jugar en él. Excepción terminal: el tier más alto entrega su
// propio marco al alcanzarlo (no hay uno superior que "superar"). SIN HTTP:
// ejercita `LeagueEnrollmentService.joinActiveSeason` real contra Postgres
// real, con 3 tiers (basta para probar el mecanismo genérico de
// tierOrder, no hace falta recrear las 7 ligas productivas).
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
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { RewardGrantRepository } from '../src/gamification/reward-grant.repository';
import { RewardGrantComponentRepository } from '../src/gamification/reward-grant-component.repository';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { ProgressionService } from '../src/gamification/progression.service';
import { RewardEvaluationCursorRepository } from '../src/gamification/reward-evaluation-cursor.repository';
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
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { LeagueEnrollmentService } from '../src/gamification/league-enrollment.service';
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
  const bundleRepo = new RewardBundleRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const seasonRepo = new GameSeasonRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const inventoryItemRepo = new InventoryItemRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);

  const worker = new RewardEvaluationWorker(
    prisma,
    new XpLedgerEntryRepository(prisma),
    new RewardEvaluationCursorRepository(prisma),
    new XpBalanceRepository(prisma),
    new ProgressionService(new XpBalanceRepository(prisma), new XpLedgerEntryRepository(prisma), new LevelDefinitionRepository(prisma)),
    new LevelDefinitionRepository(prisma),
    bundleRepo,
    new RewardGrantRepository(prisma),
    new RewardGrantComponentRepository(prisma),
    txRunner,
    new AchievementDefinitionRepository(prisma),
    new AchievementVersionRepository(prisma),
    new AchievementProgressRepository(prisma),
    new AchievementUnlockRepository(prisma),
    new AccountTitleRepository(prisma),
    inventoryItemRepo,
    new ChallengeDefinitionRepository(prisma),
    new AccountChallengeRepository(prisma),
    new AccountChallengeDailyProgressRepository(prisma),
    new AccountChallengeConsumedEventRepository(prisma),
    new ValidatedGamificationActivityRepository(prisma),
    new CurriculumTopicRepository(prisma),
    new CurriculumTopicProgressRepository(prisma),
    new TitleDefinitionRepository(prisma),
    new TitleEligibilityService(
      prisma,
      new SubjectRepository(prisma),
      new CurriculumTopicRepository(prisma),
      new CurriculumTopicProgressRepository(prisma),
      new ProgressionService(new XpBalanceRepository(prisma), new XpLedgerEntryRepository(prisma), new LevelDefinitionRepository(prisma)),
    ),
    new SubjectCompletionService(new CurriculumTopicRepository(prisma), new CurriculumTopicProgressRepository(prisma), new SubjectRepository(prisma)),
  );
  const enrollmentService = new LeagueEnrollmentService(prisma, seasonRepo, leagueDefinitionRepo, leagueGroupRepo, participationRepo, bundleRepo, worker);

  async function ownsFrame(accountId: string, cosmeticItemId: string): Promise<boolean> {
    const row = await pg.query('SELECT 1 FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [accountId, cosmeticItemId]);
    return (row.rowCount ?? 0) > 0;
  }
  async function frameCount(accountId: string, cosmeticItemId: string): Promise<number> {
    const row = await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id = $1 AND cosmetic_item_id = $2', [accountId, cosmeticItemId]);
    return row.rows[0].n;
  }

  async function makeTierBundle(tierName: string): Promise<{ bundleId: string; cosmeticItemId: string }> {
    const cosmetic = await pg.query(
      `INSERT INTO cosmetic_item (id, item_key, item_type, name, rarity_class, asset_reference, visibility_status, status)
       VALUES ($1, $2, 'AVATAR_FRAME', $3, 'COMMON', $4, 'PUBLIC', 'ACTIVE') RETURNING id`,
      [randomUUID(), `gate-league-frame-${tierName}-${suffix}`, `Marco ${tierName} (gate)`, `asset://gate/${tierName}-${suffix}`],
    );
    const cosmeticItemId = cosmetic.rows[0].id as string;
    const bundle = await bundleRepo.create({ bundleKey: `gate-league-bundle-${tierName}-${suffix}`, name: `Marco ${tierName}`, items: [{ componentType: 'COSMETIC', referenceId: cosmeticItemId }] });
    return { bundleId: bundle.id, cosmeticItemId };
  }

  console.log('--- Fixtures: 3 tiers (bajo/medio/terminal), cada uno con su marco ---');
  const t1 = await makeTierBundle('t1');
  const t2 = await makeTierBundle('t2');
  const t3 = await makeTierBundle('t3');
  const tier1 = await leagueDefinitionRepo.create({ leagueKey: `gate-tier1-${suffix}`, name: 'Tier 1', tierOrder: 1, participantGroupSize: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20', rewardBundleId: t1.bundleId });
  const tier2 = await leagueDefinitionRepo.create({ leagueKey: `gate-tier2-${suffix}`, name: 'Tier 2', tierOrder: 2, participantGroupSize: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20', rewardBundleId: t2.bundleId });
  const tier3 = await leagueDefinitionRepo.create({ leagueKey: `gate-tier3-${suffix}`, name: 'Tier 3 (terminal)', tierOrder: 3, participantGroupSize: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20', rewardBundleId: t3.bundleId });
  check('3 tiers creados ACTIVE', tier1.status === 'ACTIVE' && tier2.status === 'ACTIVE' && tier3.status === 'ACTIVE');

  // STABILIZATION-B7 -- FIXTURE INVÁLIDO CORREGIDO: los 3 tiers-fixture usan
  // `tierOrder` 1/2/3, que COLISIONAN con las 7 ligas productivas seedeadas
  // en la base de gates (Bronce=1, Plata=2, Oro=3, ...). Sin esto,
  // `findLowestActiveTier` / `findAdjacentActiveTier` devolvían una liga
  // REAL en vez de la del gate, `resolveTargetTier` resolvía un tier sin el
  // `rewardBundleId` del gate y NINGÚN marco se entregaba -- exactamente la
  // firma de 9 fallos que arrastraba este gate. Se retiran todas las ligas
  // ACTIVE ajenas a esta corrida (seguro: `assertGateDb` ya hizo HARD FAIL
  // si la base fuese `axioma_dev`).
  await retireOtherActiveLeagues(pg, [tier1.leagueKey, tier2.leagueKey, tier3.leagueKey]);

  // STABILIZATION-B7 -- `startsAt` SIEMPRE en el pasado (1 h atrás) para que
  // la temporada sea CANÓNICAMENTE VIGENTE (`findCurrent` exige
  // `startsAt <= now < endsAt`, no sólo status ACTIVE). `offsetDays` sólo
  // separa los `endsAt` para mantener claves/orden distintos entre las
  // temporadas sucesivas del gate. Sólo una está ACTIVE a la vez
  // (`finalizeStaleGateSeasons` cierra la anterior).
  // PF2-C.3A -- las claves de estas temporadas usan el prefijo `comp-v1-`
  // (historial competitivo LEGÍTIMO): el join manual ahora deriva el tier de
  // `findMostRecentCompetitiveTerminalBefore`, que sólo considera temporadas
  // `comp-v1-*` anteriores a la activa. La marca epoch (`${suffix}`) al final
  // mantiene el barrido de `finalizeStaleGateSeasons`.
  async function newActiveSeason(seasonKey: string, offsetDays: number): Promise<string> {
    await finalizeStaleGateSeasons(pg);
    const season = await seasonRepo.create({
      seasonKey,
      name: seasonKey,
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date(Date.now() + (offsetDays + 7) * 86_400_000),
    });
    await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);
    return season.id;
  }

  const accountA = randomUUID();
  // STABILIZATION-B -- segunda cuenta, en PARALELO exacto con A, para probar
  // que dos cuentas distintas superando el MISMO tier reciben cada una su
  // PROPIO marco (regresión real encontrada y corregida en este incremento:
  // `deliverBundleComponents` construye `idempotencyKey` SIN `accountId` --
  // sin el fix, la segunda cuenta en superar un tier nunca recibía su
  // propia fila, silenciosamente reutilizaba el `reward_grant` de la primera).
  const accountB = randomUUID();

  console.log('--- A. Ingreso inicial (tier más bajo) -- 0 marcos otorgados ---');
  await newActiveSeason(`comp-v1-gate-s1-${suffix}`, 0);
  await enrollmentService.joinActiveSeason(accountA);
  await enrollmentService.joinActiveSeason(accountB);
  check('tier1 (inicial) NO otorga su propio marco por el mero ingreso', !(await ownsFrame(accountA, t1.cosmeticItemId)));
  check('tier2/tier3 tampoco (ni siquiera participó ahí)', !(await ownsFrame(accountA, t2.cosmeticItemId)) && !(await ownsFrame(accountA, t3.cosmeticItemId)));

  console.log('--- B. PROMOTED tier1 -> tier2 (A y B en paralelo): cada cuenta recibe su PROPIO marco de tier1 (el SUPERADO), no el de tier2 ---');
  const participation1 = await participationRepo.findMostRecentByAccountId(accountA);
  await pg.query("UPDATE season_league_participation SET participation_status = 'SEASON_ENDED' WHERE id = $1", [participation1!.id]);
  await pg.query("UPDATE season_league_participation SET participation_status = 'PROMOTED' WHERE id = $1", [participation1!.id]);
  const participationB1 = await participationRepo.findMostRecentByAccountId(accountB);
  await pg.query("UPDATE season_league_participation SET participation_status = 'SEASON_ENDED' WHERE id = $1", [participationB1!.id]);
  await pg.query("UPDATE season_league_participation SET participation_status = 'PROMOTED' WHERE id = $1", [participationB1!.id]);
  await newActiveSeason(`comp-v1-gate-s2-${suffix}`, 10);
  await enrollmentService.joinActiveSeason(accountA);
  await enrollmentService.joinActiveSeason(accountB);
  check('marco de tier1 (superado) otorgado a A', await ownsFrame(accountA, t1.cosmeticItemId));
  check('marco de tier1 (superado) TAMBIÉN otorgado a B -- su PROPIA fila, no la de A', await ownsFrame(accountB, t1.cosmeticItemId));
  check('exactamente 2 filas de marco tier1 en total (una por cuenta, nunca compartida/colisionada)', (await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE cosmetic_item_id = $1', [t1.cosmeticItemId])).rows[0].n === 2);
  check('marco de tier2 (destino, NO superado todavía) -- aún no otorgado', !(await ownsFrame(accountA, t2.cosmeticItemId)));

  console.log('--- C. Reingreso a la MISMA temporada (idempotente) -- sin duplicado ---');
  await enrollmentService.joinActiveSeason(accountA);
  check('reingreso idempotente -- sigue habiendo exactamente 1 fila de marco tier1', (await frameCount(accountA, t1.cosmeticItemId)) === 1);

  console.log('--- D-E-F. PROMOTED tier2 -> tier3 (terminal): se entrega el marco de tier2 (superado) Y el de tier3 (alcanzado por primera vez, terminal) ---');
  const participation2 = await participationRepo.findMostRecentByAccountId(accountA);
  await pg.query("UPDATE season_league_participation SET participation_status = 'SEASON_ENDED' WHERE id = $1", [participation2!.id]);
  await pg.query("UPDATE season_league_participation SET participation_status = 'PROMOTED' WHERE id = $1", [participation2!.id]);
  await newActiveSeason(`comp-v1-gate-s3-${suffix}`, 20);
  await enrollmentService.joinActiveSeason(accountA);
  check('marco de tier2 (superado) otorgado', await ownsFrame(accountA, t2.cosmeticItemId));
  check('marco de tier3 (terminal, alcanzado por primera vez) otorgado', await ownsFrame(accountA, t3.cosmeticItemId));
  check('marco de tier1 sigue intacto (sin duplicar ni perder)', (await frameCount(accountA, t1.cosmeticItemId)) === 1);

  console.log('--- G. RETAINED en tier3 (terminal) en una nueva temporada -- marco terminal sin duplicar ---');
  const participation3 = await participationRepo.findMostRecentByAccountId(accountA);
  await pg.query("UPDATE season_league_participation SET participation_status = 'SEASON_ENDED' WHERE id = $1", [participation3!.id]);
  await pg.query("UPDATE season_league_participation SET participation_status = 'RETAINED' WHERE id = $1", [participation3!.id]);
  await newActiveSeason(`comp-v1-gate-s4-${suffix}`, 30);
  await enrollmentService.joinActiveSeason(accountA);
  check('RETAINED en terminal -- sigue habiendo exactamente 1 fila de marco tier3 (idempotente)', (await frameCount(accountA, t3.cosmeticItemId)) === 1);
  check('RETAINED no genera un marco tier2 adicional (no hubo superación nueva)', (await frameCount(accountA, t2.cosmeticItemId)) === 1);

  console.log('--- K. Ningún marco se auto-equipa ---');
  const equipped = await pg.query(
    'SELECT count(*)::int AS n FROM equipped_cosmetic ec JOIN inventory_item ii ON ii.id = ec.inventory_item_id WHERE ii.account_id = $1',
    [accountA],
  );
  check('ningún equipped_cosmetic creado por la entrega de marcos', equipped.rows[0].n === 0);

  await prisma.$disconnect();
  await pg.end();
  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de desbloqueo de marcos de liga pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
