import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { gamificationActorRef } from './gamification-actor-ref';
import { buildLegacyRewardSourceId, buildRewardSourceIdV2, isLegacyEmbeddingActivityType, activityLegacyKeyPrefix, buildActivityDedupKeyV2FromRow } from './gamification-key';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';

/** WEB-0D.1C-B4-R1 §4/§12 -- lote acotado por corrida del reconciliador; ver `reconcileTerminalSeasonParticipations`. */
const RECONCILER_BATCH_SIZE = 50;

const TERMINAL_PARTICIPATION_STATUSES = ['PROMOTED', 'DEMOTED', 'RETAINED'] as const;

export interface ImmediateSafePseudonymizationResult {
  xpLedgerEntry: number;
  rewardGrant: number;
  achievementProgress: number;
  achievementUnlock: number;
  leaguePointLedgerEntry: number;
}

export type RewardGrantCollisionReason = 'MALFORMED_LEGACY_KEY' | 'V2_TARGET_ALREADY_EXISTS';

export interface RewardGrantCollisionDetail {
  rewardGrantId: string;
  sourceEntityType: string;
  legacySourceEntityId: string;
  reason: RewardGrantCollisionReason;
  expectedV2SourceEntityId?: string;
  expectedV2IdempotencyKey?: string;
  collidingRewardGrantId?: string;
}

/**
 * WEB-0D.1C-B3-R1 §1 -- una colisión de RewardGrant (clave legacy con forma
 * inesperada, o clave v2 destino ya ocupada por otra fila) NUNCA se trata
 * como éxito parcial. Aborta TODA la operación de B3 para la cuenta (las
 * cinco familias de modelos, no solo RewardGrant) -- ver
 * `pseudonymizeImmediateSafeHistory`, que ejecuta todo dentro de una única
 * transacción y lanza esta excepción ANTES de mutar cualquier fila. Los
 * detalles de la colisión se preservan en el mensaje/propiedades para
 * reconciliación explícita en B5 -- nunca se fusiona, nunca se sobrescribe
 * a ciegas, nunca un `skip-as-success`.
 */
export class RewardGrantReconciliationRequiredError extends Error {
  constructor(
    public readonly accountId: string,
    public readonly collisions: RewardGrantCollisionDetail[],
  ) {
    super(
      `B3 abortado para la cuenta ${accountId}: ${collisions.length} RewardGrant requieren reconciliación manual (B5) antes de pseudonimizar -- ninguna de las 5 familias de modelos fue mutada. Detalle: ${JSON.stringify(collisions)}`,
    );
    this.name = 'RewardGrantReconciliationRequiredError';
  }
}

export type ValidatedActivityCollisionReason = 'MALFORMED_LEGACY_KEY' | 'V2_TARGET_ALREADY_EXISTS';

export interface ValidatedActivityCollisionDetail {
  activityId: string;
  activityType: string;
  legacyDeduplicationKey: string;
  reason: ValidatedActivityCollisionReason;
  expectedV2DeduplicationKey?: string;
  collidingActivityId?: string;
}

/**
 * WEB-0D.1C-B4 §7 -- mismo criterio EXACTO que `RewardGrantReconciliationRequiredError`
 * (B3-R1 §1): una colisión de clave legacy->v2 en `ValidatedGamificationActivity`
 * NUNCA se trata como éxito parcial. Aborta la pseudonimización de B4 para
 * la cuenta -- ver `pseudonymizeDrainedValidatedActivity`, que ejecuta todo
 * dentro de una única transacción y lanza esta excepción ANTES de mutar
 * cualquier fila. Los detalles se preservan para reconciliación explícita
 * en B5.
 */
export class ValidatedActivityReconciliationRequiredError extends Error {
  constructor(
    public readonly accountId: string,
    public readonly collisions: ValidatedActivityCollisionDetail[],
  ) {
    super(
      `B4 abortado para la cuenta ${accountId}: ${collisions.length} ValidatedGamificationActivity requieren reconciliación manual (B5) antes de pseudonimizar -- ninguna fila fue mutada. Detalle: ${JSON.stringify(collisions)}`,
    );
    this.name = 'ValidatedActivityReconciliationRequiredError';
  }
}

