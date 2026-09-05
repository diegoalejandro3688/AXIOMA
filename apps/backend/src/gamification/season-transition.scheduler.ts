import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SeasonOrchestrationService } from './season-orchestration.service';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * PF2-B -- orquestación de temporadas semanales. Fronteras de temporada son
 * de escala de días/semanas, no de minutos -- cron cada hora, a diferencia de
 * los otorgamientos (`EVERY_MINUTE`). Ver docs/adr/LEF-BLOCK-IV-DEFINITION.md
 * §9.6 y PF2-B.
 *
 * El MISMO ciclo (`SeasonOrchestrationService.runCycle`) se dispara desde:
 *   - `onApplicationBootstrap` -- catch-up INMEDIATO tras un reinicio tardío
 *     (no espera al próximo tick horario si se perdió la frontera exacta)
 *   - `@Cron(EVERY_HOUR)` -- ciclo de seguridad; un ciclo sano a mitad de
 *     semana no hace nada
 *
 * Decisiones (provisión / cierre / finalización / activación / rollover) son
 * todas por reloj de pared -- ninguna depende de "haber corrido en el tick
 * exacto". Idempotente y multi-instancia (cada paso reutiliza sus garantías
 * de unicidad / advisory lock / idempotencia de recompensa ya existentes).
 */
@Injectable()
export class SeasonTransitionScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeasonTransitionScheduler.name);

  constructor(private readonly orchestrationService: SeasonOrchestrationService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.runOnce('bootstrap');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyCycle(): Promise<void> {
    await this.runOnce('cron:hourly');
  }

  private async runOnce(trigger: string): Promise<void> {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      try {
        await this.orchestrationService.runCycle(new Date());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Un fallo del ciclo (p.ej. un conflicto de ventana legacy que
        // borbotea) NO debe tumbar el proceso -- se registra con severidad y
        // el próximo ciclo (bootstrap del siguiente reinicio o el cron
        // horario) reintenta desde el estado real.
        this.logger.error(`Ciclo de orquestación (${trigger}) falló: ${message}`);
      }
    });
  }
}
