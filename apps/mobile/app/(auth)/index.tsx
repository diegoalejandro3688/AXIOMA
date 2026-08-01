import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../lib/auth/mock-auth-provider';

/**
 * Placeholder de Login -- ver ADR-0009. "Continuar" simula autenticación
 * (MockAuthProvider.login()), sin SDK de Firebase ni llamada al backend
 * todavía. Esa integración real es un paso posterior.
 */
export default function LoginScreen() {
  const auth = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Iniciar sesión
      </Text>
      <Text style={styles.note}>
        Pantalla de marcador de posición -- la integración real con Firebase se implementará en un paso
        posterior.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continuar (simulado, sin autenticación real)"
        onPress={auth.login}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Continuar</Text>
      </Pressable>
      <Link href="/(auth)/register" style={styles.link}>
        Crear cuenta
      </Link>
      <Link href="/(auth)/forgot-password" style={styles.link}>
        Olvidé mi contraseña
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  note: { fontSize: 13, color: '#666', textAlign: 'center' },
  button: { backgroundColor: '#111', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { fontSize: 14, color: '#0a58ca' },
});
