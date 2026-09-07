import {
  blockUserResponseSchema,
  listBlockedUsersResponseSchema,
  reportPublicProfileResponseSchema,
  type BlockUserResponse,
  type ListBlockedUsersResponse,
  type PublicProfileReportType,
  type ReportPublicProfileResponse,
} from '@axioma/contracts';
import { apiRequest, type ApiResult } from './client';

/**
 * PS-0C.2 -- controles de seguridad sobre identidades públicas. `username`
 * llega YA canónico (viene de una fila de ranking / de un perfil público);
 * se pasa tal cual. El backend resuelve el objetivo y nunca acepta un
 * `accountId` del cliente.
 */
export function reportPublicProfile(
  username: string,
  reportType: PublicProfileReportType,
): Promise<ApiResult<ReportPublicProfileResponse>> {
  return apiRequest('POST', `/user/safety/reports/${encodeURIComponent(username)}`, {
    body: { reportType },
    schema: reportPublicProfileResponseSchema,
  });
}

export function blockUser(username: string): Promise<ApiResult<BlockUserResponse>> {
  return apiRequest('POST', `/user/safety/blocks/${encodeURIComponent(username)}`, { schema: blockUserResponseSchema });
}

export function unblockUser(username: string): Promise<ApiResult<{ unblocked: boolean }>> {
  return apiRequest('DELETE', `/user/safety/blocks/${encodeURIComponent(username)}`);
}

export function listBlockedUsers(): Promise<ApiResult<ListBlockedUsersResponse>> {
  return apiRequest('GET', '/user/safety/blocks', { schema: listBlockedUsersResponseSchema });
}
