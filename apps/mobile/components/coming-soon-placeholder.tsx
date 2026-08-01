import { StyleSheet, Text, View } from 'react-native';

interface ComingSoonPlaceholderProps {
  title: string;
}

/**
 * Shell común para los módulos cuyo contenido real corresponde a una fase
 * posterior de la Implementation Matrix (ver ADR-0009) -- la pestaña
 * existe, la funcionalidad todavía no. Deliberadamente sin datos ni
 * métricas simuladas.
 */
export function ComingSoonPlaceholder({ title }: ComingSoonPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>Próximamente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    color: '#666',
  },
});
