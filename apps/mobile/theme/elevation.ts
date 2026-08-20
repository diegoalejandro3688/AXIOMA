import type { ColorSchemeName } from './tokens';

/**
 * Elevación -- bloque 5 del .md. 4 niveles (0-3), valores distintos por
 * tema: en oscuro el nivel 1 no lleva sombra negra copiada de claro (se
 * resuelve por diferencia de superficie/borde, sombra nula); niveles 2-3
 * llevan sombra mínima + borde reforzado. Consumo siempre vía
 * `getElevation(level, scheme)`, nunca shadow hardcodeado en componentes.
 */

export type ElevationLevel = 0 | 1 | 2 | 3;

export interface ElevationStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const lightElevation: Record<ElevationLevel, ElevationStyle> = {
  0: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  1: { shadowColor: '#04203D', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  2: { shadowColor: '#04203D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  3: { shadowColor: '#04203D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12, elevation: 6 },
};

const darkElevation: Record<ElevationLevel, ElevationStyle> = {
  // Nivel 1: sin sombra -- se resuelve por diferencia de superficie/borde, nunca sombra negra sobre fondo oscuro.
  0: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  1: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  2: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.24, shadowRadius: 6, elevation: 3 },
  3: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 12, elevation: 6 },
};

export function getElevation(level: ElevationLevel, scheme: ColorSchemeName): ElevationStyle {
  return scheme === 'dark' ? darkElevation[level] : lightElevation[level];
}

export const elevation = { light: lightElevation, dark: darkElevation, getElevation };
