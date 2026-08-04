import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { XpLedgerEntry } from '../generated/prisma/client';
import { XpLedgerEntryRepository } from './xp-ledger-entry.repository';
import { RewardEvaluationCursorRepository } from './reward-evaluation-cursor.repository';

/**
 * Bloque III, sub-incremento 1.b (ADR-0019) -- descubrimiento de cuentas
 * pendientes, exclusión mutua por cuenta, aislamiento de fallo, backoff.
 *
 * Deliberadamente SIN evaluación real: `evaluateAccount()` es un punto de
 * extensión vacío en este sub-incremento -- los Incrementos 2-4 (Logros,
 * Desafíos) y el sub-incremento 1.c (entrega de XP_BONUS) lo llenan
 * después, sin necesitar tocar `discoverPendingAccounts`/`processAccount`/
 * `run` de nuevo. Este worker NO crea `reward_grant`, NO entrega XP,
 * títulos ni cosméticos, NO escribe sobre inventario ni `public_profile`.
 *
 * Namespace de advisory lock (`ADVISORY_LOCK_NAMESPACE = 19`, por
 * ADR-0019): primer uso de advisory locks en el proyecto -- namespace fijo
 * para evitar colisión con cualquier uso futuro de otro subsistema.
 */
const ADVISORY_LOCK_NAMESPACE = 19;

/** Mismo criterio de backoff acotado y creciente que NO_RULE_BACKOFF_MS (XpGrantService, Bloque I) -- valores reutilizados, no importados (esa constante es privada de ese módulo, que ADR-0019 no modifica). */
const FAILURE_BACKOFF_MS = [
  60_000, // 1 min
  5 * 60_000, // 5 min
  30 * 60_000, // 30 min
  2 * 60 * 60_000, // 2 h
  6 * 60 * 60_000, // 6 h
  24 * 60 * 60_000, // 24 h (tope)
];

function backoffFor(attemptsSoFar: number): number {
  const index = Math.min(attemptsSoFar, FAILURE_BACKOFF_MS.length - 1);
  return FAILURE_BACKOFF_MS[index] ?? FAILURE_BACKOFF_MS[FAILURE_BACKOFF_MS.length - 1]!;
}

export type ProcessAccountOutcome = 'PROCESSED' | 'SKIPPED_LOCKED' | 'FAILED';

@Injectable()
export class RewardEvaluationWorker {
  private readonly logger = new Logger(RewardEvaluationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerRepo: XpLedgerEntryRepository,
    private readonly cursorRepo: RewardEvaluationCursorRepository,
  ) {}

  /**
   * Punto de extensión para los Incrementos 2-4/sub-incremento 1.c -- en
   * este sub-incremento es un no-op deliberado. Recibe las entradas
   * pendientes YA determinadas (orden compuesto), dentro de la misma
   * transacción que sostiene el advisory lock de la cuenta.
   */
  protected async evaluateAccount(
    _tx: Prisma.TransactionClient,
    _accountId: string,
    _pendingEntries: XpLedgerEntry[],
  ): Promise<void> {
    // Intencionalmente vacío -- ver comentario de clase.
  }

  /**
   * Descubre cuentas con actividad no procesada. Implementación
   * deliberadamente simple (N+1: una consulta de cursor + una de
   * existencia por cuenta candidata) -- la escala actual del proyecto no
   * justifica una consulta agregada más compleja; documentado, no oculto,
   * mismo criterio que ADR-0005 documentó su limitación de réplica única.
   */
  async discoverPendingAccounts(now: Date = new Date()): Promise<string[]> {
    const candidates = await this.prisma.xpLedgerEntry.findMany({ distinct: ['accountId'], select: { accountId: true } });
    const pending: string[] = [];
    for (const { accountId } of candidates) {
      const cursor = await this.cursorRepo.findByAccountId(accountId);
      if (cursor && cursor.nextEligibleAt > now) continue; // en backoff, todavía no reintentar

      const cursorPosition =
        cursor?.lastProcessedRecordedAt && cursor.lastProcessedEntryId
          ? { recordedAt: cursor.lastProcessedRecordedAt, entryId: cursor.lastProcessedEntryId }
          : null;
      const hasPending = await this.ledgerRepo.hasEntryAfter(accountId, cursorPosition);
      if (hasPending) pending.push(accountId);
    }
    return pending;
  }

  /**
   * Procesa UNA cuenta: adquiere el advisory lock (no bloqueante -- si otro
   * proceso ya lo sostiene, se salta esta cuenta esta vez, sin error), lee
   * el lote pendiente con el mismo "techo" con el que se descubrió (dentro
   * de la misma transacción), evalúa (no-op en este sub-incremento), y
   * avanza el cursor a la posición EXACTA de la última entrada procesada
   * -- nunca más allá. Un fallo se aísla: se registra vía
   * `cursorRepo.upsertFailure` (transacción nueva, independiente de la que
   * se revirtió) y no se propaga a otras cuentas del lote.
   */
  async processAccount(accountId: string): Promise<ProcessAccountOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lockRows = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${ADVISORY_LOCK_NAMESPACE}, hashtext(${accountId})) AS locked
        `;
        if (!lockRows[0]?.locked) {
          return 'SKIPPED_LOCKED';
        }

        const cursor = await this.cursorRepo.findByAccountId(accountId, tx);
        const cursorPosition =
          cursor?.lastProcessedRecordedAt && cursor.lastProcessedEntryId
            ? { recordedAt: cursor.lastProcessedRecordedAt, entryId: cursor.lastProcessedEntryId }
            : null;

        const pendingEntries = await this.ledgerRepo.findPendingSince(accountId, cursorPosition, tx);
        if (pendingEntries.length === 0) {
          return 'PROCESSED';
        }

        await this.evaluateAccount(tx, accountId, pendingEntries);

        const last = pendingEntries[pendingEntries.length - 1]!;
        await this.cursorRepo.upsertSuccess(accountId, last.recordedAt, last.id, tx);
        return 'PROCESSED';
      });
    } catch (error) {
      const attemptsSoFar = (await this.cursorRepo.findByAccountId(accountId))?.attempts ?? 0;
      const nextEligibleAt = new Date(Date.now() + backoffFor(attemptsSoFar));
      await this.cursorRepo.upsertFailure(accountId, nextEligibleAt);
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo evaluando recompensas para la cuenta ${accountId}: ${message}`);
      return 'FAILED';
    }
  }

  /** Aislamiento de fallo por cuenta: un error en una no detiene el resto (mismo patrón que XpGrantService.grantPending/GamificationService.ingestPending). */
  async run(now: Date = new Date()): Promise<{ processed: number; skippedLocked: number; failed: number }> {
    const accountIds = await this.discoverPendingAccounts(now);
    let processed = 0;
    let skippedLocked = 0;
    let failed = 0;

    for (const accountId of accountIds) {
      const outcome = await this.processAccount(accountId);
      if (outcome === 'PROCESSED') processed++;
      else if (outcome === 'SKIPPED_LOCKED') skippedLocked++;
      else failed++;
    }

    return { processed, skippedLocked, failed };
  }
}
