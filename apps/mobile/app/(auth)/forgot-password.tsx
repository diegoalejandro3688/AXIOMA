import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/** Placeholder -- ver ADR-0009. La recuperación real la maneja Firebase (proveedor de identidad). */
export default function ForgotPasswordScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Recuperar contraseña
      </Text>
      <Text style={styles.note}>Pantalla de marcador de posición.</Text>
      <Link href="/(auth)" style={styles.link}>
        Volver a iniciar sesión
      </Link>
    </View>
  );
}

/** Alcance mínimo (ver ADR-0015): solo `container`/`title`/`note` pasan por tokens. */
function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 16, padding: 24, backgroundColor: t.color.background.default },
    title: { fontSize: 24, fontWeight: '700' as const, color: t.color.text.primary },
    note: { fontSize: 13, color: t.color.text.secondary, textAlign: 'center' as const },
    link: { fontSize: 14, color: '#0a58ca' },
  };
}
