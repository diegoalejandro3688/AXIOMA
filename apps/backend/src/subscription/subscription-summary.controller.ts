import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { subscriptionSummaryResponseSchema, type SubscriptionSummaryResponse } from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { SubscriptionService } from './subscription.service';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1B.
 *
 * `GET /me/subscription` -- datos de la PANTALLA DE GESTION de suscripcion +
 * la condicion de la advertencia al eliminar la cuenta. SOLO LECTURA:
 *   - NO llama a Google;
 *   - NO aprovisiona `billingAccountRef` (eso es `POST .../google-play/billing-context`, PB-1A -- endpoint SEPARADO);
 *   - NO muta `AccountSubscription`.
 *
 * Respuesta validada por `subscriptionSummaryResponseSchema` (`.strict()`):
 * NUNCA emite `purchaseToken` / `linkedPurchaseToken` /
 * `resubscribedFromPurchaseToken` / `obfuscatedAccountId` / `billingAccountRef`
 * / `rawSnapshot` / el `subscriptionState` crudo de Google / order ids /
 * `accountId` / Firebase UID -- solo campos de gestion normalizados.
 *
 * Endpoint DISTINTO de `@Controller('me/subscription/google-play')`
 * (reconcile + billing-context). No se fusionan (PB-1B §9).
 */
@Controller('me/subscription')
@UseGuards(AuthGuard)
export class SubscriptionSummaryController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  async getSummary(@Req() request: AuthenticatedRequest): Promise<SubscriptionSummaryResponse> {
    const summary = await this.subscriptionService.getSummary(request.accountId);
    return subscriptionSummaryResponseSchema.parse(summary);
  }
}
