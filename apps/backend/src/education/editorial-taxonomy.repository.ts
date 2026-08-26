import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { CurriculumTopic, Prisma, Subject } from '../generated/prisma/client';

/**
 * Repositorio de ESCRITURA de taxonomía editorial (`subject`,
 * `curriculum_topic`) -- CONTENT-4.2A. Mismo criterio exacto que
 * `editorial-authoring.repository.ts` (Incremento 4): archivo propio para no
 * tocar `subject.repository.ts`/`curriculum-topic.repository.ts`, que
 * declaran los lectores canónicos ya usados por EDUCATION/PROGRESS/ADMIN y
 * deben permanecer byte-idénticos.
 *
 * Sin `update`, sin `delete`. No admite `id` del llamador (lo genera
 * PostgreSQL). La decisión de "crear vs. NO-OP vs. rechazar por
 * contradicción estructural" vive en `EditorialTaxonomyService`, no aquí --
 * este archivo solo sabe leer por clave estable y crear.
 */
@Injectable()
export class EditorialTaxonomyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSubjectByKey(subjectKey: string, tx?: Prisma.TransactionClient): Promise<Subject | null> {
    return (tx ?? this.prisma).subject.findUnique({ where: { subjectKey } });
  }

  findSubjectById(id: string, tx?: Prisma.TransactionClient): Promise<Subject | null> {
    return (tx ?? this.prisma).subject.findUnique({ where: { id } });
  }

  createSubject(
    tx: Prisma.TransactionClient,
    input: { subjectKey: string; name: string; shortName: string; displayOrder: number },
  ): Promise<Subject> {
    return tx.subject.create({ data: input });
  }

  findTopicByCode(code: string, tx?: Prisma.TransactionClient): Promise<CurriculumTopic | null> {
    return (tx ?? this.prisma).curriculumTopic.findUnique({ where: { code } });
  }

  findTopicById(id: string, tx?: Prisma.TransactionClient): Promise<CurriculumTopic | null> {
    return (tx ?? this.prisma).curriculumTopic.findUnique({ where: { id } });
  }

  createTopic(
    tx: Prisma.TransactionClient,
    input: { code: string; name: string; order: number; subjectId: string; parentId: string | null },
  ): Promise<CurriculumTopic> {
    return tx.curriculumTopic.create({ data: input });
  }
}
