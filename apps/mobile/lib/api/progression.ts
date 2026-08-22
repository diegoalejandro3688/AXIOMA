import { levelProgressResponseSchema, streakResponseSchema, type LevelProgressResponse, type StreakResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * Wrappers tipados sobre "Progresión visible" (Bloque II, ya cerrado) --
 * ver docs/adr/BLOCK-II-DEFINITION.md. Ambos endpoints operan sobre
 * `request.accountId` (AuthGuard), este cliente nunca envía un accountId
 * explícito.
 */

export function getLevel(): Promise<ApiResult<LevelProgressResponse>> {
  return apiRequest('GET', '/gamification/me/level', { schema: levelProgressResponseSchema });
}

export function getStreak(): Promise<ApiResult<StreakResponse>> {
  return apiRequest('GET', '/gamification/me/streak', { schema: streakResponseSchema });
}
