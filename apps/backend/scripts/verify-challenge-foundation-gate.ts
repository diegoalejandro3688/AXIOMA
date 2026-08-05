// Gate del Bloque III, Incremento 4, sub-incremento 4.a ("Fundación de
// persistencia de desafíos", BLOCK-III-DEFINITION.md §4.8/§4.12-§4.14) --
// puramente estructural (esquema/constraints/triggers, sin HTTP, sin
// worker). Verifica Gates 16/17 (parcial, transición de estado) y la base
// de esquema de los Gates 21/31 (mecanismo de tope diario, sin evaluación
// de eventos todavía -- eso es un sub-incremento posterior).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { AccountChallengeRepository } from '../src/gamification/account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from '../src/gamification/account-challenge-daily-progress.repository';
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

function localDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const challengeDefinitionRepo = new ChallengeDefinitionRepository(prisma);
  const accountChallengeRepo = new AccountChallengeRepository(prisma);
  const dailyProgressRepo = new AccountChallengeDailyProgressRepository(prisma);

  const suffix = Date.now();
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  console.log('--- 1. challenge_definition: creación, tipos DAILY/WEEKLY, UNIQUE(challenge_key), rewardBundleId nullable ---');
  const challengeDefinition = await challengeDefinitionRepo.create({
    challengeKey: `weekly-ten-activities-${suffix}`,
    name: 'Completa 10 actividades esta semana',
    description: 'Desafío semanal de práctica sostenida.',
    challengeType: 'WEEKLY',
    eligibilityRule: 'ninguna -- abierto a toda cuenta elegible',
    completionRule: 'acumular 10 contribuciones válidas, máximo 3 por día (daily_cap)',
    rewardBundleId: null,
    startsAt: now,
    endsAt: in7Days,
    dailyCap: 3,
  });
  check('challenge_definition creado', challengeDefinition.id !== undefined);
  check('status nace ACTIVE', challengeDefinition.status === 'ACTIVE');
  check('challengeType persistido tal cual', challengeDefinition.challengeType === 'WEEKLY');
  check('dailyCap persistido', challengeDefinition.dailyCap === 3);
  check('rewardBundleId nace NULL (nullable, mismo criterio que AchievementVersion)', challengeDefinition.rewardBundleId === null);

  let duplicateChallengeKeyRejected = false;
  try {
    await challengeDefinitionRepo.create({
      challengeKey: challengeDefinition.challengeKey,
      name: 'Duplicado',
      challengeType: 'DAILY',
      eligibilityRule: 'x',
      completionRule: 'x',
      startsAt: now,
      endsAt: in7Days,
    });
  } catch (error) {
    duplicateChallengeKeyRejected = (error as { code?: string }).code === 'P2002';
  }
  check('UNIQUE rechaza challenge_key duplicado', duplicateChallengeKeyRejected);

  console.log('--- 2. challenge_definition: CHECK de coherencia (daily_cap positivo, ventana válida) ---');
  let dailyCapZeroRejected = false;
  try {
    await pg.query(
      `INSERT INTO challenge_definition (id, challenge_key, name, challenge_type, eligibility_rule, completion_rule, starts_at, ends_at, daily_cap)
       VALUES ($1, $2, 'x', 'DAILY', 'x', 'x', $3, $4, 0)`,
      [randomUUID(), `bad-daily-cap-${suffix}`, now, in7Days],
    );
  } catch (error) {
    dailyCapZeroRejected = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza daily_cap = 0 (debe ser NULL o > 0)', dailyCapZeroRejected);

  let invalidWindowRejected = false;
  try {
    await pg.query(
      `INSERT INTO challenge_definition (id, challenge_key, name, challenge_type, eligibility_rule, completion_rule, starts_at, ends_at)
       VALUES ($1, $2, 'x', 'DAILY', 'x', 'x', $3, $4)`,
      [randomUUID(), `bad-window-${suffix}`, in7Days, now],
    );
  } catch (error) {
    invalidWindowRejected = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza ends_at <= starts_at', invalidWindowRejected);

  console.log('--- 3. Inmutabilidad por diseño de repositorio (§4.8, sin trigger -- mismo criterio que TitleDefinition) ---');
  check('ChallengeDefinitionRepository no expone update/delete', !('update' in challengeDefinitionRepo) && !('delete' in challengeDefinitionRepo));

  console.log('--- 4. account_challenge: creación perezosa idempotente, UNIQUE(account_id, challenge_definition_id, period_start), FK ---');
  const accountX = randomUUID();
  const firstAssignment = await accountChallengeRepo.createIdempotent({
    accountId: accountX,
    challengeDefinitionId: challengeDefinition.id,
    targetValue: 10,
    periodStart: challengeDefinition.startsAt,
    periodEnd: challengeDefinition.endsAt,
    acceptedAt: new Date(),
  });
  check('primer createIdempotent -> created=true', firstAssignment.created === true);
  check('challengeStatus nace ACCEPTED', firstAssignment.accountChallenge.challengeStatus === 'ACCEPTED');
  check('progressValue nace 0', firstAssignment.accountChallenge.progressValue === 0);
  check('acceptedAt fijado (asignación automática, no acción del estudiante -- §4.14)', firstAssignment.accountChallenge.acceptedAt !== null);

  const secondAssignment = await accountChallengeRepo.createIdempotent({
    accountId: accountX,
    challengeDefinitionId: challengeDefinition.id,
    targetValue: 999, // deliberadamente distinto -- no debe usarse
    periodStart: challengeDefinition.startsAt,
    periodEnd: challengeDefinition.endsAt,
    acceptedAt: new Date(),
  });
  check('segundo createIdempotent (misma cuenta/desafío/período) -> created=false', secondAssignment.created === false);
  check('devuelve LA MISMA fila (targetValue original, no el del segundo intento)', secondAssignment.accountChallenge.targetValue === 10);
  const accountChallengeCount = await pg.query(
    'SELECT count(*)::int AS n FROM account_challenge WHERE account_id = $1 AND challenge_definition_id = $2',
    [accountX, challengeDefinition.id],
  );
  check('sigue existiendo UNA sola account_challenge para ese triple', accountChallengeCount.rows[0].n === 1);

  let fkRejectedForUnknownChallenge = false;
  try {
    await accountChallengeRepo.createIdempotent({
      accountId: accountX,
      challengeDefinitionId: randomUUID(),
      targetValue: 10,
      periodStart: now,
      periodEnd: in7Days,
      acceptedAt: new Date(),
    });
  } catch (error) {
    fkRejectedForUnknownChallenge = (error as { code?: string }).code === 'P2003';
  }
  check('FK rechaza account_challenge con challenge_definition_id inexistente', fkRejectedForUnknownChallenge);

  console.log('--- 5. account_challenge: CHECK de coherencia (target positivo, progreso acotado, período válido) ---');
  let targetZeroRejected = false;
  try {
    await pg.query(
      `INSERT INTO account_challenge (id, account_id, challenge_definition_id, target_value, period_start, period_end, accepted_at, updated_at)
       VALUES ($1, $2, $3, 0, $4, $5, $4, $4)`,
      [randomUUID(), randomUUID(), challengeDefinition.id, now, in7Days],
    );
  } catch (error) {
    targetZeroRejected = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza target_value = 0', targetZeroRejected);

  let progressBeyondTargetRejected = false;
  try {
    await pg.query(
      `INSERT INTO account_challenge (id, account_id, challenge_definition_id, progress_value, target_value, period_start, period_end, accepted_at, updated_at)
       VALUES ($1, $2, $3, 11, 10, $4, $5, $4, $4)`,
      [randomUUID(), randomUUID(), challengeDefinition.id, now, in7Days],
    );
  } catch (error) {
    progressBeyondTargetRejected = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza progress_value > target_value', progressBeyondTargetRejected);

  let invalidPeriodRejected = false;
  try {
    await pg.query(
      `INSERT INTO account_challenge (id, account_id, challenge_definition_id, target_value, period_start, period_end, accepted_at, updated_at)
       VALUES ($1, $2, $3, 10, $4, $5, $4, $4)`,
      [randomUUID(), randomUUID(), challengeDefinition.id, in7Days, now],
    );
  } catch (error) {
    invalidPeriodRejected = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza period_end <= period_start', invalidPeriodRejected);

  console.log('--- 6. account_challenge: ciclo de vida sin saltos (Gate 17) ---');
  const rowId = firstAssignment.accountChallenge.id;

  let skipRejected = false;
  try {
    await pg.query("UPDATE account_challenge SET challenge_status = 'COMPLETED' WHERE id = $1", [rowId]);
  } catch (error) {
    skipRejected = String((error as Error).message ?? '').includes('no admite la transición');
  }
  check('trigger rechaza ACCEPTED -> COMPLETED (salto de IN_PROGRESS)', skipRejected);

  await pg.query("UPDATE account_challenge SET challenge_status = 'IN_PROGRESS' WHERE id = $1", [rowId]);
  const afterInProgress = await pg.query('SELECT challenge_status FROM account_challenge WHERE id = $1', [rowId]);
  check('transición válida ACCEPTED -> IN_PROGRESS aceptada', afterInProgress.rows[0].challenge_status === 'IN_PROGRESS');

  let backwardRejected = false;
  try {
    await pg.query("UPDATE account_challenge SET challenge_status = 'ACCEPTED' WHERE id = $1", [rowId]);
  } catch (error) {
    backwardRejected = String((error as Error).message ?? '').includes('no admite la transición');
  }
  check('trigger rechaza retroceso IN_PROGRESS -> ACCEPTED', backwardRejected);

  await pg.query("UPDATE account_challenge SET challenge_status = 'COMPLETED', completed_at = now() WHERE id = $1", [rowId]);
  const afterCompleted = await pg.query('SELECT challenge_status, completed_at FROM account_challenge WHERE id = $1', [rowId]);
  check('transición válida IN_PROGRESS -> COMPLETED aceptada', afterCompleted.rows[0].challenge_status === 'COMPLETED');
  check('completed_at fijado', afterCompleted.rows[0].completed_at !== null);

  let completedAtImmutableRejected = false;
  try {
    await pg.query('UPDATE account_challenge SET completed_at = now() WHERE id = $1', [rowId]);
  } catch (error) {
    completedAtImmutableRejected = String((error as Error).message ?? '').includes('completed_at es inmutable');
  }
  check('completed_at es inmutable una vez fijado', completedAtImmutableRejected);

  await pg.query("UPDATE account_challenge SET challenge_status = 'CLAIMED', claimed_at = now() WHERE id = $1", [rowId]);
  const afterClaimed = await pg.query('SELECT challenge_status, claimed_at FROM account_challenge WHERE id = $1', [rowId]);
  check('transición válida COMPLETED -> CLAIMED aceptada', afterClaimed.rows[0].challenge_status === 'CLAIMED');
  check('claimed_at fijado', afterClaimed.rows[0].claimed_at !== null);

  let claimedAtImmutableRejected = false;
  try {
    await pg.query('UPDATE account_challenge SET claimed_at = now() WHERE id = $1', [rowId]);
  } catch (error) {
    claimedAtImmutableRejected = String((error as Error).message ?? '').includes('claimed_at es inmutable');
  }
  check('claimed_at es inmutable una vez fijado', claimedAtImmutableRejected);

  console.log('--- 7. Inmutabilidad por diseño de repositorio: sin update() de challengeStatus/progressValue en 4.a ---');
  check('AccountChallengeRepository no expone update() genérico', !('update' in accountChallengeRepo));

  console.log('--- 8. account_challenge_daily_progress: primitivo de acumulación (§4.12), UNIQUE(account_challenge_id, local_date), FK ---');
  const day1 = localDate(2026, 8, 5);
  const firstContribution = await dailyProgressRepo.upsertContribution(rowId, day1);
  check('primer upsertContribution -> contributionCount = 1', firstContribution.contributionCount === 1);

  const secondContribution = await dailyProgressRepo.upsertContribution(rowId, day1);
  check('segundo upsertContribution (mismo día) -> contributionCount = 2', secondContribution.contributionCount === 2);

  // Cuenta por account_challenge_id SIN filtrar por local_date en SQL crudo
  // a propósito: node-postgres serializa un `Date` de JS para una columna
  // DATE aplicando la zona horaria del proceso, lo que puede desplazar el
  // día -- Prisma (findByAccountChallengeAndDate, arriba) ya maneja esto
  // correctamente para `@db.Date`. Esta cuenta total evita ese artefacto de
  // serialización y sigue verificando lo mismo: dos upserts sobre el mismo
  // día no deben crear una segunda fila.
  const dailyRowCount = await pg.query('SELECT count(*)::int AS n FROM account_challenge_daily_progress WHERE account_challenge_id = $1', [
    rowId,
  ]);
  check('sigue existiendo UNA sola fila diaria tras dos upserts sobre el mismo día -- UNIQUE respetada vía upsert', dailyRowCount.rows[0].n === 1);

  const day2 = localDate(2026, 8, 6);
  const otherDayContribution = await dailyProgressRepo.upsertContribution(rowId, day2);
  check('un día distinto crea su propia fila (contributionCount = 1)', otherDayContribution.contributionCount === 1);

  const allDays = await dailyProgressRepo.findByAccountChallengeId(rowId);
  check('findByAccountChallengeId devuelve ambas fechas', allDays.length === 2);

  let dailyFkRejected = false;
  try {
    await pg.query(
      `INSERT INTO account_challenge_daily_progress (id, account_challenge_id, local_date, contribution_count, updated_at)
       VALUES ($1, $2, $3, 1, now())`,
      [randomUUID(), randomUUID(), day1],
    );
  } catch (error) {
    dailyFkRejected = (error as { code?: string }).code === '23503';
  }
  check('FK rechaza account_challenge_daily_progress con account_challenge_id inexistente', dailyFkRejected);

  let negativeCountRejected = false;
  try {
    await pg.query(
      `INSERT INTO account_challenge_daily_progress (id, account_challenge_id, local_date, contribution_count, updated_at)
       VALUES ($1, $2, $3, -1, now())`,
      [randomUUID(), rowId, localDate(2026, 8, 7)],
    );
  } catch (error) {
    negativeCountRejected = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza contribution_count negativo', negativeCountRejected);

  console.log('--- 9. Fuera de alcance de 4.a: sin evaluación, sin progresión, sin reclamación, sin worker ---');
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const commonForbiddenSymbols = ['StudentResponse', 'CurriculumTopicProgress', 'PublicProfile', 'XpLedgerEntry', 'RewardEvaluationWorker', 'RewardGrant'];
  const filesToCheck: Record<string, string[]> = {
    'challenge-definition.repository.ts': commonForbiddenSymbols,
    'account-challenge.repository.ts': [...commonForbiddenSymbols, 'dailyCap'],
    // dailyCap es legítimo en challenge-definition.repository.ts (columna
    // propia de challenge_definition) -- solo se prohíbe donde decidir
    // sobre el tope sería evaluación, no persistencia.
    'account-challenge-daily-progress.repository.ts': [...commonForbiddenSymbols, 'dailyCap'],
  };
  let boundaryViolationFound = false;
  for (const [file, forbiddenSymbols] of Object.entries(filesToCheck)) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    for (const symbol of forbiddenSymbols) {
      if (contents.includes(symbol)) {
        boundaryViolationFound = true;
        console.error(`  ${file} referencia el símbolo prohibido "${symbol}"`);
      }
    }
  }
  check('ningún repositorio de 4.a referencia PROGRESS/worker/entrega/dailyCap (evaluación real es un sub-incremento posterior)', !boundaryViolationFound);

  const controllerFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.controller.ts'));
  let publicExposureFound = false;
  for (const file of controllerFiles) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    if (contents.includes('ChallengeDefinitionRepository') || contents.includes('AccountChallengeRepository') || contents.includes('AccountChallengeDailyProgressRepository')) {
      publicExposureFound = true;
      console.error(`  ${file} expone challenge_definition/account_challenge públicamente`);
    }
  }
  check('ningún controller expone las tablas de desafíos (sin endpoints en 4.a)', !publicExposureFound);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundación de Desafíos (Bloque III, sub-incremento 4.a) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
