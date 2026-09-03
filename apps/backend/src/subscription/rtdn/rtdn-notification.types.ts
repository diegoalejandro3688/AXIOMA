/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * Tipos de TRANSPORTE de Real-time Developer Notifications (RTDN) -- el sobre
 * de Google Cloud Pub/Sub push + el `DeveloperNotification` que Google Play
 * codifica en `message.data` (base64).
 *
 * SOLO viven en `subscription/rtdn/` -- ni el servicio de reconciliacion, ni
 * `EntitlementService`, ni ningun consumidor de producto los importan. Lo que
 * sale de esta carpeta ya es primitivo (`purchaseToken: string`,
 * `providerEventTime: Date | null`, `notificationType: string | null`).
 *
 * Referencia: https://developer.android.com/google/play/billing/rtdn-reference
 */

/** Sobre de Pub/Sub push (`application/json` que envia Cloud Pub/Sub). */
export interface PubSubPushEnvelope {
  message: {
    /** Payload real, base64 (std o url-safe). Para RTDN es un `DeveloperNotification` JSON. */
    data?: string;
    /** Identificador global de ENTREGA -- clave de dedup. */
    messageId?: string;
    /** Algunas libs lo mandan en snake_case. */
    message_id?: string;
    publishTime?: string;
    attributes?: Record<string, string>;
  };
  /** Recurso de la suscripcion Pub/Sub (`projects/<p>/subscriptions/<s>`). */
  subscription?: string;
}

/** `DeveloperNotification` -- lo que Google Play pone en `message.data`. */
export interface DeveloperNotification {
  version?: string;
  packageName?: string;
  /** Milisegundos epoch como STRING (Google lo serializa asi). */
  eventTimeMillis?: string;
  subscriptionNotification?: SubscriptionNotification;
  oneTimeProductNotification?: unknown;
  voidedPurchaseNotification?: unknown;
  testNotification?: { version?: string };
}

export interface SubscriptionNotification {
  version?: string;
  /** Entero de Google -- ver `rtdn-notification-type.ts`. */
  notificationType?: number;
  purchaseToken?: string;
  /** `subscriptionId` (productId) -- diagnostico; la identidad real la da `subscriptionsv2.get`. */
  subscriptionId?: string;
}

export type RtdnNotificationKind =
  | 'subscription'
  | 'test'
  | 'one_time_product'
  | 'voided_purchase'
  | 'unknown';
