import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountSubscriptionRepository } from '../entitlement/subscription/account-subscription.repository';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { GooglePlayRtdnEventRepository } from './rtdn/google-play-rtdn-event.repository';

const BATCH_LIMIT = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1B (+ PB-1B-R1).
 *
 * Barrido de RETENCION de facturacion para cuentas CERRADAS -- PURGA POR FILA,
 * gobernada por `BILLING_RETENTION_DAYS_AFTER_TERMINAL`.
 *
 * Borra una `AccountSubscription` SOLO cuando TODO se cumple:
 *   (A) `account.status = CLOSED`;
 *   (B) `state` terminal (EXPIRED/REVOKED/SUPERSEDED);
 *   (C) `expiryTime` nulo o pasado;
 *   (D) cero trabajo RTDN vivo (PENDING/PROCESSING/RETRYABLE) para NINGUN token
 *       de la linea (purchaseToken + linkedPurchaseToken + resubscribedFrom) --
 *       cubre tambien "reconciliacion en cola" (el buzon RTDN es el unico
 *       disparador asincrono);
 *   (F) el reloj de retencion legal ya vencio.
 *
 * PB-1B-R1: este barrido NO limpia `Account.obfuscatedAccountId`. La ref opaca
 * se CONSERVA en la cuenta soft-CLOSED indefinidamente en V1: es la UNICA via
 * de atribucion de una RTDN de PRIMER CONTACTO (purchaseToken sin fila ni
 * predecesor -> `subscriptionsv2.get` -> `obfuscatedExternalAccountId` ->
 * `Account.findByObfuscatedAccountId`, PB-1A). "Cero filas" NO prueba que no
 * quede ciclo de vida de Google que necesite esa atribucion. La ref es un UUID
 * opaco pseudonimo, no una credencial, no concede nada, y una cuenta CLOSED no
 * puede autenticar -> direccion segura = RETENER. Su borrado definitivo queda
 * DIFERIDO a PB-6 (fase dedicada de retencion de datos de facturacion).
 *
 * RELOJ DE RETENCION (PB-1B §5): no existe timestamp dedicado de "transicion a
 * terminal" y no hace falta -- (B) y (D) se re-evaluan aqui. Ancla "no antes
 * de" = `GREATEST(account.closedAt, accountSubscription.updatedAt)`:
 *   - `closedAt`: fijado una sola vez en `markClosed`, nunca retrocede, nunca
 *     se limpia (la recuperacion ocurre en DELETION_PENDING, antes de CLOSED).
 *   - `updatedAt` (`@updatedAt`): una fila SOLO llega a terminal via una
 *     escritura -> `updatedAt >= instante de transicion`. Una escritura
 *     posterior solo lo mueve HACIA ADELANTE -> el reloj arranca MAS TARDE, la
 *     retencion se ALARGA, nunca se acorta. Determinista bajo carreras.
 *   - Fail-safe: config ausente / invalida -> NO-OP (retener).
 *
 * `overrideRetentionDays` SOLO lo pasa el disparo de gates/ops NO-PRODUCCION
 * (`_test/sweep`, protegido por `rejectInProduction`). El `@Cron` y el endpoint
 * production-capable NUNCA lo pasan: la regla congelada
 * "`BILLING_RETENTION_DAYS_AFTER_TERMINAL` ausente -> NO-OP" es inviolable en
 * produccion.
 *
 * NUNCA llama a Google. NUNCA muta `state`. Idempotente y tolerante a filas ya
 * borradas. Lote acotado.
 */
@Injectable()
export class BillingRetentionService {
  private readonly logger = new Logger(BillingRetentionService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly subscriptions: AccountSubscriptionRepository,
    private readonly rtdnEvents: GooglePlayRtdnEventRepository,
    private readonly tx: TransactionRunnerService,
  ) {}

  private isValidDays(value: number): boolean {
    return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
  }

  /** `null` = retencion DESHABILITADA -> el barrido es NO-OP (fail-safe: retener). */
  private resolveRetentionDays(overrideDays?: number): number | null {
    if (overrideDays !== undefined) {
      return this.isValidDays(overrideDays) ? overrideDays : null;
    }
    const raw = this.config.get<string>('BILLING_RETENTION_DAYS_AFTER_TERMINAL');
    if (raw === undefined || raw.trim() === '') return null;
    const days = Number(raw);
    if (!this.isValidDays(days)) {
      this.logger.warn(`BILLING_RETENTION_DAYS_AFTER_TERMINAL invalido ("${raw}") -- barrido de retencion NO-OP (fail-safe: retener)`);
      return null;
    }
    return days;
  }

  private lineageTokens(row: {
    purchaseToken: string;
    linkedPurchaseToken: string | null;
    resubscribedFromPurchaseToken: string | null;
  }): string[] {
    return [row.purchaseToken, row.linkedPurchaseToken, row.resubscribedFromPurchaseToken].filter(
      (t): t is string => t !== null,
    );
  }

  async runRetentionSweep(
    now: Date = new Date(),
    overrideRetentionDays?: number,
  ): Promise<{ enabled: boolean; purgedRows: number; skippedLiveWork: number }> {
    const retentionDays = this.resolveRetentionDays(overrideRetentionDays);
    if (retentionDays === null) {
      return { enabled: false, purgedRows: 0, skippedLiveWork: 0 };
    }
    const retentionMs = retentionDays * MS_PER_DAY;

    let purgedRows = 0;
    let skippedLiveWork = 0;

    const candidates = await this.subscriptions.findRetentionPurgeCandidates(now, BATCH_LIMIT);
    for (const row of candidates) {
      // Clausula F -- reloj de retencion. GREATEST(closedAt, updatedAt).
      const closedAtMs = row.account.closedAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const anchorMs = Math.max(closedAtMs, row.updatedAt.getTime());
      if (now.getTime() - anchorMs < retentionMs) continue;

      // Clausula D -- cero trabajo RTDN vivo en la linea de tokens.
      const live = await this.rtdnEvents.countLiveByPurchaseTokens(this.lineageTokens(row));
      if (live > 0) {
        skippedLiveWork++;
        continue;
      }

      // Borrado por fila -- transaccion + re-afirmacion de precondiciones.
      const deleted = await this.tx.run(async (db) => this.subscriptions.purgeRetentionRow(row.id, db));
      if (deleted > 0) purgedRows += deleted;
    }

    if (purgedRows > 0 || skippedLiveWork > 0) {
      this.logger.log(
        `barrido de retencion de facturacion: ${purgedRows} fila(s) purgada(s), ${skippedLiveWork} omitida(s) por trabajo RTDN vivo. Account.obfuscatedAccountId NO se toca (PB-1B-R1: diferido a PB-6).`,
      );
    }
    return { enabled: true, purgedRows, skippedLiveWork };
  }
}
