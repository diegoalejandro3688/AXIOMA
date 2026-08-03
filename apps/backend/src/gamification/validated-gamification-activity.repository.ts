import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { ValidatedGamificationActivity } from '../generated/prisma/client';

/**
 * Único punto de acceso a `validated_gamification_activity` -- ver
 * docs/adr/0016-gamificacion-fundacion.md. `accountId` SIN FK a Account,
 * mismo criterio que CurriculumTopicProgress/StudentResponse (ADR-0014).
 */
@Injectable()
export class ValidatedGamificationActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    accountId: string;
    sourceDomain: string;
    sourceEntityType: string;
    sourceEntityId: string;
    activityType: string;
    validationStatus: string;
    validationRuleVersion: string;
    occurredAt: Date;
    deduplicationKey: string;
    integrityStatus: string;
  }): Promise<ValidatedGamificationActivity> {
    return this.prisma.validatedGamificationActivity.create({ data: input });
  }

  findById(id: string): Promise<ValidatedGamificationActivity | null> {
    return this.prisma.validatedGamificationActivity.findUnique({ where: { id } });
  }

  findByDeduplicationKey(deduplicationKey: string): Promise<ValidatedGamificationActivity | null> {
    return this.prisma.validatedGamificationActivity.findUnique({ where: { deduplicationKey } });
  }

  findByAccountId(accountId: string): Promise<ValidatedGamificationActivity[]> {
    return this.prisma.validatedGamificationActivity.findMany({ where: { accountId }, orderBy: { occurredAt: 'asc' } });
  }
}
