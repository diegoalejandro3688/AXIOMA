import type { ChallengeSummary } from '@axioma/contracts';

/**
 * Agrupación puramente de PRESENTACIÓN -- ver docs/adr/BLOCK-III-DEFINITION.md
 * §4.18. Sin lógica de evaluación de desafíos aquí: `challengeStatus`,
 * `progressValue` y `targetValue` ya vienen decididos por el backend
 * (4.b/4.c) -- este módulo solo particiona un array ya calculado en tres
 * grupos visuales y expone una razón [0,1] para la barra de progreso.
 */
export interface GroupedChallenges {
  /** ACCEPTED | IN_PROGRESS -- desafíos activos, todavía sin completar. */
  active: ChallengeSummary[];
  /** COMPLETED -- completados, pendientes de reclamar. */
  completed: ChallengeSummary[];
  /** CLAIMED -- ya reclamados. */
  claimed: ChallengeSummary[];
}

export function groupChallenges(challenges: ChallengeSummary[]): GroupedChallenges {
  const active: ChallengeSummary[] = [];
  const completed: ChallengeSummary[] = [];
  const claimed: ChallengeSummary[] = [];

  for (const challenge of challenges) {
    if (challenge.challengeStatus === 'ACCEPTED' || challenge.challengeStatus === 'IN_PROGRESS') {
      active.push(challenge);
    } else if (challenge.challengeStatus === 'COMPLETED') {
      completed.push(challenge);
    } else {
      claimed.push(challenge);
    }
  }

  return { active, completed, claimed };
}

/**
 * Razón [0,1] para una barra de progreso -- NO calcula progreso, solo
 * acota para dibujo dos números que el backend ya decidió
 * (`progressValue`/`targetValue`). El backend ya garantiza `progressValue
 * <= targetValue` (CHECK de esquema, 4.a) -- el `Math.min`/`Math.max` aquí
 * es defensivo para el dibujo, no una segunda fuente de verdad.
 */
export function progressRatio(challenge: Pick<ChallengeSummary, 'progressValue' | 'targetValue'>): number {
  if (challenge.targetValue <= 0) return 0;
  return Math.min(1, Math.max(0, challenge.progressValue / challenge.targetValue));
}

/** El botón de reclamar solo existe para `COMPLETED` -- réplica de presentación de la regla real del backend (Gate 38), nunca la reemplaza (el backend vuelve a exigirla, 409 si no). */
export function canClaim(challenge: Pick<ChallengeSummary, 'challengeStatus'>): boolean {
  return challenge.challengeStatus === 'COMPLETED';
}
