import { ScrollView } from 'react-native';
import type { CompetitiveProfileResponse } from '@axioma/contracts';
import { CompetitiveIdentityHeader } from './identity-header';
import { CompetitivePositionCard } from './position-card';
import { CompetitiveCosmeticsRow } from './cosmetics-row';
import { CompetitiveAchievementsList } from './achievements-list';
import { useThemedStyles } from '../../theme';
import type { ThemeTokens } from '../../theme';

/**
 * Representación de UN `CompetitiveProfileResponse` (la forma pública real,
 * ADR-0021) -- compartida entre el perfil de un TERCERO
 * (`app/(tabs)/competir/perfil/[username].tsx`, Bloque IV) y la VISTA PREVIA
 * PÚBLICA de la propia cuenta (`app/(tabs)/perfil/preview.tsx`, LEF Bloque V,
 * Incremento 8/7). Ambas pantallas reciben EXACTAMENTE el mismo tipo de
 * respuesta -- misma composición aquí evita una segunda copia del JSX y
 * garantiza que la preview se vea IDÉNTICA a como un tercero ve el perfil
 * (mismo criterio que el backend: preview reutiliza el mismo camino de
 * código público, nunca una segunda interpretación).
 *
 * Solo lectura -- sin ninguna acción de escritura (ningún equipamiento,
 * ninguna selección) importada aquí.
 */
export function PublicProfileView({ profile }: { profile: CompetitiveProfileResponse }) {
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CompetitiveIdentityHeader
        username={profile.username}
        avatar={profile.avatar}
        banner={profile.banner}
        equippedCosmetics={profile.equippedCosmetics}
        levelNumber={profile.levelNumber}
        equippedTitle={profile.equippedTitle}
      />
      <CompetitivePositionCard competitive={profile.competitive} variant="other" />
      <CompetitiveCosmeticsRow equippedCosmetics={profile.equippedCosmetics} />
      <CompetitiveAchievementsList achievements={profile.featuredAchievements} title="Insignias destacadas" />
      <CompetitiveAchievementsList achievements={profile.publicAchievements} />
    </ScrollView>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, backgroundColor: t.color.background.default },
    content: { padding: 16, gap: 12 },
  };
}
