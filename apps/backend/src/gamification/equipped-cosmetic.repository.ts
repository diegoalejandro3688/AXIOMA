import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { EquippedCosmetic, CosmeticSlot } from '../generated/prisma/client';

export type EquippedCosmeticWithDetails = EquippedCosmetic & {
  inventoryItem: { id: string; cosmeticItem: { id: string; itemKey: string; itemType: CosmeticSlot; name: string; description: string | null; rarityClass: string; assetReference: string } };
};

/**
 * Único punto de acceso a `equipped_cosmetic` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md (Incremento 5, sub-incremento 5.b).
 * `upsert` sobre la PK `(publicProfileId, cosmeticSlot)` es la única
 * operación de escritura con sentido (equipar = reemplazar la selección
 * de ESE slot, nunca "añadir") -- el trigger
 * `enforce_equipped_cosmetic_account_consistency` es quien valida
 * pertenencia/propiedad activa/coincidencia de tipo-slot/perfil activo
 * (Gates 22/34/61/62/63); este repositorio no duplica esa validación.
 *
 * SIN protección de inmutabilidad: a diferencia de `xp_ledger_entry`/
 * `reward_grant_component`, cambiar de selección y la limpieza por
 * anonimización son operaciones legítimas de esta tabla.
 */
@Injectable()
export class EquippedCosmeticRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(publicProfileId: string, cosmeticSlot: CosmeticSlot, inventoryItemId: string): Promise<EquippedCosmetic> {
    const now = new Date();
    return this.prisma.equippedCosmetic.upsert({
      where: { publicProfileId_cosmeticSlot: { publicProfileId, cosmeticSlot } },
      create: { publicProfileId, cosmeticSlot, inventoryItemId, equippedAt: now },
      update: { inventoryItemId, equippedAt: now },
    });
  }

  findByPublicProfileId(publicProfileId: string): Promise<EquippedCosmeticWithDetails[]> {
    return this.prisma.equippedCosmetic.findMany({
      where: { publicProfileId },
      include: { inventoryItem: { include: { cosmeticItem: true } } },
    });
  }
}
