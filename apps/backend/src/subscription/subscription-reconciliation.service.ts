import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  SUBSCRIPTION_ACCOUNT_MISMATCH_CODE,
  SUBSCRIPTION_INVALID_CODE,
  type SubscriptionReconcileStatus,
} from '@axioma/contracts';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import {
  AccountSubscriptionRepository,
  type VerifiedSubscriptionWriteData,
} from '../entitlement/subscription/account-subscription.repository';
import {
  SUBSCRIPTION_PROVIDER_ADAPTER,
  SubscriptionProviderError,
  type SubscriptionProviderAdapter,
  type VerifiedSubscriptionSnapshot,
} from './subscription-provider.port';
import { ZETRYND_PLAY_PACKAGE_NAME, ZETRYND_PREMIUM_PRODUCT_ID } from './subscription-product';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
 *
 * UNICA operacion autoritativa: verifica un `purchaseToken` con Google,
 * reconcilia `AccountSubscription` atomicamente y deja que
 * `GET /me/entitlement` derive el tier. NUNCA confia en el tier/estado/expiry
 * que el movil pudiera enviar (el movil solo manda `purchaseToken`).
 *
 * Frontera: este servicio nunca ve JSON de Google -- consume el
 * `VerifiedSubscriptionSnapshot` neutral que el adaptador ya normalizo.
 */
@Injectable()
export class SubscriptionReconciliationService {
  private readonly logger = new Logger(SubscriptionReconciliationService.name);

  constructor(
    @Inject(SUBSCRIPTION_PROVIDER_ADAPTER) private readonly provider: SubscriptionProviderAdapter,
    private readonly subscriptions: AccountSubscriptionRepository,
    private readonly tx: TransactionRunnerService,
  ) {}

  /** Trunca un token para logs -- nunca se loguea entero (ADR L.13). */
  private tokenHint(token: string): string {
    return token.length <= 12 ? '***' : `${token.slice(0, 6)}...${token.slice(-4)}`;
  }

