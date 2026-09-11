import { applicableConsumersFor } from './outbox-consumer-registry';
import type { OutboxEventDelivery } from '../../generated/prisma/client';

export interface OutboxTerminalState {
  /** `true` únicamente si TODOS los consumidores aplicables (registro) son terminales. */
  terminal: boolean;
  /**
   * Instante EXACTO en que el ÚLTIMO consumidor aplicable se volvió
   * terminal (`OutboxEventDelivery.terminalAt`, WEB-0D.1B-P0B2-R1) --
   * `null` si `terminal` es `false` o si el `eventKey` es desconocido para
   * el registro.
   */
  terminalAt: Date | null;
}

/**
 * WEB-0D.1B-P0B2-R1 -- evaluación PURA de si un `OutboxEvent` es terminal,
 * a partir del `terminalAt` EXACTO persistido por
 * `OutboxEventDeliveryRepository.recordOutcome` -- nunca una aproximación
 * derivada de `createdAt` (ver Issue 1 de la auditoría P0B2-R1: `createdAt`
 * puede preceder por mucho al agotamiento real de reintentos si el proceso
 * estuvo detenido o el scheduler se retrasó, lo que causaría un purgado
 * PREMATURO).
 *
 * "Terminal" = cada consumidor aplicable (según
 * `outbox-consumer-registry.ts`) tiene una fila de entrega CON
 * `terminalAt` no nulo. Una fila FAILED todavía reintentable (`terminalAt
 * == null`) hace que el evento completo NO sea terminal, sin importar el
 * estado de los demás consumidores aplicables (seguridad multi-consumidor).
 *
 * `eventKey` desconocido para el registro -> SIEMPRE `{ terminal: false,
 * terminalAt: null }` -- dirección segura: nunca minimizar/purgar lo que no
 * se reconoce, sin importar cuántas filas de entrega existan.
 */
export function evaluateOutboxTerminalState(eventKey: string, deliveries: readonly OutboxEventDelivery[]): OutboxTerminalState {
  const applicableConsumers = applicableConsumersFor(eventKey);
  if (!applicableConsumers) {
    return { terminal: false, terminalAt: null };
  }

  let terminalAt: Date | null = null;
  for (const consumerName of applicableConsumers) {
    const delivery = deliveries.find((d) => d.consumerName === consumerName);
    if (!delivery || !delivery.terminalAt) {
      // Sin fila (pendiente real), o con fila pero sin terminalAt exacto
      // (retryable, o legado sin timestamp confiable) -- nunca terminal.
      return { terminal: false, terminalAt: null };
    }

    if (!terminalAt || delivery.terminalAt > terminalAt) {
      terminalAt = delivery.terminalAt;
    }
  }

  return { terminal: true, terminalAt };
}
