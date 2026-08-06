import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma, AnswerOption } from '../generated/prisma/client';

/**
 * Repositorio propio del agregado AnswerOption (dominio EDUCATION). Ver ADR-0012.
 * `findById` incluye `isCorrect` -- uso interno exclusivo de PROGRESS
 * (ADR-0014) para validar una respuesta; nunca se expone directamente hacia
 * un endpoint de EDUCATION.
 */
@Injectable()
export class AnswerOptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(options: Prisma.AnswerOptionUncheckedCreateInput[]): Promise<number> {
    const result = await this.prisma.answerOption.createMany({ data: options });
    return result.count;
  }

  /** `tx` opcional -- GAMIFICATION (QuickQuestionService, 4.b) lo pasa para leer dentro de la transacción bloqueada por sesión; PROGRESS sigue sin pasarlo. */
  findById(id: string, tx?: Prisma.TransactionClient): Promise<AnswerOption | null> {
    return (tx ?? this.prisma).answerOption.findUnique({ where: { id } });
  }
}
