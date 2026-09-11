import { Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { InternalOpsGuard } from '../internal-ops/internal-ops.guard';
import { generateCorrelationId, runWithCorrelationId } from '../observability/correlation-id.store';
import { OutboxLifecycleService } from './outbox-lifecycle.service';

/**
 * WEB-0D.1B-P0B2 -- disparo manual del ciclo de vida de privacidad de
 * `outbox_event` (minimización + retención), mismo criterio de riesgo/patrón
 * que `POST /analytics/_internal/relay`: permite operar y probar sin
 * esperar al `@Cron` diario.
 */
@Controller('outbox')
export class OutboxLifecycleController {
  private readonly logger = new Logger(OutboxLifecycleController.name);

  constructor(private readonly lifecycle: OutboxLifecycleService) {}

  @Post('_internal/minimization-sweep')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async runMinimizationSweep() {
    return runWithCorrelationId(generateCorrelationId(), async () => {
      this.logger.log('Iniciando barrido de minimización de OUTBOX');
      return this.lifecycle.minimizeTerminalEvents();
    });
  }

  @Post('_internal/retention-sweep')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async runRetentionSweep() {
    return runWithCorrelationId(generateCorrelationId(), async () => {
      this.logger.log('Iniciando barrido de retención de OUTBOX');
      return this.lifecycle.purgeExpiredTerminalEvents();
    });
  }
}
