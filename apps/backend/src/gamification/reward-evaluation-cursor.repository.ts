import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { RewardEvaluationCursor } from '../generated/prisma/client';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `reward_evaluation_cursor` -- ver ADR-0019 §1
 * (cursor POR CUENTA, no global) y su precisión del sub-incremento 1.b:
 * orden compuesto (`lastProcessedRecordedAt`, `lastProcessedEntryId`),
 * nunca solo `recordedAt` -- evita omitir entradas que comparten
 * `recordedAt` exacto.
 *
 * Todos los métodos aceptan un cliente Prisma opcional (`tx`) para poder
 * ejecutarse dentro de la transacción del `RewardEvaluationWorker` (que
 * también sostiene el advisory lock por cuenta) -- mismo patrón que
 * `XpLedgerEntryRepository`.
 */
@Injectable()
export class RewardEvaluationCursorRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByAccountId(accountId: string, tx?: Prisma.TransactionClient): Promise<RewardEvaluationCursor | null> {
    const client: Client = tx ?? this.prisma;
    return client.rewardEvaluationCursor.findUnique({ where: { accountId } });
  }

  /**
   * Procesamiento exitoso: avanza el par (`lastProcessedRecordedAt`,
   * `lastProcessedEntryId`) a la posición exacta de la última entrada
   * realmente procesada, resetea `attempts` a 0. Crea la fila si es la
   * primera vez que esta cuenta se procesa con éxito.
   */
  upsertSuccess(
    accountId: string,
    lastProcessedRecordedAt: Date,
    lastProcessedEntryId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RewardEvaluationCursor> {
    const client: Client = tx ?? this.prisma;
    return client.rewardEvaluationCursor.upsert({
      where: { accountId },
      create: { accountId, lastProcessedRecordedAt, lastProcessedEntryId, attempts: 0, nextEligibleAt: new Date() },
      update: { lastProcessedRecordedAt, lastProcessedEntryId, attempts: 0, nextEligibleAt: new Date() },
    });
  }

  /**
   * Intento fallido: NO toca la posición compuesta (garantiza que la
   * cuenta siga apareciendo como pendiente, ADR-0019 §1) -- solo
   * incrementa `attempts` y aplica `nextEligibleAt` (backoff, calculado
   * por el llamador). Si la cuenta nunca se procesó con éxito, la
   * posición compuesta permanece `NULL`/`NULL`.
   *
   * Deliberadamente SIN `tx`: se ejecuta DESPUÉS de que la transacción del
   * intento fallido ya se revirtió (el advisory lock se liberó con ese
   * rollback) -- este `upsert` es su propia transacción implícita nueva.
   */
  upsertFailure(accountId: string, nextEligibleAt: Date): Promise<RewardEvaluationCursor> {
    return this.prisma.rewardEvaluationCursor.upsert({
      where: { accountId },
      create: { accountId, lastProcessedRecordedAt: null, lastProcessedEntryId: null, attempts: 1, nextEligibleAt },
      update: { attempts: { increment: 1 }, nextEligibleAt },
    });
  }
}
