import { Stack } from 'expo-router';

/**
 * Sub-navegación de Competir -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md,
 * Incremento 5. Sigue siendo la misma pestaña, no una ruta nueva -- mismo
 * patrón que `estudio/_layout.tsx`. `index` es el hub (Desafíos +
 * participación de liga); `ranking` es la lista de ranking del propio
 * grupo, con redacción y paginación por botón "Ver más" (sub-incremento
 * 5.b); `perfil/[username]` es el perfil competitivo de OTRO usuario,
 * solo lectura, alcanzable únicamente desde una fila presentable del
 * ranking (sub-incremento 5.c).
 */
export default function CompetirLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="ranking" options={{ title: 'Ranking' }} />
      <Stack.Screen name="perfil/[username]" options={{ title: 'Perfil' }} />
    </Stack>
  );
}
