import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventRepository } from './outbox-event.repository';
import type { Prisma } from '../../generated/prisma/client';

/**
 * Infraestructura COMPARTIDA de plataforma -- ver docs/adr/0006-analytics-foundation.md.
 * Cualquier dominio puede publicar un hecho ya ocurrido; ANALYTICS es hoy el
 * único consumidor, pero el diseño admite consumidores futuros (Gamification,
 * Progress, Recommendation, Notification...) leyendo la misma tabla.
 *
 * Publicación BEST-EFFORT, no transaccional: se llama después de que la
 * operación principal ya confirmó. Un fallo al publicar NUNCA hace fallar la
 * operación de negocio -- Master Context 6.16: "si Analytics falla, el flujo
 * principal continuará". Hueco conocido y aceptado: una caída del proceso
 * exactamente entre el commit principal y este insert pierde ese evento
 * puntual, sin reintento. Aceptable porque ningún dominio productor hoy
 * depende de que el evento se entregue -- si alguno llegara a necesitarlo,
 * este método tendría que moverse dentro de la transacción del llamador.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly outboxRepo: OutboxEventRepository,
    private readonly config: ConfigService,
  ) {}

  async publish(input: {
    eventKey: string;
    schemaVersion: string;
    sourceDomain: string;
    aggregateId?: string;
    payload: Prisma.InputJsonValue;
    occurredAt?: Date;
  }): Promise<void> {
    try {
      await this.outboxRepo.create({
        eventKey: input.eventKey,
        schemaVersion: input.schemaVersion,
        sourceDomain: input.sourceDomain,
        aggregateId: input.aggregateId ?? null,
        producerVersion: this.config.get<string>('PRODUCER_VERSION') ?? null,
        occurredAt: input.occurredAt ?? new Date(),
        payload: input.payload,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo publicar el evento "${input.eventKey}" en el outbox -- se descarta, no bloquea la operación principal: ${error}`,
      );
    }
  }
}
