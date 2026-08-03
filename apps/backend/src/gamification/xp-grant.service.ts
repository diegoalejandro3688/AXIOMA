import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { Prisma } from '../generated/prisma/client';
import type { ValidatedGamificationActivity, XpLedgerEntry } from '../generated/prisma/client';
import { GamificationProgramRepository } from './gamification-program.repository';
import { GamificationProgramVersionRepository } from './gamification-program-version.repository';
import { XpRuleRepository } from './xp-rule.repository';
import { ValidatedGamificationActivityRepository } from './validated-gamification-activity.repository';
import { XpLedgerEntryRepository } from './xp-ledger-entry.repository';
import { XpBalanceRepository } from './xp-balance.repository';
import { XpGrantAttemptRepository } from './xp-grant-attempt.repository';

/** Único programa de XP conocido en este incremento -- ver brief del incremento de otorgamiento. */
const PROGRAM_KEY = 'xp-core';

const GRANT_BATCH_SIZE = 100;

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const SERIALIZATION_CONFLICT_CODE = 'P2034';
const MAX_SERIALIZABLE_RETRIES = 3;
/** Backoff acotado entre reintentos de conflicto serializable -- no exponencial sin límite. */
const RETRY_BACKOFF_MS = [25, 75, 150];

/**
 * Backoff determinista para NO_ACTIVE_RULE -- creciente y con tope (24h),
 * indexado por `attempts` ya registrados. Evita polling perpetuo: una
 * actividad sin regla dejará de competir por el cupo de cada ciclo cada vez
 * con menor frecuencia, sin dejar nunca de reevaluarse (no es terminal).
 */
const NO_RULE_BACKOFF_MS = [
  60_000, // 1 min (primer reintento)
  5 * 60_000, // 5 min
  30 * 60_000, // 30 min
  2 * 60 * 60_000, // 2 h
  6 * 60 * 60_000, // 6 h
  24 * 60 * 60_000, // 24 h (tope)
];

export type GrantOutcome =
  | { outcome: 'XP_GRANTED'; entry: XpLedgerEntry }
  | { outcome: 'NO_ACTIVE_RULE' }
  | { outcome: 'DAILY_CAP_REACHED' };

/** Señal interna para abortar la transacción sin gastar reintentos de conflicto serializable. */
class DailyCapExceededError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
}

