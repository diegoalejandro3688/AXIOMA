import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma, QuestionVersion, AnswerOption } from '../generated/prisma/client';

export type QuestionVersionWithDetails = QuestionVersion & {
  question: { id: string; questionKey: string; questionType: string };
  answerOptions: AnswerOption[];
};

export type QuestionVersionWithQuestionStatus = QuestionVersion & {
  question: { id: string; status: string };
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

  /**
   * Uso interno de PROGRESS (ADR-0014) para validar una respuesta: incluye
   * el `status` de la identidad lógica (`question`) -- una pregunta retirada
   * no puede responderse aunque su última versión siga `PUBLISHED`.
   */
  findByIdWithQuestionStatus(id: string): Promise<QuestionVersionWithQuestionStatus | null> {
    return this.prisma.questionVersion.findUnique({
      where: { id },
      include: { question: { select: { id: true, status: true } } },
    });
  }

  /** Conteo de versiones publicadas de un tema -- usado por PROGRESS para determinar completitud (ADR-0014, punto 6). */
  countPublishedByTopicId(curriculumTopicId: string): Promise<number> {
    return this.prisma.questionVersion.count({ where: { curriculumTopicId, editorialStatus: 'PUBLISHED' } });
  }
}