/**
 * WEB-0D.1C-B3 (+ B3-R1) -- pseudonimización histórica INMEDIATA-SEGURA en
 * el cierre DEFINITIVO de cuenta. Alcance EXACTO, ver el reporte de B3 §B/§C
 * para la clasificación completa de los 7 modelos de B1:
 *
 *   IMMEDIATE_SAFE (este servicio los toca, en UNA sola transacción --
 *   B3-R1 §2): XpLedgerEntry, RewardGrant, AchievementProgress,
 *   AchievementUnlock, LeaguePointLedgerEntry.
 *
 * WEB-0D.1C-B4 resuelve los 2 modelos que B3 difirió, cada uno con su
 * PROPIA transacción (nunca fusionados en `pseudonymizeImmediateSafeHistory`
 * -- instrucción explícita de B4: "no modificar la semántica de las 5
 * familias de B3"):
 *
 *   - `pseudonymizeDrainedValidatedActivity`: ValidatedGamificationActivity.
 *     El hallazgo de B4 (ver reporte §C) es que el motivo real del diferimiento
 *     en B3 era un punto ciego de CONSULTA (`findPendingGrant`'s LEFT JOIN
 *     mal-clasificando una fila con `accountId=NULL` como "no cerrada"),
 *     nunca una razón de negocio genuina -- con ese punto ciego cerrado
 *     (`validated-gamification-activity.repository.ts`, filtro
 *     `account_id IS NOT NULL` explícito), este modelo es tan seguro como
 *     los 5 de B3 para CUALQUIER cuenta CLOSED, sin necesidad de rastrear
 *     "drenado" fila por fila.
 *
 *   - `pseudonymizeTerminalSeasonParticipations`: SeasonLeagueParticipation
 *     YA terminal (`participationStatus` en PROMOTED/DEMOTED/RETAINED) al
 *     momento del cierre. Las participaciones que se vuelven terminales
 *     DESPUÉS del cierre se pseudonimizan desde el otro extremo, en el
 *     mismo momento en que se vuelven terminales -- ver
 *     `pseudonymizeParticipationsForClosedAccountsWithinTx`, invocado por
 *     `LeaderboardFinalizationService.finalizeGroup` dentro de SU PROPIA
 *     transacción de cierre de grupo (ver reporte B4 §J).
 *
 * Invocado SOLO desde `PrivacyService.runAccountDeletionSweep`, DESPUÉS de
 * `GamificationService.deleteCurrentStateForAccountClosure`. `Account.status`
 * permanece DELETION_PENDING hasta que TODOS los pasos del cierre --
 * incluido este -- completen sin excepción (ver B3-R1 §3:
 * `AuthService.markAccountClosed` se invoca al FINAL del barrido, nunca
 * antes) -- un fallo aquí nunca deja la cuenta en un CLOSED falsamente
 * completo.
 */
@Injectable()
export class GamificationPrivacyService {
  private readonly logger = new Logger(GamificationPrivacyService.name);

  constructor(
    private readonly transactionRunner: TransactionRunnerService,
    private readonly config?: ConfigService,
    // WEB-0D.1C-B4-R1 -- opcional, mismo criterio que `config?` arriba:
    // varios gates ya existentes (B3/B3-R1/B4) construyen esta clase
    // POSICIONALMENTE con solo 1-2 argumentos; solo lo usa
    // `reconcileTerminalSeasonParticipations` (nuevo en B4-R1), nunca los
    // métodos ya existentes.
    private readonly participationRepo?: SeasonLeagueParticipationRepository,
  ) {}

