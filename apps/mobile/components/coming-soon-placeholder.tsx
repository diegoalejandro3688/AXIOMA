import { View } from 'react-native';
import { useThemedStyles, spacing } from '../theme';
import type { ThemeTokens } from '../theme';
import { Text } from './ui/text';

interface ComingSoonPlaceholderProps {
  title: string;
}

/**
 * Shell común para los módulos cuyo contenido real corresponde a una fase
 * posterior de la Implementation Matrix (ver ADR-0009) -- la pestaña
 * existe, la funcionalidad todavía no. Deliberadamente sin datos ni
 * métricas simuladas.
 *
 * Consume solo `background`/`text.primary`/`text.secondary` (ver ADR-0015,
 * corrección de contraste fuera del alcance de M1) -- sin migrar el resto
 * de la arquitectura visual de Competir/IA, que sigue diferida.
 */
export function ComingSoonPlaceholder({ title }: ComingSoonPlaceholderProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Text variant="heading3" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="bodySmall" color="secondary">
        Próximamente.
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
      gap: spacing.space2,
      padding: spacing.space6,
      backgroundColor: t.color.background.default,
    },
  };
}
