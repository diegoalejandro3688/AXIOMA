import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { OutboxEvent, OutboxEventDelivery } from '../../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Único punto de acceso a `outbox_event_delivery` -- ver
 * docs/adr/0017-entrega-multiconsumidor-outbox.md. Infraestructura
 * COMPARTIDA de plataforma, igual que OutboxEventRepository: cualquier
 * dominio consumidor (ANALYTICS, GAMIFICATION, futuros) usa este mismo
 * repositorio con su propio `consumerName`, sin tabla propia.
 */
@Injectable()
export class OutboxEventDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Eventos pendientes para UN consumidor: sin fila de entrega todavía, o
   * con una fila FAILED que no agotó sus reintentos. "Pendiente" nunca es un
   * valor persistido -- ver comentario del enum en schema.prisma.
   *
   * `applicableEventKeys` -- lista de `eventKey` que ESTE consumidor sabe
   * procesar (la misma que ya usa su propio `isKnownEventKey`, ej.
   * `GAMIFICATION_EVENT_KEYS`/`ANALYTICS_EVENT_KEYS` de `@axioma/contracts`).
   * Filtra en el origen los eventos que este consumidor nunca podría
   * procesar -- evita que cada relay intente (y falle, agotando `attempts`)
   * contra eventos de dominios ajenos que nunca le corresponden. Este
   * repositorio compartido no conoce nombres de consumidor concretos ni
   * reglas por dominio -- solo aplica la lista que cada llamador le pasa.
   */
  findPendingFor(consumerName: string, applicableEventKeys: readonly string[], limit: number, maxAttempts: number): Promise<OutboxEvent[]> {
    return this.prisma.outboxEvent.findMany({
      where: {
        eventKey: { in: applicableEventKeys as string[] },
        OR: [
          { deliveries: { none: { consumerName } } },
          {
            deliveries: {
              some: { consumerName, status: 'FAILED', attempts: { lt: maxAttempts } },
            },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Registra el resultado (PROCESSED o FAILED) del intento de un consumidor
   * sobre un evento. Primer intento -> create; intento repetido sobre una
   * fila FAILED previa, o carrera concurrente entre dos ejecuciones del
   * mismo relay -> P2002, capturado explícitamente y resuelto con update
   * (mismo patrón que UserService.initializeProfile, ADR-0008, y
   * ProgressService, ADR-0014) -- nunca un error sin manejar, nunca una
   * fila duplicada (@@unique(outboxEventId, consumerName) es la garantía
   * real, a nivel de base de datos).
   */
  async recordOutcome(
    outboxEventId: string,
    consumerName: string,
    outcome: { status: 'PROCESSED' } | { status: 'FAILED'; lastError: string },
  ): Promise<OutboxEventDelivery> {
    const data =
      outcome.status === 'PROCESSED'
        ? { status: 'PROCESSED' as const, lastError: null, processedAt: new Date() }
        : { status: 'FAILED' as const, lastError: outcome.lastError, processedAt: null };

    try {
      return await this.prisma.outboxEventDelivery.create({
        data: { outboxEventId, consumerName, attempts: 1, ...data },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
        return this.prisma.outboxEventDelivery.update({
          where: { outboxEventId_consumerName: { outboxEventId, consumerName } },
          data: { attempts: { increment: 1 }, ...data },
        });
      }
      throw error;
    }
  }

  findFor(outboxEventId: string, consumerName: string): Promise<OutboxEventDelivery | null> {
    return this.prisma.outboxEventDelivery.findUnique({
      where: { outboxEventId_consumerName: { outboxEventId, consumerName } },
    });
  }
}
