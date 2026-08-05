import type { ChallengeSummary } from '@axioma/contracts';
// Import SOLO de tipo -- se borra en compilación (esbuild/tsc lo elide),
// así este módulo NUNCA arrastra en tiempo de ejecución `./client.ts`
// (que sí importa `expo-secure-store`, no evaluable fuera de Expo/RN).
// Esto es lo que permite gatear esta función con `tsx` puro, sin runtime
// de React Native -- ver docs/adr/BLOCK-III-DEFINITION.md §4.18.
import type { ApiResult } from '../api/client';

export type ClaimChallengeOutcome =
  | { kind: 'ok'; data: ChallengeSummary }
  /** 404 (§4.17 Gate 37) -- el desafío no existe o ya no pertenece a esta cuenta. */
  | { kind: 'not_found' }
  /** 409 (§4.17 Gate 38) -- el backend dice que TODAVÍA no está COMPLETED (o ya cambió de estado) -- la vista local está desactualizada. */
  | { kind: 'not_completed' }
  /** 503 (§4.17 Gate 41) -- la entrega no se pudo confirmar; `account_challenge` sigue COMPLETED en el backend, reintentable. */
  | { kind: 'retryable'; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'error'; message: string; status: number };

/**
 * Mapeo puro de `ApiResult` (respuesta ya recibida) a la intención de UI --
 * NO reinterpreta reglas de negocio, solo traduce código HTTP -> significado
 * ya fijado por el backend en §4.17 (Gate 37/38/41). Sin este mapeo
 * explícito, la pantalla tendría que repetir `result.status === 409` en
 * varios lugares -- una sola fuente de verdad para "qué significa cada
 * status de este endpoint".
 */
export function mapClaimResult(result: ApiResult<ChallengeSummary>): ClaimChallengeOutcome {
  if (result.ok) return { kind: 'ok', data: result.data };
  if (result.kind === 'network') return { kind: 'network', message: result.message };
  if (result.status === 404) return { kind: 'not_found' };
  if (result.status === 409) return { kind: 'not_completed' };
  if (result.status === 503) return { kind: 'retryable', message: result.message };
  return { kind: 'error', message: result.message, status: result.status };
}
