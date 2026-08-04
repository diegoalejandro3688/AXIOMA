import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RewardEvaluationWorker } from './reward-evaluation.worker';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * Dispara `RewardEvaluationWorker.run()` periódicamente -- también
 * invocable manualmente vía POST /gamification/_internal/evaluate-rewards
 * (mismo patrón que XpGrantScheduler/GamificationScheduler, ADR-0019 §1).
 */
@Injectable()
export class RewardEvaluationScheduler {
  private readonly logger = new Logger(RewardEvaluationScheduler.name);

  constructor(private readonly worker: RewardEvaluationWorker) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEvaluate() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { processed, skippedLocked, failed } = await this.worker.run();
      if (processed > 0 || skippedLocked > 0 || failed > 0) {
        this.logger.log(`Evaluación de recompensas: ${processed} procesada(s), ${skippedLocked} omitida(s) por bloqueo, ${failed} fallida(s)`);
      }
    });
  }
}
