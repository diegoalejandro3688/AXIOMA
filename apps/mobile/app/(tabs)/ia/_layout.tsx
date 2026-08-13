import { Stack } from 'expo-router';

/**
 * Sub-navegación del Tutor IA -- LEF Bloque VI, Incremento 8
 * (docs/adr/LEF-BLOCK-VI-DEFINITION.md §28). Sigue siendo la MISMA pestaña
 * (`ia`, ver `app/(tabs)/_layout.tsx`): convertir `ia.tsx` en `ia/index.tsx`
 * no cambia el nombre de ruta ni la identidad de la tab -- Expo Router
 * resuelve un directorio con `index.tsx` al mismo segmento que antes
 * resolvía el archivo plano, mismo patrón exacto ya usado por
 * `perfil/_layout.tsx`/`competir/_layout.tsx`/`estudio/_layout.tsx`.
 *
 * `index` es el hub (historial de conversaciones propias + cuota + inicio de
 * conversación); `conversation/[conversationId]` es UNA conversación --
 * nunca una tab independiente, alcanzable solo desde el hub (o desde el
 * acceso contextual de Estudio, que pasa por el hub). El back nativo del
 * header devuelve al hub, sin cerrar ni borrar nada.
 */
export default function IaLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="conversation/[conversationId]" options={{ title: 'Tutor IA' }} />
    </Stack>
  );
}
