import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { AccountTitle, RewardSourceEntityType } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Único punto de acceso a `account_title` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md (Incremento 3, sub-incremento 3.a).
 * Idempotente por `UNIQUE(accountId, titleDefinitionId)` -- mismo patrón
 * que `RewardGrantRepository.createIdempotent`/
 * `AchievementProgressRepository.createIdempotent` (transacción interna,
 * segura de reconsultar tras P2002 porque no hay `tx` externo que
 * reutilizar). `acquisitionSourceType`/`acquisitionSourceId` son SNAPSHOT
 * del `reward_grant` que entregó este título -- fuente AUTORITATIVA de
 * adquisición (nunca `TitleDefinition.unlockSourceType`, que es solo
 * metadato descriptivo del catálogo).
 *
 * Deliberadamente SIN `update()` genérico: `ownershipStatus` solo puede
 * transicionar a `REVOKED`/`SUPERSEDED` desde una herramienta de
 * moderación futura (fuera de alcance de 3.a/3.b) -- este repositorio no
 * expone ese camino todavía.
 */
@Injectable()
export class AccountTitleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIdempotent(input: {
    accountId: string;
    titleDefinitionId: string;
    acquisitionSourceType: RewardSourceEntityType;
    acquisitionSourceId: string;
    acquiredAt: Date;
  }): Promise<{ accountTitle: AccountTitle; created: boolean }> {
    try {
      const accountTitle = await this.prisma.accountTitle.create({ data: input });
      return { accountTitle, created: true };
    } catch (error) {
      const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
      if (isUniqueViolation) {
        const existing = await this.prisma.accountTitle.findUnique({
          where: { accountId_titleDefinitionId: { accountId: input.accountId, titleDefinitionId: input.titleDefinitionId } },
        });
        if (existing) return { accountTitle: existing, created: false };
      }
      throw error;
    }
  }

  findByAccountAndTitle(accountId: string, titleDefinitionId: string): Promise<AccountTitle | null> {
    return this.prisma.accountTitle.findUnique({ where: { accountId_titleDefinitionId: { accountId, titleDefinitionId } } });
  }

  findById(id: string): Promise<AccountTitle | null> {
    return this.prisma.accountTitle.findUnique({ where: { id } });
  }

  findByAccountId(accountId: string): Promise<AccountTitle[]> {
    return this.prisma.accountTitle.findMany({ where: { accountId } });
  }
}
