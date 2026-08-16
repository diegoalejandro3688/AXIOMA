import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AdminAccessLogEntry, AdminAccessOutcome } from '../generated/prisma/client';

/**
 * Único punto de acceso a `admin_access_log` -- "registro de accesos
 * relevantes" de ADMIN-002 en la lectura que §9.3 fija para V1.
 *
 * Solo `append` y lectura. No hay `update` ni `delete`, y aunque los hubiera
 * el trigger `admin_access_log_immutable` los rechazaría en PostgreSQL: el
 * servicio nunca es la garantía (§7.2, nota de rigor sobre la capa).
 */
@Injectable()
export class AdminAccessLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(input: {
    actorId: string | null;
    tokenId: string | null;
    outcome: AdminAccessOutcome;
    requestPath: string;
  }): Promise<AdminAccessLogEntry> {
    return this.prisma.adminAccessLogEntry.create({ data: input });
  }

  /**
   * Atribución histórica (invariante 23): las entradas de un actor siguen
   * consultables y atribuidas a él incluso después de desactivarlo.
   */
  findByActorId(actorId: string): Promise<AdminAccessLogEntry[]> {
    return this.prisma.adminAccessLogEntry.findMany({
      where: { actorId },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
