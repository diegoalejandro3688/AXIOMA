import { userProfileResponseSchema, type UserProfileResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/** Wrappers tipados sobre USER (ADR-0008) -- ver ADR-0013. */

export function getProfile(): Promise<ApiResult<UserProfileResponse>> {
  return apiRequest('GET', '/user/profile', { schema: userProfileResponseSchema });
}

export function initializeProfile(input: { displayName: string; timezone?: string }): Promise<ApiResult<UserProfileResponse>> {
  return apiRequest('POST', '/user/profile', { body: input, schema: userProfileResponseSchema });
}

export function updateProfile(input: { displayName?: string; timezone?: string }): Promise<ApiResult<UserProfileResponse>> {
  return apiRequest('PATCH', '/user/profile', { body: input, schema: userProfileResponseSchema });
}
