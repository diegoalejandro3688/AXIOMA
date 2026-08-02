import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

/** Estado "Carga" -- Master Context §4.15. Ver ADR-0013. */
export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { fontSize: 14, color: '#666' },
});
