import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';
import { GamificationPrivacyService } from './gamification-privacy.service';

/**
 * WEB-0D.1C-B4-R1 -- red de seguridad DURABLE para el hook de cierre
 * (`pseudonymizeTerminalSeasonParticipations`) y el hook de finalización
 * (`pseudonymizeParticipationsForClosedAccountsWithinTx`, ver
 * `LeaderboardFinalizationService`) cuando cualquiera de los dos falla de
 * forma transitoria (secreto ausente en ese instante, error de conexión,
 * etc.) -- ver el reporte de B4-R1 §A/§J. El propio servicio
 * (`GamificationPrivacyService.reconcileTerminalSeasonParticipations`) es
 * NO-OP mientras `GAMIFICATION_PRIVACY_RECONCILER_ENABLED` no sea
 * exactamente `'true'` (mismo patrón fail-safe que
 * `BillingRetentionService`/`BillingRetentionScheduler`) -- este cron es
 * seguro de tener siempre activo, no muta nada hasta que un operador lo
 * habilite explícitamente DESPUÉS de establecer la línea base pre-B4 (ver
 * B4-R1 §12).
 *
 * Cadencia `EVERY_HOUR` -- mismo criterio que `SeasonTransitionScheduler`
 * ("ciclo de seguridad"): la condición que este cron reconcilia solo
 * cambia en tres eventos poco frecuentes (cierre de cuenta, finalización de
 * temporada/grupo, una reconciliación exitosa previa), así que una cadencia
 * agresiva (cada minuto, como los workers de otorgamiento) no aporta nada
 * y solo generaría carga innecesaria -- B4-R1 §5 explícito ("no programar
 * agresivamente").
 */
@Injectable()
export class GamificationPrivacyReconciliationScheduler {
  private readonly logger = new Logger(GamificationPrivacyReconciliationScheduler.name);

  constructor(private readonly privacyService: GamificationPrivacyService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleReconciliation(): Promise<void> {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const result = await this.privacyService.reconcileTerminalSeasonParticipations();
      if (result.secretMissing) {
        this.logger.error('Reconciliación de privacidad de participaciones terminales: GAMIFICATION_ACTOR_SECRET ausente -- corrida NO-OP, candidatos siguen pendientes para el próximo ciclo.');
        return;
      }
      if (result.enabled && result.participationsPseudonymized > 0) {
        this.logger.log(
          `Reconciliación de privacidad de participaciones terminales: ${result.accountsProcessed} cuenta(s), ${result.participationsPseudonymized} participación(es) pseudonimizada(s).`,
        );
      }
    });
  }
}
