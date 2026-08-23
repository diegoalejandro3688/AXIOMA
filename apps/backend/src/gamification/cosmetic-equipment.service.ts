import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InventoryItemRepository, type InventoryItemWithCosmeticItem } from './inventory-item.repository';
import { CosmeticItemRepository } from './cosmetic-item.repository';
import { EquippedCosmeticRepository, type EquippedCosmeticWithDetails } from './equipped-cosmetic.repository';
import { UnlockRequirementResolverService, type UnlockRequirementView } from './unlock-requirement-resolver.service';
import type { CosmeticItem, CosmeticSlot } from '../generated/prisma/client';

export interface LockedCosmeticView {
  cosmeticItem: CosmeticItem;
  unlockRequirements: UnlockRequirementView[];
}

/**
 * COSMETICS-STARTER-1 -- ÚNICO punto autoritativo de los `itemKey` que
 * forman el Starter Kit (decisión del Product Owner, 2026-08-22). Excluye
 * deliberadamente `asset1-frame-madera-nivel5`: su nombre expresa una
 * intención de producto de desbloqueo por nivel 5, aunque hoy no esté
 * conectado a ningún `reward_bundle` real -- no debe regalarse por una vía
 * distinta a la que eventualmente lo desbloquee. Ninguna otra capa (mobile,
 * seeds, controllers) debe declarar esta lista de forma independiente.
 */
const STARTER_COSMETIC_ITEM_KEYS: readonly string[] = [
  'asset1-avatar-buho',
  'asset1-banner-templo-conocimiento',
  'asset2-avatar-pi',
  'asset2-avatar-astrolabio',
  'asset2-avatar-humano-lentes',
  'asset2-frame-plata',
  'asset2-frame-bronce',
  'asset2-banner-observatorio-horizonte',
];

/** Constante, no ligada a ninguna cuenta -- el Starter Kit no es un evento por-cuenta, es la misma política para todas. */
const STARTER_KIT_ACQUISITION_SOURCE_ID = 'starter-kit';

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
  private readonly logger = new Logger(CosmeticEquipmentService.name);

  constructor(
    private readonly inventoryItemRepo: InventoryItemRepository,
    private readonly cosmeticItemRepo: CosmeticItemRepository,
    private readonly equippedCosmeticRepo: EquippedCosmeticRepository,
    private readonly unlockRequirementResolver: UnlockRequirementResolverService,
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

  /**
   * COSMETICS-STARTER-1 -- garantiza `STARTER_COSMETIC_ITEM_KEYS ⊆
   * inventario(accountId)`, sin tocar nada más. Autocuración LAZY: se llama
   * en cada `GET /gamification/me/cosmetics` (vía `UserService.getCosmetics`),
   * así que cubre por igual cuentas nuevas (inventario vacío) y cuentas
   * existentes (reciben únicamente lo que les falte) -- sin job/backfill
   * dedicado, sin migración de datos.
   *
   * Idempotencia real: `InventoryItemRepository.createIdempotent` se apoya
   * en el `UNIQUE(accountId, cosmeticItemId)` de la base de datos (P2002 ->
   * relee la fila existente tal cual) -- ejecutar esto 1, 5 o 100 veces
   * produce el mismo inventario final, sin duplicados. Nunca toca
   * `equipped_cosmetic` (equipamiento es una decisión del usuario, no de
   * este mecanismo) ni ninguna fila de `inventory_item` ya existente
   * (`createIdempotent` jamás actualiza una fila preexistente).
   *
   * Si un `itemKey` del Starter Kit no existe en el catálogo de este
   * entorno (ej. seeds no corridos), se omite explícitamente con un
   * `warn` -- nunca se fabrica un `CosmeticItem` nuevo aquí (eso es
   * responsabilidad exclusiva de los scripts de seed de catálogo).
   */
  async ensureStarterCosmetics(accountId: string): Promise<void> {
    const now = new Date();
    for (const itemKey of STARTER_COSMETIC_ITEM_KEYS) {
      const cosmeticItem = await this.cosmeticItemRepo.findByItemKey(itemKey);
      if (!cosmeticItem) {
        this.logger.warn(`Starter Kit: CosmeticItem con itemKey "${itemKey}" no existe en este entorno -- omitido.`);
        continue;
      }
      await this.inventoryItemRepo.createIdempotent({
        accountId,
        cosmeticItemId: cosmeticItem.id,
        acquisitionSourceType: 'SYSTEM_STARTER',
        acquisitionSourceId: STARTER_KIT_ACQUISITION_SOURCE_ID,
        acquiredAt: now,
      });
    }
  }

  /**
   * LEF Bloque V, Incremento 6 -- catálogo VISIBLE que la cuenta no posee,
   * con su requisito de desbloqueo real. "Poseído" se calcula sobre TODO
   * `inventory_item` de la cuenta (cualquier `ownershipStatus`), no solo
   * `ACTIVE` -- un ítem `REVOKED` no debe reaparecer como "bloqueado"
   * ofreciendo re-obtenerlo por un camino que no es el real.
   *
   * Corrección del Product Owner (revisión de cierre): un elemento SOLO
   * aparece en `locked` si tiene AL MENOS un `unlockRequirement` canónico
   * (`reward_bundle_item -> reward_bundle -> nivel/logro/desafío`).
   * `unlockRequirements: []` deja de ser un estado expuesto -- un ítem sin
   * ninguna ruta de recompensa conocida queda fuera del catálogo
   * descubrible por completo (nunca se fabrica un requisito, nunca se
   * inventa un estado "sin disponibilidad" nuevo).
   */
  async getLockedByAccountId(accountId: string): Promise<LockedCosmeticView[]> {
    const owned = await this.inventoryItemRepo.findByAccountId(accountId);
    const ownedCosmeticItemIds = owned.map((item) => item.cosmeticItemId);
    const candidates = await this.cosmeticItemRepo.findManyPublicActiveExcludingIds(ownedCosmeticItemIds);
    if (candidates.length === 0) return [];

    const requirementsByItemId = await this.unlockRequirementResolver.resolveMany(
      'COSMETIC',
      candidates.map((item) => item.id),
    );
    return candidates
      .map((cosmeticItem) => ({ cosmeticItem, unlockRequirements: requirementsByItemId.get(cosmeticItem.id) ?? [] }))
      .filter((view) => view.unlockRequirements.length > 0);
  }
}
