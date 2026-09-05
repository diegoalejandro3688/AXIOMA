/**
 * STABILIZATION-B6A -- reconciliación retroactiva de avatares históricos V1.
 * Los 5 primeros avatares históricos son recompensas de MAESTRÍA DE MATERIA
 * (ver cosmetics-v1-catalog.ts, HISTORIC_AVATAR_SUBJECT_MAP): se otorgan al
 * completar TODAS las unidades canónicas V1 de la materia mapeada. Una cuenta
 * con evidencia DURABLE de haber completado la materia entera ANTES de este
 * cambio debe recibir su avatar ahora, vía el MISMO mecanismo genérico de
 * entrega (`RewardEvaluationWorker.deliverBundleComponents`, fuente
 * STUDY_SUBJECT) -- nunca un InventoryItem insertado a mano.
 *
 * Supera a la reconciliación anterior por unidad (HISTORIC_AVATAR_UNIT_MAP,
 * retirada): una cuenta que sólo completó la unidad antes mapeada -- y no la
 * materia entera -- NO califica.
 *
 * Idempotente: reutiliza el mismo `idempotencyKey =
 * reward:STUDY_SUBJECT:{accountId}:{subjectKey}` que el camino orgánico
 * (`RewardEvaluationWorker.evaluateHistoricalAvatars`) -- correr N veces
 * produce el mismo estado, nunca duplica ni revoca.
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
import { HISTORIC_AVATAR_SUBJECT_MAP } from '../src/gamification/cosmetics-v1-catalog';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { TitleEligibilityService } from '../src/gamification/title-eligibility.service';
import { SubjectCompletionService } from '../src/gamification/subject-completion.service';
import { SubjectRepository } from '../src/education/subject.repository';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

export interface ReconcileHistoricalAvatarsResult {
  perSubject: { itemKey: string; subjectKey: string; qualifyingAccounts: number; delivered: number; failed: number }[];
}

export async function reconcileHistoricalAvatarsV1({ dryRun }: { dryRun: boolean }): Promise<ReconcileHistoricalAvatarsResult> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const rawPrisma = prisma as unknown as { $queryRawUnsafe: <T>(query: string, ...values: unknown[]) => Promise<T> };

  try {
    const curriculumTopicRepo = new CurriculumTopicRepository(prisma);
    const curriculumTopicProgressRepo = new CurriculumTopicProgressRepository(prisma);
    const subjectRepo = new SubjectRepository(prisma);
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
      new TitleEligibilityService(prisma, subjectRepo, curriculumTopicRepo, curriculumTopicProgressRepo, new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo)),
      new SubjectCompletionService(curriculumTopicRepo, curriculumTopicProgressRepo, subjectRepo),
    );

    console.log(`=== AVATARES HISTÓRICOS V1 -- reconciliación retroactiva por MATERIA ${dryRun ? '(DRY RUN, no escribe)' : ''} ===\n`);

    const perSubject: ReconcileHistoricalAvatarsResult['perSubject'] = [];

    for (const [itemKey, subjectKey] of Object.entries(HISTORIC_AVATAR_SUBJECT_MAP)) {
      const subject = await subjectRepo.findByKey(subjectKey);
      if (!subject) {
        console.error(`  AUSENTE  materia "${subjectKey}" no existe -- ${itemKey} omitido.`);
        perSubject.push({ itemKey, subjectKey, qualifyingAccounts: 0, delivered: 0, failed: 0 });
        continue;
      }

      const bundle = await bundleRepo.findByBundleKey(`cosmetics-v1-historic-${itemKey}`);
      if (!bundle) {
        console.error(`  SIN-BUNDLE  bundle "cosmetics-v1-historic-${itemKey}" no existe todavía (correr cosmetics:seed-v1 primero) -- omitido.`);
        perSubject.push({ itemKey, subjectKey, qualifyingAccounts: 0, delivered: 0, failed: 0 });
        continue;
      }

      const units = await curriculumTopicRepo.findCanonicalUnitRootsBySubjectId(subject.id);
      if (units.length === 0) {
        console.error(`  SIN-UNIDADES  materia "${subjectKey}" no tiene unidades canónicas -- omitida.`);
        perSubject.push({ itemKey, subjectKey, qualifyingAccounts: 0, delivered: 0, failed: 0 });
        continue;
      }

      // Recursos canónicos de TODAS las unidades de la materia. Si alguna
      // unidad no tiene recursos canónicos, la materia no es completable --
      // nadie califica (mismo criterio que SubjectCompletionService).
      const allChildIds: string[] = [];
      let uncompletable = false;
      for (const unit of units) {
        const childIds = await curriculumTopicRepo.findCanonicalResourceChildIds(unit.id);
        if (childIds.length === 0) {
          uncompletable = true;
          break;
        }
        allChildIds.push(...childIds);
      }
      if (uncompletable) {
        console.error(`  INCOMPLETABLE  materia "${subjectKey}" tiene una unidad sin recursos canónicos -- omitida.`);
        perSubject.push({ itemKey, subjectKey, qualifyingAccounts: 0, delivered: 0, failed: 0 });
        continue;
      }

      // Cuentas cuyo conteo de progreso COMPLETED sobre EXACTAMENTE el
      // conjunto completo de recursos canónicos de la materia iguala el
      // total -- única prueba de "materia completa", nunca una completitud
      // aislada ni TEMA_COMPLETADO.
      const rows = await rawPrisma.$queryRawUnsafe<{ account_id: string }[]>(
        `SELECT account_id FROM curriculum_topic_progress
         WHERE curriculum_topic_id = ANY($1::uuid[]) AND status = 'COMPLETED'
         GROUP BY account_id
         HAVING count(*) = $2`,
        allChildIds,
        allChildIds.length,
      );

      let delivered = 0;
      let failed = 0;
      for (const row of rows) {
        if (dryRun) {
          console.log(`  [dry-run] entregaría "${itemKey}" (materia ${subjectKey}) a la cuenta ${row.account_id}`);
          delivered++;
          continue;
        }
        const { allResolved } = await worker.deliverBundleComponents(row.account_id, bundle, 'STUDY_SUBJECT', `${row.account_id}:${subjectKey}`);
        if (allResolved) delivered++;
        else failed++;
      }
      console.log(`  ${itemKey} / ${subjectKey}: ${rows.length} cuenta(s) califican, ${delivered} entregada(s)/confirmada(s), ${failed} fallida(s).`);
      perSubject.push({ itemKey, subjectKey, qualifyingAccounts: rows.length, delivered, failed });
    }

    console.log(dryRun ? '\n=== DRY RUN OK ===' : '\n=== RECONCILIACIÓN COMPLETA ===');
    return { perSubject };
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
