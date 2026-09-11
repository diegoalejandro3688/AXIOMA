import { createHmac } from 'node:crypto';

/**
 * Dominio de pseudonimización PROPIO de gamificación -- WEB-0D.1C-B audit
 * §"Frozen V1 decisions". Misma forma criptográfica que
 * `analyticsActorRef` (ADR-0006), pero NUNCA comparte secreto ni salida:
 * el secreto (`GAMIFICATION_ACTOR_SECRET`, aún no provisto en este
 * incremento) se recibe como argumento puro, nunca leído de config aquí,
 * para que ninguna correlación entre dominios sea posible por diseño
 * (secretos distintos -> refs distintos aun para la misma cuenta).
 */
export function gamificationActorRef(accountId: string, secret: string): string {
  return createHmac('sha256', secret).update(accountId).digest('hex');
}
