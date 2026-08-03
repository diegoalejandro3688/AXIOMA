import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GamificationService } from './gamification.service';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * Relay automático outbox_event -> validated_gamification_activity, para el
 * consumidor GAMIFICATION. También invocable manualmente vía
 * POST /gamification/_internal/relay -- mismo patrón que AnalyticsScheduler
 * (ADR-0006) y PrivacyScheduler (ADR-0005). Corre de forma totalmente
 * independiente del relay de ANALYTICS -- ver ADR-0017.
 */
@Injectable()
export class GamificationScheduler {
  private readonly logger = new Logger(GamificationScheduler.name);

  constructor(private readonly gamificationService: GamificationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleRelay() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { processed, failed } = await this.gamificationService.ingestPending();
      if (processed > 0 || failed > 0) {
        this.logger.log(`Relay de GAMIFICATION: ${processed} procesado(s), ${failed} fallido(s)`);
      }
    });
  }
}
