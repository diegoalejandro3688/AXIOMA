import { Stack } from 'expo-router';
import { useTheme, typeScale, borders } from '../../../theme';

/**
 * CHALLENGES ESCAPE-PATH HOTFIX -- `index` (el hub) es la ruta ANCLA de este
 * stack. `desafios` es la única pantalla anidada a la que se llega desde OTRA
 * pestaña: Inicio -> "Ver todos los desafíos" -> `router.push('/(tabs)/competir/desafios')`
 * (`app/(tabs)/index.tsx`). Sin ancla, esa navegación cross-tab dejaba
 * `desafios` como raíz del stack de Competir -> `navigation.canGoBack()` era
 * `false` -> el header nativo se pintaba SIN flecha de volver y Android Back no
 * tenía destino coherente -> el usuario quedaba atrapado. `initialRouteName`
 * garantiza que `competir/index` siempre quede por debajo, así que la flecha
 * nativa de volver aparece y Android Back regresa al hub -- exactamente el
 * comportamiento que ya tiene Ranking (que sólo se abre desde el hub). No
 * cambia nada para las entradas que ya vienen del propio hub.
 */
export const unstable_settings = { initialRouteName: 'index' };

/**
 * Sub-navegación de Competir -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md,
 * Incremento 5. Sigue siendo la misma pestaña, no una ruta nueva -- mismo
 * patrón que `estudio/_layout.tsx`. `index` es el hub (Desafíos +
 * participación de liga); `ranking` es la lista de ranking del propio
 * grupo, con redacción y paginación por botón "Ver más" (sub-incremento
 * 5.b); `perfil/[username]` es el perfil competitivo de OTRO usuario,
 * solo lectura, alcanzable únicamente desde una fila presentable del
 * ranking (sub-incremento 5.c); `quick-question` es Pregunta rápida,
 * online-only (sub-incremento 5.d) -- el back nativo del header (flecha/
 * gesto) NUNCA cierra la sesión (`close()` solo se invoca desde el botón
 * "Salir" dentro de la propia pantalla) -- una sesión ACTIVE queda
 * simplemente abierta para retomarse después.
 *
 * UI-2 (Shell): header nativo tematizado vía `screenOptions` -- mismo
 * criterio que `estudio/_layout.tsx`. `quick-question` mantiene la tab bar
 * visible (no lleva `headerShown:false` a nivel de tabs) y solo cambia
 * apariencia de su header nativo aquí, nunca su lógica de cierre.
 */
export default function CompetirLayout() {
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
      <Stack.Screen name="ranking" options={{ title: 'Ranking' }} />
      <Stack.Screen name="desafios" options={{ title: 'Desafíos' }} />
      <Stack.Screen name="perfil/[username]" options={{ title: 'Perfil' }} />
      <Stack.Screen name="quick-question" options={{ title: 'Pregunta rápida' }} />
    </Stack>
  );
}
