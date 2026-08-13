import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrivacyService } from './privacy.service';
import { generateCorrelationId, runWithCorrelationId } from '../platform/observability/correlation-id.store';

/**
 * Ejecuta los barridos automáticamente. Los mismos métodos también se
 * pueden disparar manualmente vía POST /privacy/_internal/sweep -- el cron
 * no es el único camino, para poder operar y probar sin esperar al reloj.
 *
 * Cada disparo por cron corre en su propio contexto de correlación (ver
 * ADR-0007) -- un `correlationId` nuevo y distinto por ejecución, generado
 * aquí, no reutilizado entre corridas. El disparo manual vía HTTP ya tiene
 * el suyo propio (asignado por el middleware de la request), así que no se
 * genera uno adicional en ese camino.
 */
@Injectable()
export class PrivacyScheduler {
  private readonly logger = new Logger(PrivacyScheduler.name);

  constructor(private readonly privacyService: PrivacyService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleAccountDeletionSweep() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { processed } = await this.privacyService.runAccountDeletionSweep();
      if (processed > 0) {
        this.logger.log(`Barrido de cierre definitivo: ${processed} cuenta(s) procesada(s)`);
      }
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleSessionCleanupSweep() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const { deleted } = await this.privacyService.runSessionCleanupSweep();
      if (deleted > 0) {
        this.logger.log(`Barrido de sesiones vencidas: ${deleted} eliminada(s)`);
      }
    });
  }

  /** LEF Bloque VI, Incremento 7 -- retención/purga del Tutor IA (conversaciones, usage ledger, reservas de generación). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleAiRetentionSweep() {
    await runWithCorrelationId(generateCorrelationId(), async () => {
      const result = await this.privacyService.runAiRetentionSweep();
      if (result.conversations.purged > 0 || result.conversations.failed > 0 || result.ledgerEntries.deleted > 0 || result.claims.deleted > 0) {
        this.logger.log(
          `Barrido de retención del Tutor IA: ${result.conversations.purged} conversación(es) purgada(s) (${result.conversations.failed} fallo(s)), ${result.ledgerEntries.deleted} fila(s) de ledger eliminada(s), ${result.claims.deleted} reserva(s) huérfana(s) eliminada(s)`,
        );
      }
    });
  }
}
