import { OAuth2Client } from 'google-auth-library';
import {
  RtdnPushAuthError,
  extractBearer,
  type RtdnAuthConfig,
  type RtdnPushAuthenticator,
  type RtdnPushIdentity,
} from './rtdn-push-authenticator.port';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * Verificador OIDC REAL del push autenticado de Google Cloud Pub/Sub. Usa
 * `google-auth-library` (`OAuth2Client.verifyIdToken`), que descarga y cachea
 * los certificados publicos de Google por su cuenta -- sin credenciales de
 * service account propias.
 *
 * Se construye SOLO con `GOOGLE_PLAY_RTDN_AUTH_IMPL=google` (ver
 * `subscription.module.ts`). En local normal nunca se instancia ni abre red.
 * NUNCA loguea el bearer.
 *
 * NOTA: sus rutas se COMPILAN pero se ejercitan con Google real recien en
 * C3.4+ (Pub/Sub + push subscription). Los gates corren contra el fake.
 */
export class GoogleRtdnPushAuthenticator implements RtdnPushAuthenticator {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: RtdnAuthConfig) {}

  async authenticate(authorizationHeader: string | undefined): Promise<RtdnPushIdentity> {
    const bearer = extractBearer(authorizationHeader);
    if (!bearer) {
      throw new RtdnPushAuthError('falta el header Authorization: Bearer', 'missing_bearer');
    }

    let payload: import('google-auth-library').TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: bearer,
        audience: this.config.expectedAudience,
      });
      payload = ticket.getPayload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'desconocido';
      if (/expired|exp/i.test(message)) {
        throw new RtdnPushAuthError('token OIDC expirado', 'expired');
      }
      if (/audience|aud/i.test(message)) {
        throw new RtdnPushAuthError('audiencia OIDC inesperada', 'wrong_audience');
      }
      throw new RtdnPushAuthError('firma / formato del token OIDC invalido', 'invalid_token');
    }

    if (!payload) {
      throw new RtdnPushAuthError('token OIDC sin payload', 'invalid_token');
    }
    if (payload.aud !== this.config.expectedAudience) {
      throw new RtdnPushAuthError('audiencia OIDC inesperada', 'wrong_audience');
    }
    if (payload.email !== this.config.expectedServiceAccountEmail) {
      throw new RtdnPushAuthError('service account de push inesperada', 'wrong_service_account');
    }
    if (payload.email_verified !== true) {
      throw new RtdnPushAuthError('email de la service account no verificado', 'email_not_verified');
    }
    return { email: payload.email, audience: payload.aud };
  }
}
