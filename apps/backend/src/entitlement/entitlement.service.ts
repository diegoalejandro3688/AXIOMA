import { Injectable, Optional } from '@nestjs/common';
import type { PremiumTier } from '@axioma/contracts';
import { AccountSubscriptionRepository, toDerivableSubscription } from './subscription/account-subscription.repository';
import { deriveSubscriptionTier } from './subscription/derive-subscription-tier';

/** Tier de authorization de una cuenta -- estructuralmente igual a `PremiumTier` de `@axioma/contracts`. */
export type EntitlementTier = PremiumTier;

/** Proyeccion interna MINIMA del entitlement -- solo `tier`. Ningun consumidor conoce el concepto de plan/precio/suscripcion. */
export interface AccountEntitlement {
  tier: EntitlementTier;
}

/**
 * PREMIUM V1 -- Capa 1 (Entitlement backend), C1.1 · Capa 3 (Billing), C3.1.
 *
 * FUENTE DE VERDAD UNICA Y TRANSVERSAL de authorization: "que tier tiene esta
 * cuenta AHORA MISMO". Estudio, Ensayos, Progreso e IA consumen
 * `getEntitlement` exactamente igual -- ninguno conoce el concepto de
 * plan/tier/suscripcion en si.
 *
 * PRECEDENCIA de resolucion del tier (ADR seccion 6 / task C3.1 seccion 6):
 *
 *   1. Override explicito de QA (`testOnlyTierOverride`) -- SOLO alcanzable
 *      via `EntitlementInternalAdminController` (`InternalOpsGuard` +
 *      `rejectInProduction`) y su alias de IA. Nunca en produccion, nunca
 *      desde una superficie de producto. Mapa EN MEMORIA, se reinicia en
 *      cada arranque, nunca se persiste. Se conserva hasta que Billing este
 *      plenamente operativo (Capa 3 completa) para poder hacer QA sin compras
 *      reales.
 *   2. `AccountSubscription` verificada -- la fila "vigente" de la cuenta
 *      (`AccountSubscriptionRepository.findCurrentByAccountId`, regla de
 *      seleccion determinista) proyectada a `deriveSubscriptionTier`
 *      (funcion PURA, matriz de ciclo de vida de la ADR seccion E). C3.1 solo
 *      LEE esta tabla: las escrituras (verificacion de Google, RTDN) llegan
 *      en C3.2/C3.3.
 *   3. FREE -- por defecto (sin override y sin suscripcion vigente).
 *
 * FRONTERA CONGELADA authorization <-> billing: `AccountSubscription` es la
 * verdad comercial (`state`, `expiryTime`, `autoRenewing`, token de store);
 * `AccountEntitlement` es `{ tier }` y NADA MAS. Cancelar la renovacion
 * automatica NO degrada: la derivacion depende de la VIGENCIA del periodo
 * pagado (`expiryTime > now`), nunca de `autoRenewing`. Ningun endpoint de
 * contenido conoce `state`/`expiryTime`/`autoRenewing`; solo leen `tier`.
 *
 * El repositorio es OPCIONAL en el constructor: sin el (p. ej. en un gate
 * puro que hace `new EntitlementService()`), toda cuenta deriva FREE -- el
 * comportamiento previo a C3.1, intacto.
 */
@Injectable()
export class EntitlementService {
  private readonly testOnlyTierOverride = new Map<string, EntitlementTier>();

  constructor(@Optional() private readonly subscriptionRepo?: AccountSubscriptionRepository) {}

  async getEntitlement(accountId: string): Promise<AccountEntitlement> {
    // 1. Override explicito de QA (nunca produccion, nunca UI de producto).
    const override = this.testOnlyTierOverride.get(accountId);
    if (override !== undefined) return { tier: override };

    // 2. Suscripcion verificada -> derivacion pura.
    if (this.subscriptionRepo) {
      const row = await this.subscriptionRepo.findCurrentByAccountId(accountId);
      return { tier: deriveSubscriptionTier(toDerivableSubscription(row), new Date()) };
    }

    // 3. Default conservador.
    return { tier: 'FREE' };
  }

  /**
   * Solo para uso de `EntitlementInternalAdminController` (gates/desarrollo)
   * y del alias retrocompatible `AiEntitlementService.setTestOnlyTierOverride`.
   * Nunca alcanzable con trafico real ni en produccion.
   */
  setTestOnlyTierOverride(accountId: string, tier: EntitlementTier | null): void {
    if (tier === null) this.testOnlyTierOverride.delete(accountId);
    else this.testOnlyTierOverride.set(accountId, tier);
  }
}
