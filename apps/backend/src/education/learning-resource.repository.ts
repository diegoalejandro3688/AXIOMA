import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { LearningResource, LearningResourceType } from '../generated/prisma/client';

/**
 * Repositorio propio del agregado LearningResource (identidad -- dominio
 * EDUCATION). `primarySubjectId` es inmutable una vez creado -- aplicado por
 * el trigger `enforce_learning_resource_subject_immutable`. Ver ADR-0012.
 */
@Injectable()
export class LearningResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<LearningResource | null> {
    return this.prisma.learningResource.findUnique({ where: { id } });
  }

  findByKey(resourceKey: string): Promise<LearningResource | null> {
    return this.prisma.learningResource.findUnique({ where: { resourceKey } });
  }

  upsertByKey(input: {
    resourceKey: string;
    primarySubjectId: string;
    resourceType: LearningResourceType;
  }): Promise<LearningResource> {
    return this.prisma.learningResource.upsert({
      where: { resourceKey: input.resourceKey },
      // `primarySubjectId` deliberadamente ausente de `update`: es inmutable
      // (ver trigger); re-sembrar con la misma materia es un no-op, cambiarla
      // debe fallar de forma explícita, no aplicarse en silencio.
      update: { resourceType: input.resourceType },
      create: input,
    });
  }
}
