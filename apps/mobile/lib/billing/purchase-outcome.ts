import {
  SUBSCRIPTION_ACCOUNT_MISMATCH_CODE,
  SUBSCRIPTION_INVALID_CODE,
  SUBSCRIPTION_UNVERIFIABLE_CODE,
  type SubscriptionReconcileResponse,
} from '@axioma/contracts';
import type { Purchase } from 'expo-iap';
import type { ApiResult } from '../api/client';
import { ZETRYND_PREMIUM_PRODUCT_ID } from './google-play-billing';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-2B.
 *
 * Logica PURA de la orquestacion de compra/restore: mapea la respuesta del
 * backend reconcile a un resultado normalizado, y filtra/deduplica los
 * `purchaseToken` de un restore. Sin React, sin efectos, sin conexion, sin
 * `console`. NUNCA expone un `purchaseToken` fuera de estas estructuras.
 *
 * INVARIANTE: el UNICO resultado que autoriza refrescar el entitlement es
 * `verified`. `pending` / `canceled` / los errores de atribucion NUNCA
 * conceden Premium desde el cliente -- la verdad es SIEMPRE `GET /me/entitlement`
 * y, para el resto, el worker RTDN del backend + un pase de reconciliacion al
 * reanudar la app.
 */
export type ReconcileOutcome =
  /** El token se verifico con Google y se reconcilio. UNICO caso que refresca entitlement. */
  | { kind: 'verified' }
  /** Google reporta la compra pendiente de pago. NO concede acceso. */
  | { kind: 'pending' }
  /** Era una compra PENDIENTE que se cancelo antes de completarse. NO es exito. */
  | { kind: 'canceled' }
  /** 409 -- el token pertenece a OTRA cuenta ZETRYND. */
  | { kind: 'account_mismatch' }
  /** 422 -- no se pudo atribuir la compra (sin ref externa / sin billingAccountRef). */
  | { kind: 'unverifiable' }
  /** 400 -- la compra no corresponde a ZETRYND Premium. */
  | { kind: 'invalid' }
  /** 503 / 5xx / red / desviacion de contrato -- transitorio, seguro de reintentar. */
  | { kind: 'retryable' };

/** ¿Este resultado autoriza un `entitlement.refresh()`? SOLO `verified`. */
export function outcomeGrantsRefresh(outcome: ReconcileOutcome): boolean {
  return outcome.kind === 'verified';
}

/** ¿Este resultado es terminal para ESTE token (no reintentar el reconcile)? */
export function outcomeIsTerminalForToken(outcome: ReconcileOutcome): boolean {
  return outcome.kind !== 'retryable';
}

export function mapReconcileResult(
  result: ApiResult<SubscriptionReconcileResponse>,
): ReconcileOutcome {
  if (result.ok) {
    switch (result.data.status) {
      case 'verified':
        return { kind: 'verified' };
      case 'pending':
        return { kind: 'pending' };
      case 'canceled':
        return { kind: 'canceled' };
    }
  }
  if (result.kind === 'http') {
    if (result.status === 409 || result.code === SUBSCRIPTION_ACCOUNT_MISMATCH_CODE) {
      return { kind: 'account_mismatch' };
    }
    if (result.status === 422 || result.code === SUBSCRIPTION_UNVERIFIABLE_CODE) {
      return { kind: 'unverifiable' };
    }
    if (result.status === 400 || result.code === SUBSCRIPTION_INVALID_CODE) {
      return { kind: 'invalid' };
    }
    // 401 lo maneja el handler global de sesion; 429/503/5xx -> reintentable.
    return { kind: 'retryable' };
  }
  // 'network' | 'schema' -> reintentable.
  return { kind: 'retryable' };
}

/**
 * De la lista cruda de `getAvailablePurchases()`, quedarse SOLO con los tokens
 * de suscripcion de Android reconciliables:
 *   - plataforma Android con `purchaseToken` no vacio;
 *   - `productId` (o `ids`) === el producto congelado `zetrynd_premium`;
 *   - estado distinto de `pending` (una compra pendiente no se "restaura");
 *   - `purchaseToken` DEDUPLICADO (Google puede listar la misma varias veces).
 *
 * Devuelve solo `{ token }` -- nunca el objeto `Purchase` crudo hacia la UI.
 */
export function selectRestorableSubscriptionTokens(purchases: Purchase[]): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const p of purchases) {
    if (p.purchaseState === 'pending') continue;
    const token = p.purchaseToken ?? undefined;
    if (!token) continue;
    const ids = new Set<string>([p.productId, ...(p.ids ?? [])].filter(Boolean));
    if (!ids.has(ZETRYND_PREMIUM_PRODUCT_ID)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

/** ¿Este `Purchase` de un callback esta pendiente de pago? (no reconciliar como exito, no conceder). */
export function purchaseIsPending(purchase: Purchase): boolean {
  return purchase.purchaseState === 'pending';
}

/**
 * Extrae el `purchaseToken` de un `Purchase` de callback. `null` si falta o
 * viene vacio -- una request de reconcile malformada nunca se envia.
 */
export function purchaseTokenOf(purchase: Purchase): string | null {
  const token = purchase.purchaseToken;
  return typeof token === 'string' && token.length > 0 ? token : null;
}
