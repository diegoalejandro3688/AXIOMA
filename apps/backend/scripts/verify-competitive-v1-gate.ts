// Gate de COMPETITIVE V1 -- "activar la experiencia de liga que ya existe".
// Cubre lo que este incremento AÑADE sobre Bloque IV (Incrementos 1-5, ya
// cerrados y con sus propios gates):
//
//   §32  configuración PRODUCTIVA de League Points (1/2/5, sin cap, exactamente
//        los 3 activityType ya emitidos -- nunca uno nuevo) + idempotencia del
//        seed.
//   §33  gramática de zonas EN VIVO (`promotion-grammar.ts`) espejo EXACTO del
//        cierre de grupo -- G=30 medio (1-6/7-24/25-30), G<3, Bronce, Gran
//        Maestro, grupo parcial. Y que `LeaderboardFinalizationService`
//        DELEGA en ese helper (no duplica la fórmula).
//   §37  otorgamiento LP end-to-end por el pipeline REAL con los montos
//        PRODUCTIVOS: RESPUESTA_VALIDADA +1, QUICK_QUESTION_ANSWERED +2,
//        TEMA_COMPLETADO +5; reintento idempotente; sin participación -> sin LP.
//
// Corre contra `axioma_gates_dev` vía run-gate.ts -- nunca `axioma_dev`.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaguePointRuleRepository } from '../src/gamification/league-point-rule.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { LeagueEnrollmentService } from '../src/gamification/league-enrollment.service';
import { LeaguePointGrantService } from '../src/gamification/league-point-grant.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
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
import { LEAGUE_POINT_RULES_V1, LEAGUE_POINT_RULE_V1_EFFECTIVE_FROM } from '../src/gamification/competitive-v1-config';
import { computeZoneCounts, resolveCompetitiveZone, competitiveZoneFor, MINIMUM_PARTICIPANTS_FOR_PROMOTION } from '../src/gamification/promotion-grammar';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

