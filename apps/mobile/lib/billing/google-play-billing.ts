import type { ProductSubscription, ProductSubscriptionAndroid, SubscriptionOffer } from 'expo-iap';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-2A.
 *
 * Constantes + logica PURA de seleccion/normalizacion del producto de
 * suscripcion de ZETRYND. Sin efectos, sin conexion, sin React -- toma la
 * salida de `fetchProducts` de expo-iap 5.5.1 y devuelve o un producto
 * normalizado listo para la UI, o un motivo de fallo controlado.
 *
 * NO lanza compra. NO expone `purchaseToken`. El `offerToken` (Android) SI se
 * preserva verbatim -- es lo que PB-2B pasara a `requestPurchase`.
 *
 * Identificadores CONGELADOS (espejo del backend `subscription-product.ts`,
 * ADR C3.0 §C -- no configurables por entorno ni cliente).
 */
export const ZETRYND_PREMIUM_PRODUCT_ID = 'zetrynd_premium';
export const ZETRYND_PREMIUM_BASE_PLAN_ID = 'premium-monthly';

/** Google Play Billing `recurrenceMode`: pago recurrente indefinido (el precio "estandar" mensual). */
const RECURRENCE_MODE_INFINITE_RECURRING = 1;

/**
 * Producto normalizado -- SOLO lo que la paywall / PB-2B necesitan. Nunca
 * contiene `purchaseToken` ni metadata de plataforma en crudo.
 */
export interface NormalizedPremiumProduct {
  productId: string;
  title: string;
  description: string;
  /** Precio LOCALIZADO tal cual lo formatea Google Play (nunca reconstruido de micros). */
  localizedPrice: string;
  /** ISO 4217, si Google lo entrega. */
  currencyCode: string | null;
  basePlanId: string;
  /** `offerTokenAndroid` VERBATIM -- requerido por `requestPurchase` en PB-2B. */
  offerToken: string;
}

export type PremiumOfferSelection =
  | { ok: true; product: ProductSubscriptionAndroid; offer: SubscriptionOffer }
  | {
      ok: false;
      reason:
        | 'product-not-found' // el SKU zetrynd_premium no vino en la respuesta
        | 'product-status-not-ok' // Google reporta NOT_FOUND / NO_OFFERS_AVAILABLE
        | 'base-plan-not-found' // ningun offer con basePlanIdAndroid === 'premium-monthly'
        | 'base-plan-ambiguous' // >1 offer del base plan y no se puede resolver el recurrente
        | 'no-offer-token' // el offer elegido no trae offerTokenAndroid
        | 'not-android'; // iOS / runtime sin metadata Android
    };

function isAndroidSubscription(p: ProductSubscription): p is ProductSubscriptionAndroid {
  return p.platform === 'android' && p.type === 'subs';
}

/** ¿Este offer es el plan base recurrente (sin fase de prueba/intro)? */
function isRecurringBasePlanOffer(offer: SubscriptionOffer): boolean {
  const phases = offer.pricingPhasesAndroid?.pricingPhaseList ?? [];
  if (phases.length === 0) return true; // sin fases detalladas -> se asume plan base simple
  // Exactamente una fase y es recurrente-indefinida == plan base puro, sin trial/intro.
  return phases.length === 1 && phases[0]?.recurrenceMode === RECURRENCE_MODE_INFINITE_RECURRING;
}

/**
 * Selecciona DETERMINISTICAMENTE el offer del plan base mensual de ZETRYND.
 * NUNCA "el primer offer": filtra por `basePlanIdAndroid === 'premium-monthly'`
 * y, si hay mas de uno, exige que exactamente uno sea el recurrente puro.
 */
export function selectPremiumMonthlyOffer(subscriptions: ProductSubscription[]): PremiumOfferSelection {
  const product = subscriptions.find((p) => p.id === ZETRYND_PREMIUM_PRODUCT_ID);
  if (!product) return { ok: false, reason: 'product-not-found' };
  if (!isAndroidSubscription(product)) return { ok: false, reason: 'not-android' };

  if (product.productStatusAndroid && product.productStatusAndroid !== 'ok') {
    return { ok: false, reason: 'product-status-not-ok' };
  }

  const basePlanOffers = product.subscriptionOffers.filter(
    (o) => o.basePlanIdAndroid === ZETRYND_PREMIUM_BASE_PLAN_ID,
  );
  if (basePlanOffers.length === 0) return { ok: false, reason: 'base-plan-not-found' };

  let offer: SubscriptionOffer;
  if (basePlanOffers.length === 1) {
    offer = basePlanOffers[0]!;
  } else {
    // ZETRYND V1 no tiene ofertas promocionales -> >1 offer del base plan es
    // metadata inesperada. Solo se acepta si EXACTAMENTE uno es el recurrente puro.
    const recurring = basePlanOffers.filter(isRecurringBasePlanOffer);
    if (recurring.length !== 1) return { ok: false, reason: 'base-plan-ambiguous' };
    offer = recurring[0]!;
  }

  if (!offer.offerTokenAndroid) return { ok: false, reason: 'no-offer-token' };
  return { ok: true, product, offer };
}

/**
 * Extrae el precio LOCALIZADO estandar del offer del plan base: la fase de
 * precio recurrente-indefinida (`recurrenceMode === 1`). NUNCA
 * `pricingPhaseList[last]` a ciegas -- si hay fases de trial/intro, se ignoran
 * para el "precio mensual estandar". Devuelve tambien si hubo fases
 * promocionales inesperadas (para reportar).
 */
export function resolveStandardMonthlyPrice(offer: SubscriptionOffer): {
  localizedPrice: string | null;
  currencyCode: string | null;
  unexpectedPromotionalPhases: boolean;
} {
  const phases = offer.pricingPhasesAndroid?.pricingPhaseList ?? [];
  const recurringPhases = phases.filter((p) => p.recurrenceMode === RECURRENCE_MODE_INFINITE_RECURRING);
  const unexpectedPromotionalPhases = phases.length > recurringPhases.length;

  if (recurringPhases.length === 1) {
    const phase = recurringPhases[0]!;
    return { localizedPrice: phase.formattedPrice, currencyCode: phase.priceCurrencyCode ?? null, unexpectedPromotionalPhases };
  }
  // Sin fases detalladas o forma inesperada -> el precio de display del offer
  // (formateado por Google) es el fallback, nunca un string reconstruido.
  return {
    localizedPrice: offer.displayPrice || null,
    currencyCode: offer.currency ?? null,
    unexpectedPromotionalPhases,
  };
}

export function normalizePremiumProduct(
  product: ProductSubscriptionAndroid,
  offer: SubscriptionOffer,
): NormalizedPremiumProduct | null {
  const { localizedPrice, currencyCode } = resolveStandardMonthlyPrice(offer);
  const price = localizedPrice ?? (product.displayPrice || null);
  if (!price || !offer.offerTokenAndroid) return null;

  return {
    productId: product.id,
    title: product.title,
    description: product.description,
    localizedPrice: price,
    currencyCode,
    basePlanId: ZETRYND_PREMIUM_BASE_PLAN_ID,
    offerToken: offer.offerTokenAndroid,
  };
}
