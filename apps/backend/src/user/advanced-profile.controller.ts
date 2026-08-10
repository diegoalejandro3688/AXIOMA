import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { myAdvancedProfileResponseSchema, type MyAdvancedProfileResponse } from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AdvancedProfileService, type MyAdvancedProfileView } from './advanced-profile.service';
import { toProfileResponse } from './user.controller';
import { toMeCompetitiveProfileResponse } from './public-profile.controller';
import { toCompetitiveHistoryResponse } from '../gamification/competitive-history.controller';

function toResponse(view: MyAdvancedProfileView): MyAdvancedProfileResponse {
  return myAdvancedProfileResponseSchema.parse({
    profile: view.profile ? toProfileResponse(view.profile) : null,
    publicProfile: view.publicProfile ? toMeCompetitiveProfileResponse(view.publicProfile) : null,
    // Ya viene serializado (ISO strings) por ProgressService.getAcademicSummary -- `academicSummaryResponseSchema.parse` ya se aplicó ahí.
    academicSummary: view.academicSummary,
    competitiveHistory: toCompetitiveHistoryResponse(view.competitiveHistory),
  });
}

/**
 * LEF Bloque V, Incremento 5 (docs/adr/LEF-BLOCK-V-DEFINITION.md §13) --
 * vista consolidada de perfil propio. EXCLUSIVAMENTE `request.accountId`,
 * nunca un id/username recibido del cliente -- sin superficie cross-cuenta,
 * mismo criterio que el resto de endpoints `me` de este proyecto.
 *
 * Reutiliza las funciones de serialización YA existentes de cada
 * incremento (`toProfileResponse`, `toMeCompetitiveProfileResponse`,
 * `toCompetitiveHistoryResponse`) -- nunca reimplementa el mapeo
 * dominio->contrato de otro incremento, evitando que este agregador
 * diverja silenciosamente de sus endpoints individuales.
 */
@Controller('user/me/advanced-profile')
@UseGuards(AuthGuard)
export class AdvancedProfileController {
  constructor(private readonly advancedProfileService: AdvancedProfileService) {}

  @Get()
  async getMyAdvancedProfile(@Req() request: AuthenticatedRequest): Promise<MyAdvancedProfileResponse> {
    const view = await this.advancedProfileService.getMyAdvancedProfile(request.accountId);
    return toResponse(view);
  }
}
