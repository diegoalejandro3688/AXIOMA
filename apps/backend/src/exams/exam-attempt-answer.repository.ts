import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { ExamAttemptAnswer } from '../generated/prisma/client';

/**
 * Único punto de acceso a `exam_attempt_answer` -- la selección VIGENTE de
 * una pregunta dentro de un intento (ADR-0024). Nunca toca
 * `student_response`/`curriculum_topic_progress` -- corrección propia
 * (`isCorrect`) resuelta por el llamador reutilizando `AnswerOption.isCorrect`
 * de EDUCATION, jamás el mecanismo de PROGRESS.
 *
 * `@@unique([attemptId, questionVersionId])` -> una sola respuesta vigente por
 * pregunta por intento; cambiar de alternativa mientras el intento sigue
 * `ACTIVE` es un `UPDATE` de esa misma fila (ver `upsert`). El trigger
 * `enforce_exam_attempt_answer_frozen_after_close` bloquea INSERT/UPDATE/
 * DELETE si el intento ya no está `ACTIVE`.
 */
@Injectable()
export class ExamAttemptAnswerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOperationId(operationId: string, tx?: Prisma.TransactionClient): Promise<ExamAttemptAnswer | null> {
    return (tx ?? this.prisma).examAttemptAnswer.findUnique({ where: { operationId } });
  }

  findByAttemptId(attemptId: string, tx?: Prisma.TransactionClient): Promise<ExamAttemptAnswer[]> {
    return (tx ?? this.prisma).examAttemptAnswer.findMany({ where: { attemptId }, orderBy: { respondedAt: 'asc' } });
  }

  findOne(attemptId: string, questionVersionId: string, tx?: Prisma.TransactionClient): Promise<ExamAttemptAnswer | null> {
    return (tx ?? this.prisma).examAttemptAnswer.findUnique({
      where: { attemptId_questionVersionId: { attemptId, questionVersionId } },
    });
  }

  /**
   * Crea la selección o la cambia (una sola fila por `(attemptId,
   * questionVersionId)`). `tx` OBLIGATORIO -- siempre corre dentro de la
   * transacción bloqueada por intento de `ExamService.upsertAnswer`, que ya
   * validó pertenencia/estado/expiración/consistencia de la alternativa.
   */
  upsert(
    tx: Prisma.TransactionClient,
    data: {
      attemptId: string;
      accountId: string;
      questionVersionId: string;
      answerOptionId: string;
      isCorrect: boolean;
      operationId: string;
    },
  ): Promise<ExamAttemptAnswer> {
    return tx.examAttemptAnswer.upsert({
      where: { attemptId_questionVersionId: { attemptId: data.attemptId, questionVersionId: data.questionVersionId } },
      create: data,
      update: {
        answerOptionId: data.answerOptionId,
        isCorrect: data.isCorrect,
        operationId: data.operationId,
        respondedAt: new Date(),
      },
    });
  }
}
