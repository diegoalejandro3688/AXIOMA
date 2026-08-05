import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { LeaguePointRule } from '../generated/prisma/client';

/**
 * Único punto de acceso a `league_point_rule` -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.4. Fuente autoritativa del MONTO de
 * League Points -- decisión exclusiva del servidor, nunca una copia o
 * conversión de `xp_rule`. Selección por `activityType` vigente en `at`,
 * mismo criterio de ventana `effectiveFrom`/`effectiveUntil` que
 * `XpRuleRepository.findApplicableRule`, simplificado sin la capa de
 * `GamificationProgram`/`ProgramVersion` (innecesaria: un solo programa de
 * puntos de liga en V1).
 */
@Injectable()
export class LeaguePointRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    activityType: string;
    basePoints: number;
    dailyCap?: number | null;
    effectiveFrom: Date;
    effectiveUntil?: Date | null;
    ruleVersion: string;
  }): Promise<LeaguePointRule> {
    return this.prisma.leaguePointRule.create({ data: input });
  }

  findById(id: string): Promise<LeaguePointRule | null> {
    return this.prisma.leaguePointRule.findUnique({ where: { id } });
  }

  findApplicableRule(activityType: string, at: Date): Promise<LeaguePointRule | null> {
    return this.prisma.leaguePointRule.findFirst({
      where: {
        activityType,
        status: 'ACTIVE',
        AND: [
          { OR: [{ effectiveFrom: { lte: at } }] },
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }] },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
