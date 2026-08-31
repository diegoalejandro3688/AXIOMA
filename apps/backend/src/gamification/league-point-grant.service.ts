import { Injectable, Logger } from '@nestjs/common';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { Prisma } from '../generated/prisma/client';
import type { ValidatedGamificationActivity, LeaguePointLedgerEntry } from '../generated/prisma/client';
import { ValidatedGamificationActivityRepository } from './validated-gamification-activity.repository';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';
import { GameSeasonRepository } from './game-season.repository';
import { LeagueGroupRepository } from './league-group.repository';
import { LeaguePointRuleRepository } from './league-point-rule.repository';
import { LeaguePointLedgerEntryRepository } from './league-point-ledger-entry.repository';
import { QuickQuestionAttemptRepository } from './quick-question-attempt.repository';

const GRANT_BATCH_SIZE = 100;
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const SERIALIZATION_CONFLICT_CODE = 'P2034';
/**
 * SQLSTATE de Postgres para `serialization_failure` -- mismo hallazgo y
 * misma constante que `ai-conversation.service.ts`/`xp-grant.service.ts`
 * (LEF Bloque VI Fase B / LEF Bloque VIII).
 */
const SERIALIZATION_CONFLICT_SQLSTATE = '40001';
const DRIVER_ADAPTER_ERROR_NAME = 'DriverAdapterError';
const DRIVER_ADAPTER_WRITE_CONFLICT_KIND = 'TransactionWriteConflict';
const MAX_SERIALIZABLE_RETRIES = 3;
const RETRY_BACKOFF_MS = [25, 75, 150];

/** Réplica literal de la misma función en `xp-grant.service.ts`/`ai-conversation.service.ts`. */
export function isDriverAdapterErrorShape(error: unknown): error is { name: string; cause: Record<string, unknown> } {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: unknown; cause?: unknown };
  return candidate.name === DRIVER_ADAPTER_ERROR_NAME && typeof candidate.cause === 'object' && candidate.cause !== null;
}

/**
 * Corrección de `hallazgo-latente` (LEF Bloque VIII, DG-14) -- mismo
 * criterio EXACTO que `isSerializationConflict` de `ai-conversation.service.ts`
 * y `xp-grant.service.ts`: reconoce el conflicto detectado en sentencia
 * intermedia (P2034) y el detectado en el COMMIT (`DriverAdapterError`).
 */
export function isSerializationConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === SERIALIZATION_CONFLICT_CODE) return true;

  if (isDriverAdapterErrorShape(error)) {
    const cause = error.cause as { kind?: unknown; code?: unknown; originalCode?: unknown };
    if (cause.kind === DRIVER_ADAPTER_WRITE_CONFLICT_KIND) return true;
    if (cause.originalCode === SERIALIZATION_CONFLICT_SQLSTATE) return true;
    if (cause.kind === 'postgres' && cause.code === SERIALIZATION_CONFLICT_SQLSTATE) return true;
  }

  return error instanceof Error && error.message.includes(DRIVER_ADAPTER_WRITE_CONFLICT_KIND);
}

export type LeagueGrantOutcome =
  | { outcome: 'LP_GRANTED'; entry: LeaguePointLedgerEntry }
  | { outcome: 'NOT_PARTICIPATING' }
  | { outcome: 'OUT_OF_WINDOW' }
  | { outcome: 'NO_ACTIVE_RULE' }
  /**
   * COMPETITIVE V1, Incremento 10 -- la actividad existe y es válida, pero su
   * recompensa de LP no corresponde por CORRECTNESS. Hoy sólo se produce para
   * `QUICK_QUESTION_ANSWERED` con un intento incorrecto. No se escribe fila
   * de ledger (preferencia: nunca un OTORGAMIENTO de monto 0).
   */
  | { outcome: 'NOT_REWARDABLE' }
  | { outcome: 'DAILY_CAP_REACHED' }
  | { outcome: 'CLOSED_CONCURRENTLY' };

class DailyCapExceededError extends Error {}
/** Señal interna: al releer dentro de la transacción SERIALIZABLE, temporada/grupo/participación ya no están activos (§9.5). */
class ClosedConcurrentlyError extends Error {}

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

