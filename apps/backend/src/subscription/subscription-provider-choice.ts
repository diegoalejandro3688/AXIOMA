/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2 (hardening).
 *
 * Decision PURA de que adaptador de proveedor usar. El adaptador FAKE es
 * valido para local/test, pero PRODUCCION nunca cae en el a escondidas: un
 * `purchaseToken` fake no verificado JAMAS puede conceder PREMIUM.
 *
 * Matriz (task C3.2 hardening seccion A):
 *   no-produccion + fake/default   -> `fake`
 *   produccion   + provider=google -> `google`
 *   produccion   + falta provider  -> RECHAZO al arrancar (fail-closed)
 *   produccion   + provider=fake    -> RECHAZO al arrancar (fail-closed)
 *
 * Mismo criterio que `AuthModule` con `AUTH_IDENTITY_PROVIDER=stub` en
 * produccion (identidad y billing son fronteras de seguridad; el fake de
 * IA, en cambio, es una degradacion aceptable, no un agujero). Se elige el
 * RECHAZO al arrancar (no un 503 diferido) para que una mala configuracion
 * de una feature de pago sea imposible de desplegar.
 */
export type SubscriptionProviderChoice = { use: 'google' } | { use: 'fake' } | { reject: string };

export function resolveSubscriptionProviderChoice(
  nodeEnv: string | undefined,
  impl: string | undefined,
): SubscriptionProviderChoice {
  if (impl === 'google') return { use: 'google' };
  if (nodeEnv === 'production') {
    return {
      reject:
        `GOOGLE_PLAY_PROVIDER_IMPL debe ser "google" en produccion (recibido: "${impl ?? '(sin valor)'}"). ` +
        'El adaptador fake de Google Play NUNCA se usa en produccion -- un purchaseToken fake no verificado no puede conceder PREMIUM.',
    };
  }
  return { use: 'fake' };
}
