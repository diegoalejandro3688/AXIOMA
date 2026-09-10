import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Account, AccountStatus } from '../generated/prisma/client';

/** Único punto de acceso a la tabla `account`. */
@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({ where: { id } });
  }

  create(status: AccountStatus): Promise<Account> {
    return this.prisma.account.create({ data: { status } });
  }

  updateStatus(id: string, status: AccountStatus): Promise<Account> {
    return this.prisma.account.update({ where: { id }, data: { status } });
  }

  touchLastAuthenticated(id: string): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: { lastAuthenticatedAt: new Date() },
    });
  }

  /** Invalida globalmente todas las sesiones anteriores de la cuenta. */
  incrementSessionVersion(id: string): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: { sessionVersion: { increment: 1 } },
    });
  }

  markDeletionPending(id: string): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: { status: 'DELETION_PENDING', deletionRequestedAt: new Date() },
    });
  }

  markClosed(id: string): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  /** Recuperación dentro del plazo: vuelve a ACTIVE/PENDING y limpia la marca de eliminación. */
  restoreFromDeletion(id: string, status: 'ACTIVE' | 'PENDING'): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: { status, deletionRequestedAt: null },
    });
  }

  /**
   * PB-1A -- lookup por la referencia OPACA de facturación (`billingAccountRef`
   * / `obfuscatedAccountId` de Google). Único camino de atribución de RTDN
   * cuando no hay fila ni predecesor por `purchaseToken`. Proyección mínima
   * (`id` + `status`): quien atribuye NUNCA reactiva ni cambia el estado de la
   * cuenta -- una cuenta CLOSED puede seguir siendo atribuible (ver PB-1A §15).
   */
  findByObfuscatedAccountId(ref: string): Promise<{ id: string; status: AccountStatus } | null> {
    return this.prisma.account.findUnique({
      where: { obfuscatedAccountId: ref },
      select: { id: true, status: true },
    });
  }

  /** PB-1A -- lee SÓLO la referencia opaca de facturación de la cuenta (o `null`). */
  async findObfuscatedAccountId(id: string): Promise<string | null> {
    const row = await this.prisma.account.findUnique({
      where: { id },
      select: { obfuscatedAccountId: true },
    });
    return row?.obfuscatedAccountId ?? null;
  }

  /**
   * PB-1A -- aprovisiona la referencia opaca SÓLO si la cuenta sigue en `NULL`
   * (UPDATE condicional atómico, nunca read-modify-write). Devuelve `true` si
   * ESTA llamada fijó el valor, `false` si otra escritura concurrente ganó la
   * carrera (el llamador re-lee el valor ganador). NUNCA sobrescribe un valor
   * ya existente.
   */
  async tryProvisionObfuscatedAccountId(id: string, ref: string): Promise<boolean> {
    const { count } = await this.prisma.account.updateMany({
      where: { id, obfuscatedAccountId: null },
      data: { obfuscatedAccountId: ref },
    });
    return count === 1;
  }

  // PB-1B-R1 §1: NO existe un metodo para limpiar `obfuscatedAccountId`. La ref
  // opaca se CONSERVA en la cuenta soft-CLOSED indefinidamente en V1 -- es la
  // unica via de atribucion de una RTDN de PRIMER CONTACTO (PB-1A). Su borrado
  // definitivo queda DIFERIDO a PB-6.
}
