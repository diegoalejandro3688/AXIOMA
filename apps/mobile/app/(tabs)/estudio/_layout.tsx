import { Stack } from 'expo-router';

/**
 * Sub-navegación de Estudio -- ver ADR-0013/ADR-0009. Sigue siendo la misma
 * pestaña, no una ruta nueva. Recorrido (Bloque IV): materia -> detalle de
 * materia -> unidades -> recurso -> ejercicio. `recurso`/`ejercicio` usan su
 * propio header (X + barra de progreso) en vez del header nativo de Stack.
 */
export default function EstudioLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Estudio' }} />
      <Stack.Screen name="[subjectId]/index" options={{ title: 'Materia' }} />
      <Stack.Screen name="[subjectId]/unidades" options={{ title: 'Unidades' }} />
      <Stack.Screen name="topic/[topicId]/recurso" options={{ headerShown: false }} />
      <Stack.Screen name="topic/[topicId]/ejercicio" options={{ headerShown: false }} />
    </Stack>
  );
}
