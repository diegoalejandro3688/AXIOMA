import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { XpGrantService } from './xp-grant.service';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * Convierte validated_gamification_activity pendiente en xp_ledger_entry.
 * También invocable manualmente vía POST /gamification/_internal/grant-xp
 * -- mismo patrón que GamificationScheduler/AnalyticsScheduler. Corre
 * independientemente del relay de ingesta (GamificationScheduler).
 */
@Injectable()
export class XpGrantScheduler {
  private readonly logger = new Logger(XpGrantScheduler.name);

  constructor(private readonly xpGrantService: XpGrantService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleGrant() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { granted, capped, noRule, failed } = await this.xpGrantService.grantPending();
      if (granted > 0 || capped > 0 || noRule > 0 || failed > 0) {
        this.logger.log(
          `Otorgamiento de XP: ${granted} otorgado(s), ${capped} con tope diario alcanzado, ${noRule} sin regla activa, ${failed} fallido(s)`,
        );
      }
    });
  }
}
