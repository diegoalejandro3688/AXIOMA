import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service';
import { Prisma, type GooglePlayRtdnEvent } from '../../generated/prisma/client';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * Repositorio del buzon durable de RTDN. La ingesta escribe una fila por
 * `messageId` (unico -> dedup); el worker reclama filas `PENDING`/`RETRYABLE`
 * con un claim ATOMICO (`updateMany` condicionado por estado) para que dos
 * pasadas del cron nunca procesen el mismo evento a la vez.
 */
export interface RtdnEventInsert {
  messageId: string;
  subscriptionResource: string | null;
  packageName: string;
  notificationVersion: string | null;
  notificationKind: string;
  notificationType: number | null;
  purchaseToken: string | null;
  eventTime: Date | null;
  status: 'PENDING' | 'DONE' | 'IGNORED';
  processedAt: Date | null;
}

@Injectable()
export class GooglePlayRtdnEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inserta el evento. Si el `messageId` ya existe (re-entrega de Pub/Sub),
   * devuelve `{ duplicate: true }` sin tocar nada -- el trabajo ya se registro.
   */
  async insertDeduped(data: RtdnEventInsert): Promise<{ duplicate: boolean; id: string | null }> {
    try {
      const row = await this.prisma.googlePlayRtdnEvent.create({
        data: {
          messageId: data.messageId,
          subscriptionResource: data.subscriptionResource,
          provider: 'GOOGLE_PLAY',
          packageName: data.packageName,
          notificationVersion: data.notificationVersion,
          notificationKind: data.notificationKind,
          notificationType: data.notificationType,
          purchaseToken: data.purchaseToken,
          eventTime: data.eventTime,
          status: data.status,
          processedAt: data.processedAt,
        },
      });
      return { duplicate: false, id: row.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { duplicate: true, id: null };
      }
      throw error;
    }
  }

  async findById(id: string): Promise<GooglePlayRtdnEvent | null> {
    return this.prisma.googlePlayRtdnEvent.findUnique({ where: { id } });
  }

  /**
   * PB-1B -- ¿hay trabajo RTDN VIVO para alguno de estos `purchaseToken` (la
   * "linea de tokens" de una fila: purchaseToken + linkedPurchaseToken +
   * resubscribedFromPurchaseToken)? Vivo = `PENDING` / `PROCESSING` /
   * `RETRYABLE`. `DONE` / `IGNORED` / `FAILED` (dead-letter acotado, ya agotado)
   * NO cuentan. El buzon de RTDN es el UNICO disparador asincrono de
   * reconciliacion, asi que esto cubre tambien "reconciliacion en cola". La
   * lista de tokens ya viene sin `null`s; nunca se loguea aqui.
   */
  async countLiveByPurchaseTokens(purchaseTokens: string[]): Promise<number> {
    if (purchaseTokens.length === 0) return 0;
    return this.prisma.googlePlayRtdnEvent.count({
      where: {
        purchaseToken: { in: purchaseTokens },
        status: { in: ['PENDING', 'PROCESSING', 'RETRYABLE'] },
      },
    });
  }

  async findByMessageId(messageId: string): Promise<GooglePlayRtdnEvent | null> {
    return this.prisma.googlePlayRtdnEvent.findUnique({ where: { messageId } });
  }

  countByMessageId(messageId: string): Promise<number> {
    return this.prisma.googlePlayRtdnEvent.count({ where: { messageId } });
  }

  /**
   * Reclama el siguiente evento procesable. Selecciona el candidato mas
   * antiguo `PENDING`/`RETRYABLE` y lo marca `PROCESSING` en un `updateMany`
   * condicionado por su estado previo: si otra pasada lo tomo primero,
   * `count !== 1` y se devuelve `null`.
   *
   * `excludeIds` -- ids ya tratados en ESTA pasada del worker: un evento que
   * acaba de quedar `RETRYABLE` no se vuelve a reclamar en el mismo lote (el
   * reintento real es la proxima pasada del cron).
   */
  async claimNext(excludeIds: string[] = []): Promise<GooglePlayRtdnEvent | null> {
    // `PROCESSING` mas viejo que este umbral = un proceso murio a mitad -> se
    // reclama de nuevo (recuperacion independiente de la re-entrega de Pub/Sub).
    const staleProcessingBefore = new Date(Date.now() - 5 * 60_000);
    const candidate = await this.prisma.googlePlayRtdnEvent.findFirst({
      where: {
        OR: [
          { status: { in: ['PENDING', 'RETRYABLE'] } },
          { status: 'PROCESSING', updatedAt: { lt: staleProcessingBefore } },
        ],
        ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!candidate) return null;

    const claimed = await this.prisma.googlePlayRtdnEvent.updateMany({
      where: { id: candidate.id, status: candidate.status, updatedAt: candidate.updatedAt },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) return null;

    return this.prisma.googlePlayRtdnEvent.findUnique({ where: { id: candidate.id } });
  }

  async markDone(id: string): Promise<void> {
    await this.prisma.googlePlayRtdnEvent.update({
      where: { id },
      data: { status: 'DONE', processedAt: new Date(), lastError: null, lastErrorCode: null },
    });
  }

  async markRetryable(id: string, code: string, message: string): Promise<void> {
    await this.prisma.googlePlayRtdnEvent.update({
      where: { id },
      data: { status: 'RETRYABLE', lastErrorCode: code, lastError: message.slice(0, 300) },
    });
  }

  async markFailed(id: string, code: string, message: string): Promise<void> {
    await this.prisma.googlePlayRtdnEvent.update({
      where: { id },
      data: { status: 'FAILED', processedAt: new Date(), lastErrorCode: code, lastError: message.slice(0, 300) },
    });
  }

  /**
   * RTDN-RET -- retencion. Estados TERMINALES (nunca reclamados de nuevo por
   * `claimNext`, ausentes de `countLiveByPurchaseTokens`): `DONE` / `FAILED`
   * (dead-letter acotado, agoto MAX_ATTEMPTS o error permanente) / `IGNORED`
   * (fuera de alcance de suscripcion). `PENDING` / `PROCESSING` / `RETRYABLE`
   * son "vivos" y JAMAS elegibles -- ver `countLiveByPurchaseTokens` arriba,
   * mismo conjunto invertido.
   *
   * `processedAt` cubre TODOS los desenlaces terminales, no solo el exito:
   * `markDone` y `markFailed` lo fijan explicitamente, y la ingesta
   * (`rtdn-ingestion.service.ts`) tambien lo fija al insertar ya-resuelto
   * (`test`->DONE, `one_time_product`/`voided_purchase`/`unknown`->IGNORED,
   * `subscription` sin `purchaseToken`->IGNORED). No existe fila terminal sin
   * `processedAt` en el camino real de escritura -- de ahi que NO haga falta
   * una columna `terminalAt` dedicada ni una migracion.
   */
  private static readonly TERMINAL_STATUSES = ['DONE', 'FAILED', 'IGNORED'] as const;

  /**
   * Candidatos a purga: TERMINAL + `processedAt` mas viejo que `cutoff`. Lote
   * acotado, orden estable (mas viejo primero) para que corridas sucesivas
   * converjan. Devuelve solo `id` -- el borrado re-verifica el predicado por
   * fila (ver `deleteExpiredTerminalByIds`) para evitar TOCTOU.
   */
  async findExpiredTerminalCandidateIds(cutoff: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.googlePlayRtdnEvent.findMany({
      where: {
        status: { in: [...GooglePlayRtdnEventRepository.TERMINAL_STATUSES] },
        processedAt: { not: null, lt: cutoff },
      },
      orderBy: { processedAt: 'asc' },
      take: limit,
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /**
   * Borra SOLO las filas de `ids` que en ESTE instante siguen cumpliendo el
   * predicado terminal+expirado (re-chequeo anti-TOCTOU: una fila podria,
   * en teoria, haber sido re-reclamada entre el `find` y el `delete` -- nunca
   * ocurre en la practica porque `claimNext` jamas toma una fila terminal,
   * pero el `deleteMany` condicionado lo hace imposible en cualquier caso).
   * Idempotente: filas ya borradas por otra corrida simplemente no matchean.
   */
  async deleteExpiredTerminalByIds(ids: string[], cutoff: Date): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.prisma.googlePlayRtdnEvent.deleteMany({
      where: {
        id: { in: ids },
        status: { in: [...GooglePlayRtdnEventRepository.TERMINAL_STATUSES] },
        processedAt: { not: null, lt: cutoff },
      },
    });
    return result.count;
  }
}
