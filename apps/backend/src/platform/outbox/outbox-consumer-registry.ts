import { ANALYTICS_EVENT_KEYS, GAMIFICATION_EVENT_KEYS } from '@axioma/contracts';

/**
 * WEB-0D.1B-P0B2 -- registro explícito de PROPIEDAD: qué consumidor(es) son
 * aplicables a cada `eventKey` de `outbox_event`. Única fuente de verdad
 * para decidir cuándo un evento es TERMINAL (ver `outbox-terminal-state.ts`)
 * -- nunca una suposición dispersa por archivo.
 *
 * Construido a partir de las MISMAS listas que ya usa cada consumidor para
 * su propio `isKnownEventKey` (`ANALYTICS_EVENT_KEYS`/`GAMIFICATION_EVENT_KEYS`
 * de `@axioma/contracts`) -- evita una tercera copia manual de los mismos 10
 * `eventKey` que pudiera divergir con el tiempo. Hoy los dos conjuntos son
 * DISJUNTOS (cada `eventKey` tiene exactamente un consumidor aplicable) --
 * ver auditoría WEB-0D.1B-P0B2. La estructura (arreglo de nombres de
 * consumidor por `eventKey`) admite, sin cambios de diseño, que un futuro
 * `eventKey` tenga más de un consumidor aplicable: bastaría con listarlos
 * aquí explícitamente.
 *
 * WEB-0D.1B-P0B2-R1 -- este archivo ya NO define su propio
 * `MAX_DELIVERY_ATTEMPTS`: `OutboxEventDeliveryRepository.recordOutcome`
 * recibe ese límite como parámetro explícito de cada consumidor (que ya
 * tiene su propia constante privada, fija en 10) para poder marcar
 * `terminalAt` en el instante EXACTO -- ver `outbox-event-delivery.repository.ts`.
 */
const registry = new Map<string, readonly string[]>();
for (const eventKey of ANALYTICS_EVENT_KEYS) {
  registry.set(eventKey, ['ANALYTICS']);
}
for (const eventKey of GAMIFICATION_EVENT_KEYS) {
  registry.set(eventKey, ['GAMIFICATION']);
}

/** Congelado -- ningún llamador puede mutar el registro en tiempo de ejecución. */
export const OUTBOX_CONSUMER_REGISTRY: ReadonlyMap<string, readonly string[]> = registry;

/**
 * `undefined` para un `eventKey` desconocido por el registro -- el llamador
 * (`OutboxLifecycleService`) DEBE tratar esto como "nunca terminal, nunca
 * minimizar, nunca purgar" (dirección segura: retener). Nunca lanza, nunca
 * asume un consumidor por defecto.
 */
export function applicableConsumersFor(eventKey: string): readonly string[] | undefined {
  return OUTBOX_CONSUMER_REGISTRY.get(eventKey);
}

export function knownOutboxEventKeys(): string[] {
  return Array.from(OUTBOX_CONSUMER_REGISTRY.keys());
}
