import type { CosmeticSummary } from '@axioma/contracts';
// Import SOLO de tipo -- se borra en compilación, así este módulo NUNCA
// arrastra en tiempo de ejecución `./client.ts` (que importa
// `expo-secure-store`) -- permite gatearlo con `tsx` puro, mismo criterio
// que `lib/challenges/claim-outcome.ts` (§4.18).
import type { ApiResult } from '../api/client';

export type EquipCosmeticOutcome =
  | { kind: 'ok'; data: CosmeticSummary }
  /** 404 -- perfil inexistente o inventario desactualizado: reconciliar recargando TODO (owned + equipped), no adivinar. */
  | { kind: 'reload' }
  /** 409 -- el cosmético ya no está disponible (revocado) o no corresponde a este slot: conservar el equipamiento anterior. */
  | { kind: 'conflict'; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'error'; message: string; status: number };

/**
 * Mapeo puro de `ApiResult` (respuesta ya recibida) a la intención de UI --
 * solo traduce status HTTP, sin repetir ninguna regla de negocio ya
 * decidida por el backend (5.b): ni valida propiedad, ni coincidencia de
 * slot, ni estado ACTIVE -- eso ya lo hizo el `PUT`.
 */
export function mapEquipResult(result: ApiResult<CosmeticSummary>): EquipCosmeticOutcome {
  if (result.ok) return { kind: 'ok', data: result.data };
  if (result.kind === 'network') return { kind: 'network', message: result.message };
  if (result.status === 404) return { kind: 'reload' };
  if (result.status === 409) return { kind: 'conflict', message: result.message };
  return { kind: 'error', message: result.message, status: result.status };
}
