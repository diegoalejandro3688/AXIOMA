import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma, LearningResourceVersion } from '../generated/prisma/client';

export type LearningResourceVersionWithResource = LearningResourceVersion & {
  learningResource: { id: string; resourceKey: string };
};

/**
 * Repositorio propio del agregado LearningResourceVersion (dominio EDUCATION).
 * `curriculumTopicId` es la clasificación editorial fina, trazable por
 * versión -- ver ADR-0012, invariante 1. La consistencia con la materia de la
 * identidad la aplica el trigger `enforce_learning_resource_version_subject_consistency`.
 */
@Injectable()
export class LearningResourceVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.LearningResourceVersionUncheckedCreateInput): Promise<LearningResourceVersion> {
    return this.prisma.learningResourceVersion.create({ data });
  }

  /**
   * La versión publicada más reciente de un tema. Solo `PUBLISHED` es
   * servible a estudiantes (ver EducationService) -- draft/in_review/etc.
   * nunca deben llegar a un endpoint ordinario.
   */
  findLatestPublishedByTopicId(curriculumTopicId: string): Promise<LearningResourceVersionWithResource | null> {
    return this.prisma.learningResourceVersion.findFirst({
      where: { curriculumTopicId, editorialStatus: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      include: { learningResource: { select: { id: true, resourceKey: true } } },
    });
  }
}
