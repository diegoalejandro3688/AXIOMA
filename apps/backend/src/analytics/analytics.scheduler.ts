import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';

/**
 * Relay automático outbox_event -> analytics_event. También invocable
 * manualmente vía POST /analytics/_internal/relay -- mismo patrón que
 * PrivacyScheduler (ADR-0005): el cron no es el único camino, para poder
 * operar y probar sin esperar al reloj.
 */
@Injectable()
export class AnalyticsScheduler {
  private readonly logger = new Logger(AnalyticsScheduler.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleRelay() {
    const { processed, failed } = await this.analyticsService.ingestPending();
    if (processed > 0 || failed > 0) {
      this.logger.log(`Relay de Analytics: ${processed} procesado(s), ${failed} fallido(s)`);
    }
  }
}
