import { StyleSheet } from 'react-native';

/** Radios de esquina -- bloque 5 del .md. */
export const radii = {
  none: 0,
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
  full: 999,
};

export type RadiusToken = keyof typeof radii;

/** Anchos de borde -- bloque 5 del .md. */
export const borders = {
  none: 0,
  hairline: StyleSheet.hairlineWidth,
  default: 1,
  strong: 2,
};

export type BorderToken = keyof typeof borders;
