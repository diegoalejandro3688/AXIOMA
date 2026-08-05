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

  /**
   * Definiciones ACTIVAS cuya ventana `[startsAt, endsAt)` contiene
   * `instant` -- usado por 4.b para decidir qué desafíos son elegibles para
   * UN evento concreto (Gate 18: un evento fuera de la ventana no es
   * elegible para esa definición, filtrado aquí antes de cualquier otra
   * cosa).
   */
  findActiveContainingInstant(instant: Date): Promise<ChallengeDefinition[]> {
    return this.prisma.challengeDefinition.findMany({
      where: { status: 'ACTIVE', startsAt: { lte: instant }, endsAt: { gt: instant } },
      orderBy: { challengeKey: 'asc' },
    });
  }
}
