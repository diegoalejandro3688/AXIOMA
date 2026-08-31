import type { ChallengeSummary } from '@axioma/contracts';

export interface HubChallenges {
  daily: ChallengeSummary | null;
  weekly: ChallengeSummary | null;
}

/**
 * DESAFÍOS -- selección DETERMINISTA de la vista previa del hub Competir:
 * el PRIMER desafío de cada tipo ordenando por `challengeKey` ASCENDENTE.
 *
 * NUNCA se usa como criterio: `acceptedAt` (orden de materialización del
 * backend, NO un orden de producto estable -- ver auditoría previa),
 * progreso, dificultad, recompensa ni azar. Si no hay desafío de un tipo ->
 * `null` (esa fila simplemente no se renderiza).
 *
 * La colección completa se sigue cargando en el hub -- la pantalla completa
 * de Desafíos (Incremento 7) la necesita; este helper solo elige qué dos
 * previews mostrar.
 */
export function selectHubChallenges(challenges: readonly ChallengeSummary[]): HubChallenges {
  const firstByKey = (type: ChallengeSummary['challengeType']): ChallengeSummary | null => {
    const ofType = challenges.filter((c) => c.challengeType === type);
    if (ofType.length === 0) return null;
    return ofType.reduce((best, c) => (c.challengeKey < best.challengeKey ? c : best));
  };
  return { daily: firstByKey('DAILY'), weekly: firstByKey('WEEKLY') };
}

export interface ChallengeSections {
  daily: ChallengeSummary[];
  weekly: ChallengeSummary[];
}

/**
 * DESAFÍOS -- particiona la colección para la pantalla completa: por tipo,
 * cada grupo ordenado de forma ESTABLE por `challengeKey` ascendente.
 * MISMO criterio que `selectHubChallenges`: nunca `acceptedAt`, progreso,
 * dificultad, recompensa, estado ni azar. NO recorta -- el backend es la
 * autoridad sobre qué desafíos (y cuántos) devuelve para el período
 * actual, incluidos los ya COMPLETED/CLAIMED. No muta la entrada.
 */
export function challengeSections(challenges: readonly ChallengeSummary[]): ChallengeSections {
  const byKey = (a: ChallengeSummary, b: ChallengeSummary) => (a.challengeKey < b.challengeKey ? -1 : a.challengeKey > b.challengeKey ? 1 : 0);
  const ofType = (type: ChallengeSummary['challengeType']) => challenges.filter((c) => c.challengeType === type).slice().sort(byKey);
  return { daily: ofType('DAILY'), weekly: ofType('WEEKLY') };
}
