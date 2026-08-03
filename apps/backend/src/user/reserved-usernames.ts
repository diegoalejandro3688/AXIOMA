/**
 * Nombres reservados -- ver docs/adr/0018-public-profile-foundation.md
 * (§2, precisión obligatoria del Product Owner). Denegación ABSOLUTA,
 * distinta de la moderación de contenido ofensivo (`OFFENSIVE_USERNAMES`
 * abajo): protege contra suplantación de cuentas oficiales,
 * administrativas o de marca interna de Axioma. No expira, no tiene
 * ventana de reserva -- nunca estuvo disponible.
 *
 * Configuración versionada en código (sin herramienta de administración
 * todavía -- Plataforma Editorial, Bloque VII): ampliar esta lista no
 * requiere un nuevo ADR, es una operación de configuración, no una
 * decisión arquitectónica.
 *
 * Todas las entradas ya están en su forma canónica (minúsculas, NFC) --
 * mismo criterio de comparación que `normalizeUsername()`.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'admin',
  'administrator',
  'administrador',
  'axioma',
  'axiomateam',
  'axiomaoficial',
  'axiomaadmin',
  'soporte',
  'support',
  'staff',
  'equipoaxioma',
  'moderador',
  'moderator',
  'sistema',
  'system',
  'root',
  'oficial',
  'official',
  // Nombres de secciones internas del producto (ADR-0009) -- evita que un
  // username se confunda con una superficie de navegación de Axioma.
  'competir',
  'juego',
  'estudio',
]);

/**
 * Lista mínima de moderación de contenido -- ver ADR-0018 §2: política
 * deliberadamente mínima (no ML, no servicio externo). Deuda técnica
 * DIFERIDA, no bloqueante.
 */
export const OFFENSIVE_USERNAMES: ReadonlySet<string> = new Set(['puta', 'mierda', 'imbecil']);

export function isReservedOrOffensive(usernameNormalized: string): boolean {
  return RESERVED_USERNAMES.has(usernameNormalized) || OFFENSIVE_USERNAMES.has(usernameNormalized);
}
