import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  googlePlayBillingContextResponseSchema,
  subscriptionReconcileRequestSchema,
  subscriptionReconcileResponseSchema,
  type GooglePlayBillingContextResponse,
  type SubscriptionReconcileResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { BillingIdentityService } from './billing-identity.service';
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
  constructor(
    private readonly reconciliation: SubscriptionReconciliationService,
    private readonly billingIdentity: BillingIdentityService,
  ) {}

  /**
   * PB-1A -- `POST /me/subscription/google-play/billing-context`. El movil lo
   * llama UNA vez antes de `launchBillingFlow`. Aprovisiona (perezosamente) y
   * devuelve `billingAccountRef` -- el `obfuscatedAccountId` opaco y estable de
   * la cuenta. Es POST y no GET porque la PRIMERA llamada ESCRIBE
   * (`Account.obfuscatedAccountId`); las siguientes devuelven el mismo valor
   * (idempotente desde la vista del cliente). SIN body: el `accountId` sale
   * SIEMPRE de la sesion, nunca del cliente, y no se acepta `billingAccountRef`
   * entrante. La respuesta NUNCA lleva `accountId` / Firebase UID /
   * `purchaseToken` / estado de suscripcion.
   */
  @Post('billing-context')
  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @HttpCode(200)
  async billingContext(@Req() request: AuthenticatedRequest): Promise<GooglePlayBillingContextResponse> {
    const billingAccountRef = await this.billingIdentity.provisionBillingAccountRef(request.accountId);
    return googlePlayBillingContextResponseSchema.parse({ billingAccountRef });
  }

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
