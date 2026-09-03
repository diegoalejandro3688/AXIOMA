import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ZETRYND_PLAY_PACKAGE_NAME } from '../subscription-product';
import { GooglePlayRtdnEventRepository, type RtdnEventInsert } from './google-play-rtdn-event.repository';
import { classifyDeveloperNotification, parsePubSubEnvelope } from './parse-pubsub-envelope';
import { parseEventTimeMillis } from './rtdn-event-time';
import { RTDN_PUSH_AUTHENTICATOR, RtdnPushAuthError, type RtdnPushAuthenticator } from './rtdn-push-authenticator.port';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3.
 *
 * INGESTA del push de Pub/Sub. Flujo (task §8):
 *   verificar OIDC -> validar sobre -> decodificar notificacion -> validar
 *   package -> PERSISTIR/deduplicar -> responder 2xx a Pub/Sub.
 *
 * La reconciliacion con Google NO ocurre aqui -- el buzon durable permite que
 * corra despues, asincrona y reintentable, sin perder el evento si la API de
 * Google falla tras la entrega de Pub/Sub.
 */
@Injectable()
export class RtdnIngestionService {
  private readonly logger = new Logger(RtdnIngestionService.name);

  constructor(
    @Inject(RTDN_PUSH_AUTHENTICATOR) private readonly authenticator: RtdnPushAuthenticator,
    private readonly events: GooglePlayRtdnEventRepository,
  ) {}

  /**
   * @returns `{ deduplicated }` -- `true` si el `messageId` ya estaba (re-entrega
   *          de Pub/Sub); en ambos casos la respuesta HTTP a Pub/Sub es 2xx.
   * @throws UnauthorizedException  si el OIDC no verifica (Pub/Sub reintentara).
   * @throws BadRequestException    si el sobre/notificacion es estructuralmente
   *                                invalido o el package no es ZETRYND -- NO se
   *                                muta nada, NO se persiste.
   */
  async ingest(authorizationHeader: string | undefined, body: unknown): Promise<{ deduplicated: boolean }> {
    // 1. OIDC -- frontera propia, NUNCA el AuthGuard de usuario.
    try {
      await this.authenticator.authenticate(authorizationHeader);
    } catch (error) {
      if (error instanceof RtdnPushAuthError) {
        // `not_configured` en prod ya fallo al arrancar (factory). Aqui: 401
        // sin filtrar el motivo exacto ni el token.
        this.logger.warn(`RTDN push rechazado: ${error.reason}`);
        throw new UnauthorizedException('Push de Pub/Sub no autenticado.');
      }
      throw error;
    }

    // 2. Sobre de Pub/Sub (validacion estructural + base64 + JSON, una vez).
    const parsed = parsePubSubEnvelope(body);
    if (!parsed.ok) {
      this.logger.warn(`RTDN sobre invalido: ${parsed.reason}`);
      throw new BadRequestException(`Sobre de Pub/Sub invalido (${parsed.reason}).`);
    }
    const { messageId, subscriptionResource, notification } = parsed;

    // 3. Package -- un RTDN de otro paquete NUNCA llega a la reconciliacion y
    //    NUNCA se persiste (no guardamos ruido de terceros).
    if (notification.packageName !== ZETRYND_PLAY_PACKAGE_NAME) {
      this.logger.warn(`RTDN con packageName inesperado: "${notification.packageName}"`);
      throw new BadRequestException('RTDN de un paquete no reconocido.');
    }

    // 4. Clasificar + persistir/deduplicar. Solo `subscription` queda PENDING
    //    para el worker; `test` y demas familias se registran ya resueltas.
    const classified = classifyDeveloperNotification(notification);
    const now = new Date();
    let insert: RtdnEventInsert;
    if (classified.kind === 'subscription') {
      insert = {
        messageId,
        subscriptionResource,
        packageName: notification.packageName,
        notificationVersion: notification.version ?? null,
        notificationKind: 'subscription',
        notificationType: classified.subscriptionNotificationType,
        purchaseToken: classified.purchaseToken,
        eventTime: parseEventTimeMillis(notification.eventTimeMillis),
        // Sin purchaseToken no hay nada accionable -- se registra IGNORED.
        status: classified.purchaseToken ? 'PENDING' : 'IGNORED',
        processedAt: classified.purchaseToken ? null : now,
      };
    } else {
      // `test` -> DONE (manejo inocuo, util para verificar conectividad Play
      // Console -> Pub/Sub -> ZETRYND). one_time/voided/unknown -> IGNORED.
      insert = {
        messageId,
        subscriptionResource,
        packageName: notification.packageName,
        notificationVersion: notification.version ?? null,
        notificationKind: classified.kind,
        notificationType: null,
        purchaseToken: null,
        eventTime: parseEventTimeMillis(notification.eventTimeMillis),
        status: classified.kind === 'test' ? 'DONE' : 'IGNORED',
        processedAt: now,
      };
    }

    const result = await this.events.insertDeduped(insert);
    if (result.duplicate) {
      this.logger.log(`RTDN duplicado (messageId ya procesado) -- sin trabajo nuevo`);
      return { deduplicated: true };
    }
    this.logger.log(`RTDN aceptado: kind=${insert.notificationKind} type=${insert.notificationType ?? '-'} status=${insert.status}`);
    return { deduplicated: false };
  }
}
