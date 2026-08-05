import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaguePointGrantService } from './league-point-grant.service';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * Convierte validated_gamification_activity pendiente en
 * league_point_ledger_entry -- INDEPENDIENTE de `XpGrantScheduler` (§9.7):
 * un fallo aquí nunca bloquea ni retrasa el otorgamiento de XP, y viceversa.
 */
@Injectable()
export class LeaguePointGrantScheduler {
  private readonly logger = new Logger(LeaguePointGrantScheduler.name);

  constructor(private readonly leaguePointGrantService: LeaguePointGrantService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleGrant() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { granted, skipped, failed } = await this.leaguePointGrantService.grantPending();
      if (granted > 0 || skipped > 0 || failed > 0) {
        this.logger.log(`Otorgamiento de League Points: ${granted} otorgado(s), ${skipped} omitido(s) (no aplica), ${failed} fallido(s)`);
      }
    });
  }
}
