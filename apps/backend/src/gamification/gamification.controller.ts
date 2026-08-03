import { Body, Controller, HttpCode, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { InternalOpsGuard } from '../platform/internal-ops/internal-ops.guard';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';
import { GamificationService } from './gamification.service';
import { XpGrantService } from './xp-grant.service';

@Controller('gamification')
export class GamificationController {
  private readonly logger = new Logger(GamificationController.name);

  constructor(
    private readonly gamificationService: GamificationService,
    private readonly xpGrantService: XpGrantService,
  ) {}

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

  /** Disparo manual del otorgamiento (validated_gamification_activity -> xp_ledger_entry). */
  @Post('_internal/grant-xp')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async runGrant() {
    return runWithCorrelationId(generateCorrelationId(), async () => {
      this.logger.log('Iniciando otorgamiento de XP');
      return this.xpGrantService.grantPending();
    });
  }

  /** Corrección mediante entrada compensatoria -- infraestructura interna, sin UI (fuera de alcance). */
  @Post('_internal/xp-ledger-entries/:entryId/reverse')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async reverseEntry(@Param('entryId') entryId: string, @Body('reasonCode') reasonCode: string) {
    return runWithCorrelationId(generateCorrelationId(), async () => {
      return this.xpGrantService.reverseEntry(entryId, reasonCode);
    });
  }

  /** Mecanismo formal de recuperación: recalcula xp_balance desde xp_ledger_entry. */
  @Post('_internal/accounts/:accountId/reconcile-balance')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async reconcileBalance(@Param('accountId') accountId: string) {
    return runWithCorrelationId(generateCorrelationId(), async () => {
      return this.xpGrantService.reconcileBalance(accountId);
    });
  }
}
