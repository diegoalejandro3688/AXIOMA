import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { ExamPassage } from '../generated/prisma/client';

/**
 * Único punto de acceso a `exam_passage` -- ENSAYOS-F2 (ADR-0024).
 *
 * Un `ExamPassage` es un texto/estímulo compartido por 0..N `ExamQuestion`
 * del MISMO ensayo. Se persiste UNA sola vez; nunca dentro del `stemContent`
 * de cada pregunta. `(examId, passageKey)` y `(examId, displayOrder)` son
 * únicos. Inmutable una vez que su `Exam` está PUBLISHED
 * (`enforce_exam_passage_frozen_after_publish` es el respaldo de BD; el
 * servicio lo valida antes).
 */
@Injectable()
export class ExamPassageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos los pasajes de un ensayo, en su orden de presentación. */
  findByExamIdOrdered(examId: string, tx?: Prisma.TransactionClient): Promise<ExamPassage[]> {
    return (tx ?? this.prisma).examPassage.findMany({ where: { examId }, orderBy: { displayOrder: 'asc' } });
  }

  findByExamAndKey(examId: string, passageKey: string, tx?: Prisma.TransactionClient): Promise<ExamPassage | null> {
    return (tx ?? this.prisma).examPassage.findUnique({ where: { examId_passageKey: { examId, passageKey } } });
  }

  findByExamAndOrder(examId: string, displayOrder: number, tx?: Prisma.TransactionClient): Promise<ExamPassage | null> {
    return (tx ?? this.prisma).examPassage.findUnique({ where: { examId_displayOrder: { examId, displayOrder } } });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<ExamPassage | null> {
    return (tx ?? this.prisma).examPassage.findUnique({ where: { id } });
  }

  create(
    data: { examId: string; passageKey: string; displayOrder: number; title: string; content: Prisma.InputJsonValue },
    tx?: Prisma.TransactionClient,
  ): Promise<ExamPassage> {
    return (tx ?? this.prisma).examPassage.create({ data });
  }
}
