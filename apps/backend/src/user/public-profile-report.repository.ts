import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { PublicProfileReport, PublicProfileReportType, PublicProfileReportStatus } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** PS-0C.2 -- único punto de acceso a `public_profile_report`. */
@Injectable()
export class PublicProfileReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotente por `(reporter, target, reportType)`: un doble toque / retry
   * devuelve la fila previa con `created: false`. NUNCA re-abre un reporte ya
   * resuelto (DISMISSED/ACTIONED) -- ver `SafetyService.reportPublicProfile`.
   */
  async create(input: {
    reporterAccountId: string;
    targetAccountId: string;
    targetPublicProfileId: string;
    reportType: PublicProfileReportType;
  }): Promise<{ report: PublicProfileReport; created: boolean }> {
    try {
      const report = await this.prisma.publicProfileReport.create({ data: input });
      return { report, created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
        const existing = await this.prisma.publicProfileReport.findUnique({
          where: {
            reporterAccountId_targetAccountId_reportType: {
              reporterAccountId: input.reporterAccountId,
              targetAccountId: input.targetAccountId,
              reportType: input.reportType,
            },
          },
        });
        if (existing) return { report: existing, created: false };
      }
      throw error;
    }
  }

  findById(id: string): Promise<PublicProfileReport | null> {
    return this.prisma.publicProfileReport.findUnique({ where: { id } });
  }

  /** Ruta de operador -- reportes OPEN, más antiguos primero. */
  listByStatus(status: PublicProfileReportStatus, limit = 200): Promise<PublicProfileReport[]> {
    return this.prisma.publicProfileReport.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  countOpenForTarget(targetAccountId: string): Promise<number> {
    return this.prisma.publicProfileReport.count({ where: { targetAccountId, status: 'OPEN' } });
  }

  /** Sólo transiciona filas OPEN -- devuelve el conteo afectado (0 si ya estaba resuelta). */
  async resolve(id: string, status: 'DISMISSED' | 'ACTIONED', resolutionCode: string): Promise<number> {
    const result = await this.prisma.publicProfileReport.updateMany({
      where: { id, status: 'OPEN' },
      data: { status, resolutionCode, reviewedAt: new Date() },
    });
    return result.count;
  }

  /**
   * Marca TODOS los reportes OPEN de un objetivo como ACTIONED en un solo
   * update -- usado cuando el operador resetea la identidad pública: todos
   * los reportes abiertos contra ese username quedan resueltos por esa
   * acción.
   */
  async actionAllOpenForTarget(targetAccountId: string, resolutionCode: string): Promise<number> {
    const result = await this.prisma.publicProfileReport.updateMany({
      where: { targetAccountId, status: 'OPEN' },
      data: { status: 'ACTIONED', resolutionCode, reviewedAt: new Date() },
    });
    return result.count;
  }

  /**
   * F1-A.4 -- cierre definitivo de cuenta. Reemplaza `reporterAccountId` por
   * `ref` en toda fila donde el reportante sea la cuenta que se cierra.
   * Idempotente: una fila ya pseudonimizada no vuelve a matchear el `where`
   * (compara contra el `accountId` ORIGINAL), así que una corrida repetida
   * afecta 0 filas sin lanzar -- mismo criterio que el resto del barrido.
   */
  async pseudonymizeReporter(accountId: string, ref: string): Promise<number> {
    const result = await this.prisma.publicProfileReport.updateMany({
      where: { reporterAccountId: accountId },
      data: { reporterAccountId: ref },
    });
    return result.count;
  }

  /**
   * F1-A.4 -- cierre definitivo de cuenta. Reemplaza `targetAccountId` Y
   * `targetPublicProfileId` por el MISMO `ref` en toda fila donde el objetivo
   * reportado sea la cuenta que se cierra -- `targetPublicProfileId` no se
   * resuelve contra `PublicProfile.id` real (evita depender del orden con la
   * anonimización de `PublicProfile`, que corre en otro paso del barrido):
   * basta con que deje de ser un identificador directo, y usar el mismo
   * `ref` que `targetAccountId` mantiene ambos campos consistentes entre sí
   * sin introducir un segundo espacio de pseudónimos.
   */
  async pseudonymizeTarget(accountId: string, ref: string): Promise<number> {
    const result = await this.prisma.publicProfileReport.updateMany({
      where: { targetAccountId: accountId },
      data: { targetAccountId: ref, targetPublicProfileId: ref },
    });
    return result.count;
  }
}
