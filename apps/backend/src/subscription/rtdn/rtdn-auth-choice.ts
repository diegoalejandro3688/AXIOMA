/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3 + RC1B.1.
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
 *   cualquiera    + impl=disabled      -> `disabled` (postura CONGELADA)
 *   produccion    + falta impl         -> RECHAZO al arrancar (fail-closed)
 *   produccion    + impl=fake / otro   -> RECHAZO al arrancar (fail-closed)
 *
 * RC1B.1 -- POSTURA CONGELADA (`disabled`): mientras RTDN sigue
 * intencionalmente CONGELADO, `GOOGLE_PLAY_RTDN_AUTH_IMPL=disabled` permite
 * ARRANCAR en `NODE_ENV=production` sin verificador OIDC y sin config OIDC.
 * El autenticador `disabled` rechaza TODO push (nunca acepta un token que no
 * pueda verificar) y el worker de procesamiento NO se agenda (ver
 * `rtdnProcessingEnabled` / `RtdnProcessingScheduler`). `disabled` debe ser
 * EXPLICITO -- el impl ausente en produccion sigue siendo un rechazo.
 */
export type RtdnAuthChoice = { use: 'google' } | { use: 'fake' } | { use: 'disabled' } | { reject: string };

export function resolveRtdnAuthChoice(
  nodeEnv: string | undefined,
  impl: string | undefined,
): RtdnAuthChoice {
  if (impl === 'google') return { use: 'google' };
  // Postura CONGELADA explicita -- antes del rechazo de produccion; nunca implicita.
  if (impl === 'disabled') return { use: 'disabled' };
  if (nodeEnv === 'production') {
    return {
      reject:
        `GOOGLE_PLAY_RTDN_AUTH_IMPL debe ser "google" o "disabled" en produccion (recibido: "${impl ?? '(sin valor)'}"). ` +
        'El verificador OIDC fake NUNCA se usa en produccion -- un push de Pub/Sub no verificado no puede disparar reconciliacion.',
    };
  }
  return { use: 'fake' };
}

/**
 * RC1B.1 -- `true` sii el worker del buzon RTDN debe agendarse. Con
 * `disabled` (o un `reject`, que ya aborta antes) NO se agenda: no hay push
 * que ingresar, nada que reconciliar con Google.
 */
export function rtdnProcessingEnabled(choice: RtdnAuthChoice): boolean {
  return !('reject' in choice) && choice.use !== 'disabled';
}
