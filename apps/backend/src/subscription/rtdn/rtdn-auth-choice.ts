/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * Decision PURA de que autenticador de push RTDN usar. Mismo criterio que
 * `resolveSubscriptionProviderChoice` (C3.2 hardening) y `AuthModule` con
 * `AUTH_IDENTITY_PROVIDER=stub`: el fake es valido en local/test, pero
 * PRODUCCION nunca cae en el a escondidas -- un push no verificado JAMAS puede
 * disparar una reconciliacion.
 *
 * Matriz:
 *   no-produccion + fake/default       -> `fake`
 *   cualquiera    + impl=google        -> `google`
 *   produccion    + falta impl         -> RECHAZO al arrancar (fail-closed)
 *   produccion    + impl=fake / otro   -> RECHAZO al arrancar (fail-closed)
 */
export type RtdnAuthChoice = { use: 'google' } | { use: 'fake' } | { reject: string };

export function resolveRtdnAuthChoice(
  nodeEnv: string | undefined,
  impl: string | undefined,
): RtdnAuthChoice {
  if (impl === 'google') return { use: 'google' };
  if (nodeEnv === 'production') {
    return {
      reject:
        `GOOGLE_PLAY_RTDN_AUTH_IMPL debe ser "google" en produccion (recibido: "${impl ?? '(sin valor)'}"). ` +
        'El verificador OIDC fake NUNCA se usa en produccion -- un push de Pub/Sub no verificado no puede disparar reconciliacion.',
    };
  }
  return { use: 'fake' };
}
