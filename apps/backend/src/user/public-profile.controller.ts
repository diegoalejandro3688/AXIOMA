import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  claimPublicProfileRequestSchema,
  changePublicUsernameRequestSchema,
  setPublicProfileVisibilityRequestSchema,
  equipTitleRequestSchema,
  publicProfileResponseSchema,
  equippedTitleResponseSchema,
  competitiveProfileResponseSchema,
  meCompetitiveProfileResponseSchema,
  type PublicProfileResponse,
  type EquippedTitleResponse,
  type CompetitiveProfileResponse,
  type MeCompetitiveProfileResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { UserService, type CompetitiveProfileView, type MeCompetitiveProfileView } from './user.service';
import type { PublicProfile } from '../generated/prisma/client';
import type { EquippedTitleWithDetails } from '../gamification/equipped-title.repository';

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

function toEquippedTitleResponse(equipped: EquippedTitleWithDetails): EquippedTitleResponse {
  return equippedTitleResponseSchema.parse({
    accountTitleId: equipped.accountTitleId,
    titleDefinitionId: equipped.accountTitle.titleDefinition.id,
    titleKey: equipped.accountTitle.titleDefinition.titleKey,
    displayText: equipped.accountTitle.titleDefinition.displayText,
    rarityClass: equipped.accountTitle.titleDefinition.rarityClass,
    equippedAt: equipped.equippedAt.toISOString(),
  });
}

/** Bloque IV, Incremento 3, sub-incremento 3.b (ADR-0021) -- `.parse()` es también el punto donde un `Date` se serializa a ISO string. */
function toCompetitiveProfileResponse(view: CompetitiveProfileView): CompetitiveProfileResponse {
  return competitiveProfileResponseSchema.parse({
    ...view,
    competitive: view.competitive ? { ...view.competitive, calculatedAt: view.competitive.calculatedAt.toISOString() } : null,
    publicAchievements: view.publicAchievements.map((a) => ({ ...a, unlockedAt: a.unlockedAt.toISOString() })),
  });
}

function toMeCompetitiveProfileResponse(view: MeCompetitiveProfileView): MeCompetitiveProfileResponse {
  return meCompetitiveProfileResponseSchema.parse({
    ...toCompetitiveProfileResponse(view),
    lifecycleStatus: view.lifecycleStatus,
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

  /**
   * Bloque III, sub-incremento 3.b -- `accountTitleId: null` quita el
   * título equipado (acción explícita, no un no-op silencioso de "nada
   * enviado"). Gates 13-15 se validan en `UserService`/
   * `TitleEquipmentService`, no aquí -- este controller solo traduce
   * HTTP <-> dominio.
   */
  @Patch('equipped-title')
  async setEquippedTitle(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<EquippedTitleResponse | null> {
    const input = parseRequestBody(equipTitleRequestSchema, body);
    if (input.accountTitleId === null) {
      await this.userService.unequipTitle(request.accountId);
      return null;
    }
    const equipped = await this.userService.equipTitle(request.accountId, input.accountTitleId);
    return toEquippedTitleResponse(equipped);
  }

  @Get('equipped-title')
  async getEquippedTitle(@Req() request: AuthenticatedRequest): Promise<EquippedTitleResponse | null> {
    const equipped = await this.userService.getEquippedTitle(request.accountId);
    return equipped ? toEquippedTitleResponse(equipped) : null;
  }

  /**
   * Bloque IV, Incremento 3, sub-incremento 3.b (ADR-0021 §5) --
   * autoconsulta del perfil competitivo. Registrada ANTES de
   * `:username/competitive-profile` a propósito: NestJS/Express resuelve
   * rutas superpuestas por orden de declaración dentro del mismo
   * controller -- si `:username/competitive-profile` se declarara primero,
   * capturaría también `/me/competitive-profile` tratando "me" como un
   * username literal, nunca alcanzando este método.
   */
  @Get('me/competitive-profile')
  async getMyCompetitiveProfile(@Req() request: AuthenticatedRequest): Promise<MeCompetitiveProfileResponse> {
    const view = await this.userService.getMyCompetitiveProfile(request.accountId);
    return toMeCompetitiveProfileResponse(view);
  }

  /**
   * Bloque IV, Incremento 3, sub-incremento 3.b (ADR-0021 §1/§3) --
   * perfil competitivo de OTRA cuenta, primer endpoint público
   * cross-cuenta de la aplicación. `UserService.getCompetitiveProfileByUsername`
   * ya normaliza el username y aplica el 404 uniforme -- este controller
   * no distingue ningún caso, solo traduce HTTP <-> dominio.
   */
  @Get(':username/competitive-profile')
  async getCompetitiveProfileByUsername(@Param('username') username: string): Promise<CompetitiveProfileResponse> {
    const view = await this.userService.getCompetitiveProfileByUsername(username);
    return toCompetitiveProfileResponse(view);
  }
}
