import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  subscriptionReconcileRequestSchema,
  subscriptionReconcileResponseSchema,
  type SubscriptionReconcileResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { SubscriptionReconciliationService } from './subscription-reconciliation.service';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
 *
 * `POST /me/subscription/google-play/reconcile` -- endpoint autenticado que
 * el movil (C3.5) llamara tras una compra / restore. El body es EXACTAMENTE
 * `{ purchaseToken }` (`.strict()`): el cliente NUNCA envia `accountId` /
 * `tier` / `state` / `expiryTime` / `autoRenewing` / un `productId`. El
 * `accountId` sale de la sesion; la identidad real del producto la determina
 * la verificacion con Google.
 *
 * Respuesta MINIMA: `{ status: 'verified' | 'pending' }`. El movil consulta
 * `GET /me/entitlement` para la verdad de authorization. NUNCA se devuelve el
 * payload crudo de Google ni se hace eco del `purchaseToken`.
 */
@Controller('me/subscription/google-play')
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(private readonly reconciliation: SubscriptionReconciliationService) {}

  @Post('reconcile')
  // Reconciliar es idempotente y seguro de reintentar; un cliente legitimo lo
  // llama pocas veces por compra + en restore. Limite generoso (por encima del
  // trafico real y del volumen de los gates) pero acotado contra abuso.
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @HttpCode(200)
  async reconcile(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<SubscriptionReconcileResponse> {
    const { purchaseToken } = parseRequestBody(subscriptionReconcileRequestSchema, body);
    const result = await this.reconciliation.reconcilePurchase({ accountId: request.accountId, purchaseToken });
    return subscriptionReconcileResponseSchema.parse({ status: result.status });
  }
}
