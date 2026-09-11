import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxLifecycleService } from './outbox-lifecycle.service';
import { generateCorrelationId, runWithCorrelationId } from '../observability/correlation-id.store';

/**
 * WEB-0D.1B-P0B2 -- barrido diario de ciclo de vida de privacidad de
 * `outbox_event`: minimizar filas terminales y purgar las que ya cruzaron
 * los 90 días congelados. Cadencia diaria -- mismo criterio que
 * `PrivacyScheduler`/`BillingRetentionScheduler`/`AnalyticsScheduler`
 * (barrido de mantenimiento/borrado, no un flujo de ingesta en tiempo real
 * como los relays de ANALYTICS/GAMIFICATION, que siguen en EVERY_MINUTE sin
 * cambios). Minimiza ANTES de purgar en la misma corrida -- una fila recién
 * vuelta terminal se minimiza de inmediato, sin esperar otro día completo.
 */
@Injectable()
export class OutboxLifecycleScheduler {
  private readonly logger = new Logger(OutboxLifecycleScheduler.name);

  constructor(private readonly lifecycle: OutboxLifecycleService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleLifecycleSweep(): Promise<void> {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const minimization = await this.lifecycle.minimizeTerminalEvents();
      if (minimization.minimized > 0) {
        this.logger.log(`Minimización de Outbox: ${minimization.minimized}/${minimization.scanned} fila(s) minimizada(s)`);
      }
      const retention = await this.lifecycle.purgeExpiredTerminalEvents();
      if (retention.deleted > 0) {
        this.logger.log(`Retención de Outbox: ${retention.deleted}/${retention.scanned} fila(s) purgada(s) (> 90 días terminal)`);
      }
    });
  }
}
