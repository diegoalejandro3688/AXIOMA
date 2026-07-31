import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { CurriculumTopic } from '../generated/prisma/client';

/**
 * Repositorio propio del agregado CurriculumTopic (dominio EDUCATION).
 * Único punto de acceso a la tabla curriculum_topic -- ningún otro módulo
 * consulta esta tabla directamente vía PrismaService.
 */
@Injectable()
export class CurriculumTopicRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string): Promise<CurriculumTopic | null> {
    return this.prisma.curriculumTopic.findUnique({ where: { code } });
  }

  findChildren(parentId: string | null): Promise<CurriculumTopic[]> {
    return this.prisma.curriculumTopic.findMany({
      where: { parentId },
      orderBy: { order: 'asc' },
    });
  }

  count(): Promise<number> {
    return this.prisma.curriculumTopic.count();
  }
}
