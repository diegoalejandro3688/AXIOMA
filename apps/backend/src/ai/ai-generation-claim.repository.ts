import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AiGenerationClaim, Prisma } from '../generated/prisma/client';

/**
 * Único punto de acceso a `ai_generation_claim` -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §22 (revisión de concurrencia real,
 * Incremento 3). A diferencia de `AiUsageLedgerEntry`, esta tabla es
 * EFÍMERA y MUTABLE por diseño (lease de generación) -- sin trigger de
 * inmutabilidad, se borra explícitamente al completar la operación.
 */
@Injectable()
export class AiGenerationClaimRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admisión: cuenta reservas ACTIVAS (`reservationExpiresAt > now`) de una
   * cuenta -- usado junto con `AiUsageLedgerEntryRepository.countConsumedToday`
   * para decidir si admitir una operación NUEVA. DEBE ejecutarse dentro de la
   * transacción SERIALIZABLE de admisión (`tx` obligatorio, sin valor por
   * defecto -- mismo criterio que `XpLedgerEntryRepository.sumGrantedTodayForRule`).
   */
  countActiveReservationsForAccount(tx: Prisma.TransactionClient, accountId: string, now: Date): Promise<number> {
    return tx.aiGenerationClaim.count({ where: { accountId, reservationExpiresAt: { gt: now } } });
  }

  /** Mismo criterio que `countActiveReservationsForAccount`, pero para el límite de turnos (por conversación). */
  countActiveReservationsForConversation(tx: Prisma.TransactionClient, conversationId: string, now: Date): Promise<number> {
    return tx.aiGenerationClaim.count({ where: { conversationId, reservationExpiresAt: { gt: now } } });
  }

  /** Crea la reserva -- DEBE ejecutarse dentro de la MISMA transacción SERIALIZABLE que los conteos de admisión. */
  create(
    input: { operationId: string; accountId: string; conversationId: string; reservationExpiresAt: Date },
    tx: Prisma.TransactionClient,
  ): Promise<AiGenerationClaim> {
    return tx.aiGenerationClaim.create({ data: input });
  }

  findByOperationId(operationId: string): Promise<AiGenerationClaim | null> {
    return this.prisma.aiGenerationClaim.findUnique({ where: { operationId } });
  }

  /**
   * Adquiere el lease de generación de forma ATÓMICA (UPDATE condicional --
   * funciona igual con múltiples instancias del backend, la exclusión mutua
   * la garantiza Postgres, nunca memoria de proceso). Devuelve `true` si ESTA
   * llamada adquirió el lease (nadie más lo tenía vigente); `false` si otro
   * intento físico ya está en vuelo para la misma operación ahora mismo.
   */
  async tryAcquireGenerationLease(operationId: string, leaseExpiresAt: Date, now: Date): Promise<boolean> {
    const result = await this.prisma.aiGenerationClaim.updateMany({
      where: { operationId, OR: [{ generationLeaseExpiresAt: null }, { generationLeaseExpiresAt: { lt: now } }] },
      data: { generationLeaseExpiresAt: leaseExpiresAt },
    });
    return result.count === 1;
  }

  /** Libera el lease (sin borrar la reserva) -- tras un fallo técnico, para que un reintento inmediato no tenga que esperar el TTL del lease. */
  async releaseGenerationLease(operationId: string): Promise<void> {
    await this.prisma.aiGenerationClaim.updateMany({ where: { operationId }, data: { generationLeaseExpiresAt: null } });
  }

  /** Borra la reserva completa -- SOLO tras éxito, DENTRO de la misma transacción que persiste ASSISTANT + AiUsageLedgerEntry. Idempotente (deleteMany, nunca lanza si ya no existe). */
  async deleteByOperationId(operationId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.aiGenerationClaim.deleteMany({ where: { operationId } });
  }
}
