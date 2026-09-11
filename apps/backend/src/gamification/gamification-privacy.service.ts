import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { gamificationActorRef } from './gamification-actor-ref';
import { buildLegacyRewardSourceId, buildRewardSourceIdV2 } from './gamification-key';

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

/**
 * WEB-0D.1C-B3 (+ B3-R1) -- pseudonimización histórica INMEDIATA-SEGURA en
 * el cierre DEFINITIVO de cuenta. Alcance EXACTO, ver el reporte de B3 §B/§C
 * para la clasificación completa de los 7 modelos de B1:
 *
 *   IMMEDIATE_SAFE (este servicio los toca, en UNA sola transacción --
 *   B3-R1 §2): XpLedgerEntry, RewardGrant, AchievementProgress,
 *   AchievementUnlock, LeaguePointLedgerEntry.
 *
 *   DEFER_TO_B4 (este servicio NUNCA los toca): ValidatedGamificationActivity,
 *   SeasonLeagueParticipation -- ver el reporte de B3 §B/§C.
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
  ) {}

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
}
