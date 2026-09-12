import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateCorrelationId, runWithCorrelationId } from '../../platform/observability/correlation-id.store';
import { RtdnRetentionService } from './rtdn-retention.service';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), RTDN-RET.
 *
 * Dispara el barrido de retencion del buzon RTDN
 * (`RtdnRetentionService`) una vez al dia. NO-OP mientras
 * `GOOGLE_PLAY_RTDN_RETENTION_DAYS_AFTER_TERMINAL` este ausente/invalida
 * (fail-safe: retener) -- seguro de tener siempre activo. `EVERY_DAY_AT_4AM`
 * (no `3AM`, mismo slot que `BillingRetentionScheduler`/`AnalyticsScheduler`/
 * `OutboxLifecycleScheduler`): sin dependencia de orden entre estos barridos
 * (`countLiveByPurchaseTokens` solo mira estados PENDING/PROCESSING/RETRYABLE,
 * nunca los TERMINALES que este barrido purga), pero se separa el slot para
 * no apilar cuatro barridos de borrado en el mismo instante exacto.
 */
@Injectable()
export class RtdnRetentionScheduler {
  private readonly logger = new Logger(RtdnRetentionScheduler.name);

  constructor(private readonly rtdnRetention: RtdnRetentionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleRtdnRetentionSweep(): Promise<void> {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const result = await this.rtdnRetention.runRetentionSweep();
      if (result.enabled && result.purgedRows > 0) {
        this.logger.log(`Barrido de retencion RTDN: ${result.purgedRows} fila(s) purgada(s)`);
      }
    });
  }
}
