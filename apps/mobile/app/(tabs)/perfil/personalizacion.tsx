import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { LevelProgressResponse, MyAdvancedProfileResponse } from '@axioma/contracts';
import { useCosmeticsController } from '../../../components/cosmetics-section';
import { useTitlesController, TitlesSection } from '../../../components/profile/titles-section';
import { CustomizationPreview } from '../../../components/personalization/customization-preview';
import { CosmeticCollectionTab } from '../../../components/personalization/cosmetic-collection';
import { getMyAdvancedProfile } from '../../../lib/api/advanced-profile';
import { getLevel } from '../../../lib/api/progression';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text } from '../../../components/ui';
import { useTheme, useThemedStyles, radii, spacing } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type PersonalizationTab = 'avatar' | 'marco' | 'banner' | 'titulo';

/**
 * PROFILE-PERSONALIZATION-REMODEL (2026-08-30) -- remodelación puramente
 * VISUAL/UX de la superficie de Personalización. NO cambia la arquitectura:
 * mismo `useCosmeticsController` (equipamiento no optimista, bloqueo por
 * slot, 404/409), mismo catálogo de títulos (`useTitlesController`,
 * extraído de `TitlesSection` para compartir el título equipado con la
 * vista previa), mismos endpoints. Cambios de producto en la SUPERFICIE
 * únicamente: "Marco" pasa a ser su propia pestaña visible (no un slot
 * nuevo), se retira la etiqueta de rareza, y se añade una vista previa de
 * identidad.
 *
 * PROFILE-5B (sigue vigente) -- esta pantalla es EXCLUSIVAMENTE apariencia:
 * ninguna configuración de cuenta (nombre, privacidad, cerrar sesión) vive
 * aquí; eso está en el panel de Ajustes de `perfil/index.tsx`.
 *
 * COSMETICS-V1 §12/§22 -- la pestaña "Insignia" (slot `BADGE`) NO entra en
 * V1; su infraestructura backend queda latente, invisible en producto.
 */
export default function PersonalizacionScreen() {
  const styles = useThemedStyles(createStyles);
  const tokens = useTheme();
  const [tab, setTab] = useState<PersonalizationTab>('avatar');

  const cosmeticsController = useCosmeticsController();
  const titlesController = useTitlesController();

  const [advancedProfile, setAdvancedProfile] = useState<MyAdvancedProfileResponse | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgressResponse | null>(null);

  const loadIdentity = useCallback(async () => {
    // Composición local de datos YA existentes -- sin endpoint agregador nuevo.
    // Fallo aquí degrada solo la vista previa (nombre/nivel), nunca bloquea
    // el catálogo de cosméticos/títulos.
    const [profileResult, levelResult] = await Promise.all([getMyAdvancedProfile(), getLevel()]);
    if (profileResult.ok) setAdvancedProfile(profileResult.data);
    if (levelResult.ok) setLevelProgress(levelResult.data);
  }, []);

  useEffect(() => {
    loadIdentity();
  }, [loadIdentity]);

  const tabs: { key: PersonalizationTab; label: string }[] = [
    { key: 'avatar', label: 'Avatar' },
    { key: 'marco', label: 'Marco' },
    { key: 'banner', label: 'Banner' },
    { key: 'titulo', label: 'Título' },
  ];

  if (cosmeticsController.state.status === 'loading' || titlesController.state.status === 'loading') {
    return <LoadingState message="Cargando personalización…" />;
  }
  if (cosmeticsController.state.status === 'error') {
    return <ErrorState message={cosmeticsController.state.message} onRetry={cosmeticsController.load} />;
  }

  const equipped = cosmeticsController.state.data.equipped;
  const equippedTitle = titlesController.state.status === 'ready' ? titlesController.state.data.equipped : null;
  const sampleAvatarUri =
    equipped.AVATAR?.assetReference ?? cosmeticsController.state.data.owned.find((c) => c.itemType === 'AVATAR')?.assetReference ?? null;

  const displayName =
    advancedProfile?.publicProfile?.username ?? advancedProfile?.profile?.displayName ?? 'Tu perfil';
  const levelNumber = levelProgress?.currentLevel.levelNumber ?? advancedProfile?.publicProfile?.levelNumber ?? 1;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text variant="bodySmall" color="secondary" style={styles.subtitle}>
        Elige los cosméticos que representarán tu perfil.
      </Text>

      <CustomizationPreview
        avatarUri={equipped.AVATAR?.assetReference ?? null}
        frameUri={equipped.AVATAR_FRAME?.assetReference ?? null}
        bannerUri={equipped.PROFILE_BANNER?.assetReference ?? null}
        displayName={displayName}
        titleText={equippedTitle?.displayText ?? null}
        levelNumber={levelNumber}
        xpRatio={levelProgress?.progressRatio ?? 0}
        xpIntoLevel={levelProgress?.xpIntoLevel ?? 0}
        xpForNextLevel={levelProgress?.xpForNextLevel ?? null}
        lifetimeXp={levelProgress?.lifetimeXp ?? 0}
      />

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

      <View style={styles.tabContent}>
        {tab === 'avatar' ? (
          <CosmeticCollectionTab slot="AVATAR" controller={cosmeticsController} sampleAvatarUri={sampleAvatarUri} />
        ) : null}
        {tab === 'marco' ? (
          <CosmeticCollectionTab slot="AVATAR_FRAME" controller={cosmeticsController} sampleAvatarUri={sampleAvatarUri} />
        ) : null}
        {tab === 'banner' ? (
          <CosmeticCollectionTab slot="PROFILE_BANNER" controller={cosmeticsController} sampleAvatarUri={sampleAvatarUri} />
        ) : null}
        {tab === 'titulo' ? <TitlesSection controller={titlesController} /> : null}
      </View>
    </ScrollView>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    scroll: { flex: 1, backgroundColor: t.color.background.default },
    content: { padding: spacing.space4, gap: spacing.space4, paddingBottom: spacing.space10 },
    subtitle: { marginBottom: -spacing.space1 },
    tabBar: {
      flexDirection: 'row' as const,
      gap: spacing.space4,
      borderBottomWidth: 1,
      borderBottomColor: t.color.border.default,
    },
    tabItem: { paddingVertical: spacing.space2, borderBottomWidth: 2, borderBottomColor: 'transparent' as const, borderRadius: radii.none },
    tabItemActive: { borderBottomColor: t.color.accent.default },
    tabContent: { gap: spacing.space3 },
  };
}
