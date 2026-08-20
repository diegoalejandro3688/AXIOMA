import { ActivityIndicator, View } from 'react-native';
import { useThemedStyles, useTheme, spacing } from '../theme';
import type { ThemeTokens } from '../theme';
import { Text } from './ui/text';

/** Estado "Carga" -- Master Context §4.15. Ver ADR-0013/ADR-0015. Local, con mensaje -- distinto de `FullScreenLoader` (global, sin mensaje). */
export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  const tokens = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={tokens.color.accent.default} />
      <Text variant="bodySmall" color="secondary">
        {message}
      </Text>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.space3,
      padding: spacing.space6,
      backgroundColor: t.color.background.default,
    },
  };
}
