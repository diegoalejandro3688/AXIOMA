import { Injectable, Logger } from '@nestjs/common';
import { OutboxEventRepository } from './outbox-event.repository';
import { OutboxEventDeliveryRepository } from './outbox-event-delivery.repository';
import { knownOutboxEventKeys } from './outbox-consumer-registry';
import { evaluateOutboxTerminalState } from './outbox-terminal-state';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** WEB-0D.1B-P0B2 -- decisión de producto congelada para V1 (2026-09-11). Constante de código, NUNCA un env var opcional. */
const OUTBOX_RETENTION_DAYS_AFTER_TERMINAL = 90;
/** Tamaño de lote por corrida -- mismo criterio que `RETENTION_BATCH_SIZE` de AnalyticsEvent/AiRetentionService. */
const LIFECYCLE_BATCH_SIZE = 200;

export interface OutboxMinimizationResult {
  scanned: number;
  minimized: number;
}

export interface OutboxRetentionResult {
  scanned: number;
  deleted: number;
}

/**
 * WEB-0D.1B-P0B2 (+P0B2-R1) -- ciclo de vida de privacidad de
 * `outbox_event`: minimizar (quitar `accountId`) en cuanto un evento se
 * vuelve TERMINAL para todos sus consumidores aplicables (registro,
 * `outbox-consumer-registry.ts`), y purgar la fila completa 90 días
 * después de volverse terminal. Ver auditoría WEB-0D.1B-P0B2 (+ revisión
 * P0B2-R1) para la justificación completa de cada decisión.
 *
 * DOS caminos hacia la MISMA minimización, nunca lógica duplicada:
 *   1. `minimizeIfTerminal` -- disparado INMEDIATAMENTE por el consumidor
 *      real justo después de `recordOutcome` (ver `AnalyticsService`/
 *      `GamificationService`), un solo evento por llamada. Camino
 *      PRIMARIO -- P0B2-R1 exige que `accountId` no espere hasta 24h al
 *      barrido diario.
 *   2. `minimizeTerminalEvents` -- barrido por lotes, ahora reconciliación/
 *      recuperación ante fallos (P0B2-R1): repara cualquier evento que
 *      por lo que sea (crash entre `recordOutcome` y la minimización
 *      inmediata, fila legada, etc.) quedó terminal sin minimizar. Sigue
 *      corriendo diariamente vía `OutboxLifecycleScheduler` -- nunca se
 *      retira.
 *
 * Este servicio NUNCA decide "terminal" por sí mismo -- delega siempre en
 * `evaluateOutboxTerminalState`, que a su vez usa el registro de
 * consumidores Y el `terminalAt` EXACTO persistido por `recordOutcome`
 * (P0B2-R1). Un `eventKey` desconocido para el registro nunca aparece
 * como candidato (`findMinimizationCandidates`/`findPurgeCandidates` ya
 * filtran por `knownOutboxEventKeys()`) -- dirección segura: retener.
 */
@Injectable()
export class OutboxLifecycleService {
  private readonly logger = new Logger(OutboxLifecycleService.name);

  constructor(
    private readonly eventRepo: OutboxEventRepository,
    private readonly deliveryRepo: OutboxEventDeliveryRepository,
  ) {}

