import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { localFlags } from '../lib/storage/local-flags';
import { darkTokens, lightTokens, type AppearancePreference, type ColorSchemeName, type ThemeTokens } from './tokens';

interface ThemeContextValue {
  tokens: ThemeTokens;
  scheme: ColorSchemeName;
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Fundación global de theming -- ver ADR-0015. Sigue `useColorScheme()` del
 * sistema (núcleo de React Native, ya se suscribe a `Appearance.addChangeListener`
 * sin polling) con un fallback determinista a `'light'` cuando el esquema
 * todavía no está resuelto (primer render nativo / hidratación en Web) --
 * nunca se deja un tema sin resolver.
 *
 * THEME-1 -- agrega una preferencia explícita del usuario (`AppearancePreference`:
 * 'system' | 'light' | 'dark', ver Perfil -> Ajustes) por encima del esquema
 * del sistema: 'system' delega en `useColorScheme()` (comportamiento
 * original, sin cambio); 'light'/'dark' lo fijan sin importar el sistema.
 * Persistida vía `localFlags` (AsyncStorage ya existente, ver
 * `lib/storage/local-flags.ts`) -- ninguna infraestructura nueva. Se
 * inicializa en memoria como 'system' (mismo comportamiento de siempre) y se
 * reconcilia de forma asíncrona con el valor persistido apenas se resuelve
 * la lectura; si el usuario nunca fijó una preferencia distinta, no hay
 * ninguna diferencia visible.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');

  useEffect(() => {
    let cancelled = false;
    localFlags.getAppearancePreference().then((stored) => {
      if (!cancelled) setPreferenceState(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setPreference(next: AppearancePreference) {
    setPreferenceState(next);
    localFlags.setAppearancePreference(next);
  }

  const resolvedSystemScheme: ColorSchemeName = systemScheme === 'dark' ? 'dark' : 'light';
  const scheme: ColorSchemeName = preference === 'system' ? resolvedSystemScheme : preference;
  const tokens = scheme === 'dark' ? darkTokens : lightTokens;
  const value = useMemo<ThemeContextValue>(
    () => ({ tokens, scheme, preference, setPreference }),
    [tokens, scheme, preference],
  );

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

/** THEME-1 -- preferencia elegida (`'system' | 'light' | 'dark'`) + setter, para el selector de Ajustes. */
export function useAppearancePreference(): { preference: AppearancePreference; setPreference: (preference: AppearancePreference) => void } {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppearancePreference() debe usarse dentro de <ThemeProvider>.');
  return { preference: ctx.preference, setPreference: ctx.setPreference };
}