  /**
   * WEB-0D.1C-B4-R1 §12 -- interruptor explícito, deshabilitado por
   * defecto, mismo patrón EXACTO que `BillingRetentionService.resolveRetentionDays`
   * (`BILLING_RETENTION_DAYS_AFTER_TERMINAL` ausente -> NO-OP fail-safe).
   * ZETRYND ya tiene una base de producción viva (ver docs de cierre V1) en
   * la que B4 JAMÁS se desplegó -- CUALQUIER fila `CLOSED + terminal +
   * accountId crudo` que exista hoy en esa base es, por construcción,
   * 100% backlog PRE-B4 (nunca pudo haber sido "perdida por un hook de B4"
   * que nunca corrió). Habilitar este reconciliador sin más lo convertiría
   * en un backfill histórico no acotado disfrazado de reintento ordinario
   * -- exactamente lo que B4-R1 §12 prohíbe. Por eso el reconciliador
   * permanece APAGADO hasta que un operador fije explícitamente
   * `GAMIFICATION_PRIVACY_RECONCILER_ENABLED=true` DESPUÉS de establecer la
   * línea base (una reconciliación B5 explícita, fuera de este bloque, o
   * la confirmación operativa de que no hay backlog pre-B4 real). Los
   * gates prueban el mecanismo fijando esta variable en su propio proceso,
   * nunca activándolo por defecto para el servidor real.
   */
  private isReconcilerEnabled(): boolean {
    const raw = this.config?.get<string>('GAMIFICATION_PRIVACY_RECONCILER_ENABLED') ?? process.env.GAMIFICATION_PRIVACY_RECONCILER_ENABLED;
    return raw === 'true';
  }

  /**
   * Ver `GamificationService.getGamificationSecret`/`RewardEvaluationWorker.getGamificationSecret`
   * -- mismo criterio EXACTO. Si el secreto falta, esta operación DEBE
   * fallar explícitamente ANTES de abrir la transacción (nunca completar en
   * silencio, ni usar ANALYTICS_ACTOR_SECRET, ni un valor de repuesto) --
   * el llamador (`PrivacyService`) trata esa excepción exactamente como
   * cualquier otro fallo de un paso del cierre: la `PrivacyRequest` queda
   * PROCESSING para reintento, y como `markAccountClosed` corre al FINAL
   * del barrido (ver B3-R1 §3), `Account.status` sigue DELETION_PENDING --
   * nunca CLOSED con un historial parcialmente pseudonimizado.
   */
  private getGamificationSecret(): string {
    const secret = this.config?.get<string>('GAMIFICATION_ACTOR_SECRET') ?? process.env.GAMIFICATION_ACTOR_SECRET;
    if (!secret) {
      throw new Error('GAMIFICATION_ACTOR_SECRET no está configurado -- no se puede pseudonimizar el historial de gamificación al cerrar la cuenta.');
    }
    return secret;
  }

