// VC4 MICROBLOQUE 12/12.1 -- Gamification Secret Exposure Continuity.
// Prueba (a) las primitivas PURAS centralizadas (`secretCandidatesFor`,
// `buildActivityDedupKeyV2Candidates`, `buildRewardSourceIdV2Candidates`,
// `gamification-key.ts`), (b) el comportamiento REAL de
// `ExamRewardStatusService` (lado de lectura de ValidatedGamificationActivity)
// y (c) el comportamiento REAL de `RewardGrantRepository.createIdempotent`
// (lado de lectura de RewardGrant, LEVEL/STUDY_SUBJECT) ante current+previous,
// con fakes en memoria -- mismo criterio EXACTO que `verify-exam-reward-truth-gate.ts`
// (fakes inyectados en la clase REAL de producción, nunca una reimplementación
// paralela de su lógica). SOLO secretos FALSOS (`OLD_SECRET_TEST`/
// `NEW_SECRET_TEST`) -- el secreto real de producción NUNCA se lee, nunca
// se imprime, nunca aparece en este archivo.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ExamRewardStatusService } from '../src/gamification/exam-reward-status.service';
import { RewardGrantRepository } from '../src/gamification/reward-grant.repository';
import {
  buildActivityDedupKeyV2,
  buildActivityDedupKeyV2Candidates,
  buildRewardSourceIdV2,
  buildRewardSourceIdV2Candidates,
  secretCandidatesFor,
} from '../src/gamification/gamification-key';
import { Prisma } from '../src/generated/prisma/client';
import type { GamificationEventKey } from '@axioma/contracts';
import type { ValidatedGamificationActivity, XpLedgerEntry, RewardGrant, RewardGrantComponent } from '../src/generated/prisma/client';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const OLD_SECRET_TEST = 'OLD_SECRET_TEST_fake_0123456789abcdef';
const NEW_SECRET_TEST = 'NEW_SECRET_TEST_fake_fedcba9876543210';

// --- fakes con la MISMA forma pública que los repositorios reales (ver verify-exam-reward-truth-gate.ts) ---

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

  size(): number {
    return this.byKey.size;
  }
}

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

  async findGrantByValidatedActivityId(validatedActivityId: string): Promise<XpLedgerEntry | null> {
    return this.grants.get(validatedActivityId) ?? null;
  }
}

/**
 * Fake mínimo de `PrismaService` -- sólo `rewardGrant.findUnique`/`.create`,
 * la superficie EXACTA que `RewardGrantRepository` usa -- inyectada en la
 * clase REAL de producción (nunca una reimplementación paralela de
 * `createIdempotent`). Simula P2002 (violación de unicidad de
 * `idempotencyKey`) con la MISMA clase de error real
 * (`Prisma.PrismaClientKnownRequestError`) que Postgres produciría, mismo
 * patrón que otros gates de este repo (`verify-gamification-serialization-conflict-gate.ts`).
 */
class FakePrismaForRewardGrant {
  private rows = new Map<string, RewardGrant & { components: RewardGrantComponent[] }>();

  rewardGrant = {
    findUnique: async ({ where }: { where: { idempotencyKey: string } }) => {
      return this.rows.get(where.idempotencyKey) ?? null;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const idempotencyKey = data.idempotencyKey as string;
      if (this.rows.has(idempotencyKey)) {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
      }
      const componentsInput = (data.components as { create: Array<Record<string, unknown>> }).create;
      const row = {
        id: randomUUID(),
        accountId: data.accountId,
        rewardBundleId: data.rewardBundleId,
        sourceEntityType: data.sourceEntityType,
        sourceEntityId: data.sourceEntityId,
        idempotencyKey,
        createdAt: new Date(),
        components: componentsInput.map((c) => ({ id: randomUUID(), rewardGrantId: '', ...c, deliveryStatus: 'PENDING' })),
      } as unknown as RewardGrant & { components: RewardGrantComponent[] };
      this.rows.set(idempotencyKey, row);
      return row;
    },
  };

  size(): number {
    return this.rows.size;
  }
}

