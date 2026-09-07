import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import {
  acceptPublicParticipationTermsRequestSchema,
  publicParticipationTermsStatusResponseSchema,
  type PublicParticipationTermsStatusResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { PublicParticipationTermsService } from './public-participation-terms.service';

/**
 * PS-0C.2 -- superficie de AUTOSERVICIO de los "Términos de uso y
 * convivencia pública". Siempre `request.accountId` (AuthGuard). Consultar
 * el estado y aceptar la versión vigente: nada más. La aceptación NUNCA
 * bloquea el uso privado de ZETRYND -- es el propio flujo de publicación de
 * identidad pública (USER) el que exige `isCurrent` antes de volver
 * presentable un perfil.
 */
@Controller('me/public-participation-terms')
@UseGuards(AuthGuard)
export class ComplianceController {
  constructor(private readonly termsService: PublicParticipationTermsService) {}

  @Get()
  async getStatus(@Req() request: AuthenticatedRequest): Promise<PublicParticipationTermsStatusResponse> {
    const status = await this.termsService.getStatus(request.accountId);
    return publicParticipationTermsStatusResponseSchema.parse(status);
  }

  @Post('accept')
  @HttpCode(200)
  async accept(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<PublicParticipationTermsStatusResponse> {
    const input = parseRequestBody(acceptPublicParticipationTermsRequestSchema, body);
    const status = await this.termsService.accept(request.accountId, input.version);
    return publicParticipationTermsStatusResponseSchema.parse(status);
  }
}
