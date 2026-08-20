import { View } from 'react-native';
import { useThemedStyles, spacing } from '../theme';
import type { ThemeTokens } from '../theme';
import { Text } from './ui/text';
import { Button } from './ui/button';

/** Estado "Vacío" -- Master Context §4.15 ("Explicar por qué no hay contenido"). Ver ADR-0013/ADR-0015. */
export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" size="small" /> : null}
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
