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
 * Publicación BEST-EFFORT por defecto (sin `tx`), no transaccional: se llama
 * después de que la operación principal ya confirmó. Un fallo al publicar
 * NUNCA hace fallar la operación de negocio -- Master Context 6.16: "si
 * Analytics falla, el flujo principal continuará". Hueco conocido y
 * aceptado para estos llamadores: una caída del proceso exactamente entre el
 * commit principal y este insert pierde ese evento puntual, sin reintento.
 * Comportamiento SIN CAMBIOS respecto a antes de VC4 para todo llamador que
 * no pase `tx`.
 *
 * VC4 (League Reward Reliability) -- `tx` opcional: cuando el llamador SÍ
 * depende de que el evento se publique (ver `QuickQuestionService.answer`),
 * pasa su propio `Prisma.TransactionClient` y el INSERT participa en esa
 * misma transacción -- un fallo aquí revierte TODO (incluida la fila
 * principal que el llamador acaba de crear), exactamente lo que este
 * docstring histórico decía que haría falta "si alguno llegara a
 * necesitarlo". Con `tx`, el error NUNCA se atrapa aquí -- se deja propagar
 * para que el `$transaction` del llamador haga ROLLBACK.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly outboxRepo: OutboxEventRepository,
    private readonly config: ConfigService,
  ) {}

  async publish(
    input: {
      eventKey: string;
      schemaVersion: string;
      sourceDomain: string;
      aggregateId?: string;
      payload: Prisma.InputJsonValue;
      occurredAt?: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const create = () =>
      this.outboxRepo.create(
        {
          eventKey: input.eventKey,
          schemaVersion: input.schemaVersion,
          sourceDomain: input.sourceDomain,
          aggregateId: input.aggregateId ?? null,
          producerVersion: this.config.get<string>('PRODUCER_VERSION') ?? null,
          occurredAt: input.occurredAt ?? new Date(),
          payload: input.payload,
        },
        tx,
      );

    if (tx) {
      // Transaccional: NUNCA se atrapa -- el llamador necesita que esto
      // revierta su transacción si falla.
      await create();
      return;
    }

    try {
      await create();
    } catch (error) {
      this.logger.error(
        `No se pudo publicar el evento "${input.eventKey}" en el outbox -- se descarta, no bloquea la operación principal: ${error}`,
      );
    }
  }
}
