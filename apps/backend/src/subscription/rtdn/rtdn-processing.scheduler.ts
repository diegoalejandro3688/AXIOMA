import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateCorrelationId, runWithCorrelationId } from '../../platform/observability/correlation-id.store';
import { RtdnProcessingService } from './rtdn-processing.service';

/**
 * RC1B.1 -- token DI: `true` sii el worker del buzon RTDN debe correr. Con
 * `GOOGLE_PLAY_RTDN_AUTH_IMPL=disabled` (postura CONGELADA) es `false` y el
 * `@Cron` no hace ningun trabajo (ni claim de fila, ni reconciliacion con
 * Google). Lo provee `SubscriptionModule` via `rtdnProcessingEnabled`.
 */
export const RTDN_PROCESSING_ENABLED = Symbol('RTDN_PROCESSING_ENABLED');

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

  constructor(
    private readonly processing: RtdnProcessingService,
    @Inject(RTDN_PROCESSING_ENABLED) private readonly enabled: boolean,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handle(): Promise<void> {
    // RC1B.1 -- postura CONGELADA: no hay push que ingresar ni suscripcion que
    // reconciliar. Salir sin tocar la BD ni Google.
    if (!this.enabled) return;
    await runWithCorrelationId(generateCorrelationId(), async () => {
      try {
        await this.processing.processPending();
      } catch (error) {
        this.logger.error('fallo la pasada del worker de RTDN', error instanceof Error ? error.stack : undefined);
      }
    });
  }
}
