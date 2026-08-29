import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { Exam } from '../generated/prisma/client';

/**
 * Único punto de acceso a `exam` -- dominio EXAMS / Ensayos V1 (ENSAYOS-F1,
 * ADR-0024). Un `Exam` no tiene versiones (ciclo de vida simple
 * DRAFT/PUBLISHED/RETIRED); el contenido versionado vive en
 * `question_version`, vinculado vía `exam_question`.
 *
 * ENSAYOS-F1 no expone escritura de `Exam` por HTTP -- la definición de un
 * ensayo se creará en ENSAYOS-M1-A/B (source + import). Los helpers de
 * creación existen aquí para que el gate y ese importer futuro tengan un
 * único camino de escritura.
 */
@Injectable()
export class ExamRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, tx?: Prisma.TransactionClient): Promise<Exam | null> {
    return (tx ?? this.prisma).exam.findUnique({ where: { id } });
  }

  findByKey(examKey: string, tx?: Prisma.TransactionClient): Promise<Exam | null> {
    return (tx ?? this.prisma).exam.findUnique({ where: { examKey } });
  }

  /** Ensayos disponibles para un estudiante -- solo PUBLISHED, orden estable por `examKey`. */
  listPublished(tx?: Prisma.TransactionClient): Promise<Exam[]> {
    return (tx ?? this.prisma).exam.findMany({ where: { status: 'PUBLISHED' }, orderBy: { examKey: 'asc' } });
  }

  create(
    data: { examKey: string; title: string; subjectId: string; durationSeconds: number },
    tx?: Prisma.TransactionClient,
  ): Promise<Exam> {
    return (tx ?? this.prisma).exam.create({ data });
  }

  /** Publica un ensayo en borrador -- transición de disponibilidad, no una versión. */
  publish(id: string, tx?: Prisma.TransactionClient): Promise<Exam> {
    return (tx ?? this.prisma).exam.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  }
}
