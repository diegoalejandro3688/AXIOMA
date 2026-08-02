import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Estado "Error recuperable" -- Master Context §4.15 ("Explicar y permitir
 * reintentar o elegir alternativa"). Ver ADR-0013. Mismo componente sirve
 * tanto para error de red ("Sin conexión") como error HTTP -- el mensaje ya
 * viene distinguido por el cliente de API (`lib/api/client.ts`).
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        No se pudo cargar el contenido
      </Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Reintentar" onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 14, color: '#666', textAlign: 'center' },
  button: { backgroundColor: '#111', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
