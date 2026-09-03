import type { NormalizedSubscriptionState } from '../../entitlement/subscription/derive-subscription-tier';
import type { VerifiedSubscriptionSnapshot } from '../subscription-provider.port';
import {
  GOOGLE_SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED,
  type GoogleSubscriptionPurchaseLineItem,
  type GoogleSubscriptionPurchaseV2,
} from './google-subscription-v2.types';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
 *
 * Mapper PURO `SubscriptionPurchaseV2` (Google) -> snapshot NEUTRAL de
 * ZETRYND. Sin DB, sin red, sin framework. Aqui vive:
 *   - el mapeo de `subscriptionState` a los 9 estados normalizados (C3.1),
 *     con manejo FAIL-CLOSED de valores desconocidos/futuros;
 *   - la SELECCION DETERMINISTA del line item ZETRYND (nunca `lineItems[0]`);
 *   - la validacion de packageName / productId / base plan.
 *
 * NO fija `latestEventTime` -- `SubscriptionPurchaseV2` no lo trae (C3.2 sec 3).
 */

export interface MapGoogleSubscriptionContext {
  /** `packageName` que el adaptador consulto (constante ZETRYND). */
  queriedPackageName: string;
  purchaseToken: string;
  expectedPackageName: string;
  expectedProductId: string;
  expectedBasePlanId: string;
}

export type MapGoogleSubscriptionRejectionReason =
  | 'wrong_package'
  | 'wrong_product'
  | 'no_matching_line_item'
  | 'ambiguous_line_items';

export type MapGoogleSubscriptionResult =
  | { ok: true; snapshot: Omit<VerifiedSubscriptionSnapshot, 'raw'> }
  | { ok: false; reason: MapGoogleSubscriptionRejectionReason; detail: string }
  /**
   * `SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED` -- NO es un rechazo (el
   * token se verifico con exito) ni un snapshot (nunca es una fila
   * `AccountSubscription`). Es una DISPOSICION propia: la compra pendiente se
   * cancelo. `linkedPurchaseToken` (si Google lo trae) es la suscripcion
   * EXISTENTE cuya estado autoritativo debe consultarse en su lugar.
   */
  | { ok: false; pendingPurchaseCanceled: true; linkedPurchaseToken: string | null; detail: string };

/**
 * Mapea el `subscriptionState` string de Google a un estado normalizado.
 *
 * FAIL-CLOSED: `SUBSCRIPTION_STATE_UNSPECIFIED` y CUALQUIER valor no
 * reconocido (enum futuro) -> `EXPIRED` (no-entitled) + `recognized: false`.
 * NUNCA se mapea un valor desconocido a `ACTIVE`.
 *
 * Nota: `SubscriptionPurchaseV2` no tiene un estado "revoked" -- la
 * revocacion/reembolso llega como notificacion RTDN (`SUBSCRIPTION_REVOKED`)
 * en C3.3; el mapper de C3.2 nunca produce `REVOKED`.
 */
export function mapGoogleSubscriptionState(raw: string | undefined): {
  state: NormalizedSubscriptionState;
  recognized: boolean;
} {
  switch (raw) {
    case GOOGLE_SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED:
      // Estado ACTUAL de Google, manejado AGUAS ARRIBA por
      // `mapGoogleSubscription` como una disposicion dedicada (nunca una fila
      // `AccountSubscription`). NO cae por el `default` de "enum desconocido":
      // se trata EXPLICITAMENTE. Si un llamador lo pasara aqui igualmente,
      // fail-closed -- NO reconocido, NO entitled, jamas `ACTIVE`.
      return { state: 'EXPIRED', recognized: false };
    case 'SUBSCRIPTION_STATE_PENDING':
      return { state: 'PENDING', recognized: true };
    case 'SUBSCRIPTION_STATE_ACTIVE':
      return { state: 'ACTIVE', recognized: true };
    case 'SUBSCRIPTION_STATE_PAUSED':
      return { state: 'PAUSED', recognized: true };
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return { state: 'IN_GRACE_PERIOD', recognized: true };
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      return { state: 'ON_HOLD', recognized: true };
    case 'SUBSCRIPTION_STATE_CANCELED':
      return { state: 'CANCELED', recognized: true };
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return { state: 'EXPIRED', recognized: true };
    default:
      // UNSPECIFIED o un enum futuro no documentado -> fail-closed.
      return { state: 'EXPIRED', recognized: false };
  }
}

/**
 * Selecciona el UNICO line item que corresponde al producto ZETRYND. NUNCA
 * `lineItems[0]` a ciegas (`lineItems` es un array y podria traer varios).
 *
 *   - coincide `productId`;
 *   - si el line item trae `offerDetails.basePlanId`, debe ser el esperado
 *     (`premium-monthly`); si lo omite, el match por `productId` basta;
 *   - 0 coincidencias        -> `no_matching_line_item`;
 *   - >1 coincidencias       -> `ambiguous_line_items` (V1 vende exactamente 1).
 */
