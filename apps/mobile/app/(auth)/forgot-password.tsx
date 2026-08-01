import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

/** Placeholder -- ver ADR-0009. La recuperación real la maneja Firebase (proveedor de identidad). */
export default function ForgotPasswordScreen() {
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

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  note: { fontSize: 13, color: '#666', textAlign: 'center' },
  link: { fontSize: 14, color: '#0a58ca' },
});
