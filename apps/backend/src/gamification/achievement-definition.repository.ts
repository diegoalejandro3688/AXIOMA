import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AchievementDefinition, AchievementVisibilityClass, AchievementRepeatability } from '../generated/prisma/client';

/**
 * Único punto de acceso a `achievement_definition` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md (Incremento 2, sub-incremento 2.a).
 * Deliberadamente SIN `update()`/`delete()`: la autoría real de logros es
 * una herramienta futura (Plataforma Editorial, fuera de alcance) -- mismo
 * criterio que `RewardBundleRepository`/`LevelDefinitionRepository`.
 */
@Injectable()
export class AchievementDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    achievementKey: string;
    name: string;
    description?: string | null;
    achievementCategory: string;
    visibilityClass: AchievementVisibilityClass;
    repeatability: AchievementRepeatability;
    progressTrackingType: string;
  }): Promise<AchievementDefinition> {
    return this.prisma.achievementDefinition.create({ data: input });
  }

  findById(id: string): Promise<AchievementDefinition | null> {
    return this.prisma.achievementDefinition.findUnique({ where: { id } });
  }

  findByAchievementKey(achievementKey: string): Promise<AchievementDefinition | null> {
    return this.prisma.achievementDefinition.findUnique({ where: { achievementKey } });
  }

  findAllActiveOrderedByKey(): Promise<AchievementDefinition[]> {
    return this.prisma.achievementDefinition.findMany({ where: { status: 'ACTIVE' }, orderBy: { achievementKey: 'asc' } });
  }
}
