import { listCosmeticsResponseSchema, equipCosmeticResponseSchema, type ListCosmeticsResponse, type CosmeticSlotValue } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';
import { mapEquipResult, type EquipCosmeticOutcome } from '../cosmetics/equip-outcome';

export type { EquipCosmeticOutcome };

/**
 * Wrappers tipados sobre el Incremento 5 (Cosméticos), sub-incremento 5.c --
 * ver docs/adr/BLOCK-III-DEFINITION.md §4.21. Ambos endpoints operan sobre
 * `request.accountId` (AuthGuard) en el backend -- este cliente nunca
 * envía ni recibe un accountId explícito.
 */
export function listCosmetics(): Promise<ApiResult<ListCosmeticsResponse>> {
  return apiRequest('GET', '/gamification/me/cosmetics', { schema: listCosmeticsResponseSchema });
}

/**
 * Nunca equipa de forma optimista -- el llamador solo debe actualizar su
 * estado local con `outcome.data` (la respuesta REAL del servidor) tras un
 * 200, o reconciliar/conservar según `outcome.kind` (ver `equip-outcome.ts`).
 */
export async function equipCosmetic(slot: CosmeticSlotValue, inventoryItemId: string): Promise<EquipCosmeticOutcome> {
  const result = await apiRequest('PUT', `/gamification/me/cosmetics/equipped/${slot}`, {
    body: { inventoryItemId },
    schema: equipCosmeticResponseSchema,
  });
  return mapEquipResult(result);
}