  /**
   * B3-R1 §2 -- las cinco familias de modelos se pseudonimizan dentro de UNA
   * única transacción de Postgres por cuenta:
   *
   *   1. resolver/validar el secreto ANTES de abrir la transacción;
   *   2. derivar `actorRef`;
   *   3. dentro de la transacción: preflight de TODOS los RewardGrant
   *      legacy candidatos (forma de clave + colisión contra su v2
   *      destino) -- solo lecturas, ninguna mutación todavía;
   *   4. si hay cualquier ambigüedad -> lanzar `RewardGrantReconciliationRequiredError`
   *      ANTES de mutar nada -- Prisma revierte la transacción completa,
   *      cero filas tocadas en las cinco familias;
   *   5. si el preflight no encuentra ambigüedad -> pseudonimizar las cinco
   *      familias de modelos;
   *   6. commit (implícito al retornar del callback sin excepción).
   *
   * Idempotente: cada UPDATE está acotado por `gamification_actor_ref IS
   * NULL` -- una segunda invocación para la MISMA cuenta ya pseudonimizada
   * no encuentra filas que igualen ese predicado y no hace nada.
   */
  async pseudonymizeImmediateSafeHistory(accountId: string): Promise<ImmediateSafePseudonymizationResult> {
    const secret = this.getGamificationSecret();
    const actorRef = gamificationActorRef(accountId, secret);

    const result = await this.transactionRunner.run(async (tx) => {
      const rewardGrantRewrites = await this.preflightRewardGrants(tx, accountId, actorRef, secret);

      const xpLedgerEntry = await tx.xpLedgerEntry.updateMany({
        where: { accountId, gamificationActorRef: null },
        data: { accountId: null, gamificationActorRef: actorRef },
      });

      const achievementProgress = await tx.achievementProgress.updateMany({
        where: { accountId, gamificationActorRef: null },
        data: { accountId: null, gamificationActorRef: actorRef },
      });

      const achievementUnlock = await tx.achievementUnlock.updateMany({
        where: { accountId, gamificationActorRef: null },
        data: { accountId: null, gamificationActorRef: actorRef },
      });

      const leaguePointLedgerEntry = await tx.leaguePointLedgerEntry.updateMany({
        where: { accountId, gamificationActorRef: null },
        data: { accountId: null, gamificationActorRef: actorRef },
      });

      let rewardGrant = 0;
      for (const rewrite of rewardGrantRewrites) {
        await tx.rewardGrant.update({
          where: { id: rewrite.id },
          data:
            rewrite.v2SourceEntityId
              ? {
                  accountId: null,
                  gamificationActorRef: actorRef,
                  sourceEntityId: rewrite.v2SourceEntityId,
                  idempotencyKey: rewrite.v2IdempotencyKey,
                }
              : { accountId: null, gamificationActorRef: actorRef },
        });
        rewardGrant++;
      }

      return {
        xpLedgerEntry: xpLedgerEntry.count,
        rewardGrant,
        achievementProgress: achievementProgress.count,
        achievementUnlock: achievementUnlock.count,
        leaguePointLedgerEntry: leaguePointLedgerEntry.count,
      };
    });

    this.logger.log(
      `Pseudonimización histórica inmediata-segura completada (transacción única) para 1 cuenta cerrada: ` +
        `XpLedgerEntry ${result.xpLedgerEntry}, RewardGrant ${result.rewardGrant}, ` +
        `AchievementProgress ${result.achievementProgress}, AchievementUnlock ${result.achievementUnlock}, ` +
        `LeaguePointLedgerEntry ${result.leaguePointLedgerEntry}.`,
    );

    return result;
  }

