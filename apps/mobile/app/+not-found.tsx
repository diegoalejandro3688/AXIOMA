import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Ruta desconocida -- ver ADR-0009. El enlace vuelve a "/", que re-evalúa
 * la máquina de estados de _layout.tsx y aterriza en la ruta correcta
 * (login, onboarding o tabs) según corresponda, en vez de asumir una.
 */
export default function NotFoundScreen() {
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

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 18, fontWeight: '600' },
  link: { fontSize: 14, color: '#0a58ca' },
});
