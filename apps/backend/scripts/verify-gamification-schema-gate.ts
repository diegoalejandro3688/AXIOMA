// Gate ESTRUCTURAL del Bloque I (Gamification Foundation, ADR-0016) --
// valida esquema/persistencia únicamente: sin HTTP, sin PROGRESS, sin
// GamificationRelayWorker, sin cálculo real de XP. Prueba directamente
// contra Postgres real (igual criterio que el resto de gates de este
// proyecto: nunca contra mocks) usando los repositorios reales más
// aserciones SQL directas para las restricciones a nivel de base de datos
// (CHECK, trigger de inmutabilidad, FK) que un repositorio no puede eludir
// ni aunque quisiera.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { GamificationProgramRepository } from '../src/gamification/gamification-program.repository';
import { GamificationProgramVersionRepository } from '../src/gamification/gamification-program-version.repository';
import { XpRuleRepository } from '../src/gamification/xp-rule.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
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

  const programRepo = new GamificationProgramRepository(prisma);
  const versionRepo = new GamificationProgramVersionRepository(prisma);
  const ruleRepo = new XpRuleRepository(prisma);
  const activityRepo = new ValidatedGamificationActivityRepository(prisma);
  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const balanceRepo = new XpBalanceRepository(prisma);

  const suffix = Date.now();

  console.log('--- 1. gamification_program: creación y unicidad de program_key ---');
  const program = await programRepo.create({
    programKey: `xp-core-${suffix}`,
    name: 'Programa XP núcleo',
    programType: 'XP',
  });
  check('programa creado', Boolean(program.id));
  check('status por defecto ACTIVE', program.status === 'ACTIVE');

  let duplicateProgramKeyRejected = false;
  try {
    await pg.query(
      `INSERT INTO gamification_program (id, program_key, name, program_type, status)
       VALUES ($1, $2, 'duplicado', 'XP', 'ACTIVE')`,
      [randomUUID(), program.programKey],
    );
  } catch (error) {
    duplicateProgramKeyRejected = (error as { code?: string }).code === '23505';
  }
  check('program_key duplicado rechazado por restricción única', duplicateProgramKeyRejected);

  console.log('--- 2. gamification_program_version: unicidad (programId, versionLabel) y FK ---');
  const version = await versionRepo.create({
    gamificationProgramId: program.id,
    versionLabel: 'v1',
    approvalStatus: 'APPROVED',
    approvedAt: new Date(),
  });
  check('versión creada', Boolean(version.id));

  let duplicateVersionLabelRejected = false;
  try {
    await pg.query(
      `INSERT INTO gamification_program_version (id, gamification_program_id, version_label, approval_status)
       VALUES ($1, $2, 'v1', 'DRAFT')`,
      [randomUUID(), program.id],
    );
  } catch (error) {
    duplicateVersionLabelRejected = (error as { code?: string }).code === '23505';
  }
  check('(programId, versionLabel) duplicado rechazado', duplicateVersionLabelRejected);

  let invalidProgramFkRejected = false;
  try {
    await pg.query(
      `INSERT INTO gamification_program_version (id, gamification_program_id, version_label, approval_status)
       VALUES ($1, $2, 'v-huerfana', 'DRAFT')`,
      [randomUUID(), randomUUID()],
    );
  } catch (error) {
    invalidProgramFkRejected = (error as { code?: string }).code === '23503';
  }
  check('gamification_program_id inexistente rechazado por FK', invalidProgramFkRejected);

  console.log('--- 3. xp_rule: unicidad (programVersionId, activityType) ---');
  const rule = await ruleRepo.create({
    programVersionId: version.id,
    activityType: 'PRACTICA_VALIDA',
    baseXp: 10,
  });
  check('regla creada', Boolean(rule.id));

  let duplicateRuleRejected = false;
  try {
    await pg.query(
      `INSERT INTO xp_rule (id, program_version_id, activity_type, base_xp, status)
       VALUES ($1, $2, 'PRACTICA_VALIDA', 5, 'ACTIVE')`,
      [randomUUID(), version.id],
    );
  } catch (error) {
    duplicateRuleRejected = (error as { code?: string }).code === '23505';
  }
  check('(programVersionId, activityType) duplicado rechazado', duplicateRuleRejected);

  console.log('--- 4. validated_gamification_activity: unicidad de deduplication_key ---');
  const accountId = randomUUID();
  const activity = await activityRepo.create({
    accountId,
    sourceDomain: 'PROGRESS',
    sourceEntityType: 'StudentResponse',
    sourceEntityId: randomUUID(),
    activityType: 'PRACTICA_VALIDA',
    validationStatus: 'PENDING',
    occurredAt: new Date(),
    validationRuleVersion: 'v1',
    deduplicationKey: `dedup-${suffix}`,
    integrityStatus: 'OK',
  });
  check('actividad validada creada', Boolean(activity.id));

  let duplicateDedupRejected = false;
  try {
    await pg.query(
      `INSERT INTO validated_gamification_activity
         (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
       VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, 'PRACTICA_VALIDA', 'PENDING', 'v1', now(), $4, 'OK')`,
      [randomUUID(), accountId, randomUUID(), activity.deduplicationKey],
    );
  } catch (error) {
    duplicateDedupRejected = (error as { code?: string }).code === '23505';
  }
  check('deduplication_key duplicada rechazada', duplicateDedupRejected);

  console.log('--- 5. xp_ledger_entry: idempotencyKey, CHECK de reversibilidad, e inmutabilidad ---');
  const grantKey = `grant-${suffix}`;
  const grant = await ledgerRepo.createIdempotent({
    accountId,
    validatedActivityId: activity.id,
    xpRuleId: rule.id,
    entryType: 'OTORGAMIENTO',
    xpAmount: 10,
    baseXpAmount: 10,
    idempotencyKey: grantKey,
    occurredAt: new Date(),
  });
  check('entrada de otorgamiento creada', Boolean(grant.entry.id));
  check('createIdempotent reporta created=true en la primera creación', grant.created === true);

  const grantRetry = await ledgerRepo.createIdempotent({
    accountId,
    validatedActivityId: activity.id,
    xpRuleId: rule.id,
    entryType: 'OTORGAMIENTO',
    xpAmount: 10,
    baseXpAmount: 10,
    idempotencyKey: grantKey,
    occurredAt: new Date(),
  });
  check('reintento con mismo idempotencyKey devuelve la misma fila, no duplica', grantRetry.entry.id === grant.entry.id);
  check('createIdempotent reporta created=false en el reintento (no se incrementa el balance dos veces)', grantRetry.created === false);

  // Nota: desde xp_grant_integrity, un INSERT con entry_type=REVERSO dispara
  // primero el trigger de integridad de reverso (enforce_xp_ledger_entry_
  // reversal_integrity, SQLSTATE por defecto P0001) antes de que la base
  // llegue a evaluar el CHECK original (23514) -- ambos códigos se aceptan
  // aquí porque ambos significan "rechazado correctamente"; la prueba
  // específica del trigger nuevo vive en verify-gamification-xp-grant-gate.ts.
  let otorgamientoConReversesRejected = false;
  try {
    await pg.query(
      `INSERT INTO xp_ledger_entry (id, account_id, entry_type, xp_amount, idempotency_key, occurred_at, reverses_entry_id, xp_rule_id)
       VALUES ($1, $2, 'OTORGAMIENTO', 5, $3, now(), $4, $5)`,
      [randomUUID(), accountId, `bad-otorgamiento-${suffix}`, grant.entry.id, rule.id],
    );
  } catch (error) {
    otorgamientoConReversesRejected = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza OTORGAMIENTO con reverses_entry_id no nulo', otorgamientoConReversesRejected);

  let reversoSinReversesRejected = false;
  try {
    await pg.query(
      `INSERT INTO xp_ledger_entry (id, account_id, entry_type, xp_amount, idempotency_key, occurred_at)
       VALUES ($1, $2, 'REVERSO', -5, $3, now())`,
      [randomUUID(), accountId, `bad-reverso-${suffix}`],
    );
  } catch (error) {
    reversoSinReversesRejected = ['23514', 'P0001'].includes((error as { code?: string }).code ?? '');
  }
  check('CHECK rechaza REVERSO sin reverses_entry_id', reversoSinReversesRejected);

  const reversal = await ledgerRepo.createIdempotent({
    accountId,
    entryType: 'REVERSO',
    xpAmount: -10,
    idempotencyKey: `reversal-${suffix}`,
    occurredAt: new Date(),
    reversesEntryId: grant.entry.id,
  });
  check('entrada de reverso (compensatoria) válida creada', Boolean(reversal.entry.id));

  let immutabilityRejected = false;
  try {
    await pg.query('UPDATE xp_ledger_entry SET xp_amount = 999 WHERE id = $1', [grant.entry.id]);
  } catch (error) {
    immutabilityRejected = String((error as Error).message ?? '').includes('inmutable');
  }
  check('UPDATE sobre xp_ledger_entry rechazado por el trigger de inmutabilidad', immutabilityRejected);

  console.log('--- 5b. Decision Gate 3 (Bloque I): DELETE sobre xp_ledger_entry también rechazado ---');
  let deleteRejected = false;
  try {
    await pg.query('DELETE FROM xp_ledger_entry WHERE id = $1', [grant.entry.id]);
  } catch (error) {
    deleteRejected = String((error as Error).message ?? '').includes('no admite DELETE');
  }
  check('DELETE sobre xp_ledger_entry rechazado por trigger dedicado (Decision Gate 3)', deleteRejected);
  const stillThere = await pg.query('SELECT id FROM xp_ledger_entry WHERE id = $1', [grant.entry.id]);
  check('la fila sigue existiendo tras el intento de DELETE', stillThere.rowCount === 1);

  console.log('--- 6. Reconstructibilidad: sumNetXpForAccount coincide con SUM directo sobre xp_ledger_entry ---');
  const sumFromRepo = await ledgerRepo.sumNetXpForAccount(accountId);
  const sumFromSql = await pg.query('SELECT COALESCE(SUM(xp_amount), 0)::int AS total FROM xp_ledger_entry WHERE account_id = $1', [
    accountId,
  ]);
  check('otorgamiento (+10) y reverso (-10) -> neto 0', sumFromRepo === 0);
  check('sumNetXpForAccount coincide exactamente con SUM SQL directo sobre el ledger', sumFromRepo === sumFromSql.rows[0].total);

  console.log('--- 7. xp_balance: unicidad de account_id, sin escritura de valores reales (fuera de alcance) ---');
  const balance = await balanceRepo.create({ accountId, lifetimeXp: 0, lastLedgerEntryId: null });
  check('fila de balance creada (proyección vacía, sin cálculo todavía)', Boolean(balance.id));
  check('lifetimeXp por defecto en 0 -- ningún servicio de este incremento lo calcula', balance.lifetimeXp === 0);

  let duplicateBalanceAccountRejected = false;
  try {
    await pg.query('INSERT INTO xp_balance (id, account_id, lifetime_xp, balance_version) VALUES ($1, $2, 0, 0)', [
      randomUUID(),
      accountId,
    ]);
  } catch (error) {
    duplicateBalanceAccountRejected = (error as { code?: string }).code === '23505';
  }
  check('segunda fila de balance para la misma cuenta rechazada', duplicateBalanceAccountRejected);

  console.log('--- 8. Decision Gate 2 (Bloque I): no-autoridad académica -- verificación estática de frontera de dominio ---');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const gamificationFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.ts'));
  const forbiddenReferences = ['StudentResponseRepository', 'CurriculumTopicProgressRepository', 'prisma.studentResponse', 'prisma.curriculumTopicProgress'];
  const offendingFiles: string[] = [];
  for (const file of gamificationFiles) {
    const content = readFileSync(join(gamificationDir, file), 'utf-8');
    if (forbiddenReferences.some((ref) => content.includes(ref))) {
      offendingFiles.push(file);
    }
  }
  check(
    `ningún archivo de src/gamification/ (${gamificationFiles.length} revisados) referencia StudentResponse/CurriculumTopicProgress -- GAMIFICATION no puede escribir evidencia académica`,
    offendingFiles.length === 0,
  );
  if (offendingFiles.length > 0) {
    console.error(`  archivos que violan la frontera de dominio: ${offendingFiles.join(', ')}`);
  }

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate estructural de GAMIFICATION pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