  /**
   * B3-R1 §1 -- preflight de TODOS los RewardGrant candidatos de la cuenta,
   * SOLO lecturas (dentro de la misma transacción `tx`, antes de cualquier
   * mutación de las cinco familias). Si CUALQUIER candidato legacy resulta
   * ambiguo (forma inesperada, o su destino v2 ya existe), lanza
   * `RewardGrantReconciliationRequiredError` -- ninguna fila se muta, la
   * transacción completa se revierte.
   *
   * Devuelve, para cada RewardGrant identificable sin ambigüedad, el plan
   * de reescritura exacto a aplicar (sin `v2SourceEntityId` para los que no
   * embebían accountId en su clave -- solo transición de identidad).
   */
  private async preflightRewardGrants(
    tx: Prisma.TransactionClient,
    accountId: string,
    actorRef: string,
    secret: string,
  ): Promise<Array<{ id: string; v2SourceEntityId?: string; v2IdempotencyKey?: string }>> {
    const identifiableGrants = await tx.rewardGrant.findMany({
      where: { accountId, gamificationActorRef: null },
      select: { id: true, sourceEntityType: true, sourceEntityId: true },
    });

    const collisions: RewardGrantCollisionDetail[] = [];
    const rewrites: Array<{ id: string; v2SourceEntityId?: string; v2IdempotencyKey?: string }> = [];

    for (const grant of identifiableGrants) {
      const isLegacyAccountEmbeddingSource = (grant.sourceEntityType === 'LEVEL' || grant.sourceEntityType === 'STUDY_SUBJECT') && !grant.sourceEntityId.startsWith('v2:');

      if (!isLegacyAccountEmbeddingSource) {
        // ACHIEVEMENT_UNLOCK/CHALLENGE_CLAIM/LEAGUE/STUDY_UNIT/SYSTEM_STARTER
        // (id opaco, nunca embebió accountId) o LEVEL/STUDY_SUBJECT ya v2 --
        // solo transición de identidad, ninguna clave que reescribir.
        rewrites.push({ id: grant.id });
        continue;
      }

      // Legacy `{accountId}:{businessKey}` -- accountId es un UUID (sin
      // ':'), así que dividir en el PRIMER ':' aísla el businessKey
      // completo de forma segura.
      const separatorIndex = grant.sourceEntityId.indexOf(':');
      const businessKey = separatorIndex >= 0 ? grant.sourceEntityId.slice(separatorIndex + 1) : grant.sourceEntityId;
      const legacyExpected = buildLegacyRewardSourceId(accountId, businessKey);
      if (legacyExpected !== grant.sourceEntityId) {
        collisions.push({
          rewardGrantId: grant.id,
          sourceEntityType: grant.sourceEntityType,
          legacySourceEntityId: grant.sourceEntityId,
          reason: 'MALFORMED_LEGACY_KEY',
        });
        continue;
      }

      const v2SourceEntityId = buildRewardSourceIdV2(accountId, secret, businessKey);
      const v2IdempotencyKey = `reward:${grant.sourceEntityType}:${v2SourceEntityId}`;

      const existingV2Target = await tx.rewardGrant.findUnique({ where: { idempotencyKey: v2IdempotencyKey } });
      if (existingV2Target) {
        collisions.push({
          rewardGrantId: grant.id,
          sourceEntityType: grant.sourceEntityType,
          legacySourceEntityId: grant.sourceEntityId,
          reason: 'V2_TARGET_ALREADY_EXISTS',
          expectedV2SourceEntityId: v2SourceEntityId,
          expectedV2IdempotencyKey: v2IdempotencyKey,
          collidingRewardGrantId: existingV2Target.id,
        });
        continue;
      }

      rewrites.push({ id: grant.id, v2SourceEntityId, v2IdempotencyKey });
    }

    if (collisions.length > 0) {
      this.logger.error(
        `RewardGrant requiere reconciliación manual (B5) para account ${accountId} -- B3 abortado, ninguna de las 5 familias fue mutada: ${JSON.stringify(collisions)}`,
      );
      throw new RewardGrantReconciliationRequiredError(accountId, collisions);
    }

    return rewrites;
  }

  // ==========================================================================
  // WEB-0D.1C-B4 -- MODELO A: ValidatedGamificationActivity
  // ==========================================================================

  /**
   * B4 §C -- pseudonimiza TODAS las `ValidatedGamificationActivity` de una
   * cuenta CLOSED, en su propia transacción (independiente de
   * `pseudonymizeImmediateSafeHistory`). Seguro para CUALQUIER fila de una
   * cuenta CLOSED (no requiere "drenado" XP/LP fila por fila) una vez
   * cerrado el punto ciego de `findPendingGrant` (ver ese archivo) --
   * `LeaguePointGrantService.findPendingLeagueGrant` ya era seguro por
   * construcción (filtra `accountId IN activeAccountIds`, una lista que
   * jamás contiene `NULL`), y `RewardEvaluationWorker` nunca lee
   * `accountId` de este modelo (ver reporte B4 §B).
   *
   * Mismo criterio de preflight-antes-de-mutar que RewardGrant (B3-R1 §1):
   * cualquier ambigüedad en la reescritura legacy->v2 aborta TODA la
   * operación para la cuenta, sin excepción, antes de tocar una sola fila.
   */
  async pseudonymizeDrainedValidatedActivity(accountId: string): Promise<{ validatedGamificationActivity: number }> {
    const secret = this.getGamificationSecret();
    const actorRef = gamificationActorRef(accountId, secret);

    const count = await this.transactionRunner.run(async (tx) => {
      const rewrites = await this.preflightValidatedActivities(tx, accountId, actorRef, secret);

      let updated = 0;
      for (const rewrite of rewrites) {
        await tx.validatedGamificationActivity.update({
          where: { id: rewrite.id },
          data: rewrite.v2DeduplicationKey
            ? { accountId: null, gamificationActorRef: actorRef, deduplicationKey: rewrite.v2DeduplicationKey }
            : { accountId: null, gamificationActorRef: actorRef },
        });
        updated++;
      }
      return updated;
    });

    this.logger.log(`B4: ValidatedGamificationActivity pseudonimizadas para 1 cuenta cerrada: ${count}.`);
    return { validatedGamificationActivity: count };
  }

