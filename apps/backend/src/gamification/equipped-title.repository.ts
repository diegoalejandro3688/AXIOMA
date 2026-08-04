import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { EquippedTitle } from '../generated/prisma/client';

export type EquippedTitleWithDetails = EquippedTitle & {
  accountTitle: { titleDefinition: { id: string; titleKey: string; displayText: string; rarityClass: string } };
};

/**
 * Único punto de acceso a `equipped_title` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md (Incremento 3, sub-incremento 3.b).
 * `upsert` es la única operación de escritura con sentido (equipar =
 * reemplazar la selección, nunca "añadir") -- el trigger
 * `enforce_equipped_title_account_consistency` es quien valida
 * pertenencia/propiedad activa/elegibilidad pública/perfil activo (Gates
 * 13/14); este repositorio no duplica esa validación.
 *
 * SIN protección de inmutabilidad: a diferencia de `xp_ledger_entry`/
 * `reward_grant_component`, des-equipar (DELETE) y anonimizar son
 * operaciones legítimas de esta tabla.
 */
@Injectable()
export class EquippedTitleRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(publicProfileId: string, accountTitleId: string): Promise<EquippedTitle> {
    const now = new Date();
    return this.prisma.equippedTitle.upsert({
      where: { publicProfileId },
      create: { publicProfileId, accountTitleId, equippedAt: now },
      update: { accountTitleId, equippedAt: now },
    });
  }

  findByPublicProfileId(publicProfileId: string): Promise<EquippedTitleWithDetails | null> {
    return this.prisma.equippedTitle.findUnique({
      where: { publicProfileId },
      include: { accountTitle: { include: { titleDefinition: true } } },
    });
  }

  /** Seguro ante ausencia de fila (des-equipar cuando no hay nada equipado es un no-op, no un error). */
  async deleteByPublicProfileId(publicProfileId: string): Promise<void> {
    await this.prisma.equippedTitle.deleteMany({ where: { publicProfileId } });
  }
}
