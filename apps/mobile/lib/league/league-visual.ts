import type { ColorSchemeName } from '../../theme/tokens';
// Import SOLO de tipo -- `../../theme/tokens` no arrastra React Native en
// tiempo de ejecución (solo declaraciones + dos objetos planos), así este
// módulo se puede gatear con `tsx` puro, sin runtime de Expo/RN -- mismo
// criterio que `lib/league/participation-view.ts`.

/**
 * COMPETITIVE V1 -- rediseño visual, Incremento 1. Fuente ÚNICA de la
 * identidad visual por liga: mapea `leagueTier` (1..7, dato de producto de
 * `league_definition.tierOrder`) a su escudo + acento + tinte + halo, con
 * variantes claro/oscuro.
 *
 * Reglas de producto (decisiones cerradas):
 *  - MISMA arquitectura de tarjeta para las 7 ligas -- aquí solo cambian
 *    color y escudo, nunca la estructura.
 *  - El color de liga NUNCA satura el fondo: `tint` es una superficie MUY
 *    tenue y `halo` un resplandor sutil detrás del escudo. `accent` es para
 *    el aro del escudo / realces pequeños, jamás un fondo pleno.
 *  - Mismo asset de escudo en claro y oscuro -- solo cambian superficie /
 *    contraste / halo (§H).
 *
 * Los hex crudos viven EXCLUSIVAMENTE en este archivo (§G: "If raw per-tier
 * values are necessary, centralize them in league-visual.ts"). Ninguna
 * pantalla referencia un hex de liga directamente.
 */

export const LEAGUE_TIER_MIN = 1;
export const LEAGUE_TIER_MAX = 7;

export type LeagueTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Slug estable por liga -- ES TAMBIÉN la clave del asset del escudo (`league-<key>.webp`). */
export type LeagueKey = 'bronze' | 'silver' | 'gold' | 'emerald' | 'diamond' | 'master' | 'grand-master';

export interface LeagueVisual {
  tier: LeagueTier;
  key: LeagueKey;
  /** Nombre de producto en español (para títulos, se muestra en mayúsculas desde la UI). */
  name: string;
  /** Acento del tier -- aro del escudo, chips y realces pequeños. NUNCA un fondo pleno. */
  accent: string;
  /** Superficie MUY tenue detrás del contenido de la tarjeta -- no debe competir con `background.surface`. */
  tint: string;
  /** Resplandor sutil detrás del escudo (más visible en oscuro, casi imperceptible en claro). */
  halo: string;
}

interface LeaguePalette {
  key: LeagueKey;
  name: string;
  light: { accent: string; tint: string; halo: string };
  dark: { accent: string; tint: string; halo: string };
}

/**
 * Orientación cromática aprobada (§D):
 *  Bronce → cobre/bronce cálido · Plata → plata/gris frío · Oro → dorado
 *  controlado · Esmeralda → verde esmeralda · Diamante → azul/cian/plata ·
 *  Maestro → grafito/índigo/violeta · Gran Maestro → íd. + luz azul/blanca.
 */
const LEAGUE_PALETTE: Record<LeagueTier, LeaguePalette> = {
  1: {
    key: 'bronze',
    name: 'Bronce',
    light: { accent: '#A9743F', tint: '#F7F0E8', halo: '#E7CBAA' },
    dark: { accent: '#C89463', tint: '#211A12', halo: '#3E2C1A' },
  },
  2: {
    key: 'silver',
    name: 'Plata',
    light: { accent: '#7F8A97', tint: '#F0F2F5', halo: '#D4DAE0' },
    dark: { accent: '#AEB8C4', tint: '#181D23', halo: '#2F363F' },
  },
  3: {
    key: 'gold',
    name: 'Oro',
    light: { accent: '#B0810F', tint: '#FBF3DC', halo: '#EBD293' },
    dark: { accent: '#E0B551', tint: '#241D09', halo: '#463916' },
  },
  4: {
    key: 'emerald',
    name: 'Esmeralda',
    light: { accent: '#1E7A54', tint: '#E7F3EC', halo: '#ABDAC1' },
    dark: { accent: '#57BC8D', tint: '#0F231A', halo: '#1F4634' },
  },
  5: {
    key: 'diamond',
    name: 'Diamante',
    light: { accent: '#2C8CAE', tint: '#E4F2F7', halo: '#A9DAE7' },
    dark: { accent: '#61C3DD', tint: '#0C232E', halo: '#17444F' },
  },
  6: {
    key: 'master',
    name: 'Maestro',
    light: { accent: '#5A4E99', tint: '#EFEDF8', halo: '#C7BEE8' },
    dark: { accent: '#9E8FE0', tint: '#191631', halo: '#332C56' },
  },
  7: {
    key: 'grand-master',
    name: 'Gran Maestro',
    light: { accent: '#4A5DA8', tint: '#ECEEF9', halo: '#C0CBEE' },
    dark: { accent: '#93A6EC', tint: '#151A31', halo: '#2E3A63' },
  },
};

/** Acota cualquier entero a un tier válido 1..7 -- una liga futura fuera de rango cae al tier más cercano, nunca revienta. */
export function clampLeagueTier(tier: number): LeagueTier {
  const rounded = Math.round(tier);
  if (!Number.isFinite(rounded) || rounded < LEAGUE_TIER_MIN) return LEAGUE_TIER_MIN;
  if (rounded > LEAGUE_TIER_MAX) return LEAGUE_TIER_MAX;
  return rounded as LeagueTier;
}

/** Identidad visual completa de una liga para el esquema de color activo. Función PURA. */
export function leagueVisual(tier: number, scheme: ColorSchemeName): LeagueVisual {
  const t = clampLeagueTier(tier);
  const palette = LEAGUE_PALETTE[t];
  const variant = scheme === 'dark' ? palette.dark : palette.light;
  return {
    tier: t,
    key: palette.key,
    name: palette.name,
    accent: variant.accent,
    tint: variant.tint,
    halo: variant.halo,
  };
}

/** Slug estable de una liga (sin depender del esquema) -- útil para tests y para resolver el asset. */
export function leagueKey(tier: number): LeagueKey {
  return LEAGUE_PALETTE[clampLeagueTier(tier)].key;
}

/** Nombre de producto de una liga (sin depender del esquema). */
export function leagueName(tier: number): string {
  return LEAGUE_PALETTE[clampLeagueTier(tier)].name;
}

/** Los 7 tiers en orden ascendente -- para iterar en tests/UI sin repetir el rango. */
export const LEAGUE_TIERS: readonly LeagueTier[] = [1, 2, 3, 4, 5, 6, 7];
