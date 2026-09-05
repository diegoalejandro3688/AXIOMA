import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { TitleDefinition, TitleVisibilityStatus } from '../generated/prisma/client';

/**
 * Único punto de acceso a `title_definition` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md (Incremento 3, sub-incremento 3.a).
 * Deliberadamente SIN `update()`/`delete()`: autoría real de títulos es
 * una herramienta editorial futura, fuera de alcance -- mismo criterio que
 * `AchievementDefinitionRepository`/`RewardBundleRepository`.
 */
@Injectable()
export class TitleDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    titleKey: string;
    displayText: string;
    description?: string | null;
    rarityClass: string;
    unlockSourceType: string;
    visibilityStatus: TitleVisibilityStatus;
  }): Promise<TitleDefinition> {
    return this.prisma.titleDefinition.create({ data: input });
  }

  findById(id: string): Promise<TitleDefinition | null> {
    return this.prisma.titleDefinition.findUnique({ where: { id } });
  }

  findByTitleKey(titleKey: string): Promise<TitleDefinition | null> {
    return this.prisma.titleDefinition.findUnique({ where: { titleKey } });
  }

  /**
   * STABILIZATION-B6 -- resolución por lote para
   * `UnlockRequirementResolverService`: dado un conjunto de
   * `titleDefinitionId`, devuelve sus filas (para casar `titleKey` contra
   * `TITLES_V1` y describir el requisito de umbral). Lectura pura, `IN (...)`.
   */
  findManyByIds(ids: string[]): Promise<TitleDefinition[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.titleDefinition.findMany({ where: { id: { in: ids } } });
  }

  /**
   * LEF Bloque V, Incremento 6 -- catálogo de títulos VISIBLES
   * (`visibilityStatus = PUBLIC`, `status = ACTIVE`) que la cuenta NO
   * posee todavía -- candidatos a "bloqueado". Mismo criterio que
   * `CosmeticItemRepository.findManyPublicActiveExcludingIds`.
   */
  findManyPublicActiveExcludingIds(excludeIds: string[]): Promise<TitleDefinition[]> {
    return this.prisma.titleDefinition.findMany({
      where: { visibilityStatus: 'PUBLIC', status: 'ACTIVE', id: { notIn: excludeIds } },
      orderBy: { titleKey: 'asc' },
    });
  }
}
