import { View } from 'react-native';
import { useThemedStyles, spacing } from '../../theme';
import type { ThemeTokens } from '../../theme';
import { Text } from '../ui/text';
import { Button } from '../ui/button';

/**
 * PREMIUM V1 -- Capa 2 (Mobile gating), C2.2.
 *
 * Estado NEUTRO para cuando el entitlement no se pudo resolver (fallo inicial
 * de `GET /me/entitlement`). NO es un lock comercial ni un paywall: solo un
 * reintento tecnico. `onRetry` debe llamar UNICAMENTE a
 * `useEntitlement().refresh()` -- la recarga de contenido de la pantalla es
 * state-driven (ocurre cuando el entitlement vuelve a `ready`).
 *
 * Copy congelado.
 */
export function EntitlementUnavailable({ onRetry }: { onRetry: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>
        No pudimos verificar tu acceso
      </Text>
      <Text variant="bodySmall" color="secondary" style={styles.body}>
        Inténtalo de nuevo para continuar.
      </Text>
      <Button variant="primary" label="Reintentar" onPress={onRetry} />
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
    title: { textAlign: 'center' as const },
    body: { textAlign: 'center' as const },
  };
}
