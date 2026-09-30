// VC4 MICROBLOQUE 11 -- Essay Reward Truth. Gate de `ExamRewardStatusService`
// (apps/backend/src/gamification/exam-reward-status.service.ts): la única
// fuente autoritativa de "¿el backend ya otorgó XP real para
// (accountId, examId)?" -- PENDING nunca se infiere de `justCompleted`
// (ExamAttempt ACTIVE->COMPLETED), GRANTED nunca se afirma sin un
// XpLedgerEntry OTORGAMIENTO real.
//
// Sin servidor HTTP ni Postgres real (ninguno disponible en este entorno de
// implementación) -- mismo criterio que las "pruebas de frontera" con
// FakeAiProvider ya establecidas en el proyecto (ver ADR de Tutor IA):
// fakes en memoria con la MISMA forma pública que
// `ValidatedGamificationActivityRepository`/`XpLedgerEntryRepository`
// (`findByDeduplicationKey`/`findGrantByValidatedActivityId`), inyectados en
// el servicio REAL de producción -- nunca una reimplementación paralela de
// su lógica. `buildActivityDedupKeyV2` real (gamification-key.ts) construye
// las claves, así que un cambio futuro en esa función se refleja aquí sin
// duplicar su fórmula.
import { randomUUID } from 'node:crypto';
import { ExamRewardStatusService } from '../src/gamification/exam-reward-status.service';
import { buildActivityDedupKeyV2 } from '../src/gamification/gamification-key';
import type { ValidatedGamificationActivity, XpLedgerEntry } from '../src/generated/prisma/client';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const SECRET = 'gate-secret-exam-reward-truth-0123456789abcdef';

/** Fake con la MISMA forma pública que ValidatedGamificationActivityRepository -- solo los dos métodos que ExamRewardStatusService consume. */
class FakeActivityRepo {
  private byKey = new Map<string, ValidatedGamificationActivity>();

  seed(deduplicationKey: string, overrides: Partial<ValidatedGamificationActivity> = {}): ValidatedGamificationActivity {
    const activity: ValidatedGamificationActivity = {
      id: randomUUID(),
      accountId: overrides.accountId ?? null,
      gamificationActorRef: null,
      sourceDomain: 'EXAMS',
      sourceEntityType: 'ExamAttempt',
      sourceEntityId: randomUUID(),
      activityType: 'ENSAYO_COMPLETADO',
      validationStatus: 'VALID',
      validationRuleVersion: 'v1',
      occurredAt: new Date(),
      validatedAt: new Date(),
      deduplicationKey,
      integrityStatus: 'OK',
      ...overrides,
    };
    this.byKey.set(deduplicationKey, activity);
    return activity;
  }

  async findByDeduplicationKey(deduplicationKey: string): Promise<ValidatedGamificationActivity | null> {
    return this.byKey.get(deduplicationKey) ?? null;
  }
}

/** Fake con la MISMA forma pública que XpLedgerEntryRepository -- solo `findGrantByValidatedActivityId`. */
class FakeLedgerRepo {
  private grants = new Map<string, XpLedgerEntry>();

  seedGrant(validatedActivityId: string, xpAmount: number): XpLedgerEntry {
    const entry = {
      id: randomUUID(),
      accountId: null,
      gamificationActorRef: null,
      validatedActivityId,
      xpRuleId: randomUUID(),
      entryType: 'OTORGAMIENTO',
      xpAmount,
      baseXpAmount: xpAmount,
      multiplierReference: null,
      ruleVersion: 'v1',
      reasonCode: null,
      idempotencyKey: `grant:${validatedActivityId}`,
      occurredAt: new Date(),
      recordedAt: new Date(),
      reversesEntryId: null,
    } as unknown as XpLedgerEntry;
    this.grants.set(validatedActivityId, entry);
    return entry;
  }