/**
 * Otorga League Points a partir de `ValidatedGamificationActivity` -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.4/§9.5. Estructuralmente calcado de
 * `XpGrantService`, pero INDEPENDIENTE en cada paso: transacción propia
 * (nunca comparte una con XP), tabla de reglas propia (`LeaguePointRule`,
 * nunca deriva el monto de `XpRule`), ledger propio.
 *
 * Diferencia deliberada frente a XP: el otorgamiento de XP es incondicional;
 * este es CONDICIONAL a que la cuenta tenga una `season_league_participation`
 * ACTIVE cuyo `joinedAt` sea anterior o igual a `activity.occurredAt`, y a
 * que temporada/grupo/participación sigan activos en el momento exacto de
 * confirmar (releído dentro de la misma transacción SERIALIZABLE que
 * escribe -- precisión obligatoria del Product Owner, §9.5). Sin
 * participación elegible, o fuera de ventana, el otorgamiento se omite: no
 * es un error, es "no aplica" -- nunca se escribe fila alguna.
 */
@Injectable()
export class LeaguePointGrantService {
  private readonly logger = new Logger(LeaguePointGrantService.name);

  constructor(
    private readonly txRunner: TransactionRunnerService,
    private readonly activityRepo: ValidatedGamificationActivityRepository,
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly seasonRepo: GameSeasonRepository,
    private readonly groupRepo: LeagueGroupRepository,
    private readonly ruleRepo: LeaguePointRuleRepository,
    private readonly ledgerRepo: LeaguePointLedgerEntryRepository,
    private readonly quickQuestionAttemptRepo: QuickQuestionAttemptRepository,
  ) {}

  async grantPending(): Promise<{ granted: number; skipped: number; failed: number }> {
    const activeAccountIds = await this.participationRepo.findAllActiveAccountIds();
    const pending = await this.activityRepo.findPendingLeagueGrant(activeAccountIds, GRANT_BATCH_SIZE);

    let granted = 0;
    let skipped = 0;
    let failed = 0;

    for (const activity of pending) {
      try {
        const result = await this.grantForActivity(activity);
        if (result.outcome === 'LP_GRANTED') granted++;
        else skipped++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`No se pudo otorgar League Points para la actividad ${activity.id}: ${message}`);
      }
    }

