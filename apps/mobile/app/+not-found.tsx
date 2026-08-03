import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

/**
 * Ruta desconocida -- ver ADR-0009. El enlace vuelve a "/", que re-evalúa
 * la máquina de estados de _layout.tsx y aterriza en la ruta correcta
 * (login, onboarding o tabs) según corresponda, en vez de asumir una.
 */
export default function NotFoundScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          Esta pantalla no existe.
        </Text>
        <Link href="/" style={styles.link}>
          Volver al inicio
        </Link>
      </View>
    </>
  );
}

/** Alcance mínimo (ver ADR-0015): solo `container`/`title` pasan por tokens. */
function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 16, padding: 24, backgroundColor: t.color.background.default },
    title: { fontSize: 18, fontWeight: '600' as const, color: t.color.text.primary },
    link: { fontSize: 14, color: '#0a58ca' },
  };
}
