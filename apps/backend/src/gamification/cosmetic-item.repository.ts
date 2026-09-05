import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { CosmeticItem, CosmeticSlot, CosmeticVisibilityStatus } from '../generated/prisma/client';

/**
 * Único punto de acceso a `cosmetic_item` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md §4.19 (Incremento 5, sub-incremento
 * 5.a). Deliberadamente SIN `update()`/`delete()`: inmutable por diseño,
 * mismo criterio que `TitleDefinitionRepository` -- autoría real de
 * cosméticos es una herramienta editorial futura, fuera de alcance.
 */
@Injectable()
export class CosmeticItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    itemKey: string;
    itemType: CosmeticSlot;
    name: string;
    description?: string | null;
    rarityClass: string;
    assetReference: string;
    visibilityStatus: CosmeticVisibilityStatus;
  }): Promise<CosmeticItem> {
    return this.prisma.cosmeticItem.create({ data: input });
  }

  findById(id: string): Promise<CosmeticItem | null> {
    return this.prisma.cosmeticItem.findUnique({ where: { id } });
  }

  findByItemKey(itemKey: string): Promise<CosmeticItem | null> {
    return this.prisma.cosmeticItem.findUnique({ where: { itemKey } });
  }

  /**
   * STABILIZATION-B6A -- resolución por lote id -> `cosmetic_item` para
   * `UnlockRequirementResolverService` (avatares históricos V1 = maestría de
   * materia). `WHERE id IN (...)`, una sola consulta.
   */
  findManyByIds(ids: string[]): Promise<CosmeticItem[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.cosmeticItem.findMany({ where: { id: { in: ids } } });
  }

  /**
   * LEF Bloque V, Incremento 6 -- catálogo de cosméticos VISIBLES
   * (`visibilityStatus = PUBLIC`, `status = ACTIVE`) que la cuenta NO
   * posee todavía -- candidatos a "bloqueado". Mismo criterio de
   * visibilidad ya usado por el resto del proyecto para catálogo público:
   * un `PRIVATE`/`RETIRED` nunca aparece, ni siquiera como bloqueado.
   */
  findManyPublicActiveExcludingIds(excludeIds: string[]): Promise<CosmeticItem[]> {
    return this.prisma.cosmeticItem.findMany({
      where: { visibilityStatus: 'PUBLIC', status: 'ACTIVE', id: { notIn: excludeIds } },
      orderBy: { itemKey: 'asc' },
    });
  }
}
