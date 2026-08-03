import { Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

/** Estado "Vacío" -- Master Context §4.15 ("Explicar por qué no hay contenido"). Ver ADR-0013/ADR-0015. */
export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
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
    message: { fontSize: 14, color: t.color.text.secondary, textAlign: 'center' as const },
    button: {
      borderWidth: 1,
      borderColor: t.color.text.primary,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginTop: 4,
    },
    buttonText: { color: t.color.text.primary, fontWeight: '600' as const },
  };
}
