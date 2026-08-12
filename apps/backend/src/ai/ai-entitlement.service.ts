import { Injectable } from '@nestjs/common';

export type AiTier = 'FREE' | 'PREMIUM';

export interface AiEntitlement {
  tier: AiTier;
  /** Turnos máximos por conversación -- decisión B (docs/adr/LEF-BLOCK-VI-DEFINITION.md §5/§10). */
  maxTurns: number;
  /** Consultas consumidas máximas por día UTC -- decisión del Incremento 3. */
  dailyRequestLimit: number;
}

/** Free = 6 turnos / 3 consultas diarias, Premium = 15 turnos / 50 consultas diarias -- ambos pares son contractuales y definitivos; lo PROVISIONAL es únicamente CUÁL tier se aplica a una cuenta dada (ver clase de abajo). */
const ENTITLEMENTS: Record<AiTier, Omit<AiEntitlement, 'tier'>> = {
  FREE: { maxTurns: 6, dailyRequestLimit: 3 },
  PREMIUM: { maxTurns: 15, dailyRequestLimit: 50 },
};

/**
 * FRONTERA ARQUITECTÓNICA EXPLÍCITAMENTE PROVISIONAL -- ver revisión del
 * Product Owner sobre el cierre del Incremento 1, extendida en el
 * Incremento 3. Esto NO es una decisión de dominio ("las cuentas de Axioma
 * son Free por defecto") -- es la ausencia de una fuente de verdad que hoy
 * no existe en el proyecto: verificado por auditoría directa
 * (`grep -i "subscription\|entitlement\|premium"` sobre `schema.prisma`,
 * cero resultados) que el esquema actual no tiene ningún campo, tabla ni
 * concepto de plan/tier/suscripción/entitlement. La monetización (PRD §16)
 * está completamente fuera del alcance de LEF Bloque VI y de cualquier
 * bloque LEF ya definido.
 *
 * Mientras esa fuente de verdad no exista, `getEntitlement` resuelve TODA
 * cuenta como FREE -- la opción más conservadora posible, nunca "inventada"
 * (los valores FREE/PREMIUM ya son decisión contractual). Cuando exista una
 * fuente de verdad real (tabla de suscripción, entitlement, o equivalente),
 * este es el ÚNICO archivo que debe cambiar: `AiConversationService` -- y
 * cualquier otro consumidor -- solo conoce
 * `getEntitlement(accountId): Promise<AiEntitlement>`, nunca el concepto de
 * plan/tier/Free/Premium en sí. Ningún contrato HTTP, ningún tipo de
 * `packages/contracts`, ningún otro archivo de dominio declara ni asume
 * "todas las cuentas son Free" como regla de dominio -- la afirmación vive
 * ÚNICAMENTE aquí, marcada como estado transitorio de infraestructura, no
 * como decisión de producto.
 *
 * `testOnlyTierOverride` -- ver `AiInternalAdminController` (Incremento 3):
 * mapa EN MEMORIA (nunca persistido, nunca tocado por tráfico real), poblado
 * ÚNICAMENTE por un endpoint interno protegido por `InternalOpsGuard` Y
 * rechazado en producción (mismo criterio exacto que
 * `AUTH_IDENTITY_PROVIDER=stub`/`DiagnosticsController`) -- existe
 * EXCLUSIVAMENTE para que el gate de Incremento 3 pueda demostrar el
 * comportamiento PREMIUM (50 consultas/15 turnos) sin billing real ni una
 * fuente productiva falsa de suscripción. Se reinicia en cada arranque del
 * proceso -- no es persistencia, es un interruptor de prueba.
 */
@Injectable()
export class AiEntitlementService {
  private readonly testOnlyTierOverride = new Map<string, AiTier>();

  async getEntitlement(accountId: string): Promise<AiEntitlement> {
    // PROVISIONAL: sin fuente de verdad de plan todavía -- ver nota de clase.
    // Reemplazar por una consulta real cuando exista una fuente de suscripción/entitlement
    // aguas arriba; esa consulta decidirá el tier, este método seguirá devolviendo solo el resultado.
    const tier = this.testOnlyTierOverride.get(accountId) ?? 'FREE';
    return { tier, ...ENTITLEMENTS[tier] };
  }

  /** Solo para uso de `AiInternalAdminController` (gate/desarrollo) -- ver docstring de la clase. */
  setTestOnlyTierOverride(accountId: string, tier: AiTier | null): void {
    if (tier === null) this.testOnlyTierOverride.delete(accountId);
    else this.testOnlyTierOverride.set(accountId, tier);
  }
}