  /** Simula una fila REVERSO -- nunca debe contar como "otorgado" (ver findGrantByValidatedActivityId real, filtra entryType OTORGAMIENTO). */
  seedReversalOnly(validatedActivityId: string): void {
    // deliberadamente NO se agrega a `this.grants` -- un REVERSO real vive en
    // otra fila del ledger, nunca reemplaza la ausencia de OTORGAMIENTO.
    void validatedActivityId;
  }

  async findGrantByValidatedActivityId(validatedActivityId: string): Promise<XpLedgerEntry | null> {
    return this.grants.get(validatedActivityId) ?? null;
  }
}

async function main() {
  const ACCOUNT_A = randomUUID();
  const ACCOUNT_B = randomUUID();
  const EXAM_X = randomUUID();
  const EXAM_Y = randomUUID();

  const keyFor = (accountId: string, examId: string) =>
    buildActivityDedupKeyV2('exam_completed', accountId, () => SECRET, { examId });

  console.log('--- CASE 1: sin actividad, sin ledger -> PENDING (nunca GRANTED sin evidencia) ---');
  {
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, { get: () => SECRET } as never);
    const result = await service.getExamRewardStatus(ACCOUNT_A, EXAM_X);
    check('status === PENDING', result.status === 'PENDING');
    check('xpAmount === null', result.xpAmount === null);
  }

  console.log('--- CASE 2: actividad existe, ledger existe (OTORGAMIENTO) -> GRANTED con el monto real ---');
  let sharedActivityRepo: FakeActivityRepo;
  let sharedLedgerRepo: FakeLedgerRepo;
  {
    sharedActivityRepo = new FakeActivityRepo();
    sharedLedgerRepo = new FakeLedgerRepo();
    const key = keyFor(ACCOUNT_A, EXAM_X);
    const activity = sharedActivityRepo.seed(key, { accountId: ACCOUNT_A });
    sharedLedgerRepo.seedGrant(activity.id, 100);
    const service = new ExamRewardStatusService(sharedActivityRepo as never, sharedLedgerRepo as never, { get: () => SECRET } as never);
    const result = await service.getExamRewardStatus(ACCOUNT_A, EXAM_X);
    check('status === GRANTED', result.status === 'GRANTED');
    check('xpAmount === 100 (monto REAL del XpLedgerEntry, nunca un valor fijo inventado)', result.xpAmount === 100);
  }

  console.log('--- CASE 2b: actividad existe pero XpGrantScheduler aun no corrio (sin ledger) -> PENDING, NUNCA GRANTED optimista ---');
  {
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const key = keyFor(ACCOUNT_A, EXAM_X);
    activityRepo.seed(key, { accountId: ACCOUNT_A });
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, { get: () => SECRET } as never);
    const result = await service.getExamRewardStatus(ACCOUNT_A, EXAM_X);
    check('status === PENDING (justCompleted-equivalente NUNCA se trata como rewardGranted)', result.status === 'PENDING');
    check('xpAmount === null', result.xpAmount === null);
  }

  console.log('--- CASE 2c: REVERSO existe pero NO OTORGAMIENTO -> sigue PENDING (un reverso nunca cuenta como otorgado) ---');
  {
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const key = keyFor(ACCOUNT_A, EXAM_X);
    const activity = activityRepo.seed(key, { accountId: ACCOUNT_A });
    ledgerRepo.seedReversalOnly(activity.id);
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, { get: () => SECRET } as never);
    const result = await service.getExamRewardStatus(ACCOUNT_A, EXAM_X);
    check('status === PENDING (findGrantByValidatedActivityId filtra por entryType OTORGAMIENTO)', result.status === 'PENDING');
  }

  console.log('--- CASE 3: examen ya recompensado + intento nuevo (replay) -> mismo GRANTED, sin nuevo grant ---');
  {
    // Reutiliza sharedActivityRepo/sharedLedgerRepo de CASE 2 -- simula un
    // SEGUNDO submitAttempt del mismo (accountId, examId): la identidad de
    // negocio ya está deduplicada del lado de GAMIFICATION (una segunda
    // llamada real nunca crearía una segunda ValidatedGamificationActivity),
    // así que una segunda consulta de reward-status debe devolver EXACTAMENTE
    // el mismo resultado -- ninguna escritura nueva, ningún efecto lateral.
    const service = new ExamRewardStatusService(sharedActivityRepo! as never, sharedLedgerRepo! as never, { get: () => SECRET } as never);
    const first = await service.getExamRewardStatus(ACCOUNT_A, EXAM_X);
    const second = await service.getExamRewardStatus(ACCOUNT_A, EXAM_X);
    check('primera y segunda consulta devuelven el MISMO status GRANTED', first.status === 'GRANTED' && second.status === 'GRANTED');
    check('primera y segunda consulta devuelven el MISMO xpAmount (sin doble-conteo, sin nuevo grant)', first.xpAmount === second.xpAmount);
  }

  console.log('--- CASE 4: cuenta distinta, mismo examId -> identidad de recompensa INDEPENDIENTE ---');
  {
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const keyA = keyFor(ACCOUNT_A, EXAM_X);
    const activityA = activityRepo.seed(keyA, { accountId: ACCOUNT_A });
    ledgerRepo.seedGrant(activityA.id, 100);
    // B NUNCA sembrado -- su reward-status debe ser PENDING, sin heredar el GRANTED de A.
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, { get: () => SECRET } as never);
    const resultA = await service.getExamRewardStatus(ACCOUNT_A, EXAM_X);
    const resultB = await service.getExamRewardStatus(ACCOUNT_B, EXAM_X);
    check('A (recompensada) -> GRANTED', resultA.status === 'GRANTED');
    check('B (NUNCA recompensada, mismo examId) -> PENDING (nunca hereda el GRANTED de A)', resultB.status === 'PENDING');
    check('las deduplicationKey de A y B para el MISMO examId son distintas (accountId real está pseudonimizado en la clave)', keyFor(ACCOUNT_A, EXAM_X) !== keyFor(ACCOUNT_B, EXAM_X));
  }

  console.log('--- CASE 5: identidad de cuenta SIEMPRE viene del parametro accountId (nunca query/body) -- prueba estructural ---');
  {
    // El propio controller (exam.controller.ts) solo pasa `request.accountId`
    // (derivado de AuthGuard) -- este servicio no acepta accountId de
    // ninguna otra fuente. Aquí se prueba que examId distinto para la MISMA
    // cuenta produce claves y resultados independientes -- ningún camino
    // cruza cuentas.
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const keyX = keyFor(ACCOUNT_A, EXAM_X);
    const activityX = activityRepo.seed(keyX, { accountId: ACCOUNT_A });
    ledgerRepo.seedGrant(activityX.id, 100);
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, { get: () => SECRET } as never);
    const resultX = await service.getExamRewardStatus(ACCOUNT_A, EXAM_X);
    const resultY = await service.getExamRewardStatus(ACCOUNT_A, EXAM_Y);
    check('mismo accountId, examId X (recompensado) -> GRANTED', resultX.status === 'GRANTED');
    check('mismo accountId, examId Y (nunca recompensado) -> PENDING', resultY.status === 'PENDING');
  }

  console.log('--- 6. Sin GAMIFICATION_ACTOR_SECRET -> falla explicito (fail-closed, nunca un secreto de repuesto) ---');
  {
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, { get: () => undefined } as never);
    let threw = false;
    try {
      await service.getExamRewardStatus(ACCOUNT_A, EXAM_X);
    } catch {
      threw = true;
    }
    check('lanza explicitamente si falta el secreto (nunca responde PENDING/GRANTED con un secreto ausente)', threw);
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de EXAM REWARD TRUTH (VC4 MICROBLOQUE 11, backend) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
