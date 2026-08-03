import { Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { InternalOpsGuard } from '../platform/internal-ops/internal-ops.guard';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';
import { GamificationService } from './gamification.service';

@Controller('gamification')
export class GamificationController {
  private readonly logger = new Logger(GamificationController.name);

  constructor(private readonly gamificationService: GamificationService) {}

  /**
   * Disparo manual del relay (outbox_event -> validated_gamification_activity).
   * Mismo criterio que POST /analytics/_internal/relay (ADR-0006): permite
   * operar y probar sin esperar al cron.
   */
  @Post('_internal/relay')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async runRelay() {
    return runWithCorrelationId(generateCorrelationId(), async () => {
      this.logger.log('Iniciando relay de GAMIFICATION');
      return this.gamificationService.ingestPending();
    });
  }
}
