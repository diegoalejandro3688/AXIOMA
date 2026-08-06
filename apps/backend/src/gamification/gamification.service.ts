import { Injectable, Logger } from '@nestjs/common';
import {
  GAMIFICATION_EVENT_KEYS,
  GAMIFICATION_SCHEMA_VERSION,
  gamificationEventPayloadSchemas,
  type GamificationEventKey,
} from '@axioma/contracts';
import { OutboxEventDeliveryRepository } from '../platform/outbox/outbox-event-delivery.repository';
import { ValidatedGamificationActivityRepository } from './validated-gamification-activity.repository';
import type { OutboxEvent } from '../generated/prisma/client';

const RELAY_BATCH_SIZE = 100;
const CONSUMER_NAME = 'GAMIFICATION';
const MAX_DELIVERY_ATTEMPTS = 10;

function isKnownEventKey(eventKey: string): eventKey is GamificationEventKey {
  return (GAMIFICATION_EVENT_KEYS as readonly string[]).includes(eventKey);
}

/**
 * Deduplicación de NEGOCIO -- ver docs/adr/0016-gamificacion-fundacion.md.
 * Derivada del hecho académico estable, NUNCA de outboxEvent.id (eso es
 * idempotencia de TRANSPORTE, ya resuelta por outbox_event_delivery /
 * ADR-0017). Protege contra dos mensajes distintos publicados por error
 * para el mismo hecho -- algo que la idempotencia de transporte, por sí
 * sola, no puede detectar.
 */
function deduplicationKeyFor(eventKey: GamificationEventKey, payload: Record<string, unknown>): string {
  switch (eventKey) {
    case 'student_response_recorded':
      return `response:${payload.studentResponseId as string}`;
    case 'quick_question_answered':
      return `quick-question:${payload.quickQuestionAttemptId as string}`;
    case 'curriculum_topic_completed':
      // Sin identificador propio de "transición" en el modelo actual -- se
      // usa (accountId, curriculumTopicId), tal como fue decidido explícitamente.
      return `topic-completed:${payload.accountId as string}:${payload.curriculumTopicId as string}`;
  }
}

function sourceEntityFor(eventKey: GamificationEventKey, payload: Record<string, unknown>): { type: string; id: string } {
  switch (eventKey) {
    case 'student_response_recorded':
      return { type: 'StudentResponse', id: payload.studentResponseId as string };
    case 'quick_question_answered':
      return { type: 'QuickQuestionAttempt', id: payload.quickQuestionAttemptId as string };
    case 'curriculum_topic_completed':
      return { type: 'CurriculumTopicProgress', id: payload.curriculumTopicId as string };
  }
}

function activityTypeFor(eventKey: GamificationEventKey): string {
  switch (eventKey) {
    case 'student_response_recorded':
      return 'RESPUESTA_VALIDADA';
    case 'quick_question_answered':
      return 'QUICK_QUESTION_ANSWERED';
    case 'curriculum_topic_completed':
      return 'TEMA_COMPLETADO';
  }
}

/**
 * GAMIFICATION no produce estos eventos: PROGRESS los publica. Este
 * servicio SOLO registra la actividad como validada -- no calcula XP, no
 * escribe xp_ledger_entry ni xp_balance (fuera de alcance de este
 * incremento, ver ADR-0016). Consume outbox_event vía
 * outbox_event_delivery con consumerName = 'GAMIFICATION' -- entrega
 * completamente independiente de ANALYTICS (ADR-0017).
 */
@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly deliveryRepo: OutboxEventDeliveryRepository,
    private readonly activityRepo: ValidatedGamificationActivityRepository,
  ) {}

  async ingestPending(): Promise<{ processed: number; failed: number }> {
    const pending = await this.deliveryRepo.findPendingFor(CONSUMER_NAME, RELAY_BATCH_SIZE, MAX_DELIVERY_ATTEMPTS);

    let processed = 0;
    let failed = 0;

    for (const outboxEvent of pending) {
      try {
        await this.ingestOne(outboxEvent);
        await this.deliveryRepo.recordOutcome(outboxEvent.id, CONSUMER_NAME, { status: 'PROCESSED' });
        processed++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`OutboxEvent ${outboxEvent.id} ("${outboxEvent.eventKey}") no se pudo ingerir: ${message}`);
        await this.deliveryRepo.recordOutcome(outboxEvent.id, CONSUMER_NAME, { status: 'FAILED', lastError: message });
      }
    }

    return { processed, failed };
  }

  private async ingestOne(outboxEvent: OutboxEvent): Promise<void> {
    if (!isKnownEventKey(outboxEvent.eventKey)) {
      throw new Error(`eventKey desconocido: "${outboxEvent.eventKey}"`);
    }
    if (outboxEvent.schemaVersion !== GAMIFICATION_SCHEMA_VERSION) {
      throw new Error(`schemaVersion no soportada para "${outboxEvent.eventKey}": "${outboxEvent.schemaVersion}"`);
    }

    const schema = gamificationEventPayloadSchemas[outboxEvent.eventKey];
    const result = schema.safeParse(outboxEvent.payload);
    if (!result.success) {
      throw new Error(`payload inválido para "${outboxEvent.eventKey}": ${result.error.message}`);
    }
    const payload = result.data as Record<string, unknown>;

    const deduplicationKey = deduplicationKeyFor(outboxEvent.eventKey, payload);

    // Idempotencia de NEGOCIO: si el hecho académico ya generó una
    // actividad validada (p. ej. dos mensajes distintos publicados por
    // error para el mismo StudentResponse), no se crea una segunda fila --
    // se considera éxito, no fallo, igual que ANALYTICS con analytics_event.
    const alreadyValidated = await this.activityRepo.findByDeduplicationKey(deduplicationKey);
    if (alreadyValidated) return;

    const sourceEntity = sourceEntityFor(outboxEvent.eventKey, payload);

    await this.activityRepo.create({
      accountId: payload.accountId as string,
      sourceDomain: outboxEvent.sourceDomain,
      sourceEntityType: sourceEntity.type,
      sourceEntityId: sourceEntity.id,
      activityType: activityTypeFor(outboxEvent.eventKey),
      // Sin cálculo de XP en este incremento: PENDING marca "actividad
      // registrada, todavía no convertida en XP" -- ver ADR-0016.
      validationStatus: 'PENDING',
      validationRuleVersion: GAMIFICATION_SCHEMA_VERSION,
      occurredAt: outboxEvent.occurredAt,
      deduplicationKey,
      // Sin reglas antifraude en este incremento -- placeholder explícito,
      // no una afirmación de que ya se verificó nada.
      integrityStatus: 'NOT_EVALUATED',
    });
  }
}
