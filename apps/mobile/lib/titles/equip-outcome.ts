import type { EquippedTitleResponse } from '@axioma/contracts';
// Import SOLO de tipo -- mismo criterio que `lib/cosmetics/equip-outcome.ts`
// (§4.18): este módulo nunca arrastra `./client.ts` en tiempo de ejecución,
// gateable con `tsx` puro.
import type { ApiResult } from '../api/client';

export type EquipTitleOutcome =
  | { kind: 'ok'; data: EquippedTitleResponse | null }
  /** 404 -- título inexistente o no perteneciente a la cuenta: reconciliar recargando TODO el catálogo, no adivinar. */
  | { kind: 'reload' }
  /** 409 -- el título ya no está disponible o no es presentable públicamente: conservar el equipamiento anterior. */
  | { kind: 'conflict'; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'error'; message: string; status: number };

/**
 * Mapeo puro -- mismo criterio exacto que `mapEquipResult` (cosméticos):
 * solo traduce status HTTP a intención de UI, sin repetir ninguna regla de
 * negocio ya decidida por `TitleEquipmentService` (Bloque III).
 */
export function mapEquipTitleResult(result: ApiResult<EquippedTitleResponse | null>): EquipTitleOutcome {
  if (result.ok) return { kind: 'ok', data: result.data };
  if (result.kind === 'network') return { kind: 'network', message: result.message };
  if (result.status === 404) return { kind: 'reload' };
  if (result.status === 409) return { kind: 'conflict', message: result.message };
  return { kind: 'error', message: result.message, status: result.status };
}
