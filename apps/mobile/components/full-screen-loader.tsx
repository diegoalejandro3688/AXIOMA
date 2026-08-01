import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Se muestra mientras la máquina de estados de navegación resuelve auth +
 * onboarding (ver ADR-0009) -- evita cualquier flash de una ruta
 * incorrecta antes de saber a cuál redirigir.
 */
export function FullScreenLoader() {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel="Cargando">
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
