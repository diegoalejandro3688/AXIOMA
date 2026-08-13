import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { aiMeStatusResponseSchema, type AiMeStatusResponse } from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { AiConversationService } from './ai-conversation.service';
import { AXIOMA_TUTOR_DISCLAIMER } from './ai-pedagogy';

/**
 * `GET /ai/me/status` -- LEF Bloque VI, Incremento 8 (cierre del hueco
 * detectado en la verificación práctica de la superficie móvil): una cuenta
 * SIN conversaciones no podía ver su cuota diaria ni el disclaimer, porque
 * ambos solo viajaban dentro de la respuesta de una conversación. La
 * alternativa -- que mobile los fabricara localmente -- está explícitamente
 * prohibida por el contrato del incremento ("el cliente nunca decide
 * localmente si queda cupo").
 *
 * Superficie 100% `me` y 100% de LECTURA, mismo guard (`AuthGuard`) y mismo
 * criterio de whitelisting que `AiConversationController`:
 *
 *  - NO crea conversación, NO crea mensaje, NO consume cuota (nunca escribe
 *    en `ai_usage_ledger`, solo lo cuenta), NO toca `AiGenerationClaim`.
 *  - NO invoca al `AiProvider` -- este archivo no importa ni `AI_PROVIDER`
 *    ni ninguna implementación de proveedor, ni directa ni transitivamente
 *    por la vía que usa (`AiConversationService.getAccountStatus`).
 *  - NO expone tier/entitlement crudo, ni proveedor/modelo/tokens/coste:
 *    la ÚNICA proyección del entitlement es `dailyQuota.limit`, que ya es
 *    contractual desde el Incremento 3.
 *  - NO expone `turnCount`/`maxTurns`: son conceptos POR CONVERSACIÓN, no
 *    por cuenta -- pedirlos aquí obligaría a inventar una conversación.
 *
 * `dailyQuota` se obtiene de la MISMA lógica canónica
 * (`AiConversationService.getAccountStatus` -> `getDailyQuotaView`) que
 * alimenta create/list/get/sendMessage -- la fórmula no se duplica. El
 * `disclaimer` es la MISMA constante `AXIOMA_TUTOR_DISCLAIMER`
 * (`ai-pedagogy.ts`, Incremento 5, decisión N) que ya usa
 * `AiConversationController`, nunca un segundo texto paralelo.
 *
 * Controller separado (no un método más de `AiConversationController`)
 * únicamente porque la ruta no cuelga de `ai/me/conversations`; comparte
 * guard, servicio y criterios.
 */
@Controller('ai/me')
@UseGuards(AuthGuard)
export class AiStatusController {
  constructor(private readonly aiConversationService: AiConversationService) {}

  @Get('status')
  async getStatus(@Req() request: AuthenticatedRequest): Promise<AiMeStatusResponse> {
    const view = await this.aiConversationService.getAccountStatus(request.accountId);
    return aiMeStatusResponseSchema.parse({
      dailyQuota: {
        limit: view.dailyQuota.limit,
        consumed: view.dailyQuota.consumed,
        remaining: view.dailyQuota.remaining,
        resetAt: view.dailyQuota.resetAt.toISOString(),
      },
      // Incremento 5, decisión N -- valor constante del backend, nunca generado por el modelo (ver ai-pedagogy.ts).
      disclaimer: AXIOMA_TUTOR_DISCLAIMER,
    });
  }
}
