import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkTokens, lightTokens, type ColorSchemeName, type ThemeTokens } from './tokens';

interface ThemeContextValue {
  tokens: ThemeTokens;
  scheme: ColorSchemeName;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Fundación global de theming -- ver ADR-0015. Sigue `useColorScheme()` del
 * sistema (núcleo de React Native, ya se suscribe a `Appearance.addChangeListener`
 * sin polling) con un fallback determinista a `'light'` cuando el esquema
 * todavía no está resuelto (primer render nativo / hidratación en Web) --
 * nunca se deja un tema sin resolver. Sin toggle manual ni persistencia: no
 * existe ninguna superficie de ajustes en M1 desde donde fijarlo.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ColorSchemeName = systemScheme === 'dark' ? 'dark' : 'light';
  const tokens = scheme === 'dark' ? darkTokens : lightTokens;
  const value = useMemo<ThemeContextValue>(() => ({ tokens, scheme }), [tokens, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeTokens {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() debe usarse dentro de <ThemeProvider>.');
  return ctx.tokens;
}

export function useColorSchemeName(): ColorSchemeName {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useColorSchemeName() debe usarse dentro de <ThemeProvider>.');
  return ctx.scheme;
}
