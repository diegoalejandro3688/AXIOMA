import type { GetLeagueParticipationResponse, PostLeagueParticipationResponse } from '@axioma/contracts';
// Import SOLO de tipo -- se elide en compilación, así este módulo NUNCA
// arrastra en tiempo de ejecución `../api/client.ts` (que sí importa
// `expo-secure-store`, no evaluable fuera de Expo/RN). Esto es lo que
// permite gatear esta función con `tsx` puro, sin runtime de React Native
// -- mismo criterio que `lib/challenges/claim-outcome.ts`.

export type LeagueParticipationView =
  | { kind: 'enrolled'; leagueName: string; status: string }
  | { kind: 'not_enrolled' }
  | { kind: 'no_active_season' };

/**
 * Mapeo puro de la respuesta ya recibida (GET o POST, mismo shape de
 * `outcome: 'ENROLLED'`) a la intención de UI -- NO decide si llamar al
 * backend, solo traduce un resultado ya obtenido. El hub muestra la acción
 * "Unirme a la liga" ÚNICAMENTE cuando `kind === 'not_enrolled'` --
 * verificado en el gate, nunca en `ENROLLED`/`NO_ACTIVE_SEASON`.
 */
export function describeParticipation(
  response: GetLeagueParticipationResponse | PostLeagueParticipationResponse,
): LeagueParticipationView {
  if (response.outcome === 'ENROLLED') {
    return { kind: 'enrolled', leagueName: response.leagueName, status: response.status };
  }
  if (response.outcome === 'NOT_ENROLLED') {
    return { kind: 'not_enrolled' };
  }
  return { kind: 'no_active_season' };
}

/** Única condición para mostrar el botón "Unirme a la liga" -- una sola fuente de verdad, no repetida en la pantalla. */
export function showJoinButton(view: LeagueParticipationView): boolean {
  return view.kind === 'not_enrolled';
}
