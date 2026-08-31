import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { ChallengeSummary } from '@axioma/contracts';
import { listChallenges, claimChallenge } from '../../../lib/api/challenges';
import { getLeagueParticipation, joinLeague } from '../../../lib/api/league';
import { groupChallenges, progressRatio, canClaim } from '../../../lib/challenges/group-challenges';
import { challengeTypeLabel, formatCountdown, formatRewardXp, claimCtaLabel, isPastPeriod } from '../../../lib/challenges/challenge-card-view';
import { describeParticipation, type LeagueParticipationView } from '../../../lib/league/participation-view';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { Text, Card, Button, Progress, Icon } from '../../../components/ui';
import { QuickQuestionIllustration } from '../../../components/competitive/quick-question-illustration';
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
  const insets = useSafeAreaInsets();
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

  /**
   * COMPETE-2 -- encabezado visual persistente para los 3 estados
   * "finales" (con/sin temporada, con/sin inscripción): badge circular +
   * `Icon name="shield"` (genérico, sin datos de división/posición, mismo
   * ícono/lenguaje visual ya usado en la fila de Liga de Inicio) + título.
   * Da presencia consistente al card incluso en el estado vacío real de
   * hoy -- nunca implica una liga/tier concreto que el contrato no expone.
   */
  function leagueHeader(title: string) {
    return (
      <View style={styles.leagueHeader}>
        <View style={styles.leagueIconWrap}>
          <Icon name="shield" size={18} color="accent" />
        </View>
        <Text variant="titleLarge">{title}</Text>
      </View>
    );
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
          {leagueHeader('Liga')}
          <Text variant="bodySmall" color="secondary">
            No hay una temporada de liga activa en este momento.
          </Text>
        </Card>
      );
    }

    if (view.kind === 'not_enrolled') {
      return (
        <Card variant="surface" style={styles.leagueCard}>
          {leagueHeader('Liga')}
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
        {leagueHeader(view.leagueName)}
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
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text variant="heading1" accessibilityRole="header">
        Competir
      </Text>
      <Text variant="bodySmall" color="secondary" style={styles.subtitle}>
        Compite, sube de liga y demuestra lo que sabes.
      </Text>

      {renderLeagueSection()}

      {/*
        COMPETE-1 -- tratamiento "protagonista" (fondo azul sólido, texto
        blanco), acercándose a la referencia aprobada. Sigue siendo la MISMA
        `Card` con `onPress` navegando a la ruta ya existente -- el
        "Comenzar" de abajo es presentación pura (Text+Icon, sin su propio
        `onPress`) para no crear un segundo target de toque anidado dentro
        del card ya pulsable.
      */}
      <Card
        variant="brand"
        accessibilityLabel="Jugar Pregunta rápida"
        onPress={() => router.push('/(tabs)/competir/quick-question')}
        style={styles.quickQuestionCard}
      >
        <QuickQuestionIllustration />
        <Text variant="titleLarge" color="onInverse">
          Pregunta rápida
        </Text>
        <Text variant="bodySmall" color="onInverse" style={styles.quickQuestionDescription}>
          Responde preguntas y gana XP
        </Text>
        <View style={styles.quickQuestionButton}>
          <Text variant="titleMedium" weight="semibold" color="onAccent">
            Comenzar
          </Text>
          <Icon name="chevron-right" size={18} color={tokens.color.text.onAccent} />
        </View>
      </Card>

      {state.challenges.length === 0 ? (
        // Mismo patrón aprobado en HOME-1 ("Desafíos de hoy"): `<Text>` plano
        // dentro del `Card`, NUNCA `EmptyState` aquí -- ese componente es
        // `flex:1` pensado para ocupar toda la pantalla (ver `empty-state.tsx`),
        // que dentro de este card haría que creciera para llenar el espacio
        // restante en vez de quedar compacto.
        <Card variant="outlined" style={styles.challengesEmptyCard}>
          <Text variant="titleMedium" accessibilityRole="header">
            Desafíos
          </Text>
          <Text variant="bodySmall" color="secondary">
            Todavía no tienes desafíos asignados. Sigue estudiando y aparecerán aquí.
          </Text>
        </Card>
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
          renderItem={({ item }) => {
            const countdown = isPastPeriod(item) ? null : formatCountdown(item.periodEnd);
            const rewardXp = formatRewardXp(item.rewardXpBonus);
            return (
            <Card variant="outlined" style={styles.card}>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  {item.name}
                </Text>
                <Text variant="caption" color="secondary" style={styles.cardBadge}>
                  {challengeTypeLabel(item.challengeType)}
                </Text>
              </View>
              {item.description ? (
                <Text variant="bodySmall" color="secondary">
                  {item.description}
                </Text>
              ) : null}

              {rewardXp ? (
                <Text variant="label" color="primary">
                  Recompensa: {rewardXp}
                </Text>
              ) : null}

              <Progress
                value={progressRatio(item)}
                accessibilityLabel={`Progreso: ${item.progressValue} de ${item.targetValue}`}
              />
              <Text variant="caption" color="muted">
                {item.progressValue}/{item.targetValue}
              </Text>

              <View style={styles.cardMetaRow}>
                <Text variant="label" color="secondary">
                  {STATUS_LABEL[item.challengeStatus]}
                </Text>
                {countdown ? (
                  <Text variant="caption" color="muted">
                    {countdown}
                  </Text>
                ) : null}
              </View>

              {itemErrors[item.id] ? (
                <Text variant="bodySmall" color="error">
                  {itemErrors[item.id]}
                </Text>
              ) : null}

              {canClaim(item) ? (
                <Button
                  label={claimCtaLabel(item.rewardXpBonus)}
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
            );
          }}
        />
      )}
    </View>
  );
}

function createStyles(t: ThemeTokens) {
  return {
    container: { flex: 1, padding: 16, gap: spacing.space3, backgroundColor: t.color.background.default },
    subtitle: { marginTop: -spacing.space2 },
    leagueCard: { gap: spacing.space3, paddingVertical: 28 },
    leagueHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.space3 },
    leagueIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: t.color.accent.subtleBg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    quickQuestionCard: { gap: spacing.space1, overflow: 'hidden' as const },
    quickQuestionDescription: { opacity: 0.85, marginBottom: spacing.space2 },
    quickQuestionButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      gap: 6,
      backgroundColor: t.color.accent.default,
      borderRadius: 10,
      paddingVertical: spacing.space2,
      paddingHorizontal: spacing.space4,
    },
    challengesEmptyCard: { gap: spacing.space2 },
    list: { gap: spacing.space3, paddingBottom: 24 },
    sectionTitle: { marginTop: spacing.space3, marginBottom: spacing.space1, textTransform: 'uppercase' as const },
    card: { gap: spacing.space2 },
    cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space2 },
    cardTitle: { flex: 1 },
    cardBadge: {
      textTransform: 'uppercase' as const,
      backgroundColor: t.color.accent.subtleBg,
      color: t.color.accent.default,
      borderRadius: 6,
      paddingHorizontal: spacing.space2,
      paddingVertical: 2,
      overflow: 'hidden' as const,
    },
    cardMetaRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.space2 },
    claimButton: { marginTop: spacing.space2 },
  };
}
