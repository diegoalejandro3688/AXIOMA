import { View } from 'react-native';
import type { MeCompetitiveProfileResponse } from '@axioma/contracts';
import { CompetitiveIdentityHeader } from './competitive/identity-header';
import { CompetitivePositionCard } from './competitive/position-card';
import { CompetitiveCosmeticsRow } from './competitive/cosmetics-row';
import { CompetitiveAchievementsList } from './competitive/achievements-list';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';
import { Text } from './ui';

/**
 * Sección "Perfil competitivo" dentro de `perfil/index.tsx` -- Bloque IV,
 * Incremento 5, sub-incremento 5.c, EVOLUCIONADA en LEF Bloque V,
 * Incremento 8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §16) de componente
 * auto-alimentado a componente de PRESENTACIÓN pura.
 *
 * Decisión del Product Owner (LEF Bloque V, Incremento 8): `GET
 * /user/me/advanced-profile` (Incremento 5) ya compone exactamente el mismo
 * dato que este componente antes pedía por su cuenta
 * (`GET .../me/competitive-profile`) -- mantener un segundo fetch aquí
 * habría sido el "fetch duplicado del mismo dato" que el contrato de este
 * incremento exige evitar, además de un segundo loading/error state
 * compitiendo con el de la pantalla contenedora. `perfil/index.tsx` hace
 * la ÚNICA carga canónica y pasa `profile` ya resuelto -- `null` cuando la
 * cuenta todavía no tiene `PublicProfile` (mismo significado que el 404 que
 * antes manejaba este componente internamente), sin duplicar esa
 * interpretación aquí (la pantalla contenedora decide null vs. error).
 *
 * Esta NO es una reapertura del dominio/backend de Bloque IV -- ADR-0021 y
 * `UserService.getMyCompetitiveProfile` permanecen sin cambio; solo cambió
 * CÓMO la superficie móvil obtiene el dato ya expuesto.
 *
 * UI-3 (DG UI3-4): la firma se mantiene EXACTAMENTE `{ profile }` -- el
 * gate histórico `verify-competitive-profile-gate.ts` fija por regex que
 * este componente es presentación pura con esa única prop, y esa condición
 * se preserva deliberadamente. El editor de `displayName` (DG UI3-3) NO
 * vive aquí -- `perfil/index.tsx` lo renderiza inmediatamente ANTES de
 * CompetitiveProfileSection (ver ese archivo), logrando la adyacencia
 * visual con `CompetitiveIdentityHeader` por ORDEN, sin ampliar el
 * contrato de este componente.
 */
export function CompetitiveProfileSection({ profile }: { profile: MeCompetitiveProfileResponse | null }) {
  const styles = useThemedStyles(createStyles);

  if (profile === null) {
    return (
      <View style={styles.container}>
        <Text variant="titleLarge">Perfil competitivo</Text>
        <Text variant="bodySmall" color="secondary">
          Configura tu nombre de usuario para tener un perfil competitivo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="titleLarge">Perfil competitivo</Text>
      {profile.lifecycleStatus === 'RETIRED' ? (
        <Text variant="label" style={styles.retiredBadge}>
          Perfil retirado
        </Text>
      ) : null}
      <CompetitiveIdentityHeader
        username={profile.username}
        avatar={profile.avatar}
        banner={profile.banner}
        equippedCosmetics={profile.equippedCosmetics}
        levelNumber={profile.levelNumber}
        equippedTitle={profile.equippedTitle}
      />
      <CompetitivePositionCard competitive={profile.competitive} variant="own" />
      <CompetitiveCosmeticsRow equippedCosmetics={profile.equippedCosmetics} />
      <CompetitiveAchievementsList achievements={profile.featuredAchievements} title="Insignias destacadas" />
      <CompetitiveAchievementsList achievements={profile.publicAchievements} />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 12, marginTop: 8 },
    retiredBadge: {
      alignSelf: 'flex-start' as const,
      fontSize: 12,
      fontWeight: '700' as const,
      color: t.color.state.warning.text,
      backgroundColor: t.color.state.warning.background,
      borderColor: t.color.state.warning.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
  };
}
