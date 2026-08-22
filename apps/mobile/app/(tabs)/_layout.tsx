import { Text as RNText, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme, typeScale, fontWeight, radii } from '../../theme';
import { Icon } from '../../components/ui';
import type { IconName } from '../../theme';

/**
 * Orden y nombres confirmados contra Master Context 4.2 (máxima autoridad
 * en la jerarquía del proyecto) -- ver ADR-0009. El PRD usa "Juego" para
 * el tercer módulo, pero Master Context 4.24 señala explícitamente que esa
 * es una denominación RETIRADA; "Competir" es la correcta.
 *
 * Tab bar tematizada -- ver ADR-0015, alcance de migración punto 4.
 *
 * UI-2 (Shell): orden VISUAL Perfil/Competir/Inicio/Estudio/IA (.md 6.5) --
 * solo se reordena el JSX de las 5 pantallas de tab, los `name` (segmentos
 * de ruta) no cambian, así que ninguna ruta ni deep link se ve afectado.
 * Iconos de `theme/icons/nav-icons.tsx` (creados en UI-1, sin conectar
 * hasta ahora) + estado activo/inactivo por `color.navigation.*` (.md 6.7).
 *
 * `initialRouteName="index"` (ajuste post-validación Android física):
 * React Navigation/Expo Router usan por defecto la primera pantalla de tab
 * declarada como ruta inicial -- al reordenar el JSX para que Perfil se
 * renderizara primero (orden visual), Perfil pasó a abrir primero también
 * (efecto colateral no intencionado, orden visual y ruta inicial comparten
 * el mismo default). `initialRouteName` desacopla ambos: fija Inicio como
 * pantalla de entrada sin tocar el orden de declaración/visual de arriba.
 */
const TAB_ICON: Record<string, IconName> = {
  perfil: 'profile',
  competir: 'compete',
  index: 'home',
  estudio: 'study',
  ia: 'ai',
};

export default function TabsLayout() {
  const tokens = useTheme();

  function renderIcon(routeName: string, focused: boolean) {
    const color = focused ? tokens.color.navigation.active : tokens.color.navigation.inactive;
    // NAV-1 -- mismo sistema visual para las 5 pestañas, sin excepción para
    // Inicio: superficie tipo squircle (más ancha que alta, esquinas muy
    // redondeadas vía `radii.large`) en vez del círculo perfecto anterior.
    // Dimensiones fijas independientemente de `focused` para que no haya
    // salto de layout al activarse -- solo cambia `backgroundColor`.
    return (
      <View
        style={{
          width: 52,
          height: 36,
          borderRadius: radii.large,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? tokens.color.accent.subtleBg : 'transparent',
        }}
      >
        <Icon name={TAB_ICON[routeName]} size={24} color={color} />
      </View>
    );
  }

  function renderLabel(routeName: string, title: string, focused: boolean) {
    const color = focused ? tokens.color.navigation.active : tokens.color.navigation.inactive;
    return (
      <RNText
        style={{
          fontSize: typeScale.label.fontSize,
          lineHeight: typeScale.label.lineHeight,
          fontWeight: focused ? fontWeight.semibold : fontWeight.regular,
          color,
        }}
      >
        {title}
      </RNText>
    );
  }

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tokens.color.navigation.active,
        tabBarInactiveTintColor: tokens.color.navigation.inactive,
        tabBarStyle: {
          backgroundColor: tokens.color.background.surface,
          borderTopColor: tokens.color.border.default,
        },
        tabBarItemStyle: { flex: 1 },
        tabBarIcon: ({ focused }) => renderIcon(route.name, focused),
      })}
    >
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarLabel: ({ focused }) => renderLabel('perfil', 'Perfil', focused) }}
      />
      <Tabs.Screen
        name="competir"
        options={{ title: 'Competir', tabBarLabel: ({ focused }) => renderLabel('competir', 'Competir', focused) }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarLabel: ({ focused }) => renderLabel('index', 'Inicio', focused) }}
      />
      <Tabs.Screen
        name="estudio"
        options={{ title: 'Estudio', tabBarLabel: ({ focused }) => renderLabel('estudio', 'Estudio', focused) }}
      />
      <Tabs.Screen name="ia" options={{ title: 'IA', tabBarLabel: ({ focused }) => renderLabel('ia', 'IA', focused) }} />
    </Tabs>
  );
}
