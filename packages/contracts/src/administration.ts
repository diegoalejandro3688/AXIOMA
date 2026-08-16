import { z } from 'zod';

/**
 * Contratos del dominio ADMINISTRATION -- LEF Bloque VII, Incremento 2.
 * Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §9, §12.2, §13.2.
 *
 * REGLA DURA (invariante 22, §9.5): aquí NO hay ningún esquema de PETICIÓN.
 * El cliente administrativo solo presenta su token personal por cabecera
 * (`X-Admin-Token`) y no envía nada más -- ni actor, ni rol, ni ámbito, ni
 * "actúo como". Cualquier campo de rol o de actor en un contrato de petición
 * sería una segunda ruta de autorización, prohibida por §13.2 punto 9. La
 * ausencia de `*RequestSchema` en este archivo es deliberada y verificada por
 * `verify:admin-identity-gate`.
 *
 * Los roles viajan SOLO en la respuesta, y son siempre los que el backend
 * resolvió desde la base a partir del token -- nunca un eco de lo que el
 * cliente pidiera.
 */

/** Los DOS roles de V1 (decisión B, §9.2) -- no los seis de ADMIN-003. */
export const adminRoleSchema = z.enum(['AUTHOR', 'PUBLISHER']);

/**
 * Identidad administrativa pública mínima. Whitelist estricta:
 *
 *  - NUNCA el token en claro, NUNCA su hash, NUNCA el id del token.
 *  - NUNCA datos de `Account`/`StudentResponse`/`AiConversation`/`AiMessage`
 *    ni de PROGRESS/GAMIFICATION/PRIVACY (§11.4, §13.2 punto 10).
 *  - NUNCA metadata interna innecesaria (fechas de emisión/expiración del
 *    token, contadores de acceso, estado del registro de auditoría).
 *
 * `isActive` no se expone: si la respuesta llegó, el actor está activo --
 * un actor desactivado recibe 401 y nunca ve este objeto.
 */
export const adminMeResponseSchema = z.object({
  actorId: z.string().uuid(),
  displayName: z.string().min(1),
  roles: z.array(adminRoleSchema),
});

export type AdminRoleDto = z.infer<typeof adminRoleSchema>;
export type AdminMeResponse = z.infer<typeof adminMeResponseSchema>;
