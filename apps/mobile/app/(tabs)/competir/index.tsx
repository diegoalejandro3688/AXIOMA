import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ChallengeSummary } from '@axioma/contracts';
import { listChallenges, claimChallenge } from '../../../lib/api/challenges';
import { getLeagueParticipation, joinLeague } from '../../../lib/api/league';
import { groupChallenges, progressRatio, canClaim } from '../../../lib/challenges/group-challenges';
import { describeParticipation, type LeagueParticipationView } from '../../../lib/league/participation-view';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { useTheme, useThemedStyles } from '../../../theme';
import type { ThemeTokens } from '../../../theme';

type ScreenState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; challenges: ChallengeSummary[] };

type LeagueSectionState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; view: LeagueParticipationView };

const STATUS_LABEL: Record<ChallengeSummary['challengeStatus'], string> = {
  ACCEPTED: 'Por empezar',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado -- reclama tu recompensa',
  CLAIMED: 'Reclamado',
};

const PARTICIPATION_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Temporada en curso',
  SEASON_ENDED: 'Temporada finalizada',
  PROMOTED: 'Ascendiste de liga',
  DEMOTED: 'Descendiste de liga',
  RETAINED: 'Te mantuviste en tu liga',
};

/**
 * Competir -- ver Master Context §4.10 y
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md (Incremento 5, sub-incremento 5.a).
 * Hub: participación de liga (nueva, 5.a) + Desafíos (ya existente,
 * Bloque III 4.d). Pregunta rápida sigue sin construirse (5.d) y NO se
 * muestra como si ya pudiera usarse (misma regla que Master Context exige
 * para esta pantalla).
 *
 * La sección de liga y la de Desafíos son INDEPENDIENTES -- un fallo en
 * una no bloquea la otra (dos `ScreenState` separados, dos cargas
 * separadas).
 */
