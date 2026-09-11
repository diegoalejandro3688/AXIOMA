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

  /**
   * WEB-0D.1B-P0B2 -- candidatos a minimización: filas de un `eventKey`
   * CONOCIDO (registro de consumidores) que todavía tienen `accountId` sin
   * quitar (`aggregateId` no nulo, o `payload` con la clave `accountId`
   * presente). Ordenado por `createdAt` -- las filas más viejas son las más
   * probablemente ya terminales, sin garantizarlo (el llamador SIEMPRE
   * re-evalúa el estado terminal real vía `evaluateOutboxTerminalState`
   * antes de tocar nada). Nunca incluye un `eventKey` fuera de la lista
   * pasada -- dirección segura: lo desconocido nunca es candidato.
   */
  async findMinimizationCandidates(knownEventKeys: string[], limit: number): Promise<OutboxEvent[]> {
    if (knownEventKeys.length === 0) return [];
    const ids = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM outbox_event
      WHERE event_key = ANY(${knownEventKeys}) AND (aggregate_id IS NOT NULL OR payload ? 'accountId')
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;
    if (ids.length === 0) return [];
    return this.prisma.outboxEvent.findMany({ where: { id: { in: ids.map((r) => r.id) } } });
  }

  /**
   * Minimización central -- quita ÚNICAMENTE la clave `accountId` de
   * `payload` (operador `jsonb - 'key'`, mismo patrón que
   * `AnalyticsEventRepository.stripAccountIdFromPayload`) y pone
   * `aggregate_id = NULL`. Cualquier otro campo del payload, `id`,
   * `eventKey`, `schemaVersion`, `sourceDomain`, `producerVersion`,
   * `occurredAt`, `createdAt`, y `outbox_event_delivery` quedan intactos.
   * Idempotente por construcción: correrlo sobre una fila ya minimizada no
   * cambia nada (la clave ya no existe, `aggregate_id` ya es NULL).
   */
  async stripAccountId(id: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE outbox_event
      SET payload = payload - 'accountId', aggregate_id = NULL
      WHERE id = ${id}::uuid
    `;
  }

  /**
   * Candidatos a purga: filas de un `eventKey` CONOCIDO, sin importar si ya
   * fueron minimizadas o no -- el llamador vuelve a evaluar terminalidad y
   * antigüedad reales antes de borrar. Acotado por `limit`, ordenado por
   * `createdAt` (las más viejas primero, mismo criterio que arriba).
   */
  async findPurgeCandidates(knownEventKeys: string[], limit: number): Promise<OutboxEvent[]> {
    return this.prisma.outboxEvent.findMany({
      where: { eventKey: { in: knownEventKeys } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Borra la fila completa -- `OutboxEventDelivery` cae por la cascada real
   * del esquema (`onDelete: Cascade`), nunca un borrado manual aparte.
   * Idempotente: si la fila ya no existe, `deleteMany` afecta 0 filas en
   * vez de lanzar.
   */
  async deleteById(id: string): Promise<number> {
    const result = await this.prisma.outboxEvent.deleteMany({ where: { id } });
    return result.count;
  }
}
