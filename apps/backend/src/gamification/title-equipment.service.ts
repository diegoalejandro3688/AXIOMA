import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountTitleRepository } from './account-title.repository';
import { TitleDefinitionRepository } from './title-definition.repository';
import { EquippedTitleRepository, type EquippedTitleWithDetails } from './equipped-title.repository';
import { UnlockRequirementResolverService, type UnlockRequirementView } from './unlock-requirement-resolver.service';
import type { AccountTitle, TitleDefinition } from '../generated/prisma/client';

export type AccountTitleWithDefinition = AccountTitle & { titleDefinition: TitleDefinition };

export interface LockedTitleView {
  titleDefinition: TitleDefinition;
  unlockRequirements: UnlockRequirementView[];
}

/**
 * Bloque III, Incremento 3, sub-incremento 3.b ("Equipamiento de
 * títulos") -- orquesta la validación de aplicación (primera capa; el
 * trigger `enforce_equipped_title_account_consistency` es la segunda,
 * real respaldo en base de datos) y la escritura de `equipped_title`.
 *
 * Deliberadamente NO sabe nada de `public_profile.lifecycleStatus` --
 * esa validación (Gate 13, y la condición de perfil `ACTIVE` para
 * equipar) es responsabilidad de `UserService` (dominio USER), que ya
 * resuelve la existencia/estado del perfil antes de llamar aquí. Este
 * servicio solo entiende la parte GAMIFICATION: propiedad del título y
 * elegibilidad de su definición -- Gate 15 (operación de presentación
 * pura): ningún método de esta clase toca `account_title`,
 * `achievement_progress` ni `xp_balance`.
 */
@Injectable()
export class TitleEquipmentService {
  constructor(
    private readonly accountTitleRepo: AccountTitleRepository,
    private readonly titleDefinitionRepo: TitleDefinitionRepository,
    private readonly equippedTitleRepo: EquippedTitleRepository,
    private readonly unlockRequirementResolver: UnlockRequirementResolverService,
  ) {}

  /**
   * `accountId` se usa ÚNICAMENTE para verificar pertenencia -- nunca para
   * localizar el título (evita filtrar, vía el código de error, si un
   * `accountTitleId` ajeno existe: siempre 404, igual que si no existiera).
   */
  async equipTitle(publicProfileId: string, accountId: string, accountTitleId: string): Promise<EquippedTitleWithDetails> {
    const accountTitle = await this.accountTitleRepo.findById(accountTitleId);
    if (!accountTitle || accountTitle.accountId !== accountId) {
      throw new NotFoundException('Este título no existe o no pertenece a tu cuenta.');
    }
    if (accountTitle.ownershipStatus !== 'ACTIVE') {
      throw new ConflictException('Este título ya no está disponible para equipar.');
    }

    const titleDefinition = await this.titleDefinitionRepo.findById(accountTitle.titleDefinitionId);
    if (!titleDefinition || titleDefinition.status !== 'ACTIVE' || titleDefinition.visibilityStatus !== 'PUBLIC') {
      throw new ConflictException('Este título no está disponible para mostrarse públicamente.');
    }

    await this.equippedTitleRepo.upsert(publicProfileId, accountTitleId);
    const equipped = await this.equippedTitleRepo.findByPublicProfileId(publicProfileId);
    return equipped!;
  }

  async unequipTitle(publicProfileId: string): Promise<void> {
    await this.equippedTitleRepo.deleteByPublicProfileId(publicProfileId);
  }

  getEquippedTitle(publicProfileId: string): Promise<EquippedTitleWithDetails | null> {
    return this.equippedTitleRepo.findByPublicProfileId(publicProfileId);
  }

  /** LEF Bloque V, Incremento 6 -- propiedad, independiente de `public_profile` (mismo criterio que `CosmeticEquipmentService.getOwnedByAccountId`). */
  getOwnedByAccountId(accountId: string): Promise<AccountTitleWithDefinition[]> {
    return this.accountTitleRepo.findByAccountIdWithDefinition(accountId);
  }

  /**
   * LEF Bloque V, Incremento 6 -- catálogo VISIBLE que la cuenta no posee,
   * con su requisito de desbloqueo real. "Poseído" se calcula sobre TODO
   * `account_title` de la cuenta (cualquier `ownershipStatus`), mismo
   * criterio que cosméticos: un título `REVOKED` no reaparece como
   * "bloqueado".
   *
   * Corrección del Product Owner (revisión de cierre): un título SOLO
   * aparece en `locked` si tiene AL MENOS un `unlockRequirement` canónico
   * -- mismo criterio exacto que `CosmeticEquipmentService.getLockedByAccountId`.
   * Sin ruta de recompensa conocida, el título queda fuera del catálogo
   * descubrible, nunca con un requisito fabricado.
   */
  async getLockedByAccountId(accountId: string): Promise<LockedTitleView[]> {
    const owned = await this.accountTitleRepo.findByAccountId(accountId);
    const ownedTitleDefinitionIds = owned.map((accountTitle) => accountTitle.titleDefinitionId);
    const candidates = await this.titleDefinitionRepo.findManyPublicActiveExcludingIds(ownedTitleDefinitionIds);
    if (candidates.length === 0) return [];

    const requirementsByTitleId = await this.unlockRequirementResolver.resolveMany(
      'TITLE',
      candidates.map((title) => title.id),
    );
    return candidates
      .map((titleDefinition) => ({ titleDefinition, unlockRequirements: requirementsByTitleId.get(titleDefinition.id) ?? [] }))
      .filter((view) => view.unlockRequirements.length > 0);
  }
}
