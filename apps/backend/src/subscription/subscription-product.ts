/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
 *
 * Identificadores de producto CONGELADOS de V1 (ADR C3.0 seccion C, Q-2).
 * NO son configurables por entorno ni por el cliente: la identidad real del
 * producto la determina SIEMPRE la verificacion con Google
 * (`subscriptions v2.get`), y el backend rechaza cualquier snapshot que no
 * corresponda a estos valores.
 *
 * V1 vende EXACTAMENTE un producto con un unico base plan mensual
 * auto-renovable. Sin ofertas, sin plan anual, sin add-ons, sin multiples
 * tiers.
 */
export const ZETRYND_PLAY_PACKAGE_NAME = 'com.zetrynd.app';
export const ZETRYND_PREMIUM_PRODUCT_ID = 'zetrynd_premium';
export const ZETRYND_PREMIUM_BASE_PLAN_ID = 'premium-monthly';