function selectZetryndLineItem(
  lineItems: GoogleSubscriptionPurchaseLineItem[],
  expectedProductId: string,
  expectedBasePlanId: string,
):
  | { ok: true; item: GoogleSubscriptionPurchaseLineItem }
  | { ok: false; reason: 'no_matching_line_item' | 'ambiguous_line_items'; detail: string } {
  const matches = lineItems.filter((li) => {
    if (li.productId !== expectedProductId) return false;
    const basePlanId = li.offerDetails?.basePlanId;
    return basePlanId === undefined || basePlanId === expectedBasePlanId;
  });
  if (matches.length === 0) {
    const seen = lineItems.map((li) => `${li.productId ?? '?'}/${li.offerDetails?.basePlanId ?? '?'}`).join(', ');
    return { ok: false, reason: 'no_matching_line_item', detail: `ningun line item = ${expectedProductId}/${expectedBasePlanId} (vistos: ${seen || 'ninguno'})` };
  }
  if (matches.length > 1) {
    return { ok: false, reason: 'ambiguous_line_items', detail: `${matches.length} line items coinciden con ${expectedProductId} -- V1 vende exactamente 1` };
  }
  return { ok: true, item: matches[0]! };
}

function parseTimestamp(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function readCancelUserInitiated(ctx: GoogleSubscriptionPurchaseV2['canceledStateContext']): boolean | null {
  if (!ctx) return null;
  if (ctx.userInitiatedCancellation !== undefined) return true;
  if (ctx.systemInitiatedCancellation !== undefined || ctx.developerInitiatedCancellation !== undefined || ctx.replacementCancellation !== undefined) {
    return false;
  }
  return null;
}

export function mapGoogleSubscription(
  raw: GoogleSubscriptionPurchaseV2,
  ctx: MapGoogleSubscriptionContext,
): MapGoogleSubscriptionResult {
  // 1. packageName -- `subscriptionsv2.get` no lo devuelve en el body; se
  //    valida el que el adaptador consulto contra la constante ZETRYND.
  if (ctx.queriedPackageName !== ctx.expectedPackageName) {
    return { ok: false, reason: 'wrong_package', detail: `consultado "${ctx.queriedPackageName}", esperado "${ctx.expectedPackageName}"` };
  }

  // 2. Compra pendiente CANCELADA -- disposicion propia, ANTES de exigir un
  //    line item (una compra pendiente cancelada puede no traer uno bien
  //    formado). Nunca se convierte en una fila; si `linkedPurchaseToken`
  //    esta presente, es la suscripcion existente que hay que reconsultar.
  if (raw.subscriptionState === GOOGLE_SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED) {
    return {
      ok: false,
      pendingPurchaseCanceled: true,
      linkedPurchaseToken: raw.linkedPurchaseToken ?? null,
      detail: raw.linkedPurchaseToken
        ? `compra pendiente cancelada; suscripcion existente linkeada = ${raw.linkedPurchaseToken.slice(0, 6)}...`
        : 'compra pendiente inicial cancelada (sin suscripcion previa)',
    };
  }

  // 3. line item ZETRYND (nunca lineItems[0]).
  const lineItems = raw.lineItems ?? [];
  const selection = selectZetryndLineItem(lineItems, ctx.expectedProductId, ctx.expectedBasePlanId);
  if (!selection.ok) {
    return selection;
  }
  const item = selection.item;

  // 4. productId defensivo (redundante con la seleccion, explicito).
  if (item.productId !== ctx.expectedProductId) {
    return { ok: false, reason: 'wrong_product', detail: `line item productId "${item.productId}" != "${ctx.expectedProductId}"` };
  }

  // 5. estado normalizado (fail-closed para desconocidos).
  const rawState = raw.subscriptionState ?? 'SUBSCRIPTION_STATE_UNSPECIFIED';
  const { state, recognized } = mapGoogleSubscriptionState(rawState);

  return {
    ok: true,
    snapshot: {
      packageName: ctx.expectedPackageName,
      purchaseToken: ctx.purchaseToken,
      linkedPurchaseToken: raw.linkedPurchaseToken ?? null,
      state,
      recognizedState: recognized,
      rawSubscriptionState: rawState,
      productId: item.productId ?? ctx.expectedProductId,
      basePlanId: item.offerDetails?.basePlanId ?? null,
      expiryTime: parseTimestamp(item.expiryTime),
      startTime: parseTimestamp(raw.startTime),
      autoRenewing: item.autoRenewingPlan?.autoRenewEnabled === true,
      acknowledged: raw.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
      testPurchase: raw.testPurchase !== undefined && raw.testPurchase !== null,
      regionCode: raw.regionCode ?? null,
      obfuscatedExternalAccountId: raw.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
      cancelUserInitiated: readCancelUserInitiated(raw.canceledStateContext),
      // Re-alta fuera de la app tras expiracion total. Se auto-referencia
      // (== este mismo token) -> se ignora (contexto inconsistente); el
      // servicio ademas hace fail-closed ante cadenas de propiedad imposibles.
      expiredPurchaseToken:
        raw.outOfAppPurchaseContext?.expiredPurchaseToken &&
        raw.outOfAppPurchaseContext.expiredPurchaseToken !== ctx.purchaseToken
          ? raw.outOfAppPurchaseContext.expiredPurchaseToken
          : null,
      expiredObfuscatedExternalAccountId:
        raw.outOfAppPurchaseContext?.expiredExternalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
    },
  };
}
