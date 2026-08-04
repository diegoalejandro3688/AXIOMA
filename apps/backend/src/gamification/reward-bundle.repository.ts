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
}
