/**
 * TITLES-V1 -- reconciliación retroactiva. Una cuenta cuyo estado DURABLE
 * ya satisface el umbral de un título (recursos/unidades/exámenes/desafíos/
 * nivel/liga) ANTES de que `titles:seed-v1` corriera, o antes de que el
 * worker en vivo la haya vuelto a evaluar, recibe ese título AHORA -- por
 * el MISMO camino que la evaluación en vivo
 * (`TitleEligibilityService.evaluateMetric` + `AccountTitleRepository.
 * createIdempotent`), nunca una fila insertada a mano.
 *
 * Ascendente (LEAGUE_TIER_REACHED) usa evidencia DURABLE real
 * (`season_league_participation` histórica, cualquier temporada) -- jamás
 * infiere ni fabrica un peak no probado.
 *
 * Idempotente y NUNCA revoca: correr N veces sobre el mismo estado no
 * duplica ninguna fila (`AccountTitleRepository.createIdempotent`,
 * UNIQUE(accountId, titleDefinitionId)) y nunca borra/(SUPERSEDED/REVOKED)
 * una fila existente -- este script solo AÑADE.
 *
 * Uso:
 *   pnpm --filter @axioma/backend titles:reconcile-v1 -- --dry-run
 *   pnpm --filter @axioma/backend titles:reconcile-v1
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { ProgressionService } from '../src/gamification/progression.service';
import { SubjectRepository } from '../src/education/subject.repository';
import { CurriculumTopicRepository } from '../src/education/curriculum-topic.repository';
import { CurriculumTopicProgressRepository } from '../src/progress/curriculum-topic-progress.repository';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { TitleEligibilityService } from '../src/gamification/title-eligibility.service';
import { TITLES_V1 } from '../src/gamification/titles-v1-catalog';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

export interface ReconcileTitlesResult {
  perTitle: { titleKey: string; qualifyingAccounts: number; granted: number; alreadyOwned: number; failed: number }[];
}

export async function reconcileTitlesV1({ dryRun, accountIds }: { dryRun: boolean; accountIds?: string[] }): Promise<ReconcileTitlesResult> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const rawPrisma = prisma as unknown as { $queryRawUnsafe: <T>(query: string) => Promise<T> };

  try {
    const balanceRepo = new XpBalanceRepository(prisma);
    const ledgerRepo = new XpLedgerEntryRepository(prisma);
    const levelDefRepo = new LevelDefinitionRepository(prisma);
    const progressionService = new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo);
    const subjectRepo = new SubjectRepository(prisma);
    const curriculumTopicRepo = new CurriculumTopicRepository(prisma);
    const curriculumTopicProgressRepo = new CurriculumTopicProgressRepository(prisma);
    const titleDefinitionRepo = new TitleDefinitionRepository(prisma);
    const accountTitleRepo = new AccountTitleRepository(prisma);
    const titleEligibilityService = new TitleEligibilityService(prisma, subjectRepo, curriculumTopicRepo, curriculumTopicProgressRepo, progressionService);

    console.log(`=== TITLES-V1 -- reconciliación retroactiva ${dryRun ? '(DRY RUN, no escribe)' : ''} ===\n`);

    // `accountIds` es un filtro OPCIONAL solo para acotar el alcance en
    // pruebas/gates (evita un full-scan de toda la tabla `account` en una
    // base con miles de filas) -- el uso real vía CLI (`titles:reconcile-
    // v1`, sin argumento) siempre recorre TODAS las cuentas.
    const accountRows = accountIds
      ? accountIds.map((id) => ({ id }))
      : await rawPrisma.$queryRawUnsafe<{ id: string }[]>('SELECT id FROM account');
    console.log(`Cuentas a evaluar: ${accountRows.length}\n`);

    const result: ReconcileTitlesResult = { perTitle: [] };

    for (const entry of TITLES_V1) {
      const definition = await titleDefinitionRepo.findByTitleKey(entry.titleKey);
      if (!definition) {
        console.log(`--- "${entry.titleKey}": sin title_definition (corre titles:seed-v1 primero) -- omitido ---`);
        result.perTitle.push({ titleKey: entry.titleKey, qualifyingAccounts: 0, granted: 0, alreadyOwned: 0, failed: 0 });
        continue;
      }

      console.log(`--- "${entry.titleKey}" (${entry.displayText}) ---`);
      let qualifyingAccounts = 0;
      let granted = 0;
      let alreadyOwned = 0;
      let failed = 0;

      for (const { id: accountId } of accountRows) {
        const existing = await accountTitleRepo.findByAccountAndTitle(accountId, definition.id);
        if (existing) {
          alreadyOwned++;
          continue;
        }

        const eligible = await titleEligibilityService.evaluateMetric(accountId, entry.metric, entry.threshold);
        if (!eligible) continue;

        qualifyingAccounts++;
        if (dryRun) {
          console.log(`  [dry-run] otorgaría a cuenta ${accountId}`);
          continue;
        }
        try {
          const { created } = await accountTitleRepo.createIdempotent({
            accountId,
            titleDefinitionId: definition.id,
            acquisitionSourceType: 'TITLE_UNLOCK',
            acquisitionSourceId: `${accountId}:${entry.titleKey}`,
            acquiredAt: new Date(),
          });
          if (created) {
            console.log(`  otorgado a cuenta ${accountId}`);
            granted++;
          } else {
            alreadyOwned++;
          }
        } catch (error) {
          console.error(`  FALLO al otorgar a cuenta ${accountId}: ${error}`);
          failed++;
        }
      }

      console.log(`  calificantes nuevos: ${qualifyingAccounts}, otorgados: ${granted}, ya poseídos: ${alreadyOwned}, fallidos: ${failed}\n`);
      result.perTitle.push({ titleKey: entry.titleKey, qualifyingAccounts, granted, alreadyOwned, failed });
    }

    return result;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  reconcileTitlesV1({ dryRun })
    .then((result) => {
      console.log('=== RESUMEN ===');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
