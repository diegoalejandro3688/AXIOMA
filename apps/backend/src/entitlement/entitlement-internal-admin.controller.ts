import { BadRequestException, Controller, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalOpsGuard } from '../platform/internal-ops/internal-ops.guard';
import { EntitlementService, type EntitlementTier } from './entitlement.service';

/**
 * Endpoint operativo interno de PREMIUM V1 (Capa 1, C1.1) -- mismo criterio
 * EXACTO que `AiInternalAdminController` / `DiagnosticsController`:
 * protegido por `InternalOpsGuard` (clave compartida `x-internal-ops-key`)
 * Y, ademas, rechazado en produccion incluso con la clave correcta (nunca
 * alcanzable con trafico real).
 *
 * Sucesor transversal del override de tier que introdujo el Incremento 3 de
 * IA: fija (o limpia) el tier de UNA cuenta de prueba EN MEMORIA. Nunca crea
 * ni simula una tabla de suscripcion/billing. Es el unico camino a `PREMIUM`
 * mientras no exista billing real -- lo usan los gates de enforcement de
 * Estudio/Ensayos/Progreso (C1.2-C1.4) para demostrar ambos lados.
 */
@Controller('_internal/entitlement')
export class EntitlementInternalAdminController {
  constructor(
    private readonly config: ConfigService,
    private readonly entitlementService: EntitlementService,
  ) {}

  private rejectInProduction(): void {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
  }

  @Post('set-tier-override')
  @UseGuards(InternalOpsGuard)
  setTierOverride(@Query('accountId') accountId?: string, @Query('tier') tier?: string): { ok: true } {
    this.rejectInProduction();
    if (!accountId) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'accountId requerido.' });
    }
    if (tier !== undefined && tier !== 'FREE' && tier !== 'PREMIUM') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'tier debe ser FREE o PREMIUM.' });
    }
    this.entitlementService.setTestOnlyTierOverride(accountId, (tier as EntitlementTier | undefined) ?? null);
    return { ok: true };
  }
}
