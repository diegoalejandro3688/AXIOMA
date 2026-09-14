import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PremiumTier } from '@axioma/contracts';
import type { AccountSubscription } from '../generated/prisma/client';
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
 * GOOGLE PLAY REVIEWER GRANT (microbloque "PERSISTENT PRODUCTION REVIEWER
 * GRANT"): se intercala INMEDIATAMENTE despues del override de QA (#1) y
 * ANTES de la suscripcion verificada (#2) -- por eso NUNCA compite con ni
 * modifica Billing/`AccountSubscription`. Coincidencia EXACTA de `accountId`
 * contra la variable de entorno OPCIONAL `GOOGLE_PLAY_REVIEWER_ACCOUNT_ID`
 * (fail-closed: ausente/vacia -> nunca concede nada, sin comodines ni
 * substrings). Backend-only, nunca expuesto por ningun endpoint, nunca
 * registrado en logs. Independiente del override de QA en memoria (#1): no
 * reutiliza su `Map`, no requiere `InternalOpsGuard`, no se ve afectado por
 * `rejectInProduction()` -- existe explicitamente PARA producción y
 * sobrevive redeploys porque se resuelve desde configuracion, no desde
 * estado en memoria del proceso.
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

  constructor(
    @Optional() private readonly subscriptionRepo?: AccountSubscriptionRepository,
    @Optional() private readonly config?: ConfigService,
  ) {}

  /**
   * Google Play reviewer grant -- coincidencia EXACTA contra
   * `GOOGLE_PLAY_REVIEWER_ACCOUNT_ID` (opcional). Fail-closed: sin `config`
   * inyectado, o variable ausente/vacia, siempre `false` -- nunca un
   * comodin ni una coincidencia parcial. Nunca registra `accountId` en logs.
   */
  private isReviewerGrantAccount(accountId: string): boolean {
    const reviewerAccountId = this.config?.get<string>('GOOGLE_PLAY_REVIEWER_ACCOUNT_ID');
    if (!reviewerAccountId) return false;
    return accountId === reviewerAccountId;
  }

  async getEntitlement(accountId: string): Promise<AccountEntitlement> {
    // 1. Override explicito de QA (nunca produccion, nunca UI de producto).
    const override = this.testOnlyTierOverride.get(accountId);
    if (override !== undefined) return { tier: override };

    // 1.5. Google Play reviewer grant (backend-only, fail-closed, ver docstring de clase).
    if (this.isReviewerGrantAccount(accountId)) return { tier: 'PREMIUM' };

    // 2. Suscripcion verificada -> derivacion pura.
    if (this.subscriptionRepo) {
      const row = await this.subscriptionRepo.findCurrentByAccountId(accountId);
      return { tier: deriveSubscriptionTier(toDerivableSubscription(row), new Date()) };
    }

    // 3. Default conservador.
    return { tier: 'FREE' };
  }

  /**
   * PB-1B-R1 §6 -- deriva el `tier` a partir de una fila `AccountSubscription`
   * YA LEIDA (o `null`), preservando EXACTAMENTE la misma precedencia que
   * `getEntitlement` (override de QA -> derivacion -> FREE). Existe para que
   * `SubscriptionService.getSummary` calcule `tier` y `renewalStatus`/
   * `accessUntil` del MISMO snapshot de fila -- sin una segunda lectura que
   * pudiera devolver una version distinta bajo una transicion concurrente.
   * NO cambia que `GET /me/entitlement` siga siendo la autoridad de
   * authorization (ese endpoint sigue llamando a `getEntitlement`).
   */
  getEntitlementForRow(accountId: string, row: AccountSubscription | null): AccountEntitlement {
    const override = this.testOnlyTierOverride.get(accountId);
    if (override !== undefined) return { tier: override };
    if (this.isReviewerGrantAccount(accountId)) return { tier: 'PREMIUM' };
    return { tier: deriveSubscriptionTier(toDerivableSubscription(row), new Date()) };
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
