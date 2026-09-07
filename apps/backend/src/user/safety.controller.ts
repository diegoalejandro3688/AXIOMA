import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  listBlockedUsersResponseSchema,
  reportPublicProfileRequestSchema,
  reportPublicProfileResponseSchema,
  blockUserResponseSchema,
  type BlockUserResponse,
  type ListBlockedUsersResponse,
  type ReportPublicProfileResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { SafetyService } from './safety.service';

/**
 * PS-0C.2 -- controles de seguridad sobre identidades públicas
 * (reportar / bloquear / desbloquear / listar bloqueos).
 *
 * Prefijo dedicado `user/safety` (no `user/public-profile/:username/...`)
 * para evitar cualquier colisión de orden de rutas con
 * `PublicProfileController` (`:username/competitive-profile`).
 *
 * `@Throttle` propio, más estricto que el global: reportar/bloquear son
 * acciones de baja frecuencia legítima; un límite acotado corta el patrón
 * obvio de spam sin infraestructura extra. Idempotencia + rechazo de
 * self-target hacen el resto.
 */
@Controller('user/safety')
@UseGuards(AuthGuard)
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Post('reports/:username')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async report(
    @Req() request: AuthenticatedRequest,
    @Param('username') username: string,
    @Body() body: unknown,
  ): Promise<ReportPublicProfileResponse> {
    const input = parseRequestBody(reportPublicProfileRequestSchema, body);
    const result = await this.safetyService.reportPublicProfile(request.accountId, username, input.reportType);
    return reportPublicProfileResponseSchema.parse(result);
  }

  @Post('blocks/:username')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  async block(
    @Req() request: AuthenticatedRequest,
    @Param('username') username: string,
  ): Promise<BlockUserResponse> {
    const result = await this.safetyService.blockUser(request.accountId, username);
    return blockUserResponseSchema.parse(result);
  }

  @Delete('blocks/:username')
  @HttpCode(200)
  async unblock(
    @Req() request: AuthenticatedRequest,
    @Param('username') username: string,
  ): Promise<{ unblocked: boolean }> {
    return this.safetyService.unblockUser(request.accountId, username);
  }

  @Get('blocks')
  async listBlocks(@Req() request: AuthenticatedRequest): Promise<ListBlockedUsersResponse> {
    const result = await this.safetyService.listMyBlocks(request.accountId);
    return listBlockedUsersResponseSchema.parse(result);
  }
}
