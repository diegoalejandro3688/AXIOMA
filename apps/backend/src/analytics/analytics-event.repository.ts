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

  /**
   * WEB-0D.1B-P0B1 -- remediación de filas EXISTENTES creadas antes de la
   * sanitización central (`AnalyticsService.ingestOne`/`omitAccountId`), que
   * podían tener `accountId` crudo dentro de `payload`. Operador `jsonb - 'key'`
   * de Postgres -- quita ÚNICAMENTE la clave `accountId`, preserva cualquier
   * otro campo del payload intacto. `WHERE payload ? 'accountId'` acota el
   * UPDATE a filas que realmente lo tienen -- correr esto dos veces afecta 0
   * filas la segunda vez (idempotente por construcción, no por un chequeo
   * adicional). No toca `id`/`analytics_actor_ref`/`occurred_at`/`created_at`/
   * ninguna otra columna, ni ninguna otra tabla.
   */
  async stripAccountIdFromPayload(): Promise<number> {
    const affected = await this.prisma.$executeRaw`
      UPDATE analytics_event
      SET payload = payload - 'accountId'
      WHERE payload ? 'accountId'
    `;
    return affected;
  }

  /** Solo para el script de reconciliación (`--dry-run`) -- cuenta SIN escribir. */
  async countPayloadsWithAccountId(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*)::bigint AS n FROM analytics_event WHERE payload ? 'accountId'
    `;
    return Number(rows[0]?.n ?? 0);
  }

  /**
   * WEB-0D.1B-P0B1B -- candidatos a retención: filas cuyo `occurredAt` (el
   * instante en que el evento de dominio realmente ocurrió, no `createdAt`/
   * `receivedAt` que solo reflejan cuándo el relay las ingirió) ya cruzó el
   * corte. Ordenado por `occurredAt` y acotado por `limit` -- mismo patrón
   * que `AiUsageLedgerRepository.findExpiredIds`.
   */
  async findExpiredIds(cutoff: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.analyticsEvent.findMany({
      where: { occurredAt: { lt: cutoff } },
      take: limit,
      select: { id: true },
      orderBy: { occurredAt: 'asc' },
    });
    return rows.map((row) => row.id);
  }

  /**
   * Borra únicamente las filas indicadas -- el llamador ya las obtuvo de
   * `findExpiredIds` con el mismo corte (mismo criterio que
   * `AiUsageLedgerRepository.deleteByIds`). No toca ninguna otra tabla.
   */
  async deleteByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await this.prisma.analyticsEvent.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  }
}
