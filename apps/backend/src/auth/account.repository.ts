import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Account, AccountStatus, Prisma } from '../generated/prisma/client';

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

  /**
   * WEB-0D.1C-A -- lookup EN LOTE, proyección mínima (`id` + `status`).
   * Único uso previsto: excluir cuentas CLOSED de superficies competitivas
   * públicas (ranking en vivo) y decidir si un OutboxEvent de GAMIFICATION
   * tardío debe ignorarse -- nunca reactiva ni cambia el estado de ninguna
   * cuenta. `Map` vacío si `ids` está vacío (sin ida y vuelta a la base).
   */
  async findStatusesByIds(ids: string[]): Promise<Map<string, AccountStatus>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.account.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
    return new Map(rows.map((row) => [row.id, row.status]));
  }

  /**
   * WEB-0D.1C-B3-R1-ADDENDUM -- ¿esta cuenta tiene actualmente un
   * `PrivacyRequest` en PROCESSING? Señal de "barrido de cierre definitivo
   * EN CURSO, todavía ANTES de que `AuthService.markAccountClosed` marque
   * `Account.status = CLOSED`" (ver WEB-0D.1C-B3-R1 §3: ese marcado ahora
   * ocurre al FINAL del barrido, no al principio). Lectura de
   * `privacy_request` (tabla propia del dominio PRIVACY) vía el cliente
   * Prisma COMPARTIDO -- NUNCA vía `PrivacyRequestRepository`: `PrivacyModule`
   * ya importa `AuthModule`/`GamificationModule`, así que inyectar ese
   * repositorio aquí (o en GAMIFICATION) crearía un ciclo de módulos.
   * `AccountRepository` es el punto de lectura que XpGrantService/
   * LeaguePointGrantService/RewardEvaluationWorker/GamificationService ya
   * usan para el guardia CLOSED existente -- esto extiende la MISMA
   * pregunta ("¿puede esta cuenta recibir gamificación nueva ahora
   * mismo?") sin inventar un nuevo `Account.status` ni invertir la
   * dirección de dependencias.
   *
   * DELETION_PENDING ordinario (dentro de la ventana de 30 días, SIN
   * barrido en curso) nunca tiene una fila PROCESSING -- distingue
   * exactamente los casos (A) "recuperable, ventana ordinaria" (permitido,
   * sin cambios) de (B) "cierre definitivo activamente en curso" (bloqueado)
   * del addendum.
   */
  async hasProcessingDeletionRequest(accountId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const client = tx ?? this.prisma;
    const row = await client.privacyRequest.findFirst({
      where: { accountId, status: 'PROCESSING' },
      select: { id: true },
    });
    return row !== null;
  }

  /** Versión en LOTE de `hasProcessingDeletionRequest`, para filtrar candidatos en descubrimiento (nunca N+1 en el camino de lote). */
  async findAccountIdsWithProcessingDeletion(accountIds: string[]): Promise<Set<string>> {
    if (accountIds.length === 0) return new Set();
    const rows = await this.prisma.privacyRequest.findMany({
      where: { accountId: { in: accountIds }, status: 'PROCESSING' },
      select: { accountId: true },
    });
    return new Set(rows.map((row) => row.accountId));
  }
}
