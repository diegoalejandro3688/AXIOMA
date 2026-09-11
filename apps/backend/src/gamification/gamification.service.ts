import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GAMIFICATION_EVENT_KEYS,
  GAMIFICATION_SCHEMA_VERSION,
  gamificationEventPayloadSchemas,
  type GamificationEventKey,
} from '@axioma/contracts';
import { OutboxEventDeliveryRepository } from '../platform/outbox/outbox-event-delivery.repository';
import { OutboxLifecycleService } from '../platform/outbox/outbox-lifecycle.service';
import { AccountRepository } from '../auth/account.repository';
import { ValidatedGamificationActivityRepository } from './validated-gamification-activity.repository';
import { XpBalanceRepository } from './xp-balance.repository';
import { AccountTitleRepository } from './account-title.repository';
import { InventoryItemRepository } from './inventory-item.repository';
import { buildActivityDedupKeyV2, buildLegacyActivityDedupKey } from './gamification-key';
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
 *
 * WEB-0D.1C-B2 -- `topic-completed`/`ensayo-completado`/`resource-completed`
 * migraron a la forma v2 pseudonimizada (`buildActivityDedupKeyV2`, ver
 * `gamification-key.ts`); la identidad de negocio subyacente
 * (accountId/curriculumTopicId, accountId/examId, accountId/learningResourceId)
 * NO cambia, solo cómo se serializa. `response`/`quick-question` nunca
 * embebieron accountId y no cambian en absoluto.
 */

