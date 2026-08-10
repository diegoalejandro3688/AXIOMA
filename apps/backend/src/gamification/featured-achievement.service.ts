import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { AchievementUnlockRepository } from './achievement-unlock.repository';
import { FeaturedAchievementRepository, type FeaturedAchievementWithDetails } from './featured-achievement.repository';

/**
 * Namespace de advisory lock DISTINTO a los ya usados (19/20/21/22/23) --
 * serializa por `publicProfileId`. Necesario porque la escritura es un
 * reemplazo atómico completo (DELETE+INSERT): sin este lock, dos
 * solicitudes concurrentes de reemplazo con conjuntos DISTINTOS y sin
 * solapamiento podrían, bajo READ COMMITTED, no verse entre sí (cada una
 * borra 0 filas del otro, inserta las suyas) y terminar con hasta 6 filas
 * -- el trigger `enforce_featured_achievement_capacity` cuenta filas
 * DENTRO de cada transacción individual (nunca ve más de 3 en la suya
 * propia), así que no basta como única defensa contra esta carrera
 * concreta entre dos reemplazos completos. El lock, bloqueante (no
 * `_try_`), serializa: la segunda solicitud espera a que la primera
 * confirme, y ejecuta su propio DELETE+INSERT sobre el estado ya
 * actualizado -- resultado final determinista, siempre ≤3 filas.
 */
const FEATURED_ACHIEVEMENT_LOCK_NAMESPACE = 24;

const MAX_FEATURED_ACHIEVEMENTS = 3;

/**
 * LEF Bloque V, Incremento 2 ("Visibilidad granular -- insignias
 * destacadas") -- ver docs/adr/LEF-BLOCK-V-DEFINITION.md §10. Orquesta la
 * validación de aplicación (primera capa; los triggers de
 * `public_profile_featured_achievement` son la segunda, respaldo real en
 * base de datos) y el reemplazo atómico de la selección.
 *
 * Deliberadamente NO sabe nada de `public_profile.lifecycleStatus` -- esa
 * validación (perfil ACTIVE para escribir) es responsabilidad de
 * `UserService`, mismo criterio que `TitleEquipmentService`/
 * `CosmeticEquipmentService`. Este servicio solo entiende la parte
 * GAMIFICATION: propiedad/elegibilidad del logro (Gates de este
 * incremento) -- ningún método toca `xp_balance`, `reward_grant` ni
 * evalúa desafíos (operación de presentación pura, igual criterio que
 * `CosmeticEquipmentService`).
 */
@Injectable()
export class FeaturedAchievementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementUnlockRepo: AchievementUnlockRepository,
    private readonly featuredAchievementRepo: FeaturedAchievementRepository,
  ) {}

  getFeatured(publicProfileId: string): Promise<FeaturedAchievementWithDetails[]> {
    return this.featuredAchievementRepo.findByPublicProfileId(publicProfileId);
  }

  /**
   * `accountId` se usa ÚNICAMENTE para verificar pertenencia -- nunca para
   * localizar el logro (evita filtrar, vía el código de error, si un
   * `achievementUnlockId` ajeno existe: siempre 404, mismo criterio que
   * `CosmeticEquipmentService.equip`/Gate 61).
   *
   * Duplicados en `achievementUnlockIds` se rechazan explícitamente --
   * nunca se deduplican en silencio (instrucción del Product Owner:
   * "duplicado -> no produce duplicación ni estado inválido", tratado como
   * entrada estructuralmente inválida, no como un no-op).
   */
  async setFeatured(publicProfileId: string, accountId: string, achievementUnlockIds: string[]): Promise<FeaturedAchievementWithDetails[]> {
    // Defensa en profundidad -- el contrato Zod ya limita a máximo 3 y
    // rechaza duplicados en la frontera de entrada (ADR-0007), pero este
    // servicio no confía únicamente en esa capa (mismo criterio "dos
    // capas" que el resto del dominio).
    if (achievementUnlockIds.length > MAX_FEATURED_ACHIEVEMENTS) {
      throw new ConflictException(`No se pueden destacar más de ${MAX_FEATURED_ACHIEVEMENTS} insignias.`);
    }
    const uniqueIds = new Set(achievementUnlockIds);
    if (uniqueIds.size !== achievementUnlockIds.length) {
      throw new ConflictException('La selección no puede contener la misma insignia repetida.');
    }

    if (achievementUnlockIds.length > 0) {
      const unlocks = await this.achievementUnlockRepo.findManyByIds(achievementUnlockIds);
      const unlockById = new Map(unlocks.map((u) => [u.id, u]));
      for (const id of achievementUnlockIds) {
        const unlock = unlockById.get(id);
        if (!unlock || unlock.accountId !== accountId) {
          throw new NotFoundException('Una de las insignias seleccionadas no existe o no pertenece a tu cuenta.');
        }
        if (unlock.status !== 'ACTIVE') {
          throw new ConflictException('Una de las insignias seleccionadas ya no está disponible.');
        }
        if (unlock.achievementDefinition.visibilityClass !== 'PUBLIC') {
          throw new ConflictException('Una de las insignias seleccionadas no puede destacarse públicamente.');
        }
      }
    }

    await this.prisma.$transaction(
      async (tx) => {
        // $executeRaw, no $queryRaw: pg_advisory_xact_lock devuelve `void`.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FEATURED_ACHIEVEMENT_LOCK_NAMESPACE}, hashtext(${publicProfileId}))`;
        await this.featuredAchievementRepo.replaceAll(tx, publicProfileId, achievementUnlockIds);
      },
      { timeout: 30_000, maxWait: 30_000 },
    );

    return this.featuredAchievementRepo.findByPublicProfileId(publicProfileId);
  }
}
