import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { InventoryItem, RewardSourceEntityType, CosmeticItem } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export type InventoryItemWithCosmeticItem = InventoryItem & { cosmeticItem: CosmeticItem };

/**
 * Único punto de acceso a `inventory_item` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md §4.19 (Incremento 5, sub-incremento
 * 5.a). Idempotente por `UNIQUE(accountId, cosmeticItemId)` -- mismo
 * patrón que `AccountTitleRepository.createIdempotent` (reconsulta segura
 * tras P2002, sin `tx` externo que reutilizar -- este repositorio nunca se
 * invoca dentro de una transacción compartida, a diferencia de
 * `AccountChallengeRepository`, corregido en 4.b por esa misma razón).
 *
 * Precisión obligatoria del Product Owner (§4.19): cuando ya existe una
 * fila para (accountId, cosmeticItemId) con `ownershipStatus` distinto de
 * `ACTIVE` (`REVOKED`/`SUPERSEDED`), `createIdempotent` la devuelve TAL
 * CUAL -- nunca reactiva la propiedad. Esto no requiere código adicional:
 * la rama de recuperación tras P2002 ya es un `findUnique` simple, sin
 * ningún `update()` de por medio.
 *
 * Deliberadamente SIN `update()` genérico: transicionar `ownershipStatus`
 * a `REVOKED`/`SUPERSEDED` es una herramienta de moderación futura, fuera
 * de alcance de 5.a.
 */
@Injectable()
export class InventoryItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIdempotent(input: {
    accountId: string;
    cosmeticItemId: string;
    acquisitionSourceType: RewardSourceEntityType;
    acquisitionSourceId: string;
    acquiredAt: Date;
  }): Promise<{ inventoryItem: InventoryItem; created: boolean }> {
    try {
      const inventoryItem = await this.prisma.inventoryItem.create({ data: input });
      return { inventoryItem, created: true };
    } catch (error) {
      const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
      if (isUniqueViolation) {
        const existing = await this.prisma.inventoryItem.findUnique({
          where: { accountId_cosmeticItemId: { accountId: input.accountId, cosmeticItemId: input.cosmeticItemId } },
        });
        if (existing) return { inventoryItem: existing, created: false };
      }
      throw error;
    }
  }

  findByAccountAndCosmetic(accountId: string, cosmeticItemId: string): Promise<InventoryItem | null> {
    return this.prisma.inventoryItem.findUnique({ where: { accountId_cosmeticItemId: { accountId, cosmeticItemId } } });
  }

  findById(id: string): Promise<InventoryItem | null> {
    return this.prisma.inventoryItem.findUnique({ where: { id } });
  }

  findByAccountId(accountId: string): Promise<InventoryItem[]> {
    return this.prisma.inventoryItem.findMany({ where: { accountId } });
  }

  /** §4.20 (5.b) -- solo `ACTIVE`, con `cosmetic_item` ya unido, para el listado `GET .../cosmetics`. */
  findActiveByAccountIdWithCosmeticItem(accountId: string): Promise<InventoryItemWithCosmeticItem[]> {
    return this.prisma.inventoryItem.findMany({
      where: { accountId, ownershipStatus: 'ACTIVE' },
      include: { cosmeticItem: true },
      orderBy: { acquiredAt: 'desc' },
    });
  }
}
