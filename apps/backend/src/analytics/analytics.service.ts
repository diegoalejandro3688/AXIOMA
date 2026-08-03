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
import { OutboxEventDeliveryRepository } from '../platform/outbox/outbox-event-delivery.repository';
import type { OutboxEvent } from '../generated/prisma/client';

const RELAY_BATCH_SIZE = 100;
const CONSUMER_NAME = 'ANALYTICS';
const MAX_DELIVERY_ATTEMPTS = 10;

function isKnownEventKey(eventKey: string): eventKey is AnalyticsEventKey {
  return (ANALYTICS_EVENT_KEYS as readonly string[]).includes(eventKey);
}

/**
 * ANALYTICS no produce eventos: consume Domain Events ya publicados por otros
 * dominios en el Outbox de plataforma -- ver docs/adr/0006-analytics-foundation.md.
 * `ingestPending` es el único método que escribe en `analytics_event`.
 *
 * Desde ADR-0017, ANALYTICS es un consumidor más entre varios posibles: el
 * estado de entrega (qué eventos ya procesó, cuáles fallaron, cuántos
 * intentos) vive en `outbox_event_delivery`, con `consumerName = 'ANALYTICS'`
 * -- ya NO en `OutboxEvent.status` (deprecado, ver schema.prisma). Esto es
 * lo que permite que GAMIFICATION (Bloque I, Learning Experience Foundation)
 * consuma el mismo `outbox_event` de forma completamente independiente, sin
 * competir por las mismas filas.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly deliveryRepo: OutboxEventDeliveryRepository,
    private readonly analyticsEventRepo: AnalyticsEventRepository,
    private readonly config: ConfigService,
  ) {}

  /**
   * Procesa un lote de OutboxEvent pendientes para ANALYTICS (sin fila de
   * entrega propia todavía, o con una fila FAILED que no agotó reintentos).
   * Cada fila se procesa de forma independiente -- un fallo en una NO
   * detiene el resto del lote (ver gate de aceptación, punto 3).
   */
  async ingestPending(): Promise<{ processed: number; failed: number }> {
    const pending = await this.deliveryRepo.findPendingFor(CONSUMER_NAME, RELAY_BATCH_SIZE, MAX_DELIVERY_ATTEMPTS);

    let processed = 0;
    let failed = 0;

    for (const outboxEvent of pending) {
      try {
        await this.ingestOne(outboxEvent);
        await this.deliveryRepo.recordOutcome(outboxEvent.id, CONSUMER_NAME, { status: 'PROCESSED' });
        processed++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`OutboxEvent ${outboxEvent.id} ("${outboxEvent.eventKey}") no se pudo ingerir: ${message}`);
        await this.deliveryRepo.recordOutcome(outboxEvent.id, CONSUMER_NAME, { status: 'FAILED', lastError: message });
      }
    }

    return { processed, failed };
  }

  private async ingestOne(outboxEvent: OutboxEvent): Promise<void> {
    // Idempotencia ante reintento tras un crash entre el insert de
    // analytics_event y el registro de la entrega (recordOutcome): si ya
    // existe, se considera éxito en vez de fallo -- no se reprocesa ni se duplica.
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
