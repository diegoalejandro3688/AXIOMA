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
  isPendingPurchaseCanceled,
  type PendingPurchaseCanceledResult,
  type SubscriptionProviderAdapter,
  type VerifiedSubscriptionSnapshot,
} from './subscription-provider.port';
import { shouldAcknowledgeSubscription } from './should-acknowledge';
import { ZETRYND_PLAY_PACKAGE_NAME, ZETRYND_PREMIUM_PRODUCT_ID } from './subscription-product';
import type { NormalizedSubscriptionState } from '../entitlement/subscription/derive-subscription-tier';
import { applyRevocationContext, resolveProviderEventTimeUpdate } from './rtdn/rtdn-event-time';
import { rtdnSubscriptionNotificationLabel } from './rtdn/rtdn-notification-type';

/**
 * La reconciliacion no pudo atribuir el `purchaseToken` a ninguna cuenta:
 * llega una RTDN para un token que aun no tiene fila ni predecesor conocido
 * (el `reconcilePurchase` del movil todavia no corrio). NO es un fallo
 * permanente -- el worker reintenta un numero acotado de veces; la ruta de
 * atribucion primaria sigue siendo el reconcile del movil.
 */
export class SubscriptionNotAttributableError extends Error {
  constructor(purchaseTokenHint: string) {
    super(`RTDN para un purchaseToken no atribuible todavia (${purchaseTokenHint})`);
    this.name = 'SubscriptionNotAttributableError';
  }
}

/** Contexto interno de una reconciliacion. `providerEventTime`/`notificationType` solo vienen de una RTDN (C3.3). */
interface ReconcileContext {
  /** Acota la recursion de compra-pendiente-cancelada (1 salto). */
  depth: number;
  /** `DeveloperNotification.eventTimeMillis` -- cronologia AUTORITATIVA de Google. `null` = reconcile directo del movil. */
  providerEventTime: Date | null;
  /** `subscriptionNotification.notificationType` (entero de Google) -- contexto de revocacion. `null` = movil. */
  notificationType: number | null;
}