/** Zona de un rank en un grupo de tamaño G, tier medio (ni el más alto ni el más bajo), reglas productivas 20%/20%. */
function midZone(rankPosition: number, G: number): string {
  return competitiveZoneFor({ rankPosition, participantCount: G, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20', isHighestTier: false, isLowestTier: false });
}

async function main() {
  // ===========================================================================
  // PARTE 1 -- PURA (config + gramática de zonas). Sin DB, sin servidor.
  // ===========================================================================
  console.log('=== PARTE 1: config LP productiva + gramática de zonas (pura) ===\n');

  console.log('--- §32. LEAGUE_POINT_RULES_V1: exactamente los 3 tipos, montos 1/2/5, sin cap ---');
  const byType = new Map(LEAGUE_POINT_RULES_V1.map((r) => [r.activityType, r]));
  check('exactamente 3 reglas', LEAGUE_POINT_RULES_V1.length === 3);
  check('RESPUESTA_VALIDADA = +1 LP', byType.get('RESPUESTA_VALIDADA')?.basePoints === 1);
  check('QUICK_QUESTION_ANSWERED = +2 LP', byType.get('QUICK_QUESTION_ANSWERED')?.basePoints === 2);
  check('TEMA_COMPLETADO = +5 LP', byType.get('TEMA_COMPLETADO')?.basePoints === 5);
  check('ninguna regla tiene dailyCap (null = sin tope, §25)', LEAGUE_POINT_RULES_V1.every((r) => r.dailyCap === null));
  check('activityType ⊆ {RESPUESTA_VALIDADA, QUICK_QUESTION_ANSWERED, TEMA_COMPLETADO} -- NUNCA un tipo nuevo', LEAGUE_POINT_RULES_V1.every((r) => ['RESPUESTA_VALIDADA', 'QUICK_QUESTION_ANSWERED', 'TEMA_COMPLETADO'].includes(r.activityType)));
  // Los 3 tipos DEBEN existir en el mapeo del ingestor (`GamificationService.activityTypeFor`).
  const gamServiceSource = readFileSync(join(__dirname, '..', 'src', 'gamification', 'gamification.service.ts'), 'utf8');
  check('los 3 activityType existen en GamificationService.activityTypeFor', ['RESPUESTA_VALIDADA', 'QUICK_QUESTION_ANSWERED', 'TEMA_COMPLETADO'].every((t) => gamServiceSource.includes(`'${t}'`)));

  console.log('--- §33. Zonas: G=30, tier medio -> 1-6 PROMOTION / 7-24 RETENTION / 25-30 DEMOTION ---');
  const counts30 = computeZoneCounts({ participantCount: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20' });
  check('G=30 -> promoteCount=6, demoteCount=6', counts30.promoteCount === 6 && counts30.demoteCount === 6);
  for (let r = 1; r <= 6; r++) check(`rank ${r} -> PROMOTION`, midZone(r, 30) === 'PROMOTION');
  for (let r = 7; r <= 24; r++) if (r === 7 || r === 15 || r === 24) check(`rank ${r} -> RETENTION`, midZone(r, 30) === 'RETENTION');
  for (let r = 25; r <= 30; r++) check(`rank ${r} -> DEMOTION`, midZone(r, 30) === 'DEMOTION');

  console.log('--- §33. G < 3 -> todo RETENTION ---');
  check(`MINIMUM_PARTICIPANTS_FOR_PROMOTION = 3`, MINIMUM_PARTICIPANTS_FOR_PROMOTION === 3);
  check('G=2 -> promote/demote count 0', (() => { const c = computeZoneCounts({ participantCount: 2, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20' }); return c.promoteCount === 0 && c.demoteCount === 0; })());
  check('G=2, rank 1 y 2 -> RETENTION', midZone(1, 2) === 'RETENTION' && midZone(2, 2) === 'RETENTION');

  console.log('--- §33. Bordes de tier ---');
  const c30 = computeZoneCounts({ participantCount: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20' });
  check('Bronce (isLowestTier): rank 30 (zona de descenso) -> RETENTION', resolveCompetitiveZone({ rankPosition: 30, participantCount: 30, ...c30, isHighestTier: false, isLowestTier: true }) === 'RETENTION');
  check('Bronce: rank 1 sigue PROMOTION', resolveCompetitiveZone({ rankPosition: 1, participantCount: 30, ...c30, isHighestTier: false, isLowestTier: true }) === 'PROMOTION');
  check('Gran Maestro (isHighestTier): rank 1 (zona de ascenso) -> RETENTION', resolveCompetitiveZone({ rankPosition: 1, participantCount: 30, ...c30, isHighestTier: true, isLowestTier: false }) === 'RETENTION');
  check('Gran Maestro: rank 30 sigue DEMOTION', resolveCompetitiveZone({ rankPosition: 30, participantCount: 30, ...c30, isHighestTier: true, isLowestTier: false }) === 'DEMOTION');

  console.log('--- §33. Grupo parcial G=10 -> 2 PROMOTION / 6 RETENTION / 2 DEMOTION ---');
  const c10 = computeZoneCounts({ participantCount: 10, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20' });
  check('G=10 -> promoteCount=2, demoteCount=2', c10.promoteCount === 2 && c10.demoteCount === 2);
  check('G=10: ranks 1-2 PROMOTION, 3-8 RETENTION, 9-10 DEMOTION', [1, 2].every((r) => midZone(r, 10) === 'PROMOTION') && [3, 5, 8].every((r) => midZone(r, 10) === 'RETENTION') && [9, 10].every((r) => midZone(r, 10) === 'DEMOTION'));

  console.log('--- §33. LeaderboardFinalizationService DELEGA en promotion-grammar (no duplica la fórmula) ---');
  const finalizationSource = readFileSync(join(__dirname, '..', 'src', 'gamification', 'leaderboard-finalization.service.ts'), 'utf8');
  check("importa de './promotion-grammar'", /from '\.\/promotion-grammar'/.test(finalizationSource));
  check('usa computeZoneCounts + resolveCompetitiveZone', finalizationSource.includes('computeZoneCounts(') && finalizationSource.includes('resolveCompetitiveZone('));
  check('YA NO define su propia `parseTopPercent`/`parseBottomPercent`', !/function parseTopPercent/.test(finalizationSource) && !/function parseBottomPercent/.test(finalizationSource));

  // ===========================================================================
  // PARTE 2 -- LP end-to-end por el pipeline REAL con montos PRODUCTIVOS (§37).
  // ===========================================================================
  console.log('\n=== PARTE 2: LP end-to-end con montos productivos (pipeline real) ===\n');

  const base = process.argv[2] ?? 'http://127.0.0.1:3000'; // no se usa (sin HTTP), pero run-gate.ts lo antepone
  void base;
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ruleRepo = new LeaguePointRuleRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const activityRepo = new ValidatedGamificationActivityRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const rewardWorker = new RewardEvaluationWorker(
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
    new InventoryItemRepository(prisma),
  );
  const enrollmentService = new LeagueEnrollmentService(prisma, seasonRepo, leagueDefinitionRepo, leagueGroupRepo, participationRepo, bundleRepo, rewardWorker);
  const grantService = new LeaguePointGrantService(txRunner, activityRepo, participationRepo, seasonRepo, leagueGroupRepo, ruleRepo, ledgerRepo);

  const suffix = Date.now();
  const now = new Date();

  // Higiene: cierra cualquier temporada ACTIVE huérfana + retira tiers previos.
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE status = 'ACTIVE'");
  await pg.query("UPDATE league_definition SET status = 'RETIRED', retired_at = now() WHERE status = 'ACTIVE'");

  const tier = await leagueDefinitionRepo.create({ leagueKey: `compv1-tier-${suffix}`, name: 'Bronce', tierOrder: 1, participantGroupSize: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20' });
  const season = await seasonRepo.create({ seasonKey: `compv1-${suffix}`, name: 'CompV1', startsAt: new Date(now.getTime() - 60 * 60 * 1000), endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) });
  // Activación DIRECTA por id (mismo criterio que verify-league-season-foundation-gate):
  // `activateScheduledSeasons()` activaría la temporada SCHEDULED más antigua,
  // que en la base de gates puede ser un residuo de otra corrida.
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);
  check('temporada de fixture ACTIVE', (await seasonRepo.findActive())?.id === season.id);
  void tier;

  // Las 3 reglas PRODUCTIVAS (montos exactos de `LEAGUE_POINT_RULES_V1`).
  for (const rule of LEAGUE_POINT_RULES_V1) {
    await ruleRepo.create({ activityType: rule.activityType, basePoints: rule.basePoints, dailyCap: null, effectiveFrom: LEAGUE_POINT_RULE_V1_EFFECTIVE_FROM, ruleVersion: rule.ruleVersion });
  }
  check('3 reglas LP productivas creadas', (await pg.query('SELECT count(*)::int AS n FROM league_point_rule')).rows[0].n >= 3);

  const account = randomUUID();
  const enroll = await enrollmentService.joinActiveSeason(account);
  check('cuenta inscrita', 'participation' in enroll && enroll.created === true);
  const participationId = 'participation' in enroll ? enroll.participation.id : '';

  async function grantOne(activityType: string, dedupe: string) {
    const activity = await activityRepo.create({
      accountId: account,
      sourceDomain: 'PROGRESS',
      sourceEntityType: 'StudentResponse',
      sourceEntityId: randomUUID(),
      activityType,
      validationStatus: 'PENDING',
      occurredAt: new Date(now.getTime() + 60 * 1000),
      validationRuleVersion: 'v1',
      deduplicationKey: dedupe,
      integrityStatus: 'OK',
    });
    return { activity, outcome: await grantService.grantForActivity(activity) };
  }

  console.log('--- §37 CASE A: RESPUESTA_VALIDADA -> +1 LP (ledger + balance) ---');
  const a = await grantOne('RESPUESTA_VALIDADA', `compv1-a-${suffix}`);
  check('LP_GRANTED, pointAmount = 1', a.outcome.outcome === 'LP_GRANTED' && a.outcome.entry.pointAmount === 1);

  console.log('--- §37 CASE B: QUICK_QUESTION_ANSWERED -> +2 LP ---');
  const b = await grantOne('QUICK_QUESTION_ANSWERED', `compv1-b-${suffix}`);
  check('LP_GRANTED, pointAmount = 2', b.outcome.outcome === 'LP_GRANTED' && b.outcome.entry.pointAmount === 2);

  console.log('--- §37 CASE C: TEMA_COMPLETADO -> +5 LP ---');
  const c = await grantOne('TEMA_COMPLETADO', `compv1-c-${suffix}`);
  check('LP_GRANTED, pointAmount = 5', c.outcome.outcome === 'LP_GRANTED' && c.outcome.entry.pointAmount === 5);

  const balance = await participationRepo.findById(participationId);
  check('balance leaguePoints de la participación = 1 + 2 + 5 = 8', balance?.leaguePoints === 8);

  console.log('--- §37 CASE D: reintento del mismo grant -> idempotente, sin duplicar ---');
  const retry = await grantService.grantForActivity(a.activity);
  check('reintento -> misma entrada', retry.outcome === 'LP_GRANTED' && a.outcome.outcome === 'LP_GRANTED' && retry.entry.id === a.outcome.entry.id);
  const rowCount = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = $1', [a.activity.id]);
  check('sigue habiendo UNA sola fila de ledger para esa actividad', rowCount.rows[0].n === 1);
  const balanceAfterRetry = await participationRepo.findById(participationId);
  check('el balance NO volvió a incrementarse (sigue en 8)', balanceAfterRetry?.leaguePoints === 8);

  console.log('--- §37 CASE E: cuenta NO inscrita -> sin LP, sin fila ---');
  const stranger = randomUUID();
  const strangerActivity = await activityRepo.create({
    accountId: stranger, sourceDomain: 'PROGRESS', sourceEntityType: 'StudentResponse', sourceEntityId: randomUUID(),
    activityType: 'RESPUESTA_VALIDADA', validationStatus: 'PENDING', occurredAt: now, validationRuleVersion: 'v1',
    deduplicationKey: `compv1-e-${suffix}`, integrityStatus: 'OK',
  });
  const strangerOutcome = await grantService.grantForActivity(strangerActivity);
  check('sin participación activa -> NOT_PARTICIPATING', strangerOutcome.outcome === 'NOT_PARTICIPATING');
  const strangerRows = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE account_id = $1', [stranger]);
  check('0 filas de ledger para la cuenta no inscrita', strangerRows.rows[0].n === 0);

  await pg.end();
  await (prisma as unknown as PrismaClient).$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de COMPETITIVE V1 pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