  /**
   * WEB-0D.1B-P0B2-R1 -- minimización INMEDIATA de UN evento concreto,
   * llamada por el consumidor real justo después de `recordOutcome`
   * (PROCESSED o FAILED). Re-evalúa el estado terminal REAL (nunca confía
   * en que "esta llamada lo hizo terminal" -- un evento con más de un
   * consumidor aplicable puede seguir sin ser terminal aunque ESTE
   * consumidor ya haya terminado) antes de tocar nada. No-op silencioso si
   * el evento no es terminal todavía, o si el `eventKey` es desconocido
   * para el registro. Idempotente -- si el evento ya fue minimizado
   * (por este mismo camino o por el barrido diario), `stripAccountId` no
   * tiene nada que cambiar.
   *
   * BEST-EFFORT por diseño (ver `OutboxLifecycleScheduler`/llamadores): si
   * esta llamada falla, el `OutboxEventDelivery` YA quedó registrado de
   * forma durable en el paso anterior -- la entrega nunca se pierde ni se
   * corrompe por un fallo de minimización. El evento simplemente sigue
   * siendo candidato para el barrido diario (`minimizeTerminalEvents`),
   * que lo repara en la próxima corrida -- ver justificación completa en
   * los llamadores (`AnalyticsService.ingestOne`/`GamificationService.ingestOne`).
   */
  async minimizeIfTerminal(outboxEventId: string, eventKey: string): Promise<boolean> {
    const deliveries = await this.deliveryRepo.findAllFor(outboxEventId);
    const { terminal } = evaluateOutboxTerminalState(eventKey, deliveries);
    if (!terminal) return false;
    await this.eventRepo.stripAccountId(outboxEventId);
    return true;
  }

  /**
   * Minimización por lotes -- ver docstring de la clase, camino 2
   * (reconciliación/recuperación ante fallos, YA NO el disparador
   * primario desde P0B2-R1). Quita `accountId` (payload + aggregateId) de
   * cada `OutboxEvent` conocido que ya es terminal para TODOS sus
   * consumidores aplicables. Idempotente: una fila ya minimizada
   * simplemente deja de calzar en `findMinimizationCandidates` (ni
   * `aggregateId` no-nulo ni `payload ? 'accountId'`).
   */
  async minimizeTerminalEvents(batchSize: number = LIFECYCLE_BATCH_SIZE): Promise<OutboxMinimizationResult> {
    const knownEventKeys = knownOutboxEventKeys();
    const candidates = await this.eventRepo.findMinimizationCandidates(knownEventKeys, batchSize);

    let minimized = 0;
    for (const event of candidates) {
      const deliveries = await this.deliveryRepo.findAllFor(event.id);
      const { terminal } = evaluateOutboxTerminalState(event.eventKey, deliveries);
      if (!terminal) continue;
      await this.eventRepo.stripAccountId(event.id);
      minimized++;
    }
    return { scanned: candidates.length, minimized };
  }

  /**
   * Retención -- borra la fila COMPLETA de `OutboxEvent` (cascada real de
   * esquema hacia `outbox_event_delivery`) cuando: (a) es terminal para
   * TODOS sus consumidores aplicables, Y (b) el instante en que se volvió
   * terminal (`terminalAt`, el MÁS TARDÍO entre todos los consumidores
   * aplicables) ya cruzó los 90 días congelados. Un evento retryable
   * (`terminal === false`), sin importar cuán viejo sea `createdAt`, NUNCA
   * se purga -- la comprobación de antigüedad usa exclusivamente
   * `terminalAt`, jamás `createdAt`/`occurredAt`.
   */
  async purgeExpiredTerminalEvents(now: Date = new Date(), batchSize: number = LIFECYCLE_BATCH_SIZE): Promise<OutboxRetentionResult> {
    const knownEventKeys = knownOutboxEventKeys();
    const candidates = await this.eventRepo.findPurgeCandidates(knownEventKeys, batchSize);
    const cutoffMs = OUTBOX_RETENTION_DAYS_AFTER_TERMINAL * MS_PER_DAY;

    let deleted = 0;
    for (const event of candidates) {
      const deliveries = await this.deliveryRepo.findAllFor(event.id);
      const { terminal, terminalAt } = evaluateOutboxTerminalState(event.eventKey, deliveries);
      if (!terminal || !terminalAt) continue;
      if (now.getTime() - terminalAt.getTime() < cutoffMs) continue;

      const removed = await this.eventRepo.deleteById(event.id);
      deleted += removed;
    }
    return { scanned: candidates.length, deleted };
  }
}
