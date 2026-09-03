import { GoogleAuth } from 'google-auth-library';
import type { ConfigService } from '@nestjs/config';
import {
  SubscriptionProviderError,
  type SubscriptionProviderAdapter,
  type SubscriptionVerificationResult,
} from '../subscription-provider.port';
import {
  ZETRYND_PLAY_PACKAGE_NAME,
  ZETRYND_PREMIUM_BASE_PLAN_ID,
  ZETRYND_PREMIUM_PRODUCT_ID,
} from '../subscription-product';
import { mapGoogleSubscription } from './map-google-subscription';
import type { GoogleSubscriptionPurchaseV2 } from './google-subscription-v2.types';

const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const ANDROID_PUBLISHER_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
 *
 * Adaptador REAL de la Google Play Developer API (`androidpublisher` v3).
 * Cliente minimo backend-only: `google-auth-library` (JWT de service
 * account) + `fetch`. Sin `googleapis` completo.
 *
 * Se construye SOLO cuando `GOOGLE_PLAY_PROVIDER_IMPL=google` (ver
 * `subscription.module.ts`, `useFactory`). En desarrollo local normal el
 * impl por defecto es el FAKE -- este adaptador nunca se instancia, nunca
 * lee `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, nunca abre un cliente de red.
 *
 * Sin credenciales -> `SubscriptionProviderError('not_configured')`. NUNCA
 * fabrica un snapshot exitoso.
 *
 * NOTA: sus rutas se COMPILAN pero no se ejercitan con Google real en C3.2
 * -- eso empieza en C3.4 (Play Console + service account). Los gates corren
 * contra el fake.
 */
export class GooglePlaySubscriptionAdapter implements SubscriptionProviderAdapter {
  private auth: GoogleAuth | null = null;

  constructor(private readonly config: ConfigService) {}

  private getAuth(): GoogleAuth {
    if (this.auth) return this.auth;
    const raw = this.config.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
    if (!raw || raw.trim() === '') {
      throw new SubscriptionProviderError('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON no configurada', 'not_configured');
    }
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new SubscriptionProviderError('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON no es JSON valido', 'not_configured');
    }
    this.auth = new GoogleAuth({ credentials, scopes: [ANDROID_PUBLISHER_SCOPE] });
    return this.auth;
  }

  private async accessToken(): Promise<string> {
    const client = await this.getAuth().getClient();
    const token = await client.getAccessToken();
    if (!token.token) {
      throw new SubscriptionProviderError('no se obtuvo access token de Google', 'auth_error');
    }
    return token.token;
  }

  private mapHttpStatus(status: number): SubscriptionProviderError {
    if (status === 404) return new SubscriptionProviderError('purchaseToken no encontrado en Google Play', 'not_found');
    if (status === 401 || status === 403) return new SubscriptionProviderError('auth con Google Play fallo', 'auth_error');
    if (status === 400) return new SubscriptionProviderError('peticion invalida a Google Play', 'invalid_request');
    if (status >= 500) return new SubscriptionProviderError('Google Play no disponible', 'transient');
    return new SubscriptionProviderError(`Google Play respondio ${status}`, 'unknown');
  }

  async getSubscription(purchaseToken: string): Promise<SubscriptionVerificationResult> {
    const token = await this.accessToken();
    const url = `${ANDROID_PUBLISHER_BASE}/applications/${encodeURIComponent(ZETRYND_PLAY_PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;

    let res: Response;
    try {
      res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    } catch {
      throw new SubscriptionProviderError('fallo de red al verificar con Google Play', 'transient');
    }
    if (!res.ok) throw this.mapHttpStatus(res.status);

    const raw = (await res.json()) as GoogleSubscriptionPurchaseV2;
    const mapped = mapGoogleSubscription(raw, {
      queriedPackageName: ZETRYND_PLAY_PACKAGE_NAME,
      purchaseToken,
      expectedPackageName: ZETRYND_PLAY_PACKAGE_NAME,
      expectedProductId: ZETRYND_PREMIUM_PRODUCT_ID,
      expectedBasePlanId: ZETRYND_PREMIUM_BASE_PLAN_ID,
    });
    if (!mapped.ok) {
      if ('pendingPurchaseCanceled' in mapped) {
        // No es un fallo: el token se verifico y Google dice que la compra
        // pendiente se cancelo. La reconciliacion decide que hacer con el
        // `linkedPurchaseToken` (si lo hay).
        return { pendingPurchaseCanceled: true, purchaseToken, linkedPurchaseToken: mapped.linkedPurchaseToken, raw };
      }
      throw new SubscriptionProviderError(`snapshot no corresponde al producto ZETRYND (${mapped.reason}): ${mapped.detail}`, 'wrong_product');
    }
    return { ...mapped.snapshot, raw };
  }

  async acknowledgeSubscription(purchaseToken: string): Promise<void> {
    const token = await this.accessToken();
    // El acknowledge sigue viviendo en el recurso `purchases.subscriptions`
    // (v3) -- `subscriptionsv2` no tiene metodo de acknowledge.
    const url = `${ANDROID_PUBLISHER_BASE}/applications/${encodeURIComponent(ZETRYND_PLAY_PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(ZETRYND_PREMIUM_PRODUCT_ID)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: '{}',
      });
    } catch {
      throw new SubscriptionProviderError('fallo de red al acknowledgear con Google Play', 'transient');
    }
    // Google devuelve 200/204 en exito. Un 400 "already acknowledged" se
    // trata como exito idempotente.
    if (res.ok) return;
    if (res.status === 400) return; // ya acknowledgeada / nada que hacer
    throw this.mapHttpStatus(res.status);
  }
}
