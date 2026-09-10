import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';
import { BillingRetentionService } from './billing-retention.service';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1B.
 *
 * Dispara el barrido de retencion de facturacion (`BillingRetentionService`)
 * una vez al dia. El servicio es NO-OP mientras `BILLING_RETENTION_DAYS_AFTER_TERMINAL`
 * este ausente/invalida (direccion fail-safe: retener), asi que este cron es
 * seguro de tener siempre activo -- no borra nada hasta que exista una politica
 * de retencion configurada. Mismo patron de contexto de correlacion que
 * `PrivacyScheduler` (un `correlationId` nuevo por corrida).
 */
@Injectable()
export class BillingRetentionScheduler {
  private readonly logger = new Logger(BillingRetentionScheduler.name);

  constructor(private readonly billingRetention: BillingRetentionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleBillingRetentionSweep(): Promise<void> {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const result = await this.billingRetention.runRetentionSweep();
      if (result.enabled && result.purgedRows > 0) {
        this.logger.log(`Barrido de retencion de facturacion: ${result.purgedRows} fila(s) purgada(s)`);
      }
    });
  }
}
