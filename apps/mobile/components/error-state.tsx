import { Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

/**
 * Estado "Error recuperable" -- Master Context §4.15 ("Explicar y permitir
 * reintentar o elegir alternativa"). Ver ADR-0013/ADR-0015. Mismo componente
 * sirve tanto para error de red ("Sin conexión") como error HTTP -- el
 * mensaje ya viene distinguido por el cliente de API (`lib/api/client.ts`).
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title} accessibilityRole="header">
        No se pudo cargar el contenido
      </Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Reintentar" onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>Reintentar</Text>
      </Pressable>
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
    title: { fontSize: 18, fontWeight: '700' as const, textAlign: 'center' as const, color: t.color.state.error.text },
    message: { fontSize: 14, color: t.color.text.secondary, textAlign: 'center' as const },
    button: {
      backgroundColor: t.color.background.inverse,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
      marginTop: 8,
    },
    buttonText: { color: t.color.text.onInverse, fontWeight: '600' as const },
  };
}
