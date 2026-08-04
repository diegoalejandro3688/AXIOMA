import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { RewardGrantComponent } from '../generated/prisma/client';

/**
 * Único punto de acceso a las transiciones de `reward_grant_component` --
 * ver ADR-0019 §3. `DELIVERED` es terminal a nivel de base de datos
 * (trigger `enforce_reward_grant_component_delivered_immutable`) -- este
 * repositorio no necesita reforzar esa regla en la aplicación, pero
 * tampoco la contradice: ningún método aquí permite pasar un estado
 * explícito arbitrario, solo las dos transiciones válidas desde
 * PENDING/FAILED.
 *
 * Deliberadamente SIN lógica de negocio de ENTREGA real (crear
 * `account_title`/`inventory_item`/`xp_ledger_entry`) -- eso pertenece al
 * sub-incremento 1.c y a los Incrementos 2-5, fuera de alcance aquí. Estos
 * métodos solo registran el resultado de un intento de entrega ya
 * ocurrido en otra parte.
 */
@Injectable()
export class RewardGrantComponentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByRewardGrantId(rewardGrantId: string): Promise<RewardGrantComponent[]> {
    return this.prisma.rewardGrantComponent.findMany({ where: { rewardGrantId } });
  }

  findById(id: string): Promise<RewardGrantComponent | null> {
    return this.prisma.rewardGrantComponent.findUnique({ where: { id } });
  }

  markDelivered(id: string): Promise<RewardGrantComponent> {
    return this.prisma.rewardGrantComponent.update({
      where: { id },
      data: { deliveryStatus: 'DELIVERED', deliveredAt: new Date() },
    });
  }

  markFailed(id: string): Promise<RewardGrantComponent> {
    return this.prisma.rewardGrantComponent.update({ where: { id }, data: { deliveryStatus: 'FAILED' } });
  }
}
