import { View } from 'react-native';
import { useThemedStyles, spacing } from '../theme';
import type { ThemeTokens } from '../theme';
import { Text } from './ui/text';
import { Button } from './ui/button';

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
      <Text variant="titleLarge" color="error" style={{ textAlign: 'center' }} accessibilityRole="header">
        No se pudo cargar el contenido
      </Text>
      <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      <Button label="Reintentar" onPress={onRetry} variant="primary" size="small" />
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
