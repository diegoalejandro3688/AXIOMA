import {
  SubscriptionProviderError,
  type SubscriptionProviderAdapter,
  type SubscriptionVerificationResult,
} from './subscription-provider.port';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), RC1B.1: POSTURA CONGELADA.
 *
 * Adaptador que se selecciona con `GOOGLE_PLAY_PROVIDER_IMPL=disabled` mientras
 * Google Play Billing sigue intencionalmente congelado (sin Play Console, sin
 * service account). Permite ARRANCAR el backend en `NODE_ENV=production` sin
 * caer en el adaptador fake.
 *
 * Garantias (por construccion -- no hay otro camino en esta clase):
 *   - NUNCA contacta Google.
 *   - NUNCA verifica una compra.
 *   - NUNCA devuelve un `VerifiedSubscriptionSnapshot` (ni un
 *     `PendingPurchaseCanceledResult`): ambos metodos LANZAN.
 *   - NUNCA fabrica estado de suscripcion ni concede PREMIUM.
 *   - NO requiere credenciales.
 *
 * `getSubscription` lanza `SubscriptionProviderError` categoria `disabled`;
 * `SubscriptionReconciliationService.mapProviderError` lo traduce a un 503
 * deterministico ("La verificación de compras no está disponible."). El
 * entitlement sigue siendo fail-closed: sin fila `AccountSubscription`
 * verificada -> FREE.
 *
 * Sin `@Injectable()` a proposito -- `SubscriptionModule` lo instancia
 * directamente (`new`) en la factory de `SUBSCRIPTION_PROVIDER_ADAPTER`,
 * nunca via el contenedor DI.
 */
export class DisabledSubscriptionProviderAdapter implements SubscriptionProviderAdapter {
  private static readonly MESSAGE =
    'Google Play Billing esta en postura CONGELADA (GOOGLE_PLAY_PROVIDER_IMPL=disabled).';

  getSubscription(_purchaseToken: string): Promise<SubscriptionVerificationResult> {
    return Promise.reject(new SubscriptionProviderError(DisabledSubscriptionProviderAdapter.MESSAGE, 'disabled'));
  }

  acknowledgeSubscription(_purchaseToken: string): Promise<void> {
    return Promise.reject(new SubscriptionProviderError(DisabledSubscriptionProviderAdapter.MESSAGE, 'disabled'));
  }
}