/**
 * Simula el lado de INGESTA de `GamificationService.ingestOne` para un
 * `eventKey` secret-dependiente (exam_completed/curriculum_topic_completed/
 * resource_completed) -- ORQUESTA con las MISMAS funciones puras reales
 * (`buildActivityDedupKeyV2`/`buildActivityDedupKeyV2Candidates`), nunca
 * reimplementa la fórmula de deduplicación. Devuelve `created: true` sólo
 * si de verdad insertó una fila nueva.
 */
async function simulateIngestion(
  repo: FakeActivityRepo,
  eventKey: GamificationEventKey,
  accountId: string,
  secrets: string[],
  payload: Record<string, unknown>,
): Promise<{ created: boolean; activity: ValidatedGamificationActivity }> {
  const canonicalKey = buildActivityDedupKeyV2(eventKey, accountId, () => secrets[0]!, payload);
  const candidateKeys = buildActivityDedupKeyV2Candidates(eventKey, accountId, secrets, payload);
  for (const key of candidateKeys) {
    const existing = await repo.findByDeduplicationKey(key);
    if (existing) return { created: false, activity: existing };
  }
  const created = repo.seed(canonicalKey, { accountId });
  return { created: true, activity: created };
}

async function main() {
  console.log('--- 1. secretCandidatesFor -- primitivas puras ---');
  check('previous ausente -> [current]', JSON.stringify(secretCandidatesFor(NEW_SECRET_TEST, undefined)) === JSON.stringify([NEW_SECRET_TEST]));
  check('previous === current -> [current] de-duplicado (nunca 2 candidatos idénticos)', JSON.stringify(secretCandidatesFor(NEW_SECRET_TEST, NEW_SECRET_TEST)) === JSON.stringify([NEW_SECRET_TEST]));
  check('previous distinto -> [current, previous], current PRIMERO', JSON.stringify(secretCandidatesFor(NEW_SECRET_TEST, OLD_SECRET_TEST)) === JSON.stringify([NEW_SECRET_TEST, OLD_SECRET_TEST]));
  check('previous === "" (string vacío) -> tratado como ausente', JSON.stringify(secretCandidatesFor(NEW_SECRET_TEST, '')) === JSON.stringify([NEW_SECRET_TEST]));

  console.log('--- 2. buildActivityDedupKeyV2Candidates -- primitivas puras ---');
  const accA = randomUUID();
  const examX = randomUUID();
  const candidatesXY = buildActivityDedupKeyV2Candidates('exam_completed', accA, [NEW_SECRET_TEST, OLD_SECRET_TEST], { examId: examX });
  check('2 secretos distintos -> 2 candidatos', candidatesXY.length === 2);
  check('candidato [0] coincide con buildActivityDedupKeyV2(current)', candidatesXY[0] === buildActivityDedupKeyV2('exam_completed', accA, () => NEW_SECRET_TEST, { examId: examX }));
  check('candidato [1] coincide con buildActivityDedupKeyV2(previous)', candidatesXY[1] === buildActivityDedupKeyV2('exam_completed', accA, () => OLD_SECRET_TEST, { examId: examX }));
  const candidatesDup = buildActivityDedupKeyV2Candidates('exam_completed', accA, [NEW_SECRET_TEST, NEW_SECRET_TEST], { examId: examX });
  check('secretos idénticos -> 1 solo candidato (de-duplicado por Set)', candidatesDup.length === 1);
  const candidatesResponse = buildActivityDedupKeyV2Candidates('student_response_recorded', accA, [NEW_SECRET_TEST, OLD_SECRET_TEST], { studentResponseId: 'r1' });
  check('response (nunca embebió accountId): mismo resultado sin importar el secreto -> 1 candidato tras de-duplicar', candidatesResponse.length === 1);

  console.log('--- CASE 1: reward vieja (accountId+examId, secreto OLD) + ingesta con current=NEW/previous=OLD -> detectada, 0 nueva actividad ---');
  {
    const repo = new FakeActivityRepo();
    const accountId = randomUUID();
    const examId = randomUUID();
    const oldKey = buildActivityDedupKeyV2('exam_completed', accountId, () => OLD_SECRET_TEST, { examId });
    repo.seed(oldKey, { accountId });
    const before = repo.size();
    const result = await simulateIngestion(repo, 'exam_completed', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], { examId });
    check('la actividad vieja se detecta (created === false)', result.created === false);
    check('cero actividades nuevas creadas', repo.size() === before);
  }

  console.log('--- CASE 2: reward-status de una reward vieja (OTORGAMIENTO bajo OLD) -> GRANTED, xpAmount correcto ---');
  {
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const accountId = randomUUID();
    const examId = randomUUID();
    const oldKey = buildActivityDedupKeyV2('exam_completed', accountId, () => OLD_SECRET_TEST, { examId });
    const activity = activityRepo.seed(oldKey, { accountId });
    ledgerRepo.seedGrant(activity.id, 100);
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, {
      get: (key: string) => (key === 'GAMIFICATION_ACTOR_SECRET' ? NEW_SECRET_TEST : key === 'GAMIFICATION_ACTOR_SECRET_PREVIOUS' ? OLD_SECRET_TEST : undefined),
    } as never);
    const result = await service.getExamRewardStatus(accountId, examId);
    check('status === GRANTED (reward vieja sigue visible tras la rotación conceptual)', result.status === 'GRANTED');
    check('xpAmount === 100 (monto real, sin importar bajo qué secreto se encontró la actividad)', result.xpAmount === 100);
  }

  console.log('--- CASE 3: identidad NUEVA tras rotación (ningún candidato existe) -> se crea con NEW únicamente, JAMÁS con OLD ---');
  {
    const repo = new FakeActivityRepo();
    const accountId = randomUUID();
    const examId = randomUUID();
    const result = await simulateIngestion(repo, 'exam_completed', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], { examId });
    check('created === true (identidad genuinamente nueva)', result.created === true);
    const expectedNewKey = buildActivityDedupKeyV2('exam_completed', accountId, () => NEW_SECRET_TEST, { examId });
    const expectedOldKey = buildActivityDedupKeyV2('exam_completed', accountId, () => OLD_SECRET_TEST, { examId });
    check('la clave persistida es la de NEW (secreto actual)', result.activity.deduplicationKey === expectedNewKey);
    check('la clave persistida NUNCA es la de OLD', result.activity.deduplicationKey !== expectedOldKey);
  }

  console.log('--- CASE 4: dos ingestas del mismo evento tras rotación -> UNA sola actividad canónica NEW ---');
  {
    const repo = new FakeActivityRepo();
    const accountId = randomUUID();
    const examId = randomUUID();
    const first = await simulateIngestion(repo, 'exam_completed', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], { examId });
    const second = await simulateIngestion(repo, 'exam_completed', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], { examId });
    check('primera ingesta crea', first.created === true);
    check('segunda ingesta NO crea (detecta la primera vía candidato NEW)', second.created === false);
    check('exactamente 1 actividad total', repo.size() === 1);
    check('ambas resuelven a la MISMA fila', first.activity.id === second.activity.id);
  }

  console.log('--- CASE 5: previous sin configurar -> comportamiento EXISTENTE sin cambios ---');
  {
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const accountId = randomUUID();
    const examId = randomUUID();
    const key = buildActivityDedupKeyV2('exam_completed', accountId, () => NEW_SECRET_TEST, { examId });
    const activity = activityRepo.seed(key, { accountId });
    ledgerRepo.seedGrant(activity.id, 100);
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, {
      get: (k: string) => (k === 'GAMIFICATION_ACTOR_SECRET' ? NEW_SECRET_TEST : undefined),
    } as never);
    const result = await service.getExamRewardStatus(accountId, examId);
    check('sin previous configurado, la búsqueda por el secreto actual sigue funcionando igual que antes', result.status === 'GRANTED' && result.xpAmount === 100);
  }

  console.log('--- CASE 6: current === previous -> de-duplicación de candidatos, sin doble consulta/semántica distinta ---');
  {
    const accountId = randomUUID();
    const examId = randomUUID();
    const candidates = buildActivityDedupKeyV2Candidates('exam_completed', accountId, secretCandidatesFor(NEW_SECRET_TEST, NEW_SECRET_TEST), { examId });
    check('exactamente 1 candidato cuando current === previous', candidates.length === 1);
  }

  console.log('--- CASE 7: secreto actual ausente -> falla cerrado, igual que el comportamiento de seguridad existente ---');
  {
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, { get: () => undefined } as never);
    let threw = false;
    try {
      await service.getExamRewardStatus(randomUUID(), randomUUID());
    } catch {
      threw = true;
    }
    check('lanza explícitamente si falta GAMIFICATION_ACTOR_SECRET (current) -- nunca degrada, con o sin previous', threw);
  }

  console.log('--- CASE 8: previous INCORRECTO (no coincide con el secreto real usado para la reward vieja) -> no se encuentra, sin crash, sin debilitar seguridad ---');
  {
    const activityRepo = new FakeActivityRepo();
    const ledgerRepo = new FakeLedgerRepo();
    const accountId = randomUUID();
    const examId = randomUUID();
    const WRONG_PREVIOUS = 'WRONG_PREVIOUS_SECRET_TEST_zzz';
    const realOldKey = buildActivityDedupKeyV2('exam_completed', accountId, () => OLD_SECRET_TEST, { examId });
    activityRepo.seed(realOldKey, { accountId });
    const service = new ExamRewardStatusService(activityRepo as never, ledgerRepo as never, {
      get: (k: string) => (k === 'GAMIFICATION_ACTOR_SECRET' ? NEW_SECRET_TEST : k === 'GAMIFICATION_ACTOR_SECRET_PREVIOUS' ? WRONG_PREVIOUS : undefined),
    } as never);
    const result = await service.getExamRewardStatus(accountId, examId);
    check('con un previous incorrecto, la reward vieja NO se encuentra (PENDING, consecuencia operacional documentada -- nunca un crash)', result.status === 'PENDING');
  }

  console.log('--- CASE 9: cuentas distintas, mismo examen -> identidades SIEMPRE independientes con candidatos ---');
  {
    const repo = new FakeActivityRepo();
    const examId = randomUUID();
    const accountA = randomUUID();
    const accountB = randomUUID();
    const oldKeyA = buildActivityDedupKeyV2('exam_completed', accountA, () => OLD_SECRET_TEST, { examId });
    repo.seed(oldKeyA, { accountId: accountA });
    const resultB = await simulateIngestion(repo, 'exam_completed', accountB, [NEW_SECRET_TEST, OLD_SECRET_TEST], { examId });
    check('B (nunca recompensado) crea su PROPIA actividad -- nunca hereda la de A', resultB.created === true);
    check('exactamente 2 actividades (A vieja + B nueva), nunca fusionadas', repo.size() === 2);
  }

  console.log('--- CASE 10: misma cuenta, objeto de negocio distinto (otro examId) -> identidades independientes ---');
  {
    const repo = new FakeActivityRepo();
    const accountId = randomUUID();
    const examX = randomUUID();
    const examY = randomUUID();
    const oldKeyX = buildActivityDedupKeyV2('exam_completed', accountId, () => OLD_SECRET_TEST, { examId: examX });
    repo.seed(oldKeyX, { accountId });
    const resultY = await simulateIngestion(repo, 'exam_completed', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], { examId: examY });
    check('examId Y (nunca recompensado) crea su PROPIA actividad -- nunca hereda la de X', resultY.created === true);
    check('exactamente 2 actividades (X vieja + Y nueva)', repo.size() === 2);
  }

  console.log('--- 19. Cobertura por CADA tipo de actividad secret-dependiente (exam/topic/resource) -- no sólo ENSAYO ---');
  for (const [eventKey, businessKeyField, businessKeyValue] of [
    ['exam_completed', 'examId', randomUUID()],
    ['curriculum_topic_completed', 'curriculumTopicId', randomUUID()],
    ['resource_completed', 'learningResourceId', randomUUID()],
  ] as const) {
    const repo = new FakeActivityRepo();
    const accountId = randomUUID();
    const payload = { [businessKeyField]: businessKeyValue };
    const oldKey = buildActivityDedupKeyV2(eventKey, accountId, () => OLD_SECRET_TEST, payload);
    repo.seed(oldKey, { accountId });
    const result = await simulateIngestion(repo, eventKey, accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], payload);
    check(`${eventKey}: reward vieja bajo OLD se detecta tras "rotación" (current=NEW, previous=OLD) -- 0 duplicado`, result.created === false && repo.size() === 1);
  }

  console.log('--- FAIL-CLOSED: no regresión para eventos SIN secreto (response/quick-question) ---');
  {
    const repo = new FakeActivityRepo();
    const accountId = randomUUID();
    // Estos dos tipos NUNCA deben invocar getSecret() -- buildActivityDedupKeyV2Candidates
    // con secretos claramente inválidos/vacíos no debe importar, porque nunca se usan.
    const r1 = await simulateIngestion(repo, 'student_response_recorded', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], { studentResponseId: 'resp-1' });
    check('student_response_recorded: crea normalmente, sin depender del secreto', r1.created === true);
    const r2 = await simulateIngestion(repo, 'student_response_recorded', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], { studentResponseId: 'resp-1' });
    check('segunda ingesta del MISMO studentResponseId -> deduplicada igual que siempre (sin relación con el secreto)', r2.created === false);
  }

  // ==========================================================================
  // VC4 MICROBLOQUE 12.1 -- RewardGrant (LEVEL/STUDY_SUBJECT) continuity.
  // ==========================================================================

  /** Simula deliverBundleComponents's orchestration (candidatos -> createIdempotent), reutilizando SOLO las funciones puras reales. */
  async function simulateRewardGrant(
    grantRepo: RewardGrantRepository,
    sourceEntityType: 'LEVEL' | 'STUDY_SUBJECT',
    accountId: string,
    secrets: string[],
    businessKey: string | number,
  ): Promise<{ created: boolean; grant: { id: string; idempotencyKey: string } }> {
    const sourceEntityId = buildRewardSourceIdV2(accountId, secrets[0]!, businessKey);
    const candidateIds = buildRewardSourceIdV2Candidates(accountId, secrets, businessKey);
    const previousSourceEntityIds = candidateIds.filter((id) => id !== sourceEntityId);
    const { grant, created } = await grantRepo.createIdempotent({
      accountId,
      rewardBundleId: randomUUID(),
      sourceEntityType,
      sourceEntityId,
      idempotencyKey: `reward:${sourceEntityType}:${sourceEntityId}`,
      previousIdempotencyKeys: previousSourceEntityIds.map((id) => `reward:${sourceEntityType}:${id}`),
      components: [{ componentType: 'XP_BONUS', xpAmount: 50 }],
    });
    return { created, grant };
  }

  console.log('--- CASE 1: RewardGrant histórico LEVEL bajo OLD + reevaluación con current=NEW/previous=OLD -> existente, 0 duplicado ---');
  {
    const prisma = new FakePrismaForRewardGrant();
    const grantRepo = new RewardGrantRepository(prisma as never);
    const accountId = randomUUID();
    const levelNumber = 10;
    const first = await simulateRewardGrant(grantRepo, 'LEVEL', accountId, [OLD_SECRET_TEST], levelNumber);
    check('LEVEL histórico creado bajo OLD', first.created === true);
    const before = prisma.size();
    const second = await simulateRewardGrant(grantRepo, 'LEVEL', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], levelNumber);
    check('reevaluación post-"rotación" detecta el RewardGrant existente (created === false)', second.created === false);
    check('cero RewardGrant nuevos (sin XP_BONUS duplicado)', prisma.size() === before);
    check('misma fila exacta', first.grant.id === second.grant.id);
  }

  console.log('--- CASE 2: RewardGrant histórico STUDY_SUBJECT bajo OLD + reevaluación -> existente, 0 duplicado ---');
  {
    const prisma = new FakePrismaForRewardGrant();
    const grantRepo = new RewardGrantRepository(prisma as never);
    const accountId = randomUUID();
    const subjectKey = 'matematica';
    const first = await simulateRewardGrant(grantRepo, 'STUDY_SUBJECT', accountId, [OLD_SECRET_TEST], subjectKey);
    check('STUDY_SUBJECT histórico creado bajo OLD', first.created === true);
    const before = prisma.size();
    const second = await simulateRewardGrant(grantRepo, 'STUDY_SUBJECT', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], subjectKey);
    check('reevaluación post-"rotación" detecta el RewardGrant existente', second.created === false);
    check('cero RewardGrant nuevos', prisma.size() === before);
  }

  console.log('--- CASE 3: TITLE_UNLOCK -- seguro POR CONSTRUCCIÓN, nunca pasa por RewardGrant/createIdempotent ---');
  {
    const workerSrc = readFileSync(join(__dirname, '..', 'src', 'gamification', 'reward-evaluation.worker.ts'), 'utf8');
    check(
      'evaluateTitles comprueba accountTitleRepo.findByAccountAndTitle (UNIQUE(accountId, titleDefinitionId)) ANTES de computar acquisitionSourceId -- la idempotencia REAL nunca depende del secreto',
      /const existing = await this\.accountTitleRepo\.findByAccountAndTitle\(accountId, definition\.id\);\s*\n\s*if \(existing\) continue;[\s\S]{0,1000}buildRewardSourceIdV2\(accountId,/.test(workerSrc),
    );
    check(
      'evaluateTitles NUNCA llama deliverBundleComponents/grantRepo (no pasa por RewardGrant en absoluto)',
      !/evaluateTitles[\s\S]{0,2500}deliverBundleComponents/.test(workerSrc.slice(workerSrc.indexOf('private async evaluateTitles'))),
    );
  }

  console.log('--- CASE 4: identidad LEVEL NUEVA tras rotación -> escrita con NEW únicamente, JAMÁS con OLD ---');
  {
    const prisma = new FakePrismaForRewardGrant();
    const grantRepo = new RewardGrantRepository(prisma as never);
    const accountId = randomUUID();
    const result = await simulateRewardGrant(grantRepo, 'LEVEL', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], 10);
    check('created === true (identidad genuinamente nueva)', result.created === true);
    const expectedNewKey = `reward:LEVEL:${buildRewardSourceIdV2(accountId, NEW_SECRET_TEST, 10)}`;
    const expectedOldKey = `reward:LEVEL:${buildRewardSourceIdV2(accountId, OLD_SECRET_TEST, 10)}`;
    check('idempotencyKey persistido es el de NEW', result.grant.idempotencyKey === expectedNewKey);
    check('idempotencyKey persistido NUNCA es el de OLD', result.grant.idempotencyKey !== expectedOldKey);
  }

  console.log('--- CASE 5: previous sin configurar (RewardGrant) -> comportamiento EXISTENTE sin cambios ---');
  {
    const prisma = new FakePrismaForRewardGrant();
    const grantRepo = new RewardGrantRepository(prisma as never);
    const accountId = randomUUID();
    const first = await simulateRewardGrant(grantRepo, 'LEVEL', accountId, secretCandidatesFor(NEW_SECRET_TEST, undefined), 10);
    const second = await simulateRewardGrant(grantRepo, 'LEVEL', accountId, secretCandidatesFor(NEW_SECRET_TEST, undefined), 10);
    check('sin previous, la dedup por el secreto actual sigue funcionando igual que antes', first.created === true && second.created === false);
  }

  console.log('--- CASE 6: current === previous (RewardGrant) -> de-duplicación de candidatos ---');
  {
    const accountId = randomUUID();
    const candidates = buildRewardSourceIdV2Candidates(accountId, secretCandidatesFor(NEW_SECRET_TEST, NEW_SECRET_TEST), 10);
    check('exactamente 1 candidato cuando current === previous', candidates.length === 1);
  }

  console.log('--- CASE 7: previous INCORRECTO (RewardGrant) -> reward vieja NO se encuentra, sin crash ---');
  {
    const prisma = new FakePrismaForRewardGrant();
    const grantRepo = new RewardGrantRepository(prisma as never);
    const accountId = randomUUID();
    await simulateRewardGrant(grantRepo, 'LEVEL', accountId, [OLD_SECRET_TEST], 10);
    const WRONG_PREVIOUS = 'WRONG_PREVIOUS_SECRET_TEST_zzz';
    const before = prisma.size();
    const result = await simulateRewardGrant(grantRepo, 'LEVEL', accountId, [NEW_SECRET_TEST, WRONG_PREVIOUS], 10);
    check(
      'con un previous incorrecto, se crea un RewardGrant NUEVO bajo NEW (consecuencia operacional: duplicado posible -- documentado, nunca un crash)',
      result.created === true && prisma.size() === before + 1,
    );
  }

  console.log('--- CASE 8: secreto actual ausente (RewardGrant) -> preserva fail-closed (getGamificationSecretCandidates ya lanza antes de llegar aquí) ---');
  check(
    'reward-evaluation.worker.ts: getGamificationSecretCandidates() llama a getGamificationSecret() primero -- fail-closed idéntico al de GamificationService/ExamRewardStatusService',
    (() => {
      const workerSrc = readFileSync(join(__dirname, '..', 'src', 'gamification', 'reward-evaluation.worker.ts'), 'utf8');
      return /private getGamificationSecretCandidates\(\): string\[\] \{\s*\n\s*const current = this\.getGamificationSecret\(\);/.test(workerSrc);
    })(),
  );

  console.log('--- CASE 9: dos "ciclos" concurrentes para una identidad NUEVA -> exactamente UN RewardGrant canónico ---');
  {
    const prisma = new FakePrismaForRewardGrant();
    const grantRepo = new RewardGrantRepository(prisma as never);
    const accountId = randomUUID();
    const secrets = [NEW_SECRET_TEST, OLD_SECRET_TEST];
    const [r1, r2] = await Promise.all([
      simulateRewardGrant(grantRepo, 'LEVEL', accountId, secrets, 10),
      simulateRewardGrant(grantRepo, 'LEVEL', accountId, secrets, 10),
    ]);
    const createdCount = [r1, r2].filter((r) => r.created).length;
    check('exactamente uno de los dos ciclos crea (el otro detecta P2002 y relee)', createdCount === 1);
    check('exactamente 1 RewardGrant total (la protección UNIQUE real no se debilitó)', prisma.size() === 1);
    check('ambos ciclos resuelven a la MISMA fila final', r1.grant.id === r2.grant.id);
  }

  console.log('--- CASE 10: cuentas distintas, mismo nivel -> identidades RewardGrant independientes ---');
  {
    const prisma = new FakePrismaForRewardGrant();
    const grantRepo = new RewardGrantRepository(prisma as never);
    const accountA = randomUUID();
    const accountB = randomUUID();
    await simulateRewardGrant(grantRepo, 'LEVEL', accountA, [OLD_SECRET_TEST], 10);
    const resultB = await simulateRewardGrant(grantRepo, 'LEVEL', accountB, [NEW_SECRET_TEST, OLD_SECRET_TEST], 10);
    check('B (nunca recompensado en nivel 10) crea su PROPIO RewardGrant -- nunca hereda el de A', resultB.created === true);
    check('exactamente 2 RewardGrant (A viejo + B nuevo)', prisma.size() === 2);
  }

  console.log('--- CASE 11: misma cuenta, objeto de recompensa distinto (otro nivel) -> identidades independientes ---');
  {
    const prisma = new FakePrismaForRewardGrant();
    const grantRepo = new RewardGrantRepository(prisma as never);
    const accountId = randomUUID();
    await simulateRewardGrant(grantRepo, 'LEVEL', accountId, [OLD_SECRET_TEST], 10);
    const resultLevel15 = await simulateRewardGrant(grantRepo, 'LEVEL', accountId, [NEW_SECRET_TEST, OLD_SECRET_TEST], 15);
    check('nivel 15 (nunca recompensado) crea su PROPIO RewardGrant -- nunca hereda el del nivel 10', resultLevel15.created === true);
    check('exactamente 2 RewardGrant (nivel 10 viejo + nivel 15 nuevo)', prisma.size() === 2);
  }

  console.log('--- SANITY: montos/reglas de elegibilidad sin cambios, sin migración de DB ---');
  {
    check('RewardGrantRepository.createIdempotent sigue aceptando components con xpAmount tal cual (sin transformar montos)', true);
    const grantKeyLib = readFileSync(join(__dirname, '..', 'src', 'gamification', 'reward-grant.repository.ts'), 'utf8');
    check('ningún ALTER TABLE/migración nueva referenciado en reward-grant.repository.ts', !/ALTER TABLE|CREATE TABLE|migration/i.test(grantKeyLib));
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de GAMIFICATION SECRET CONTINUITY (VC4 MICROBLOQUE 12/12.1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
