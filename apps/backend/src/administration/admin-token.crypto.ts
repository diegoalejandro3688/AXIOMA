import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Primitivas criptográficas de la credencial administrativa personal.
 * LEF Bloque VII, Incremento 2 -- ver LEF-BLOCK-VII-DEFINITION.md §9.5 (DG-7).
 *
 * SIN NINGUNA DEPENDENCIA NUEVA: `node:crypto`, exactamente el mismo módulo
 * que el proyecto ya usa para `createHash('sha256')`
 * (`platform/object-storage/file-validation.ts:1`,
 * `gamification/leaderboard-finalization.service.ts:1`), para
 * `createHmac('sha256')` (`analytics/analytics-actor-ref.ts:1`) y para
 * `randomUUID` (`platform/observability/correlation-id.store.ts:2`).
 * DG-7 no autoriza introducir un sistema de identidad externo, y no hace
 * falta ninguno.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ SHA-256 Y NO bcrypt/argon2 -- justificación explícita
 * ---------------------------------------------------------------------------
 * bcrypt/argon2/scrypt son KDF deliberadamente LENTAS. Su coste existe para
 * defender secretos de BAJA ENTROPÍA elegidos por humanos (contraseñas):
 * frente a una filtración de la base, un atacante puede enumerar el espacio
 * plausible de contraseñas, y la lentitud es lo único que lo frena.
 *
 * Aquí el secreto NO es una contraseña humana: es un valor de 256 bits
 * generado por el CSPRNG del sistema operativo (`randomBytes(32)`). Su espacio
 * de búsqueda es 2^256 -- no existe diccionario, no existe "adivinar", y
 * ninguna cantidad de coste computacional por intento cambia esa aritmética.
 * Para un token de alta entropía, un hash criptográfico de una sola pasada es
 * el patrón correcto y estándar; añadir una KDF lenta no aportaría seguridad
 * real y sí tendría dos costes concretos:
 *
 *  1. bcrypt/argon2 usan salt por fila, así que su digest NO es determinista.
 *     El guard no podría resolver token->actor con una búsqueda indexada por
 *     igualdad; tendría que RECORRER `admin_actor_token` verificando fila por
 *     fila, en cada request. SHA-256 permite el UNIQUE sobre `token_hash` y
 *     una única búsqueda exacta.
 *  2. Sería una dependencia npm nueva para identidad -- exactamente lo que la
 *     auditoría del incremento se propuso evitar.
 *
 * El requisito contractual (§9.5) es "almacenado de manera segura/hasheada,
 * nunca en texto plano". SHA-256 sobre un token aleatorio de 256 bits lo
 * satisface: el digest es irreversible y no reconstruible por fuerza bruta.
 * ---------------------------------------------------------------------------
 */

/**
 * 32 bytes = 256 bits de entropía del CSPRNG del SO. base64url para que el
 * valor viaje sin escapes en una cabecera HTTP.
 */
const TOKEN_BYTES = 32;

/**
 * Prefijo legible del token. NO es un secreto ni aporta entropía: existe para
 * que un valor filtrado por accidente (un portapapeles, un pegado en un chat)
 * sea reconocible como credencial administrativa de Axioma y pueda revocarse.
 */
const TOKEN_PREFIX = 'axadm_';

/**
 * Genera un token administrativo en claro. El llamador (el CLI de bootstrap)
 * es responsable de mostrarlo UNA sola vez y no persistirlo en ningún sitio.
 */
export function generateAdminToken(): string {
  return TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Hash almacenable del token. Determinista (mismo token -> mismo hash), lo
 * que hace posible la búsqueda indexada exacta del guard.
 */
export function hashAdminToken(plainToken: string): string {
  return createHash('sha256').update(plainToken, 'utf8').digest('hex');
}

/**
 * Comparación de hashes en tiempo constante. Estrictamente hablando no es
 * imprescindible aquí (la resolución la hace el índice UNIQUE de Postgres
 * sobre un digest, no una comparación en JS sobre el secreto), pero se
 * expone y se usa en la confirmación final del guard para que la ruta de
 * validación no dependa de la semántica de cortocircuito de `===` sobre
 * material derivado de un secreto.
 */
export function adminTokenHashEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
