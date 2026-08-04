import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { RewardGrant, RewardGrantComponent, RewardComponentType, RewardSourceEntityType } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export type RewardGrantWithComponents = RewardGrant & { components: RewardGrantComponent[] };

/**
 * Único punto de acceso a `reward_grant` -- ver ADR-0019 (sub-incremento
 * 1.a). Cabecera INMUTABLE por completo: ningún método de este repositorio
 * expone un `update()` -- `idempotencyKey`/`sourceEntityType`/
 * `sourceEntityId` se fijan una sola vez, al crear.
 */
@Injectable()
export class RewardGrantRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea la cabecera y sus componentes (snapshot, ver ADR-0019 §5) en la
   * misma transacción -- nunca queda un `reward_grant` sin sus
   * componentes. Idempotente por `idempotencyKey`: un segundo intento con
   * la misma clave devuelve la fila ya creada, `created: false` --
   * mismo patrón que `XpLedgerEntryRepository.createIdempotent` (ADR-0016).
   *
   * `$transaction` interactivo: a diferencia del caso documentado en
   * `XpLedgerEntryRepository` (que reutiliza un `tx` externo pasado por el
   * llamador), aquí la transacción es enteramente interna -- Prisma la
   * revierte automáticamente si `create` falla por `P2002`, por lo que
   * capturar el error DESPUÉS de `$transaction` es seguro: no hay un
   * cliente de transacción abortado que reutilizar.
   */
  async createIdempotent(input: {
    accountId: string;
    rewardBundleId: string;
    sourceEntityType: RewardSourceEntityType;
    sourceEntityId: string;
    idempotencyKey: string;
    components: Array<{ componentType: RewardComponentType; xpAmount?: number | null; referenceId?: string | null }>;
  }): Promise<{ grant: RewardGrantWithComponents; created: boolean }> {
    try {
      const grant = await this.prisma.rewardGrant.create({
        data: {
          accountId: input.accountId,
          rewardBundleId: input.rewardBundleId,
          sourceEntityType: input.sourceEntityType,
          sourceEntityId: input.sourceEntityId,
          idempotencyKey: input.idempotencyKey,
          components: {
            create: input.components.map((c) => ({
              componentType: c.componentType,
              xpAmount: c.xpAmount ?? null,
              referenceId: c.referenceId ?? null,
            })),
          },
        },
        include: { components: true },
      });
      return { grant, created: true };
    } catch (error) {
      const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
      if (isUniqueViolation) {
        const existing = await this.prisma.rewardGrant.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { components: true },
        });
        if (existing) return { grant: existing, created: false };
      }
      throw error;
    }
  }

  findByIdempotencyKey(idempotencyKey: string): Promise<RewardGrantWithComponents | null> {
    return this.prisma.rewardGrant.findUnique({ where: { idempotencyKey }, include: { components: true } });
  }

  findById(id: string): Promise<RewardGrantWithComponents | null> {
    return this.prisma.rewardGrant.findUnique({ where: { id }, include: { components: true } });
  }

  findByAccountId(accountId: string): Promise<RewardGrantWithComponents[]> {
    return this.prisma.rewardGrant.findMany({ where: { accountId }, include: { components: true }, orderBy: { createdAt: 'asc' } });
  }
}
