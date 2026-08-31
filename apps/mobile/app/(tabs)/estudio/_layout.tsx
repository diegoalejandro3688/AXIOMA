import { Stack } from 'expo-router';
import { useTheme, typeScale, borders } from '../../../theme';

/**
 * Sub-navegación de Estudio -- ver ADR-0013/ADR-0009. Sigue siendo la misma
 * pestaña, no una ruta nueva. Recorrido (Bloque IV): materia -> detalle de
 * materia -> unidades -> recurso -> ejercicio. `recurso`/`ejercicio` usan su
 * propio header (X + barra de progreso) en vez del header nativo de Stack.
 *
 * UI-2 (Shell): header nativo tematizado vía `screenOptions` (.md 8.5/8.6,
 * bloque 12.7) -- mismos títulos, misma flecha nativa de volver, solo
 * apariencia (fondo/color/tipografía de los tokens de UI-1).
 */
export default function EstudioLayout() {
  const tokens = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: tokens.color.background.surface,
          borderBottomWidth: borders.hairline,
          borderBottomColor: tokens.color.border.default,
        } as never,
        headerTintColor: tokens.color.text.primary,
        headerTitleStyle: { color: tokens.color.text.primary, fontWeight: '700', fontSize: typeScale.titleLarge.fontSize },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Estudio' }} />
      <Stack.Screen name="[subjectId]/index" options={{ title: 'Materia' }} />
      <Stack.Screen name="[subjectId]/unidades" options={{ title: 'Unidades' }} />
      {/* STUDY CONTENT MOBILE REACHABILITY -- nivel Unidad -> Recursos. */}
      <Stack.Screen name="[subjectId]/unidad/[unitId]" options={{ title: 'Recursos' }} />
      <Stack.Screen name="topic/[topicId]/recurso" options={{ headerShown: false }} />
      <Stack.Screen name="topic/[topicId]/ejercicio" options={{ headerShown: false }} />
      {/* ENSAYOS-M1-C -- flujo de Ensayos, misma pestaña Estudio (ADR-0024). */}
      <Stack.Screen name="ensayos/index" options={{ title: 'Ensayos' }} />
      <Stack.Screen name="ensayos/[examId]/index" options={{ title: 'Ensayo' }} />
      <Stack.Screen name="ensayos/[examId]/attempt/[attemptId]" options={{ headerShown: false }} />
      <Stack.Screen name="ensayos/[examId]/result/[attemptId]" options={{ headerShown: false }} />
      <Stack.Screen name="ensayos/[examId]/review/[attemptId]" options={{ headerShown: false }} />
    </Stack>
  );
}
