import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ANALYTICS_EVENT_KEYS,
  ANALYTICS_SCHEMA_VERSION,
  analyticsEventPayloadSchemas,
  type AnalyticsEventKey,
} from '@axioma/contracts';
import { analyticsActorRef } from './analytics-actor-ref';
import { AnalyticsEventRepository } from './analytics-event.repository';
import { OutboxEventRepository } from '../platform/outbox/outbox-event.repository';
import type { OutboxEvent } from '../generated/prisma/client';

const RELAY_BATCH_SIZE = 100;

function isKnownEventKey(eventKey: string): eventKey is AnalyticsEventKey {
  return (ANALYTICS_EVENT_KEYS as readonly string[]).includes(eventKey);
}

/**
 * ANALYTICS no produce eventos: consume Domain Events ya publicados por otros
 * dominios en el Outbox de plataforma -- ver docs/adr/0006-analytics-foundation.md.
 * `ingestPending` es el único método que escribe en `analytics_event`.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly outboxRepo: OutboxEventRepository,
    private readonly analyticsEventRepo: AnalyticsEventRepository,
    private readonly config: ConfigService,
  ) {}

  /**
   * Procesa un lote de OutboxEvent PENDING. Cada fila se procesa de forma
   * independiente -- un fallo en una NO detiene el resto del lote (ver gate
   * de aceptación, punto 3).
   */
  async ingestPending(): Promise<{ processed: number; failed: number }> {
    const pending = await this.outboxRepo.findPending(RELAY_BATCH_SIZE);

    let processed = 0;
    let failed = 0;

    for (const outboxEvent of pending) {
      try {
        await this.ingestOne(outboxEvent);
        await this.outboxRepo.markProcessed(outboxEvent.id);
        processed++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`OutboxEvent ${outboxEvent.id} ("${outboxEvent.eventKey}") no se pudo ingerir: ${message}`);
        await this.outboxRepo.markFailed(outboxEvent.id, outboxEvent.attempts + 1, message);
      }
    }

    return { processed, failed };
  }

  private async ingestOne(outboxEvent: OutboxEvent): Promise<void> {
    // Idempotencia ante reintento tras un crash entre el insert de
    // analytics_event y el markProcessed del outbox: si ya existe, se
    // considera éxito en vez de fallo -- no se reprocesa ni se duplica.
    const alreadyIngested = await this.analyticsEventRepo.existsByIdempotencyKey(outboxEvent.id);
    if (alreadyIngested) return;

    if (!isKnownEventKey(outboxEvent.eventKey)) {
      throw new Error(`eventKey desconocido: "${outboxEvent.eventKey}"`);
    }
    if (outboxEvent.schemaVersion !== ANALYTICS_SCHEMA_VERSION) {
      throw new Error(
        `schemaVersion no soportada para "${outboxEvent.eventKey}": "${outboxEvent.schemaVersion}"`,
      );
    }

    const schema = analyticsEventPayloadSchemas[outboxEvent.eventKey];
    const result = schema.safeParse(outboxEvent.payload);
    if (!result.success) {
      throw new Error(`payload inválido para "${outboxEvent.eventKey}": ${result.error.message}`);
    }

    const secret = this.config.get<string>('ANALYTICS_ACTOR_SECRET');
    const actorRef =
      secret && typeof result.data.accountId === 'string'
        ? analyticsActorRef(result.data.accountId, secret)
        : null;

    await this.analyticsEventRepo.create({
      eventKey: outboxEvent.eventKey,
      schemaVersion: outboxEvent.schemaVersion,
      sourceDomain: outboxEvent.sourceDomain,
      analyticsActorRef: actorRef,
      producerVersion: outboxEvent.producerVersion,
      occurredAt: outboxEvent.occurredAt,
      payload: result.data,
      idempotencyKey: outboxEvent.id,
    });
  }

  async summarySince(since: Date) {
    return this.analyticsEventRepo.countByEventKeySince(since);
  }
}
