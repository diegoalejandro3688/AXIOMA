import { Injectable } from '@nestjs/common';
import type { NormalizedSubscriptionState } from '../entitlement/subscription/derive-subscription-tier';
import {
  ZETRYND_PLAY_PACKAGE_NAME,
  ZETRYND_PREMIUM_BASE_PLAN_ID,
  ZETRYND_PREMIUM_PRODUCT_ID,
} from './subscription-product';
import {
  SubscriptionProviderError,
  type SubscriptionProviderAdapter,
  type SubscriptionProviderErrorCategory,
  type SubscriptionVerificationResult,
} from './subscription-provider.port';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
 *
 * Adaptador FAKE, DETERMINISTA y SIN ESTADO EXTERNO -- el `impl` por defecto
 * en desarrollo local y el que usan los gates. No abre red, no lee
 * credenciales, no depende de Google.
 *
 * El resultado se codifica EN EL PROPIO `purchaseToken` (mismo criterio que
 * `StubIdentityProvider`), asi que un gate que corre en OTRO proceso puede
 * guionar el comportamiento sin un endpoint interno:
 *
 *   `fakesub-ok:<b64url(spec)>`        -> devuelve un snapshot segun `spec`
 *                                        (o, si `spec.pendingPurchaseCanceled`,
 *                                        un `PendingPurchaseCanceledResult`)
 *   `fakesub-ackfail:<n>:<b64url(spec)>` -> como `-ok:`, pero `acknowledge`
 *                                          falla `n` veces (transient) y
 *                                          luego tiene exito
 *   `fakesub-err:<category>`           -> lanza SubscriptionProviderError
 *   cualquier otro                     -> SubscriptionProviderError('not_found')
 *
 * `spec` (todos opcionales salvo `state`):
 *   { state, expiryDeltaMs?, startDeltaMs?, autoRenewing?, acknowledged?,
 *     linkedPurchaseToken?, obfuscatedExternalAccountId?, productId?,
 *     basePlanId?, testPurchase?, cancelUserInitiated?, rawSubscriptionState?,
 *     recognizedState? }
 *
 * El unico estado en memoria (`ackedTokens`, `ackFailRemaining`) vive lo que
 * dure el proceso -- suficiente para un gate de una sola corrida y para
 * probar "no acknowledgear dos veces" / "reintento tras fallo de ack".
 */
interface FakeSnapshotSpec {
  state: NormalizedSubscriptionState;
  /**
   * Si `true`, `getSubscription` devuelve un `PendingPurchaseCanceledResult`
   * (compra pendiente cancelada) en vez de un snapshot. `state` se ignora;
   * `linkedPurchaseToken` (si se fija) es la suscripcion existente linkeada.
   */
  pendingPurchaseCanceled?: boolean;
  expiryDeltaMs?: number;
  startDeltaMs?: number;
  autoRenewing?: boolean;
  acknowledged?: boolean;
  linkedPurchaseToken?: string | null;
  obfuscatedExternalAccountId?: string | null;
  productId?: string;
  basePlanId?: string | null;
  testPurchase?: boolean;
  cancelUserInitiated?: boolean | null;
  rawSubscriptionState?: string;
  recognizedState?: boolean;
  /** Solo hace UNICO el string del token (cada compra tiene su token). El fake lo ignora. */
  nonce?: string;
}

let nonceCounter = 0;
function withNonce(spec: FakeSnapshotSpec): FakeSnapshotSpec {
  return spec.nonce !== undefined ? spec : { ...spec, nonce: `${Date.now().toString(36)}-${(nonceCounter++).toString(36)}` };
}

function b64urlDecode(value: string): string {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64').toString('utf-8');
}

/**
 * Helper de test: codifica un `purchaseToken` fake con el comportamiento
 * deseado. Cada llamada produce un string UNICO (nonce automatico) -- salvo
 * que se fije `spec.nonce` explicitamente (para simular "el mismo token").
 */
export function encodeFakeSubscriptionToken(spec: FakeSnapshotSpec): string {
  return `fakesub-ok:${Buffer.from(JSON.stringify(withNonce(spec)), 'utf-8').toString('base64url')}`;
}
export function encodeFakeAckFailToken(failures: number, spec: FakeSnapshotSpec): string {
  return `fakesub-ackfail:${failures}:${Buffer.from(JSON.stringify(withNonce(spec)), 'utf-8').toString('base64url')}`;
}
export function encodeFakeErrorToken(category: SubscriptionProviderErrorCategory): string {
  return `fakesub-err:${category}`;
}
/**
 * Helper de test: `purchaseToken` cuya compra pendiente fue cancelada.
 * `linkedPurchaseToken = null` -> compra pendiente inicial; un token -> la
 * suscripcion existente que la reconciliacion debe reconsultar.
 */
