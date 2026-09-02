import { z } from 'zod';

/**
 * Contrato compartido de PREMIUM V1 -- Capa 1 (Entitlement backend), C1.0.
 *
 * Este archivo contiene EXCLUSIVAMENTE el contrato de authorization:
 *   - el predicado de acceso por posición de unidad ("las primeras 2 unidades
 *     de cada materia son Free"), definido UNA sola vez y consumido de forma
 *     idéntica por el backend (autoritativo) y por mobile (Capa 2);
 *   - el tier de la cuenta (`FREE` / `PREMIUM`) y la proyección mínima que el
 *     cliente lee de `GET /me/entitlement`;
 *   - el `code` estable del error 403 de contenido bloqueado.
 *
 * Deliberadamente NO vive aquí (ni en ningún punto de Capa 1) ninguna noción
 * de precio, moneda, texto de precio, producto de store ni estado de
 * facturación. `$6.990 CLP/mes` es contrato de PRODUCTO; Capa 2 usará una
 * única constante temporal de display y Capa 3 la sustituirá por metadata
 * real de Google Play.
 *
 * Frontera congelada authorization <-> billing (se detalla en el ADR de
 * cierre de Capa 1): `AccountEntitlement` responde "que puede acceder esta
 * cuenta AHORA" y nunca expone estado comercial. Cuando exista
 * `AccountSubscription` (Capa 3), el tier se derivara de la vigencia del
 * periodo (`currentPeriodEnd > now`); cancelar la renovacion automatica NO
 * degrada el tier hasta la expiracion.
 */

/** Numero de unidades canonicas iniciales de cada materia que son gratuitas. Regla por POSICION, nunca por codigo de unidad. */
export const FREE_UNITS_PER_SUBJECT = 2;

/**
 * Unica definicion de "esta unidad es Free por su posicion". `zeroBasedIndex`
 * es la posicion de la unidad dentro de la lista canonica ORDENADA de
 * unidades de su materia (la misma que produce
 * `findCanonicalUnitRootsBySubjectId` en backend y la que mobile numera como
 * `index + 1`).
 *
 * Defensivo a proposito: cualquier entrada que no sea un entero >= 0 dentro
 * del rango Free devuelve `false` (incluye `-1`, usado por el clasificador de
 * contenido cuando una unidad no se encuentra en el catalogo canonico).
 */
export function isFreeUnitPosition(zeroBasedIndex: number): boolean {
  return (
    Number.isInteger(zeroBasedIndex) &&
    zeroBasedIndex >= 0 &&
    zeroBasedIndex < FREE_UNITS_PER_SUBJECT
  );
}

/** Tier de authorization de una cuenta. `PREMIUM` en V1 solo se alcanza via override interno (no productivo) hasta que exista billing. */
export const premiumTierSchema = z.enum(['FREE', 'PREMIUM']);
export type PremiumTier = z.infer<typeof premiumTierSchema>;

/**
 * Proyeccion MINIMA que el cliente lee de `GET /me/entitlement` -- unicamente
 * `tier`. `.strict()`: cualquier campo adicional (precio, estado de
 * suscripcion, fechas) es un error de contrato, nunca se ignora en silencio.
 */
export const accountEntitlementResponseSchema = z
  .object({
    tier: premiumTierSchema,
  })
  .strict();
export type AccountEntitlementResponse = z.infer<typeof accountEntitlementResponseSchema>;

/**
 * `code` estable del error 403 que devuelve el backend cuando una cuenta
 * `FREE` intenta acceder/crear contenido Premium (unidades en posicion >= 2,
 * intento de ensayo nuevo, escritura de progreso sobre tema Premium).
 *
 * El body es `{ code, message }` -- SIN `origin`. El punto de entrada de UX
 * que abre el paywall lo decide la superficie de mobile en Capa 2, nunca el
 * backend.
 */
export const PREMIUM_REQUIRED_CODE = 'PREMIUM_REQUIRED';
