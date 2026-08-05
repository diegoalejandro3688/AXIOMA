import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { AccountChallenge } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Único punto de acceso a `account_challenge` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md (Incremento 4, sub-incremento 4.a).
 * Idempotente por `UNIQUE(accountId, challengeDefinitionId, periodStart)`
 * (§4.14) -- mismo patrón que `AccountTitleRepository.createIdempotent`
 * (reconsulta segura tras P2002, sin `tx` externo que reutilizar).
 *
 * `createIdempotent` es la ÚNICA vía de creación en 4.a -- materializa la
 * fila con `acceptedAt = now()` (asignación automática, §4.14), nunca por
 * acción explícita del estudiante. El disparador real (abrir la sección de
 * desafíos / primer evento elegible) es responsabilidad de un
 * sub-incremento posterior; 4.a solo expone el primitivo idempotente.
 *
 * Deliberadamente SIN `update()` genérico: transicionar `challengeStatus`
 * (Gate 17, reforzado por trigger) y avanzar `progressValue` es
 * evaluación/progresión -- fuera de alcance de 4.a.
 */
@Injectable()
export class AccountChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIdempotent(input: {
    accountId: string;
    challengeDefinitionId: string;
    targetValue: number;
    periodStart: Date;
    periodEnd: Date;
    acceptedAt: Date;
  }): Promise<{ accountChallenge: AccountChallenge; created: boolean }> {
    try {
      const accountChallenge = await this.prisma.accountChallenge.create({ data: input });
      return { accountChallenge, created: true };
    } catch (error) {
      const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
      if (isUniqueViolation) {
        const existing = await this.prisma.accountChallenge.findUnique({
          where: {
            accountId_challengeDefinitionId_periodStart: {
              accountId: input.accountId,
              challengeDefinitionId: input.challengeDefinitionId,
              periodStart: input.periodStart,
            },
          },
        });
        if (existing) return { accountChallenge: existing, created: false };
      }
      throw error;
    }
  }

  findById(id: string): Promise<AccountChallenge | null> {
    return this.prisma.accountChallenge.findUnique({ where: { id } });
  }

  findByAccountAndChallenge(accountId: string, challengeDefinitionId: string, periodStart: Date): Promise<AccountChallenge | null> {
    return this.prisma.accountChallenge.findUnique({
      where: { accountId_challengeDefinitionId_periodStart: { accountId, challengeDefinitionId, periodStart } },
    });
  }

  findByAccountId(accountId: string): Promise<AccountChallenge[]> {
    return this.prisma.accountChallenge.findMany({ where: { accountId } });
  }
}