  /**
   * B4 §D/§E -- preflight de TODOS los `ValidatedGamificationActivity`
   * candidatos, SOLO lecturas. Solo `TEMA_COMPLETADO`/`ENSAYO_COMPLETADO`/
   * `RECURSO_COMPLETADO` pueden tener una `deduplicationKey` legacy con
   * accountId embebido (ver `isLegacyEmbeddingActivityType`) -- el resto
   * (`RESPUESTA_VALIDADA`, `QUICK_QUESTION_ANSWERED`) NUNCA lo embebieron,
   * transición de identidad pura, sin reescritura de clave.
   */
  private async preflightValidatedActivities(
    tx: Prisma.TransactionClient,
    accountId: string,
    actorRef: string,
    secret: string,
  ): Promise<Array<{ id: string; v2DeduplicationKey?: string }>> {
    const candidates = await tx.validatedGamificationActivity.findMany({
      where: { accountId, gamificationActorRef: null },
      select: { id: true, activityType: true, deduplicationKey: true },
    });

    const collisions: ValidatedActivityCollisionDetail[] = [];
    const rewrites: Array<{ id: string; v2DeduplicationKey?: string }> = [];

    for (const activity of candidates) {
      if (!isLegacyEmbeddingActivityType(activity.activityType) || activity.deduplicationKey.includes(':v2:')) {
        // No embebía accountId, o ya está en forma v2 -- solo transición de identidad.
        rewrites.push({ id: activity.id });
        continue;
      }

      const expectedPrefix = activityLegacyKeyPrefix(activity.activityType, accountId);
      if (!activity.deduplicationKey.startsWith(expectedPrefix)) {
        collisions.push({
          activityId: activity.id,
          activityType: activity.activityType,
          legacyDeduplicationKey: activity.deduplicationKey,
          reason: 'MALFORMED_LEGACY_KEY',
        });
        continue;
      }

      const businessKey = activity.deduplicationKey.slice(expectedPrefix.length);
      const v2DeduplicationKey = buildActivityDedupKeyV2FromRow(activity.activityType, accountId, secret, businessKey);

      const existingV2Target = await tx.validatedGamificationActivity.findUnique({ where: { deduplicationKey: v2DeduplicationKey } });
      if (existingV2Target) {
        collisions.push({
          activityId: activity.id,
          activityType: activity.activityType,
          legacyDeduplicationKey: activity.deduplicationKey,
          reason: 'V2_TARGET_ALREADY_EXISTS',
          expectedV2DeduplicationKey: v2DeduplicationKey,
          collidingActivityId: existingV2Target.id,
        });
        continue;
      }

      rewrites.push({ id: activity.id, v2DeduplicationKey });
    }

    if (collisions.length > 0) {
      this.logger.error(
        `ValidatedGamificationActivity requiere reconciliación manual (B5) para account ${accountId} -- B4 abortado, ninguna fila fue mutada: ${JSON.stringify(collisions)}`,
      );
      throw new ValidatedActivityReconciliationRequiredError(accountId, collisions);
    }

    return rewrites;
  }

  // ==========================================================================
  // WEB-0D.1C-B4 -- MODELO B: SeasonLeagueParticipation
  // ==========================================================================

