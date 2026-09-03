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
}
