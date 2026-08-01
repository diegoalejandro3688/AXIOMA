import { StyleSheet, Text, View } from 'react-native';

/**
 * Placeholder de Inicio -- ver ADR-0009. Semánticamente distinto de los
 * otros 4 módulos (orienta al estudio, App Map/Master Context 4.2), por
 * eso no usa ComingSoonPlaceholder -- su contenido real (racha, XP,
 * objetivo diario) llega en la Vertical Slice de Fase 1, no aquí.
 */
export default function InicioScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Inicio
      </Text>
      <Text style={styles.message}>Próximamente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontSize: 20, fontWeight: '700' },
  message: { fontSize: 14, color: '#666' },
});
