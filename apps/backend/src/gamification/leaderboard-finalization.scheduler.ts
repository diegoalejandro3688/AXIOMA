import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaderboardFinalizationService } from './leaderboard-finalization.service';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * Cierra todo `league_group` `LOCKED` sin instantánea final todavía -- ver
 * docs/adr/0020-ranking-materializacion.md §7. Cadencia `EVERY_MINUTE`
 * (más frecuente que el recálculo de ranking): a diferencia de una pasada de
 * recálculo intermedio, el cierre es un evento único e importante para la
 * experiencia del estudiante (ascenso/descenso) -- conviene que ocurra
 * pronto después de que Incremento 1 bloquea el grupo, no esperar hasta el
 * siguiente ciclo de 15 minutos del ranking en vivo.
 */
@Injectable()
export class LeaderboardFinalizationScheduler {
  private readonly logger = new Logger(LeaderboardFinalizationScheduler.name);

  constructor(private readonly finalizationService: LeaderboardFinalizationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleFinalization() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { finalized, skipped, failed } = await this.finalizationService.finalizePendingGroups();
      if (finalized > 0 || failed > 0) {
        this.logger.log(`Finalización de ranking: ${finalized} grupo(s) cerrado(s), ${skipped} ya al día, ${failed} fallido(s)`);
      }
    });
  }
}