function utcDayRange(at: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function noRuleBackoffFor(attemptsSoFar: number): number {
  const index = Math.min(attemptsSoFar, NO_RULE_BACKOFF_MS.length - 1);
  return NO_RULE_BACKOFF_MS[index] ?? NO_RULE_BACKOFF_MS[NO_RULE_BACKOFF_MS.length - 1]!;
}

/**
 * Convierte validated_gamification_activity en xp_ledger_entry mediante
 * reglas versionadas -- ver docs/adr/0016-gamificacion-fundacion.md y el
 * brief del incremento. validated_gamification_activity permanece
 * INMUTABLE: nunca se le hace un UPDATE, ni siquiera para registrar el
 * resultado del intento (eso vive en xp_grant_attempt).
 */
@Injectable()
export class XpGrantService {
  private readonly logger = new Logger(XpGrantService.name);

  constructor(
    private readonly txRunner: TransactionRunnerService,
    private readonly programRepo: GamificationProgramRepository,
    private readonly versionRepo: GamificationProgramVersionRepository,
    private readonly ruleRepo: XpRuleRepository,
    private readonly activityRepo: ValidatedGamificationActivityRepository,
    private readonly ledgerRepo: XpLedgerEntryRepository,
    private readonly balanceRepo: XpBalanceRepository,
    private readonly attemptRepo: XpGrantAttemptRepository,
  ) {}

  async grantPending(): Promise<{ granted: number; capped: number; noRule: number; failed: number }> {
    const pending = await this.activityRepo.findPendingGrant(GRANT_BATCH_SIZE);

    let granted = 0;
    let capped = 0;
    let noRule = 0;
    let failed = 0;

    for (const activity of pending) {
      try {
        const result = await this.grantForActivity(activity);
        if (result.outcome === 'XP_GRANTED') granted++;
        else if (result.outcome === 'DAILY_CAP_REACHED') capped++;
        else noRule++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`No se pudo otorgar XP para la actividad ${activity.id}: ${message}`);
      }
    }

    return { granted, capped, noRule, failed };
  }

  async grantForActivity(activity: ValidatedGamificationActivity): Promise<GrantOutcome> {
    const at = activity.occurredAt;

    const program = await this.programRepo.findActiveByProgramKey(PROGRAM_KEY);
    const version = program ? await this.versionRepo.findApprovedEffectiveAt(program.id, at) : null;
    const rule = version ? await this.ruleRepo.findActiveForVersionAndType(version.id, activity.activityType, at) : null;

    if (!rule) {
      await this.recordNoActiveRule(activity.id);
      return { outcome: 'NO_ACTIVE_RULE' };
    }

    const idempotencyKey = `grant:${activity.id}`;

    try {
      const entry = await this.runSerializable(async (tx) => {
        const { start, end } = utcDayRange(at);
        const grantedToday = rule.dailyCap
          ? await this.ledgerRepo.sumGrantedTodayForRule(tx, activity.accountId, rule.id, start, end)
          : 0;

        if (rule.dailyCap != null && grantedToday + rule.baseXp > rule.dailyCap) {
          throw new DailyCapExceededError();
        }

        // createIdempotent, DENTRO de una transacción explícita, relanza un
        // P2002 tal cual (no puede re-consultar con el mismo tx ya abortado
        // -- ver XpLedgerEntryRepository.createIdempotent). Aquí solo se
        // llega si esta actividad nunca se otorgó antes, así que un P2002 en
        // este punto es SIEMPRE una carrera real (dos ciclos concurrentes
        // procesando la misma actividad) -- se resuelve fuera de la
        // transacción, en el catch de abajo.
        const { entry: created } = await this.ledgerRepo.createIdempotent(
          {
            accountId: activity.accountId,
            validatedActivityId: activity.id,
            xpRuleId: rule.id,
            entryType: 'OTORGAMIENTO',
            xpAmount: rule.baseXp,
            baseXpAmount: rule.baseXp,
            ruleVersion: version!.versionLabel,
            idempotencyKey,
            occurredAt: at,
          },
          tx,
        );

        await this.balanceRepo.upsertIncrement(tx, {
          accountId: activity.accountId,
          deltaXp: created.xpAmount,
          lastLedgerEntryId: created.id,
        });

        return created;
      });

      return { outcome: 'XP_GRANTED', entry };
    } catch (error) {
      if (error instanceof DailyCapExceededError) {
        await this.recordDailyCapReached(activity.id, at);
        return { outcome: 'DAILY_CAP_REACHED' };
      }
      if (isUniqueConstraintViolation(error)) {
        // Carrera real: otro ciclo concurrente ya otorgó esta actividad
        // entre que se leyó como "pendiente" y que se intentó otorgar.
        // Fuera de cualquier transacción -- consulta limpia, balance NO se
        // vuelve a tocar (ya lo hizo la transacción que sí ganó la carrera).
        const existing = await this.ledgerRepo.findByIdempotencyKey(idempotencyKey);
        if (existing) return { outcome: 'XP_GRANTED', entry: existing };
      }
      throw error;
    }
  }

  /**
   * Corrección mediante entrada compensatoria (ADR-0016). Las cuatro
   * protecciones -- ver brief del incremento:
   * - Doble reversión: idempotencyKey `reverse:${originalEntryId}` (más el
   *   UNIQUE sobre reverses_entry_id en base de datos).
   * - Reverso de un reverso: rechazado explícitamente antes de intentarlo.
   * - Cruce de cuentas: no hay parámetro `accountId` -- siempre se usa el
   *   de la entrada original.
   * - Monto distinto del negativo exacto: no hay parámetro `xpAmount` --
   *   siempre `-original.xpAmount`. (Ambas, además, reforzadas por el
   *   trigger `enforce_xp_ledger_entry_reversal_integrity` en base de datos.)
   */
  async reverseEntry(originalEntryId: string, reasonCode: string): Promise<XpLedgerEntry> {
    const original = await this.ledgerRepo.findById(originalEntryId);
    if (!original) throw new NotFoundException('Entrada de ledger no encontrada.');
    if (original.entryType === 'REVERSO') {
      throw new BadRequestException('No se puede reversar una entrada que ya es un reverso.');
    }

    const idempotencyKey = `reverse:${originalEntryId}`;

    try {
      return await this.txRunner.run(async (tx) => {
        const { entry, created } = await this.ledgerRepo.createIdempotent(
          {
            accountId: original.accountId,
            entryType: 'REVERSO',
            xpAmount: -original.xpAmount,
            reasonCode,
            idempotencyKey,
            occurredAt: new Date(),
            reversesEntryId: originalEntryId,
          },
          tx,
        );
        if (created) {
          await this.balanceRepo.upsertIncrement(tx, {
            accountId: original.accountId,
            deltaXp: entry.xpAmount,
            lastLedgerEntryId: entry.id,
          });
        }
        return entry;
      });
    } catch (error) {
      // Segunda reversión de la MISMA entrada (idempotencyKey ya existe):
      // el P2002 relanzado por createIdempotent aborta esta transacción
      // (nunca llegó a incrementar el balance) -- se resuelve fuera de
      // ella, devolviendo el reverso ya creado por el primer intento.
      if (isUniqueConstraintViolation(error)) {
        const existing = await this.ledgerRepo.findByIdempotencyKey(idempotencyKey);
        if (existing) return existing;
      }
      throw error;
    }
  }

  /**
   * Mecanismo formal de recuperación (condición arquitectónica explícita):
   * recalcula el saldo real desde xp_ledger_entry y corrige xp_balance si
   * diverge. No sustituye la transacción de otorgamiento/reverso -- es la
   * red de seguridad para cualquier desalineación que ocurra por otra vía.
   */
  async reconcileBalance(accountId: string): Promise<{ corrected: boolean; before: number; after: number }> {
    const realSum = await this.ledgerRepo.sumNetXpForAccount(accountId);
    const current = await this.balanceRepo.findByAccountId(accountId);
    const before = current?.lifetimeXp ?? 0;

    if (before === realSum) {
      return { corrected: false, before, after: realSum };
    }

    const entries = await this.ledgerRepo.findByAccountId(accountId);
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
    await this.balanceRepo.setExact(accountId, realSum, lastEntry?.id ?? null);
    return { corrected: true, before, after: realSum };
  }

  private async recordNoActiveRule(validatedActivityId: string): Promise<void> {
    const existing = await this.attemptRepo.findByValidatedActivityId(validatedActivityId);
    const attemptsSoFar = existing?.attempts ?? 0;
    const nextEligibleAt = new Date(Date.now() + noRuleBackoffFor(attemptsSoFar));
    await this.attemptRepo.upsertAttempt({ validatedActivityId, lastOutcome: 'NO_ACTIVE_RULE', nextEligibleAt });
  }

  private async recordDailyCapReached(validatedActivityId: string, at: Date): Promise<void> {
    const { end } = utcDayRange(at);
    await this.attemptRepo.upsertAttempt({ validatedActivityId, lastOutcome: 'DAILY_CAP_REACHED', nextEligibleAt: end });
  }

  /**
   * Aislamiento SERIALIZABLE -- necesario porque un SUM (daily_cap) seguido
   * de un INSERT dentro de una transacción normal no impide que dos
   * transacciones concurrentes lean el mismo total "bajo el tope" antes de
   * que cualquiera confirme (ver brief). Ante conflicto real, Postgres
   * aborta una de las dos con un error que Prisma expone como P2034
   * ("Transaction failed due to a write conflict or a deadlock") --
   * reintento acotado (máx. 3, backoff fijo pequeño), nunca para errores
   * distintos.
   */
  private async runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        return await this.txRunner.run(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        const isSerializationConflict =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === SERIALIZATION_CONFLICT_CODE;
        if (!isSerializationConflict || attempt >= MAX_SERIALIZABLE_RETRIES) throw error;

        const cause =
          error instanceof Prisma.PrismaClientKnownRequestError ? (error.meta?.cause ?? error.message) : String(error);
        this.logger.warn(
          `Conflicto serializable en otorgamiento (intento ${attempt}/${MAX_SERIALIZABLE_RETRIES}): ${cause} -- reintentando`,
        );
        const backoffIndex = Math.min(attempt - 1, RETRY_BACKOFF_MS.length - 1);
        await sleep(RETRY_BACKOFF_MS[backoffIndex] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]!);
      }
    }
  }
}
