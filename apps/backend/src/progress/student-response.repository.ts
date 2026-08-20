import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma, StudentResponse } from '../generated/prisma/client';

export type StudentResponseWithTopic = StudentResponse & { questionVersion: { curriculumTopicId: string } };

/**
 * Repositorio propio del agregado StudentResponse (dominio PROGRESS). Ver
 * ADR-0014. La fila es inmutable tras crearse (aplicado por trigger de
 * Postgres) -- este repositorio nunca expone un método de actualización.
 */
@Injectable()
export class StudentResponseRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOperationId(operationId: string): Promise<StudentResponse | null> {
    return this.prisma.studentResponse.findUnique({ where: { operationId } });
  }

  findByAccountAndQuestionVersion(accountId: string, questionVersionId: string): Promise<StudentResponse | null> {
    return this.prisma.studentResponse.findUnique({
      where: { accountId_questionVersionId: { accountId, questionVersionId } },
    });
  }

  create(data: Prisma.StudentResponseUncheckedCreateInput): Promise<StudentResponse> {
    return this.prisma.studentResponse.create({ data });
  }

  /** Respuestas de una cuenta dentro de un tema -- vía join a `question_version.curriculum_topic_id`. */
  listByAccountAndTopic(accountId: string, curriculumTopicId: string): Promise<StudentResponse[]> {
    return this.prisma.studentResponse.findMany({
      where: { accountId, questionVersion: { curriculumTopicId } },
      orderBy: { respondedAt: 'asc' },
    });
  }

  /**
   * Respuestas de una cuenta para MUCHOS temas a la vez -- evita el fan-out
   * N+1 de `listByAccountAndTopic` repetido por tema. Incluye
   * `questionVersion.curriculumTopicId` porque, a diferencia del método de
   * un solo tema, el llamador todavía no sabe a qué tema pertenece cada
   * fila -- lo necesita para agrupar en la capa de servicio.
   */
  listByAccountAndTopics(accountId: string, curriculumTopicIds: string[]): Promise<StudentResponseWithTopic[]> {
    return this.prisma.studentResponse.findMany({
      where: { accountId, questionVersion: { curriculumTopicId: { in: curriculumTopicIds } } },
      include: { questionVersion: { select: { curriculumTopicId: true } } },
      orderBy: { respondedAt: 'asc' },
    });
  }

  /** Preguntas distintas respondidas por la cuenta en el tema -- usado para determinar completitud (ADR-0014, punto 6). */
  countDistinctByAccountAndTopic(accountId: string, curriculumTopicId: string): Promise<number> {
    return this.prisma.studentResponse.count({
      where: { accountId, questionVersion: { curriculumTopicId } },
    });
  }

  /** `deleteMany` -- nunca lanza si no hay filas (ADR-0014, punto 2). */
  async deleteByAccountId(accountId: string): Promise<number> {
    const result = await this.prisma.studentResponse.deleteMany({ where: { accountId } });
    return result.count;
  }

  /**
   * LEF Bloque V, Incremento 3 ("Resumen académico privado") -- total de
   * respuestas y de respuestas correctas de la cuenta, en UNA sola consulta
   * agregada (sin traer las filas completas). Fuente única de precisión
   * ("preguntas respondidas/correctas") -- sin cálculo derivado en otro
   * lugar, sin duplicar este conteo.
   */
  async countByAccountGroupedByCorrectness(accountId: string): Promise<{ total: number; correct: number }> {
    const rows = await this.prisma.studentResponse.groupBy({ by: ['isCorrect'], where: { accountId }, _count: { _all: true } });
    const correct = rows.find((r) => r.isCorrect)?._count._all ?? 0;
    const incorrect = rows.find((r) => !r.isCorrect)?._count._all ?? 0;
    return { total: correct + incorrect, correct };
  }

  /** Última actividad académica real de la cuenta (marca de tiempo de la respuesta más reciente) -- `null` si nunca respondió nada. */
  async findMostRecentByAccountId(accountId: string): Promise<StudentResponse | null> {
    return this.prisma.studentResponse.findFirst({ where: { accountId }, orderBy: { respondedAt: 'desc' } });
  }
}
