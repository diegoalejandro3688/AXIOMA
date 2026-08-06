import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { QuickQuestionAttempt } from '../generated/prisma/client';

/**
 * Único punto de acceso a `quick_question_attempt` -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.1/13.3 (Bloque IV, Incremento 4,
 * sub-incremento 4.a). Nunca crea ni toca `student_response`/
 * `curriculum_topic_progress` -- corrección propia (`isCorrect`) resuelta
 * por el llamador (4.b) reutilizando el mecanismo de EDUCATION, jamás el de
 * PROGRESS.
 *
 * `create` exige `tx` -- misma transacción que
 * `QuickQuestionSessionRepository.clearCurrentQuestion` (§13.3 punto 4).
 * `@@unique([sessionId, questionVersionId])`/`@@unique([operationId])` ya
 * refuerzan a nivel de base de datos lo que 4.b valida antes de escribir --
 * sin recuperación automática de P2002 aquí: el llamador (4.b) decide cómo
 * responder a una carrera real (mismo criterio documentado en
 * `AccountChallengeRepository`, verificar-antes-de-crear dentro de una
 * transacción explícita no puede recuperarse de un error de restricción
 * sobre la misma conexión).
 */
@Injectable()
export class QuickQuestionAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: Prisma.TransactionClient,
    input: {
      sessionId: string;
      accountId: string;
      questionVersionId: string;
      answerOptionId: string;
      isCorrect: boolean;
      presentedAt: Date;
      operationId: string;
    },
  ): Promise<QuickQuestionAttempt> {
    return tx.quickQuestionAttempt.create({ data: input });
  }

  findByOperationId(operationId: string): Promise<QuickQuestionAttempt | null> {
    return this.prisma.quickQuestionAttempt.findUnique({ where: { operationId } });
  }

  findBySessionAndQuestionVersion(sessionId: string, questionVersionId: string): Promise<QuickQuestionAttempt | null> {
    return this.prisma.quickQuestionAttempt.findUnique({
      where: { sessionId_questionVersionId: { sessionId, questionVersionId } },
    });
  }

  findQuestionVersionIdsBySession(sessionId: string): Promise<string[]> {
    return this.prisma.quickQuestionAttempt
      .findMany({ where: { sessionId }, select: { questionVersionId: true } })
      .then((rows) => rows.map((r) => r.questionVersionId));
  }

  findBySessionId(sessionId: string): Promise<QuickQuestionAttempt[]> {
    return this.prisma.quickQuestionAttempt.findMany({ where: { sessionId }, orderBy: { respondedAt: 'asc' } });
  }
}
