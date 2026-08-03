import { Tabs } from 'expo-router';
import { useTheme } from '../../theme';

/**
 * Orden y nombres confirmados contra Master Context 4.2 (máxima autoridad
 * en la jerarquía del proyecto) -- ver ADR-0009. El PRD usa "Juego" para
 * el tercer módulo, pero Master Context 4.24 señala explícitamente que esa
 * es una denominación RETIRADA; "Competir" es la correcta.
 *
 * Tab bar tematizada -- ver ADR-0015, alcance de migración punto 4.
 */
export default function TabsLayout() {
  const tokens = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.navigation.active,
        tabBarInactiveTintColor: tokens.color.navigation.inactive,
        tabBarStyle: {
          backgroundColor: tokens.color.background.surface,
          borderTopColor: tokens.color.border.default,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="estudio" options={{ title: 'Estudio' }} />
      <Tabs.Screen name="competir" options={{ title: 'Competir' }} />
      <Tabs.Screen name="ia" options={{ title: 'IA' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
