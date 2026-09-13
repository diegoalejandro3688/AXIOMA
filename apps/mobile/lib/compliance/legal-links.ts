/**
 * F1-E -- WIRING de enlaces legales / de soporte, con las URLs públicas
 * reales ya publicadas (F1-D, https://zetrynd.cl). `isConfigured`/`null` se
 * mantienen como mecanismo de fail-safe genérico (no se elimina la
 * defensiva por diseño) aunque hoy los tres valores estén configurados.
 *
 * Los "Términos de uso y convivencia pública" SÍ existen ya en la app
 * (pantalla interna versionada, PS-0C.2) -- no dependen de este archivo.
 */

/** URL pública de la Política de Privacidad. */
export const PRIVACY_POLICY_URL: string | null = 'https://zetrynd.cl/privacy';

/** URL pública de los Términos de Servicio generales (distintos de los de participación pública). */
export const TERMS_OF_SERVICE_URL: string | null = 'https://zetrynd.cl/terms';

/**
 * Contacto de soporte -- alimenta la fila "Soporte" de Ajustes.
 */
export const SUPPORT_CONTACT: string | null = 'https://zetrynd.cl/support';

/**
 * URL pública informativa sobre eliminación de cuenta (requisito de Google
 * Play para apps con creación de cuenta). NO reemplaza ni duplica la acción
 * nativa de eliminación ya implementada en esta pantalla -- es solo el
 * enlace de referencia/legal, consumido junto al diálogo de confirmación.
 */
export const ACCOUNT_DELETION_URL: string | null = 'https://zetrynd.cl/account-deletion';

export function isConfigured(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
