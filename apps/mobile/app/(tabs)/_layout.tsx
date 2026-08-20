import { Text as RNText, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme, typeScale, fontWeight } from '../../theme';
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
    const isCenter = routeName === 'index';
    // Inicio (centro) lleva un tratamiento ligeramente más prominente al
    // estar activo -- fondo `accent.subtleBg` un poco más grande detrás del
    // icono, nunca un botón flotante que rompa la altura/posición de la barra.
    const badgeSize = isCenter ? 40 : 36;
    return (
      <View
        style={{
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
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
