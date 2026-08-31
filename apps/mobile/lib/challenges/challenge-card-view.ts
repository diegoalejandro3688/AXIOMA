import type { ChallengeSummary } from '@axioma/contracts';

/**
 * DESAFÍOS V1 §18/§19/§20 -- helpers de PRESENTACIÓN puros (sin React
 * Native / Expo, mismo criterio que `group-challenges.ts` para poder
 * gatearlos con `tsx`). No reinterpretan ninguna regla de negocio:
 * `challengeType`, `periodEnd` y `rewardXpBonus` ya vienen decididos por el
 * backend.
 */

/** §18 -- etiqueta Diario / Semanal derivada de `challengeType`. */
export function challengeTypeLabel(challengeType: ChallengeSummary['challengeType']): string {
  return challengeType === 'WEEKLY' ? 'Semanal' : 'Diario';
}

/**
 * §17/§20 -- etiqueta del ESTADO del desafío para la fila. Extraída SIN
 * cambios del mapa `STATUS_LABEL` que vivía inline en `competir/index.tsx`
 * (Bloque III 4.d), para que `ChallengeRow` sea reutilizable entre el hub y
 * la futura pantalla completa de Desafíos.
 */
export function challengeStatusLabel(status: ChallengeSummary['challengeStatus']): string {
  switch (status) {
    case 'ACCEPTED':
      return 'Por empezar';
    case 'IN_PROGRESS':
      return 'En progreso';
    case 'COMPLETED':
      return 'Completado -- reclama tu recompensa';
    case 'CLAIMED':
      return 'Reclamado';
  }
}

/**
 * §19 -- cuenta regresiva local hasta `periodEnd`. `null` cuando el período
 * ya terminó (nunca se muestra un contador negativo) -- la tarjeta debe
 * tratar ese caso como estado finalizado. Redondea hacia abajo; muestra
 * días solo si quedan >= 24 h.
 */
export function formatCountdown(periodEndIso: string, now: Date = new Date()): string | null {
  const remainingMs = new Date(periodEndIso).getTime() - now.getTime();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return null;

  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} d ${hours} h restantes`;
  if (hours > 0) return `${hours} h restantes`;
  return `${Math.max(1, minutes)} min restantes`;
}

/** §20 -- "+10 XP" / "+100 XP". `null` si el desafío no previsualiza recompensa. */
export function formatRewardXp(rewardXpBonus: number | null): string | null {
  if (rewardXpBonus == null || rewardXpBonus <= 0) return null;
  return `+${rewardXpBonus} XP`;
}

/**
 * §20 -- CTA de reclamación. Deja clara la recompensa cuando se conoce
 * ("Reclamar +20 XP"), sin cambiar el comportamiento de claim.
 */
export function claimCtaLabel(rewardXpBonus: number | null): string {
  const reward = formatRewardXp(rewardXpBonus);
  return reward ? `Reclamar ${reward}` : 'Reclamar';
}

/**
 * §17 (réplica de presentación de la regla real del backend, que ya filtra
 * la respuesta) -- una tarjeta de período pasado sin reclamar NO muestra
 * contador activo. El backend nunca devuelve `ACCEPTED`/`IN_PROGRESS`/
 * `CLAIMED` de períodos cerrados, así que aquí solo importa distinguir
 * "período vigente" de "completado en un período ya cerrado".
 */
export function isPastPeriod(challenge: Pick<ChallengeSummary, 'periodEnd'>, now: Date = new Date()): boolean {
  return new Date(challenge.periodEnd).getTime() <= now.getTime();
}
