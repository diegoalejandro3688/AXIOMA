import { listTitlesResponseSchema, equippedTitleResponseSchema, type ListTitlesResponse, type EquippedTitleResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';
import { mapEquipTitleResult, type EquipTitleOutcome } from '../titles/equip-outcome';

export type { EquipTitleOutcome };

/**
 * LEF Bloque V, Incremento 6 (docs/adr/LEF-BLOCK-V-DEFINITION.md §14) --
 * catálogo de títulos: obtenidos + equipado + bloqueados con requisito
 * real. Mismo criterio que `listCosmetics` (Bloque III): `request.accountId`
 * exclusivamente, este cliente nunca envía un accountId explícito.
 */
export function listTitles(): Promise<ApiResult<ListTitlesResponse>> {
  return apiRequest('GET', '/gamification/me/titles', { schema: listTitlesResponseSchema });
}

/**
 * Reutiliza el endpoint de equipamiento YA existente (Bloque III, sub-incremento
 * 3.b) -- `PATCH /user/public-profile/equipped-title`, nunca un endpoint
 * nuevo. `accountTitleId: null` quita el título equipado (acción explícita).
 * Sin equipamiento optimista -- el llamador solo actualiza su estado local
 * con la respuesta REAL del servidor (`outcome.data`), mismo criterio que
 * `equipCosmetic`.
 */
export async function equipTitle(accountTitleId: string | null): Promise<EquipTitleOutcome> {
  const result = await apiRequest<EquippedTitleResponse | null>('PATCH', '/user/public-profile/equipped-title', {
    body: { accountTitleId },
    schema: equippedTitleResponseSchema.nullable(),
  });
  return mapEquipTitleResult(result);
}
