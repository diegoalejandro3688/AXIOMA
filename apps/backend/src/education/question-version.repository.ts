import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma, QuestionVersion, AnswerOption } from '../generated/prisma/client';

export type QuestionVersionWithDetails = QuestionVersion & {
  question: { id: string; questionKey: string; questionType: string };
  answerOptions: AnswerOption[];
};

/**
 * Repositorio propio del agregado QuestionVersion (dominio EDUCATION).
 * `curriculumTopicId` es la clasificación editorial fina, trazable por
 * versión -- ver ADR-0012, invariante 1.
 */
@Injectable()
export class QuestionVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.QuestionVersionUncheckedCreateInput): Promise<QuestionVersion> {
    return this.prisma.questionVersion.create({ data });
  }

  /**
   * Todas las versiones publicadas de un tema, con sus alternativas. Solo
   * `PUBLISHED` es servible -- ver EducationService. El repositorio devuelve
   * `AnswerOption` completo (incluye `isCorrect`); la exclusión hacia el
   * cliente ocurre en la capa de mapeo a respuesta (nunca en el repositorio,
   * que debe reflejar el dato real para uso interno futuro de Progress).
   */
  findPublishedByTopicId(curriculumTopicId: string): Promise<QuestionVersionWithDetails[]> {
    return this.prisma.questionVersion.findMany({
      where: { curriculumTopicId, editorialStatus: 'PUBLISHED' },
      orderBy: { publishedAt: 'asc' },
      include: {
        question: { select: { id: true, questionKey: true, questionType: true } },
        answerOptions: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }
}
