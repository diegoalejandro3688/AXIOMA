import { Body, Controller, HttpCode, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { InternalOpsGuard } from '../../platform/internal-ops/internal-ops.guard';
import { parseRequestBody } from '../../platform/validation/parse-request-body';
import { RtdnRetentionService } from './rtdn-retention.service';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), RTDN-RET.
 *
 * Disparo MANUAL del barrido de retencion RTDN -- solo internal-ops, mismo
 * patron de dos handlers que `BillingRetentionController`:
 *
 *   POST /internal/rtdn-retention/sweep        -- PRODUCTION-CAPABLE.
 *     Sin body. SIEMPRE resuelve la duracion desde
 *     `GOOGLE_PLAY_RTDN_RETENTION_DAYS_AFTER_TERMINAL` (env). Ninguna request
 *     puede acortar la retencion: env ausente -> NO-OP -> RETENER.
 *
 *   POST /internal/rtdn-retention/_test/sweep  -- SOLO NO-PRODUCCION.
 *     `rejectInProduction()` -> 404 con `NODE_ENV=production`. Acepta
 *     `{ retentionDays }` para que los gates ejerciten la purga sin depender
 *     de una env global. En produccion este handler NO EXISTE.
 */
const rtdnRetentionTestSweepRequestSchema = z
  .object({ retentionDays: z.number().int().min(0).optional() })
  .strict();

@Controller('internal/rtdn-retention')
export class RtdnRetentionController {
  constructor(
    private readonly rtdnRetention: RtdnRetentionService,
    private readonly config: ConfigService,
  ) {}

  private rejectInProduction(): void {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
  }

  /** PRODUCTION-CAPABLE -- env only, nunca un override de duracion. */
  @Post('sweep')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async sweep() {
    return this.rtdnRetention.runRetentionSweep();
  }

  /** SOLO NO-PRODUCCION -- override de `retentionDays` para gates/ops locales. */
  @Post('_test/sweep')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async testSweep(@Body() body: unknown) {
    this.rejectInProduction();
    const { retentionDays } = parseRequestBody(rtdnRetentionTestSweepRequestSchema, body ?? {});
    return this.rtdnRetention.runRetentionSweep(new Date(), retentionDays);
  }
}
