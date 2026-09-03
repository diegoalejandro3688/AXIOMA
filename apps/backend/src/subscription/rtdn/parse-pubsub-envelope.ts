/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * Parsing PURO del sobre de Pub/Sub push + el `DeveloperNotification`. Sin
 * red, sin DB, sin framework. Valida estructura ANTES de tocar nada; decodifica
 * `message.data` de base64 EXACTAMENTE una vez.
 */
import type {
  DeveloperNotification,
  PubSubPushEnvelope,
  RtdnNotificationKind,
  SubscriptionNotification,
} from './rtdn-notification.types';

export type ParsePubSubEnvelopeResult =
  | { ok: true; messageId: string; subscriptionResource: string | null; notification: DeveloperNotification }
  | { ok: false; reason: 'malformed_envelope' | 'missing_message_id' | 'missing_data' | 'invalid_base64' | 'invalid_json' | 'not_developer_notification'; detail: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** base64 std o url-safe -> utf8. Lanza (lo captura el llamador) si es basura. */
function decodeBase64Once(data: string): string {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const buf = Buffer.from(normalized, 'base64');
  // `Buffer.from` nunca lanza con base64 invalido -- descarta caracteres. Se
  // valida por round-trip: si al re-encodear no coincide (ignorando padding),
  // el input no era base64 valido.
  const roundTrip = buf.toString('base64').replace(/=+$/, '');
  const inputNoPad = normalized.replace(/=+$/, '');
  if (roundTrip !== inputNoPad) {
    throw new Error('base64 invalido');
  }
  return buf.toString('utf8');
}

export function parsePubSubEnvelope(body: unknown): ParsePubSubEnvelopeResult {
  if (!isObject(body) || !isObject(body.message)) {
    return { ok: false, reason: 'malformed_envelope', detail: 'falta `message` en el sobre de Pub/Sub' };
  }
  const message = body.message as PubSubPushEnvelope['message'];
  const messageId = typeof message.messageId === 'string' && message.messageId.length > 0
    ? message.messageId
    : typeof message.message_id === 'string' && message.message_id.length > 0
      ? message.message_id
      : null;
  if (!messageId) {
    return { ok: false, reason: 'missing_message_id', detail: 'falta `message.messageId`' };
  }
  if (typeof message.data !== 'string' || message.data.length === 0) {
    return { ok: false, reason: 'missing_data', detail: 'falta `message.data`' };
  }

  let decoded: string;
  try {
    decoded = decodeBase64Once(message.data);
  } catch {
    return { ok: false, reason: 'invalid_base64', detail: '`message.data` no es base64 valido' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return { ok: false, reason: 'invalid_json', detail: '`message.data` decodificado no es JSON' };
  }
  if (!isObject(parsed)) {
    return { ok: false, reason: 'not_developer_notification', detail: 'el payload decodificado no es un objeto' };
  }

  const notification = parsed as DeveloperNotification;
  const hasAnyKnownShape =
    isObject(notification.subscriptionNotification) ||
    isObject(notification.testNotification) ||
    isObject(notification.oneTimeProductNotification) ||
    isObject(notification.voidedPurchaseNotification);
  if (typeof notification.packageName !== 'string' && !hasAnyKnownShape) {
    return { ok: false, reason: 'not_developer_notification', detail: 'el payload no parece un DeveloperNotification' };
  }

  const subscriptionResource =
    typeof body.subscription === 'string' && body.subscription.length > 0 ? body.subscription : null;

  return { ok: true, messageId, subscriptionResource, notification };
}

export interface ClassifiedNotification {
  kind: RtdnNotificationKind;
  /** solo para `subscription` accionable */
  purchaseToken: string | null;
  /** solo para `subscription` */
  subscriptionNotificationType: number | null;
}

/**
 * Clasifica un `DeveloperNotification` en su familia. C3.3 solo ACCIONA
 * `subscription`; `test` se registra sin efecto; el resto se marca `IGNORED`
 * (nunca concede entitlement).
 */
export function classifyDeveloperNotification(notification: DeveloperNotification): ClassifiedNotification {
  if (isObject(notification.subscriptionNotification)) {
    const sub = notification.subscriptionNotification as SubscriptionNotification;
    return {
      kind: 'subscription',
      purchaseToken: typeof sub.purchaseToken === 'string' && sub.purchaseToken.length > 0 ? sub.purchaseToken : null,
      subscriptionNotificationType: typeof sub.notificationType === 'number' ? sub.notificationType : null,
    };
  }
  if (isObject(notification.testNotification)) {
    return { kind: 'test', purchaseToken: null, subscriptionNotificationType: null };
  }
  if (isObject(notification.oneTimeProductNotification)) {
    return { kind: 'one_time_product', purchaseToken: null, subscriptionNotificationType: null };
  }
  if (isObject(notification.voidedPurchaseNotification)) {
    return { kind: 'voided_purchase', purchaseToken: null, subscriptionNotificationType: null };
  }
  return { kind: 'unknown', purchaseToken: null, subscriptionNotificationType: null };
}
