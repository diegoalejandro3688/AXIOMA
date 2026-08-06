import type { CompetitiveContext, LeaderboardRow } from '@axioma/contracts';
// Import SOLO de tipo -- se elide en compilación, así este módulo NUNCA
// arrastra en tiempo de ejecución `../api/client.ts` (que sí importa
// `expo-secure-store`, no evaluable fuera de Expo/RN). Gateable con `tsx`
// puro, mismo criterio que `lib/challenges/group-challenges.ts`.

/**
 * Añade una página nueva a las ya cargadas -- NUNCA reemplaza lo anterior
 * (precisión obligatoria del Product Owner). Deduplicación DEFENSIVA por
 * `rankPosition`: si una fila con la misma posición ya está cargada (p.
 * ej. un reintento tras un fallo parcial, o una re-consulta con el mismo
 * cursor), la fila ya presente se conserva y la entrante se descarta --
 * `rankPosition` es una secuencia total estricta dentro de un grupo
 * (@@unique en el backend, ADR-0020), así que dos filas con la misma
 * posición son SIEMPRE la misma fila lógica, nunca dos estudiantes
 * distintos.
 */
export function mergeLeaderboardPages(existing: LeaderboardRow[], incoming: LeaderboardRow[]): LeaderboardRow[] {
  const seenPositions = new Set(existing.map((row) => row.rankPosition));
  const newRows = incoming.filter((row) => !seenPositions.has(row.rankPosition));
  return [...existing, ...newRows];
}

export type MyPositionView =
  | { kind: 'known'; leagueName: string; rankPosition: number; metricValue: number }
  | { kind: 'pending' };

/**
 * `null` significa "la proyección de ranking todavía no calculó una
 * posición para esta cuenta" (ADR-0021 §2) -- NUNCA se fabrica un rango
 * (ej. "N/A" tratado como 0, o el último lugar). `kind: 'pending'` es un
 * estado de UI explícito, distinto de un error.
 */
export function describeMyPosition(context: CompetitiveContext | null): MyPositionView {
  if (!context) return { kind: 'pending' };
  return { kind: 'known', leagueName: context.leagueName, rankPosition: context.rankPosition, metricValue: context.metricValue };
}
