import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountTitleRepository } from './account-title.repository';
import { TitleDefinitionRepository } from './title-definition.repository';
import { EquippedTitleRepository, type EquippedTitleWithDetails } from './equipped-title.repository';

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
}
