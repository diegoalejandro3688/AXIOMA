import { Injectable } from '@nestjs/common';
import { EntitlementService } from '../entitlement/entitlement.service';

export type AiTier = 'FREE' | 'PREMIUM';

export interface AiEntitlement {
  tier: AiTier;
  /** Turnos maximos por conversacion -- decision B (docs/adr/LEF-BLOCK-VI-DEFINITION.md 5/10). */
  maxTurns: number;
  /** Consultas consumidas maximas por dia UTC -- decision del Incremento 3. */
  dailyRequestLimit: number;
}

/**
 * Free = 6 turnos / 3 consultas diarias, Premium = 15 turnos / 50 consultas
 * diarias -- ambos pares son contractuales y definitivos del bloque IA. NO
 * migran fuera de este archivo.
 */
const ENTITLEMENTS: Record<AiTier, Omit<AiEntitlement, 'tier'>> = {
  FREE: { maxTurns: 6, dailyRequestLimit: 3 },
  PREMIUM: { maxTurns: 15, dailyRequestLimit: 50 },
};

/**
 * ADAPTADOR DELGADO -- PREMIUM V1, Capa 1 (C1.1).
 *
 * Hasta C1.0 este servicio era tambien la fuente de verdad del tier (mapa
 * `testOnlyTierOverride` propio + "toda cuenta es Free"). Esa
 * responsabilidad se movio a `EntitlementService` (`src/entitlement/`), la
 * fuente de verdad TRANSVERSAL de authorization que consumen tambien
 * Estudio/Ensayos/Progreso.
 *
 * Aqui solo queda el MAPEO tier -> allowance de IA (`ENTITLEMENTS`), que es
 * contractual del bloque IA y no le incumbe a ningun otro dominio.
 * `AiConversationService` no cambia: sigue llamando
 * `getEntitlement(accountId)` y leyendo `.maxTurns` / `.dailyRequestLimit`.
 */
@Injectable()
export class AiEntitlementService {
  constructor(private readonly entitlementService: EntitlementService) {}

  async getEntitlement(accountId: string): Promise<AiEntitlement> {
    const { tier } = await this.entitlementService.getEntitlement(accountId);
    return { tier, ...ENTITLEMENTS[tier] };
  }

  /**
   * Alias retrocompatible -- delega en `EntitlementService`.
   *
   * @deprecated Usar `EntitlementService.setTestOnlyTierOverride` /
   * `POST /_internal/entitlement/set-tier-override`. Se conserva para no
   * romper `AiInternalAdminController` ni `verify-ai-quota-gate.ts`; se
   * retira en Capa 3.
   */
  setTestOnlyTierOverride(accountId: string, tier: AiTier | null): void {
    this.entitlementService.setTestOnlyTierOverride(accountId, tier);
  }
}
