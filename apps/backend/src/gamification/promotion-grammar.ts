/**
 * COMPETITIVE V1 -- gramática PURA de ascenso/retención/descenso, extraída de
 * `LeaderboardFinalizationService.decideOutcomes` (ADR-0020 §4) para que
 * SIRVA A DOS LLAMADORES SIN DIVERGIR:
 *
 *   1. Cierre de grupo (`LeaderboardFinalizationService`) -- resultado
 *      PERSISTIDO (`participationStatus`, `LeaderboardSnapshotEntry.promotionOutcome`).
 *   2. Zona EN VIVO del ranking (`CompetitiveLeaderboardService`) -- campo
 *      `competitiveZone` de cada fila, sin persistir nada.
 *
 * Sin imports (Prisma, Nest, RN) -- gateable con `tsx` puro. Las reglas de
 * negocio (percentajes, mínimo de participantes, bordes de tier extremo)
 * viven aquí una sola vez; los dos servicios solo aportan el contexto
 * (participaciones del grupo, `promotionRule`/`demotionRule` del tier, si el
 * tier es el más alto/bajo ACTIVE).
 */

/** Grupos con menos participantes que este mínimo cierran / se muestran 100% RETENTION -- ADR-0020 §4, Gate 21. */
export const MINIMUM_PARTICIPANTS_FOR_PROMOTION = 3;

export type CompetitiveZone = 'PROMOTION' | 'RETENTION' | 'DEMOTION';

/** `top-percent:N` -> N (1..100) | null. Réplica exacta de la función privada original de `leaderboard-finalization.service.ts`. */
export function parseTopPercent(rule: string | null): number | null {
  const match = rule ? /^top-percent:(\d+)$/.exec(rule) : null;
  if (!match) return null;
  const percent = Number(match[1]);
  return percent >= 1 && percent <= 100 ? percent : null;
}

/** `bottom-percent:N` -> N (1..100) | null. */
export function parseBottomPercent(rule: string | null): number | null {
  const match = rule ? /^bottom-percent:(\d+)$/.exec(rule) : null;
  if (!match) return null;
  const percent = Number(match[1]);
  return percent >= 1 && percent <= 100 ? percent : null;
}

export interface ZoneCounts {
  /** Cuántas posiciones desde el rank 1 caen en la zona de ascenso. 0 = sin ascenso. */
  promoteCount: number;
  /** Cuántas posiciones desde el último rank caen en la zona de descenso. 0 = sin descenso. */
  demoteCount: number;
}

/**
 * `G` = cantidad REAL de participaciones del grupo (nunca la capacidad
 * teórica). Idéntico al cálculo de `decideOutcomes`: `max(1, floor(G*p/100))`
 * para cada zona, con el tope de solapamiento (la zona de ascenso tiene
 * prioridad de asignación -- ADR-0020 §4, punto 5).
 *
 * `G < MINIMUM_PARTICIPANTS_FOR_PROMOTION` -> ambas zonas en 0 (todo RETENTION).
 */
export function computeZoneCounts(input: { participantCount: number; promotionRule: string | null; demotionRule: string | null }): ZoneCounts {
  const G = input.participantCount;
  if (G < MINIMUM_PARTICIPANTS_FOR_PROMOTION) return { promoteCount: 0, demoteCount: 0 };

  const promotionPercent = parseTopPercent(input.promotionRule);
  const demotionPercent = parseBottomPercent(input.demotionRule);

  const promoteCount = promotionPercent != null ? Math.max(1, Math.floor((G * promotionPercent) / 100)) : 0;
  let demoteCount = demotionPercent != null ? Math.max(1, Math.floor((G * demotionPercent) / 100)) : 0;

  if (promoteCount + demoteCount > G) {
    demoteCount = Math.max(0, G - promoteCount);
  }

  return { promoteCount, demoteCount };
}

/**
 * Zona de UNA fila. `isHighestTier` -> una fila en zona de ascenso se
 * resuelve RETENTION (no hay tier superior). `isLowestTier` -> una fila en
 * zona de descenso se resuelve RETENTION (Bronce no desciende). Idéntico al
 * `for (const r of ranked)` de `decideOutcomes`.
 */
export function resolveCompetitiveZone(input: {
  rankPosition: number;
  participantCount: number;
  promoteCount: number;
  demoteCount: number;
  isHighestTier: boolean;
  isLowestTier: boolean;
}): CompetitiveZone {
  const { rankPosition, participantCount: G, promoteCount, demoteCount, isHighestTier, isLowestTier } = input;

  if (promoteCount > 0 && rankPosition <= promoteCount) {
    return isHighestTier ? 'RETENTION' : 'PROMOTION';
  }
  if (demoteCount > 0 && rankPosition > G - demoteCount) {
    return isLowestTier ? 'RETENTION' : 'DEMOTION';
  }
  return 'RETENTION';
}

/** Atajo: zona directa desde el contexto del grupo, para un llamador que no cachea los counts. */
export function competitiveZoneFor(input: {
  rankPosition: number;
  participantCount: number;
  promotionRule: string | null;
  demotionRule: string | null;
  isHighestTier: boolean;
  isLowestTier: boolean;
}): CompetitiveZone {
  const { promoteCount, demoteCount } = computeZoneCounts(input);
  return resolveCompetitiveZone({ ...input, promoteCount, demoteCount });
}
