import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Question } from '../generated/prisma/client';

/**
 * Repositorio propio del agregado Question (identidad -- dominio EDUCATION).
 * `primarySubjectId` es inmutable una vez creado (trigger
 * `enforce_question_subject_immutable`). `questionType` fijo a
 * SINGLE_CHOICE en M1 -- ver ADR-0012.
 */
@Injectable()
export class QuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Question | null> {
    return this.prisma.question.findUnique({ where: { id } });
  }

  findByKey(questionKey: string): Promise<Question | null> {
    return this.prisma.question.findUnique({ where: { questionKey } });
  }

  upsertByKey(input: { questionKey: string; primarySubjectId: string }): Promise<Question> {
    return this.prisma.question.upsert({
      where: { questionKey: input.questionKey },
      // Sin campos en `update`: identidad estable, nada que re-sembrar salvo
      // primarySubjectId, que es deliberadamente inmutable (ver trigger).
      update: {},
      create: { questionKey: input.questionKey, primarySubjectId: input.primarySubjectId },
    });
  }
}
