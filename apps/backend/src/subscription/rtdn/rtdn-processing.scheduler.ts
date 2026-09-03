import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateCorrelationId, runWithCorrelationId } from '../../platform/observability/correlation-id.store';
import { RtdnProcessingService } from './rtdn-processing.service';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * Dispara el worker del buzon de RTDN cada minuto -- el ciclo de vida de una
 * suscripcion es de escala de minutos/horas (renovacion, grace, hold), y los
 * eventos accionables deben reconciliarse con Google poco despues de llegar.
 * El claim atomico del repositorio evita el doble procesamiento si una pasada
 * se solapa con la siguiente. Disparo manual: `POST
 * /internal/google-play/rtdn/_internal/process` (`InternalOpsGuard`).
 */
@Injectable()
export class RtdnProcessingScheduler {
  private readonly logger = new Logger(RtdnProcessingScheduler.name);

  constructor(private readonly processing: RtdnProcessingService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handle(): Promise<void> {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      try {
        await this.processing.processPending();
      } catch (error) {
        this.logger.error('fallo la pasada del worker de RTDN', error instanceof Error ? error.stack : undefined);
      }
    });
  }
}
