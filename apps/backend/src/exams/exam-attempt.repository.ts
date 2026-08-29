import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { ExamAttempt } from '../generated/prisma/client';

/**
 * Único punto de acceso a `exam_attempt` -- una rendición individual de un
 * ensayo (ADR-0024). `accountId` SIN FK (mismo criterio que
 * `QuickQuestionSession`/`CurriculumTopicProgress`, ADR-0014).
 *
 * Forward-only (`ACTIVE -> COMPLETED` / `ACTIVE -> EXPIRED`) reforzado por el
 * trigger `enforce_exam_attempt_status_transition`. El índice único parcial
 * `exam_attempt_one_active_per_account_exam` garantiza como máximo un intento
 * `ACTIVE` por `(cuenta, ensayo)`.
 */
@Injectable()
export class ExamAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Prisma.TransactionClient): Promise<ExamAttempt | null> {
    return (tx ?? this.prisma).examAttempt.findUnique({ where: { id } });
  }

  findActiveByAccountAndExam(accountId: string, examId: string, tx?: Prisma.TransactionClient): Promise<ExamAttempt | null> {
    return (tx ?? this.prisma).examAttempt.findFirst({ where: { accountId, examId, status: 'ACTIVE' } });
  }

  create(
    data: { accountId: string; examId: string; startedAt: Date; expiresAt: Date },
    tx?: Prisma.TransactionClient,
  ): Promise<ExamAttempt> {
    return (tx ?? this.prisma).examAttempt.create({ data });
  }

  /** Transición perezosa al superar `expiresAt` -- llamada desde cualquier lectura/escritura, dentro de la transacción bloqueada por intento. */
  markExpired(id: string, tx: Prisma.TransactionClient): Promise<ExamAttempt> {
    return tx.examAttempt.update({ where: { id }, data: { status: 'EXPIRED' } });
  }

  /** Entrega explícita -- `ACTIVE -> COMPLETED`, dentro de la transacción bloqueada por intento. */
  markCompleted(id: string, completedAt: Date, tx: Prisma.TransactionClient): Promise<ExamAttempt> {
    return tx.examAttempt.update({ where: { id }, data: { status: 'COMPLETED', completedAt } });
  }
}