    return { granted, skipped, failed };
  }

  async grantForActivity(activity: ValidatedGamificationActivity): Promise<LeagueGrantOutcome> {
    const at = activity.occurredAt;

    // Lectura previa (fuera de la transacción) -- solo para decidir si vale
    // la pena intentar; la verificación AUTORITATIVA ocurre releyendo
    // DENTRO de la transacción SERIALIZABLE de abajo (§9.5).
    const participation = await this.participationRepo.findActiveByAccountId(activity.accountId);
    if (!participation) return { outcome: 'NOT_PARTICIPATING' };
    if (at < participation.joinedAt) return { outcome: 'OUT_OF_WINDOW' };

    const rule = await this.ruleRepo.findApplicableRule(activity.activityType, at);
    if (!rule) return { outcome: 'NO_ACTIVE_RULE' };

    // COMPETITIVE V1, Incremento 10 -- ÚNICA excepción de correctness en el
    // otorgamiento de LP, ACOTADA EXCLUSIVAMENTE a `QUICK_QUESTION_ANSWERED`
    // (decisión de producto: la Pregunta rápida premia el ACIERTO, no la
    // participación). Las demás fuentes siguen siendo incondicionales:
    // `RESPUESTA_VALIDADA` +1 y `TEMA_COMPLETADO` +5 son "actividad validada",
    // nunca "respuesta correcta" -- misma semántica que XP.
    //
    // `isCorrect` ya vive en `quick_question_attempt` (NOT NULL). El hecho de
    // dominio "el usuario respondió una Pregunta rápida" se CONSERVA: el evento
    // `quick_question_answered` y la `validated_gamification_activity` se emiten
    // igual para una respuesta incorrecta (XP y señales de desafío los usan);
    // sólo la RECOMPENSA de LP queda condicionada aquí. Sin columna nueva: se
    // lee el intento de forma transitoria por su id (`sourceEntityId`, fijado
    // por `GamificationService.sourceEntityFor`).
    if (activity.activityType === 'QUICK_QUESTION_ANSWERED') {
      const attempt = await this.quickQuestionAttemptRepo.findById(activity.sourceEntityId);
      if (!attempt || !attempt.isCorrect) return { outcome: 'NOT_REWARDABLE' };
    }

    const idempotencyKey = `league-grant:${participation.id}:${activity.id}`;

    try {
      const entry = await this.runSerializable(async (tx) => {
        // Precisión obligatoria del Product Owner (§9.5) -- exclusión
        // transaccional otorgamiento-vs-cierre: releer, DENTRO de esta
        // misma transacción, que participación/temporada/grupo SIGUEN
        // activos justo antes de confirmar. El trigger
        // `enforce_league_point_ledger_entry_window` es el respaldo real en
        // base de datos de esta misma condición.
        const freshParticipation = await tx.seasonLeagueParticipation.findUnique({ where: { id: participation.id } });
        if (!freshParticipation || freshParticipation.participationStatus !== 'ACTIVE') {
          throw new ClosedConcurrentlyError();
        }
        const season = await tx.gameSeason.findUnique({ where: { id: freshParticipation.gameSeasonId } });
        if (!season || season.status !== 'ACTIVE' || at < season.startsAt || at >= season.endsAt) {
          throw new ClosedConcurrentlyError();
        }
        const group = await tx.leagueGroup.findUnique({ where: { id: freshParticipation.leagueGroupId } });
        if (!group || (group.status !== 'OPEN' && group.status !== 'FULL')) {
          throw new ClosedConcurrentlyError();
        }

        const { start, end } = utcDayRange(at);
        const grantedToday = rule.dailyCap
          ? await this.ledgerRepo.sumGrantedTodayForRule(tx, participation.id, rule.id, start, end)
          : 0;

        if (rule.dailyCap != null && grantedToday + rule.basePoints > rule.dailyCap) {
          throw new DailyCapExceededError();
        }

        const { entry: created } = await this.ledgerRepo.createIdempotent(
          {
            accountId: activity.accountId,
            seasonLeagueParticipationId: participation.id,
            validatedActivityId: activity.id,
            leaguePointRuleId: rule.id,
            entryType: 'OTORGAMIENTO',
            pointAmount: rule.basePoints,
            ruleVersion: rule.ruleVersion,
            idempotencyKey,
            occurredAt: at,
          },
          tx,
        );

        await this.participationRepo.incrementLeaguePoints(tx, participation.id, created.pointAmount);

        return created;
      });

      return { outcome: 'LP_GRANTED', entry };
    } catch (error) {
      if (error instanceof DailyCapExceededError) return { outcome: 'DAILY_CAP_REACHED' };
      if (error instanceof ClosedConcurrentlyError) return { outcome: 'CLOSED_CONCURRENTLY' };
      if (isUniqueConstraintViolation(error)) {
        const existing = await this.ledgerRepo.findByIdempotencyKey(idempotencyKey);
        if (existing) return { outcome: 'LP_GRANTED', entry: existing };
      }
      throw error;
    }
  }

  /**
   * Mismo mecanismo que `XpGrantService.runSerializable` -- reintento
   * acotado ante conflicto real, reconociendo tanto P2034 como el
   * `DriverAdapterError`/`TransactionWriteConflict` detectado en el COMMIT
   * (corrección de `hallazgo-latente`, LEF Bloque VIII).
   */
  private async runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        return await this.txRunner.run(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (!isSerializationConflict(error) || attempt >= MAX_SERIALIZABLE_RETRIES) throw error;

        const cause = error instanceof Prisma.PrismaClientKnownRequestError ? (error.meta?.cause ?? error.message) : String(error);
        this.logger.warn(`Conflicto serializable en otorgamiento de League Points (intento ${attempt}/${MAX_SERIALIZABLE_RETRIES}): ${cause} -- reintentando`);
        const backoffIndex = Math.min(attempt - 1, RETRY_BACKOFF_MS.length - 1);
        await sleep(RETRY_BACKOFF_MS[backoffIndex] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]!);
      }
    }
  }
}
