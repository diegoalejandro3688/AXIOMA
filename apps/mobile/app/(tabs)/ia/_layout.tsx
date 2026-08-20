import { Stack } from 'expo-router';
import { useTheme, typeScale, borders } from '../../../theme';

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
 *
 * UI-2 (Shell): header nativo tematizado vía `screenOptions` -- mismo
 * criterio que `estudio/_layout.tsx`.
 */
export default function IaLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="conversation/[conversationId]" options={{ title: 'Tutor IA' }} />
    </Stack>
  );
}
