import { createHmac } from 'node:crypto';

/**
 * F1-A.4 -- dominio de pseudonimización PROPIO de moderación/trust-and-safety
 * (`PublicProfileReport` / `AccountBlock`). Misma forma criptográfica que
 * `gamificationActorRef` (WEB-0D.1C-B) y `analyticsActorRef` (ADR-0006), pero
 * NUNCA comparte secreto ni salida con ninguno de los dos: el secreto
 * (`MODERATION_ACTOR_SECRET`) se recibe como argumento puro, nunca leído de
 * config aquí, para que ninguna correlación entre dominios sea posible por
 * diseño (secretos distintos -> refs distintos aun para la misma cuenta).
 *
 * A diferencia de `gamificationActorRef` (columna `String?` sin tipo
 * particular), las columnas objetivo aquí (`reporterAccountId`,
 * `targetAccountId`, `targetPublicProfileId`, `blockerAccountId`,
 * `blockedAccountId`) son `@db.Uuid` NOT NULL con `@@unique` sobre ellas --
 * cambiar su tipo/nulabilidad hubiera exigido una migración de esquema y
 * debilitado las restricciones existentes. En vez de eso, esta función
 * adapta el mismo primitivo HMAC-SHA256 para producir una cadena con forma
 * de UUID válida (Postgres `uuid` sólo exige el formato 8-4-4-4-12
 * hexadecimal, no exige los bits de versión/variante de RFC 4122) --
 * determinística, no reversible sin el secreto, y compatible con la columna
 * `@db.Uuid` sin ningún cambio de esquema.
 */
export function moderationActorRef(accountId: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(accountId).digest('hex');
  const hex = digest.slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