export default function CompetirScreen() {
  const tokens = useTheme();
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  const [leagueState, setLeagueState] = useState<LeagueSectionState>({ status: 'loading' });
  const [joining, setJoining] = useState(false);

  const loadLeague = useCallback(async () => {
    setLeagueState({ status: 'loading' });
    const result = await getLeagueParticipation();
    if (!result.ok) {
      setLeagueState({ status: 'error', message: result.message });
      return;
    }
    setLeagueState({ status: 'ready', view: describeParticipation(result.data) });
  }, []);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listChallenges();
    if (!result.ok) {
      setState({ status: 'error', message: result.message });
      return;
    }
    setItemErrors({});
    setState({ status: 'ready', challenges: result.data.challenges });
  }, []);

  useEffect(() => {
    load();
    loadLeague();
  }, [load, loadLeague]);

  /**
   * Acción explícita e idempotente -- SOLO se invoca desde este `onPress`,
   * nunca automáticamente al montar la pantalla (verificado en el gate).
   * Doble-toque bloqueado igual que `handleClaim`.
   */
  async function handleJoinLeague() {
    if (joining) return;
    setJoining(true);
    const result = await joinLeague();
    setJoining(false);
    if (!result.ok) {
      setLeagueState({ status: 'error', message: result.message });
      return;
    }
    setLeagueState({ status: 'ready', view: describeParticipation(result.data) });
  }

  async function handleClaim(id: string) {
    // Protección contra doble toque -- una solicitud de claim ya en curso bloquea cualquier otra.
    if (claimingId !== null) return;

    setClaimingId(id);
    setItemErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const outcome = await claimChallenge(id);
    setClaimingId(null);

    if (outcome.kind === 'ok') {
      // Actualización local con la respuesta REAL del servidor -- nunca antes de recibirla.
      setState((prev) => (prev.status === 'ready' ? { status: 'ready', challenges: prev.challenges.map((c) => (c.id === id ? outcome.data : c)) } : prev));
      return;
    }

    if (outcome.kind === 'not_completed' || outcome.kind === 'not_found') {
      // El backend discrepa del estado local (409/404) -- reconciliar recargando la lista completa, no adivinar.
      await load();
      return;
    }

    const message = outcome.kind === 'retryable' || outcome.kind === 'network' ? outcome.message : outcome.message;
    setItemErrors((prev) => ({ ...prev, [id]: message }));
  }

  function renderLeagueSection() {
    if (leagueState.status === 'loading') {
      return (
        <View style={styles.leagueCard}>
          <ActivityIndicator color={tokens.color.accent.default} />
        </View>
      );
    }
    if (leagueState.status === 'error') {
      return (
        <View style={styles.leagueCard}>
          <Text style={styles.leagueError}>{leagueState.message}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Reintentar" onPress={loadLeague} style={styles.leagueRetryButton}>
            <Text style={styles.leagueRetryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    const { view } = leagueState;

    if (view.kind === 'no_active_season') {
      return (
        <View style={styles.leagueCard}>
          <Text style={styles.leagueTitle}>Liga</Text>
          <Text style={styles.leagueMessage}>No hay una temporada de liga activa en este momento.</Text>
        </View>
      );
    }

    if (view.kind === 'not_enrolled') {
      return (
        <View style={styles.leagueCard}>
          <Text style={styles.leagueTitle}>Liga</Text>
          <Text style={styles.leagueMessage}>Todavía no participas en la liga de esta temporada.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unirme a la liga"
            onPress={handleJoinLeague}
            disabled={joining}
            style={[styles.joinButton, joining && styles.joinButtonDisabled]}
          >
            {joining ? <ActivityIndicator color={tokens.color.text.onAccent} /> : <Text style={styles.joinButtonText}>Unirme a la liga</Text>}
          </Pressable>
        </View>
      );
    }

    // view.kind === 'enrolled'
    return (
      <View style={styles.leagueCard}>
        <Text style={styles.leagueTitle}>{view.leagueName}</Text>
        <Text style={styles.leagueMessage}>{PARTICIPATION_STATUS_LABEL[view.status] ?? view.status}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver ranking"
          onPress={() => router.push('/(tabs)/competir/ranking')}
          style={styles.rankingButton}
        >
          <Text style={styles.rankingButtonText}>Ver ranking</Text>
        </Pressable>
      </View>
    );
  }

  if (state.status === 'loading') return <LoadingState message="Cargando desafíos…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={load} />;

  const grouped = groupChallenges(state.challenges);
  const sections = [
    { key: 'active', title: 'Activos', data: grouped.active },
    { key: 'completed', title: 'Completados', data: grouped.completed },
    { key: 'claimed', title: 'Reclamados', data: grouped.claimed },
  ].filter((section) => section.data.length > 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Competir
      </Text>

      {renderLeagueSection()}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Jugar Pregunta rápida"
        onPress={() => router.push('/(tabs)/competir/quick-question')}
        style={styles.quickQuestionCard}
      >
        <Text style={styles.quickQuestionTitle}>Pregunta rápida</Text>
        <Text style={styles.quickQuestionSubtitle}>Responde preguntas y gana XP</Text>
      </Pressable>

      {state.challenges.length === 0 ? (
        <EmptyState message="Todavía no tienes desafíos asignados. Sigue estudiando y aparecerán aquí." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardName}>{item.name}</Text>
              {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressRatio(item) * 100}%`, backgroundColor: tokens.color.accent.default }]} />
              </View>
              <Text style={styles.progressLabel}>
                {item.progressValue}/{item.targetValue}
              </Text>

              <Text style={styles.statusLabel}>{STATUS_LABEL[item.challengeStatus]}</Text>

              {itemErrors[item.id] ? <Text style={styles.itemError}>{itemErrors[item.id]}</Text> : null}

              {canClaim(item) ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reclamar recompensa de ${item.name}`}
                  onPress={() => handleClaim(item.id)}
                  disabled={claimingId !== null}
                  style={[styles.claimButton, claimingId !== null && styles.claimButtonDisabled]}
                >
                  {claimingId === item.id ? <ActivityIndicator color={tokens.color.text.onAccent} /> : <Text style={styles.claimButtonText}>Reclamar</Text>}
                </Pressable>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: 12, backgroundColor: t.color.background.default },
    title: { fontSize: 22, fontWeight: '700' as const, color: t.color.text.primary },
    leagueCard: {
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    leagueTitle: { fontSize: 16, fontWeight: '700' as const, color: t.color.text.primary },
    leagueMessage: { fontSize: 13, color: t.color.text.secondary },
    leagueError: { fontSize: 13, color: t.color.state.error.text },
    leagueRetryButton: { alignSelf: 'flex-start' as const, marginTop: 4 },
    leagueRetryButtonText: { color: t.color.accent.default, fontWeight: '600' as const },
    joinButton: { marginTop: 4, backgroundColor: t.color.accent.default, paddingVertical: 10, borderRadius: 8, alignItems: 'center' as const },
    joinButtonDisabled: { opacity: 0.5 },
    joinButtonText: { color: t.color.text.onAccent, fontWeight: '700' as const },
    rankingButton: { marginTop: 4, alignSelf: 'flex-start' as const },
    rankingButtonText: { color: t.color.accent.default, fontWeight: '600' as const },
    quickQuestionCard: {
      backgroundColor: t.color.accent.subtleBg,
      borderWidth: 1,
      borderColor: t.color.accent.default,
      borderRadius: 14,
      padding: 16,
      gap: 2,
    },
    quickQuestionTitle: { fontSize: 16, fontWeight: '700' as const, color: t.color.text.primary },
    quickQuestionSubtitle: { fontSize: 13, color: t.color.text.secondary },
    list: { gap: 12, paddingBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '700' as const, color: t.color.text.secondary, marginTop: 12, marginBottom: 6, textTransform: 'uppercase' as const },
    card: {
      backgroundColor: t.color.background.surface,
      borderWidth: 1,
      borderColor: t.color.border.default,
      borderRadius: 14,
      padding: 16,
      gap: 6,
    },
    cardName: { fontSize: 16, fontWeight: '600' as const, color: t.color.text.primary },
    cardDescription: { fontSize: 13, color: t.color.text.secondary },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: t.color.border.default, overflow: 'hidden' as const, marginTop: 4 },
    progressFill: { height: '100%' as const, borderRadius: 4 },
    progressLabel: { fontSize: 12, color: t.color.text.muted },
    statusLabel: { fontSize: 13, fontWeight: '600' as const, color: t.color.text.secondary },
    itemError: { fontSize: 13, color: t.color.state.error.text },
    claimButton: { marginTop: 8, backgroundColor: t.color.accent.default, paddingVertical: 10, borderRadius: 8, alignItems: 'center' as const },
    claimButtonDisabled: { opacity: 0.5 },
    claimButtonText: { color: t.color.text.onAccent, fontWeight: '700' as const },
  };
}
