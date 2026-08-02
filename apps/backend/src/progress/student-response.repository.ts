import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma, StudentResponse } from '../generated/prisma/client';

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
}
