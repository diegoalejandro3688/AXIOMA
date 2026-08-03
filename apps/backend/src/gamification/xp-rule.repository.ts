import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { XpRule, XpRuleStatus } from '../generated/prisma/client';

/** Único punto de acceso a `xp_rule` -- ver docs/adr/0016-gamificacion-fundacion.md. */
@Injectable()
export class XpRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    programVersionId: string;
    activityType: string;
    baseXp: number;
    repeatDecayRule?: string | null;
    qualityCondition?: string | null;
    multiplierPolicy?: string | null;
    dailyCap?: number | null;
    effectiveFrom?: Date | null;
    effectiveUntil?: Date | null;
    status?: XpRuleStatus;
  }): Promise<XpRule> {
    return this.prisma.xpRule.create({ data: input });
  }

  findById(id: string): Promise<XpRule | null> {
    return this.prisma.xpRule.findUnique({ where: { id } });
  }

  findByVersionAndActivityType(programVersionId: string, activityType: string): Promise<XpRule | null> {
    return this.prisma.xpRule.findUnique({
      where: { programVersionId_activityType: { programVersionId, activityType } },
    });
  }
}
