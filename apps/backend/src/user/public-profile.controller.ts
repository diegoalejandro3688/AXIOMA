import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  claimPublicProfileRequestSchema,
  changePublicUsernameRequestSchema,
  setPublicProfileVisibilityRequestSchema,
  publicProfileResponseSchema,
  type PublicProfileResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { UserService } from './user.service';
import type { PublicProfile } from '../generated/prisma/client';

function toPublicProfileResponse(profile: PublicProfile): PublicProfileResponse {
  return publicProfileResponseSchema.parse({
    accountId: profile.accountId,
    username: profile.usernameNormalized,
    visibilityStatus: profile.visibilityStatus,
    lifecycleStatus: profile.lifecycleStatus,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  });
}

/**
 * Endpoints de autoservicio de `public_profile` -- ver
 * docs/adr/0018-public-profile-foundation.md. Deliberadamente separados
 * de `UserController` (`/user/profile`, perfil PRIVADO) -- rutas, DTOs y
 * dominio conceptual distintos (identidad pública vs. perfil privado),
 * mismo criterio de separación que PROGRESS/EDUCATION (ADR-0014).
 *
 * Todos operan sobre `request.accountId` (AuthGuard) -- nunca un id
 * recibido del cliente.
 *
 * `POST` es, hoy, el único punto de entrada real a la creación perezosa
 * (Competir todavía no existe -- Bloque IV). Cuando exista, invocará el
 * mismo `UserService.ensurePublicProfile` -- sin rediseño.
 */
@Controller('user/public-profile')
@UseGuards(AuthGuard)
export class PublicProfileController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async claim(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicProfileResponse> {
    const input = parseRequestBody(claimPublicProfileRequestSchema, body);
    const { profile, created } = await this.userService.ensurePublicProfile(request.accountId, input.username);
    res.status(created ? 201 : 200);
    return toPublicProfileResponse(profile);
  }

  @Get()
  async getOwn(@Req() request: AuthenticatedRequest): Promise<PublicProfileResponse> {
    const profile = await this.userService.getPublicProfile(request.accountId);
    return toPublicProfileResponse(profile);
  }

  @Patch('visibility')
  async setVisibility(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<PublicProfileResponse> {
    const input = parseRequestBody(setPublicProfileVisibilityRequestSchema, body);
    const profile = await this.userService.setPublicProfileVisibility(request.accountId, input.visible);
    return toPublicProfileResponse(profile);
  }

  @Patch('username')
  async changeUsername(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<PublicProfileResponse> {
    const input = parseRequestBody(changePublicUsernameRequestSchema, body);
    const profile = await this.userService.changePublicUsername(request.accountId, input.username);
    return toPublicProfileResponse(profile);
  }
}