  /**
   * B4 §G/§J -- lado de CIERRE: pseudonimiza participaciones que YA eran
   * terminales (`PROMOTED`/`DEMOTED`/`RETAINED`) en el momento en que ESTA
   * cuenta se cierra definitivamente (temporada finalizada ANTES del
   * cierre). Su propia transacción, independiente de
   * `pseudonymizeImmediateSafeHistory`. Sin preflight de colisión: la
   * unicidad `(accountId, gameSeasonId)` YA existente garantiza que
   * `(gamificationActorRef, gameSeasonId)` nunca puede colisionar entre
   * cuentas distintas (actorRef es una función determinística e inyectiva
   * de accountId+secreto) -- ver reporte B4 §G.
   */
  async pseudonymizeTerminalSeasonParticipations(accountId: string): Promise<{ seasonLeagueParticipation: number }> {
    const secret = this.getGamificationSecret();
    const actorRef = gamificationActorRef(accountId, secret);

    const result = await this.transactionRunner.run(async (tx) => {
      return tx.seasonLeagueParticipation.updateMany({
        where: { accountId, gamificationActorRef: null, participationStatus: { in: [...TERMINAL_PARTICIPATION_STATUSES] } },
        data: { accountId: null, gamificationActorRef: actorRef },
      });
    });

    this.logger.log(`B4: SeasonLeagueParticipation terminales pseudonimizadas para 1 cuenta cerrada: ${result.count}.`);
    return { seasonLeagueParticipation: result.count };
  }

  /**
   * B4 §G/§J -- lado de FINALIZACIÓN: invocado por
   * `LeaderboardFinalizationService.finalizeGroup` DENTRO de su propia
   * transacción de cierre de grupo, justo después de fijar
   * `participationStatus` a su valor terminal -- cubre el caso inverso
   * (cuenta cerrada ANTES de que la temporada/grupo finalizara). Recibe el
   * `tx` del LLAMADOR (nunca abre una transacción propia) porque debe
   * compartir atomicidad con la escritura del resultado de la temporada:
   * si esto fallara y SÍ revirtiera la finalización completa, un problema
   * de privacidad bloquearía el producto para TODOS los participantes del
   * grupo -- por eso el LLAMADOR envuelve esta llamada en su propio
   * try/catch no-bloqueante (ver `LeaderboardFinalizationService`), nunca
   * al revés.
   *
   * Sin preflight de colisión (mismo argumento que `pseudonymizeTerminalSeasonParticipations`).
   * Si el secreto falta, no muta nada y lo señala vía `skippedSecretMissing`
   * -- el LLAMADOR decide cómo registrar eso sin bloquear la finalización.
   */
  async pseudonymizeParticipationsForClosedAccountsWithinTx(
    tx: Prisma.TransactionClient,
    participants: Array<{ seasonLeagueParticipationId: string; accountId: string }>,
  ): Promise<{ pseudonymized: number; skippedSecretMissing: boolean }> {
    if (participants.length === 0) return { pseudonymized: 0, skippedSecretMissing: false };

    let secret: string;
    try {
      secret = this.getGamificationSecret();
    } catch {
      return { pseudonymized: 0, skippedSecretMissing: true };
    }

    const accountIds = [...new Set(participants.map((p) => p.accountId))];
    const closedAccounts = await tx.account.findMany({ where: { id: { in: accountIds }, status: 'CLOSED' }, select: { id: true } });
    const closedSet = new Set(closedAccounts.map((a) => a.id));
    if (closedSet.size === 0) return { pseudonymized: 0, skippedSecretMissing: false };

    let pseudonymized = 0;
    for (const p of participants) {
      if (!closedSet.has(p.accountId)) continue;
      const actorRef = gamificationActorRef(p.accountId, secret);
      const result = await tx.seasonLeagueParticipation.updateMany({
        where: { id: p.seasonLeagueParticipationId, accountId: p.accountId, gamificationActorRef: null },
        data: { accountId: null, gamificationActorRef: actorRef },
      });
      pseudonymized += result.count;
    }

    return { pseudonymized, skippedSecretMissing: false };
  }

  // ==========================================================================
  // WEB-0D.1C-B4-R1 -- reconciliador DURABLE de participaciones terminales
  // pendientes de privacidad (red de seguridad para B4 §J: hook de cierre +
  // hook de finalización perdidos/fallidos transitoriamente).
  // ==========================================================================

