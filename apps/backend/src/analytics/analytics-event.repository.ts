import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';

/** Único punto de acceso a la tabla `analytics_event` -- propiedad de ANALYTICS. */
@Injectable()
export class AnalyticsEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    eventKey: string;
    schemaVersion: string;
    sourceDomain: string;
    analyticsActorRef: string | null;
    producerVersion: string | null;
    occurredAt: Date;
    payload: Prisma.InputJsonValue;
    idempotencyKey: string;
  }) {
    return this.prisma.analyticsEvent.create({ data: input });
  }

  existsByIdempotencyKey(idempotencyKey: string): Promise<boolean> {
    return this.prisma.analyticsEvent
      .findUnique({ where: { idempotencyKey }, select: { id: true } })
      .then((row) => row !== null);
  }

  async countByEventKeySince(since: Date): Promise<Array<{ eventKey: string; count: number }>> {
    const rows = await this.prisma.analyticsEvent.groupBy({
      by: ['eventKey'],
      where: { occurredAt: { gte: since } },
      _count: { _all: true },
    });
    return rows.map((row) => ({ eventKey: row.eventKey, count: row._count._all }));
  }
}
