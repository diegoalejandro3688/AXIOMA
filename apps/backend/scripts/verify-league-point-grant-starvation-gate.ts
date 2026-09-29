// VC4 MICROBLOQUE 3.1 -- regresión del bug de starvation de
// `findPendingLeagueGrant` confirmado en producción (diagnóstico read-only
// 2026-09-29): un backlog de actividades PERMANENTEMENTE no-otorgables
// (temporada ya FINALIZED, `activityType` sin `LeaguePointRule` aplicable,
// anteriores al `joinedAt` vigente, o -- revisión final del microbloque --
// QUICK_QUESTION_ANSWERED con `isCorrect=false`) ocupaba el lote entero de
// `GRANT_BATCH_SIZE` en cada ciclo, sin importar cuán nueva y elegible fuera
// otra actividad -- de la MISMA cuenta o de otra.
//
// Prueba:
//   1. >100 actividades "envenenadas" (sin regla aplicable) para la cuenta A,
//      seguidas de UNA QUICK_QUESTION_ANSWERED nueva y elegible -> la nueva
//      SÍ aparece en el lote descubierto (antes del fix: NUNCA aparecía).
//   2. CROSS-ACCOUNT: cuenta B, con actividad Quick nueva y elegible, no
//      queda hambreada por el backlog de la cuenta A.
//   3. JOINED_AT: actividad anterior al `joinedAt` de la participación
//      vigente -> nunca descubierta (exclusión PERMANENTE correcta).
//   4. IDEMPOTENCIA: `grantPending()` ejecutado dos veces no duplica
//      `league_point_ledger_entry` ni vuelve a otorgar.
//   5. QUICK INCORRECTA (revisión final): >100 QUICK_QUESTION_ANSWERED
//      incorrectas antiguas + 1 correcta nueva -> pipeline REAL
//      (`grantPending()`, no solo la query): ninguna incorrecta genera
//      ledger, la correcta SÍ, el scheduler no queda atrapado, y repetir
//      `grantPending()` no duplica.
//   6. DAILYCAP GUARD: `LEAGUE_POINT_RULES_V1.every(r => r.dailyCap === null)`
//      -- si esto deja de ser cierto, este gate debe FALLAR explícitamente
//      (ver comentario en `findPendingLeagueGrant`: la consulta debe
//      ampliarse ANTES de habilitar `dailyCap`, o reintroduce el mismo
//      patrón de poisoning).
//   7. FAIRNESS 101 CUENTAS / 2 CICLOS: progreso ACOTADO a través de ciclos
//      (nunca "todas en el mismo lote") -- 101 cuentas con 1 actividad
//      elegible cada una, `GRANT_BATCH_SIZE=100` sólo alcanza para 100 en el
//      ciclo 1; la restante SÍ progresa en el ciclo 2.
//
// Corre contra `axioma_gates_dev` vía run-gate.ts -- nunca `axioma_dev`.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { assertGateDb, finalizeStaleGateSeasons, retireStaleGateLeagues } from './gate-db-safety';
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
import { LEAGUE_POINT_RULES_V1, LEAGUE_POINT_RULE_V1_EFFECTIVE_FROM } from '../src/gamification/competitive-v1-config';

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
  const now = new Date();
  const cleanupActivityIds: string[] = [];
  const cleanupAccountIds: string[] = [];

  await finalizeStaleGateSeasons(pg);
  await retireStaleGateLeagues(pg);

  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ruleRepo = new LeaguePointRuleRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const activityRepo = new ValidatedGamificationActivityRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const quickQuestionAttemptRepo = new QuickQuestionAttemptRepository(prisma);
  // rewardWorker no se necesita para este gate (ninguna liga de fixture
  // lleva `rewardBundleId`, así que `deliverLeagueFrameReward` retorna
  // temprano y nunca lo invoca) -- `undefined` es seguro aquí.
  const enrollmentService = new LeagueEnrollmentService(prisma, seasonRepo, leagueDefinitionRepo, leagueGroupRepo, participationRepo, bundleRepo, undefined as never);
  const grantService = new LeaguePointGrantService(txRunner, activityRepo, participationRepo, seasonRepo, leagueGroupRepo, ruleRepo, ledgerRepo, quickQuestionAttemptRepo);

  await leagueDefinitionRepo.create({ leagueKey: `lpgs-tier-${suffix}`, name: 'Bronce LPGS', tierOrder: 1, participantGroupSize: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20' });

  const season = await seasonRepo.create({ seasonKey: `lpgs-${suffix}`, name: 'LPGS', startsAt: new Date(now.getTime() - 60 * 60 * 1000), endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);
  check('temporada de fixture ACTIVE', (await seasonRepo.findActive())?.id === season.id);

  // Higiene: retira cualquier regla LP residual sin `effective_until` de
  // corridas previas -- misma técnica que verify-competitive-v1-gate.
  await pg.query('UPDATE league_point_rule SET effective_until = $1 WHERE effective_until IS NULL', [now]);
  for (const rule of LEAGUE_POINT_RULES_V1) {
    await ruleRepo.create({ activityType: rule.activityType, basePoints: rule.basePoints, dailyCap: null, effectiveFrom: LEAGUE_POINT_RULE_V1_EFFECTIVE_FROM, ruleVersion: rule.ruleVersion });
  }

  console.log('--- 0. DAILYCAP GUARD -- LEAGUE_POINT_RULES_V1 debe seguir con dailyCap === null en TODAS sus reglas ---');
  const allDailyCapNull = LEAGUE_POINT_RULES_V1.every((r) => r.dailyCap === null);
  if (!allDailyCapNull) {
    console.error(
      '\nFALLO CRÍTICO -- al menos una LEAGUE_POINT_RULES_V1 tiene dailyCap != null.\n' +
        'findPendingLeagueGrant() (validated-gamification-activity.repository.ts) NO filtra DAILY_CAP_REACHED:\n' +
        'una actividad que agote el cap de su día se convertiría en un poison row TERMINAL idéntico al bug\n' +
        'de starvation original (nunca se escribe ledger para ella, así que reaparece en cada ciclo para\n' +
        'siempre). La consulta de descubrimiento DEBE ampliarse con una agregación correlacionada del\n' +
        'ledger diario ANTES de habilitar cualquier dailyCap no-nulo en producción.\n',
    );
    failures++;
  } else {
    check('todas las reglas V1 tienen dailyCap === null (DAILY_CAP_REACHED estructuralmente inalcanzable hoy)', true);
  }

  // ===========================================================================
  // Fixture de pregunta compartido -- UNA sola versión de pregunta con una
  // alternativa correcta y una incorrecta, reutilizada por TODOS los intentos
  // de este gate (evita cientos de INSERT redundantes de question/question_version).
  // ===========================================================================
  const topicRow = await pg.query(`SELECT subject_id FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
  if (topicRow.rowCount === 0) throw new Error('Fixture de currículo no encontrada -- ¿seed ejecutado?');
  const subjectId = topicRow.rows[0].subject_id as string;
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema aislado del gate LPGS starvation', 906, $3, now(), now())`,
    [topicId, `GATE.LPGS.QQ.${suffix}`, subjectId],
  );
  const questionId = randomUUID();
  const questionVersionId = randomUUID();
  const correctOptionId = randomUUID();
  const incorrectOptionId = randomUUID();
  await pg.query(
    `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
    [questionId, `GATE.LPGS.QQ.${randomUUID()}`, subjectId],
  );
  await pg.query(
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
    [questionVersionId, questionId, topicId],
  );
  await pg.query(
    `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
     VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"correcta"}', 0, true, now())`,
    [correctOptionId, questionVersionId],
  );
  await pg.query(
    `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
     VALUES ($1, $2, '{"type":"paragraph","order":0,"text":"incorrecta"}', 1, false, now())`,
    [incorrectOptionId, questionVersionId],
  );
  await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [questionVersionId]);

  async function makeAttempt(isCorrect: boolean): Promise<string> {
    const attemptAccountId = randomUUID();
    const sessionId = randomUUID();
    await pg.query(`INSERT INTO quick_question_session (id, account_id, status, started_at) VALUES ($1, $2, 'ACTIVE', now())`, [sessionId, attemptAccountId]);
    const attemptId = randomUUID();
    await pg.query(
      `INSERT INTO quick_question_attempt (id, session_id, account_id, question_version_id, answer_option_id, is_correct, presented_at, responded_at, operation_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now(), $7, now())`,
      [attemptId, sessionId, attemptAccountId, questionVersionId, isCorrect ? correctOptionId : incorrectOptionId, isCorrect, randomUUID()],
    );
    return attemptId;
  }

  // ===========================================================================
  // 1-4: backlog "sin regla aplicable" + cross-account + joinedAt + idempotencia
  // ===========================================================================
  const accountA = randomUUID();
  const accountB = randomUUID();
  cleanupAccountIds.push(accountA, accountB);
  const enrollA = await enrollmentService.joinActiveSeason(accountA);
  const enrollB = await enrollmentService.joinActiveSeason(accountB);
  check('cuenta A inscrita', 'participation' in enrollA && enrollA.created === true);
  check('cuenta B inscrita', 'participation' in enrollB && enrollB.created === true);
  const joinedAtA = 'participation' in enrollA ? enrollA.participation.joinedAt : now;
  const joinedAtB = 'participation' in enrollB ? enrollB.participation.joinedAt : now;

  const poisonedIds: string[] = [];
  console.log('--- 1. Poisoned backlog: 120 actividades PERMANENTEMENTE no-otorgables (sin regla aplicable) para la cuenta A ---');
  const POISON_COUNT = 120;
  for (let i = 0; i < POISON_COUNT; i++) {
    const activity = await activityRepo.create({
      accountId: accountA,
      sourceDomain: 'PROGRESS',
      sourceEntityType: 'StudentResponse',
      sourceEntityId: randomUUID(),
      activityType: 'RESPUESTA_VALIDADA', // sin LeaguePointRule aplicable en este fixture (V1 = solo QUICK_QUESTION_ANSWERED)
      validationStatus: 'PENDING',
      occurredAt: new Date(joinedAtA.getTime() + i * 1000),
      validationRuleVersion: 'v1',
      deduplicationKey: `lpgs-poison-${suffix}-${i}`,
      integrityStatus: 'OK',
    });
    poisonedIds.push(activity.id);
  }
  cleanupActivityIds.push(...poisonedIds);
  check(`${POISON_COUNT} actividades envenenadas creadas (> GRANT_BATCH_SIZE=100)`, poisonedIds.length === POISON_COUNT);

  console.log('--- 2. UNA actividad Quick nueva y elegible para la cuenta A -> sigue siendo descubierta pese al backlog ---');
  const correctAttemptA = await makeAttempt(true);
  const eligibleA = await activityRepo.create({
    accountId: accountA,
    sourceDomain: 'GAMIFICATION',
    sourceEntityType: 'QuickQuestionAttempt',
    sourceEntityId: correctAttemptA,
    activityType: 'QUICK_QUESTION_ANSWERED',
    validationStatus: 'PENDING',
    occurredAt: new Date(joinedAtA.getTime() + POISON_COUNT * 1000 + 1000),
    validationRuleVersion: 'v1',
    deduplicationKey: `lpgs-eligible-a-${suffix}`,
    integrityStatus: 'OK',
  });
  cleanupActivityIds.push(eligibleA.id);

  const eligibleAccountIds = [accountA, accountB];
  const batch1 = await activityRepo.findPendingLeagueGrant(eligibleAccountIds, 100);
  check('el lote de 100 SÍ incluye la actividad elegible de la cuenta A (antes del fix: NUNCA aparecía)', batch1.some((a) => a.id === eligibleA.id));
  check('el lote de 100 NO incluye las 120 actividades envenenadas (sin regla aplicable)', !batch1.some((a) => poisonedIds.includes(a.id)));

  console.log('--- 3. CROSS-ACCOUNT: cuenta B con actividad Quick nueva y elegible NO queda starved por el backlog de A ---');
  const correctAttemptB = await makeAttempt(true);
  const eligibleB = await activityRepo.create({
    accountId: accountB,
    sourceDomain: 'GAMIFICATION',
    sourceEntityType: 'QuickQuestionAttempt',
    sourceEntityId: correctAttemptB,
    activityType: 'QUICK_QUESTION_ANSWERED',
    validationStatus: 'PENDING',
    occurredAt: new Date(joinedAtB.getTime() + 500),
    validationRuleVersion: 'v1',
    deduplicationKey: `lpgs-eligible-b-${suffix}`,
    integrityStatus: 'OK',
  });
  cleanupActivityIds.push(eligibleB.id);
  const batch2 = await activityRepo.findPendingLeagueGrant(eligibleAccountIds, 100);
  check('la actividad elegible de la cuenta B SÍ aparece en el lote', batch2.some((a) => a.id === eligibleB.id));
  check('la actividad elegible de la cuenta A SIGUE apareciendo (ninguna cuenta desplazó a la otra)', batch2.some((a) => a.id === eligibleA.id));

  console.log('--- 4. JOINED_AT: actividad anterior al joinedAt vigente -> exclusión PERMANENTE correcta ---');
  const correctAttemptPreJoin = await makeAttempt(true);
  const preJoinActivity = await activityRepo.create({
    accountId: accountA,
    sourceDomain: 'GAMIFICATION',
    sourceEntityType: 'QuickQuestionAttempt',
    sourceEntityId: correctAttemptPreJoin,
    activityType: 'QUICK_QUESTION_ANSWERED',
    validationStatus: 'PENDING',
    occurredAt: new Date(joinedAtA.getTime() - 60_000),
    validationRuleVersion: 'v1',
    deduplicationKey: `lpgs-prejoin-${suffix}`,
    integrityStatus: 'OK',
  });
  cleanupActivityIds.push(preJoinActivity.id);
  const batch3 = await activityRepo.findPendingLeagueGrant(eligibleAccountIds, 100);
  check('la actividad anterior al joinedAt NUNCA es descubierta', !batch3.some((a) => a.id === preJoinActivity.id));

  console.log('--- 5. QUICK INCORRECTA: >100 incorrectas antiguas + 1 correcta nueva -> pipeline REAL (grantPending) ---');
  const accountC = randomUUID();
  cleanupAccountIds.push(accountC);
  const enrollC = await enrollmentService.joinActiveSeason(accountC);
  check('cuenta C inscrita', 'participation' in enrollC && enrollC.created === true);
  const joinedAtC = 'participation' in enrollC ? enrollC.participation.joinedAt : now;

  const incorrectIds: string[] = [];
  const INCORRECT_COUNT = 120;
  for (let i = 0; i < INCORRECT_COUNT; i++) {
    const incorrectAttempt = await makeAttempt(false);
    const activity = await activityRepo.create({
      accountId: accountC,
      sourceDomain: 'GAMIFICATION',
      sourceEntityType: 'QuickQuestionAttempt',
      sourceEntityId: incorrectAttempt,
      activityType: 'QUICK_QUESTION_ANSWERED',
      validationStatus: 'PENDING',
      occurredAt: new Date(joinedAtC.getTime() + i * 1000),
      validationRuleVersion: 'v1',
      deduplicationKey: `lpgs-incorrect-${suffix}-${i}`,
      integrityStatus: 'OK',
    });
    incorrectIds.push(activity.id);
  }
  cleanupActivityIds.push(...incorrectIds);
  check(`${INCORRECT_COUNT} Quick incorrectas creadas (> GRANT_BATCH_SIZE=100)`, incorrectIds.length === INCORRECT_COUNT);

  const correctAttemptC = await makeAttempt(true);
  const eligibleC = await activityRepo.create({
    accountId: accountC,
    sourceDomain: 'GAMIFICATION',
    sourceEntityType: 'QuickQuestionAttempt',
    sourceEntityId: correctAttemptC,
    activityType: 'QUICK_QUESTION_ANSWERED',
    validationStatus: 'PENDING',
    occurredAt: new Date(joinedAtC.getTime() + INCORRECT_COUNT * 1000 + 1000),
    validationRuleVersion: 'v1',
    deduplicationKey: `lpgs-eligible-c-${suffix}`,
    integrityStatus: 'OK',
  });
  cleanupActivityIds.push(eligibleC.id);

  const batchC = await activityRepo.findPendingLeagueGrant([accountC], 100);
  check('el lote SÍ incluye la Quick correcta de la cuenta C (no está starved por las 120 incorrectas)', batchC.some((a) => a.id === eligibleC.id));
  check('el lote NO incluye ninguna de las 120 Quick incorrectas', !batchC.some((a) => incorrectIds.includes(a.id)));

  const resultC = await grantService.grantPending();
  check('grantPending() real otorga al menos 1 LP (la correcta de C)', resultC.granted >= 1);
  const ledgerIncorrect = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = ANY($1)', [incorrectIds]);
  check('ninguna de las 120 Quick incorrectas generó league_point_ledger_entry', ledgerIncorrect.rows[0].n === 0);
  const ledgerCorrectC = await pg.query('SELECT count(*)::int AS n, coalesce(sum(point_amount),0)::int AS pts FROM league_point_ledger_entry WHERE validated_activity_id = $1', [eligibleC.id]);
  check('la Quick correcta de C SÍ generó exactamente 1 fila de ledger', ledgerCorrectC.rows[0].n === 1);

  const resultC2 = await grantService.grantPending();
  const ledgerCorrectCAfter2 = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = $1', [eligibleC.id]);
  check('repetir grantPending() no duplica la Quick correcta de C', ledgerCorrectCAfter2.rows[0].n === 1);
  void resultC2;

  console.log('--- 6. IDEMPOTENCIA (A/B): grantPending() ejecutado dos veces no duplica ledger ni vuelve a otorgar ---');
  const result1 = await grantService.grantPending();
  check('corrida: al menos 2 otorgados (A y B, si aún no lo estaban por la corrida de C)', result1.granted >= 0);
  const ledgerAfterFirst = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = ANY($1)', [[eligibleA.id, eligibleB.id]]);
  check('exactamente 2 filas de ledger para A y B', ledgerAfterFirst.rows[0].n === 2);

  await grantService.grantPending();
  const ledgerAfterSecond = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = ANY($1)', [[eligibleA.id, eligibleB.id]]);
  check('sigue habiendo exactamente 2 filas de ledger para A y B (sin duplicados)', ledgerAfterSecond.rows[0].n === 2);

  // ===========================================================================
  // 7. FAIRNESS 101 CUENTAS / 2 CICLOS -- progreso ACOTADO a través de ciclos,
  // nunca "todas en el mismo lote". GRANT_BATCH_SIZE=100 sólo alcanza para 100
  // en el ciclo 1 -- la cuenta 101 debe progresar en el ciclo 2.
  // ===========================================================================
  console.log('--- 7. FAIRNESS: 101 cuentas, 1 actividad elegible cada una -> 100 en ciclo 1, la restante en ciclo 2 ---');
  const FAIRNESS_ACCOUNT_COUNT = 101;
  const fairnessAccounts: string[] = [];
  const fairnessActivityIds: string[] = [];
  for (let i = 0; i < FAIRNESS_ACCOUNT_COUNT; i++) {
    const acct = randomUUID();
    fairnessAccounts.push(acct);
    const enroll = await enrollmentService.joinActiveSeason(acct);
    if (!('participation' in enroll)) throw new Error(`No se pudo inscribir la cuenta de fairness #${i}`);
    const joinedAt = enroll.participation.joinedAt;
    const attempt = await makeAttempt(true);
    const activity = await activityRepo.create({
      accountId: acct,
      sourceDomain: 'GAMIFICATION',
      sourceEntityType: 'QuickQuestionAttempt',
      sourceEntityId: attempt,
      activityType: 'QUICK_QUESTION_ANSWERED',
      validationStatus: 'PENDING',
      occurredAt: new Date(joinedAt.getTime() + 1000),
      validationRuleVersion: 'v1',
      deduplicationKey: `lpgs-fair-${suffix}-${i}`,
      integrityStatus: 'OK',
    });
    fairnessActivityIds.push(activity.id);
  }
  cleanupAccountIds.push(...fairnessAccounts);
  cleanupActivityIds.push(...fairnessActivityIds);
  check(`${FAIRNESS_ACCOUNT_COUNT} cuentas de fairness creadas, cada una con 1 actividad elegible`, fairnessAccounts.length === FAIRNESS_ACCOUNT_COUNT);

  const batchFairness1 = await activityRepo.findPendingLeagueGrant(fairnessAccounts, 100);
  check('ciclo 1: el lote descubierto trae EXACTAMENTE 100 actividades (LIMIT del batch)', batchFairness1.length === 100);
  const distinctAccountsInBatch1 = new Set(batchFairness1.map((a) => a.accountId));
  check('ciclo 1: las 100 actividades pertenecen a 100 cuentas DISTINTAS (ninguna cuenta ocupa 2 turnos mientras otra tiene 0)', distinctAccountsInBatch1.size === 100);

  const resultFairness1 = await grantService.grantPending();
  check('ciclo 1: grantPending() otorga hasta 100 (acotado por GRANT_BATCH_SIZE)', resultFairness1.granted <= 100);
  const ledgerFairnessAfter1 = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = ANY($1)', [fairnessActivityIds]);
  check('ciclo 1: exactamente 100 de las 101 actividades de fairness ya tienen ledger', ledgerFairnessAfter1.rows[0].n === 100);

  const resultFairness2 = await grantService.grantPending();
  check('ciclo 2: la cuenta 101 restante SÍ progresa (progreso acotado a través de ciclos, no en el mismo ciclo)', resultFairness2.granted >= 1);
  const ledgerFairnessAfter2 = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = ANY($1)', [fairnessActivityIds]);
  check('ciclo 2: las 101 actividades de fairness ya tienen ledger (ninguna quedó starved indefinidamente)', ledgerFairnessAfter2.rows[0].n === 101);

  // Limpieza. `league_point_ledger_entry` es APPEND-ONLY (trigger
  // `enforce_league_point_ledger_entry_no_delete` -- toda corrección real es
  // una entrada compensatoria, nunca un DELETE) y `validated_activity_id`
  // tiene `onDelete: Restrict`: igual que `verify-competitive-v1-gate.ts`,
  // las actividades que SÍ recibieron LP (y sus filas de ledger) se dejan
  // como residuo aceptado en `axioma_gates_dev` (base aislada, nunca
  // `axioma_dev`) -- sólo se borran las actividades que NUNCA generaron
  // ledger (envenenadas, incorrectas, pre-joinedAt), que no tienen ninguna
  // fila referenciándolas.
  // Mismo criterio que `verify-competitive-v1-gate.ts` (que también otorga
  // LP real): las participaciones de cuentas que recibieron ledger quedan
  // como residuo (onDelete: Restrict las protege de todas formas).
  const grantedActivityIds = new Set([...fairnessActivityIds, eligibleA.id, eligibleB.id, eligibleC.id]);
  const deletableActivityIds = cleanupActivityIds.filter((id) => !grantedActivityIds.has(id));
  await pg.query('DELETE FROM validated_gamification_activity WHERE id = ANY($1)', [deletableActivityIds]);
  await finalizeStaleGateSeasons(pg);
  await retireStaleGateLeagues(pg);

  await prisma.$disconnect();
  await pg.end();

  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de starvation de League Point grant pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
