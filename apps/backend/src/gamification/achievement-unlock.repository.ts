import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { AchievementUnlock, RewardSourceEntityType } from '../generated/prisma/client';

/**
 * Único punto de acceso a `achievement_unlock` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md §4.7 y sub-incremento 2.b. Fila
 * inmutable salvo UNA transición: `rewardGrantId` de `NULL` a un valor,
 * respaldada por el trigger `enforce_achievement_unlock_immutable` --
 * ningún otro campo es editable, ni siquiera desde este repositorio.
 *
 * `createIdempotent` exige un `tx` -- esta creación SIEMPRE ocurre dentro
 * de la misma transacción que `AchievementProgressRepository.markCompleted`
 * (precisión obligatoria del Product Owner: nunca puede existir `COMPLETED`
 * sin su unlock). Dentro de una transacción explícita, un P2002 aborta el
 * resto de esa transacción a nivel de Postgres (25P02) -- por eso, igual
 * que `XpLedgerEntryRepository.createIdempotent`, el error se RELANZA tal
 * cual en vez de intentar re-consultar con el mismo `tx` ya abortado; el
 * llamador (`RewardEvaluationWorker`) resuelve la idempotencia FUERA de la
 * transacción, con una consulta nueva, en su ciclo de reintento.
 */
@Injectable()
export class AchievementUnlockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIdempotent(
    tx: Prisma.TransactionClient,
    input: {
      accountId: string;
      achievementDefinitionId: string;
      achievementVersionId: string;
      unlockInstance: number;
      unlockedAt: Date;
      triggerActivityId?: string | null;
    },
  ): Promise<AchievementUnlock> {
    return tx.achievementUnlock.create({ data: input });
  }

  findByAccountDefinitionInstance(accountId: string, achievementDefinitionId: string, unlockInstance: number): Promise<AchievementUnlock | null> {
    return this.prisma.achievementUnlock.findUnique({
      where: { accountId_achievementDefinitionId_unlockInstance: { accountId, achievementDefinitionId, unlockInstance } },
    });
  }

  findById(id: string): Promise<AchievementUnlock | null> {
    return this.prisma.achievementUnlock.findUnique({ where: { id } });
  }

  /**
   * Única transición mutable de esta fila -- rellena `rewardGrantId` tras
   * crear el `reward_grant` correspondiente (que necesitaba el `id` de
   * este unlock para su propia clave de idempotencia, §4.4). Validación de
   * coherencia explícita ANTES del `UPDATE` (precisión obligatoria del
   * Product Owner): el grant debe pertenecer a la MISMA cuenta y declarar
   * `sourceEntityType = ACHIEVEMENT_UNLOCK` / `sourceEntityId = unlock.id`
   * -- protege contra adjuntar por error el grant de OTRO unlock o de OTRA
   * fuente, incluso si alguna vez esa condición se vuelve alcanzable por
   * un bug en el llamador. El trigger de base de datos es el respaldo
   * final (rechaza un segundo intento de fijar `reward_grant_id`), esta
   * validación es la primera capa, igual criterio de "dos capas" que el
   * resto del dominio.
   */
  async attachRewardGrant(
    unlock: AchievementUnlock,
    grant: { id: string; accountId: string; sourceEntityType: RewardSourceEntityType; sourceEntityId: string },
  ): Promise<AchievementUnlock> {
    if (grant.accountId !== unlock.accountId) {
      throw new Error(`Coherencia violada: reward_grant ${grant.id} pertenece a otra cuenta que achievement_unlock ${unlock.id}.`);
    }
    if (grant.sourceEntityType !== 'ACHIEVEMENT_UNLOCK' || grant.sourceEntityId !== unlock.id) {
      throw new Error(
        `Coherencia violada: reward_grant ${grant.id} no declara sourceEntityType=ACHIEVEMENT_UNLOCK/sourceEntityId=${unlock.id} (tiene ${grant.sourceEntityType}/${grant.sourceEntityId}).`,
      );
    }
    return this.prisma.achievementUnlock.update({ where: { id: unlock.id }, data: { rewardGrantId: grant.id } });
  }
}
