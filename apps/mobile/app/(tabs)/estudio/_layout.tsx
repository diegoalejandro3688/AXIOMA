import { Stack } from 'expo-router';

/** Sub-navegación de Estudio (lista de unidades -> detalle de unidad) -- ver ADR-0013. Sigue siendo la misma pestaña, no una ruta nueva (ADR-0009). */
export default function EstudioLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Estudio' }} />
      <Stack.Screen name="[topicId]" options={{ title: 'Unidad' }} />
    </Stack>
  );
}
