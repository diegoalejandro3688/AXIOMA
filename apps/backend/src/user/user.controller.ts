import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  initializeUserProfileRequestSchema,
  updateUserProfileRequestSchema,
  userProfileResponseSchema,
  type UserProfileResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { UserService } from './user.service';
import type { UserProfile } from '../generated/prisma/client';

function toProfileResponse(profile: UserProfile): UserProfileResponse {
  return userProfileResponseSchema.parse({
    accountId: profile.accountId,
    displayName: profile.displayName,
    timezone: profile.timezone,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  });
}

/**
 * Todos los endpoints son de AUTOSERVICIO -- siempre operan sobre
 * `request.accountId` (resuelto y validado por AuthGuard a partir de la
 * sesión), nunca sobre un id recibido del cliente. Ver ADR-0008.
 */
@Controller('user/profile')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Crea el perfil si no existe (201) o devuelve el existente sin
   * modificarlo (200) -- un segundo POST nunca actualiza, para eso está
   * PATCH. Ver ADR-0008 para el manejo de la creación concurrente.
   */
  @Post()
  async initialize(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserProfileResponse> {
    const input = parseRequestBody(initializeUserProfileRequestSchema, body);
    const { profile, created } = await this.userService.initializeProfile(request.accountId, input);
    res.status(created ? 201 : 200);
    return toProfileResponse(profile);
  }

  @Get()
  async getOwn(@Req() request: AuthenticatedRequest): Promise<UserProfileResponse> {
    const profile = await this.userService.getProfile(request.accountId);
    return toProfileResponse(profile);
  }

  @Patch()
  async update(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<UserProfileResponse> {
    const input = parseRequestBody(updateUserProfileRequestSchema, body);
    const profile = await this.userService.updateProfile(request.accountId, input);
    return toProfileResponse(profile);
  }
}
