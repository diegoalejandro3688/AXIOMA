import { BadRequestException, Body, Controller, Param, Put, Get, Req, UseGuards } from '@nestjs/common';
import {
  equipCosmeticRequestSchema,
  equipCosmeticResponseSchema,
  listCosmeticsResponseSchema,
  cosmeticSlotSchema,
  type EquipCosmeticResponse,
  type ListCosmeticsResponse,
  type CosmeticSummary,
  type OwnedCosmetic,
  type LockedCosmetic,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { UserService } from './user.service';
import { ObjectStorageService } from '../platform/object-storage/object-storage.service';
import type { EquippedCosmeticWithDetails } from '../gamification/equipped-cosmetic.repository';
import type { InventoryItemWithCosmeticItem } from '../gamification/inventory-item.repository';
import type { LockedCosmeticView } from '../gamification/cosmetic-equipment.service';
import type { CosmeticSlot } from '../generated/prisma/client';

const ALL_SLOTS: CosmeticSlot[] = ['AVATAR', 'AVATAR_FRAME', 'PROFILE_BANNER', 'BADGE'];

/** URL de lectura de corta duración -- ver ADR-0010: nunca se persiste, se resuelve bajo demanda al servir cada superficie. */
const COSMETIC_ASSET_URL_TTL_SECONDS = 300;

async function toOwnedCosmetic(objectStorage: ObjectStorageService, item: InventoryItemWithCosmeticItem): Promise<OwnedCosmetic> {
  return {
    inventoryItemId: item.id,
    cosmeticItemId: item.cosmeticItem.id,
    itemKey: item.cosmeticItem.itemKey,
    itemType: item.cosmeticItem.itemType,
    name: item.cosmeticItem.name,
    description: item.cosmeticItem.description,
    rarityClass: item.cosmeticItem.rarityClass,
    assetReference: await objectStorage.resolveAssetUrl(item.cosmeticItem.assetReference, COSMETIC_ASSET_URL_TTL_SECONDS),
    acquiredAt: item.acquiredAt.toISOString(),
  };
}

async function toLockedCosmetic(objectStorage: ObjectStorageService, locked: LockedCosmeticView): Promise<LockedCosmetic> {
  return {
    cosmeticItemId: locked.cosmeticItem.id,
    itemKey: locked.cosmeticItem.itemKey,
    itemType: locked.cosmeticItem.itemType,
    name: locked.cosmeticItem.name,
    description: locked.cosmeticItem.description,
    rarityClass: locked.cosmeticItem.rarityClass,
    assetReference: await objectStorage.resolveAssetUrl(locked.cosmeticItem.assetReference, COSMETIC_ASSET_URL_TTL_SECONDS),
    unlockRequirements: locked.unlockRequirements,
  };
}

async function toCosmeticSummary(objectStorage: ObjectStorageService, equipped: EquippedCosmeticWithDetails): Promise<CosmeticSummary> {
  return {
    inventoryItemId: equipped.inventoryItem.id,
    cosmeticItemId: equipped.inventoryItem.cosmeticItem.id,
    itemKey: equipped.inventoryItem.cosmeticItem.itemKey,
    itemType: equipped.inventoryItem.cosmeticItem.itemType,
    name: equipped.inventoryItem.cosmeticItem.name,
    description: equipped.inventoryItem.cosmeticItem.description,
    rarityClass: equipped.inventoryItem.cosmeticItem.rarityClass,
    assetReference: await objectStorage.resolveAssetUrl(
      equipped.inventoryItem.cosmeticItem.assetReference,
      COSMETIC_ASSET_URL_TTL_SECONDS,
    ),
    equippedAt: equipped.equippedAt.toISOString(),
  };
}

/**
 * Endpoints de autoservicio del Incremento 5 (Cosméticos), sub-incremento
 * 5.b ("Equipamiento") -- ver docs/adr/BLOCK-III-DEFINITION.md §4.20.
 * Path `gamification/me/cosmetics` a propósito, aunque el controller vive
 * en `UserModule` (ver comentario de `UserModule`) -- evita una
 * dependencia circular de módulos sin cambiar la ruta pedida.
 *
 * Sin catálogo público, sin desequipamiento sin reemplazo, sin superficie
 * móvil (5.c) -- confirmado explícitamente fuera de 5.b.
 */
@Controller('gamification/me/cosmetics')
@UseGuards(AuthGuard)
export class CosmeticEquipmentController {
  constructor(
    private readonly userService: UserService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<ListCosmeticsResponse> {
    const { owned, equipped, locked } = await this.userService.getCosmetics(request.accountId);
    const equippedBySlot = new Map(equipped.map((row) => [row.cosmeticSlot, row]));

    // Gate 65: las cuatro claves de `equipped` existen siempre, incluso sin perfil / sin nada equipado.
    const equippedEntries = await Promise.all(
      ALL_SLOTS.map(async (slot) => {
        const row = equippedBySlot.get(slot);
        return [slot, row ? await toCosmeticSummary(this.objectStorage, row) : null] as const;
      }),
    );
    const equippedResponse = Object.fromEntries(equippedEntries) as ListCosmeticsResponse['equipped'];

    return listCosmeticsResponseSchema.parse({
      owned: await Promise.all(owned.map((item) => toOwnedCosmetic(this.objectStorage, item))),
      equipped: equippedResponse,
      // LEF Bloque V, Incremento 6 -- catálogo visible no poseído, con requisito real.
      locked: await Promise.all(locked.map((item) => toLockedCosmetic(this.objectStorage, item))),
    });
  }

  @Put('equipped/:slot')
  async equip(
    @Req() request: AuthenticatedRequest,
    @Param('slot') slotParam: string,
    @Body() body: unknown,
  ): Promise<EquipCosmeticResponse> {
    const slotResult = cosmeticSlotSchema.safeParse(slotParam);
    if (!slotResult.success) {
      throw new BadRequestException(`Slot inválido: "${slotParam}".`);
    }
    const slot = slotResult.data;
    const input = parseRequestBody(equipCosmeticRequestSchema, body);
    const equipped = await this.userService.equipCosmetic(request.accountId, slot, input.inventoryItemId);
    return equipCosmeticResponseSchema.parse(await toCosmeticSummary(this.objectStorage, equipped));
  }
}
