/**
 * WEB-0D.1B-P0B2 -- reconciliación retroactiva de `outbox_event`.
 *
 * Filas creadas ANTES de que existiera el ciclo de vida de privacidad
 * (`OutboxLifecycleService`, ver `outbox-lifecycle.service.ts`) pueden ser
 * TERMINALES (todos sus consumidores aplicables ya llegaron a un estado
 * final -- registro de consumidores, `outbox-consumer-registry.ts`) y
 * seguir llevando `accountId` crudo en `aggregateId`/`payload`. Este script
 * las corrige por el MISMO camino que usaría el operador real
 * (`OutboxLifecycleService.minimizeTerminalEvents`), nunca un `UPDATE`
 * manual fuera del servicio.
 *
 * Quita ÚNICAMENTE `accountId` (payload + aggregateId) de filas que son
 * TERMINALES para TODOS sus consumidores aplicables -- una fila retryable
 * (algún consumidor aplicable todavía sin `PROCESSED`/agotado) NUNCA se
 * toca, sin importar su antigüedad. Un `eventKey` desconocido por el
 * registro NUNCA se toca. Idempotente: correrlo dos veces sobre las mismas
 * filas ya minimizadas no cambia nada (ni deja candidatos).
 *
 * Uso:
 *   pnpm --filter @axioma/backend outbox:reconcile-minimization-v1 -- --dry-run
 *   pnpm --filter @axioma/backend outbox:reconcile-minimization-v1
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { OutboxEventRepository } from '../src/platform/outbox/outbox-event.repository';
import { OutboxEventDeliveryRepository } from '../src/platform/outbox/outbox-event-delivery.repository';
import { OutboxLifecycleService } from '../src/platform/outbox/outbox-lifecycle.service';
import { knownOutboxEventKeys } from '../src/platform/outbox/outbox-consumer-registry';
import { evaluateOutboxTerminalState } from '../src/platform/outbox/outbox-terminal-state';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const RECONCILE_BATCH_SIZE = 200;

export interface ReconcileOutboxMinimizationResult {
  candidateRows: number;
  minimizedRows: number;
  dryRun: boolean;
}

export async function reconcileOutboxEventMinimizationV1({
  dryRun,
}: {
  dryRun: boolean;
}): Promise<ReconcileOutboxMinimizationResult> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;

  try {
    const eventRepo = new OutboxEventRepository(prisma);
    const deliveryRepo = new OutboxEventDeliveryRepository(prisma);

    if (dryRun) {
      // Mismo criterio de escaneo que el servicio real, sin escribir nada:
      // cuenta cuántas de las filas candidatas (accountId sin quitar, en un
      // eventKey conocido) son REALMENTE terminales hoy.
      const knownEventKeys = knownOutboxEventKeys();
      const candidates = await eventRepo.findMinimizationCandidates(knownEventKeys, RECONCILE_BATCH_SIZE);
      let wouldMinimize = 0;
      for (const event of candidates) {
        const deliveries = await deliveryRepo.findAllFor(event.id);
        const { terminal } = evaluateOutboxTerminalState(event.eventKey, deliveries);
        if (terminal) wouldMinimize++;
      }
      console.log(
        `[dry-run] ${candidates.length} fila(s) candidata(s) de outbox_event con accountId sin quitar; ${wouldMinimize} son terminales y se minimizarían -- ninguna modificada.`,
      );
      return { candidateRows: candidates.length, minimizedRows: 0, dryRun: true };
    }

    const lifecycle = new OutboxLifecycleService(eventRepo, deliveryRepo);
    let candidateRows = 0;
    let minimizedRows = 0;
    // Agota lotes sucesivos -- una sola corrida real repite hasta que un
    // lote completo no encuentra más candidatas, no solo el primer lote.
    for (;;) {
      const result = await lifecycle.minimizeTerminalEvents(RECONCILE_BATCH_SIZE);
      candidateRows += result.scanned;
      minimizedRows += result.minimized;
      if (result.scanned < RECONCILE_BATCH_SIZE) break;
    }

    console.log(`${minimizedRows}/${candidateRows} fila(s) de outbox_event remediada(s) (accountId quitado; resto de cada fila intacto).`);
    return { candidateRows, minimizedRows, dryRun: false };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  reconcileOutboxEventMinimizationV1({ dryRun })
    .then((result) => {
      console.log('=== RESUMEN ===');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
