/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2 (hardening) + RC1B.1.
 *
 * Decision PURA de que adaptador de proveedor usar. El adaptador FAKE es
 * valido para local/test, pero PRODUCCION nunca cae en el a escondidas: un
 * `purchaseToken` fake no verificado JAMAS puede conceder PREMIUM.
 *
 * Matriz:
 *   no-produccion + fake/default   -> `fake`
 *   cualquiera    + provider=google -> `google` (exige credenciales; falla cerrado si faltan)
 *   cualquiera    + provider=disabled -> `disabled` (postura CONGELADA -- ver abajo)
 *   produccion    + falta provider  -> RECHAZO al arrancar (fail-closed)
 *   produccion    + provider=fake / otro -> RECHAZO al arrancar (fail-closed)
 *
 * RC1B.1 -- POSTURA CONGELADA (`disabled`): mientras Google Play Billing sigue
 * intencionalmente CONGELADO (sin Play Console, sin service account, sin
 * RTDN), `GOOGLE_PLAY_PROVIDER_IMPL=disabled` permite ARRANCAR en
 * `NODE_ENV=production` con Premium desactivado -- NUNCA con un fake que
 * simule verificacion. `disabled` debe ser EXPLICITO: el impl ausente en
 * produccion sigue siendo un rechazo (nunca un "disabled" implicito). El
 * adaptador `disabled` no contacta Google, no verifica compras, no concede
 * PREMIUM y no requiere credenciales; toda operacion de reconciliacion
 * devuelve 503 (categoria `disabled` -> `mapProviderError`).
 *
 * Mismo criterio que `AuthModule` con `AUTH_IDENTITY_PROVIDER=stub` en
 * produccion (identidad y billing son fronteras de seguridad; el fake de
 * IA, en cambio, es una degradacion aceptable, no un agujero). Se elige el
 * RECHAZO al arrancar (no un 503 diferido) para que una mala configuracion
 * de una feature de pago sea imposible de desplegar.
 */
export type SubscriptionProviderChoice =
  | { use: 'google' }
  | { use: 'fake' }
  | { use: 'disabled' }
  | { reject: string };

export function resolveSubscriptionProviderChoice(
  nodeEnv: string | undefined,
  impl: string | undefined,
): SubscriptionProviderChoice {
  if (impl === 'google') return { use: 'google' };
  // Postura CONGELADA explicita -- valida en cualquier NODE_ENV, antes del
  // rechazo de produccion. NUNCA se infiere: sin impl en produccion se rechaza.
  if (impl === 'disabled') return { use: 'disabled' };
  if (nodeEnv === 'production') {
    return {
      reject:
        `GOOGLE_PLAY_PROVIDER_IMPL debe ser "google" o "disabled" en produccion (recibido: "${impl ?? '(sin valor)'}"). ` +
        'El adaptador fake de Google Play NUNCA se usa en produccion -- un purchaseToken fake no verificado no puede conceder PREMIUM.',
    };
  }
  return { use: 'fake' };
}
