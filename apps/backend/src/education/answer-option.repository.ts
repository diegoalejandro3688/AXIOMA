import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';

/** Repositorio propio del agregado AnswerOption (dominio EDUCATION). Ver ADR-0012. */
@Injectable()
export class AnswerOptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(options: Prisma.AnswerOptionUncheckedCreateInput[]): Promise<number> {
    const result = await this.prisma.answerOption.createMany({ data: options });
    return result.count;
  }
}
