import { Injectable } from '@nestjs/common';
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
 * Verificador OIDC FAKE, determinista, sin red -- el impl por defecto en
 * local/test y el que usan los gates. NO valida una firma real; el "token" es
 * el claim set codificado directamente:
 *
 *   `fake-rtdn-oidc:<b64url({ email, aud, email_verified?, exp? })>`
 *
 * Aun asi aplica EXACTAMENTE las mismas comprobaciones de negocio que el real
 * (audiencia esperada, service account esperada, `email_verified === true`,
 * expiracion) para que los gates cubran cada camino de rechazo.
 */
interface FakeOidcClaims {
  email?: string;
  aud?: string;
  email_verified?: boolean;
  /** segundos epoch */
  exp?: number;
}

export function encodeFakeRtdnOidcToken(claims: FakeOidcClaims): string {
  return `fake-rtdn-oidc:${Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url')}`;
}

@Injectable()
export class FakeRtdnPushAuthenticator implements RtdnPushAuthenticator {
  constructor(private readonly config: RtdnAuthConfig) {}

  async authenticate(authorizationHeader: string | undefined): Promise<RtdnPushIdentity> {
    const bearer = extractBearer(authorizationHeader);
    if (!bearer) {
      throw new RtdnPushAuthError('falta el header Authorization: Bearer', 'missing_bearer');
    }
    if (!bearer.startsWith('fake-rtdn-oidc:')) {
      throw new RtdnPushAuthError('token OIDC fake con formato invalido', 'invalid_token');
    }
    let claims: FakeOidcClaims;
    try {
      claims = JSON.parse(
        Buffer.from(bearer.slice('fake-rtdn-oidc:'.length), 'base64url').toString('utf8'),
      ) as FakeOidcClaims;
    } catch {
      throw new RtdnPushAuthError('token OIDC fake no decodificable', 'invalid_token');
    }

    if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
      throw new RtdnPushAuthError('token OIDC expirado', 'expired');
    }
    if (claims.aud !== this.config.expectedAudience) {
      throw new RtdnPushAuthError('audiencia OIDC inesperada', 'wrong_audience');
    }
    if (claims.email !== this.config.expectedServiceAccountEmail) {
      throw new RtdnPushAuthError('service account de push inesperada', 'wrong_service_account');
    }
    if (claims.email_verified !== true) {
      throw new RtdnPushAuthError('email de la service account no verificado', 'email_not_verified');
    }
    return { email: claims.email, audience: claims.aud };
  }
}
