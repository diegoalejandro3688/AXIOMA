import { Body, Controller, HttpCode, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { InternalOpsGuard } from '../platform/internal-ops/internal-ops.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { BillingRetentionService } from './billing-retention.service';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1B (+ PB-1B-R1).
 *
 * Disparo MANUAL del barrido de retencion de facturacion -- solo internal-ops.
 * DOS handlers:
 *
 *   POST /internal/billing-retention/sweep        -- PRODUCTION-CAPABLE.
 *     Sin body. SIEMPRE resuelve la duracion de retencion desde
 *     `BILLING_RETENTION_DAYS_AFTER_TERMINAL` (env). Ninguna request puede
 *     acortar la retencion: si la env esta ausente -> NO-OP -> RETENER. Es el
 *     equivalente manual del `@Cron`.
 *
 *   POST /internal/billing-retention/_test/sweep  -- SOLO NO-PRODUCCION.
 *     `rejectInProduction()` -> 404 con `NODE_ENV=production`. Acepta
 *     `{ retentionDays }` para que los gates puedan ejercitar la ruta de purga
 *     sin depender de una env global (que rompería el gate "env ausente ->
 *     NO-OP" y contaminaría otros gates). En produccion este handler NO EXISTE.
 *
 * PB-1B-R1 §2: `NODE_ENV=production` + env ausente -> NINGUN endpoint puede
 * forzar la purga con `retentionDays`.
 */
const billingRetentionTestSweepRequestSchema = z
  .object({ retentionDays: z.number().int().min(0).optional() })
  .strict();

@Controller('internal/billing-retention')
export class BillingRetentionController {
  constructor(
    private readonly billingRetention: BillingRetentionService,
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
    return this.billingRetention.runRetentionSweep();
  }

  /** SOLO NO-PRODUCCION -- override de `retentionDays` para gates/ops locales. */
  @Post('_test/sweep')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async testSweep(@Body() body: unknown) {
    this.rejectInProduction();
    const { retentionDays } = parseRequestBody(billingRetentionTestSweepRequestSchema, body ?? {});
    return this.billingRetention.runRetentionSweep(new Date(), retentionDays);
  }
}
