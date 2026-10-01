import { Stack } from 'expo-router';
import { useTheme, typeScale, borders } from '../../../theme';

/**
 * CHALLENGES ESCAPE-PATH -- historial: `desafios` es la única pantalla
 * anidada de este stack alcanzada desde OTRA pestaña (Inicio ->
 * "Ver todos los desafíos" -> `push('/(tabs)/competir/desafios')`).
 * El hotfix original (`691a69c`) usó `unstable_settings.initialRouteName`
 * para anclar `index` debajo de `desafios` y así darle a Android Back un
 * destino coherente.
 *
 * VC4 MICROBLOQUE 4.1/4.1B -- `unstable_settings` (API explícitamente
 * INESTABLE) demostró en dispositivo real ser poco fiable en DOS frentes:
 * primero la flecha nativa (4.1, intermitente sin cambiar la ruta de
 * entrada), y luego la propia acción de volver -- un `router.replace()` de
 * href absoluto apoyado en el mismo estado de pila incidental terminaba en
 * Perfil (la PRIMERA pestaña declarada en `(tabs)/_layout.tsx`) y dejaba el
 * stack de Competir corrupto (4.1B). Con el fix 4.1B, `desafios.tsx` YA NO
 * depende de la pila nativa para NADA relacionado con volver: header propio
 * (`ScreenHeader`, `headerShown:false`) + `onBack` determinista por origen
 * explícito (`from=home|competir`) + `BackHandler` propio para Android Back
 * físico. Como `desafios` era el ÚNICO motivo de `unstable_settings` en
 * este stack (ninguna otra pantalla se alcanza cross-tab), y ya no depende
 * de él para nada, SE ELIMINA -- mantenerlo sin ningún consumidor real sería
 * inercia, no necesidad (§4 de la auditoría del microbloque).
 */

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
      <Stack.Screen name="desafios" options={{ headerShown: false }} />
      <Stack.Screen name="perfil/[username]" options={{ title: 'Perfil' }} />
      <Stack.Screen name="quick-question" options={{ title: 'Pregunta rápida' }} />
    </Stack>
  );
}
