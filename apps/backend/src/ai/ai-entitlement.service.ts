import { Injectable } from '@nestjs/common';

/** Free = 6 turnos, Premium = 15 turnos -- decisión B, docs/adr/LEF-BLOCK-VI-DEFINITION.md §5/§10. Ambos valores son contractuales y definitivos; lo PROVISIONAL es únicamente CUÁL de los dos se aplica a una cuenta dada (ver clase de abajo). */
const FREE_MAX_TURNS = 6;
const PREMIUM_MAX_TURNS = 15;

/**
 * FRONTERA ARQUITECTÓNICA EXPLÍCITAMENTE PROVISIONAL -- ver revisión del
 * Product Owner sobre el cierre del Incremento 1. Esto NO es una decisión
 * de dominio ("las cuentas de Axioma son Free por defecto") -- es la
 * ausencia de una fuente de verdad que hoy no existe en el proyecto:
 * verificado por auditoría directa (`grep -i "subscription\|entitlement\|premium"`
 * sobre `schema.prisma`, cero resultados) que el esquema actual no tiene
 * ningún campo, tabla ni concepto de plan/tier/suscripción/entitlement.
 * La monetización (PRD §16) está completamente fuera del alcance de LEF
 * Bloque VI y de cualquier bloque LEF ya definido.
 *
 * Mientras esa fuente de verdad no exista, `getMaxTurns` resuelve TODA
 * cuenta como Free (6 turnos) -- la opción más conservadora posible, nunca
 * "inventada" (los valores 6/15 ya son decisión contractual, decisión B).
 * Cuando exista una fuente de verdad real (tabla de suscripción,
 * entitlement, o equivalente), este es el ÚNICO archivo que debe cambiar:
 * `AiConversationService` -- y cualquier otro consumidor -- solo conoce
 * `getMaxTurns(accountId): Promise<number>`, nunca el concepto de
 * plan/tier/Free/Premium en sí. Ningún contrato HTTP, ningún tipo de
 * `packages/contracts`, ningún comentario de `AiConversationService`
 * declara ni asume "todas las cuentas son Free" como regla de dominio --
 * la afirmación vive ÚNICAMENTE aquí, marcada como estado transitorio de
 * infraestructura, no como decisión de producto.
 */
@Injectable()
export class AiEntitlementService {
  async getMaxTurns(_accountId: string): Promise<number> {
    // PROVISIONAL: sin fuente de verdad de plan todavía -- ver nota de clase.
    // Reemplazar por una consulta real cuando exista `AiEntitlementService`
    // aguas arriba (tabla de suscripción/entitlement); esa consulta decidirá
    // entre FREE_MAX_TURNS y PREMIUM_MAX_TURNS, este método seguirá
    // devolviendo solo el número resultante.
    return FREE_MAX_TURNS;
  }
}

export { FREE_MAX_TURNS, PREMIUM_MAX_TURNS };
