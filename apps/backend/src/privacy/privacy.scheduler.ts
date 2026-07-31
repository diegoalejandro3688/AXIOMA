import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrivacyService } from './privacy.service';

/**
 * Ejecuta los barridos automáticamente. Los mismos métodos también se
 * pueden disparar manualmente vía POST /privacy/_internal/sweep -- el cron
 * no es el único camino, para poder operar y probar sin esperar al reloj.
 */
@Injectable()
export class PrivacyScheduler {
  private readonly logger = new Logger(PrivacyScheduler.name);

  constructor(private readonly privacyService: PrivacyService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleAccountDeletionSweep() {
    const { processed } = await this.privacyService.runAccountDeletionSweep();
    if (processed > 0) {
      this.logger.log(`Barrido de cierre definitivo: ${processed} cuenta(s) procesada(s)`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleSessionCleanupSweep() {
    const { deleted } = await this.privacyService.runSessionCleanupSweep();
    if (deleted > 0) {
      this.logger.log(`Barrido de sesiones vencidas: ${deleted} eliminada(s)`);
    }
  }
}
