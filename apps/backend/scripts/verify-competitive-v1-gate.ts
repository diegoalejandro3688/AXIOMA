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
import { QuickQuestionAttemptRepository } from '../src/gamification/quick-question-attempt.repository';
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

  console.log('--- §10 (Incremento 10). Correctness de LP: ACOTADA a QUICK_QUESTION_ANSWERED, productor intacto ---');
  const grantSource = readFileSync(join(__dirname, '..', 'src', 'gamification', 'league-point-grant.service.ts'), 'utf8');
  check("la excepción de correctness sólo mira activity.activityType === 'QUICK_QUESTION_ANSWERED'", grantSource.includes("activity.activityType === 'QUICK_QUESTION_ANSWERED'"));
  check('RESPUESTA_VALIDADA / TEMA_COMPLETADO NO aparecen en el filtro de correctness (siguen incondicionales)', !grantSource.includes("=== 'RESPUESTA_VALIDADA'") && !grantSource.includes("=== 'TEMA_COMPLETADO'"));
  check('la QQ incorrecta se resuelve como NOT_REWARDABLE (nunca un OTORGAMIENTO de monto 0)', grantSource.includes("outcome: 'NOT_REWARDABLE'") && !/pointAmount:\s*0/.test(grantSource));
  const qqServiceSource = readFileSync(join(__dirname, '..', 'src', 'gamification', 'quick-question.service.ts'), 'utf8');
  const publishGuard = qqServiceSource.slice(qqServiceSource.indexOf('if (result.outcome'), qqServiceSource.indexOf('this.outbox.publish'));
  check('§3: el productor NO cambió -- quick_question_answered se publica para TODA respuesta creada, sin condicionar por isCorrect', publishGuard.includes("result.outcome === 'ANSWERED' && result.created") && !publishGuard.includes('isCorrect'));

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
  const quickQuestionAttemptRepo = new QuickQuestionAttemptRepository(prisma);
  const grantService = new LeaguePointGrantService(txRunner, activityRepo, participationRepo, seasonRepo, leagueGroupRepo, ruleRepo, ledgerRepo, quickQuestionAttemptRepo);

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

  async function grantOne(activityType: string, dedupe: string, source?: { type: string; id: string }) {
    const activity = await activityRepo.create({
      accountId: account,
      sourceDomain: source ? 'GAMIFICATION' : 'PROGRESS',
      sourceEntityType: source?.type ?? 'StudentResponse',
      sourceEntityId: source?.id ?? randomUUID(),
      activityType,
      validationStatus: 'PENDING',
      occurredAt: new Date(now.getTime() + 60 * 1000),
      validationRuleVersion: 'v1',
      deduplicationKey: dedupe,
      integrityStatus: 'OK',
    });
    return { activity, outcome: await grantService.grantForActivity(activity) };
  }

  /**
   * Incremento 10 -- crea un `quick_question_attempt` REAL (con su sesión,
   * pregunta publicada y alternativas) para probar la condición de correctness
   * del otorgamiento de LP por el pipeline real. La sesión cuelga de una cuenta
   * desechable: `LeaguePointGrantService` sólo lee `attempt.isCorrect` por id,
   * nunca compara la cuenta del intento con la de la actividad.
   */
  async function makeQuickQuestionAttempt(isCorrect: boolean): Promise<string> {
    const topicRow = await pg.query(`SELECT subject_id FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
    if (topicRow.rowCount === 0) throw new Error('Fixture de currículo no encontrada -- ¿seed ejecutado?');
    const subjectId = topicRow.rows[0].subject_id as string;
    const topicId = randomUUID();
    await pg.query(
      `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
       VALUES ($1, $2, 'Tema aislado del gate competitive-v1 (Incr 10)', 905, $3, now(), now())`,
      [topicId, `GATE.CV1.QQ.${suffix}-${Math.random().toString(36).slice(2, 8)}`, subjectId],
    );
    const questionId = randomUUID();
    const questionVersionId = randomUUID();
    const chosenOptionId = randomUUID();
    const otherOptionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [questionId, `GATE.CV1.QQ.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
      [questionVersionId, questionId, topicId],
    );
    // La alternativa ELEGIDA en el intento: correcta o incorrecta según el
    // parámetro. La OTRA lleva el is_correct complementario -> siempre hay
    // exactamente una correcta.
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"elegida"}', 0, $3, now())`,
      [chosenOptionId, questionVersionId, isCorrect],
    );
    await pg.query(
      `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
       VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"otra"}', 1, $3, now())`,
      [otherOptionId, questionVersionId, !isCorrect],
    );
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [questionVersionId]);

    const attemptAccountId = randomUUID();
    const sessionId = randomUUID();
    await pg.query(`INSERT INTO quick_question_session (id, account_id, status, started_at) VALUES ($1, $2, 'ACTIVE', now())`, [sessionId, attemptAccountId]);
    const attemptId = randomUUID();
    await pg.query(
      `INSERT INTO quick_question_attempt (id, session_id, account_id, question_version_id, answer_option_id, is_correct, presented_at, responded_at, operation_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now(), $7, now())`,
      [attemptId, sessionId, attemptAccountId, questionVersionId, chosenOptionId, isCorrect, randomUUID()],
    );
    return attemptId;
  }

  console.log('--- §37 CASE A: RESPUESTA_VALIDADA -> +1 LP (ledger + balance) ---');
  const a = await grantOne('RESPUESTA_VALIDADA', `compv1-a-${suffix}`);
  check('LP_GRANTED, pointAmount = 1', a.outcome.outcome === 'LP_GRANTED' && a.outcome.entry.pointAmount === 1);

  console.log('--- §37 CASE B: QUICK_QUESTION_ANSWERED ACERTADA -> +2 LP (Incremento 10) ---');
  const correctAttemptId = await makeQuickQuestionAttempt(true);
  const b = await grantOne('QUICK_QUESTION_ANSWERED', `compv1-b-${suffix}`, { type: 'QuickQuestionAttempt', id: correctAttemptId });
  check('QQ correcta -> LP_GRANTED, pointAmount = 2', b.outcome.outcome === 'LP_GRANTED' && b.outcome.entry.pointAmount === 2);

  console.log('--- §37 CASE C: TEMA_COMPLETADO -> +5 LP ---');
  const c = await grantOne('TEMA_COMPLETADO', `compv1-c-${suffix}`);
  check('LP_GRANTED, pointAmount = 5', c.outcome.outcome === 'LP_GRANTED' && c.outcome.entry.pointAmount === 5);

  const balance = await participationRepo.findById(participationId);
  check('balance leaguePoints de la participación = 1 + 2 + 5 = 8', balance?.leaguePoints === 8);

  console.log('--- §37 CASE B2: QUICK_QUESTION_ANSWERED FALLADA -> 0 LP, sin fila, hecho de dominio preservado (Incremento 10) ---');
  const incorrectAttemptId = await makeQuickQuestionAttempt(false);
  const bWrong = await grantOne('QUICK_QUESTION_ANSWERED', `compv1-bw-${suffix}`, { type: 'QuickQuestionAttempt', id: incorrectAttemptId });
  check('QQ incorrecta -> NOT_REWARDABLE', bWrong.outcome.outcome === 'NOT_REWARDABLE');
  const wrongLedgerRows = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = $1', [bWrong.activity.id]);
  check('QQ incorrecta -> 0 filas en league_point_ledger_entry (nunca un OTORGAMIENTO de monto 0)', wrongLedgerRows.rows[0].n === 0);
  const balanceAfterWrong = await participationRepo.findById(participationId);
  check('el balance de LP NO cambió por la QQ incorrecta (sigue en 8)', balanceAfterWrong?.leaguePoints === 8);
  const wrongActivityStillThere = await activityRepo.findById(bWrong.activity.id);
  check('§H: la validated_gamification_activity de la QQ incorrecta SIGUE existiendo (hecho de dominio preservado para XP / señales de desafío)', wrongActivityStillThere !== null);

  console.log('--- §37 CASE B3: QQ ACERTADA -- reintento idempotente, un solo +2 (nunca +4) ---');
  const bReplay = await grantService.grantForActivity(b.activity);
  check('reintento de la QQ acertada -> misma entrada', bReplay.outcome === 'LP_GRANTED' && b.outcome.outcome === 'LP_GRANTED' && bReplay.entry.id === b.outcome.entry.id);
  const bLedgerRows = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = $1', [b.activity.id]);
  check('sigue habiendo UNA sola fila de ledger para la QQ acertada (idempotencia intacta)', bLedgerRows.rows[0].n === 1);

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
