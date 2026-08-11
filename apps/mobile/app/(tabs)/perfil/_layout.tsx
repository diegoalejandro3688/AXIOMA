import { Stack } from 'expo-router';

/**
 * Sub-navegación de Perfil -- LEF Bloque V, Incremento 8
 * (docs/adr/LEF-BLOCK-V-DEFINITION.md §16). Sigue siendo la MISMA pestaña
 * (`perfil`, ver `app/(tabs)/_layout.tsx`) -- convertir `perfil.tsx` en
 * `perfil/index.tsx` no cambia el nombre de ruta ni la identidad de la tab
 * (Expo Router resuelve un directorio con `index.tsx` al mismo segmento que
 * antes resolvía el archivo plano), mismo patrón exacto ya usado por
 * `competir/_layout.tsx`/`estudio/_layout.tsx`. `index` es el perfil propio
 * consolidado; `preview` es la vista previa pública (Incremento 7) --
 * alcanzable únicamente desde el botón "Ver cómo me ven otros" dentro de
 * `index`, nunca una tab independiente.
 */
export default function PerfilLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="preview" options={{ title: 'Cómo me ven otros' }} />
    </Stack>
  );
}
