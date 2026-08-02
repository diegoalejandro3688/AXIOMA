import { createSessionResponseSchema, meResponseSchema, type CreateSessionResponse, type MeResponse } from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

export function createSession(idToken: string): Promise<ApiResult<CreateSessionResponse>> {
  return apiRequest('POST', '/auth/session', {
    body: { idToken },
    schema: createSessionResponseSchema,
    skipAuth: true, // este endpoint crea la sesión -- no puede depender de una ya existente.
  });
}

export function getMe(): Promise<ApiResult<MeResponse>> {
  return apiRequest('GET', '/auth/me', { schema: meResponseSchema });
}

export function logout(): Promise<ApiResult<void>> {
  return apiRequest('POST', '/auth/logout');
}
