import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { CompetitiveProfileResponse } from '@axioma/contracts';
import { getUserCompetitiveProfile } from '../../../../lib/api/competitive';
import { CompetitiveIdentityHeader } from '../../../../components/competitive/identity-header';
import { CompetitivePositionCard } from '../../../../components/competitive/position-card';
import { CompetitiveCosmeticsRow } from '../../../../components/competitive/cosmetics-row';
import { CompetitiveAchievementsList } from '../../../../components/competitive/achievements-list';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { useThemedStyles } from '../../../../theme';
import type { ThemeTokens } from '../../../../theme';

type ScreenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not_found' }
  | { status: 'ready'; profile: CompetitiveProfileResponse };

/**
 * Perfil competitivo de OTRO usuario -- Bloque IV, Incremento 5,
 * sub-incremento 5.c. Consume `GET /user/public-profile/:username/competitive-profile`
 * (3.b, ya cerrado). SOLO LECTURA -- sin ninguna acción de escritura
 * (ningún `PATCH`/`POST` importado en este archivo).
 *
 * 404 UNIFORME (ADR-0021 §2/§3): el backend responde el MISMO cuerpo para
 * PRIVATE/RETIRED/ANONYMIZED/inexistente -- este cliente no distingue el
 * motivo, un único mensaje. `CompetitiveProfileResponse` (a diferencia de
 * `MeCompetitiveProfileResponse`) no declara `lifecycleStatus` -- no hay
 * campo que ocultar, el tipo simplemente no lo tiene.
 *
 * `username` llega YA canónico como parámetro de ruta (viene de una fila
 * de ranking presentable, 5.b) -- se usa tal cual, nunca renormalizado.
 */
export default function OtherCompetitiveProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const { username } = useLocalSearchParams<{ username: string }>();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getUserCompetitiveProfile(username);
    if (result.ok) {
      setState({ status: 'ready', profile: result.data });
      return;
    }
    if (result.kind === 'http' && result.status === 404) {
      setState({ status: 'not_found' });
      return;
    }
    setState({ status: 'error', message: result.message });
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') return <LoadingState message="Cargando perfil…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;
  if (state.status === 'not_found') {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundMessage}>Este perfil no está disponible.</Text>
      </View>
    );
  }

  const { profile } = state;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CompetitiveIdentityHeader username={profile.username} avatar={profile.avatar} levelNumber={profile.levelNumber} equippedTitle={profile.equippedTitle} />
      <CompetitivePositionCard competitive={profile.competitive} variant="other" />
      <CompetitiveCosmeticsRow equippedCosmetics={profile.equippedCosmetics} />
      <CompetitiveAchievementsList achievements={profile.publicAchievements} />
    </ScrollView>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, backgroundColor: t.color.background.default },
    content: { padding: 16, gap: 12 },
    notFoundContainer: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24, backgroundColor: t.color.background.default },
    notFoundMessage: { fontSize: 14, color: t.color.text.secondary, textAlign: 'center' as const },
  };
}
