import { ActivityIndicator, Text, View } from 'react-native';
import { useThemedStyles, useTheme } from '../theme';
import type { ThemeTokens } from '../theme';

/** Estado "Carga" -- Master Context §4.15. Ver ADR-0013/ADR-0015. */
export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={tokens.color.accent.default} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 12,
      padding: 24,
      backgroundColor: t.color.background.default,
    },
    message: { fontSize: 14, color: t.color.text.secondary },
  };
}
