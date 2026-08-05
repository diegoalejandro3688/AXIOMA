import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { ChallengeDefinition, ChallengeType } from '../generated/prisma/client';

/**
 * Único punto de acceso a `challenge_definition` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md (Incremento 4, sub-incremento 4.a).
 * Deliberadamente SIN `update()`/`delete()`: inmutable por fila una vez
 * referenciada por un `account_challenge` (§4.8) -- mismo criterio que
 * `TitleDefinitionRepository`/`AchievementDefinitionRepository`. Un
 * desafío recurrente o con criterio actualizado es siempre una fila nueva.
 */
@Injectable()
export class ChallengeDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    challengeKey: string;
    name: string;
    description?: string | null;
    challengeType: ChallengeType;
    eligibilityRule: string;
    completionRule: string;
    rewardBundleId?: string | null;
    startsAt: Date;
    endsAt: Date;
    dailyCap?: number | null;
  }): Promise<ChallengeDefinition> {
    return this.prisma.challengeDefinition.create({ data: input });
  }

  findById(id: string): Promise<ChallengeDefinition | null> {
    return this.prisma.challengeDefinition.findUnique({ where: { id } });
  }

  findByChallengeKey(challengeKey: string): Promise<ChallengeDefinition | null> {
    return this.prisma.challengeDefinition.findUnique({ where: { challengeKey } });
  }

  findAllActiveOrderedByKey(): Promise<ChallengeDefinition[]> {
    return this.prisma.challengeDefinition.findMany({ where: { status: 'ACTIVE' }, orderBy: { challengeKey: 'asc' } });
  }
}
