import type { AiDailyQuotaResponse } from '@axioma/contracts';

/**
 * Disponibilidad de envío, derivada EXCLUSIVAMENTE de los valores que el
 * backend acaba de devolver (`dailyQuota.remaining`, `turnCount`/`maxTurns`)
 * -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §28 ("el cliente nunca decide
 * localmente si queda cupo, siempre confía en la respuesta del servidor").
 *
 * Aquí NO se reimplementa la regla de negocio: no hay ningún número de plan
 * (ni 3/50, ni 6/15), ni frontera de día, ni noción de plan Free/Premium.
 * Esto es únicamente la lectura de los contadores ya resueltos por el
 * servidor para deshabilitar la entrada y explicar por qué -- el servidor
 * sigue siendo quien rechaza de verdad (409), y su rechazo se muestra tal
 * cual si ocurre igualmente.
 *
 * Cuota diaria y límite de turnos son INDEPENDIENTES (invariante 10) --
 * nunca se mezclan en un único contador ni se explica uno con el otro.
 */
export type SendAvailability =
  | { canSend: true }
  | { canSend: false; reason: 'quota_exhausted'; message: string }
  | { canSend: false; reason: 'turn_limit_reached'; message: string };

export function resolveSendAvailability(input: {
  dailyQuota: AiDailyQuotaResponse;
  turnCount: number;
  maxTurns: number;
}): SendAvailability {
  if (input.turnCount >= input.maxTurns) {
    return {
      canSend: false,
      reason: 'turn_limit_reached',
      message: 'Esta conversación alcanzó su límite de turnos. Tu historial se conserva; inicia una conversación nueva para seguir.',
    };
  }
  if (input.dailyQuota.remaining <= 0) {
    return {
      canSend: false,
      reason: 'quota_exhausted',
      message: `Alcanzaste tu límite diario de consultas al Tutor IA. Se renueva ${describeResetAt(input.dailyQuota.resetAt)}.`,
    };
  }
  return { canSend: true };
}

/**
 * `resetAt` es un instante ISO calculado por el servidor (inicio del
 * siguiente día UTC) -- mobile solo lo formatea de forma legible en la zona
 * del dispositivo, nunca lo recalcula ni asume una hora de corte propia.
 */
export function describeResetAt(resetAt: string, now: Date = new Date()): string {
  const reset = new Date(resetAt);
  if (Number.isNaN(reset.getTime())) return 'pronto';

  const sameDay = reset.getFullYear() === now.getFullYear() && reset.getMonth() === now.getMonth() && reset.getDate() === now.getDate();
  const time = `${String(reset.getHours()).padStart(2, '0')}:${String(reset.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return `hoy a las ${time}`;

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow = reset.getFullYear() === tomorrow.getFullYear() && reset.getMonth() === tomorrow.getMonth() && reset.getDate() === tomorrow.getDate();
  if (isTomorrow) return `mañana a las ${time}`;

  return `el ${String(reset.getDate()).padStart(2, '0')}/${String(reset.getMonth() + 1).padStart(2, '0')} a las ${time}`;
}

/** Texto de cuota -- SIEMPRE con los números que vino del servidor, nunca con constantes de plan. */
export function describeDailyQuota(quota: AiDailyQuotaResponse): string {
  return `${quota.remaining} de ${quota.limit} consultas disponibles hoy (${quota.consumed} usadas)`;
}

/** Texto de turnos -- SIEMPRE con `turnCount`/`maxTurns` del servidor. */
export function describeTurns(turnCount: number, maxTurns: number): string {
  return `Turno ${turnCount} de ${maxTurns}`;
}
