/**
 * WEB-0D.1B-P0B1 -- reconciliación retroactiva de `analytics_event`.
 *
 * `AnalyticsService.ingestOne` ahora sanea el `payload` ANTES de persistir
 * (`omitAccountId`, ver `analytics-payload-sanitizer.ts`), pero las filas
 * creadas ANTES de ese cambio pueden llevar `accountId` crudo dentro de
 * `payload`. Este script las corrige por el MISMO camino que usaría el
 * operador real (`AnalyticsEventRepository.stripAccountIdFromPayload`),
 * nunca un `UPDATE` manual fuera del repositorio.
 *
 * Quita ÚNICAMENTE la clave `accountId` de `payload` (operador `jsonb -
 * 'key'` de Postgres) -- cualquier otro campo del payload, `id`,
 * `analyticsActorRef`, `occurredAt`, `createdAt`, y cualquier otra tabla
 * quedan intactos. Idempotente: correrlo dos veces afecta 0 filas la
 * segunda vez.
 *
 * Uso:
 *   pnpm --filter @axioma/backend analytics:reconcile-minimization-v1 -- --dry-run
 *   pnpm --filter @axioma/backend analytics:reconcile-minimization-v1
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { AnalyticsEventRepository } from '../src/analytics/analytics-event.repository';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

export interface ReconcileAnalyticsMinimizationResult {
  candidateRows: number;
  updatedRows: number;
  dryRun: boolean;
}

export async function reconcileAnalyticsEventMinimizationV1({
  dryRun,
}: {
  dryRun: boolean;
}): Promise<ReconcileAnalyticsMinimizationResult> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;

  try {
    const repo = new AnalyticsEventRepository(prisma);
    const candidateRows = await repo.countPayloadsWithAccountId();

    if (dryRun) {
      console.log(`[dry-run] ${candidateRows} fila(s) de analytics_event tienen accountId crudo en payload -- ninguna modificada.`);
      return { candidateRows, updatedRows: 0, dryRun: true };
    }

    const updatedRows = await repo.stripAccountIdFromPayload();
    console.log(`${updatedRows} fila(s) de analytics_event remediada(s) (accountId quitado de payload; resto del payload intacto).`);
    return { candidateRows, updatedRows, dryRun: false };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  reconcileAnalyticsEventMinimizationV1({ dryRun })
    .then((result) => {
      console.log('=== RESUMEN ===');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