  async reconcilePurchase(input: { accountId: string; purchaseToken: string }): Promise<{ status: SubscriptionReconcileStatus }> {
    const { accountId, purchaseToken } = input;

    // 1. Ownership pre-check -- un token ya asociado a OTRA cuenta ZETRYND
    //    NUNCA se re-vincula (ADR L.4). Mismo dueno -> camino idempotente.
    const existing = await this.subscriptions.findByPurchaseToken(purchaseToken);
    if (existing && existing.accountId !== accountId) {
      this.logger.warn(`account mismatch en reconcile: token ${this.tokenHint(purchaseToken)} pertenece a otra cuenta`);
      throw new ConflictException({ code: SUBSCRIPTION_ACCOUNT_MISMATCH_CODE, message: 'Esta compra está asociada a otra cuenta.' });
    }

    // 2. Verificar con el proveedor. NUNCA se fabrica un snapshot exitoso.
    let snapshot: VerifiedSubscriptionSnapshot;
    try {
      snapshot = await this.provider.getSubscription(purchaseToken);
    } catch (error) {
      throw this.mapProviderError(error, purchaseToken);
    }

    // 3. Validacion defensiva de producto (el adaptador ya la hizo, explicita).
    if (snapshot.packageName !== ZETRYND_PLAY_PACKAGE_NAME || snapshot.productId !== ZETRYND_PREMIUM_PRODUCT_ID) {
      this.logger.warn(`snapshot no-ZETRYND en reconcile: pkg=${snapshot.packageName} product=${snapshot.productId}`);
      throw new BadRequestException({ code: SUBSCRIPTION_INVALID_CODE, message: 'La compra no corresponde a ZETRYND Premium.' });
    }
    if (!snapshot.recognizedState) {
      // Fail-closed: Google devolvio un estado que ZETRYND no reconoce. Se
      // persiste el estado normalizado (EXPIRED -> FREE) y NO se acknowledgea.
      this.logger.warn(`subscriptionState no reconocido de Google: "${snapshot.rawSubscriptionState}" -> fail-closed`);
    }

    // 4. linkedPurchaseToken -- rotacion de token (ADR D.4).
    let predecessorId: string | null = null;
    if (snapshot.linkedPurchaseToken) {
      const predecessor = await this.subscriptions.findByPurchaseToken(snapshot.linkedPurchaseToken);
      if (predecessor) {
        if (predecessor.accountId !== accountId) {
          throw new ConflictException({ code: SUBSCRIPTION_ACCOUNT_MISMATCH_CODE, message: 'La suscripción anterior pertenece a otra cuenta.' });
        }
        if (predecessor.state !== 'SUPERSEDED') predecessorId = predecessor.id;
      }
    }

    const writeData = this.toWriteData(accountId, snapshot);

    // 5. Persistir atomicamente: upsert por purchaseToken + supersede predecesor.
    await this.tx.run(async (db) => {
      const current = await this.subscriptions.findByPurchaseToken(purchaseToken, db);
      if (current) {
        await this.subscriptions.updateFromVerified(current.id, writeData, db);
      } else {
        await this.subscriptions.createFromVerified(writeData, db);
      }
      if (predecessorId) {
        await this.subscriptions.markSuperseded(predecessorId, db);
      }
    });

    // 6. Acknowledge SOLO si la compra esta entitled (ACTIVE) y aun no
    //    acknowledgeada. NUNCA para PENDING / estado no reconocido / etc.
    //    Fallo de acknowledge = NO fatal: la fila ya esta persistida y el
    //    entitlement es derivable; se reintenta en una llamada posterior.
    if (snapshot.state === 'ACTIVE' && snapshot.recognizedState && !snapshot.acknowledged) {
      try {
        await this.provider.acknowledgeSubscription(purchaseToken);
        const row = await this.subscriptions.findByPurchaseToken(purchaseToken);
        if (row) await this.subscriptions.markAcknowledged(row.id);
      } catch (error) {
        this.logger.warn(
          `acknowledge fallo para ${this.tokenHint(purchaseToken)} (no fatal, se reintentara): ${error instanceof Error ? error.message : 'desconocido'}`,
        );
      }
    }

    return { status: snapshot.state === 'PENDING' ? 'pending' : 'verified' };
  }

  private toWriteData(accountId: string, s: VerifiedSubscriptionSnapshot): VerifiedSubscriptionWriteData {
    return {
      accountId,
      purchaseToken: s.purchaseToken,
      linkedPurchaseToken: s.linkedPurchaseToken,
      state: s.state,
      expiryTime: s.expiryTime,
      startTime: s.startTime,
      autoRenewing: s.autoRenewing,
      acknowledged: s.acknowledged,
      productId: s.productId,
      basePlanId: s.basePlanId,
      regionCode: s.regionCode,
      testPurchase: s.testPurchase,
      cancelUserInitiated: s.cancelUserInitiated,
      rawSnapshot: JSON.parse(JSON.stringify(s.raw ?? {})),
    };
  }

  private mapProviderError(error: unknown, purchaseToken: string) {
    if (!(error instanceof SubscriptionProviderError)) {
      this.logger.error(`error inesperado verificando ${this.tokenHint(purchaseToken)}`, error instanceof Error ? error.stack : undefined);
      return new ServiceUnavailableException('No se pudo verificar la compra. Inténtalo de nuevo.');
    }
    switch (error.category) {
      case 'not_configured':
        // Config incompleta -- NUNCA se disfraza de exito. 503, sin detalle.
        this.logger.error('verificacion de compra no configurada (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)');
        return new ServiceUnavailableException('La verificación de compras no está disponible.');
      case 'transient':
        return new ServiceUnavailableException('No se pudo verificar la compra. Inténtalo de nuevo.');
      case 'not_found':
      case 'invalid_request':
      case 'auth_error':
      case 'wrong_product':
      case 'unknown':
      default:
        this.logger.warn(`verificacion de ${this.tokenHint(purchaseToken)} rechazada: ${error.category}`);
        return new BadRequestException({ code: SUBSCRIPTION_INVALID_CODE, message: 'No se pudo validar la compra.' });
    }
  }
}
