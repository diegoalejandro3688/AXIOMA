import { Tabs } from 'expo-router';

/**
 * Orden y nombres confirmados contra Master Context 4.2 (máxima autoridad
 * en la jerarquía del proyecto) -- ver ADR-0009. El PRD usa "Juego" para
 * el tercer módulo, pero Master Context 4.24 señala explícitamente que esa
 * es una denominación RETIRADA; "Competir" es la correcta.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="estudio" options={{ title: 'Estudio' }} />
      <Tabs.Screen name="competir" options={{ title: 'Competir' }} />
      <Tabs.Screen name="ia" options={{ title: 'IA' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
