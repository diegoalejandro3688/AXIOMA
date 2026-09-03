import { BadRequestException, ConflictException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { GooglePlayRtdnEvent } from '../../generated/prisma/client';
import {
  SubscriptionNotAttributableError,
  SubscriptionReconciliationService,
} from '../subscription-reconciliation.service';
import { GooglePlayRtdnEventRepository } from './google-play-rtdn-event.repository';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * WORKER del buzon de RTDN. Reclama filas `PENDING`/`RETRYABLE` con un claim
 * atomico y las procesa reusando la reconciliacion C3.2
 * (`reconcileFromNotification`) -- NO hay segundo mapper ni segunda ruta de
 * persistencia.
 *
 * Clasificacion de errores (task §16):
 *   - RETRYABLE: Google 5xx/red, ack transitorio, aun no atribuible.
 *   - PERMANENTE (FAILED): package/token invalido confirmado por Google,
 *     mismatch de cuenta irreconciliable, evento estructuralmente invalido.
 *   - los RETRYABLE se agotan a los `MAX_ATTEMPTS` intentos -> FAILED (no loop).
 */
const MAX_ATTEMPTS = 24;
const BATCH_PER_RUN = 50;

@Injectable()
export class RtdnProcessingService {
  private readonly logger = new Logger(RtdnProcessingService.name);

  constructor(
    private readonly events: GooglePlayRtdnEventRepository,
    private readonly reconciliation: SubscriptionReconciliationService,
  ) {}

  /** Procesa hasta `BATCH_PER_RUN` eventos pendientes. Devuelve el conteo por resultado. */
  async processPending(): Promise<{ processed: number; done: number; retryable: number; failed: number }> {
    const tally = { processed: 0, done: 0, retryable: 0, failed: 0 };
    const handled: string[] = [];
    for (let i = 0; i < BATCH_PER_RUN; i++) {
      const event = await this.events.claimNext(handled);
      if (!event) break;
      handled.push(event.id);
      tally.processed++;
      const outcome = await this.processOne(event);
      tally[outcome]++;
    }
    if (tally.processed > 0) {
      this.logger.log(`RTDN worker: ${tally.processed} procesados (done=${tally.done} retryable=${tally.retryable} failed=${tally.failed})`);
    }
    return tally;
  }

  private async processOne(event: GooglePlayRtdnEvent): Promise<'done' | 'retryable' | 'failed'> {
    if (event.notificationKind !== 'subscription') {
      await this.events.markDone(event.id);
      return 'done';
    }
    if (!event.purchaseToken) {
      await this.events.markFailed(event.id, 'no_purchase_token', 'evento de suscripcion sin purchaseToken');
      return 'failed';
    }

    try {
      await this.reconciliation.reconcileFromNotification({
        purchaseToken: event.purchaseToken,
        providerEventTime: event.eventTime,
        notificationType: event.notificationType,
      });
      await this.events.markDone(event.id);
      return 'done';
    } catch (error) {
      return this.classifyFailure(event, error);
    }
  }

  private async classifyFailure(event: GooglePlayRtdnEvent, error: unknown): Promise<'retryable' | 'failed'> {
    const permanent =
      error instanceof BadRequestException || error instanceof ConflictException;
    const retryable =
      error instanceof ServiceUnavailableException || error instanceof SubscriptionNotAttributableError;

    const code = permanent
      ? error instanceof ConflictException
        ? 'account_mismatch'
        : 'provider_rejected'
      : error instanceof SubscriptionNotAttributableError
        ? 'not_attributable'
        : 'transient';
    const message = error instanceof Error ? error.message : 'desconocido';

    if (permanent) {
      this.logger.warn(`RTDN evento ${event.id} -> FAILED permanente (${code})`);
      await this.events.markFailed(event.id, code, message);
      return 'failed';
    }
    if (event.attempts >= MAX_ATTEMPTS) {
      this.logger.warn(`RTDN evento ${event.id} agoto ${MAX_ATTEMPTS} intentos (${code}) -> FAILED`);
      await this.events.markFailed(event.id, `${code}_exhausted`, message);
      return 'failed';
    }
    if (!retryable) {
      // Error inesperado -- se trata como transitorio acotado (no se pierde,
      // no se hace loop infinito).
      this.logger.error(`RTDN evento ${event.id} error inesperado -> RETRYABLE`, error instanceof Error ? error.stack : undefined);
    }
    await this.events.markRetryable(event.id, code, message);
    return 'retryable';
  }
}
