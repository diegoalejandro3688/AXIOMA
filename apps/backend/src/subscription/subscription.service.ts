import { Injectable, Logger } from '@nestjs/common';
import type { SubscriptionSummaryResponse } from '@axioma/contracts';
import { EntitlementService } from '../entitlement/entitlement.service';
import { AccountSubscriptionRepository } from '../entitlement/subscription/account-subscription.repository';
import { presentSubscriptionSummary } from './present-subscription-summary';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1B.
 *
 * Servicio de dominio de suscripcion NO reconciliador:
 *   - `getSummary` -- alimenta `GET /me/subscription` (solo lectura: no llama a
 *     Google, no aprovisiona `billingAccountRef`, no muta `AccountSubscription`).
 *   - `applyAccountClosure` -- minimizacion de datos de facturacion en el CIERRE
 *     DEFINITIVO de la cuenta (lo invoca `PrivacyService.runAccountDeletionSweep`
 *     DESPUES de `finalizeAccountClosure`, nunca al SOLICITAR la eliminacion).
 *
 * La verificacion de compras / RTDN sigue en `SubscriptionReconciliationService`.
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly entitlement: EntitlementService,
    private readonly subscriptions: AccountSubscriptionRepository,
  ) {}

  /**
   * Resumen de gestion (`GET /me/subscription`). Deriva de: (1) el `tier` de
   * authorization -- la MISMA verdad que `GET /me/entitlement`, no se re-deriva;
   * (2) la fila `AccountSubscription` vigente. Presentador PURO. Cero efectos
   * secundarios, cero llamadas a Google, cero escrituras.
   */
  async getSummary(accountId: string): Promise<SubscriptionSummaryResponse> {
    // PB-1B-R1 §6 -- UNA sola lectura de la fila vigente; el `tier` se deriva de
    // ESE MISMO snapshot (`getEntitlementForRow`, misma precedencia
    // override->derivacion->FREE que `getEntitlement`). Evita que `tier` salga
    // de una version de fila y `renewalStatus`/`accessUntil` de otra bajo una
    // transicion concurrente.
    const current = await this.subscriptions.findCurrentByAccountId(accountId);
    const { tier } = this.entitlement.getEntitlementForRow(accountId, current);
    return presentSubscriptionSummary(
      current ? { state: current.state, expiryTime: current.expiryTime } : null,
      tier,
      new Date(),
    );
  }

  /**
   * CIERRE DEFINITIVO de la cuenta (PB-0A-R2 §11 / §12). Sobre TODAS las filas
   * de suscripcion de la cuenta:
   *   - pone a NULL los campos DIAGNOSTICOS que ningun paso de ciclo de vida
   *     necesita (`rawSnapshot`, `latestNotificationType`, `autoRenewing`->false,
   *     `cancelReason`, `cancelUserInitiated`, `cancelTime`);
   *   - NO borra ninguna fila (ni siquiera PENDING -- se retiene, sigue
   *     reconciliando);
   *   - NO muta `state` (nunca fuerza PENDING->EXPIRED; la verdad de Google se
   *     conserva y el barrido de RTDN puede seguir avanzandola);
   *   - NO toca `purchaseToken` / `linkedPurchaseToken` /
   *     `resubscribedFromPurchaseToken` / `expiryTime` / `productId` /
   *     `basePlanId` / `regionCode` / `testPurchase` / `Account.obfuscatedAccountId`
   *     (los necesita la reconciliacion / la retencion).
   *
   * La purga real de filas terminales + la limpieza de `obfuscatedAccountId`
   * viven en `BillingRetentionService`, gobernadas por el reloj de retencion.
   *
   * Idempotente y seguro si la cuenta nunca tuvo suscripcion.
   */
  async applyAccountClosure(accountId: string): Promise<{ minimizedRows: number }> {
    const minimizedRows = await this.subscriptions.nullDiagnosticsForAccountClosure(accountId);
    if (minimizedRows > 0) {
      this.logger.log(`cierre de cuenta: ${minimizedRows} fila(s) de suscripcion minimizada(s) (diagnostico -> NULL, lifecycle intacto)`);
    }
    return { minimizedRows };
  }
}
