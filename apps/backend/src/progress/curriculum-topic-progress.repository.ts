import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { CurriculumTopicProgress, TopicProgressStatus } from '../generated/prisma/client';

export type CurriculumTopicProgressWithSubject = CurriculumTopicProgress & { curriculumTopic: { subjectId: string } };

/**
 * Repositorio propio del agregado CurriculumTopicProgress (dominio PROGRESS).
 * Ver ADR-0014. `NOT_STARTED` es la ausencia de fila -- nunca un valor
 * almacenado; este repositorio solo conoce IN_PROGRESS/COMPLETED.
 */
@Injectable()
export class CurriculumTopicProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByAccountAndTopic(accountId: string, curriculumTopicId: string): Promise<CurriculumTopicProgress | null> {
    return this.prisma.curriculumTopicProgress.findUnique({
      where: { accountId_curriculumTopicId: { accountId, curriculumTopicId } },
    });
  }

  /** Crea la fila si no existe (primera respuesta del estudiante en el tema); `IN_PROGRESS` por defecto. */
  createIfMissing(accountId: string, curriculumTopicId: string): Promise<CurriculumTopicProgress> {
    return this.prisma.curriculumTopicProgress.upsert({
      where: { accountId_curriculumTopicId: { accountId, curriculumTopicId } },
      update: {},
      create: { accountId, curriculumTopicId },
    });
  }

  touchActivity(id: string, status: TopicProgressStatus, completedAt: Date | null): Promise<CurriculumTopicProgress> {
    return this.prisma.curriculumTopicProgress.update({
      where: { id },
      data: { status, lastActivityAt: new Date(), completedAt },
    });
  }

  /** `deleteMany` -- nunca lanza si no hay filas (ADR-0014, punto 2; mismo criterio que ADR-0008). */
  async deleteByAccountId(accountId: string): Promise<number> {
    const result = await this.prisma.curriculumTopicProgress.deleteMany({ where: { accountId } });
    return result.count;
  }

  /**
   * LEF Bloque V, Incremento 3 -- TODAS las filas de progreso de la cuenta,
   * con `subjectId` incluido (una sola consulta, sin N+1) para agrupar por
   * materia en la capa de servicio (mismo criterio de "agregar en TS sobre
   * un lote ya acotado" que `CompetitiveProfileIdentityService`). El número
   * de filas está acotado por el catálogo total de temas -- nunca crece sin
   * límite.
   */
  findAllByAccountIdWithSubject(accountId: string): Promise<CurriculumTopicProgressWithSubject[]> {
    return this.prisma.curriculumTopicProgress.findMany({
      where: { accountId },
      include: { curriculumTopic: { select: { subjectId: true } } },
    });
  }
}
