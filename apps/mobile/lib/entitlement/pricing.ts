/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.0.
 *
 * ============================================================================
 *  TEMPORARY PRE-BILLING DISPLAY ONLY
 * ============================================================================
 * `$6.990 CLP / mes` es contrato de PRODUCTO, no de API. Se muestra
 * UNICAMENTE en el paywall (`components/premium/premium-paywall.tsx`, Capa 2).
 *
 *   - NUNCA aparece en `GET /me/entitlement`, ni en el entitlement backend,
 *     ni en el contrato compartido `@axioma/contracts` (Capa 1 lo excluyo a
 *     proposito; `verify:premium-contract-gate` lo protege).
 *   - NUNCA lo importa ningun `lib/api/*`.
 *   - UNICA ubicacion en mobile -- no duplicar el string en componentes.
 *
 * Capa 3 (Google Play Billing) REEMPLAZA esta constante por el precio real
 * leido de la metadata del Store, sin tocar ninguna pantalla: el paywall
 * seguira leyendo de aqui.
 */
export const PREMIUM_PRICE_DISPLAY = '$6.990 CLP / mes';
