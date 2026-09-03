import { Body, Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InternalOpsGuard } from '../../platform/internal-ops/internal-ops.guard';
import { RtdnIngestionService } from './rtdn-ingestion.service';
import { RtdnProcessingService } from './rtdn-processing.service';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * `POST /internal/google-play/rtdn` -- inbox del push autenticado de Google
 * Cloud Pub/Sub. NO usa `AuthGuard` (usuario) ni `InternalOpsGuard`: el
 * llamador es Pub/Sub y se autentica con un OIDC JWT que verifica
 * `RtdnIngestionService` (frontera propia). El controller NO muta entitlement
 * ni suscripciones -- solo delega la ingesta durable.
 *
 * `POST /internal/google-play/rtdn/_internal/process` -- disparo manual del
 * worker (mismo patron que `privacy/_internal/sweep`), protegido por
 * `InternalOpsGuard`. El `@Cron` lo corre solo en produccion.
 */
@Controller('internal/google-play/rtdn')
export class GooglePlayRtdnController {
  constructor(
    private readonly ingestion: RtdnIngestionService,
    private readonly processing: RtdnProcessingService,
  ) {}

  @Post()
  @HttpCode(200)
  // Pub/Sub puede entregar en rafagas y reintenta; limite generoso pero acotado
  // contra flooding no autenticado (que ademas se corta en la verificacion OIDC).
  @Throttle({ default: { limit: 240, ttl: 60_000 } })
  async receive(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<{ received: true; deduplicated: boolean }> {
    const { deduplicated } = await this.ingestion.ingest(authorization, body);
    return { received: true, deduplicated };
  }

  @Post('_internal/process')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async process(): Promise<{ processed: number; done: number; retryable: number; failed: number }> {
    return this.processing.processPending();
  }
}
