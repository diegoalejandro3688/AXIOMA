import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { GameSeasonRepository } from './game-season.repository';
import { LeagueGroupRepository } from './league-group.repository';
import { LeaderboardCalculationService } from './leaderboard-calculation.service';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * Recalcula `leaderboard_entry` para todo `league_group` OPEN/FULL de la
 * temporada ACTIVE -- ver docs/adr/0020-ranking-materializacion.md §6.
 * Cadencia deliberadamente más espaciada que el otorgamiento de LP
 * (`EVERY_MINUTE`): el corpus fuente autoriza y exige comunicar staleness
 * ("Un ranking temporalmente desactualizado deberá indicarlo", CUJ-16) en
 * vez de exigir tiempo real. Sin recálculo bajo demanda del cliente -- este
 * scheduler es el ÚNICO disparador (ADR-0020, alternativa descartada).
 */
@Injectable()
export class LeaderboardCalculationScheduler {
  private readonly logger = new Logger(LeaderboardCalculationScheduler.name);

  constructor(
    private readonly txRunner: TransactionRunnerService,
    private readonly seasonRepo: GameSeasonRepository,
    private readonly groupRepo: LeagueGroupRepository,
    private readonly calculationService: LeaderboardCalculationService,
  ) {}

  @Cron('0 */15 * * * *')
  async handleCalculation() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const season = await this.seasonRepo.findActive();
      if (!season) return;

      const definition = await this.calculationService.ensureLeaderboardDefinition();
      const groups = await this.groupRepo.findOpenOrFullForSeason(season.id);

      let recalculated = 0;
      let failed = 0;

      // Aislamiento de fallo por grupo (mismo criterio que RewardEvaluationWorker) --
      // un error en un grupo nunca bloquea a los demás.
      for (const group of groups) {
        try {
          await this.txRunner.run(async (tx) => {
            await this.calculationService.recalculateGroup(tx, definition.id, season.id, group.id);
          });
          recalculated++;
        } catch (error) {
          failed++;
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`No se pudo recalcular el ranking del grupo ${group.id}: ${message}`);
        }
      }

      if (recalculated > 0 || failed > 0) {
        this.logger.log(`Recálculo de ranking: ${recalculated} grupo(s) actualizado(s), ${failed} fallido(s)`);
      }
    });
  }
}
