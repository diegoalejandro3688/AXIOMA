import { Text, View } from 'react-native';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

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
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>Próximamente.</Text>
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      padding: 24,
      backgroundColor: t.color.background.default,
    },
    title: { fontSize: 20, fontWeight: '700' as const, color: t.color.text.primary },
    message: { fontSize: 14, color: t.color.text.secondary },
  };
}
