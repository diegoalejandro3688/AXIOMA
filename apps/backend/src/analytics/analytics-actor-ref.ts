import { createHmac } from 'node:crypto';

/**
 * Pseudonimización mínima -- ver ADR-0006. NO es el `analytics_actor` completo
 * del Data Model (sin rotación, sin ciclo de vida propio, sin tabla): un
 * único HMAC-SHA256 determinístico, unidireccional (no reversible sin el
 * secreto). Satisface la política de retención ya aprobada ("no vincular
 * permanentemente al usuario") sin construir la entidad completa antes de
 * que exista una necesidad real de cohortes/experimentos (Fase 3+).
 */
export function analyticsActorRef(accountId: string, secret: string): string {
  return createHmac('sha256', secret).update(accountId).digest('hex');
}
