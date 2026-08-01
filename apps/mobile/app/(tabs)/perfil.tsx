import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ComingSoonPlaceholder } from '../../components/coming-soon-placeholder';
import { useAuth } from '../../lib/auth/mock-auth-provider';

/**
 * Perfil real (conectado a GET/POST /user/profile) queda fuera de alcance
 * de este paso -- ver ADR-0009: sin sesión real todavía, esa llamada no
 * tiene con qué autenticarse. El botón de cerrar sesión sí es funcional
 * (usa el MockAuthProvider real) para poder probar la máquina de estados
 * de punta a punta.
 */
export default function PerfilScreen() {
  const auth = useAuth();

  return (
    <View style={styles.container}>
      <ComingSoonPlaceholder title="Perfil" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión (simulado)"
        onPress={auth.logout}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Cerrar sesión (simulado)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  button: {
    alignSelf: 'center',
    marginBottom: 32,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c00',
  },
  buttonText: { color: '#c00', fontWeight: '600' },
});
