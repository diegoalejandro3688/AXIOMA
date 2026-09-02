import { Injectable } from '@nestjs/common';
import type { PremiumTier } from '@axioma/contracts';

/** Tier de authorization de una cuenta -- estructuralmente igual a `PremiumTier` de `@axioma/contracts`. */
export type EntitlementTier = PremiumTier;

/** Proyeccion interna MINIMA del entitlement -- solo `tier`. Ningun consumidor conoce el concepto de plan/precio/suscripcion. */
export interface AccountEntitlement {
  tier: EntitlementTier;
}

/**
 * PREMIUM V1 -- Capa 1 (Entitlement backend), C1.1.
 *
 * FUENTE DE VERDAD UNICA Y TRANSVERSAL de authorization: "que tier tiene esta
 * cuenta AHORA MISMO". La reemplaza a la resolucion de tier que hasta C1.0
 * vivia embebida en `AiEntitlementService` (hoy un adaptador delgado sobre
 * este servicio). Estudio, Ensayos y Progreso consumiran `getEntitlement`
 * exactamente igual que IA -- ninguno conoce el concepto de plan/tier en si.
 *
 * FRONTERA PROVISIONAL (no es decision de dominio "las cuentas son Free"):
 * el esquema no tiene todavia ninguna tabla/campo de suscripcion. Mientras
 * no exista, `getEntitlement` resuelve toda cuenta como `FREE` -- la opcion
 * mas conservadora. `PREMIUM` solo se alcanza via `testOnlyTierOverride`
 * (mapa en memoria, poblado unicamente por `EntitlementInternalAdminController`,
 * rechazado en produccion, reiniciado en cada arranque -- nunca persistencia,
 * es un interruptor de prueba para los gates).
 *
 * FRONTERA CONGELADA authorization <-> billing (Capa 3): cuando exista
 * `AccountSubscription` (estado comercial: `autoRenew`, `currentPeriodEnd`,
 * token de store), este metodo derivara el tier de la VIGENCIA del periodo
 * -- `tier = (subscription && subscription.currentPeriodEnd > now) ? 'PREMIUM' : 'FREE'`.
 * Cancelar la renovacion automatica (`autoRenew === false`) NO degrada: la
 * cuenta sigue `PREMIUM` hasta la expiracion. Ningun endpoint de contenido
 * conoce `autoRenew` ni `currentPeriodEnd`; solo leen `tier`. Este es el
 * UNICO archivo que cambia cuando llegue esa fuente de verdad.
 */
@Injectable()
export class EntitlementService {
  private readonly testOnlyTierOverride = new Map<string, EntitlementTier>();

  async getEntitlement(accountId: string): Promise<AccountEntitlement> {
    // PROVISIONAL: sin fuente de verdad de suscripcion todavia -- ver docstring de la clase.
    const tier = this.testOnlyTierOverride.get(accountId) ?? 'FREE';
    return { tier };
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
