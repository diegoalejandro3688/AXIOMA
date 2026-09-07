/**
 * Moderación de nombres de usuario -- ADR-0018 §2 + PS-0C.2 (endurecimiento
 * mínimo).
 *
 * SIN ML, SIN servicio externo, SIN fuzzy matching costoso. Dos listas y una
 * normalización barata contra evasión leet obvia. El backend es la ÚNICA
 * autoridad -- el móvil puede prevalidar para UX pero nunca es la fuente de
 * verdad.
 *
 * Todas las entradas ya están en forma canónica (minúsculas, ASCII) -- mismo
 * criterio que `usernameInputSchema` (`^[a-zA-Z0-9_]{3,20}$` + NFC +
 * minúsculas). El charset de entrada NO admite acentos ni símbolos salvo
 * `_`, así que la normalización sólo tiene que cubrir dígitos-como-letras y
 * el separador `_`.
 */

/**
 * DENEGACIÓN ABSOLUTA por coincidencia EXACTA -- suplantación de cuentas
 * oficiales / administrativas / de marca / institucionales. No expira, nunca
 * estuvo disponible.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // Roles / sistema
  'admin', 'admins', 'administrator', 'administrador', 'administradora',
  'moderador', 'moderadora', 'moderator', 'mod', 'mods',
  'staff', 'soporte', 'support', 'ayuda', 'helpdesk',
  'sistema', 'system', 'root', 'superuser', 'sysadmin',
  'oficial', 'official', 'verificado', 'verified',
  'equipo', 'team', 'ceo', 'founder', 'fundador',
  // Marca ZETRYND / histórico AXIOMA
  'zetrynd', 'zetryndteam', 'zetryndoficial', 'zetryndapp', 'zetryndsoporte',
  'equipozetrynd', 'zetryndadmin', 'zetryndbot', 'zetryndhelp',
  'axioma', 'axiomateam', 'axiomaoficial', 'axiomaadmin', 'equipoaxioma',
  // Secciones internas del producto (ADR-0009)
  'competir', 'juego', 'estudio', 'ranking', 'tutor', 'tutoria', 'tutoría',
  // Instituciones PAES / educación chilena -- afiliación oficial falsa
  'paes', 'demre', 'mineduc', 'cruch', 'psu',
]);

/**
 * Subcadenas prohibidas -- se buscan como SUBSTRING dentro de la forma
 * normalizada (y de la cruda). Deliberadamente entradas LARGAS e
 * inequívocas (>= 4 caracteres, sin fragmentos que aparezcan en palabras o
 * nombres comunes) para minimizar falsos positivos. NO es exhaustiva: es
 * "materialmente más fuerte" que la lista de 3 que había antes, no un filtro
 * total.
 */
const BLOCKED_SUBSTRINGS: readonly string[] = [
  // --- Español: insultos / groserías compuestas (inequívocas) ---
  'conchetumare', 'conchatumadre', 'chuchetumadre', 'conchatu', 'ctmare',
  'hijodeputa', 'hijadeputa', 'hijueputa', 'hdeputa',
  'reculiao', 'culiao', 'culiada', 'culeao', 'aweonao', 'aweona', 'queonao',
  'maricon', 'mariconazo', 'maracoperkin',
  'putamadre', 'putamare', 'putazo', 'putita', 'reputa',
  'imbecil', 'gilipollas', 'gonorrea', 'malparido', 'ceroaporte',
  // --- Español: sexual explícito ---
  'conchuda', 'follar', 'masturba', 'orgasmo', 'pajero', 'pajera',
  'porno', 'hentai', 'zoofilia', 'pedofil', 'incesto', 'zorraculiada',
  'violador', 'violacion', 'abusosexual',
  // --- Español: amenaza / autolesión ---
  'tevoyamatar', 'teviolare', 'suicidate', 'matateya', 'andatemorir',
  // --- Inglés: groserías / slurs ---
  'fuck', 'shit', 'bitch', 'asshole', 'dickhead', 'motherfuck',
  'cunt', 'whore',
  'nigger', 'nigga', 'faggot', 'tranny', 'chinaman',
  // --- Inglés: sexual / abuso ---
  'porn', 'rapist', 'pedophile', 'childporn', 'bestiality', 'molest',
  // --- Odio / extremismo ---
  'hitler', 'heilhitler', 'holocaust', 'genocid', 'whitepower', 'siegheil',
  // --- Impersonación adicional ---
  'zetryndstaff', 'adminzetrynd', 'realadmin', 'officialadmin', 'zetryndmod',
];

const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g',
};

/**
 * Normalización barata contra evasión: dígitos-leet -> letra, quita `_`.
 * Ej. `4dm1n` -> `admin`, `p_u_t_a` -> `puta`.
 */
export function normalizeForModeration(usernameNormalized: string): string {
  let out = '';
  for (const ch of usernameNormalized) {
    if (ch === '_') continue;
    out += LEET_MAP[ch] ?? ch;
  }
  return out;
}

/** `true` si el username infringe la política (reservado / ofensivo / evasión leet). */
export function violatesUsernamePolicy(usernameNormalized: string): boolean {
  if (RESERVED_USERNAMES.has(usernameNormalized)) return true;

  const normalized = normalizeForModeration(usernameNormalized);
  if (RESERVED_USERNAMES.has(normalized)) return true;

  for (const term of BLOCKED_SUBSTRINGS) {
    if (usernameNormalized.includes(term) || normalized.includes(term)) return true;
  }
  return false;
}

/**
 * `OFFENSIVE_USERNAMES` -- conservado como export por compatibilidad
 * histórica (algún gate/consumidor podía referenciarlo). Ahora es la
 * proyección de la lista real.
 */
export const OFFENSIVE_USERNAMES: ReadonlySet<string> = new Set(BLOCKED_SUBSTRINGS);

/** API pública histórica -- ahora delega en `violatesUsernamePolicy`. */
export function isReservedOrOffensive(usernameNormalized: string): boolean {
  return violatesUsernamePolicy(usernameNormalized);
}
