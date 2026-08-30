import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useCosmeticsController, CosmeticSlotCard } from '../../../components/cosmetics-section';
import { TitlesSection } from '../../../components/profile/titles-section';
import { Text } from '../../../components/ui';
import { useTheme, useThemedStyles, spacing } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type PersonalizationTab = 'avatar' | 'banner' | 'titulo';

/**
 * PROFILE-2 (decisión del Product Owner, 2026-08-22) -- superficie dedicada
 * de Personalización, extraída de `perfil/index.tsx` para compactar Perfil.
 *
 * PROFILE-5B (decisión del Product Owner, 2026-08-22) -- reorganización:
 * esta pantalla queda EXCLUSIVAMENTE dedicada a apariencia (cosméticos +
 * títulos). Toda la configuración de cuenta (displayName, username,
 * privacidad, cerrar sesión) se movió al panel de Ajustes en
 * `perfil/index.tsx` (abierto desde el engranaje del hero).
 *
 * Tres tabs -- Avatar | Banner | Título -- como estado local (mismo patrón ya
 * aprobado en `perfil/index.tsx` para Resumen/Estadísticas: sin rutas hijas,
 * sin tabs globales). `useCosmeticsController()` se instancia UNA sola vez
 * aquí arriba -- un único `listCosmetics()` para toda la pantalla; cambiar de
 * tab solo cambia qué `CosmeticSlotCard` ya resuelto se muestra, sin volver a
 * pedir nada al servidor. La tab "Avatar" muestra DOS `CosmeticSlotCard`
 * independientes (`AVATAR` + `AVATAR_FRAME`) -- mismo controlador compartido,
 * pero cada uno lee/escribe únicamente su propia clave, sin fusionar contrato
 * ni estado.
 *
 * COSMETICS-V1 (decisión Product/TPM §12) -- la pestaña "Insignia" (slot
 * `BADGE`) se retira de la SUPERFICIE PRODUCTIVA: los cosméticos de insignia
 * no entran en V1. La infraestructura backend (`CosmeticSlot.BADGE`,
 * contratos, triggers, migraciones) queda intacta/latente -- este cambio es
 * de presentación únicamente. `FeaturedAchievement` (logros destacados) y los
 * títulos son sistemas distintos y no se tocan.
 *
 * "Título" reutiliza `TitlesSection` TAL CUAL -- ya era autosuficiente
 * (fetch propio, acordeón, reconciliación), nunca dependió del agregador
 * de perfil avanzado ni de este controlador de cosméticos.
 */
export default function PersonalizacionScreen() {
  const styles = useThemedStyles(createStyles);
  const tokens = useTheme();
  const [tab, setTab] = useState<PersonalizationTab>('avatar');
  const cosmeticsController = useCosmeticsController();

  const tabs: { key: PersonalizationTab; label: string }[] = [
    { key: 'avatar', label: 'Avatar' },
    { key: 'banner', label: 'Banner' },
    { key: 'titulo', label: 'Título' },
  ];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.tabBar}>
        {tabs.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.key }}
            accessibilityLabel={`Pestaña ${item.label}`}
            onPress={() => setTab(item.key)}
            style={[styles.tabItem, tab === item.key && styles.tabItemActive]}
          >
            <Text
              variant="bodySmall"
              weight="semibold"
              style={tab === item.key ? { color: tokens.color.accent.default } : undefined}
              color={tab === item.key ? 'primary' : 'secondary'}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'avatar' ? (
        <View style={styles.tabContent}>
          <CosmeticSlotCard slot="AVATAR" controller={cosmeticsController} />
          <CosmeticSlotCard slot="AVATAR_FRAME" controller={cosmeticsController} />
        </View>
      ) : null}
      {tab === 'banner' ? (
        <View style={styles.tabContent}>
          <CosmeticSlotCard slot="PROFILE_BANNER" controller={cosmeticsController} />
        </View>
      ) : null}
      {tab === 'titulo' ? (
        <View style={styles.tabContent}>
          <TitlesSection />
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    scroll: { flex: 1, backgroundColor: t.color.background.default },
    content: { padding: 16, gap: spacing.space3, paddingBottom: spacing.space6 },
    tabBar: { flexDirection: 'row' as const, gap: spacing.space4, borderBottomWidth: 1, borderBottomColor: t.color.border.default },
    tabItem: { paddingVertical: spacing.space2, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: t.color.accent.default },
    tabContent: { gap: spacing.space3 },
  };
}
