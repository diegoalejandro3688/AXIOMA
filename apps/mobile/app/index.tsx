import { StyleSheet, Text, View } from 'react-native';
import type { HealthLiveResponse } from '@axioma/contracts';

/**
 * Pantalla de laboratorio para Fase 0 (fundación técnica).
 * Confirma que mobile compila y que @axioma/contracts resuelve
 * correctamente como dependencia de workspace. No es una pantalla
 * de producto — el App Map define las pantallas reales.
 */
const exampleHealth: HealthLiveResponse = {
  status: 'ok',
  service: 'axioma-backend',
  timestamp: new Date().toISOString(),
};

export default function FoundationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AXIOMA</Text>
      <Text style={styles.subtitle}>Fundación técnica — Fase 0</Text>
      <Text style={styles.detail}>contracts: {exampleHealth.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  detail: {
    fontSize: 12,
    color: '#999',
  },
});
