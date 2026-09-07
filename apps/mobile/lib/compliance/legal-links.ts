/**
 * PS-0C.2 -- WIRING de enlaces legales / de soporte, SIN valores reales.
 *
 * `null` = todavía no configurado (PS-0D / Web / owner legal). El móvil DEBE
 * fallar de forma segura: si un valor es `null`, la fila correspondiente en
 * Ajustes se muestra deshabilitada como "Disponible próximamente" y NUNCA se
 * abre un enlace/correo. Prohibido poner aquí un placeholder que parezca un
 * dominio o correo real -- sólo una URL/contacto verificado por el owner.
 *
 * Los "Términos de uso y convivencia pública" SÍ existen ya en la app
 * (pantalla interna versionada, PS-0C.2) -- no dependen de este archivo.
 */

/** URL pública de la Política de Privacidad. Pendiente de PS-0D. */
export const PRIVACY_POLICY_URL: string | null = null;

/** URL pública de los Términos de Servicio generales (distintos de los de participación pública). Pendiente de PS-0D. */
export const TERMS_OF_SERVICE_URL: string | null = null;

/**
 * Contacto de soporte -- correo (`mailto:`) o URL. Pendiente de PS-0D.
 * Cuando exista, este valor único alimenta la fila "Soporte" de Ajustes.
 */
export const SUPPORT_CONTACT: string | null = null;

export function isConfigured(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
