/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * FRONTERA de autenticacion del push de Pub/Sub. El endpoint RTDN NO usa el
 * `AuthGuard` de usuario ni el `InternalOpsGuard`: Google Cloud Pub/Sub es el
 * llamador y se autentica con un `Authorization: Bearer <OIDC JWT>` firmado por
 * Google. Este puerto verifica ese token; el adaptador real usa la libreria de
 * Google, el fake (gates) no toca la red.
 */

export interface RtdnPushIdentity {
  /** `email` del payload OIDC -- debe ser la service account de push esperada. */
  email: string;
  /** `aud` del payload -- debe ser la audiencia esperada (normalmente la URL del endpoint). */
  audience: string;
}

export type RtdnPushAuthErrorReason =
  | 'not_configured'
  | 'missing_bearer'
  | 'invalid_token'
  | 'wrong_audience'
  | 'wrong_service_account'
  | 'email_not_verified'
  | 'expired';

/** Fallo de autenticacion del push. NUNCA lleva el token crudo. */
export class RtdnPushAuthError extends Error {
  readonly reason: RtdnPushAuthErrorReason;
  constructor(message: string, reason: RtdnPushAuthErrorReason) {
    super(message);
    this.name = 'RtdnPushAuthError';
    this.reason = reason;
  }
}

export interface RtdnPushAuthenticator {
  /**
   * Verifica el header `Authorization` de un push de Pub/Sub. Lanza
   * `RtdnPushAuthError` ante cualquier fallo (sin bearer, firma invalida,
   * audiencia/SA equivocada, email no verificado, expirado, sin config).
   * NUNCA acepta un token que no pueda verificar.
   */
  authenticate(authorizationHeader: string | undefined): Promise<RtdnPushIdentity>;
}

export const RTDN_PUSH_AUTHENTICATOR = Symbol('RTDN_PUSH_AUTHENTICATOR');

export interface RtdnAuthConfig {
  /** `aud` esperado en el token OIDC. */
  expectedAudience: string;
  /** `email` esperado (service account de push de Pub/Sub). */
  expectedServiceAccountEmail: string;
}

/**
 * Lee y valida la config de auth RTDN. Devuelve `null` con detalle si falta
 * algo -- el llamador decide (fail-closed) segun `NODE_ENV`.
 */
export function readRtdnAuthConfig(
  audience: string | undefined,
  serviceAccountEmail: string | undefined,
): { ok: true; config: RtdnAuthConfig } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  if (!audience || audience.trim() === '') missing.push('GOOGLE_PLAY_RTDN_OIDC_AUDIENCE');
  if (!serviceAccountEmail || serviceAccountEmail.trim() === '') missing.push('GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL');
  if (missing.length > 0) return { ok: false, missing };
  return {
    ok: true,
    config: { expectedAudience: audience!.trim(), expectedServiceAccountEmail: serviceAccountEmail!.trim() },
  };
}

/** Extrae el JWT de un header `Authorization: Bearer <jwt>` (sin validarlo). */
export function extractBearer(authorizationHeader: string | undefined): string | null {
  if (typeof authorizationHeader !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  return match ? match[1]!.trim() : null;
}
