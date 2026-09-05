/**
 * STABILIZATION-B -- reconciliación retroactiva de avatares históricos V1.
 * Los 5 avatares dejaron de ser Starter Kit (ver cosmetics-v1-catalog.ts,
 * HISTORIC_AVATAR_UNIT_MAP); una cuenta que YA había completado la unidad
 * canónica mapeada ANTES de este cambio debe recibir su avatar histórico
 * ahora, vía el MISMO mecanismo genérico de entrega
 * (`RewardEvaluationWorker.deliverBundleComponents`, fuente STUDY_UNIT) --
 * nunca un InventoryItem insertado a mano.
 *
 * Idempotente: reutiliza el mismo `idempotencyKey = reward:STUDY_UNIT:{unitId}`
 * que el camino orgánico -- correr N veces produce el mismo estado, nunca
 * duplica ni revoca.
 *
 * Uso:
 *   pnpm --filter @axioma/backend avatars:reconcile-historical-v1 -- --dry-run
 *   pnpm --filter @axioma/backend avatars:reconcile-historical-v1
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { ProgressionService } from '../src/gamification/progression.service';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { RewardGrantRepository } from '../src/gamification/reward-grant.repository';
import { RewardGrantComponentRepository } from '../src/gamification/reward-grant-component.repository';
import { RewardEvaluationCursorRepository } from '../src/gamification/reward-evaluation-cursor.repository';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import { AchievementProgressRepository } from '../src/gamification/achievement-progress.repository';
import { AchievementUnlockRepository } from '../src/gamification/achievement-unlock.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { AccountChallengeRepository } from '../src/gamification/account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from '../src/gamification/account-challenge-daily-progress.repository';
import { AccountChallengeConsumedEventRepository } from '../src/gamification/account-challenge-consumed-event.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { CurriculumTopicRepository } from '../src/education/curriculum-topic.repository';
import { CurriculumTopicProgressRepository } from '../src/progress/curriculum-topic-progress.repository';
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { HISTORIC_AVATAR_UNIT_MAP } from '../src/gamification/cosmetics-v1-catalog';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { TitleEligibilityService } from '../src/gamification/title-eligibility.service';
import { SubjectRepository } from '../src/education/subject.repository';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

export interface ReconcileHistoricalAvatarsResult {
  perUnit: { unitCode: string; qualifyingAccounts: number; delivered: number; alreadyOwned: number; failed: number }[];
}

export async function reconcileHistoricalAvatarsV1({ dryRun }: { dryRun: boolean }): Promise<ReconcileHistoricalAvatarsResult> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const rawPrisma = prisma as unknown as { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> };

  try {
    const curriculumTopicRepo = new CurriculumTopicRepository(prisma);
    const curriculumTopicProgressRepo = new CurriculumTopicProgressRepository(prisma);
    const bundleRepo = new RewardBundleRepository(prisma);
    const ledgerRepo = new XpLedgerEntryRepository(prisma);
    const balanceRepo = new XpBalanceRepository(prisma);
    const levelDefRepo = new LevelDefinitionRepository(prisma);
    const worker = new RewardEvaluationWorker(
      prisma,
      ledgerRepo,
      new RewardEvaluationCursorRepository(prisma),
      balanceRepo,
      new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo),
      levelDefRepo,
      bundleRepo,
      new RewardGrantRepository(prisma),
      new RewardGrantComponentRepository(prisma),
      new TransactionRunnerService(prisma),
      new AchievementDefinitionRepository(prisma),
      new AchievementVersionRepository(prisma),
      new AchievementProgressRepository(prisma),
      new AchievementUnlockRepository(prisma),
      new AccountTitleRepository(prisma),
      new InventoryItemRepository(prisma),
      new ChallengeDefinitionRepository(prisma),
      new AccountChallengeRepository(prisma),
      new AccountChallengeDailyProgressRepository(prisma),
      new AccountChallengeConsumedEventRepository(prisma),
      new ValidatedGamificationActivityRepository(prisma),
      curriculumTopicRepo,
      curriculumTopicProgressRepo,
      new TitleDefinitionRepository(prisma),
      new TitleEligibilityService(prisma, new SubjectRepository(prisma), curriculumTopicRepo, curriculumTopicProgressRepo, new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo)),
    );

    console.log(`=== AVATARES HISTÓRICOS V1 -- reconciliación retroactiva ${dryRun ? '(DRY RUN, no escribe)' : ''} ===\n`);

    const perUnit: ReconcileHistoricalAvatarsResult['perUnit'] = [];

    for (const unitCode of new Set(Object.values(HISTORIC_AVATAR_UNIT_MAP))) {
      const unit = await curriculumTopicRepo.findByCode(unitCode);
      if (!unit) {
        console.error(`  AUSENTE  unidad "${unitCode}" no existe -- omitida.`);
        perUnit.push({ unitCode, qualifyingAccounts: 0, delivered: 0, alreadyOwned: 0, failed: 0 });
        continue;
      }
      if (!unit.rewardBundleId) {
        console.error(`  SIN-BUNDLE  unidad "${unitCode}" no tiene reward_bundle_id todavía (correr cosmetics:seed-v1 primero) -- omitida.`);
        perUnit.push({ unitCode, qualifyingAccounts: 0, delivered: 0, alreadyOwned: 0, failed: 0 });
        continue;
      }

      const childIds = await curriculumTopicRepo.findCanonicalResourceChildIds(unit.id);
      if (childIds.length === 0) {
        console.error(`  SIN-RECURSOS  unidad "${unitCode}" no tiene recursos canónicos -- omitida.`);
        perUnit.push({ unitCode, qualifyingAccounts: 0, delivered: 0, alreadyOwned: 0, failed: 0 });
        continue;
      }

      // Cuentas cuyo conteo de progreso COMPLETED sobre exactamente estos
      // childIds iguala el total -- única prueba de "unidad completa",
      // nunca una completitud aislada ni TEMA_COMPLETADO.
      const rows = await rawPrisma.$queryRawUnsafe<{ account_id: string }[]>(
        `SELECT account_id FROM curriculum_topic_progress
         WHERE curriculum_topic_id = ANY($1::uuid[]) AND status = 'COMPLETED'
         GROUP BY account_id
         HAVING count(*) = $2`,
        childIds,
        childIds.length,
      );

      let delivered = 0;
      let alreadyOwned = 0;
      let failed = 0;
      const bundle = await bundleRepo.findById(unit.rewardBundleId);
      for (const row of rows) {
        if (dryRun) {
          console.log(`  [dry-run] entregaría avatar histórico de "${unitCode}" a la cuenta ${row.account_id}`);
          delivered++;
          continue;
        }
        if (!bundle) {
          failed++;
          continue;
        }
        // `sourceEntityId` incluye accountId -- mismo criterio que el
        // camino orgánico (`RewardEvaluationWorker.evaluateHistoricalAvatars`),
        // evita la colisión de idempotencyKey entre cuentas distintas.
        const { allResolved } = await worker.deliverBundleComponents(row.account_id, bundle, 'STUDY_UNIT', `${row.account_id}:${unit.id}`);
        if (allResolved) delivered++;
        else failed++;
      }
      console.log(`  ${unitCode}: ${rows.length} cuenta(s) califican, ${delivered} entregada(s)/confirmada(s), ${failed} fallida(s).`);
      perUnit.push({ unitCode, qualifyingAccounts: rows.length, delivered, alreadyOwned, failed });
    }

    console.log(dryRun ? '\n=== DRY RUN OK ===' : '\n=== RECONCILIACIÓN COMPLETA ===');
    return { perUnit };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  reconcileHistoricalAvatarsV1({ dryRun: process.argv.slice(2).includes('--dry-run') }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