const DIRECT: ReconcileContext = { depth: 0, providerEventTime: null, notificationType: null };

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2 + C3.3.
 *
 * UNICA operacion autoritativa: verifica un `purchaseToken` con Google,
 * reconcilia `AccountSubscription` atomicamente y deja que
 * `GET /me/entitlement` derive el tier. NUNCA confia en el tier/estado/expiry
 * que el movil pudiera enviar (el movil solo manda `purchaseToken`).
 *
 * Dos entradas, UN camino:
 *   - `reconcilePurchase({ accountId, purchaseToken })` -- reconcile DIRECTO
 *     del movil (C3.2). `providerEventTime = null`: nunca fija/retrocede la
 *     cronologia de proveedor.
 *   - `reconcileFromNotification({ purchaseToken, providerEventTime, ... })` --
 *     desde el worker de RTDN (C3.3). La cuenta se resuelve de la fila
 *     existente o del predecesor linkeado; `providerEventTime` es autoritativo
 *     y MONOTONO.
 *
 * Frontera: este servicio nunca ve JSON de Google ni tipos de transporte de
 * Google -- consume el `VerifiedSubscriptionSnapshot` neutral del adaptador y,
 * de la RTDN, solo primitivos (`Date`, entero).
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
    return this.reconcileToken(input.accountId, input.purchaseToken, DIRECT);
  }

  /**
   * Entrada desde el worker de RTDN (C3.3). El RTDN NO es la verdad de la
   * suscripcion -- solo dispara esta reconsulta a Google. La cuenta se resuelve
   * de la fila existente (por `purchaseToken`) o, si es una rotacion de token,
   * del predecesor linkeado; si no se puede atribuir todavia, lanza
   * `SubscriptionNotAttributableError` (el worker reintenta acotadamente).
   */
  async reconcileFromNotification(input: {
    purchaseToken: string;
    providerEventTime: Date | null;
    notificationType: number | null;
  }): Promise<{ status: SubscriptionReconcileStatus }> {
    return this.reconcileToken(null, input.purchaseToken, {
      depth: 0,
      providerEventTime: input.providerEventTime,
      notificationType: input.notificationType,
    });
  }

  /**
   * `ctx.depth` acota la recursion: una compra pendiente cancelada con
   * `linkedPurchaseToken` reconcilia esa suscripcion existente (1 salto).
   *
   * `accountId === null` es la ruta RTDN: la cuenta se resuelve de la fila
   * existente o del predecesor linkeado.
   */
  private async reconcileToken(
    accountIdInput: string | null,
    purchaseToken: string,
    ctx: ReconcileContext,
  ): Promise<{ status: SubscriptionReconcileStatus }> {
    let accountId = accountIdInput;

    // 1. Ownership pre-check -- un token ya asociado a OTRA cuenta ZETRYND
    //    NUNCA se re-vincula (ADR L.4). Mismo dueno -> camino idempotente.
    //    RTDN (`accountId === null`): se ADOPTA la cuenta de la fila existente.
    const existing = await this.subscriptions.findByPurchaseToken(purchaseToken);
    if (existing) {
      if (accountId !== null && existing.accountId !== accountId) {
        this.logger.warn(`account mismatch en reconcile: token ${this.tokenHint(purchaseToken)} pertenece a otra cuenta`);
        throw new ConflictException({ code: SUBSCRIPTION_ACCOUNT_MISMATCH_CODE, message: 'Esta compra está asociada a otra cuenta.' });
      }
      accountId = existing.accountId;
    }

    // 2. Verificar con el proveedor. NUNCA se fabrica un snapshot exitoso.
    let verification: VerifiedSubscriptionSnapshot | PendingPurchaseCanceledResult;
    try {
      verification = await this.provider.getSubscription(purchaseToken);
    } catch (error) {
      throw this.mapProviderError(error, purchaseToken);
    }

    // 2b. Compra PENDIENTE CANCELADA -- la transaccion nunca llego a ser una
    //     suscripcion. NUNCA se persiste una fila para este token, NUNCA se
    //     acknowledgea, NUNCA supersede a nada. Si concernia a una suscripcion
    //     EXISTENTE (`linkedPurchaseToken`), esa es la autoridad.
    if (isPendingPurchaseCanceled(verification)) {
      return this.reconcileCanceledPendingPurchase(accountId, purchaseToken, verification, ctx);
    }
    const snapshot = verification;

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

    // 3b. Contexto de REVOCACION (C3.3 §14). `SubscriptionPurchaseV2` no expone
    //     "revoked"; si el RTDN que disparo esto es `SUBSCRIPTION_REVOKED` (12)
    //     y el estado derivado ya es terminal (`EXPIRED`), se registra `REVOKED`
    //     -- solo fidelidad de auditoria (ambos derivan FREE). Si el snapshot
    //     dijera un estado que concede, NO se sobreescribe (se confia en Google).
    const effectiveState: NormalizedSubscriptionState = applyRevocationContext(snapshot.state, ctx.notificationType);
    if (effectiveState !== snapshot.state) {
      this.logger.log(`RTDN revoke: ${this.tokenHint(purchaseToken)} snapshot=${snapshot.state} -> se registra REVOKED`);
    } else if (ctx.notificationType === 12 && snapshot.recognizedState && snapshot.state !== 'EXPIRED') {
      this.logger.warn(`RTDN revoke para ${this.tokenHint(purchaseToken)} pero el snapshot dice ${snapshot.state} -- posible desincronizacion, se confia en Google`);
    }

    // 4. linkedPurchaseToken -- rotacion de token EN VIVO (ADR D.4). El
    //    predecesor pasa a `SUPERSEDED`. RTDN sin cuenta: se HEREDA la del
    //    predecesor (ADR D.4.1).
    let predecessorId: string | null = null;
    if (snapshot.linkedPurchaseToken) {
      const predecessor = await this.subscriptions.findByPurchaseToken(snapshot.linkedPurchaseToken);
      if (predecessor) {
        if (accountId !== null && predecessor.accountId !== accountId) {
          throw new ConflictException({ code: SUBSCRIPTION_ACCOUNT_MISMATCH_CODE, message: 'La suscripción anterior pertenece a otra cuenta.' });
        }
        if (accountId === null) accountId = predecessor.accountId;
        if (predecessor.state !== 'SUPERSEDED') predecessorId = predecessor.id;
      }
    }

    // 4a. outOfAppPurchaseContext.expiredPurchaseToken -- RE-ALTA FUERA DE LA
    //     APP tras EXPIRACION TOTAL. Semantica DISTINTA a linkedPurchaseToken:
    //     la suscripcion anterior ya termino, esto es una compra NUEVA. SOLO se
    //     usa para ATRIBUIR la cuenta (RTDN antes del reconcile del movil);
    //     la fila anterior NO se marca SUPERSEDED (se queda EXPIRED). Se
    //     REGISTRA el vinculo en `resubscribedFromPurchaseToken`.
    let resubscribedFrom: string | null = null;
    if (snapshot.expiredPurchaseToken) {
      const expired = await this.subscriptions.findByPurchaseToken(snapshot.expiredPurchaseToken);
      if (expired) {
        if (accountId !== null && expired.accountId !== accountId) {
          // Cadena de propiedad IMPOSIBLE: la sesion es de X pero la
          // suscripcion expirada linkeada es de otra cuenta -> fail-closed.
          this.logger.warn(`resubscribe: expiredPurchaseToken de ${this.tokenHint(purchaseToken)} pertenece a otra cuenta`);
          throw new ConflictException({ code: SUBSCRIPTION_ACCOUNT_MISMATCH_CODE, message: 'La suscripción anterior pertenece a otra cuenta.' });
        }
        if (accountId === null) accountId = expired.accountId;
        resubscribedFrom = snapshot.expiredPurchaseToken;
      }
      // `expired` no existe como fila -> no se puede atribuir por aqui; si
      // `accountId` sigue null cae al 4b (reintento acotado, NO fila fabricada).
    }

    // 4b. Sin cuenta resoluble -> la RTDN llego antes que el reconcile del movil.
    if (accountId === null) {
      throw new SubscriptionNotAttributableError(this.tokenHint(purchaseToken));
    }

    const writeData = this.toWriteData(accountId, snapshot, effectiveState, resubscribedFrom);
    const notificationLabel = rtdnSubscriptionNotificationLabel(ctx.notificationType);

    // 5. Persistir atomicamente: upsert por purchaseToken + supersede predecesor
    //    + avanzar la cronologia de proveedor (MONOTONA) si la RTDN es mas nueva.
    await this.tx.run(async (db) => {
      const current = await this.subscriptions.findByPurchaseToken(purchaseToken, db);
      const eventUpdate = resolveProviderEventTimeUpdate(current?.latestEventTime ?? null, ctx.providerEventTime, notificationLabel);
      const rowId = current
        ? (await this.subscriptions.updateFromVerified(current.id, writeData, db)).id
        : (await this.subscriptions.createFromVerified(writeData, db)).id;
      if (predecessorId) {
        await this.subscriptions.markSuperseded(predecessorId, db);
      }
      if (eventUpdate) {
        await this.subscriptions.applyProviderEvent(rowId, eventUpdate, db);
      }
    });

    // 6. Acknowledge -- regla PURA `shouldAcknowledgeSubscription`: se
    //    acknowledgea sii la compra CONCEDE entitlement ahora (ACTIVE,
    //    IN_GRACE_PERIOD, o CANCELED con periodo pagado vigente), el estado
    //    es reconocido, no es PENDING y aun no esta acknowledgeada. NUNCA
    //    para PENDING / producto invalido / estado fail-closed / ya
    //    acknowledgeada / estado que no concede. Vale para el reconcile del
    //    movil Y para el worker de RTDN (recuperacion autonoma del ack, §17).
    const now = new Date();
    if (shouldAcknowledgeSubscription({ state: effectiveState, expiryTime: snapshot.expiryTime, recognizedState: snapshot.recognizedState, acknowledged: snapshot.acknowledged }, now)) {
      try {
        await this.provider.acknowledgeSubscription(purchaseToken);
        const row = await this.subscriptions.findByPurchaseToken(purchaseToken);
        if (row) await this.subscriptions.markAcknowledged(row.id);
      } catch (error) {
        // La fila YA esta persistida y el entitlement es derivable -- NO se
        // revoca PREMIUM porque el transporte del acknowledge fallara. Pero,
        // sin worker de reintento autonomo todavia, no se puede reportar
        // "verified" y dejar la compra sin confirmar (Google reembolsa a los
        // 3 dias). Se devuelve un 503 REINTENTABLE: reintentar el MISMO
        // `purchaseToken` re-verifica (idempotente, sin fila duplicada) y
        // vuelve a intentar el acknowledge. C3.3 (RTDN) anadira recuperacion
        // autonoma.
        this.logger.warn(
          `acknowledge incompleto para ${this.tokenHint(purchaseToken)} (fila persistida, reintentable): ${error instanceof Error ? error.message : 'desconocido'}`,
        );
        throw new ServiceUnavailableException('La compra se registró pero aún no se pudo confirmar. Vuelve a intentarlo.');
      }
    }

    return { status: effectiveState === 'PENDING' ? 'pending' : 'verified' };
  }

  /**
   * `SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED`: una compra PENDIENTE (un
   * cambio de plan / re-alta / pago diferido) se cancelo antes de completarse.
   *
   * El `status` del endpoint describe la DISPOSICION DEL TOKEN QUE EL CLIENTE
   * ENVIO. Un token cuya compra pendiente se cancelo SIEMPRE responde
   * `canceled` -- aunque internamente se reconcilie una suscripcion previa que
   * siga concediendo PREMIUM. La verdad de authorization es independiente:
   * `GET /me/entitlement`. Devolver `verified` para B haria que el movil (C3.5)
   * interpretara un intento de compra cancelado como exitoso.
   *
   * (B) Sin `linkedPurchaseToken` -> compra pendiente INICIAL cancelada: no
   *     hay suscripcion previa. Resultado neto: nada. No se escribio ninguna
   *     fila, no se acknowledgeo nada -> idempotente por construccion.
   *
   * (C) Con `linkedPurchaseToken` -> REEMPLAZO pendiente cancelado: la
   *     suscripcion EXISTENTE linkeada sigue siendo la autoridad. Este token
   *     NO la supersede y NO se persiste. Se verifica y reconcilia la
   *     suscripcion linkeada (recursion, 1 salto) por sus EFECTOS (persistir/
   *     actualizar/acknowledgear A, de lo que depende el entitlement), pero su
   *     `status` se descarta: el endpoint responde `canceled`.
   *
   * (D) Ownership: si la suscripcion linkeada ya pertenece a OTRA cuenta
   *     ZETRYND -> `SUBSCRIPTION_ACCOUNT_MISMATCH`, sin transferir, sin
   *     supersede, sin conceder entitlement. Si aun NO esta persistida,
   *     reconciliarla la vincula a la cuenta de SESION -- exactamente la regla
   *     de primer contacto de C3.2 (la cadena token->linked la devolvio Google
   *     para el token de esta misma sesion), y el unico camino peligroso ya
   *     esta bloqueado arriba.
   */
  private async reconcileCanceledPendingPurchase(
    accountId: string | null,
    purchaseToken: string,
    result: PendingPurchaseCanceledResult,
    ctx: ReconcileContext,
  ): Promise<{ status: SubscriptionReconcileStatus }> {
    const linked = result.linkedPurchaseToken;

    if (!linked || linked === purchaseToken || ctx.depth >= 1) {
      this.logger.log(
        `compra pendiente cancelada para ${this.tokenHint(purchaseToken)} sin suscripcion previa reconciliable -> canceled`,
      );
      return { status: 'canceled' };
    }

    const linkedRow = await this.subscriptions.findByPurchaseToken(linked);
    if (linkedRow && accountId !== null && linkedRow.accountId !== accountId) {
      this.logger.warn(
        `compra pendiente cancelada: la suscripcion linkeada de ${this.tokenHint(purchaseToken)} pertenece a otra cuenta`,
      );
      throw new ConflictException({
        code: SUBSCRIPTION_ACCOUNT_MISMATCH_CODE,
        message: 'La suscripción anterior pertenece a otra cuenta.',
      });
    }

    const resolvedAccount = accountId ?? linkedRow?.accountId ?? null;
    if (resolvedAccount === null) {
      // RTDN de compra-pendiente-cancelada para un linked que aun no conocemos.
      throw new SubscriptionNotAttributableError(this.tokenHint(purchaseToken));
    }

    // Reconcilia A por sus efectos; su `status` NO es la disposicion del token
    // que el cliente envio. NO se propaga la cronologia/tipo de la RTDN de B:
    // el evento no es sobre el token de A y `subscriptionsv2.get(A)` ya da el
    // estado actual de A (C3.3 §12 -- la RTDN no trae estado autoritativo).
    await this.reconcileToken(resolvedAccount, linked, { depth: ctx.depth + 1, providerEventTime: null, notificationType: null });
    this.logger.log(
      `compra pendiente cancelada para ${this.tokenHint(purchaseToken)}; suscripcion previa reconciliada -> canceled`,
    );
    return { status: 'canceled' };
  }

  private toWriteData(
    accountId: string,
    s: VerifiedSubscriptionSnapshot,
    stateOverride?: NormalizedSubscriptionState,
    resubscribedFromPurchaseToken: string | null = null,
  ): VerifiedSubscriptionWriteData {
    return {
      accountId,
      purchaseToken: s.purchaseToken,
      linkedPurchaseToken: s.linkedPurchaseToken,
      resubscribedFromPurchaseToken,
      state: stateOverride ?? s.state,
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
