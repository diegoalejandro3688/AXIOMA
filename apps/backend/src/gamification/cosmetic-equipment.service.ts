import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryItemRepository, type InventoryItemWithCosmeticItem } from './inventory-item.repository';
import { CosmeticItemRepository } from './cosmetic-item.repository';
import { EquippedCosmeticRepository, type EquippedCosmeticWithDetails } from './equipped-cosmetic.repository';
import type { CosmeticSlot } from '../generated/prisma/client';

/**
 * Bloque III, Incremento 5, sub-incremento 5.b ("Equipamiento de
 * cosméticos") -- orquesta la validación de aplicación (primera capa; el
 * trigger `enforce_equipped_cosmetic_account_consistency` es la segunda,
 * real respaldo en base de datos) y la escritura de `equipped_cosmetic`.
 *
 * Deliberadamente NO sabe nada de `public_profile.lifecycleStatus` -- esa
 * validación (perfil ACTIVE para equipar) es responsabilidad de
 * `UserService` (dominio USER), igual criterio que `TitleEquipmentService`.
 * Este servicio solo entiende la parte GAMIFICATION: propiedad del
 * inventario y coincidencia de tipo-slot (Gates 34/61/62/63) -- ningún
 * método de esta clase toca `reward_grant`, `xp_balance` ni evalúa
 * desafíos/logros (operación de presentación pura).
 */
@Injectable()
export class CosmeticEquipmentService {
  constructor(
    private readonly inventoryItemRepo: InventoryItemRepository,
    private readonly cosmeticItemRepo: CosmeticItemRepository,
    private readonly equippedCosmeticRepo: EquippedCosmeticRepository,
  ) {}

  /**
   * `accountId` se usa ÚNICAMENTE para verificar pertenencia -- nunca para
   * localizar el cosmético (evita filtrar, vía el código de error, si un
   * `inventoryItemId` ajeno existe: siempre 404, igual que si no existiera,
   * Gate 61).
   */
  async equip(publicProfileId: string, accountId: string, slot: CosmeticSlot, inventoryItemId: string): Promise<EquippedCosmeticWithDetails> {
    const inventoryItem = await this.inventoryItemRepo.findById(inventoryItemId);
    if (!inventoryItem || inventoryItem.accountId !== accountId) {
      throw new NotFoundException('Este cosmético no existe o no pertenece a tu cuenta.');
    }
    if (inventoryItem.ownershipStatus !== 'ACTIVE') {
      throw new ConflictException('Este cosmético ya no está disponible para equipar.');
    }

    const cosmeticItem = await this.cosmeticItemRepo.findById(inventoryItem.cosmeticItemId);
    if (!cosmeticItem || cosmeticItem.itemType !== slot) {
      throw new ConflictException(`Este cosmético no corresponde al slot "${slot}".`);
    }

    await this.equippedCosmeticRepo.upsert(publicProfileId, slot, inventoryItemId);
    const equipped = await this.equippedCosmeticRepo.findByPublicProfileId(publicProfileId);
    return equipped.find((row) => row.cosmeticSlot === slot)!;
  }

  getEquipped(publicProfileId: string): Promise<EquippedCosmeticWithDetails[]> {
    return this.equippedCosmeticRepo.findByPublicProfileId(publicProfileId);
  }

  /**
   * Propiedad -- no depende de `public_profile` (§4.3, capas separadas).
   * Expuesto aquí (no un repositorio inyectado directamente en
   * `UserService`) para mantener la misma frontera de dominio que
   * `TitleEquipmentService`: GAMIFICATION es dueño de `inventory_item`,
   * USER solo llama a este servicio.
   */
  getOwnedByAccountId(accountId: string): Promise<InventoryItemWithCosmeticItem[]> {
    return this.inventoryItemRepo.findActiveByAccountIdWithCosmeticItem(accountId);
  }
}
