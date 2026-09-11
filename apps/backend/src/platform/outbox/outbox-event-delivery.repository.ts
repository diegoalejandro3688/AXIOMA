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
   *
   * WEB-0D.1B-P0B2-R1 -- `maxAttempts` (el mismo `MAX_DELIVERY_ATTEMPTS`
   * privado que YA usa cada consumidor para `findPendingFor`) se pasa
   * explícitamente para poder marcar `terminalAt` en el INSTANTE EXACTO en
   * que esta entrega se vuelve terminal:
   *   - PROCESSED -- siempre terminal, `terminalAt` = el mismo `now()` de
   *     `processedAt` (nunca una aproximación separada).
   *   - FAILED con los intentos NUEVOS (post-incremento) alcanzando o
   *     superando `maxAttempts` -- terminal, `terminalAt` = este instante
   *     exacto (nunca `createdAt` -- ver Issue 1 de la auditoría P0B2-R1).
   *   - FAILED por debajo de `maxAttempts` -- retryable, `terminalAt`
   *     permanece `null`.
   * PEGAJOSO (sticky) por diseño: si la fila YA tenía `terminalAt` (de un
   * intento anterior), NUNCA se sobreescribe -- evita que una llamada
   * fuera de secuencia (que en la práctica `findPendingFor` ya excluye)
   * extienda artificialmente el reloj de retención.
   */
  async recordOutcome(
    outboxEventId: string,
    consumerName: string,
    outcome: { status: 'PROCESSED' } | { status: 'FAILED'; lastError: string },
    maxAttempts: number,
  ): Promise<OutboxEventDelivery> {
    const existing = await this.prisma.outboxEventDelivery.findUnique({
      where: { outboxEventId_consumerName: { outboxEventId, consumerName } },
    });

    const nextAttempts = (existing?.attempts ?? 0) + 1;
    const becomesTerminalNow = outcome.status === 'PROCESSED' || nextAttempts >= maxAttempts;
    const terminalAt = existing?.terminalAt ?? (becomesTerminalNow ? new Date() : null);

    const data =
      outcome.status === 'PROCESSED'
        ? { status: 'PROCESSED' as const, lastError: null, processedAt: new Date(), attempts: nextAttempts, terminalAt }
        : { status: 'FAILED' as const, lastError: outcome.lastError, processedAt: null, attempts: nextAttempts, terminalAt };

    if (!existing) {
      try {
        return await this.prisma.outboxEventDelivery.create({ data: { outboxEventId, consumerName, ...data } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
          // Carrera: otra ejecución concurrente ya creó la fila entre el
          // findUnique de arriba y este create -- recompute contra el
          // estado real (ahora existente) en vez de asumir el propio.
          return this.recordOutcome(outboxEventId, consumerName, outcome, maxAttempts);
        }
        throw error;
      }
    }

    return this.prisma.outboxEventDelivery.update({
      where: { outboxEventId_consumerName: { outboxEventId, consumerName } },
      data,
    });
  }

  findFor(outboxEventId: string, consumerName: string): Promise<OutboxEventDelivery | null> {
    return this.prisma.outboxEventDelivery.findUnique({
      where: { outboxEventId_consumerName: { outboxEventId, consumerName } },
    });
  }

  /**
   * WEB-0D.1B-P0B2 -- TODAS las filas de entrega de UN `OutboxEvent`,
   * cualquier consumidor. Usado exclusivamente por `evaluateOutboxTerminalState`
   * (`outbox-terminal-state.ts`) para decidir si TODOS los consumidores
   * aplicables (registro) ya llegaron a un estado final -- nunca para
   * mutar nada.
   */
  findAllFor(outboxEventId: string): Promise<OutboxEventDelivery[]> {
    return this.prisma.outboxEventDelivery.findMany({ where: { outboxEventId } });
  }
}
