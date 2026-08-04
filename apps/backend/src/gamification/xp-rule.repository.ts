import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { XpRule, XpRuleStatus, GamificationProgramVersion } from '../generated/prisma/client';

export type XpRuleWithVersion = XpRule & { programVersion: GamificationProgramVersion };

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

  /**
   * Corrección de secuenciación (2026-08-05, ver docs/adr/0016-gamificacion-fundacion.md
   * "Corrección: selección de regla aplicable") -- reemplaza el diseño
   * original de dos pasos (elegir la versión más reciente del PROGRAMA,
   * luego buscar la regla DENTRO de esa versión para el tipo de actividad).
   * Ese diseño asumía que cada versión aprobada contiene el conjunto
   * COMPLETO de reglas vigentes -- la auditoría del Data Model (§16.4,
   * `gamification_program_version` + §16.9 `xp_rule`, ambas con su propia
   * ventana `effective_from`/`effective_until`) confirma que las versiones
   * pueden ser PARCIALES: una versión nueva puede introducir o modificar
   * la regla de UN `activityType` sin re-declarar las demás, que siguen
   * vigentes desde una versión aprobada anterior. Con el diseño de dos
   * pasos, una versión más reciente SIN regla para el `activityType`
   * evaluado producía `NO_ACTIVE_RULE` aunque una versión anterior, cuya
   * propia ventana también cubre `at`, sí la tuviera -- la versión ganaba
   * la selección por ser "la más reciente del programa", no por ser
   * relevante para esta actividad.
   *
   * Selección formalizada por REGLA aplicable, no por versión: busca
   * directamente la `xp_rule` ACTIVE para (`programId`, `activityType`)
   * cuya propia ventana Y la ventana de su `programVersion` (APPROVED)
   * cubran `at` -- cada `activityType` se resuelve de forma independiente,
   * inmune a que otras versiones del mismo programa (para otros tipos de
   * actividad, o de corridas de gate anteriores) existan o no. Desempate:
   * `programVersion.effectiveFrom` más reciente, mismo criterio
   * determinista que el diseño original.
   */
  findApplicableRule(programId: string, activityType: string, at: Date): Promise<XpRuleWithVersion | null> {
    return this.prisma.xpRule.findFirst({
      where: {
        activityType,
        status: 'ACTIVE',
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }] },
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }] },
        ],
        programVersion: {
          gamificationProgramId: programId,
          approvalStatus: 'APPROVED',
          AND: [
            { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }] },
            { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }] },
          ],
        },
      },
      include: { programVersion: true },
      orderBy: { programVersion: { effectiveFrom: 'desc' } },
    });
  }
}
