import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma, type AnswerOption, type ExamQuestion, type QuestionVersion } from '../generated/prisma/client';

export type ExamQuestionWithVersion = ExamQuestion & {
  questionVersion: QuestionVersion & { answerOptions: AnswerOption[] };
};

/**
 * Único punto de acceso a `exam_question` -- vínculo ORDENADO entre un `Exam`
 * y una `QuestionVersion` publicada (ADR-0024). El orden de presentación vive
 * aquí (`displayOrder`), nunca en `question_version`.
 *
 * `@@unique([examId, questionVersionId])` y `@@unique([examId, displayOrder])`
 * (más el trigger `enforce_exam_question_version_published`) son el respaldo
 * de base de datos de lo que `ExamService.linkQuestion` valida antes de
 * escribir -- sin recuperación automática de P2002 aquí.
 */
@Injectable()
export class ExamQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Preguntas de un ensayo, en orden fijo de presentación, con alternativas ordenadas. */
  findByExamIdOrdered(examId: string, tx?: Prisma.TransactionClient): Promise<ExamQuestionWithVersion[]> {
    return (tx ?? this.prisma).examQuestion.findMany({
      where: { examId },
      orderBy: { displayOrder: 'asc' },
      include: {
        questionVersion: { include: { answerOptions: { orderBy: { displayOrder: 'asc' } } } },
      },
    });
  }

  countByExamId(examId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return (tx ?? this.prisma).examQuestion.count({ where: { examId } });
  }

  /** `true` si esa `questionVersionId` pertenece realmente a ese ensayo (validación de `ExamService` antes de aceptar una respuesta). */
  async belongsToExam(examId: string, questionVersionId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const row = await (tx ?? this.prisma).examQuestion.findUnique({
      where: { examId_questionVersionId: { examId, questionVersionId } },
      select: { id: true },
    });
    return row !== null;
  }

  findByExamAndVersion(examId: string, questionVersionId: string, tx?: Prisma.TransactionClient): Promise<ExamQuestion | null> {
    return (tx ?? this.prisma).examQuestion.findUnique({
      where: { examId_questionVersionId: { examId, questionVersionId } },
    });
  }

  findByExamAndOrder(examId: string, displayOrder: number, tx?: Prisma.TransactionClient): Promise<ExamQuestion | null> {
    return (tx ?? this.prisma).examQuestion.findUnique({
      where: { examId_displayOrder: { examId, displayOrder } },
    });
  }

  link(
    data: { examId: string; questionVersionId: string; displayOrder: number; passageId?: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<ExamQuestion> {
    return (tx ?? this.prisma).examQuestion.create({ data: { ...data, passageId: data.passageId ?? null } });
  }
}
