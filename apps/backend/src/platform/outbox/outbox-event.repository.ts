import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { OutboxEvent, Prisma } from '../../generated/prisma/client';

/**
 * Único punto de acceso a la tabla `outbox_event` -- infraestructura
 * compartida de plataforma. Solo publicación (`create`): la lectura/consumo
 * ya NO vive aquí -- ver `OutboxEventDeliveryRepository` (ADR-0017). Los
 * métodos `findPending`/`markProcessed`/`markFailed` que existían en este
 * repositorio se retiraron junto con la migración de ANALYTICS: operaban
 * sobre `OutboxEvent.status`, un campo global que no admite múltiples
 * consumidores (ver ADR-0017, "alternativa nula" -- demostración del fallo).
 */
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
}
