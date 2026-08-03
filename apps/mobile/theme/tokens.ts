/**
 * Tokens semánticos de theming -- ver ADR-0015. Nunca se referencia un hex
 * directamente desde una pantalla; siempre a través de estos nombres.
 *
 * `ThemeTokens` se declara como interfaz explícita (valores `string`, sin
 * `as const`) -- ver "Corrección de tipos" en ADR-0015: con `typeof
 * lightTokens` + `as const`, cada hex quedaba fijado como literal exacto de
 * claro y `darkTokens` dejaba de ser asignable al tipo.
 *
 * Hallazgo real de contraste (validación Android, modo oscuro): `background.inverse`
 * tenía un valor DISTINTO por tema (`#0C447C` en oscuro) mientras que el texto
 * que se le superponía (`text.onInverse`) también cambiaba por tema
 * (`#04203D` en oscuro) -- ambos oscuros a la vez, contraste ~1.2:1. La
 * tarjeta "Objetivo de hoy" es una superficie de marca fija (navy), no un
 * valor relativo al tema: `background.inverse` y su texto (`text.onInverse`)
 * ahora son CONSTANTES iguales en claro y oscuro, igual que ya lo era
 * `accent.default`. Del mismo modo, `disabled.text` en oscuro (`#5F7C97`)
 * daba ~3.6:1 contra su propio fondo (`disabled.background`) -- por debajo
 * del mínimo AA (4.5:1) para texto normal; se corrigió a `#7E93A8` (~5.4:1).
 * `navigation.inactive` se separa de `text.secondary` para poder ajustarlo
 * de forma independiente sin afectar texto de cuerpo (se eligió un tono con
 * margen extra sobre el mínimo AA para las etiquetas pequeñas de los tabs).
 */

export interface ColorStateFamily {
  text: string;
  background: string;
  border: string;
}

export interface ThemeTokens {
  color: {
    background: { default: string; surface: string; inverse: string };
    border: { default: string };
    text: {
      primary: string;
      secondary: string;
      /** Texto de baja énfasis pero legible (AA, ≥4.5:1) -- shells "Próximamente", notas. */
      muted: string;
      /** Texto sobre `accent.default` (superficie brillante) -- NUNCA `text.primary` sobre azul. */
      onAccent: string;
      /** Texto sobre `background.inverse` (superficie navy fija). */
      onInverse: string;
    };
    accent: { default: string; strong: string; strongest: string; subtleBg: string };
    /** Estados de interacción deshabilitados (antes `disabled.*`). */
    action: { disabledText: string; disabledBackground: string; disabledBorder: string };
    /** Tabs -- independiente de `text.*` para poder afinar contraste de navegación sin tocar texto de cuerpo. */
    navigation: { active: string; inactive: string };
    state: {
      success: ColorStateFamily;
      error: ColorStateFamily;
      warning: ColorStateFamily;
      info: ColorStateFamily;
    };
  };
}

export type ColorSchemeName = 'light' | 'dark';

/** Superficie de marca fija -- misma tarjeta navy en ambos temas (ver nota de contraste arriba). */
const brandInverseBackground = '#04203D';
const brandOnInverseText = '#F5F6F8';
/** Texto sobre el azul brillante `accent.default` (también fijo, mismo valor en ambos temas). */
const brandOnAccentText = '#04203D';

export const lightTokens: ThemeTokens = {
  color: {
    background: { default: '#F5F6F8', surface: '#FFFFFF', inverse: brandInverseBackground },
    border: { default: '#D3D1C7' },
    text: {
      primary: '#04203D',
      secondary: '#5F5E5A',
      muted: '#5F5E5A',
      onAccent: brandOnAccentText,
      onInverse: brandOnInverseText,
    },
    accent: { default: '#378ADD', strong: '#185FA5', strongest: '#0C447C', subtleBg: '#E6F1FB' },
    action: { disabledText: '#888780', disabledBackground: '#F1EFE8', disabledBorder: '#B4B2A9' },
    navigation: { active: '#185FA5', inactive: '#5F5E5A' },
    state: {
      success: { text: '#3B6D11', background: '#EAF3DE', border: '#C3DDA0' },
      error: { text: '#B3261E', background: '#FBE9E7', border: '#F0BAB4' },
      warning: { text: '#854F0B', background: '#FCEFD8', border: '#EAC584' },
      info: { text: '#0C447C', background: '#E6F1FB', border: '#B7D6F2' },
    },
  },
};

export const darkTokens: ThemeTokens = {
  color: {
    background: { default: '#010B16', surface: '#0A1D30', inverse: brandInverseBackground },
    border: { default: '#17324D' },
    text: {
      primary: '#F5F6F8',
      secondary: '#85B7EB',
      // ~5.4:1 sobre `action.disabledBackground` (#0A1D30) -- antes '#5F7C97' (~3.6:1, no pasaba AA).
      muted: '#7E93A8',
      onAccent: brandOnAccentText,
      onInverse: brandOnInverseText,
    },
    accent: { default: '#378ADD', strong: '#378ADD', strongest: '#85B7EB', subtleBg: '#0A1D30' },
    // Mismo valor que `text.muted` -- antes '#5F7C97' (~3.6:1, no pasaba AA contra su propio fondo).
    action: { disabledText: '#7E93A8', disabledBackground: '#0A1D30', disabledBorder: '#17324D' },
    // ~8.2:1 sobre la barra de tabs -- margen extra sobre el mínimo AA para etiquetas pequeñas.
    navigation: { active: '#378ADD', inactive: '#9FB6CE' },
    state: {
      success: { text: '#8FCB63', background: '#132A0C', border: '#2C4A1D' },
      error: { text: '#F2A399', background: '#2A0F0C', border: '#4A2620' },
      warning: { text: '#E8C077', background: '#2E2408', border: '#4A3B15' },
      info: { text: '#85B7EB', background: '#0A1D30', border: '#17324D' },
    },
  },
};
