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

  /**
   * Progreso de la cuenta para MUCHOS temas a la vez -- evita el fan-out
   * N+1 de `findByAccountAndTopic` repetido por tema (ver hallazgo de
   * rate-limit en Inicio). Mismo criterio que `findAllByAccountIdWithSubject`:
   * una sola consulta `IN`, acotada por la cantidad de ids solicitados
   * (validada en el controller, máximo `MAX_TOPIC_PROGRESS_BATCH_IDS`).
   */
  findManyByAccountAndTopicIds(accountId: string, curriculumTopicIds: string[]): Promise<CurriculumTopicProgress[]> {
    return this.prisma.curriculumTopicProgress.findMany({
      where: { accountId, curriculumTopicId: { in: curriculumTopicIds } },
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
   * PROFILE-01 ("Progreso por materia" en Perfil) -- filas de progreso de la
   * cuenta SOBRE RECURSOS CANÓNICOS únicamente (`curriculum_topic` hijo con
   * `learning_resource_version` PUBLISHED -- misma definición que
   * `CurriculumTopicRepository.countCanonicalResourceTopicsGroupedBySubjectId`).
   * Con `subjectId` incluido (una sola consulta, sin N+1) para agrupar por
   * materia en la capa de servicio.
   *
   * El filtro en la consulta -- no en TS -- es lo que garantiza que una fila
   * de progreso sobre un topic RAÍZ legacy (p. ej. `M1.NUMEROS.PORCENTAJES`,
   * COMPLETED en varias cuentas de dev por "Continuar estudiando" antes del
   * fix de Study) NUNCA incremente el numerador de "completados". Antes (LEF
   * Bloque V, Incremento 3) se traían TODAS las filas y se agrupaban sin
   * distinguir recurso de unidad/legacy.
   */
  findCanonicalResourceProgressByAccount(accountId: string): Promise<CurriculumTopicProgressWithSubject[]> {
    return this.prisma.curriculumTopicProgress.findMany({
      where: {
        accountId,
        curriculumTopic: {
          parentId: { not: null },
          learningResourceVersions: { some: { editorialStatus: 'PUBLISHED' } },
        },
      },
      include: { curriculumTopic: { select: { subjectId: true } } },
    });
  }
}
