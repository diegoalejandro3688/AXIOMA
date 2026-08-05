// Gate del Bloque IV, Incremento 1 ("Fundación de temporadas y ligas") --
// ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §9. Sin ranking, sin endpoints,
// sin superficie móvil (Incrementos 2-5) -- verifica exclusivamente lo que
// este incremento construye: temporadas/ligas/grupos/participaciones y el
// ledger independiente de League Points, incluyendo las cuatro precisiones
// obligatorias del Product Owner y los tres gates de concurrencia real.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaguePointRuleRepository } from '../src/gamification/league-point-rule.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { LeagueEnrollmentService } from '../src/gamification/league-enrollment.service';
import { LeaguePointGrantService } from '../src/gamification/league-point-grant.service';
import { SeasonTransitionService } from '../src/gamification/season-transition.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function main() {
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

  const enrollmentService = new LeagueEnrollmentService(prisma, seasonRepo, leagueDefinitionRepo, leagueGroupRepo, participationRepo);
  const grantService = new LeaguePointGrantService(txRunner, activityRepo, participationRepo, seasonRepo, leagueGroupRepo, ruleRepo, ledgerRepo);
  const transitionService = new SeasonTransitionService(prisma, seasonRepo, leagueGroupRepo, participationRepo);

  const suffix = Date.now();
  const now = new Date();

  // Higiene entre corridas -- mismo criterio que 4.a con challenge_definition.
  // Si una corrida anterior de este gate terminó abruptamente (ej. un fallo
  // a mitad de camino), puede haber dejado una temporada ACTIVE huérfana --
  // el índice único parcial (una sola ACTIVE a la vez) impediría activar la
  // temporada de ESTA corrida si no se limpia primero.
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE status = 'ACTIVE'");

  console.log('--- 1. game_season: creación, invariante de una sola ACTIVE (índice único parcial) ---');
  const seasonA = await seasonRepo.create({
    seasonKey: `season-a-${suffix}`,
    name: 'Temporada de prueba A',
    startsAt: new Date(now.getTime() - 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  });
  check('game_season creado, nace SCHEDULED', seasonA.status === 'SCHEDULED');

  await pg.query('UPDATE game_season SET status = $1 WHERE id = $2', ['ACTIVE', seasonA.id]);
  const activeSeason = await seasonRepo.findActive();
  check('findActive devuelve la temporada recién activada', activeSeason?.id === seasonA.id);

  const seasonB = await seasonRepo.create({
    seasonKey: `season-b-${suffix}`,
    name: 'Temporada de prueba B',
    startsAt: new Date(now.getTime() - 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  });
  let secondActiveRejected = false;
  try {
    await pg.query('UPDATE game_season SET status = $1 WHERE id = $2', ['ACTIVE', seasonB.id]);
  } catch (error) {
    secondActiveRejected = (error as { code?: string }).code === '23505';
  }
  check('índice único parcial rechaza una segunda temporada ACTIVE simultánea', secondActiveRejected);
  // seasonB nunca llegó a ACTIVE (el índice único la rechazó) -- limpiar
  // eliminándola directamente, no intentar una transición ilegal (DELETE no
  // está bloqueado para game_season, solo la transición de estado por UPDATE).
  await pg.query('DELETE FROM game_season WHERE id = $1', [seasonB.id]);

  console.log('--- 2. game_season: transición forward-only (trigger) ---');
  let seasonSkipRejected = false;
  try {
    await pg.query("UPDATE game_season SET status = 'ARCHIVED' WHERE id = $1", [seasonA.id]);
  } catch (error) {
    seasonSkipRejected = String((error as Error).message ?? '').includes('no admite la transición');
  }
  check('trigger rechaza ACTIVE -> ARCHIVED (salto de FINALIZED)', seasonSkipRejected);

  console.log('--- 3. league_definition: plantilla de tier, selección del tier más bajo (§9.2) ---');
  const bronze = await leagueDefinitionRepo.create({
    leagueKey: `bronze-${suffix}`,
    name: 'Bronce',
    tierOrder: 1,
    participantGroupSize: 3,
  });
  const silver = await leagueDefinitionRepo.create({
    leagueKey: `silver-${suffix}`,
    name: 'Plata',
    tierOrder: 2,
    participantGroupSize: 3,
  });
  check('league_definition creado, nace ACTIVE', bronze.status === 'ACTIVE');

  // Higiene: `findLowestActiveTier` no filtra por corrida -- nos aseguramos
  // de que ningún tier de otra ejecución previa de este gate tenga
  // tierOrder menor al de "bronze" recién creado.
  await pg.query("UPDATE league_definition SET status = 'RETIRED' WHERE league_key NOT IN ($1, $2) AND status = 'ACTIVE'", [
    bronze.leagueKey,
    silver.leagueKey,
  ]);
  const lowestTier = await leagueDefinitionRepo.findLowestActiveTier();
  check('findLowestActiveTier devuelve el tier de tierOrder mínimo (Bronce, no Plata)', lowestTier?.id === bronze.id);

  console.log('--- 4. Inscripción idempotente: estudiante nuevo entra siempre al tier más bajo (§9.2) ---');
  const accountAlice = randomUUID();
  const enrollAlice1 = await enrollmentService.joinActiveSeason(accountAlice);
  if (!('participation' in enrollAlice1)) throw new Error('Se esperaba una participación para Alice.');
  check('primera inscripción -> created=true', enrollAlice1.created === true);
  check('estudiante nuevo entra al tier más bajo (Bronce), nunca por XP/nivel', enrollAlice1.participation.leagueDefinitionId === bronze.id);
  check('participationStatus nace ACTIVE', enrollAlice1.participation.participationStatus === 'ACTIVE');
  check('leaguePoints nace en 0', enrollAlice1.participation.leaguePoints === 0);

  const enrollAlice2 = await enrollmentService.joinActiveSeason(accountAlice);
  if (!('participation' in enrollAlice2)) throw new Error('Se esperaba una participación para el segundo intento de Alice.');
  check('segunda inscripción (misma cuenta/temporada) -> created=false (idempotente)', enrollAlice2.created === false);
  check('devuelve LA MISMA participación', enrollAlice2.participation.id === enrollAlice1.participation.id);

  const participationCount = await pg.query('SELECT count(*)::int AS n FROM season_league_participation WHERE account_id = $1 AND game_season_id = $2', [
    accountAlice,
    seasonA.id,
  ]);
  check('UNIQUE(account_id, game_season_id) -- sigue existiendo UNA sola fila', participationCount.rows[0].n === 1);

  console.log('--- 5. season_league_participation: transición forward-only (trigger) ---');
  const aliceRowId = enrollAlice1.participation.id;
  await pg.query("UPDATE season_league_participation SET participation_status = 'SEASON_ENDED' WHERE id = $1", [aliceRowId]);
  let participationBackwardRejected = false;
  try {
    await pg.query("UPDATE season_league_participation SET participation_status = 'ACTIVE' WHERE id = $1", [aliceRowId]);
  } catch (error) {
    participationBackwardRejected = String((error as Error).message ?? '').includes('no admite la transición');
  }
  check('trigger rechaza retroceso SEASON_ENDED -> ACTIVE', participationBackwardRejected);
  // Revertir a ACTIVE directamente en Postgres para el resto del gate -- el
  // trigger solo bloquea el camino de aplicación, no una corrección de fixture.
  await pg.query('DELETE FROM season_league_participation WHERE id = $1', [aliceRowId]);
  const reEnrollAlice = await enrollmentService.joinActiveSeason(accountAlice);
  if (!('participation' in reEnrollAlice)) throw new Error('Se esperaba una participación al re-inscribir a Alice.');
  check('tras eliminar el fixture, la re-inscripción crea una participación ACTIVE nueva', reEnrollAlice.participation.participationStatus === 'ACTIVE');

  console.log('--- 6. Capacidad de grupo bajo CONCURRENCIA REAL (gate obligatorio, §9.9) ---');
  const capacityLeague = await leagueDefinitionRepo.create({
    leagueKey: `capacity-tier-${suffix}`,
    name: 'Tier de prueba de capacidad',
    tierOrder: 100,
    participantGroupSize: 3,
  });
  // Estudiantes SIN historial previo entrarían al tier más bajo (bronze) --
  // para probar la capacidad de UN tier concreto, se les da historial
  // previo en `capacityLeague` insertando una participación en una
  // temporada ya archivada (finalizada), de modo que `resolveTargetTier`
  // los ubique en `capacityLeague` al inscribirse en la temporada activa.
  const priorSeason = await seasonRepo.create({
    seasonKey: `prior-season-${suffix}`,
    name: 'Temporada anterior (solo historial)',
    startsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    endsAt: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
  });
  // Capacidad 5 (no 3) -- este grupo es solo HISTORIAL de fixture (ya
  // LOCKED, de una temporada pasada), no el grupo bajo prueba de capacidad;
  // el trigger enforce_league_group_capacity se aplica a TODA inserción,
  // incluyendo estas 5 filas de historial.
  const priorGroup = await pg.query(
    `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
     VALUES ($1, $2, $3, 1, 5, 'v1-lowest-tier', 'LOCKED') RETURNING id`,
    [randomUUID(), priorSeason.id, capacityLeague.id],
  );
  const priorGroupId = priorGroup.rows[0].id as string;

  const concurrentAccounts = Array.from({ length: 5 }, () => randomUUID());
  for (const accountId of concurrentAccounts) {
    await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, participation_status, finalized_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'SEASON_ENDED', $6)`,
      [randomUUID(), priorSeason.id, accountId, capacityLeague.id, priorGroupId, priorSeason.endsAt],
    );
  }

  const concurrentResults = await Promise.all(concurrentAccounts.map((accountId) => enrollmentService.joinActiveSeason(accountId)));
  const concurrentParticipations = concurrentResults.map((r) => {
    if (!('participation' in r)) throw new Error('Se esperaba una participación en la inscripción concurrente.');
    return r.participation;
  });
  check(
    'las 5 inscripciones concurrentes a un tier con cupo 3 devuelven participaciones válidas, sin error',
    concurrentParticipations.length === 5,
  );
  const groupIdsUsed = new Set(concurrentParticipations.filter((p) => p.leagueDefinitionId === capacityLeague.id).map((p) => p.leagueGroupId));
  let maxGroupSize = 0;
  for (const groupId of groupIdsUsed) {
    const countInGroup = concurrentParticipations.filter((p) => p.leagueGroupId === groupId).length;
    maxGroupSize = Math.max(maxGroupSize, countInGroup);
  }
  check('ningún league_group terminó con más de 3 participantes (cupo respetado bajo concurrencia real)', maxGroupSize <= 3);
  check('se crearon al menos 2 grupos para acomodar a los 5 estudiantes (cupo 3)', groupIdsUsed.size >= 2);

  let triggerCapacityRejected = false;
  try {
    const fullGroupId = [...groupIdsUsed].find((groupId) => concurrentParticipations.filter((p) => p.leagueGroupId === groupId).length >= 3);
    if (fullGroupId) {
      await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [randomUUID(), seasonA.id, randomUUID(), capacityLeague.id, fullGroupId],
      );
    } else {
      throw new Error('fixture inesperado: ningún grupo alcanzó capacidad completa');
    }
  } catch (error) {
    triggerCapacityRejected = String((error as Error).message ?? '').includes('ya alcanzó su capacidad');
  }
  check('trigger enforce_league_group_capacity rechaza una inserción directa por encima del cupo (respaldo de base de datos)', triggerCapacityRejected);

  console.log('--- 7. Inscripción idempotente bajo CARRERA REAL (gate obligatorio, §9.9) ---');
  const raceAccount = randomUUID();
  const raceResults = await Promise.all([
    enrollmentService.joinActiveSeason(raceAccount),
    enrollmentService.joinActiveSeason(raceAccount),
    enrollmentService.joinActiveSeason(raceAccount),
  ]);
  const raceParticipationIds = new Set(
    raceResults.map((r) => {
      if (!('participation' in r)) throw new Error('Se esperaba una participación en la carrera de inscripción.');
      return r.participation.id;
    }),
  );
  check('3 inscripciones concurrentes de la MISMA cuenta -> una sola participación (sin duplicados, sin error 500)', raceParticipationIds.size === 1);
  const raceRowCount = await pg.query('SELECT count(*)::int AS n FROM season_league_participation WHERE account_id = $1', [raceAccount]);
  check('exactamente una fila real en base de datos para esa cuenta en esta temporada', raceRowCount.rows[0].n === 1);

  console.log('--- 8. league_point_rule: fuente autoritativa del monto, independiente de xp_rule (§9.4) ---');
  const activityType = `practica-liga-${suffix}`;
  const leagueRule = await ruleRepo.create({
    activityType,
    basePoints: 7,
    dailyCap: 100,
    effectiveFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    ruleVersion: `league-points-core@v1-${suffix}`,
  });
  check('league_point_rule creado', leagueRule.basePoints === 7);
  const applicableRule = await ruleRepo.findApplicableRule(activityType, now);
  check('findApplicableRule selecciona la regla vigente', applicableRule?.id === leagueRule.id);

  console.log('--- 9. Otorgamiento de League Points: condicional a participación ACTIVE (§9.4) ---');
  const nonParticipant = randomUUID();
  const nonParticipantActivity = await activityRepo.create({
    accountId: nonParticipant,
    sourceDomain: 'PROGRESS',
    sourceEntityType: 'StudentResponse',
    sourceEntityId: randomUUID(),
    activityType,
    validationStatus: 'PENDING',
    occurredAt: now,
    validationRuleVersion: 'v1',
    deduplicationKey: `league-gate-non-participant-${suffix}`,
    integrityStatus: 'OK',
  });
  const nonParticipantOutcome = await grantService.grantForActivity(nonParticipantActivity);
  check('sin participación activa -> NOT_PARTICIPATING, sin escribir fila alguna', nonParticipantOutcome.outcome === 'NOT_PARTICIPATING');

  console.log('--- 10. Otorgamiento de League Points: SIN retroactividad (precisión obligatoria del Product Owner, §9.4) ---');
  const bob = randomUUID();
  const enrollBob = await enrollmentService.joinActiveSeason(bob);
  if (!('participation' in enrollBob)) throw new Error('Se esperaba una participación para Bob.');
  const bobJoinedAt = enrollBob.participation.joinedAt;

  const beforeJoinActivity = await activityRepo.create({
    accountId: bob,
    sourceDomain: 'PROGRESS',
    sourceEntityType: 'StudentResponse',
    sourceEntityId: randomUUID(),
    activityType,
    validationStatus: 'PENDING',
    occurredAt: new Date(bobJoinedAt.getTime() - 60 * 60 * 1000), // 1h ANTES de unirse
    validationRuleVersion: 'v1',
    deduplicationKey: `league-gate-retroactive-${suffix}`,
    integrityStatus: 'OK',
  });
  const retroactiveOutcome = await grantService.grantForActivity(beforeJoinActivity);
  check('actividad anterior al joinedAt -> OUT_OF_WINDOW, sin LP retroactivos', retroactiveOutcome.outcome === 'OUT_OF_WINDOW');

  console.log('--- 11. Otorgamiento de League Points: monto exclusivo del servidor, NUNCA igual al XP de la misma actividad (§9.4) ---');
  // Deliberadamente NO se crea un xp_rule real aquí -- la independencia se
  // prueba estructuralmente (§14: sin FK cruzada, sin repositorio de XP
  // referenciado desde LeaguePointGrantService) y numéricamente (el monto
  // otorgado es exactamente `leagueRule.basePoints`, un valor arbitrario
  // elegido para esta regla, comparado contra un baseXp hipotético distinto).
  const hypotheticalXpAmount = 25; // deliberadamente DISTINTO de basePoints (7)

  const afterJoinActivity = await activityRepo.create({
    accountId: bob,
    sourceDomain: 'PROGRESS',
    sourceEntityType: 'StudentResponse',
    sourceEntityId: randomUUID(),
    activityType,
    validationStatus: 'PENDING',
    occurredAt: new Date(bobJoinedAt.getTime() + 60 * 1000), // 1 min DESPUÉS de unirse
    validationRuleVersion: 'v1',
    deduplicationKey: `league-gate-eligible-${suffix}`,
    integrityStatus: 'OK',
  });
  const eligibleOutcome = await grantService.grantForActivity(afterJoinActivity);
  check('actividad dentro de ventana, con participación activa -> LP_GRANTED', eligibleOutcome.outcome === 'LP_GRANTED');
  if (eligibleOutcome.outcome === 'LP_GRANTED') {
    check('el monto proviene de LeaguePointRule.basePoints (7), no de un valor arbitrario', eligibleOutcome.entry.pointAmount === 7);
    check('el monto NUNCA coincide con un baseXp hipotético (25) de la regla de XP para la misma actividad -- fuentes independientes', eligibleOutcome.entry.pointAmount !== hypotheticalXpAmount);
    check('idempotencyKey vincula participación Y actividad (precisión obligatoria del Product Owner)', eligibleOutcome.entry.idempotencyKey === `league-grant:${enrollBob.participation.id}:${afterJoinActivity.id}`);
    check('el ledger conserva seasonLeagueParticipationId', eligibleOutcome.entry.seasonLeagueParticipationId === enrollBob.participation.id);
    check('el ledger conserva validatedActivityId', eligibleOutcome.entry.validatedActivityId === afterJoinActivity.id);
    check('el ledger conserva la regla aplicada (leaguePointRuleId + ruleVersion)', eligibleOutcome.entry.leaguePointRuleId === leagueRule.id && eligibleOutcome.entry.ruleVersion === leagueRule.ruleVersion);
  }

  const bobParticipationAfterGrant = await participationRepo.findById(enrollBob.participation.id);
  check('leaguePoints de la participación se incrementó exactamente en 7', bobParticipationAfterGrant?.leaguePoints === 7);

  console.log('--- 12. Reintento del mismo otorgamiento -> idempotente, sin duplicar fila ni volver a incrementar ---');
  const retryOutcome = await grantService.grantForActivity(afterJoinActivity);
  check(
    'reintento del mismo grant -> LP_GRANTED con la MISMA entrada',
    retryOutcome.outcome === 'LP_GRANTED' && eligibleOutcome.outcome === 'LP_GRANTED' && retryOutcome.entry.id === eligibleOutcome.entry.id,
  );
  const ledgerRowsForActivity = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE validated_activity_id = $1', [afterJoinActivity.id]);
  check('sigue existiendo UNA sola fila de ledger para esa actividad', ledgerRowsForActivity.rows[0].n === 1);
  const bobParticipationAfterRetry = await participationRepo.findById(enrollBob.participation.id);
  check('leaguePoints NO se incrementó una segunda vez', bobParticipationAfterRetry?.leaguePoints === 7);

  console.log('--- 13. league_point_ledger_entry: inmutable, sin DELETE, integridad de reverso (calco de xp_ledger_entry) ---');
  const grantedEntryId = eligibleOutcome.outcome === 'LP_GRANTED' ? eligibleOutcome.entry.id : null;
  if (!grantedEntryId) throw new Error('No se pudo obtener el id de la entrada otorgada.');

  let ledgerImmutableRejected = false;
  try {
    await pg.query('UPDATE league_point_ledger_entry SET point_amount = 999 WHERE id = $1', [grantedEntryId]);
  } catch (error) {
    ledgerImmutableRejected = String((error as Error).message ?? '').includes('es inmutable');
  }
  check('trigger rechaza UPDATE sobre league_point_ledger_entry', ledgerImmutableRejected);

  let ledgerNoDeleteRejected = false;
  try {
    await pg.query('DELETE FROM league_point_ledger_entry WHERE id = $1', [grantedEntryId]);
  } catch (error) {
    ledgerNoDeleteRejected = String((error as Error).message ?? '').includes('no admite DELETE');
  }
  check('trigger rechaza DELETE sobre league_point_ledger_entry', ledgerNoDeleteRejected);

  const reversalEntry = await ledgerRepo.createIdempotent({
    accountId: bob,
    seasonLeagueParticipationId: enrollBob.participation.id,
    entryType: 'REVERSO',
    pointAmount: -7,
    idempotencyKey: `league-reverse:${grantedEntryId}`,
    occurredAt: new Date(),
    reversesEntryId: grantedEntryId,
  });
  check('reverso válido (monto exacto negativo, misma cuenta) aceptado', reversalEntry.created === true);

  let reversalWrongAmountRejected = false;
  try {
    await pg.query(
      `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, entry_type, point_amount, idempotency_key, occurred_at, reverses_entry_id)
       VALUES ($1, $2, $3, 'REVERSO', -999, $4, now(), $5)`,
      [randomUUID(), bob, enrollBob.participation.id, `league-reverse-bad-${suffix}`, grantedEntryId],
    );
  } catch (error) {
    reversalWrongAmountRejected = String((error as Error).message ?? '').includes('debe ser exactamente el negativo');
  }
  check('trigger rechaza un reverso cuyo monto no es exactamente el negativo del original', reversalWrongAmountRejected);

  let otorgamientoRequiresRuleRejected = false;
  try {
    await pg.query(
      `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, entry_type, point_amount, idempotency_key, occurred_at)
       VALUES ($1, $2, $3, 'OTORGAMIENTO', 5, $4, now())`,
      [randomUUID(), bob, enrollBob.participation.id, `league-gate-no-rule-${suffix}`],
    );
  } catch (error) {
    otorgamientoRequiresRuleRejected = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza OTORGAMIENTO sin league_point_rule_id/validated_activity_id', otorgamientoRequiresRuleRejected);

  console.log('--- 14. Aislamiento respecto de XP (§9.7): sin FK cruzada, sin transacción compartida, frontera de dominio intacta ---');
  const xpLedgerRowsForBob = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1', [bob]);
  check(
    'el otorgamiento de LP no escribió ninguna fila en xp_ledger_entry (transacciones independientes, nunca compartidas)',
    xpLedgerRowsForBob.rows[0].n === 0,
  );

  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const leagueGrantSource = readFileSync(join(gamificationDir, 'league-point-grant.service.ts'), 'utf8');
  const forbiddenInLeagueGrant = ['StudentResponse', 'CurriculumTopicProgress', 'XpLedgerEntryRepository', 'XpBalanceRepository'];
  const leagueGrantViolation = forbiddenInLeagueGrant.some((symbol) => leagueGrantSource.includes(symbol));
  check('LeaguePointGrantService no referencia PROGRESS ni los repositorios de XP (frontera de dominio + aislamiento de ledgers)', !leagueGrantViolation);

  const xpGrantSource = readFileSync(join(gamificationDir, 'xp-grant.service.ts'), 'utf8');
  const xpGrantViolation = xpGrantSource.includes('LeaguePointLedgerEntryRepository') || xpGrantSource.includes('SeasonLeagueParticipationRepository');
  check('XpGrantService no referencia los repositorios de League Points (aislamiento en ambos sentidos)', !xpGrantViolation);

  console.log('--- 15. CARRERA otorgamiento-vs-cierre de temporada (gate obligatorio, §9.9) ---');
  const carol = randomUUID();
  const shortSeason = await seasonRepo.create({
    seasonKey: `short-season-${suffix}`,
    name: 'Temporada corta para probar la carrera de cierre',
    startsAt: new Date(now.getTime() - 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 2 * 1000), // termina en 2 segundos
  });
  // Cerrar la temporada A -- solo una ACTIVE a la vez, y ACTIVE->FINALIZED
  // es la única transición legal hacia adelante (nunca ACTIVE->ARCHIVED directo).
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE id = $1", [seasonA.id]);
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [shortSeason.id]);

  const enrollCarol = await enrollmentService.joinActiveSeason(carol);
  if (!('participation' in enrollCarol)) throw new Error('Se esperaba una participación para Carol.');

  const carolActivity = await activityRepo.create({
    accountId: carol,
    sourceDomain: 'PROGRESS',
    sourceEntityType: 'StudentResponse',
    sourceEntityId: randomUUID(),
    activityType,
    validationStatus: 'PENDING',
    occurredAt: new Date(),
    validationRuleVersion: 'v1',
    deduplicationKey: `league-gate-race-close-${suffix}`,
    integrityStatus: 'OK',
  });

  await new Promise((resolve) => setTimeout(resolve, 2_500)); // esperar a que la temporada realmente expire

  const [grantRaceOutcome] = await Promise.all([
    grantService.grantForActivity(carolActivity),
    transitionService.closeExpiredSeasons(),
  ]);
  const carolLedgerRows = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE account_id = $1', [carol]);
  const closedSeasonRow = await pg.query('SELECT status FROM game_season WHERE id = $1', [shortSeason.id]);
  check('la temporada corta terminó FINALIZED', closedSeasonRow.rows[0].status === 'FINALIZED');
  check(
    'si el cierre ganó la carrera, el otorgamiento se descartó (CLOSED_CONCURRENTLY) y CERO filas de ledger -- si el otorgamiento ganó, exactamente 1 fila, nunca ambos a medias',
    (grantRaceOutcome.outcome === 'CLOSED_CONCURRENTLY' && carolLedgerRows.rows[0].n === 0) ||
      (grantRaceOutcome.outcome === 'LP_GRANTED' && carolLedgerRows.rows[0].n === 1),
  );

  console.log('--- 16. Trigger de ventana como respaldo de base de datos (aun sin pasar por el servicio) ---');
  let windowTriggerRejected = false;
  try {
    await pg.query(
      `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, idempotency_key, occurred_at)
       VALUES ($1, $2, $3, $4, $5, 'OTORGAMIENTO', 7, $6, now())`,
      [randomUUID(), carol, enrollCarol.participation.id, carolActivity.id, leagueRule.id, `league-gate-window-bypass-${suffix}`],
    );
  } catch (error) {
    windowTriggerRejected = String((error as Error).message ?? '').includes('ya no está ACTIVE') || String((error as Error).message ?? '').includes('ya no está');
  }
  check('trigger enforce_league_point_ledger_entry_window rechaza un OTORGAMIENTO directo tras el cierre de temporada', windowTriggerRejected);

  console.log('--- 17. Cierre de temporada: historial preservado, nada se borra (§9.8) ---');
  const groupsAfterClose = await pg.query('SELECT status FROM league_group WHERE game_season_id = $1', [shortSeason.id]);
  check('todo league_group de la temporada cerrada quedó LOCKED', groupsAfterClose.rows.every((r) => r.status === 'LOCKED'));
  const participationAfterClose = await pg.query('SELECT participation_status FROM season_league_participation WHERE id = $1', [enrollCarol.participation.id]);
  check('la participación de Carol quedó SEASON_ENDED', participationAfterClose.rows[0].participation_status === 'SEASON_ENDED');
  const seasonRowStillExists = await pg.query('SELECT id FROM game_season WHERE id = $1', [shortSeason.id]);
  check('la fila de game_season sigue existiendo (nunca se borra)', seasonRowStillExists.rowCount === 1);
  const bobLedgerStillExists = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE account_id = $1', [bob]);
  check('el ledger de Bob (temporada anterior) sigue intacto tras cerrar una temporada distinta', bobLedgerStillExists.rows[0].n === 2); // 1 otorgamiento + 1 reverso

  // Limpieza final -- seasonA ya está FINALIZED (línea de arriba); archivarla
  // es la única transición legal restante, para no dejar temporadas de
  // prueba en un estado intermedio tras este gate.
  await pg.query("UPDATE game_season SET status = 'ARCHIVED' WHERE id = $1", [seasonA.id]);

  console.log('--- 18. Fuera de alcance de este incremento: sin ranking, sin endpoints, sin superficie móvil ---');
  const controllerFiles = (await import('node:fs')).readdirSync(gamificationDir).filter((f) => f.endsWith('.controller.ts'));
  let publicExposureFound = false;
  for (const file of controllerFiles) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    if (contents.includes('GameSeasonRepository') || contents.includes('LeagueDefinitionRepository') || contents.includes('SeasonLeagueParticipationRepository')) {
      publicExposureFound = true;
      console.error(`  ${file} expone game_season/league_definition/season_league_participation públicamente`);
    }
  }
  check('ningún controller expone las tablas de temporadas/ligas (sin endpoints en este incremento)', !publicExposureFound);
  check('sin campo currentRank/finalRank calculado por este incremento (Incremento 2, ranking)', enrollAlice1.participation.currentRank === null && enrollAlice1.participation.finalRank === null);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundación de Temporadas y Ligas (Bloque IV, Incremento 1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
