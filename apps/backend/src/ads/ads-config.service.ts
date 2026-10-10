import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ADS_CONFIG_OFF, type AdsConfigResponse } from '@axioma/contracts';
import { EntitlementService } from '../entitlement/entitlement.service';
import { resolveAdsConfig } from './ads-config';

/**
 * ADS V1 -- ADS-1B. Configuracion remota de anuncios por cuenta.
 *
 * Consume UNICAMENTE `EntitlementService.getEntitlement` (la fuente de verdad
 * transversal de authorization): este servicio no conoce suscripciones ni
 * facturacion. Cualquier fallo al resolver el tier produce TODO apagado --
 * nunca propaga un error ni un valor "optimista" (la publicidad es UI
 * opcional; un error aqui jamas debe bloquear la navegacion).
 */
@Injectable()
export class AdsConfigService {
  constructor(
    private readonly entitlementService: EntitlementService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async getConfig(accountId: string): Promise<AdsConfigResponse> {
    try {
      const { tier } = await this.entitlementService.getEntitlement(accountId);
      return resolveAdsConfig(tier, (key) => this.config?.get<string>(key));
    } catch {
      return { ...ADS_CONFIG_OFF };
    }
  }
}
