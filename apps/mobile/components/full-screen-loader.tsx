import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme';

/**
 * Se muestra mientras la máquina de estados de navegación resuelve auth +
 * onboarding (ver ADR-0009) -- evita cualquier flash de una ruta
 * incorrecta antes de saber a cuál redirigir. Global, sin mensaje --
 * distinto de `LoadingState` (local, con mensaje).
 */
export function FullScreenLoader() {
  const tokens = useTheme();

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.background.default }}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
    >
      <ActivityIndicator size="large" color={tokens.color.accent.default} />
    </View>
  );
}
