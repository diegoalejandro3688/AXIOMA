import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { RewardEvaluationCursor } from '../generated/prisma/client';

/**
 * Único punto de acceso a `reward_evaluation_cursor` -- ver ADR-0019 §1
 * (cursor POR CUENTA, no global -- corrección obligatoria del Product
 * Owner). SIN uso todavía en este sub-incremento: el worker que consulta
 * este cursor para decidir qué cuentas procesar es el sub-incremento 1.b,
 * fuera de alcance aquí. Estos métodos solo persisten el resultado de un
 * intento de evaluación ya ocurrido en otra parte.
 */
@Injectable()
export class RewardEvaluationCursorRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByAccountId(accountId: string): Promise<RewardEvaluationCursor | null> {
    return this.prisma.rewardEvaluationCursor.findUnique({ where: { accountId } });
  }

  /**
   * Procesamiento exitoso: avanza `lastProcessedRecordedAt`, resetea
   * `attempts` a 0. Crea la fila si es la primera vez que esta cuenta se
   * procesa con éxito.
   */
  upsertSuccess(accountId: string, lastProcessedRecordedAt: Date): Promise<RewardEvaluationCursor> {
    return this.prisma.rewardEvaluationCursor.upsert({
      where: { accountId },
      create: { accountId, lastProcessedRecordedAt, attempts: 0, nextEligibleAt: new Date() },
      update: { lastProcessedRecordedAt, attempts: 0, nextEligibleAt: new Date() },
    });
  }

  /**
   * Intento fallido: NO toca `lastProcessedRecordedAt` (garantiza que la
   * cuenta siga apareciendo como pendiente, ADR-0019 §1) -- solo
   * incrementa `attempts` y aplica `nextEligibleAt` (backoff, calculado
   * por el llamador). Si la cuenta nunca se procesó con éxito,
   * `lastProcessedRecordedAt` permanece `NULL`.
   */
  upsertFailure(accountId: string, nextEligibleAt: Date): Promise<RewardEvaluationCursor> {
    return this.prisma.rewardEvaluationCursor.upsert({
      where: { accountId },
      create: { accountId, lastProcessedRecordedAt: null, attempts: 1, nextEligibleAt },
      update: { attempts: { increment: 1 }, nextEligibleAt },
    });
  }
}
