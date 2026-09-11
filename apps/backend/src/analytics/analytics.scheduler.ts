import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * Relay automático outbox_event -> analytics_event. También invocable
 * manualmente vía POST /analytics/_internal/relay -- mismo patrón que
 * PrivacyScheduler (ADR-0005): el cron no es el único camino, para poder
 * operar y probar sin esperar al reloj.
 *
 * Cada disparo por cron corre en su propio contexto de correlación (ver
 * ADR-0007) -- un `correlationId` nuevo y distinto por ejecución.
 */
@Injectable()
export class AnalyticsScheduler {
  private readonly logger = new Logger(AnalyticsScheduler.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleRelay() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { processed, failed } = await this.analyticsService.ingestPending();
      if (processed > 0 || failed > 0) {
        this.logger.log(`Relay de Analytics: ${processed} procesado(s), ${failed} fallido(s)`);
      }
    });
  }

  /**
   * WEB-0D.1B-P0B1B -- barrido de retención (90 días congelados para V1),
   * también invocable manualmente vía POST /analytics/_internal/retention-sweep
   * -- mismo criterio que el relay. Cadencia diaria, igual que
   * `PrivacyScheduler`/`BillingRetentionScheduler` (mantenimiento de
   * borrado, no un flujo de ingesta en tiempo real como el relay).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRetentionSweep() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { deletedRows } = await this.analyticsService.purgeExpired();
      if (deletedRows > 0) {
        this.logger.log(`Retención de Analytics: ${deletedRows} fila(s) purgada(s) (> 90 días)`);
      }
    });
  }
}
