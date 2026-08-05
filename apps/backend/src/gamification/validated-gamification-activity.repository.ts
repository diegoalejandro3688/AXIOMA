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

  /**
   * Bloque IV, Incremento 1 -- "pendiente de otorgar League Points" =
   * relación PARALELA a `ledgerEntries` (XP), nunca la misma (§9.7). Sin
   * tabla de intentos/backoff propia (a diferencia de XP): se restringe a
   * cuentas con una `season_league_participation` ACTIVE, para no escanear
   * indefinidamente actividades de cuentas que nunca compiten. Limitación
   * conocida y aceptada: una actividad anterior al `joinedAt` de una cuenta
   * participante nunca generará LP (§9.4, sin retroactividad) pero seguirá
   * apareciendo aquí en cada ciclo hasta que `LeaguePointGrantService` la
   * descarte -- costo aceptable en V1, sin backfill masivo de cuentas.
   */
  findPendingLeagueGrant(activeAccountIds: string[], limit: number): Promise<ValidatedGamificationActivity[]> {
    if (activeAccountIds.length === 0) return Promise.resolve([]);
    return this.prisma.validatedGamificationActivity.findMany({
      where: {
        accountId: { in: activeAccountIds },
        leaguePointLedgerEntries: { none: {} },
      },
      orderBy: { occurredAt: 'asc' },
      take: limit,
    });
  }
}
