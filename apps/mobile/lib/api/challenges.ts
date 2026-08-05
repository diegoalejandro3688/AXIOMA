import { listChallengesResponseSchema, claimChallengeResponseSchema, type ListChallengesResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';
import { mapClaimResult, type ClaimChallengeOutcome } from '../challenges/claim-outcome';

export type { ClaimChallengeOutcome };

/**
 * Wrappers tipados sobre el Incremento 4 (Desafíos), sub-incremento 4.d --
 * ver docs/adr/BLOCK-III-DEFINITION.md §4.18. Ambos endpoints operan sobre
 * `request.accountId` (AuthGuard) en el backend -- este cliente nunca
 * envía ni recibe un accountId explícito.
 *
 * El mapeo de resultado del claim vive en `lib/challenges/claim-outcome.ts`
 * (sin dependencia de `expo-secure-store`/React Native) para poder
 * gatearlo con `tsx` puro -- este archivo solo conecta ese mapeo con
 * `apiRequest` real.
 */

export function listChallenges(): Promise<ApiResult<ListChallengesResponse>> {
  return apiRequest('GET', '/gamification/me/challenges', { schema: listChallengesResponseSchema });
}

/**
 * Nunca marca `CLAIMED` de forma optimista -- el llamador solo debe
 * actualizar su estado local con `outcome.data` (la respuesta REAL del
 * servidor), nunca antes de que esta promesa resuelva.
 */
export async function claimChallenge(accountChallengeId: string): Promise<ClaimChallengeOutcome> {
  const result = await apiRequest('POST', `/gamification/me/challenges/${accountChallengeId}/claim`, {
    schema: claimChallengeResponseSchema,
  });
  return mapClaimResult(result);
}
