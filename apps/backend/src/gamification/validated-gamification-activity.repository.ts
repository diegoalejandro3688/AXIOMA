import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { ValidatedGamificationActivity } from '../generated/prisma/client';

interface PendingGrantRow {
  id: string;
  account_id: string;
  source_domain: string;
  source_entity_type: string;
  source_entity_id: string;
  activity_type: string;
  validation_status: string;
  validation_rule_version: string;
  occurred_at: Date;
  validated_at: Date;
  deduplication_key: string;
  integrity_status: string;
}

function toActivity(row: PendingGrantRow): ValidatedGamificationActivity {
  return {
    id: row.id,
    accountId: row.account_id,
    sourceDomain: row.source_domain,
    sourceEntityType: row.source_entity_type,
    sourceEntityId: row.source_entity_id,
    activityType: row.activity_type,
    validationStatus: row.validation_status,
    validationRuleVersion: row.validation_rule_version,
    occurredAt: row.occurred_at,
    validatedAt: row.validated_at,
    deduplicationKey: row.deduplication_key,
    integrityStatus: row.integrity_status,
  };
}

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
   * futuro).
   *
   * Orden: `attempts` (NULLS FIRST) antes que `occurredAt`. El backoff por
   * sí solo NO evita starvation -- retrasa el reingreso de una actividad
   * sin regla, pero una vez que `nextEligibleAt` vence, esa actividad
   * vuelve a competir, y al ser más antigua que cualquier actividad nueva
   * (occurredAt anterior) la superaría SIEMPRE bajo un orden puro por
   * occurredAt. Con un backlog de actividades irresolubles (ninguna regla
   * llegará jamás a existir para su activityType) igual o mayor al tamaño
   * del lote, esto bloquea indefinidamente a actividades nuevas y
   * genuinamente pendientes -- se confirmó reproducido contra datos reales
   * (ver auditoría, Bloque IV Incremento 2). Priorizar por intentos deja
   * pasar primero a lo nunca intentado (attempts NULL/0) en cada ciclo;
   * lo que ya falló repetidas veces solo ocupa el cupo sobrante.
   *
   * SQL crudo, no `findMany` con `orderBy` anidado: Prisma solo admite el
   * modificador `nulls` en columnas propias del modelo consultado, no en
   * campos alcanzados a través de una relación (aquí, `xp_grant_attempt`
   * vía LEFT JOIN) -- `XpGrantAttemptOrderByWithRelationInput.attempts` es
   * `SortOrder` puro, sin variante `{ sort, nulls }`. Y el default de
   * Postgres para ASC es NULLS LAST (justo lo contrario de lo que se
   * necesita: una actividad sin intento todavía debe ir PRIMERO).
   */
  async findPendingGrant(limit: number, now: Date = new Date()): Promise<ValidatedGamificationActivity[]> {
    const rows = await this.prisma.$queryRaw<PendingGrantRow[]>`
      SELECT
        vga.id, vga.account_id, vga.source_domain, vga.source_entity_type, vga.source_entity_id,
        vga.activity_type, vga.validation_status, vga.validation_rule_version, vga.occurred_at,
        vga.validated_at, vga.deduplication_key, vga.integrity_status
      FROM validated_gamification_activity vga
      LEFT JOIN xp_grant_attempt xga ON xga.validated_activity_id = vga.id
      WHERE NOT EXISTS (
        SELECT 1 FROM xp_ledger_entry xle
        WHERE xle.validated_activity_id = vga.id AND xle.entry_type = 'OTORGAMIENTO'
      )
      AND (xga.validated_activity_id IS NULL OR xga.next_eligible_at <= ${now})
      ORDER BY xga.attempts ASC NULLS FIRST, vga.occurred_at ASC
      LIMIT ${limit}
    `;
    return rows.map(toActivity);
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
