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

  /**
   * "Pendiente de otorgar XP" = sin xp_ledger_entry de tipo OTORGAMIENTO
   * asociado -- NUNCA un campo mutado en esta tabla (condición
   * arquitectónica explícita, ver docs/adr/0016-gamificacion-fundacion.md).
   * Excluye actividades en backoff (xp_grant_attempt.nextEligibleAt en el
   * futuro) -- así una actividad sin regla activa no compite por el cupo
   * de cada ciclo indefinidamente, y nunca bloquea a una actividad nueva
   * (sin intento todavía, siempre elegible).
   */
  findPendingGrant(limit: number, now: Date = new Date()): Promise<ValidatedGamificationActivity[]> {
    return this.prisma.validatedGamificationActivity.findMany({
      where: {
        ledgerEntries: { none: { entryType: 'OTORGAMIENTO' } },
        OR: [{ grantAttempt: null }, { grantAttempt: { nextEligibleAt: { lte: now } } }],
      },
      orderBy: { occurredAt: 'asc' },
      take: limit,
    });
  }
}
