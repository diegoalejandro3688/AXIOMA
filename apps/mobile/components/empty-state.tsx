import { StyleSheet, Text, View } from 'react-native';

/** Estado "Vacío" -- Master Context §4.15 ("Explicar por qué no hay contenido"). Ver ADR-0013. */
export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { fontSize: 14, color: '#666', textAlign: 'center' },
});