  /**
   * B4-R1 §2-§9 -- procesa un lote acotado de cuentas CLOSED con
   * participaciones YA terminales cuyo `accountId` sigue crudo (el
   * predicado de descubrimiento ES el backlog durable -- B4-R1 §4, sin
   * tabla/columna nueva).
   *
   * Secuencia:
   *   1. resolver el secreto UNA sola vez para toda la corrida -- si falta,
   *      cero mutaciones, cero intentos, un solo log (nunca uno por fila) --
   *      B4-R1 §8;
   *   2. descubrir hasta `RECONCILER_BATCH_SIZE` cuentas candidatas
   *      (filtrado 100% en SQL, ver `findAccountIdsWithTerminalPendingPrivacy`);
   *   3. por cuenta, en su PROPIA transacción: releer `Account.status`
   *      FRESCO (TOCTOU real, B4-R1 §7) -- si ya no es CLOSED (no debería
   *      ocurrir nunca, CLOSED es terminal, pero se verifica de todos
   *      modos), no-op seguro; si sigue CLOSED, reutiliza el MISMO
   *      predicado idempotente (`gamificationActorRef: null` +
   *      `participationStatus` terminal) que `pseudonymizeTerminalSeasonParticipations`
   *      -- nunca duplica trabajo, nunca pseudonimiza una participación
   *      ACTIVE.
   *
   * Si el reconciliador está deshabilitado (B4-R1 §12), devuelve de
   * inmediato sin tocar la base de datos en absoluto.
   */
  async reconcileTerminalSeasonParticipations(limit: number = RECONCILER_BATCH_SIZE): Promise<{
    enabled: boolean;
    secretMissing: boolean;
    accountsDiscovered: number;
    accountsProcessed: number;
    participationsPseudonymized: number;
  }> {
    if (!this.isReconcilerEnabled()) {
      return { enabled: false, secretMissing: false, accountsDiscovered: 0, accountsProcessed: 0, participationsPseudonymized: 0 };
    }
    if (!this.participationRepo) {
      throw new Error('GamificationPrivacyService.reconcileTerminalSeasonParticipations requiere SeasonLeagueParticipationRepository -- no inyectado.');
    }

    let secret: string;
    try {
      secret = this.getGamificationSecret();
    } catch {
      this.logger.error('Reconciliador de privacidad de participaciones terminales: GAMIFICATION_ACTOR_SECRET ausente -- corrida completa NO-OP, cero mutaciones, candidatos siguen descubribles.');
      return { enabled: true, secretMissing: true, accountsDiscovered: 0, accountsProcessed: 0, participationsPseudonymized: 0 };
    }

    const accountIds = await this.participationRepo.findAccountIdsWithTerminalPendingPrivacy(limit);

    let accountsProcessed = 0;
    let participationsPseudonymized = 0;

    for (const accountId of accountIds) {
      const actorRef = gamificationActorRef(accountId, secret);

      const count = await this.transactionRunner.run(async (tx) => {
        // TOCTOU real (B4-R1 §7): releer Account.status DENTRO de la
        // transacción, no confiar solo en el descubrimiento. CLOSED es
        // terminal/sin reactivación en este esquema, así que esto nunca
        // debería fallar en la práctica -- pero se verifica explícitamente
        // de todos modos, nunca se asume.
        const account = await tx.account.findUnique({ where: { id: accountId }, select: { status: true } });
        if (account?.status !== 'CLOSED') return 0;

        const result = await tx.seasonLeagueParticipation.updateMany({
          where: { accountId, gamificationActorRef: null, participationStatus: { in: [...TERMINAL_PARTICIPATION_STATUSES] } },
          data: { accountId: null, gamificationActorRef: actorRef },
        });
        return result.count;
      });

      if (count > 0) {
        accountsProcessed++;
        participationsPseudonymized += count;
      }
    }

    if (participationsPseudonymized > 0) {
      this.logger.log(
        `Reconciliador de privacidad de participaciones terminales: ${accountsProcessed} cuenta(s), ${participationsPseudonymized} participación(es) pseudonimizada(s) de ${accountIds.length} candidata(s) descubierta(s).`,
      );
    }

    return {
      enabled: true,
      secretMissing: false,
      accountsDiscovered: accountIds.length,
      accountsProcessed,
      participationsPseudonymized,
    };
  }
}
