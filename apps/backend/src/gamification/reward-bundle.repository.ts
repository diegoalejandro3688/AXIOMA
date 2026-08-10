import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { RewardBundle, RewardComponentType } from '../generated/prisma/client';

/**
 * Único punto de acceso a `reward_bundle`/`reward_bundle_item` -- ver
 * ADR-0019 (sub-incremento 1.a, "Fundación de persistencia").
 *
 * Deliberadamente SIN `update()`/`delete()`: nadie edita un bundle desde
 * este incremento (autoría real es una herramienta futura, fuera de
 * alcance). `create()` existe únicamente para fixtures de prueba y
 * configuración inicial (semilla) -- mismo criterio que
 * `GamificationProgramRepository.create()` en los gates del Bloque I.
 */
@Injectable()
export class RewardBundleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    bundleKey: string;
    name: string;
    items: Array<{ componentType: RewardComponentType; xpAmount?: number | null; referenceId?: string | null }>;
  }): Promise<RewardBundle> {
    return this.prisma.rewardBundle.create({
      data: {
        bundleKey: input.bundleKey,
        name: input.name,
        items: {
          create: input.items.map((item) => ({
            componentType: item.componentType,
            xpAmount: item.xpAmount ?? null,
            referenceId: item.referenceId ?? null,
          })),
        },
      },
    });
  }

  findByBundleKey(bundleKey: string) {
    return this.prisma.rewardBundle.findUnique({ where: { bundleKey }, include: { items: true } });
  }

  findById(id: string) {
    return this.prisma.rewardBundle.findUnique({ where: { id }, include: { items: true } });
  }

  /**
   * LEF Bloque V, Incremento 6 ("Personalización con elementos
   * bloqueados") -- lote, UNA sola consulta `WHERE component_type = ? AND
   * reference_id IN (...)`, para resolver qué `reward_bundle`(s) entregan
   * un título/cosmético concreto. Un mismo `referenceId` puede aparecer en
   * más de una fila (varios bundles distintos pueden entregar el mismo
   * artículo) -- se devuelve tal cual, sin deduplicar bundleId, es
   * responsabilidad del llamador agrupar.
   */
  async findByComponentReferenceIds(componentType: RewardComponentType, referenceIds: string[]): Promise<Array<{ referenceId: string; rewardBundleId: string }>> {
    if (referenceIds.length === 0) return [];
    // `referenceId` es NOT NULL por CHECK cuando componentType es TITLE/COSMETIC
    // (component_snapshot_check, ADR-0019 §1.a) -- el filtro es defensa en
    // profundidad a nivel de tipos, no una condición de negocio nueva.
    const rows = await this.prisma.rewardBundleItem.findMany({
      where: { componentType, referenceId: { in: referenceIds } },
      select: { referenceId: true, rewardBundleId: true },
    });
    return rows.filter((r): r is { referenceId: string; rewardBundleId: string } => r.referenceId !== null);
  }
}
