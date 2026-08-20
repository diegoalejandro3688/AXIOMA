/** Layout -- bloque 5 del .md. */

export const layout = {
  marginHorizontal: 16,
  sectionGap: 24,
  minTouchTarget: 44,
  preferredTouchTarget: 48,
  buttonHeight: {
    large: 52,
    medium: 48,
    small: 40,
  },
};

export type ButtonHeightToken = keyof typeof layout.buttonHeight;
