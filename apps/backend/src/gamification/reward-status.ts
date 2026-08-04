/**
 * Derivación PURA del estado de un `reward_grant` desde sus componentes --
 * ver ADR-0019 §3. Deliberadamente NO existe una columna `grant_status`
 * persistida (precisión obligatoria del Product Owner): una segunda
 * representación del mismo hecho es exactamente el tipo de desalineación
 * que este dominio ya evita en otros lugares (`xp_balance` reconstruible
 * en vez de fuente de verdad propia, Bloque I).
 *
 * `REVERSED` (quinto valor que Data Model reserva en `reward_grant.grant_status`)
 * NUNCA es un resultado posible de esta función -- ningún componente de
 * este mecanismo transiciona a un estado que la produzca; queda reservado
 * para una futura herramienta administrativa fuera de alcance.
 */

export type RewardComponentDeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED';
export type RewardGrantStatus = 'PENDING' | 'PARTIAL' | 'GRANTED' | 'FAILED';

export function deriveGrantStatus(components: ReadonlyArray<{ deliveryStatus: RewardComponentDeliveryStatus }>): RewardGrantStatus {
  if (components.every((c) => c.deliveryStatus === 'PENDING')) return 'PENDING';
  if (components.every((c) => c.deliveryStatus === 'DELIVERED')) return 'GRANTED';
  if (components.some((c) => c.deliveryStatus === 'DELIVERED')) return 'PARTIAL';
  return 'FAILED';
}
