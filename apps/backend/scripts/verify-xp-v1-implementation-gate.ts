// Gate de XP-V1B -- "XP Economy V1: capacidad técnica, cutover y anti-farming".
// Ver brief XP-V1A/XP-V1B. A diferencia de la mayoría de los `verify-*-gate.ts`
// (que ejercitan un servidor HTTP ya corriendo), este gate instancia
// directamente los repositorios/servicio de dominio (`XpGrantService` y sus
// dependencias) contra `DATABASE_URL` -- no requiere `start-gates-server.ts`
// porque no ejercita ningún endpoint HTTP nuevo, solo la máquina de
// otorgamiento de XP ya existente sobre datos de fixture propios.
//
// Requiere una base de datos VACÍA de xp-core V1 (una base de datos local
// disponible con las migraciones aplicadas). NUNCA apunta a producción --
// usa el mismo `DATABASE_URL` que cualquier otro script/gate local.
//
// Prueba, contra el código REAL (no una reimplementación):
//   1. Cutover T-1ms/T/T+1ms -- XpRuleRepository.findApplicableRule.
//   2. Las 5 fuentes normales otorgan XP una vez, correctamente sumado
//      (144 XP total), sin duplicar en un reproceso.
//   3. El backlog histórico (simulación de las 51 filas conocidas, todas
//      anteriores al cutover) NUNCA recibe XP -- 0 xp_ledger_entry, 0
//      xp_balance -- con el `xp-core` V1 ya activo.
//   4. Identidad de deduplicación de ENSAYO_COMPLETADO: dos completions
//      reales del MISMO (accountId, examId) con distinto examAttemptId
//      colapsan a la MISMA deduplicationKey -- el UNIQUE de
//      `validated_gamification_activity.deduplication_key` rechaza la
//      segunda fila, igual que `GamificationService.ingestOne` la trataría
//      como éxito idempotente (no error) en producción.
//
// Uso:
//   DATABASE_URL=<local> pnpm --filter @axioma/backend exec tsx scripts/verify-xp-v1-implementation-gate.ts
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { GamificationProgramRepository } from '../src/gamification/gamification-program.repository';
import { XpRuleRepository } from '../src/gamification/xp-rule.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { XpGrantAttemptRepository } from '../src/gamification/xp-grant-attempt.repository';
import { XpGrantService } from '../src/gamification/xp-grant.service';
import { seedXpV1 } from './seed-xp-v1';

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? '  OK' : 'FALLO'}  ${label}`);
  if (!ok) failures++;
}

async function insertActivity(prisma: PrismaClient, accountId: string, activityType: string, occurredAt: Date, dedupSuffix: string): Promise<string> {
  const id = randomUUID();
  await prisma.validatedGamificationActivity.create({
    data: {
      id,
      accountId,
      sourceDomain: 'TEST',
      sourceEntityType: 'Test',
      sourceEntityId: randomUUID(),
      activityType,
      validationStatus: 'PENDING',
      validationRuleVersion: 'v1',
      occurredAt,
      deduplicationKey: `xp-v1-gate:${dedupSuffix}:${randomUUID()}`,
      integrityStatus: 'NOT_EVALUATED',
    },
  });
  return id;
}

async function main() {
  const T = new Date('2026-10-01T00:00:00.000Z');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const svcPrisma = prisma as unknown as PrismaService;

  console.log('--- 0. Provisionar xp-core V1 (real xp:seed-v1, no dry-run) ---');
  await seedXpV1({ dryRun: false, effectiveFrom: T });

  const txRunner = new TransactionRunnerService(svcPrisma);
  const programRepo = new GamificationProgramRepository(svcPrisma);
  const ruleRepo = new XpRuleRepository(svcPrisma);
  const activityRepo = new ValidatedGamificationActivityRepository(svcPrisma);
  const ledgerRepo = new XpLedgerEntryRepository(svcPrisma);
  const balanceRepo = new XpBalanceRepository(svcPrisma);
  const attemptRepo = new XpGrantAttemptRepository(svcPrisma);
  const grantService = new XpGrantService(txRunner, programRepo, ruleRepo, activityRepo, ledgerRepo, balanceRepo, attemptRepo);

  console.log('--- 1. Cutover T-1ms / T / T+1ms (XpRuleRepository.findApplicableRule real) ---');
  const program = await programRepo.findActiveByProgramKey('xp-core');
  if (!program) throw new Error('xp-core no quedó ACTIVE tras el seed.');
  for (const c of [
    { label: 'T-1ms', at: new Date(T.getTime() - 1), expectEligible: false },
    { label: 'T', at: T, expectEligible: true },
    { label: 'T+1ms', at: new Date(T.getTime() + 1), expectEligible: true },
  ]) {
    const rule = await ruleRepo.findApplicableRule(program.id, 'RESPUESTA_VALIDADA', c.at);
    check(`${c.label} -> eligible=${rule !== null} (esperado ${c.expectEligible})`, (rule !== null) === c.expectEligible);
  }

  console.log('--- 2. Cinco fuentes normales post-cutover: 144 XP total, idempotente ---');
  const accountFive = randomUUID();
  const sources: Array<[string, number]> = [
    ['RESPUESTA_VALIDADA', 2],
    ['QUICK_QUESTION_ANSWERED', 2],
    ['RECURSO_COMPLETADO', 20],
    ['TEMA_COMPLETADO', 20],
    ['ENSAYO_COMPLETADO', 100],
  ];
  const fiveIds: string[] = [];
  for (const [activityType] of sources) {
    fiveIds.push(await insertActivity(prisma, accountFive, activityType, new Date(T.getTime() + 1000), `five-${activityType}`));
  }
  for (const id of fiveIds) {
    const activity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id } });
    const outcome = await grantService.grantForActivity(activity);
    check(`${activity.activityType} otorga XP_GRANTED`, outcome.outcome === 'XP_GRANTED');
  }
  let balance = await prisma.xpBalance.findUnique({ where: { accountId: accountFive } });
  check('balance = 144 XP tras las 5 fuentes', balance?.lifetimeXp === 144);
  for (const id of fiveIds) {
    const activity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id } });
    await grantService.grantForActivity(activity);
  }
  balance = await prisma.xpBalance.findUnique({ where: { accountId: accountFive } });
  check('reprocesar todo de nuevo sigue en 144 XP (no 288)', balance?.lifetimeXp === 144);
  check('exactamente 5 xp_ledger_entry (sin duplicar)', (await prisma.xpLedgerEntry.count({ where: { accountId: accountFive } })) === 5);

  console.log('--- 3. Backlog histórico simulado (36+13+2=51, todo pre-cutover): 0 XP ---');
  const accountBacklog = randomUUID();
  const backlogTypes = [...Array(36).fill('RESPUESTA_VALIDADA'), ...Array(13).fill('QUICK_QUESTION_ANSWERED'), ...Array(2).fill('TEMA_COMPLETADO')];
  const backlogIds: string[] = [];
  for (const [idx, activityType] of backlogTypes.entries()) {
    backlogIds.push(await insertActivity(prisma, accountBacklog, activityType, new Date(T.getTime() - 1000 - idx * 1000), `backlog-${idx}`));
  }
  check(`51 actividades históricas simuladas (${backlogIds.length})`, backlogIds.length === 51);
  let noRule = 0;
  for (const id of backlogIds) {
    const activity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id } });
    const outcome = await grantService.grantForActivity(activity);
    if (outcome.outcome === 'NO_ACTIVE_RULE') noRule++;
  }
  check('las 51 -> NO_ACTIVE_RULE siempre (nunca XP_GRANTED)', noRule === 51);
  check('0 xp_ledger_entry para el backlog simulado', (await prisma.xpLedgerEntry.count({ where: { accountId: accountBacklog } })) === 0);
  check('0 xp_balance para el backlog simulado', (await prisma.xpBalance.findUnique({ where: { accountId: accountBacklog } })) === null);

  console.log('--- 4. Identidad ENSAYO_COMPLETADO: dos completions del mismo (cuenta,examen) colapsan ---');
  const acc = randomUUID();
  const examId = randomUUID();
  const dedupKey = `ensayo-completado:${acc}:${examId}`;
  await prisma.validatedGamificationActivity.create({
    data: {
      id: randomUUID(),
      accountId: acc,
      sourceDomain: 'EXAMS',
      sourceEntityType: 'ExamAttempt',
      sourceEntityId: randomUUID(),
      activityType: 'ENSAYO_COMPLETADO',
      validationStatus: 'PENDING',
      validationRuleVersion: 'v1',
      occurredAt: new Date(),
      deduplicationKey: dedupKey,
      integrityStatus: 'NOT_EVALUATED',
    },
  });
  let secondRejected = false;
  try {
    await prisma.validatedGamificationActivity.create({
      data: {
        id: randomUUID(),
        accountId: acc,
        sourceDomain: 'EXAMS',
        sourceEntityType: 'ExamAttempt',
        sourceEntityId: randomUUID(),
        activityType: 'ENSAYO_COMPLETADO',
        validationStatus: 'PENDING',
        validationRuleVersion: 'v1',
        occurredAt: new Date(),
        deduplicationKey: dedupKey,
        integrityStatus: 'NOT_EVALUATED',
      },
    });
  } catch {
    secondRejected = true;
  }
  check('segunda completion del mismo Ensayo (distinto attemptId) rechazada por UNIQUE(deduplication_key)', secondRejected);

  await prisma.$disconnect();
  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de implementación XP V1 pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
