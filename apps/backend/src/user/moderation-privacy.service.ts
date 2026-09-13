import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { moderationActorRef } from './moderation-actor-ref';
import { PublicProfileReportRepository } from './public-profile-report.repository';
import { AccountBlockRepository } from './account-block.repository';

export interface ModerationPseudonymizationResult {
  reportsAsReporter: number;
  reportsAsTarget: number;
  blocksAsBlocker: number;
  blocksAsBlocked: number;
}

/**
 * F1-A.4 -- pseudonimización de `PublicProfileReport` / `AccountBlock` al
 * cierre definitivo de cuenta (Opción B de F1-A.3). Dominio SEPARADO de
 * `GamificationPrivacyService` -- secreto propio (`MODERATION_ACTOR_SECRET`),
 * nunca `GAMIFICATION_ACTOR_SECRET`/`ANALYTICS_ACTOR_SECRET` -- ver
 * `moderation-actor-ref.ts`.
 *
 * A diferencia del reconciliador de gamificación (que trata el secreto
 * ausente como NO-OP tolerado para su barrido periódico independiente),
 * este método es parte del barrido de cierre SÍNCRONO de `PrivacyService`:
 * si el secreto falta, LANZA -- el cierre de cuenta no debe completarse con
 * historial de moderación reportando/bloqueando cuentas cerradas todavía
 * bajo su `accountId` directo. `PrivacyService.runAccountDeletionSweep` ya
 * deja la `PrivacyRequest` en PROCESSING para reintento ante cualquier
 * excepción de este paso -- mismo criterio que el resto del barrido.
 */
@Injectable()
export class ModerationPrivacyService {
  private readonly logger = new Logger(ModerationPrivacyService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly reportRepo: PublicProfileReportRepository,
    private readonly blockRepo: AccountBlockRepository,
  ) {}

  private getModerationSecret(): string {
    const secret = this.config.get<string>('MODERATION_ACTOR_SECRET');
    if (!secret) {
      throw new Error(
        'MODERATION_ACTOR_SECRET no está configurado -- no se puede pseudonimizar el historial de moderación al cerrar la cuenta.',
      );
    }
    return secret;
  }

  /**
   * Reemplaza todo identificador directo de `accountId` en `PublicProfileReport`
   * y `AccountBlock` por un pseudónimo estable con forma de UUID. Idempotente:
   * cada `updateMany` compara contra el `accountId` ORIGINAL, así que una
   * corrida repetida sobre filas ya pseudonimizadas afecta 0 filas sin
   * lanzar. No borra ninguna fila -- preserva el valor de seguridad
   * estructural retenido (patrones de reporte/bloqueo), solo remueve el
   * identificador directo de la cuenta cerrada.
   */
  async pseudonymizeForAccountClosure(accountId: string): Promise<ModerationPseudonymizationResult> {
    const secret = this.getModerationSecret();
    const ref = moderationActorRef(accountId, secret);

    const reportsAsReporter = await this.reportRepo.pseudonymizeReporter(accountId, ref);
    const reportsAsTarget = await this.reportRepo.pseudonymizeTarget(accountId, ref);
    const blocksAsBlocker = await this.blockRepo.pseudonymizeBlocker(accountId, ref);
    const blocksAsBlocked = await this.blockRepo.pseudonymizeBlocked(accountId, ref);

    const total = reportsAsReporter + reportsAsTarget + blocksAsBlocker + blocksAsBlocked;
    if (total > 0) {
      this.logger.log(
        `Moderación pseudonimizada para cuenta ${accountId}: ${reportsAsReporter} reporte(s) como reportante, ` +
          `${reportsAsTarget} reporte(s) como objetivo, ${blocksAsBlocker} bloqueo(s) como bloqueador, ` +
          `${blocksAsBlocked} bloqueo(s) como bloqueado.`,
      );
    }
    return { reportsAsReporter, reportsAsTarget, blocksAsBlocker, blocksAsBlocked };
  }
}
