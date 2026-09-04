import { RtdnPushAuthError, type RtdnPushAuthenticator, type RtdnPushIdentity } from './rtdn-push-authenticator.port';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), RC1B.1: POSTURA CONGELADA.
 *
 * Autenticador que se selecciona con `GOOGLE_PLAY_RTDN_AUTH_IMPL=disabled`
 * mientras RTDN sigue intencionalmente congelado (sin Pub/Sub, sin OIDC).
 * Permite ARRANCAR el backend en `NODE_ENV=production` sin verificador OIDC y
 * sin `GOOGLE_PLAY_RTDN_OIDC_AUDIENCE` / `..._PUSH_SERVICE_ACCOUNT_EMAIL`.
 *
 * Garantias:
 *   - RECHAZA todo push: `authenticate()` SIEMPRE lanza (nunca acepta un token
 *     que no puede verificar -- misma regla que el autenticador real).
 *   - NO contacta Google, NO requiere credenciales, NO acepta un fake-exito.
 *
 * `RtdnIngestionService` captura `RtdnPushAuthError` y responde 401 al push,
 * sin filtrar el motivo ni el token. Ademas, con `disabled` el worker del
 * buzon NO se agenda (`rtdnProcessingEnabled` -> false).
 */
export class DisabledRtdnPushAuthenticator implements RtdnPushAuthenticator {
  authenticate(_authorizationHeader: string | undefined): Promise<RtdnPushIdentity> {
    return Promise.reject(
      new RtdnPushAuthError(
        'RTDN esta en postura CONGELADA (GOOGLE_PLAY_RTDN_AUTH_IMPL=disabled) -- ningun push se autentica.',
        'not_configured',
      ),
    );
  }
}
