import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { MeCompetitiveProfileResponse } from '@axioma/contracts';
import { getMyCompetitiveProfile } from '../lib/api/competitive';
import { CompetitiveIdentityHeader } from './competitive/identity-header';
import { CompetitivePositionCard } from './competitive/position-card';
import { CompetitiveCosmeticsRow } from './competitive/cosmetics-row';
import { CompetitiveAchievementsList } from './competitive/achievements-list';
import { useThemedStyles } from '../theme';
import type { ThemeTokens } from '../theme';

type SectionState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not_initialized' }
  | { status: 'ready'; profile: MeCompetitiveProfileResponse };

/**
 * Sección "Perfil competitivo" dentro de `perfil.tsx` -- Bloque IV,
 * Incremento 5, sub-incremento 5.c. Consume `GET /user/public-profile/me/competitive-profile`
 * (3.b, ya cerrado).
 *
 * Estado y `retry` PROPIOS -- precisión obligatoria del Product Owner: un
 * fallo aquí NUNCA bloquea el resto de `perfil.tsx` (displayName,
 * `CosmeticsSection`, cerrar sesión siguen funcionando igual). Esta
 * sección se monta y falla de forma completamente aislada.
 *
 * 404 (sin `public_profile` inicializado todavía) es un estado
 * INFORMATIVO, no un error -- mismo criterio que `PerfilScreen` con su
 * propio 404 de autoservicio.
 */
export function CompetitiveProfileSection() {
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<SectionState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await getMyCompetitiveProfile();
    if (result.ok) {
      setState({ status: 'ready', profile: result.data });
      return;
    }
    if (result.kind === 'http' && result.status === 404) {
      setState({ status: 'not_initialized' });
      return;
    }
    setState({ status: 'error', message: result.message });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Perfil competitivo</Text>
        <Text style={styles.loadingMessage}>Cargando…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Perfil competitivo</Text>
        <Text style={styles.errorMessage}>{state.message}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Reintentar cargar perfil competitivo" onPress={load} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (state.status === 'not_initialized') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Perfil competitivo</Text>
        <Text style={styles.emptyMessage}>Configura tu nombre de usuario arriba para tener un perfil competitivo.</Text>
      </View>
    );
  }

  const { profile } = state;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil competitivo</Text>
      {profile.lifecycleStatus === 'RETIRED' ? <Text style={styles.retiredBadge}>Perfil retirado</Text> : null}
      <CompetitiveIdentityHeader username={profile.username} avatar={profile.avatar} levelNumber={profile.levelNumber} equippedTitle={profile.equippedTitle} />
      <CompetitivePositionCard competitive={profile.competitive} variant="own" />
      <CompetitiveCosmeticsRow equippedCosmetics={profile.equippedCosmetics} />
      <CompetitiveAchievementsList achievements={profile.publicAchievements} />
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { gap: 12, marginTop: 8 },
    title: { fontSize: 18, fontWeight: '700' as const, color: t.color.text.primary },
    loadingMessage: { fontSize: 13, color: t.color.text.secondary },
    errorMessage: { fontSize: 13, color: t.color.state.error.text },
    retryButton: { alignSelf: 'flex-start' as const },
    retryButtonText: { color: t.color.accent.default, fontWeight: '600' as const },
    emptyMessage: { fontSize: 13, color: t.color.text.secondary },
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
