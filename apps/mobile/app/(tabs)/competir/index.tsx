import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ChallengeSummary } from '@axioma/contracts';
import { listChallenges, claimChallenge } from '../../../lib/api/challenges';
import { getLeagueParticipation, joinLeague } from '../../../lib/api/league';
import { groupChallenges, progressRatio, canClaim } from '../../../lib/challenges/group-challenges';
import { describeParticipation, type LeagueParticipationView } from '../../../lib/league/participation-view';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { EmptyState } from '../../../components/empty-state';
import { Text, Card, Button, Progress } from '../../../components/ui';
import { useTheme, useThemedStyles, spacing } from '../../../theme';
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
 *
 * UI-3 (DG UI3-2): la tarjeta de Liga muestra EXCLUSIVAMENTE `leagueName` +
 * `status` (vía `PARTICIPATION_STATUS_LABEL`) + acción -- `describeParticipation`/
 * `GetLeagueParticipationResponse` no exponen posición ni progreso a la
 * siguiente división, así que no se agregan aquí.
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
        <Card variant="surface" style={styles.leagueCard}>
          <ActivityIndicator color={tokens.color.accent.default} />
        </Card>
      );
    }
    if (leagueState.status === 'error') {
      return (
        <Card variant="surface" style={styles.leagueCard}>
          <Text variant="bodySmall" color="error">
            {leagueState.message}
          </Text>
          <Button label="Reintentar" onPress={loadLeague} variant="tertiary" size="small" />
        </Card>
      );
    }

    const { view } = leagueState;

    if (view.kind === 'no_active_season') {
      return (
        <Card variant="surface" style={styles.leagueCard}>
          <Text variant="titleLarge">Liga</Text>
          <Text variant="bodySmall" color="secondary">
            No hay una temporada de liga activa en este momento.
          </Text>
        </Card>
      );
    }

    if (view.kind === 'not_enrolled') {
      return (
        <Card variant="surface" style={styles.leagueCard}>
          <Text variant="titleLarge">Liga</Text>
          <Text variant="bodySmall" color="secondary">
            Todavía no participas en la liga de esta temporada.
          </Text>
          <Button label="Unirme a la liga" onPress={handleJoinLeague} loading={joining} variant="primary" size="small" />
        </Card>
      );
    }

    // view.kind === 'enrolled' -- SOLO leagueName + status + acción (DG UI3-2, sin posición ni progreso numérico).
    return (
      <Card variant="surface" style={styles.leagueCard}>
        <Text variant="titleLarge">{view.leagueName}</Text>
        <Text variant="bodySmall" color="secondary">
          {PARTICIPATION_STATUS_LABEL[view.status] ?? view.status}
        </Text>
        <Button label="Ver ranking" onPress={() => router.push('/(tabs)/competir/ranking')} variant="tertiary" size="small" />
      </Card>
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
      <Text variant="heading1" accessibilityRole="header">
        Competir
      </Text>

      {renderLeagueSection()}

      {/*
        `Card` no tiene una variante que reproduzca exactamente
        `accent.subtleBg` + borde `accent.default` (el tratamiento que el
        handoff pide MANTENER) -- variant="subtle" da el fondo correcto, el
        borde se añade vía `style` (ver UI-3 Implementation Report).
      */}
      <Card
        variant="subtle"
        accessibilityLabel="Jugar Pregunta rápida"
        onPress={() => router.push('/(tabs)/competir/quick-question')}
        style={styles.quickQuestionCard}
      >
        <Text variant="titleLarge">Pregunta rápida</Text>
        <Text variant="bodySmall" color="secondary">
          Responde preguntas y gana XP
        </Text>
      </Card>

      {state.challenges.length === 0 ? (
        <EmptyState message="Todavía no tienes desafíos asignados. Sigue estudiando y aparecerán aquí." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <Text variant="label" color="secondary" style={styles.sectionTitle}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Card variant="outlined" style={styles.card}>
              <Text variant="titleMedium">{item.name}</Text>
              {item.description ? (
                <Text variant="bodySmall" color="secondary">
                  {item.description}
                </Text>
              ) : null}

              <Progress
                value={progressRatio(item)}
                accessibilityLabel={`Progreso: ${item.progressValue} de ${item.targetValue}`}
              />
              <Text variant="caption" color="muted">
                {item.progressValue}/{item.targetValue}
              </Text>

              <Text variant="label" color="secondary">
                {STATUS_LABEL[item.challengeStatus]}
              </Text>

              {itemErrors[item.id] ? (
                <Text variant="bodySmall" color="error">
                  {itemErrors[item.id]}
                </Text>
              ) : null}

              {canClaim(item) ? (
                <Button
                  label="Reclamar"
                  accessibilityLabel={`Reclamar recompensa de ${item.name}`}
                  onPress={() => handleClaim(item.id)}
                  loading={claimingId === item.id}
                  disabled={claimingId !== null}
                  variant="primary"
                  size="small"
                  style={styles.claimButton}
                />
              ) : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: spacing.space3, backgroundColor: t.color.background.default },
    leagueCard: { gap: spacing.space2 },
    quickQuestionCard: { gap: 2, borderWidth: 1, borderColor: t.color.accent.default },
    list: { gap: spacing.space3, paddingBottom: 24 },
    sectionTitle: { marginTop: spacing.space3, marginBottom: spacing.space1, textTransform: 'uppercase' as const },
    card: { gap: spacing.space2 },
    claimButton: { marginTop: spacing.space2 },
  };
}
