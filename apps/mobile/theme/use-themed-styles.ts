import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from './tokens';
import { useTheme } from './theme-provider';

/**
 * Hook único para estilos dependientes del tema -- ver ADR-0015, punto 3.
 * `factory` debe declararse a nivel de módulo (fuera del componente) para
 * que su identidad sea estable entre renders; `tokens` ya es estable
 * (referencia a `lightTokens`/`darkTokens`, constantes de módulo) y solo
 * cambia cuando el tema realmente cambia -- por eso `useMemo` evita
 * reconstruir el objeto de estilos en cada render ajeno.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (tokens: ThemeTokens) => T,
): T {
  const tokens = useTheme();
  return useMemo(() => StyleSheet.create(factory(tokens)), [tokens, factory]);
}
