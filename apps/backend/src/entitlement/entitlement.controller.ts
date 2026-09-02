import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { accountEntitlementResponseSchema, type AccountEntitlementResponse } from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { EntitlementService } from './entitlement.service';

/**
 * `GET /me/entitlement` -- PREMIUM V1, Capa 1 (C1.1).
 *
 * Superficie 100% `me`, 100% de LECTURA, mismo `AuthGuard` y mismo criterio
 * de whitelisting que el resto de `/*\/me/*` del proyecto: opera SIEMPRE
 * sobre `request.accountId` (nunca un id recibido del cliente).
 *
 * Proyeccion MINIMA: unicamente `tier`. `accountEntitlementResponseSchema`
 * es `.strict()` -- cualquier campo adicional (precio, estado de
 * suscripcion, fechas) es un error de contrato, nunca se filtra. Endpoint
 * separado por decision congelada: `GET /auth/me` no absorbe el tier.
 */
@Controller('me/entitlement')
@UseGuards(AuthGuard)
export class EntitlementController {
  constructor(private readonly entitlementService: EntitlementService) {}

  @Get()
  async getEntitlement(@Req() request: AuthenticatedRequest): Promise<AccountEntitlementResponse> {
    const entitlement = await this.entitlementService.getEntitlement(request.accountId);
    return accountEntitlementResponseSchema.parse({ tier: entitlement.tier });
  }
}
