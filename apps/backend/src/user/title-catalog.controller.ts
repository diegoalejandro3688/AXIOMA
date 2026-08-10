import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { listTitlesResponseSchema, type ListTitlesResponse, type OwnedTitle, type LockedTitle } from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { UserService } from './user.service';
import type { AccountTitleWithDefinition, LockedTitleView } from '../gamification/title-equipment.service';
import type { EquippedTitleWithDetails } from '../gamification/equipped-title.repository';

function toOwnedTitle(accountTitle: AccountTitleWithDefinition): OwnedTitle {
  return {
    accountTitleId: accountTitle.id,
    titleDefinitionId: accountTitle.titleDefinition.id,
    titleKey: accountTitle.titleDefinition.titleKey,
    displayText: accountTitle.titleDefinition.displayText,
    description: accountTitle.titleDefinition.description,
    rarityClass: accountTitle.titleDefinition.rarityClass,
    acquiredAt: accountTitle.acquiredAt.toISOString(),
  };
}

function toLockedTitle(locked: LockedTitleView): LockedTitle {
  return {
    titleDefinitionId: locked.titleDefinition.id,
    titleKey: locked.titleDefinition.titleKey,
    displayText: locked.titleDefinition.displayText,
    description: locked.titleDefinition.description,
    rarityClass: locked.titleDefinition.rarityClass,
    unlockRequirements: locked.unlockRequirements,
  };
}

function toEquippedTitleField(equipped: EquippedTitleWithDetails | null): ListTitlesResponse['equipped'] {
  if (!equipped) return null;
  return {
    accountTitleId: equipped.accountTitleId,
    titleDefinitionId: equipped.accountTitle.titleDefinition.id,
    titleKey: equipped.accountTitle.titleDefinition.titleKey,
    displayText: equipped.accountTitle.titleDefinition.displayText,
    rarityClass: equipped.accountTitle.titleDefinition.rarityClass,
    equippedAt: equipped.equippedAt.toISOString(),
  };
}

/**
 * LEF Bloque V, Incremento 6 (docs/adr/LEF-BLOCK-V-DEFINITION.md §14) --
 * catálogo de títulos (poseídos/equipado/bloqueados con requisito real).
 * Path `gamification/me/titles` a propósito, aunque el controller vive en
 * `UserModule` -- mismo criterio exacto que `CosmeticEquipmentController`
 * (evita que `GamificationModule` importe `UserModule` de vuelta solo para
 * resolver `public_profile`).
 *
 * Solo LECTURA -- el equipamiento de títulos sigue viviendo en
 * `PublicProfileController` (`PATCH /user/public-profile/equipped-title`,
 * Bloque III 3.b), sin cambio. Este controller no introduce ninguna
 * escritura nueva.
 */
@Controller('gamification/me/titles')
@UseGuards(AuthGuard)
export class TitleCatalogController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<ListTitlesResponse> {
    const { owned, equipped, locked } = await this.userService.getTitles(request.accountId);
    return listTitlesResponseSchema.parse({
      owned: owned.map(toOwnedTitle),
      equipped: toEquippedTitleField(equipped),
      locked: locked.map(toLockedTitle),
    });
  }
}
