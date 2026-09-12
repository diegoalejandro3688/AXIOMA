import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GooglePlayRtdnEventRepository } from './google-play-rtdn-event.repository';

const BATCH_LIMIT = 200;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), RTDN-RET.
 *
 * Barrido de RETENCION del buzon `GooglePlayRtdnEvent` -- purga por fila,
 * gobernado por `GOOGLE_PLAY_RTDN_RETENTION_DAYS_AFTER_TERMINAL`. Mismo
 * patron/convencion que `BillingRetentionService` (ausencia/valor invalido de
 * la env -> NO-OP, direccion fail-safe = RETENER; nunca un default
 * destructivo) -- RTDN es parte del dominio de FACTURACION, no del dominio
 * generico de `AnalyticsEvent`/`OutboxEvent` (90 dias fijos en codigo), asi
 * que sigue la convencion de retencion de FACTURACION (env-configurable).
 *
 * Servicio SEPARADO de `BillingRetentionService` (no una extension): un bug
 * en la purga de RTDN nunca debe poder bloquear silenciosamente la purga de
 * `AccountSubscription`, y viceversa -- misma filosofia de aislamiento de
 * fallos que separa `AnalyticsScheduler`/`OutboxLifecycleScheduler`.
 *
 * Solo purga filas TERMINALES (`DONE`/`FAILED`/`IGNORED`) cuyo `processedAt`
 * ya cruzo la ventana de retencion -- ver
 * `GooglePlayRtdnEventRepository.findExpiredTerminalCandidateIds` para el
 * predicado exacto y por que `processedAt` cubre TODOS los desenlaces
 * terminales (no solo exito), sin necesitar una columna `terminalAt` nueva.
 *
 * Seguridad respecto a `BillingRetentionService.countLiveByPurchaseTokens`:
 * ese metodo cuenta unicamente `PENDING`/`PROCESSING`/`RETRYABLE` -- los
 * unicos estados "vivos" -- y este barrido NUNCA toca esos estados (el
 * predicado de purga es el conjunto TERMINAL, exactamente el complemento).
 * Purgar una fila terminal expirada por tanto jamas cambia el resultado de
 * `countLiveByPurchaseTokens` para ninguna `AccountSubscription` -- el
 * invariante de PB-1B (D) permanece intacto sin im portar el orden relativo
 * en el que corran ambos crons.
 *
 * Replay/dedup: un redelivery de Pub/Sub de un `messageId` cuya fila ya fue
 * purgada perderia la proteccion de dedup (`insertDeduped` ya no encontraria
 * la fila unica) y crearia una fila nueva -- pero `SubscriptionReconciliationService`
 * SIEMPRE re-consulta la verdad EN VIVO de Google (`provider.getSubscription`,
 * `subscriptionsv2.get`) y jamas deriva estado del payload/`notificationType`
 * de la notificacion; reprocesar una notificacion vieja simplemente dispara
 * una reconciliacion idempotente contra el estado ACTUAL de la suscripcion en
 * Google -- redundante pero inofensiva, nunca insegura.
 */
@Injectable()
export class RtdnRetentionService {
  private readonly logger = new Logger(RtdnRetentionService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly rtdnEvents: GooglePlayRtdnEventRepository,
  ) {}

  private isValidDays(value: number): boolean {
    return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
  }

  /** `null` = retencion DESHABILITADA -> el barrido es NO-OP (fail-safe: retener). */
  private resolveRetentionDays(overrideDays?: number): number | null {
    if (overrideDays !== undefined) {
      return this.isValidDays(overrideDays) ? overrideDays : null;
    }
    const raw = this.config.get<string>('GOOGLE_PLAY_RTDN_RETENTION_DAYS_AFTER_TERMINAL');
    if (raw === undefined || raw.trim() === '') return null;
    const days = Number(raw);
    if (!this.isValidDays(days)) {
      this.logger.warn(
        `GOOGLE_PLAY_RTDN_RETENTION_DAYS_AFTER_TERMINAL invalido ("${raw}") -- barrido de retencion RTDN NO-OP (fail-safe: retener)`,
      );
      return null;
    }
    return days;
  }

  /**
   * Purga por lotes, acotada e idempotente. Selecciona candidatos (TERMINAL +
   * `processedAt` expirado) y borra re-verificando el mismo predicado por
   * fila en el `deleteMany` (anti-TOCTOU) -- ninguna fila `PENDING`/
   * `PROCESSING`/`RETRYABLE` puede colarse jamas, sin importar carreras.
   */
  async runRetentionSweep(
    now: Date = new Date(),
    overrideRetentionDays?: number,
  ): Promise<{ enabled: boolean; purgedRows: number; scanned: number }> {
    const retentionDays = this.resolveRetentionDays(overrideRetentionDays);
    if (retentionDays === null) {
      return { enabled: false, purgedRows: 0, scanned: 0 };
    }
    const cutoff = new Date(now.getTime() - retentionDays * MS_PER_DAY);

    const candidateIds = await this.rtdnEvents.findExpiredTerminalCandidateIds(cutoff, BATCH_LIMIT);
    const purgedRows = await this.rtdnEvents.deleteExpiredTerminalByIds(candidateIds, cutoff);

    if (purgedRows > 0) {
      this.logger.log(`barrido de retencion RTDN: ${purgedRows} fila(s) purgada(s) (terminal + > ${retentionDays} dia(s)).`);
    }
    return { enabled: true, purgedRows, scanned: candidateIds.length };
  }
}
