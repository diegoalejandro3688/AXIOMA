import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { adsConfigResponseSchema, type AdsConfigResponse } from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AdsConfigService } from './ads-config.service';

/**
 * `GET /me/ads-config` -- ADS V1, ADS-1B.
 *
 * Superficie 100% `me`, 100% de LECTURA, mismo `AuthGuard` y mismo criterio que
 * el resto de `/me/*`: opera SIEMPRE sobre `request.accountId` (nunca un id
 * recibido del cliente). Respuesta validada con `adsConfigResponseSchema`
 * (`.strict()`): ningun campo extra. PREMIUM y cualquier fallo -> todo apagado.
 */
@Controller('me/ads-config')
@UseGuards(AuthGuard)
export class AdsConfigController {
  constructor(private readonly adsConfigService: AdsConfigService) {}

  @Get()
  async getAdsConfig(@Req() request: AuthenticatedRequest): Promise<AdsConfigResponse> {
    const config = await this.adsConfigService.getConfig(request.accountId);
    return adsConfigResponseSchema.parse(config);
  }
}