function sourceEntityFor(eventKey: GamificationEventKey, payload: Record<string, unknown>): { type: string; id: string } {
  switch (eventKey) {
    case 'student_response_recorded':
      return { type: 'StudentResponse', id: payload.studentResponseId as string };
    case 'quick_question_answered':
      return { type: 'QuickQuestionAttempt', id: payload.quickQuestionAttemptId as string };
    case 'curriculum_topic_completed':
      return { type: 'CurriculumTopicProgress', id: payload.curriculumTopicId as string };
    case 'exam_completed':
      return { type: 'ExamAttempt', id: payload.examAttemptId as string };
    case 'resource_completed':
      return { type: 'LearningResourceProgress', id: payload.learningResourceProgressId as string };
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
    case 'exam_completed':
      return 'ENSAYO_COMPLETADO';
    case 'resource_completed':
      return 'RECURSO_COMPLETADO';
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
    private readonly outboxLifecycle: OutboxLifecycleService,
    private readonly accountRepo: AccountRepository,
    private readonly xpBalanceRepo: XpBalanceRepository,
    private readonly accountTitleRepo: AccountTitleRepository,
    private readonly inventoryItemRepo: InventoryItemRepository,
    // WEB-0D.1C-B2 -- añadido al FINAL, mismo criterio que
    // `XpGrantService.accountRepo` (WEB-0D.1C-B0R): opcional para no
    // romper la instanciación posicional de gates preexistentes
    // (`verify-resource-completion-gate.ts` construye este servicio con
    // solo 2 args). `getGamificationSecret` cae a `process.env`
    // directamente cuando `config` es `undefined` -- MISMO valor exacto
    // que `ConfigService.get` habría devuelto (sin schema de validación
    // registrado, `ConfigService` ya resuelve sobre `process.env`), nunca
    // un secreto de repuesto distinto.
    private readonly config?: ConfigService,
  ) {}

  /**
   * WEB-0D.1C-B2 -- a diferencia de `ANALYTICS_ACTOR_SECRET` (opcional,
   * "sin pseudónimo" si falta), este secreto es REQUERIDO para las tres
   * escrituras afectadas (`topic-completed`/`ensayo-completado`/
   * `resource-completed`): si faltara, la ÚNICA alternativa sería
   * persistir accountId crudo, exactamente lo que este bloque existe para
   * evitar -- falla explícito en vez de degradar en silencio.
   */
  private getGamificationSecret(): string {
    const secret = this.config?.get<string>('GAMIFICATION_ACTOR_SECRET') ?? process.env.GAMIFICATION_ACTOR_SECRET;
    if (!secret) {
      throw new Error('GAMIFICATION_ACTOR_SECRET no está configurado -- no se puede pseudonimizar accountId para esta escritura de gamificación.');
    }
    return secret;
  }

  /**
   * WEB-0D.1B-P0B2-R1 -- justo después de que `recordOutcome` deja
   * DURABLE el resultado de la entrega, se dispara la minimización
   * INMEDIATA (`OutboxLifecycleService.minimizeIfTerminal`) para ESE
   * evento -- mismo criterio y misma justificación exacta que
   * `AnalyticsService.ingestPending`: envuelta en su propio `try/catch`,
   * un fallo de minimización nunca corrompe el resultado de entrega ya
   * registrado, y el barrido diario lo repara si es necesario.
   */
  async ingestPending(): Promise<{ processed: number; failed: number }> {
    const pending = await this.deliveryRepo.findPendingFor(CONSUMER_NAME, GAMIFICATION_EVENT_KEYS, RELAY_BATCH_SIZE, MAX_DELIVERY_ATTEMPTS);

    let processed = 0;
    let failed = 0;

    for (const outboxEvent of pending) {
      try {
        await this.ingestOne(outboxEvent);
        await this.deliveryRepo.recordOutcome(outboxEvent.id, CONSUMER_NAME, { status: 'PROCESSED' }, MAX_DELIVERY_ATTEMPTS);
        processed++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`OutboxEvent ${outboxEvent.id} ("${outboxEvent.eventKey}") no se pudo ingerir: ${message}`);
        await this.deliveryRepo.recordOutcome(outboxEvent.id, CONSUMER_NAME, { status: 'FAILED', lastError: message }, MAX_DELIVERY_ATTEMPTS);
      }

      try {
        await this.outboxLifecycle.minimizeIfTerminal(outboxEvent.id, outboxEvent.eventKey);
      } catch (error) {
        this.logger.warn(`Minimización inmediata falló para OutboxEvent ${outboxEvent.id} -- queda pendiente para el barrido diario: ${error}`);
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
    const accountId = payload.accountId as string;

    // WEB-0D.1C-A -- guardia de cuenta CERRADA en el ÚNICO punto de entrada
    // de estado de gamificación: ValidatedGamificationActivity es la fuente
    // exclusiva que leen XpGrantService/LeaguePointGrantService/
    // RewardEvaluationWorker (XP, LP, logros, títulos, cosméticos, desafíos)
    // -- bloquear la creación de esta fila aquí basta para impedir TODO
    // estado nuevo de gamificación para una cuenta CLOSED, sin tocar ningún
    // dominio downstream por separado. Un evento tardío/reintentado para
    // una cuenta ya CLOSED se trata como ÉXITO (nunca throw/retry) -- el
    // evento se vuelve terminal de transporte de inmediato (mismo ciclo,
    // sin agotar los 10 reintentos), y la minimización inmediata de Outbox
    // sigue corriendo normalmente después. DELETION_PENDING (recuperable)
    // NO activa esta guardia -- solo CLOSED (definitivo).
    const account = await this.accountRepo.findById(accountId);
    if (account?.status === 'CLOSED') {
      this.logger.log(
        `OutboxEvent ${outboxEvent.id} ("${outboxEvent.eventKey}") ignorado -- cuenta ${accountId} está CLOSED, sin crear estado de gamificación nuevo.`,
      );
      return;
    }
    // WEB-0D.1C-B3-R1-ADDENDUM -- además del CLOSED explícito, ignora el
    // evento si esta cuenta tiene un `PrivacyRequest` en PROCESSING
    // (barrido de cierre definitivo EN CURSO, todavía ANTES de
    // `markAccountClosed` -- ver B3-R1 §3). Sin esto, un evento de ingesta
    // tardío podría crear una `ValidatedGamificationActivity` NUEVA (con
    // `accountId` crudo) justo cuando B3 ya está pseudonimizando/ya
    // pseudonimizó el resto del historial de esta cuenta en el MISMO
    // barrido. Mismo tratamiento que CLOSED: éxito de transporte inmediato
    // (nunca throw/retry), NO activa esta guardia el DELETION_PENDING
    // ordinario (ventana de 30 días, sin barrido en curso -- nunca tiene
    // una fila PROCESSING).
    if (await this.accountRepo.hasProcessingDeletionRequest(accountId)) {
      this.logger.log(
        `OutboxEvent ${outboxEvent.id} ("${outboxEvent.eventKey}") ignorado -- cuenta ${accountId} tiene un cierre definitivo EN CURSO (PrivacyRequest PROCESSING), sin crear estado de gamificación nuevo.`,
      );
      return;
    }

    // WEB-0D.1C-B2 -- doble lectura de compatibilidad. La clave v2
    // (pseudonimizada) es la ÚNICA que se persiste de aquí en adelante;
    // la clave legacy (accountId crudo) se calcula solo TRANSITORIAMENTE,
    // en memoria, para reconocer filas ya existentes escritas antes de
    // B2 -- nunca se vuelve a persistir. `buildLegacyActivityDedupKey`
    // devuelve `null` para los dos tipos que nunca embebieron accountId
    // (`response`/`quick-question`): para esos, la clave v2 ES la única
    // forma que siempre existió, y el secreto de GAMIFICATION nunca se
    // exige (ni se lee) para ellos -- ninguna razón para requerirlo donde
    // nunca hubo accountId crudo que pseudonimizar.
    const legacyDeduplicationKey = buildLegacyActivityDedupKey(outboxEvent.eventKey, payload);
    const deduplicationKey = buildActivityDedupKeyV2(outboxEvent.eventKey, accountId, () => this.getGamificationSecret(), payload);

    // Idempotencia de NEGOCIO: si el hecho académico ya generó una
    // actividad validada (p. ej. dos mensajes distintos publicados por
    // error para el mismo StudentResponse, O una fila legacy escrita
    // antes de B2 para el mismo hecho), no se crea una segunda fila --
    // se considera éxito, no fallo, igual que ANALYTICS con analytics_event.
    const alreadyValidated =
      (await this.activityRepo.findByDeduplicationKey(deduplicationKey)) ??
      (legacyDeduplicationKey ? await this.activityRepo.findByDeduplicationKey(legacyDeduplicationKey) : null);
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

  /**
   * WEB-0D.1C-A -- cierre definitivo de cuenta: borra ÚNICAMENTE las filas
   * de GAMIFICATION comprobadas seguras (propiedad/estado ACTUAL sin
   * propósito tras el cierre, sin depender de reconstrucción histórica, sin
   * afectar a otra cuenta, sin FK/trigger que lo bloquee):
   *   - `xp_balance` -- proyección materializada del ledger, nunca la
   *     fuente de verdad;
   *   - `account_title` / `inventory_item` -- propiedad (ownership), YA sin
   *     ninguna fila `equipped_*` que las referencie (requiere haber
   *     corrido DESPUÉS de `anonymizePublicProfileForAccountClosure`).
   *
   * DELIBERADAMENTE NO toca (fuera de alcance de este bloque, ver
   * WEB-0D.1C-B): `xp_ledger_entry`, `league_point_ledger_entry`,
   * `validated_gamification_activity`, `reward_grant`/`reward_grant_component`,
   * `achievement_unlock` (histórico/ledger inmutable), NI
   * `achievement_progress` (bloqueada por un trigger de base de datos
   * `enforce_achievement_progress_no_delete` SIN excepción -- borrarla
   * requeriría una migración, fuera de alcance aquí), NI
   * `season_league_participation`/`leaderboard_entry` (estado competitivo,
   * ver exclusión en lectura), NI `account_challenge*` (ambiguo -- sus
   * hijos referencian `xp_ledger_entry`, ver auditoría).
   */
  async deleteCurrentStateForAccountClosure(accountId: string): Promise<void> {
    await this.xpBalanceRepo.deleteByAccountId(accountId);
    await this.accountTitleRepo.deleteByAccountId(accountId);
    await this.inventoryItemRepo.deleteByAccountId(accountId);
  }
}