export function encodeFakePendingPurchaseCanceledToken(linkedPurchaseToken: string | null): string {
  return encodeFakeSubscriptionToken({ state: 'EXPIRED', pendingPurchaseCanceled: true, linkedPurchaseToken });
}

@Injectable()
export class FakeSubscriptionProviderAdapter implements SubscriptionProviderAdapter {
  private readonly ackedTokens = new Set<string>();
  private readonly ackFailRemaining = new Map<string, number>();

  private parse(purchaseToken: string): { spec: FakeSnapshotSpec } | { error: SubscriptionProviderErrorCategory } {
    if (purchaseToken.startsWith('fakesub-err:')) {
      return { error: purchaseToken.slice('fakesub-err:'.length) as SubscriptionProviderErrorCategory };
    }
    if (purchaseToken.startsWith('fakesub-ackfail:')) {
      const rest = purchaseToken.slice('fakesub-ackfail:'.length);
      const colon = rest.indexOf(':');
      const n = Number.parseInt(rest.slice(0, colon), 10);
      if (!this.ackFailRemaining.has(purchaseToken)) this.ackFailRemaining.set(purchaseToken, Number.isFinite(n) ? n : 0);
      return { spec: JSON.parse(b64urlDecode(rest.slice(colon + 1))) as FakeSnapshotSpec };
    }
    if (purchaseToken.startsWith('fakesub-ok:')) {
      return { spec: JSON.parse(b64urlDecode(purchaseToken.slice('fakesub-ok:'.length))) as FakeSnapshotSpec };
    }
    return { error: 'not_found' };
  }

  async getSubscription(purchaseToken: string): Promise<SubscriptionVerificationResult> {
    const parsed = this.parse(purchaseToken);
    if ('error' in parsed) {
      throw new SubscriptionProviderError(`fake: ${parsed.error}`, parsed.error);
    }
    const spec = parsed.spec;
    if (spec.pendingPurchaseCanceled === true) {
      return {
        pendingPurchaseCanceled: true,
        purchaseToken,
        linkedPurchaseToken: spec.linkedPurchaseToken ?? null,
        raw: { fake: true, spec },
      };
    }
    const now = Date.now();
    const acknowledged = this.ackedTokens.has(purchaseToken) || spec.acknowledged === true;
    return {
      packageName: ZETRYND_PLAY_PACKAGE_NAME,
      purchaseToken,
      linkedPurchaseToken: spec.linkedPurchaseToken ?? null,
      state: spec.state,
      recognizedState: spec.recognizedState ?? true,
      rawSubscriptionState: spec.rawSubscriptionState ?? `SUBSCRIPTION_STATE_${spec.state}`,
      productId: spec.productId ?? ZETRYND_PREMIUM_PRODUCT_ID,
      basePlanId: spec.basePlanId === undefined ? ZETRYND_PREMIUM_BASE_PLAN_ID : spec.basePlanId,
      expiryTime: spec.expiryDeltaMs === undefined ? null : new Date(now + spec.expiryDeltaMs),
      startTime: spec.startDeltaMs === undefined ? new Date(now - 30 * 24 * 3_600_000) : new Date(now + spec.startDeltaMs),
      autoRenewing: spec.autoRenewing ?? true,
      acknowledged,
      testPurchase: spec.testPurchase ?? false,
      regionCode: 'CL',
      obfuscatedExternalAccountId: spec.obfuscatedExternalAccountId ?? null,
      cancelUserInitiated: spec.cancelUserInitiated ?? null,
      raw: { fake: true, spec },
    };
  }

  async acknowledgeSubscription(purchaseToken: string): Promise<void> {
    const remaining = this.ackFailRemaining.get(purchaseToken) ?? 0;
    if (remaining > 0) {
      this.ackFailRemaining.set(purchaseToken, remaining - 1);
      throw new SubscriptionProviderError('fake: acknowledge fallo transitorio', 'transient');
    }
    this.ackedTokens.add(purchaseToken);
  }
}
