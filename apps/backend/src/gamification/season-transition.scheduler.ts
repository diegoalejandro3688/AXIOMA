import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SeasonTransitionService } from './season-transition.service';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * Fronteras de temporada son de escala de días/semanas, no de minutos --
 * cron cada hora, a diferencia de los otorgamientos (`EVERY_MINUTE`). Ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.6.
 */
@Injectable()
export class SeasonTransitionScheduler {
  private readonly logger = new Logger(SeasonTransitionScheduler.name);

  constructor(private readonly seasonTransitionService: SeasonTransitionService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleTransition() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { closed } = await this.seasonTransitionService.closeExpiredSeasons();
      const { activated, skippedOverlap } = await this.seasonTransitionService.activateScheduledSeasons();
      if (closed > 0 || activated > 0 || skippedOverlap > 0) {
        this.logger.log(`Transición de temporadas: ${closed} cerrada(s), ${activated} activada(s), ${skippedOverlap} omitida(s) por solapamiento`);
      }
    });
  }
}
