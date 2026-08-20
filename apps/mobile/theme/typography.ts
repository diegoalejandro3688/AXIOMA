/**
 * Escala tipográfica -- bloque 5 del .md ZETRYND_UI_UX_DESIGN_IMPLEMENTATION.
 * Fuente nativa del sistema: `undefined` dentro de un `StyleSheet` hace que
 * RN caiga a la fuente nativa (SF en iOS, Roboto en Android) -- nunca se
 * fija el nombre literal. `family.ui` es el token abstracto para ese caso.
 */

export type FontWeightToken = 'regular' | 'medium' | 'semibold' | 'bold';

export const fontWeight: Record<FontWeightToken, '400' | '500' | '600' | '700'> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const family = {
  ui: undefined as string | undefined,
};

export interface TypographyScaleEntry {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
}

export type TypographyVariant =
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'titleLarge'
  | 'titleMedium'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption'
  | 'micro';

export const typeScale: Record<TypographyVariant, TypographyScaleEntry> = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: fontWeight.bold },
  heading1: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold },
  heading2: { fontSize: 24, lineHeight: 30, fontWeight: fontWeight.bold },
  heading3: { fontSize: 20, lineHeight: 26, fontWeight: fontWeight.bold },
  titleLarge: { fontSize: 18, lineHeight: 24, fontWeight: fontWeight.semibold },
  titleMedium: { fontSize: 16, lineHeight: 22, fontWeight: fontWeight.semibold },
  body: { fontSize: 16, lineHeight: 24, fontWeight: fontWeight.regular },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: fontWeight.regular },
  label: { fontSize: 14, lineHeight: 18, fontWeight: fontWeight.semibold },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: fontWeight.regular },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: fontWeight.medium },
};

export const typography = {
  family,
  weight: fontWeight,
  scale: typeScale,
};
