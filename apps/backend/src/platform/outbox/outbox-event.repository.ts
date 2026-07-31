import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { OutboxEvent, Prisma } from '../../generated/prisma/client';

/** Único punto de acceso a la tabla `outbox_event` -- infraestructura compartida de plataforma. */
@Injectable()
export class OutboxEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    eventKey: string;
    schemaVersion: string;
    sourceDomain: string;
    aggregateId?: string | null;
    producerVersion?: string | null;
    occurredAt: Date;
    payload: Prisma.InputJsonValue;
  }): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.create({ data: input });
  }

  findPending(limit: number): Promise<OutboxEvent[]> {
    return this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  markProcessed(id: string): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });
  }

  markFailed(id: string, attempts: number, lastError: string): Promise<OutboxEvent> {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { status: 'FAILED', attempts, lastError },
    });
  }
}
