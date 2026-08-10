import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { FeaturedAchievement } from '../generated/prisma/client';

export type FeaturedAchievementWithDetails = FeaturedAchievement & {
  achievementUnlock: { unlockedAt: Date; achievementDefinition: { achievementKey: string; name: string; visibilityClass: string } };
};

/**
 * Único punto de acceso a `public_profile_featured_achievement` -- ver
 * docs/adr/LEF-BLOCK-V-DEFINITION.md §10. `replaceAll` es la ÚNICA
 * operación de escritura (reemplazo atómico completo, nunca "añadir uno")
 * -- DEBE ejecutarse dentro de la transacción bloqueada por
 * `FeaturedAchievementService.setFeatured` (advisory lock namespace 24).
 * Los triggers `enforce_featured_achievement_capacity`/
 * `enforce_featured_achievement_consistency` son el respaldo real en base
 * de datos; este repositorio no duplica esa validación.
 */
@Injectable()
export class FeaturedAchievementRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `tx` obligatorio -- mismo criterio que `AchievementUnlockRepository.createIdempotent`:
   * esta operación SIEMPRE vive dentro de la transacción que ya sostiene el
   * advisory lock (`FeaturedAchievementService.setFeatured`), nunca se
   * invoca fuera de ella. `achievementUnlockIds` ya viene validado (0-3,
   * sin duplicados, todos elegibles) por el llamador -- este método solo
   * ejecuta el DELETE+INSERT, no vuelve a validar.
   */
  async replaceAll(tx: Prisma.TransactionClient, publicProfileId: string, achievementUnlockIds: string[]): Promise<void> {
    await tx.featuredAchievement.deleteMany({ where: { publicProfileId } });
    if (achievementUnlockIds.length === 0) return;
    await tx.featuredAchievement.createMany({
      data: achievementUnlockIds.map((achievementUnlockId, index) => ({ publicProfileId, achievementUnlockId, displayOrder: index })),
    });
  }

  findByPublicProfileId(publicProfileId: string): Promise<FeaturedAchievementWithDetails[]> {
    return this.prisma.featuredAchievement.findMany({
      where: { publicProfileId },
      orderBy: { displayOrder: 'asc' },
      include: { achievementUnlock: { include: { achievementDefinition: { select: { achievementKey: true, name: true, visibilityClass: true } } } } },
    });
  }

  /**
   * Bloque IV, Incremento 3, sub-incremento 3.a, mismo criterio de lote --
   * UNA sola consulta `WHERE public_profile_id IN (...)`, para la
   * resolución de identidad pública (`CompetitiveProfileIdentityService`).
   * Re-filtra `visibilityClass = 'PUBLIC'`/`status = 'ACTIVE'` en el
   * `WHERE` -- una insignia destacada cuyo logro cambió a PRIVATE después
   * de seleccionarse NUNCA se expone públicamente, sin necesidad de que el
   * estudiante quite la selección manualmente (misma re-evaluación en
   * lectura que `publicAchievements`).
   */
  findManyPublicByPublicProfileIds(publicProfileIds: string[]): Promise<FeaturedAchievementWithDetails[]> {
    if (publicProfileIds.length === 0) return Promise.resolve([]);
    return this.prisma.featuredAchievement.findMany({
      where: {
        publicProfileId: { in: publicProfileIds },
        achievementUnlock: { status: 'ACTIVE', achievementDefinition: { visibilityClass: 'PUBLIC' } },
      },
      orderBy: { displayOrder: 'asc' },
      include: { achievementUnlock: { include: { achievementDefinition: { select: { achievementKey: true, name: true, visibilityClass: true } } } } },
    });
  }
}
